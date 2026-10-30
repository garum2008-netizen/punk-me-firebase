#!/usr/bin/env node
/** One-line samples per approved audit voice (for Inna listening). */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";

const root = process.cwd();
const outDir = path.join(root, "qa/voice-audit/samples");
const PIPER = process.env.PIPER_BIN || path.join(root, "tools/piper/piper");
const HF = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0";

const SAMPLES = [
  { id: "ru-denis", model: "ru/ru_RU/denis/medium", text: "Ты — новенький в доме номер тринадцать." },
  { id: "ru-dmitri", model: "ru/ru_RU/dmitri/medium", text: "Хочешь в банду? Докажи." },
  { id: "da-talesyntese", model: "da/da_DK/talesyntese/medium", text: "Velkommen til banden." },
  { id: "en-ljspeech", model: "en/en_US/ljspeech/medium", text: "Welcome to the gang, punk." },
  { id: "en-cori", model: "en/en_GB/cori/medium", text: "The cemetery pays fair." }
];

function modelPath(rel) {
  const onnx = path.join(root, "tools/piper-models", rel + ".onnx");
  return fs.existsSync(onnx) ? onnx : null;
}

fs.mkdirSync(outDir, { recursive: true });

for (const s of SAMPLES) {
  const onnx = modelPath(s.model);
  if (!onnx) {
    console.warn("SKIP (no model):", s.id, s.model);
    continue;
  }
  const ogg = path.join(outDir, `${s.id}.ogg`);
  const wav = ogg.replace(".ogg", ".wav");
  spawnSync(PIPER, ["--model", onnx, "--output_file", wav], { input: s.text, encoding: "utf8" });
  spawnSync("ffmpeg", ["-y", "-i", wav, "-c:a", "libvorbis", "-q:a", "4", ogg], { stdio: "pipe" });
  try { fs.unlinkSync(wav); } catch (e) {}
  console.log("wrote", ogg);
}
