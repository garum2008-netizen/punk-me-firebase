#!/usr/bin/env node
/**
 * Full Episode 1 capture for YouTube (1080p, game-only framing, game audio muxed).
 * Video clock = wall clock from first page load; mux never uses -shortest (video is master).
 */
const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { start, stop } = require("./local-static-server");
const H = require("./playthrough-ui-helpers");
const Flow = require("./episode1-ui-flow");
const { validateEpisode1Recording, probeDuration } = require("./validate-episode1-recording");
const { muxVideoWithAudio, concatAudioParts, makeSilenceWav } = require("./episode1-audio-mux");

const outDir = path.join(__dirname, "../qa/episode1");
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
  try {
    fs.appendFileSync(path.join(outDir, "episode1-youtube-marks.jsonl"), JSON.stringify({ sec, label, extra }) + "\n");
  } catch (e) {}
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
    const streams = execSync(
      `ffprobe -v error -show_entries stream=codec_type,codec_name,sample_rate,channels -of default=noprint_wrappers=1 "${filePath}"`,
      { encoding: "utf8" }
    ).trim();
    const dur = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`,
      { encoding: "utf8" }
    ).trim();
    return `${streams}\nformat_duration=${dur}`;
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

function publishDeliverables(videoOnly, webmOut, mp4Out, meta) {
  const vDur = probeDuration(videoOnly);
  meta.videoDurationSec = vDur;
  const mp4Size = fs.existsSync(mp4Out) ? fs.statSync(mp4Out).size : 0;
  const webmSize = fs.existsSync(webmOut) ? fs.statSync(webmOut).size : 0;
  meta.mp4Bytes = mp4Size;
  meta.webmBytes = webmSize;

  const mb15 = 15 * 1024 * 1024;
  if (mp4Size > mb15) {
    fs.mkdirSync(artifactDir, { recursive: true });
    const artMp4 = path.join(artifactDir, "episode1-youtube-full.mp4");
    fs.copyFileSync(mp4Out, artMp4);
    meta.mp4ArtifactPath = artMp4;
    spawnSync(
      "ffmpeg",
      ["-y", "-i", mp4Out, "-c:v", "libx264", "-crf", "28", "-preset", "slow", "-c:a", "aac", "-b:a", "96k", path.join(outDir, "episode1-youtube-git.mp4")],
      { stdio: "ignore" }
    );
    const gitMp4 = path.join(outDir, "episode1-youtube-git.mp4");
    if (fs.existsSync(gitMp4) && fs.statSync(gitMp4).size <= mb15) {
      fs.copyFileSync(gitMp4, mp4Out);
    }
  }

  if (webmSize > mb15) {
    fs.mkdirSync(artifactDir, { recursive: true });
    const artWebm = path.join(artifactDir, "episode1-youtube-full.webm");
    fs.copyFileSync(webmOut, artWebm);
    meta.webmArtifactPath = artWebm;
    spawnSync(
      "ffmpeg",
      ["-y", "-i", webmOut, "-c:v", "libvpx-vp9", "-crf", "35", "-b:v", "0", "-c:a", "libopus", "-b:a", "96k", path.join(outDir, "episode1-youtube-git.webm")],
      { stdio: "ignore" }
    );
    const gitWebm = path.join(outDir, "episode1-youtube-git.webm");
    if (fs.existsSync(gitWebm) && fs.statSync(gitWebm).size <= mb15) {
      fs.copyFileSync(gitWebm, webmOut);
    }
  }
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
  try {
    fs.unlinkSync(path.join(outDir, "episode1-youtube-marks.jsonl"));
  } catch (e) {}
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
  await H.sleep(1200);

  await Flow.runFullEpisode1Ui(page, {
    mark,
    walkMs: 6200,
    recordPacing: true,
    snapDir: outDir,
    snapTag: "youtube"
  });

  const audioA = path.join(outDir, "episode1-youtube-audio-a.webm");
  const audioStopSec = (Date.now() - t0) / 1000;
  const hadAudioA = await stopInPageAudioRecorder(page, audioA).catch(() => false);

  const reload = await Flow.reloadAndContinue(page);
  const audioRestartSec = (Date.now() - t0) / 1000;
  mark(
    "reload_continue",
    `onboarding.done=${reload.after.done} quest=${reload.after.quest} coins ${reload.after.coins} (was ${reload.coinsBefore})`
  );

  await startInPageAudioRecorder(page);
  await H.sleep(3500);
  const audioB = path.join(outDir, "episode1-youtube-audio-b.webm");
  const hadAudioB = await stopInPageAudioRecorder(page, audioB).catch(() => false);

  await context.close();
  await browser.close();

  const webmRaw = fs
    .readdirSync(videoDir)
    .filter(f => f.endsWith(".webm"))
    .map(f => ({ f, m: fs.statSync(path.join(videoDir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)[0]?.f;
  const videoOnly = path.join(outDir, "episode1-youtube-video.webm");
  if (!webmRaw) throw new Error("no Playwright recordVideo output");
  fs.copyFileSync(path.join(videoDir, webmRaw), videoOnly);

  const tmpAudio = path.join(outDir, "episode1-audio-tmp");
  const silenceWav = path.join(tmpAudio, "reload-gap.wav");
  const gapSec = Math.max(0, audioRestartSec - audioStopSec);
  const parts = [];
  if (hadAudioA) parts.push(audioA);
  if (gapSec > 0.1) {
    makeSilenceWav(silenceWav, gapSec);
    if (fs.existsSync(silenceWav)) parts.push(silenceWav);
  }
  if (hadAudioB) parts.push(audioB);
  const audioPath = path.join(outDir, "episode1-youtube-audio.webm");
  const hadAudio = concatAudioParts(parts, audioPath, tmpAudio);

  const mp4 = path.join(outDir, "episode1-youtube.mp4");
  const webmOut = path.join(outDir, "episode1-youtube.webm");

  if (hadAudio) {
    muxVideoWithAudio(videoOnly, audioPath, mp4, { videoCodec: "libx264", audioCodec: "aac" });
    muxVideoWithAudio(videoOnly, audioPath, webmOut, { videoCodec: "copy", audioCodec: "libopus" });
  } else {
    fs.copyFileSync(videoOnly, webmOut);
    spawnSync("ffmpeg", ["-y", "-i", videoOnly, "-c:v", "libx264", "-preset", "fast", "-crf", "23", mp4], {
      encoding: "utf8"
    });
  }

  const rawVideoDur = probeDuration(videoOnly);
  const webmDur = probeDuration(webmOut);
  const mp4Dur = probeDuration(mp4);

  const meta = {
    marks,
    hadAudio,
    audioStopSec,
    audioRestartSec,
    rawVideoDurationSec: rawVideoDur,
    deliverableWebmDurationSec: webmDur,
    deliverableMp4DurationSec: mp4Dur,
    probeWebm: ffprobeSummary(webmOut),
    probeMp4: ffprobeSummary(mp4)
  };

  meta.marks = marks;
  fs.writeFileSync(path.join(outDir, "episode1-youtube-meta.json"), JSON.stringify(meta, null, 2));

  validateEpisode1Recording(
    process.env.VALIDATE_FULL
      ? path.join(artifactDir, "episode1-youtube-full.webm")
      : webmOut,
    marks,
    outDir
  );

  if (process.env.SKIP_PUBLISH !== "1") {
    publishDeliverables(videoOnly, webmOut, mp4, meta);
  }

  const deliverable = webmOut;
  const sizeMb = fs.statSync(deliverable).size / (1024 * 1024);
  const md = [
    "# Episode 1 — YouTube capture timecodes",
    "",
    "Recorded: Playwright Chromium 1920×1080, `html.episode-capture`.",
    `Deliverable: \`qa/episode1/episode1-youtube.webm\``,
    "",
    "## ffprobe (measured)",
    "```",
    meta.probeWebm,
    "```",
    "",
    `format_duration_sec (webm): **${webmDur.toFixed(3)}**`,
    `format_duration_sec (mp4): **${mp4Dur.toFixed(3)}**`,
    `raw_playwright_video_sec: **${rawVideoDur.toFixed(3)}**`,
    "",
    "| Time | Moment | Notes |",
    "| --- | --- | --- |"
  ];
  marks.forEach(m => {
    const purchase =
      /shop|buy|price|лавк|coins|purchase/i.test(`${m.label} ${m.extra}`) ? " **prices/coins on screen**" : "";
    md.push(`| ${fmt(m.sec)} | ${m.label} | ${m.extra}${purchase} |`);
  });
  md.push("", "Frames: `qa/episode1/frames/`, contact: `qa/episode1/contact-sheet.png`");
  fs.writeFileSync(path.join(outDir, "TIMECODES.md"), md.join("\n"));
  fs.writeFileSync(path.join(outDir, "episode1-youtube-meta.json"), JSON.stringify({ ...meta, marks }, null, 2));

  console.log("Wrote", deliverable, sizeMb.toFixed(2), "MB", `duration=${webmDur.toFixed(3)}s`);
  console.log(meta.probeWebm);
  if (!process.env.PUNK_BASE) stop();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
