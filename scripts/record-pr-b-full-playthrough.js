#!/usr/bin/env node
/**
 * Full PR B story capture (Episode 1 + building layer), Web Audio mux, 1080p mp4.
 */
const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { start, stop } = require("./local-static-server");
const H = require("./playthrough-ui-helpers");
const Flow = require("./pr-b-ui-flow");
const Ep1 = require("./episode1-ui-flow");
const { probeDuration } = require("./validate-episode1-recording");
const { validatePrBRecording } = require("./validate-pr-b-recording");
const { muxVideoWithAudio, normalizeAudioLufs } = require("./episode1-audio-mux");
const audioIngest = require("./episode1-audio-ingest");

const outDir = path.join(__dirname, "../qa/pr-b-full");
const artifactDir = "/opt/cursor/artifacts";
fs.mkdirSync(outDir, { recursive: true });

const marks = [];
let t0 = 0;
let lastMarkSec = -1;
function mark(label, extra = "") {
  let sec = (Date.now() - t0) / 1000;
  if (sec <= lastMarkSec) sec = lastMarkSec + 0.25;
  lastMarkSec = sec;
  marks.push({ sec, label, extra });
  fs.appendFileSync(path.join(outDir, "marks.jsonl"), JSON.stringify({ sec, label, extra }) + "\n");
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const r = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

async function injectEpisodeAudioBridge(context, port) {
  await context.addInitScript(p => {
    const segmentEndpoint = `http://127.0.0.1:${p}/segment`;
    window.__ep1AudioEndpoint = segmentEndpoint;
    window.__ep1CaptureActive = false;
    window.__ep1StartAudioCapture = async function resume() {
      await window.AudioManager?.unlockAudio?.();
      const loc = window.me?.location || "room";
      window.AudioManager?.setLocationMusic?.(loc);
      window.AudioManager?.setChannelVolume?.("music", 0.82);
      window.AudioManager?.setChannelVolume?.("sfx", 0.88);
      window.AudioManager?.setChannelVolume?.("speech", 0.9);
      const stream = window.AudioManager?.installCaptureTap?.();
      if (!stream) return { ok: false };
      if (window.__ep1AudioRecorder) {
        try {
          window.__ep1AudioRecorder.stop();
        } catch (e) {}
      }
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 160000 });
      const blobs = [];
      rec.ondataavailable = e => {
        if (e.data?.size) blobs.push(e.data);
      };
      rec.onstop = () => {
        const body = new Blob(blobs, { type: mime });
        if (body.size > 256) {
          fetch(segmentEndpoint, { method: "POST", body, mode: "cors" }).catch(() => {});
        }
      };
      rec.start();
      window.__ep1AudioRecorder = rec;
      window.__ep1CaptureActive = true;
      return { ok: true, resume: !!resume };
    };
    window.__ep1StopAudioCapture = async function () {
      window.__ep1CaptureActive = false;
      const rec = window.__ep1AudioRecorder;
      if (!rec || rec.state === "inactive") return;
      await new Promise(resolve => {
        const prev = rec.onstop;
        rec.onstop = () => {
          if (typeof prev === "function") prev();
          resolve();
        };
        try {
          rec.stop();
        } catch (e) {
          resolve();
        }
      });
      window.__ep1AudioRecorder = null;
    };
    window.addEventListener("pageshow", () => {
      if (window.__ep1CaptureActive && document.documentElement.classList.contains("episode-capture")) {
        window.__ep1StartAudioCapture(true);
      }
    });
  }, port);
}

function trimFromMark(videoIn, audioIn, trimSec, videoOutMp4, audioOut) {
  const ss = Math.max(0, trimSec);
  if (ss <= 0.05 && videoIn.endsWith(".mp4")) {
    fs.copyFileSync(videoIn, videoOutMp4);
  } else {
    spawnSync(
      "ffmpeg",
      [
        "-y",
        "-ss",
        String(ss),
        "-i",
        videoIn,
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "22",
        "-pix_fmt",
        "yuv420p",
        "-an",
        videoOutMp4
      ],
      { stdio: "inherit" }
    );
  }
  if (audioIn && fs.existsSync(audioIn)) {
    spawnSync(
      "ffmpeg",
      ["-y", "-ss", String(ss), "-i", audioIn, "-c:a", "aac", "-b:a", "192k", audioOut],
      { stdio: "inherit" }
    );
  }
}

function writeTimecodes(mp4Path, duration, trimOffset = 0) {
  const lines = [
    "# PUNK ME — full PR B playthrough (Episode 1 + building layer)",
    "",
    `**File:** \`qa/pr-b-full/punk-me-ep-full-1080p.mp4\``,
    `**Duration:** ${fmt(duration)} (${duration.toFixed(1)}s)`,
    trimOffset > 0 ? `**Trim:** leading ${trimOffset.toFixed(2)}s removed (no white boot frame)` : "",
    "",
    "| Time | Event | Notes |",
    "| --- | --- | --- |"
  ];
  marks.forEach(m => {
    const t = Math.max(0, m.sec - trimOffset);
    lines.push(`| ${fmt(t)} | ${m.label} | ${m.extra || ""} |`);
  });
  fs.writeFileSync(path.join(outDir, "TIMECODES.md"), lines.filter(Boolean).join("\n") + "\n");
}

