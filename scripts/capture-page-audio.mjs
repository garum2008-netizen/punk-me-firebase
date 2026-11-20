/**
 * Playwright's video is silent. This taps the page's Audio elements
 * and returns the spoken bytes so the recording can gain a track.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";

export const AUDIO_INIT = `(() => {
  if (window.__punkAudioReady) return;
  window.__punkAudioReady = true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC || typeof MediaRecorder === "undefined" || typeof window.Audio !== "function") {
    window.__punkAudioStop = async () => null;
    return;
  }
  const ctx = new AC();
  const mix = ctx.createGain();
  const dest = ctx.createMediaStreamDestination();
  mix.connect(dest);
  try { mix.connect(ctx.destination); } catch (_) {}
  const Orig = window.Audio;
  const origPlay = Orig.prototype.play;
  Orig.prototype.play = function (...args) {
    try { ctx.resume(); } catch (_) {}
    return origPlay.apply(this, args);
  };
  function AudioProxy(...args) {
    const el = new Orig(...args);
    try { ctx.createMediaElementSource(el).connect(mix); } catch (_) {}
    return el;
  }
  AudioProxy.prototype = Orig.prototype;
  window.Audio = AudioProxy;
  const chunks = [];
  let rec;
  try { rec = new MediaRecorder(dest.stream); }
  catch (_) {
    window.__punkAudioStop = async () => null;
    return;
  }
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
  rec.start(500);
  window.__punkAudioStop = () => new Promise((resolve) => {
    const finish = async () => {
      const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
      const buf = new Uint8Array(await blob.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 8192) {
        bin += String.fromCharCode.apply(null, buf.subarray(i, i + 8192));
      }
      resolve({ mime: blob.type || "audio/webm", b64: btoa(bin) });
    };
    if (rec.state === "inactive") { finish(); return; }
    rec.addEventListener("stop", () => { finish(); }, { once: true });
    try { rec.requestData(); } catch (_) {}
    try { rec.stop(); } catch (_) { resolve(null); }
  });
})();`;

export function writeCapture(captured, dest) {
  if (!captured?.b64) return false;
  fs.writeFileSync(dest, Buffer.from(captured.b64, "base64"));
  return fs.statSync(dest).size > 200;
}

export function muxVideoAudio(videoPath, audioPath, destPath) {
  const result = spawnSync("ffmpeg", [
    "-y", "-i", videoPath, "-i", audioPath,
    "-c:v", "copy", "-c:a", "libopus", "-shortest", destPath
  ], { encoding: "utf8" });
  return result.status === 0 && fs.existsSync(destPath);
}

export function audioMeanDb(file) {
  const result = spawnSync("ffmpeg", [
    "-i", file, "-af", "volumedetect", "-f", "null", "-"
  ], { encoding: "utf8" });
  const text = `${result.stdout || ""}\n${result.stderr || ""}`;
  const match = text.match(/mean_volume:\s*(-?[\d.]+)\s*dB/);
  return match ? Number(match[1]) : null;
}
