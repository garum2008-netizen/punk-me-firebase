#!/usr/bin/env node
/**
 * Full Episode 1 capture for YouTube (1080p, game-only framing, game audio muxed).
 * Output: qa/episode1/episode1-youtube.mp4 (+ .webm video-only intermediate)
 */
const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { start, stop } = require("./local-static-server");
const H = require("./playthrough-ui-helpers");
const Flow = require("./episode1-ui-flow");

const outDir = path.join(__dirname, "../qa/episode1");
fs.mkdirSync(outDir, { recursive: true });

const marks = [];
let t0 = 0;
function mark(label, extra = "") {
  const sec = ((Date.now() - t0) / 1000).toFixed(1);
  marks.push({ sec, label, extra });
}

function fmt(sec) {
  const s = Number(sec);
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function hasFfmpeg() {
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function ffprobeSummary(filePath) {
  try {
    return execSync(
      `ffprobe -v error -show_entries stream=codec_type,codec_name,sample_rate,channels -of default=noprint_wrappers=1 "${filePath}"`,
      { encoding: "utf8" }
    ).trim();
  } catch (e) {
    return String(e.message || e);
  }
}

async function startInPageAudioRecorder(page) {
  await page.waitForFunction(() => window.AudioManager?.isUnlocked?.(), { timeout: 15000 }).catch(() => {});
  return page.evaluate(async () => {
    await window.AudioManager?.unlockAudio?.();
    const stream = window.AudioManager?.installCaptureTap?.();
    if (!stream) return { ok: false, reason: "no tap" };
    window.AudioManager?.playSfx?.("ui_click");
    window.__ep1AudioChunks = [];
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 128000 });
    rec.ondataavailable = e => {
      if (e.data?.size) window.__ep1AudioChunks.push(e.data);
    };
    rec.start(250);
    window.__ep1AudioRecorder = rec;
    return { ok: true, mime, tracks: stream.getAudioTracks().length };
  });
}

async function stopInPageAudioRecorder(page, destPath) {
  const b64 = await page.evaluate(async () => {
    const rec = window.__ep1AudioRecorder;
    if (!rec) return null;
    await new Promise(resolve => {
      rec.onstop = resolve;
      rec.stop();
    });
    const blob = new Blob(window.__ep1AudioChunks || [], { type: rec.mimeType || "audio/webm" });
    const buf = await blob.arrayBuffer();
    let binary = "";
    const bytes = new Uint8Array(buf);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  });
  if (!b64) return false;
  fs.writeFileSync(destPath, Buffer.from(b64, "base64"));
  return fs.statSync(destPath).size > 200;
}

function muxVideoAudio(videoPath, audioPath, outMp4) {
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-i", videoPath, "-i", audioPath, "-c:v", "libx264", "-preset", "fast", "-crf", "23", "-c:a", "aac", "-b:a", "128k", "-shortest", outMp4],
    { encoding: "utf8" }
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || "ffmpeg failed");
}