async function main() {
  try {
    fs.unlinkSync(path.join(outDir, "marks.jsonl"));
  } catch (e) {}
  const base = process.env.PUNK_BASE || await start();
  const rawAudioPath = path.join(outDir, "pr-b-audio-raw.webm");
  const audioPort = await audioIngest.start(rawAudioPath);
  const videoDir = path.join(outDir, "capture-raw");
  fs.mkdirSync(videoDir, { recursive: true });
  for (const f of fs.readdirSync(videoDir)) {
    if (f.endsWith(".webm")) try { fs.unlinkSync(path.join(videoDir, f)); } catch (e) {}
  }

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: videoDir, size: { width: 1920, height: 1080 } },
    locale: "ru-RU"
  });
  await context.addInitScript(() => {
    document.documentElement.classList.add("episode-capture");
    try {
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (e) {}
    const patchSave = () => {
      if (!window.saveMe || window.__saveMePatched) return;
      const orig = window.saveMe;
      window.saveMe = function patchedSaveMe() {
        const earn = window.me?.story?.earn;
        if (earn && typeof earn === "object") {
          Object.keys(earn).forEach(k => {
            if (earn[k] === undefined) delete earn[k];
          });
        }
        return orig.apply(this, arguments);
      };
      window.__saveMePatched = true;
    };
    window.addEventListener("load", patchSave);
    setInterval(patchSave, 500);
  });
  await injectEpisodeAudioBridge(context, audioPort);
  const page = await context.newPage();

  t0 = Date.now();
  mark("boot", "page load");
  await H.bootSolo(page, base, "pr-b-full", { episodeCapture: true });
  await H.pickCobaltUi(page);
  mark("char_select", "Cobalt");
  await H.dismissHowToOverlay(page);
  mark("start_overlay", "chapter intro");
  await H.skipChapterIntro(page);
  await H.unlockGameAudio(page);
  mark("start_game", "audio unlock");
  const audioMeta = await page.evaluate(() => window.__ep1StartAudioCapture());
  if (!audioMeta?.ok) console.warn("Web Audio capture:", audioMeta);
  await H.dismissHowToOverlay(page);
  await H.sleep(1500);

  await Flow.runFullPrBPlaythrough(page, { mark, recordPacing: true });

  const reload = await Ep1.reloadAndContinue(page);
  mark("reload_continue", `quest=${reload.after.quest} coins=${reload.after.coins}`);
  await H.dismissHowToOverlay(page);
  await H.sleep(4000);

  await page.evaluate(() => window.__ep1StopAudioCapture());
  await H.sleep(3000);
  audioIngest.finalizeConcat();
  audioIngest.stop();
  await context.close();
  await browser.close();

  const webmRaw = fs
    .readdirSync(videoDir)
    .filter(f => f.endsWith(".webm"))
    .map(f => ({ f, m: fs.statSync(path.join(videoDir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)[0]?.f;
  if (!webmRaw) throw new Error("no Playwright video");
  const videoOnly = path.join(outDir, "video-raw.webm");
  fs.copyFileSync(path.join(videoDir, webmRaw), videoOnly);

  const startGameMark = marks.find(m => m.label === "start_game");
  const trimSec = startGameMark ? Math.max(0, startGameMark.sec - 0.15) : 0.8;
  const videoTrim = path.join(outDir, "video-trim.mp4");
  const audioNorm = path.join(outDir, "audio-norm.m4a");
  const hadAudio = fs.existsSync(rawAudioPath) && fs.statSync(rawAudioPath).size > 8000;
  let audioTrim = path.join(outDir, "audio-trim.m4a");
  if (hadAudio) {
    normalizeAudioLufs(rawAudioPath, path.join(outDir, "audio-norm-raw.m4a"));
    audioTrim = path.join(outDir, "audio-norm-raw.m4a");
  }
  trimFromMark(videoOnly, hadAudio ? audioTrim : null, trimSec, videoTrim, path.join(outDir, "audio-trim-out.m4a"));
  if (hadAudio) audioTrim = path.join(outDir, "audio-trim-out.m4a");

  const mp4 = path.join(outDir, "punk-me-ep-full-1080p.mp4");
  if (hadAudio && fs.existsSync(audioTrim)) {
    muxVideoWithAudio(videoTrim, audioTrim, mp4, { videoCodec: "libx264", audioCodec: "aac" });
  } else {
    execSync(`ffmpeg -y -i "${videoTrim}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -an "${mp4}"`, { stdio: "inherit" });
  }

  const duration = probeDuration(mp4);
  writeTimecodes(mp4, duration, trimSec);
  fs.mkdirSync(artifactDir, { recursive: true });
  try {
    fs.copyFileSync(mp4, path.join(artifactDir, "punk-me-ep-full-1080p.mp4"));
  } catch (e) {}

  validatePrBRecording(mp4, outDir);

  if (!process.env.PUNK_BASE) stop();
  console.log("Wrote", mp4, `${duration.toFixed(1)}s`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
