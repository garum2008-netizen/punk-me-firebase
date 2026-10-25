const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");
const { probeDuration } = require("./validate-episode1-recording");

function makeSilenceWav(outPath, seconds) {
  if (seconds <= 0.05) return null;
  spawnSync(
    "ffmpeg",
    ["-y", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=2", "-t", String(seconds), outPath],
    { stdio: "ignore" }
  );
  return fs.existsSync(outPath) ? outPath : null;
}

function concatAudioParts(parts, outPath, tmpDir) {
  fs.mkdirSync(tmpDir, { recursive: true });
  const listLines = [];
  for (const p of parts) {
    if (!p || !fs.existsSync(p)) continue;
    listLines.push(`file '${p.replace(/'/g, "'\\''")}'`);
  }
  if (!listLines.length) return false;
  const list = path.join(tmpDir, "audio-concat.txt");
  fs.writeFileSync(list, listLines.join("\n"));
  const r = spawnSync("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", outPath], {
    encoding: "utf8"
  });
  return r.status === 0 && fs.existsSync(outPath);
}

/**
 * Mux video (master clock) with audio; never use -shortest. Pad or trim audio to video duration.
 */
function muxVideoWithAudio(videoPath, audioPath, outPath, { videoCodec = "copy", audioCodec = "libopus" } = {}) {
  const vDur = probeDuration(videoPath);
  let aDur = 0;
  try {
    aDur = probeDuration(audioPath);
  } catch {
    aDur = 0;
  }

  const args = ["-y", "-i", videoPath];
  if (aDur > 0) args.push("-i", audioPath);

  if (aDur <= 0) {
    args.push("-c:v", videoCodec === "copy" ? "copy" : "libx264", "-an", outPath);
  } else if (aDur < vDur - 0.25) {
    args.push(
      "-filter_complex",
      `[1:a]apad=whole_dur=${vDur.toFixed(3)}[aout]`,
      "-map",
      "0:v:0",
      "-map",
      "[aout]",
      "-c:v",
      videoCodec === "copy" ? "copy" : "libx264",
      "-c:a",
      audioCodec,
      "-t",
      String(vDur),
      outPath
    );
  } else {
    args.push(
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      videoCodec === "copy" ? "copy" : "libx264",
      "-c:a",
      audioCodec,
      "-t",
      String(vDur),
      outPath
    );
  }
  const r = spawnSync("ffmpeg", args, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || "mux failed");
  return { videoDurationSec: vDur, audioDurationSec: aDur };
}

function normalizeAudioLufs(inPath, outPath, targetI = -13) {
  const r = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-i",
      inPath,
      "-af",
      `loudnorm=I=${targetI}:TP=-1.5:LRA=7,volume=18dB`,
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      outPath
    ],
    { encoding: "utf8" }
  );
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || "loudnorm failed");
  return outPath;
}

module.exports = { muxVideoWithAudio, concatAudioParts, makeSilenceWav, normalizeAudioLufs };
