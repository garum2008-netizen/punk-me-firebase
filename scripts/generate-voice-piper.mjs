#!/usr/bin/env node
/**
 * Generate assets/audio/voice/{lang}/{id}.ogg via Piper (local, no API).
 * Voices: MIT / permissive models from rhasspy/piper-voices — see docs/audio/LICENSES.md
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const linesPath = path.join(root, "data/audio/voice-lines.json");
const voiceRoot = path.join(root, "assets/audio/voice");
const modelsDir = path.join(root, "tools/piper-models");

const PIPER_BIN = process.env.PIPER_BIN || path.join(root, "tools/piper/piper");
const HF = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0";

/** characterId -> per-lang Piper model folder (voice name differs per cast) */
const CAST = {
  razor: {
    en: "en/en_US/ryan/medium",
    ru: "ru/ru_RU/dmitri/medium",
    da: "da/da_DK/talesyntese/medium"
  },
  mohawk: {
    en: "en/en_US/lessac/medium",
    ru: "ru/ru_RU/irina/medium",
    da: "da/da_DK/talesyntese/medium"
  },
  cobalt: {
    en: "en/en_US/joe/medium",
    ru: "ru/ru_RU/ruslan/medium",
    da: "da/da_DK/talesyntese/medium"
  },
  ghost: {
    en: "en/en_US/amy/medium",
    ru: "ru/ru_RU/ruslan/medium",
    da: "da/da_DK/talesyntese/medium"
  },
  vienna: {
    en: "en/en_US/lessac/medium",
    ru: "ru/ru_RU/irina/medium",
    da: "da/da_DK/talesyntese/medium"
  },
  gravedigger: {
    en: "en/en_US/ryan/medium",
    ru: "ru/ru_RU/dmitri/medium",
    da: "da/da_DK/talesyntese/medium"
  },
  zoya: { en: "en/en_US/lessac/medium", ru: "ru/ru_RU/irina/medium", da: "da/da_DK/talesyntese/medium" },
  plukh: { en: "en/en_US/joe/medium", ru: "ru/ru_RU/ruslan/medium", da: "da/da_DK/talesyntese/medium" },
  tony: { en: "en/en_US/joe/medium", ru: "ru/ru_RU/dmitri/medium", da: "da/da_DK/talesyntese/medium" },
  narrator: {
    en: "en/en_US/lessac/medium",
    ru: "ru/ru_RU/irina/medium",
    da: "da/da_DK/talesyntese/medium"
  },
  npc: {
    en: "en/en_US/ryan/medium",
    ru: "ru/ru_RU/dmitri/medium",
    da: "da/da_DK/talesyntese/medium"
  }
};

const LENGTH_SCALE = {
  razor: 0.92,
  mohawk: 1.05,
  cobalt: 0.98,
  ghost: 1.08,
  vienna: 1.02,
  gravedigger: 0.88,
  narrator: 1.0,
  zoya: 1.04,
  plukh: 1.12,
  tony: 0.96,
  npc: 1.0
};

function modelPaths(rel) {
  const parts = rel.split("/");
  const name = parts[parts.length - 2] + "-" + parts[parts.length - 1];
  const lang = parts[0];
  const base = path.join(modelsDir, lang, name);
  return {
    onnx: `${base}.onnx`,
    json: `${base}.onnx.json`,
    urlOnnx: `${HF}/${rel}/${lang}_${name.replace(/-/g, "_")}.onnx`,
    urlJson: `${HF}/${rel}/${lang}_${name.replace(/-/g, "_")}.onnx.json`
  };
}

function ensureModel(rel) {
  const parts = rel.split("/");
  const voiceFolder = parts.slice(0, -1).join("/");
  const quality = parts[parts.length - 1];
  const voiceName = parts[parts.length - 2];
  const langCode = parts[0] === "en" ? "en_US" : parts[0] === "ru" ? "ru_RU" : "da_DK";
  const fileBase = `${langCode}-${voiceName}-${quality}`;
  const destDir = path.join(modelsDir, parts[0]);
  fs.mkdirSync(destDir, { recursive: true });
  const onnx = path.join(destDir, `${fileBase}.onnx`);
  const json = path.join(destDir, `${fileBase}.onnx.json`);
  if (fs.existsSync(onnx) && fs.existsSync(json)) return onnx;
  const urlOnnx = `${HF}/${voiceFolder}/${quality}/${fileBase}.onnx`;
  const urlJson = `${HF}/${voiceFolder}/${quality}/${fileBase}.onnx.json`;
  console.log("Downloading", fileBase);
  for (const [url, dest] of [[urlOnnx, onnx], [urlJson, json]]) {
    const r = spawnSync("curl", ["-fsSL", "-o", dest, url], { stdio: "inherit" });
    if (r.status !== 0) throw new Error("download failed " + url);
  }
  return onnx;
}

function castFor(characterId) {
  return CAST[characterId] || CAST.npc;
}

function synthLine(text, characterId, lang, outOgg) {
  if (!text?.trim()) return false;
  const rel = castFor(characterId)[lang];
  if (!rel) return false;
  const model = ensureModel(rel);
  const wav = outOgg.replace(/\.ogg$/, ".wav");
  const scale = LENGTH_SCALE[characterId] ?? 1;
  const r = spawnSync(
    PIPER_BIN,
    ["--model", model, "--output_file", wav, "--length_scale", String(scale)],
    { input: text, encoding: "utf8" }
  );
  if (r.status !== 0) {
    console.warn("piper failed", outOgg, r.stderr?.toString());
    return false;
  }
  const o = spawnSync("ffmpeg", ["-y", "-i", wav, "-c:a", "libvorbis", "-q:a", "4", outOgg], {
    stdio: "pipe"
  });
  try {
    fs.unlinkSync(wav);
  } catch (e) {}
  return o.status === 0 && fs.existsSync(outOgg);
}

function main() {
  if (!fs.existsSync(linesPath)) {
    spawnSync("node", ["scripts/build-voice-lines.mjs"], { cwd: root, stdio: "inherit" });
  }
  const catalog = JSON.parse(fs.readFileSync(linesPath, "utf8"));
  const manifest = { version: 1, lines: {} };
  const langs = ["ru", "en", "da"];
  let ok = 0;
  let miss = 0;
  for (const line of catalog.lines) {
    manifest.lines[line.id] = {};
    for (const lang of langs) {
      const text = line[lang];
      if (!text?.trim()) continue;
      const dir = path.join(voiceRoot, lang);
      fs.mkdirSync(dir, { recursive: true });
      const ogg = path.join(dir, `${line.id}.ogg`);
      const mp3 = path.join(dir, `${line.id}.mp3`);
      if (!fs.existsSync(ogg)) {
        const good = synthLine(text, line.characterId, lang, ogg);
        if (!good) {
          miss++;
          continue;
        }
      }
      if (!fs.existsSync(mp3)) {
        spawnSync("ffmpeg", ["-y", "-i", ogg, "-codec:a", "libmp3lame", "-qscale:a", "4", mp3], {
          stdio: "pipe"
        });
      }
      manifest.lines[line.id][lang] = `voice/${lang}/${line.id}.ogg`;
      ok++;
    }
  }
  fs.writeFileSync(path.join(voiceRoot, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log("Voice clips ready:", ok, "missing:", miss);
}

main();
