#!/usr/bin/env node
/**
 * Record qa/content short clips for YouTube montage (PR #39 build).
 * Usage: node scripts/record-content-clips.js [clipId ...]
 * clipId: 01|02|03|03m|04|05|06|07|08|01en
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { chromium } = require("playwright");
const { start, stop } = require("./local-static-server");
const H = require("./playthrough-ui-helpers");
const Ep1 = require("./episode1-ui-flow");
const Flows = require("./content-clip-flows");
const audioIngest = require("./content-audio-ingest");
const { finalizeClipDir } = require("./finalize-content-clip");

const root = path.join(__dirname, "../qa/content");
const commit = execSync("git rev-parse HEAD", { encoding: "utf8" }).trim();
const shootDate = new Date().toISOString().slice(0, 10);

const CLIPS = {
  "01": { dir: "01-first-job", lang: "ru", w: 1920, h: 1080, mobile: false, setup: "fresh", run: Flows.flow01FirstJob },
  "01en": { dir: "01-first-job-en", lang: "en", w: 1920, h: 1080, mobile: false, setup: "fresh", run: Flows.flow01FirstJob },
  "02": { dir: "02-how-to-start", lang: "ru", w: 1920, h: 1080, mobile: false, setup: "fresh", run: Flows.flow02HowToStart },
  "03": { dir: "03-interact-talk", lang: "ru", w: 1920, h: 1080, mobile: false, setup: "fresh", run: Flows.flow03InteractTalkDesktop },
  "03m": {
    dir: "03-interact-talk",
    lang: "ru",
    w: 1080,
    h: 1920,
    mobile: true,
    setup: "fresh",
    run: Flows.flow03InteractTalkMobile,
    basename: "gameplay-1080x1920"
  },
  "04": { dir: "04-crypt", lang: "ru", w: 1920, h: 1080, mobile: false, setup: "postOnboarding", run: Flows.flow04Crypt },
  "05": { dir: "05-apartment", lang: "ru", w: 1920, h: 1080, mobile: false, setup: "postOnboarding", run: Flows.flow05Apartment },
  "06": { dir: "06-city-plot", lang: "ru", w: 1920, h: 1080, mobile: false, setup: "postOnboarding", run: Flows.flow06CityPlot },
  "07": { dir: "07-duel", lang: "ru", w: 1920, h: 1080, mobile: false, setup: "freshDuel", run: Flows.flow07Duel },
  "08": { dir: "08-dog-shnurok", lang: "ru", w: 1920, h: 1080, mobile: false, setup: "postOnboarding", run: Flows.flow08Dog }
};

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const r = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

async function injectMultiAudioBridge(context, port) {
  await context.addInitScript(p => {
    const base = `http://127.0.0.1:${p}/segment`;
    window.__contentAudioEndpoint = base;
    window.__contentCaptureActive = false;
    const recorders = { mix: null, music: null, sfx: null };

    window.__contentStartAudioCapture = async function () {
      await window.AudioManager?.unlockAudio?.();
      window.AudioManager?.setLocationMusic?.(window.me?.location || "room");
      window.AudioManager?.setChannelVolume?.("music", 0.82);
      window.AudioManager?.setChannelVolume?.("sfx", 0.88);
      window.AudioManager?.setChannelVolume?.("speech", 0.9);
      const streams = window.AudioManager?.installCaptureTaps?.() || window.AudioManager?.installCaptureTap?.();
      const map =
        streams && streams.mix
          ? streams
          : { mix: streams, music: streams, sfx: streams };
      if (!map.mix) return { ok: false };
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      for (const track of ["mix", "music", "sfx"]) {
        const stream = map[track] || map.mix;
        try {
          recorders[track]?.stop?.();
        } catch (e) {}
        const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 160000 });
        const blobs = [];
        rec.ondataavailable = e => {
          if (e.data?.size) blobs.push(e.data);
        };
        rec.onstop = () => {
          const body = new Blob(blobs, { type: mime });
          if (body.size > 256) {
            fetch(`${base}/${track}`, { method: "POST", body, mode: "cors" }).catch(() => {});
          }
        };
        rec.start();
        recorders[track] = rec;
      }
      window.__contentCaptureActive = true;
      return { ok: true };
    };

    window.__contentStopAudioCapture = async function () {
      window.__contentCaptureActive = false;
      for (const track of ["mix", "music", "sfx"]) {
        const rec = recorders[track];
        if (!rec || rec.state === "inactive") continue;
        await new Promise(resolve => {
          rec.onstop = () => resolve();
          try {
            rec.stop();
          } catch (e) {
            resolve();
          }
        });
        recorders[track] = null;
      }
    };
  }, port);
}

function writeClipMd(clipDir, meta) {
  const lines = [
    `# ${meta.title}`,
    "",
    `**Версия (commit):** \`${commit}\``,
    `**Дата съёмки:** ${shootDate}`,
    `**Язык UI:** ${meta.lang}`,
    `**Разрешение:** ${meta.resolution}`,
    "",
    "## Управление",
    meta.controls || "- Desktop: WASD, E / #btnTalk, мышь; мобильный: джойстик, #touchTalk",
    "",
    "## Состояние",
    meta.stateBlock || "_см. таймкоды_",
    "",
    "## Таймкоды",
    "",
    "| Time | Event | Notes |",
    "| --- | --- | --- |"
  ];
  for (const m of meta.marks) {
    lines.push(`| ${fmt(m.sec)} | ${m.label} | ${m.extra || ""} |`);
  }
  lines.push("", "## Известные ошибки / ограничения", meta.knownIssues || "—");
  if (meta.blocked) {
    lines.push("", `**Заблокировано:** ${meta.blockedReason || "да"}`);
  }
  fs.writeFileSync(path.join(clipDir, "clip.md"), lines.join("\n") + "\n");
}

async function recordOne(clipKey, base) {
  const spec = CLIPS[clipKey];
  if (!spec) throw new Error(`unknown clip ${clipKey}`);
  const clipDir = path.join(root, spec.dir);
  fs.mkdirSync(clipDir, { recursive: true });
  const marks = [];
  let t0 = 0;
  let lastMarkSec = -1;
  const mark = (label, extra = "") => {
    let sec = (Date.now() - t0) / 1000;
    if (sec <= lastMarkSec) sec = lastMarkSec + 0.2;
    lastMarkSec = sec;
    marks.push({ sec, label, extra });
  };

  audioIngest.stop();
  const audioPort = await audioIngest.start(clipDir);
  const rawDir = path.join(clipDir, "capture-raw");
  fs.mkdirSync(rawDir, { recursive: true });
  for (const f of fs.readdirSync(rawDir)) {
    if (f.endsWith(".webm")) try { fs.unlinkSync(path.join(rawDir, f)); } catch (e) {}
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: spec.w, height: spec.h },
    recordVideo: { dir: rawDir, size: { width: spec.w, height: spec.h } },
    locale: spec.lang === "en" ? "en-US" : "ru-RU",
    isMobile: spec.mobile,
    hasTouch: spec.mobile
  });
  await context.addInitScript(() => {
    document.documentElement.classList.add("episode-capture");
    try {
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (e) {}
  });
  await injectMultiAudioBridge(context, audioPort);
  const page = await context.newPage();
  if (spec.mobile) {
    await page.addInitScript(() => {
      document.documentElement.classList.add("touch-ui");
    });
  }

  t0 = Date.now();
  mark("boot", "load");
  await H.bootSolo(page, base, `content-${clipKey}`, { episodeCapture: true });
  await H.pickCobaltUi(page);
  mark("char_select", "Cobalt");
  await Flows.prepFreshPlayer(page, { lang: spec.lang });

  if (spec.setup === "postOnboarding") {
    await Ep1.waitOnboardingDone(page);
    mark("onboarding_cleared", "post-tutorial state for build layer");
  } else if (spec.setup === "freshDuel") {
    await H.navGo(page, "street");
    await H.openGangNpc(page, "razor");
    await H.advanceStoryNext(page).catch(() => {});
    await H.dismissStoryDialog(page);
    await H.closeGangModal(page);
    await H.navGo(page, "cemetery");
    await page.evaluate(() => window.Onboarding?.onVisitCemetery?.());
    await H.navGo(page, "street");
    mark("pre_duel_onboarding", "ready for win_fight step");
  }

  mark("capture_start", "audio+video");
  const audioMeta = await page.evaluate(() => window.__contentStartAudioCapture());
  if (!audioMeta?.ok) console.warn(clipKey, "audio capture failed", audioMeta);

  let flowResult = { blocked: false };
  try {
    flowResult = await spec.run(page, mark);
  } catch (e) {
    flowResult = { blocked: true, reason: String(e.message || e) };
    mark("flow_error", flowResult.reason);
  }

  mark("capture_end", "stop");
  await page.evaluate(() => window.__contentStopAudioCapture());
  await H.sleep(2500);
  audioIngest.finalizeConcat();
  audioIngest.stop();
  await context.close();
  await browser.close();

  const trimMark = marks.find(m => m.label === "capture_start");
  const trimSec = trimMark ? Math.max(0, trimMark.sec - 0.1) : 0;
  const basename = spec.basename || (spec.mobile ? "gameplay-1080x1920" : "gameplay-1080p");
  let duration = 0;
  try {
    const fin = finalizeClipDir(clipDir, { trimSec, basename });
    duration = fin.duration;
  } catch (e) {
    console.error("finalize failed", clipKey, e.message);
  }

  const stateBlock = flowResult.before
    ? `До: coins=${flowResult.before.coins}, quest=${flowResult.before.quest ?? "—"}\nПосле: coins=${flowResult.after?.coins ?? "—"}, quest=${flowResult.after?.quest ?? "—"}`
    : flowResult.note || "";

  writeClipMd(clipDir, {
    title: spec.dir,
    lang: spec.lang,
    resolution: `${spec.w}×${spec.h}`,
    marks: marks.map(m => ({ ...m, sec: Math.max(0, m.sec - trimSec) })),
    controls: flowResult.controls,
    stateBlock,
    knownIssues: [flowResult.uiNote, flowResult.note, flowResult.reason].filter(Boolean).join("; ") || "—",
    blocked: flowResult.blocked,
    blockedReason: flowResult.reason
  });

  return {
    clip: spec.dir + (clipKey === "01en" ? " (EN)" : clipKey === "03m" ? " vertical" : ""),
    clipKey,
    duration,
    ready: !flowResult.blocked && duration > 2,
    blocked: flowResult.blocked ? flowResult.reason || "flow blocked" : ""
  };
}

async function main() {
  const keys = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CLIPS);
  const base = process.env.PUNK_BASE || (await start());
  const results = [];
  for (const key of keys) {
    console.log("Recording clip", key);
    try {
      results.push(await recordOne(key, base));
    } catch (e) {
      results.push({ clip: CLIPS[key]?.dir || key, clipKey: key, duration: 0, ready: false, blocked: String(e.message) });
    }
  }
  if (!process.env.PUNK_BASE) stop();

  const reportPath = path.join(root, "REPORT.md");
  const lines = [
    "# QA content clips — отчёт",
    "",
    `Commit: \`${commit}\` · Дата: ${shootDate}`,
    "",
    "| Клип | Длительность | Готово | Заблокировано |",
    "| --- | --- | --- | --- |"
  ];
  for (const r of results) {
    const dur = r.duration ? `${fmt(r.duration)} (${r.duration.toFixed(1)}s)` : "—";
    lines.push(`| ${r.clip} | ${dur} | ${r.ready ? "да" : "нет"} | ${r.blocked || "—"} |`);
  }
  fs.writeFileSync(reportPath, lines.join("\n") + "\n");
  console.log("Wrote", reportPath);
  console.log(JSON.stringify(results, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