async function main() {
  if (!hasFfmpeg()) {
    console.error("ffmpeg required for episode1-youtube audio mux");
    process.exit(1);
  }
  const base = process.env.PUNK_BASE || await start();
  const videoDir = path.join(outDir, "youtube-capture-raw");
  fs.mkdirSync(videoDir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } },
    locale: "ru-RU"
  });
  await context.addInitScript(() => {
    document.documentElement.classList.add("episode-capture");
  });
  const page = await context.newPage();
  t0 = Date.now();
  mark("boot", "solo new player");
  await H.bootSolo(page, base, "yt-ep1-full");
  await H.pickCobaltUi(page);
  mark("char_select", "Cobalt");
  mark("start_overlay", "Episode 1 intro lines");
  await page.locator("#btnStartGame").click({ force: true, timeout: 20000 });
  mark("start_game", "audio unlock gesture");
  const audioMeta = await startInPageAudioRecorder(page);
  if (!audioMeta?.ok) console.warn("episode1 audio tap:", audioMeta);
  await page.waitForTimeout(800);

  await Flow.runFullEpisode1Ui(page, {
    mark,
    walkMs: 3200,
    snapDir: outDir,
    snapTag: "youtube"
  });

  const audioA = path.join(outDir, "episode1-youtube-audio-a.webm");
  const audioB = path.join(outDir, "episode1-youtube-audio-b.webm");
  const hadAudioA = await stopInPageAudioRecorder(page, audioA).catch(() => false);

  const reload = await Flow.reloadAndContinue(page);
  mark(
    "reload_continue",
    `onboarding.done=${reload.after.done} quest=${reload.after.quest} coins ${reload.after.coins} (was ${reload.coinsBefore})`
  );

  await startInPageAudioRecorder(page);
  await page.waitForTimeout(1500);
  const hadAudioB = await stopInPageAudioRecorder(page, audioB).catch(() => false);

  const audioPath = path.join(outDir, "episode1-youtube-audio.webm");
  let hadAudio = hadAudioA || hadAudioB;
  if (hadAudioA && hadAudioB) {
    const list = path.join(outDir, "episode1-audio-list.txt");
    fs.writeFileSync(list, `file '${audioA}'\nfile '${audioB}'\n`);
    spawnSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", audioPath], {
      encoding: "utf8"
    });
  } else if (hadAudioA) {
    fs.copyFileSync(audioA, audioPath);
  } else if (hadAudioB) {
    fs.copyFileSync(audioB, audioPath);
  } else {
    hadAudio = false;
  }

  await context.close();
  await browser.close();

  const webmRaw = fs.readdirSync(videoDir).find(f => f.endsWith(".webm"));
  const videoOnly = path.join(outDir, "episode1-youtube-video.webm");
  if (webmRaw) fs.copyFileSync(path.join(videoDir, webmRaw), videoOnly);

  const mp4 = path.join(outDir, "episode1-youtube.mp4");
  const webmOut = path.join(outDir, "episode1-youtube.webm");
  if (hadAudio && webmRaw) {
    muxVideoAudio(videoOnly, audioPath, mp4);
    spawnSync(
      "ffmpeg",
      ["-y", "-i", videoOnly, "-i", audioPath, "-c:v", "copy", "-c:a", "libopus", "-shortest", webmOut],
      { encoding: "utf8" }
    );
  } else if (webmRaw) {
    fs.copyFileSync(videoOnly, webmOut);
  }

  const deliverable = fs.existsSync(webmOut) && hadAudio ? webmOut : fs.existsSync(mp4) ? mp4 : webmOut;
  const sizeMb = fs.statSync(deliverable).size / (1024 * 1024);
  const probe = ffprobeSummary(deliverable);

  const md = [
    "# Episode 1 — YouTube capture timecodes",
    "",
    `Recorded: Playwright Chromium 1920×1080, \`html.episode-capture\` (no account HUD / version / credits).`,
    `Deliverable: \`${path.relative(path.join(__dirname, ".."), deliverable)}\` (${sizeMb.toFixed(2)} MB)`,
    "",
    "## ffprobe (audio check)",
    "```",
    probe,
    "```",
    "",
    "| Time | Moment | Notes |",
    "| --- | --- | --- |"
  ];
  marks.forEach(m => {
    const purchase =
      /shop|buy|price|лавк|coins|purchase/i.test(`${m.label} ${m.extra}`) ? " **prices/coins on screen**" : "";
    md.push(`| ${fmt(m.sec)} | ${m.label} | ${m.extra}${purchase} |`);
  });
  md.push(
    "",
    "## Episode beats (EPISODE1.md)",
    "- Onboarding: move → street → talk Razor → cemetery → duel win → shop buy → `onboarding.done`",
    "- Finale: `dlg_razor_initiation` → accept pay path → `q_initiation_pay`",
    "- Reload: persistence of coins, onboarding.done, active story quest"
  );
  fs.writeFileSync(path.join(outDir, "TIMECODES.md"), md.join("\n"));
  fs.writeFileSync(
    path.join(outDir, "episode1-youtube-meta.json"),
    JSON.stringify({ deliverable, sizeMb, probe, hadAudio, marks }, null, 2)
  );
  console.log("Wrote", deliverable, sizeMb.toFixed(2), "MB");
  console.log(probe);
  if (!process.env.PUNK_BASE) stop();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
