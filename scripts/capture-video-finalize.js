/**
 * Playwright + ffmpeg recording finalize and owner evidence gates (t209).
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawn, spawnSync } = require("child_process");

const FFPROBE = process.env.FFPROBE_PATH || "/usr/bin/ffprobe";
const FFMPEG = process.env.FFMPEG_PATH || "/usr/bin/ffmpeg";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function sha256File(filePath) {
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(filePath));
  return h.digest("hex");
}

function ffprobeMeta(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return { path: filePath, error: "missing" };
  }
  try {
    const r = spawnSync(
      FFPROBE,
      ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filePath],
      { encoding: "utf8" }
    );
    if (r.status !== 0) return { error: r.stderr || "ffprobe failed", path: filePath };
    const j = JSON.parse(r.stdout);
    const v = (j.streams || []).find(s => s.codec_type === "video");
    const a = (j.streams || []).find(s => s.codec_type === "audio");
    return {
      path: filePath,
      durationSec: j.format?.duration ? +j.format.duration : null,
      sizeBytes: fs.statSync(filePath).size,
      video: v ? { codec: v.codec_name, width: v.width, height: v.height, fps: v.avg_frame_rate } : null,
      audio: a ? { codec: a.codec_name, channels: a.channels } : null,
      audioStatus: a ? "HAS_AUDIO_TRACK" : "SILENT_NO_AUDIO_TRACK",
    };
  } catch (e) {
    return { path: filePath, error: String(e.message || e) };
  }
}

function waitForFileStable(filePath, timeoutMs, minBytes) {
  return new Promise(resolve => {
    const start = Date.now();
    let last = -1;
    let stable = 0;
    const tick = () => {
      if (!filePath || !fs.existsSync(filePath)) {
        if (Date.now() - start >= timeoutMs) return resolve(false);
        return setTimeout(tick, 800);
      }
      const sz = fs.statSync(filePath).size;
      if (sz >= minBytes && sz === last) {
        stable += 1;
        if (stable >= 4) return resolve(true);
      } else {
        stable = 0;
      }
      last = sz;
      if (Date.now() - start >= timeoutMs) return resolve(sz >= minBytes);
      setTimeout(tick, 800);
    };
    tick();
  });
}

async function stopFfmpegGraceful(proc, mkvDest, minBytes) {
  if (!proc) return false;
  try {
    if (proc.stdin?.writable) {
      proc.stdin.write("q");
      try {
        proc.stdin.end();
      } catch (_) {}
    } else if (proc.kill) {
      proc.kill("SIGINT");
    }
  } catch (_) {}
  const ok = await waitForFileStable(mkvDest, 180000, minBytes);
  await new Promise(resolve => {
    if (proc.exitCode != null) return resolve();
    proc.once("close", resolve);
    setTimeout(resolve, 8000);
  });
  return ok && fs.existsSync(mkvDest) && fs.statSync(mkvDest).size >= minBytes;
}

function remuxMkvToWebm(mkvPath, webmPath) {
  if (!fs.existsSync(mkvPath)) return { ok: false, error: "mkv missing" };
  fs.mkdirSync(path.dirname(webmPath), { recursive: true });
  const r = spawnSync(
    FFMPEG,
    ["-y", "-hide_banner", "-loglevel", "error", "-i", mkvPath, "-c:v", "libvpx-vp9", "-b:v", "1.5M", webmPath],
    { encoding: "utf8" }
  );
  if (r.status !== 0 || !fs.existsSync(webmPath)) {
    const r2 = spawnSync(
      FFMPEG,
      ["-y", "-hide_banner", "-loglevel", "error", "-i", mkvPath, "-c:v", "libx264", "-preset", "fast", "-crf", "23", webmPath.replace(/\.webm$/i, ".mp4")],
      { encoding: "utf8" }
    );
    const mp4 = webmPath.replace(/\.webm$/i, ".mp4");
    if (r2.status === 0 && fs.existsSync(mp4)) return { ok: true, path: mp4, format: "mp4" };
    return { ok: false, error: r.stderr || r2.stderr || "remux failed" };
  }
  return { ok: true, path: webmPath, format: "webm" };
}

async function closePlaywrightRecordingSession(rec) {
  const { page, ctx } = rec;
  try {
    if (page && typeof page.isClosed === "function" && !page.isClosed()) {
      await page.close({ runBeforeUnload: false });
    } else if (page) await page.close().catch(() => {});
  } catch (e) {
    rec._pageCloseErr = String(e.message || e);
  }
  try {
    if (ctx) await ctx.close();
  } catch (e) {
    rec._ctxCloseErr = String(e.message || e);
  }
  return true;
}

async function savePlaywrightVideoAfterBrowserClose(rec) {
  const { _video: video, file: dest, minVideoBytes: minB } = rec;
  if (!video || !dest) return { ok: false, error: "no_video_handle" };
  const deadline = Date.now() + 180000;
  let lastErr = "pending_ctx_close";
  while (Date.now() < deadline) {
    try {
      const vp = await video.path();
      if (vp && fs.existsSync(vp)) {
        const sz = fs.statSync(vp).size;
        if (sz >= minB) {
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          try {
            await video.saveAs(dest);
          } catch (_) {
            fs.copyFileSync(vp, dest);
          }
          if (fs.existsSync(dest) && fs.statSync(dest).size >= minB) {
            return { ok: true, source: vp };
          }
        }
      }
    } catch (e) {
      lastErr = String(e.message || e);
    }
    await sleep(750);
  }
  return { ok: false, error: lastErr };
}

function extractFramesAtTimes(videoPath, timesSec, outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const outputs = [];
  for (const t of timesSec) {
    const out = path.join(outDir, `frame-${String(Math.round(t * 10)).padStart(5, "0")}.png`);
    const r = spawnSync(
      FFMPEG,
      [
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        String(Math.max(0, t)),
        "-i",
        videoPath,
        "-frames:v",
        "1",
        out,
      ],
      { encoding: "utf8" }
    );
    if (r.status === 0 && fs.existsSync(out)) outputs.push({ tSec: t, path: out });
  }
  return outputs;
}

function validateHeroStillSnapshots(stills, required = 6) {
  const passes = (stills || []).filter(s => {
    const pl = s.snap?.pl || s.snap?.player || {};
    const meshId = s.snap?.meshId || pl.meshHeroId;
    const accent = pl.accent;
    return (
      meshId === "mohawk" &&
      (accent === "blue" || accent === "teal") &&
      !!pl.hasWings &&
      pl.usesPinkFallback !== true &&
      pl.meshVisible !== false
    );
  });
  return {
    ok: passes.length >= required,
    required,
    passCount: passes.length,
    tags: passes.map(s => s.tag),
    failTags: (stills || []).filter(s => !passes.includes(s)).map(s => s.tag),
  };
}

function validateDurationGate(sessionWallSec, durationSec, tolerance = 0.1) {
  if (!sessionWallSec || !durationSec) {
    return { ok: false, reason: "missing_duration_or_wall", sessionWallSec, durationSec };
  }
  const delta = Math.abs(durationSec - sessionWallSec) / sessionWallSec;
  return {
    ok: delta <= tolerance,
    sessionWallSec,
    durationSec,
    deltaRatio: +delta.toFixed(4),
    tolerance,
  };
}

module.exports = {
  sleep,
  sha256File,
  ffprobeMeta,
  stopFfmpegGraceful,
  remuxMkvToWebm,
  closePlaywrightRecordingSession,
  savePlaywrightVideoAfterBrowserClose,
  extractFramesAtTimes,
  validateHeroStillSnapshots,
  validateDurationGate,
};