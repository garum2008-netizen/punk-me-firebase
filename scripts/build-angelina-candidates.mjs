/**
 * Free preview files for the three stock candidates.
 * Does not change the active voice. Does not call a paid API.
 * Run: python3 -m edge_tts is provided by the edge-tts package.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const lines = JSON.parse(fs.readFileSync(path.join(root, "data", "angelina-lines.json"), "utf8"));
const casts = {
  "azure-ava": { en: "en-US-AvaNeural", ru: "ru-RU-SvetlanaNeural", da: "da-DK-ChristelNeural" },
  "azure-emma": { en: "en-US-EmmaNeural", ru: "ru-RU-SvetlanaNeural", da: "da-DK-ChristelNeural" },
  "azure-libby": { en: "en-GB-LibbyNeural", ru: "ru-RU-SvetlanaNeural", da: "da-DK-ChristelNeural" }
};
const edge = process.env.EDGE_TTS || "edge-tts";

for (const [candidate, voices] of Object.entries(casts)) {
  for (const [id, pack] of Object.entries(lines)) {
    for (const [lang, text] of Object.entries(pack)) {
      const dir = path.join(root, "assets", "audio", "voice", "candidates", candidate, lang);
      fs.mkdirSync(dir, { recursive: true });
      const file = path.join(dir, `${id}.mp3`);
      if (fs.existsSync(file) && fs.statSync(file).size >= 500) {
        console.log(candidate, lang, id, "kept");
        continue;
      }
      let result = null;
      for (let attempt = 0; attempt < 5; attempt++) {
        result = spawnSync(edge, ["--voice", voices[lang], "--text", text, "--write-media", file], { encoding: "utf8" });
        if (result.status === 0 && fs.existsSync(file) && fs.statSync(file).size >= 500) break;
        if (fs.existsSync(file)) fs.rmSync(file);
        spawnSync("sleep", [String(2 + attempt * 3)]);
      }
      if (!result || result.status !== 0) {
        console.error(result?.stderr || result?.stdout || "edge-tts failed");
        process.exit(result?.status || 1);
      }
      spawnSync("sleep", ["0.4"]);
      const size = fs.statSync(file).size;
      if (size < 500) {
        console.error("too small", file, size);
        process.exit(1);
      }
      console.log(candidate, lang, id, size);
    }
  }
}
