/**
 * Free local speech for Angelina. espeak-ng only. No paid voice service.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const voices = { ru: "ru", en: "en-us", da: "da" };
const lines = JSON.parse(fs.readFileSync(path.join(root, "data", "angelina-lines.json"), "utf8"));

for (const [id, pack] of Object.entries(lines)) {
  for (const [lang, voice] of Object.entries(voices)) {
    const dir = path.join(root, "assets", "audio", "voice", lang);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${id}.wav`);
    const result = spawnSync("espeak-ng", ["-v", voice, "-s", "145", "-w", file, pack[lang]], { encoding: "utf8" });
    if (result.status !== 0) {
      console.error(result.stderr || result.stdout);
      process.exit(result.status || 1);
    }
    const size = fs.statSync(file).size;
    if (size < 500) {
      console.error("too small", file, size);
      process.exit(1);
    }
    console.log(lang, id, size);
  }
}
