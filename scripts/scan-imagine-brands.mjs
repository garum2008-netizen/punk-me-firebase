#!/usr/bin/env node
/** OCR (tesseract) + repo grep for third-party brand keywords in game assets. */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const imgDir = path.join(root, "imagine_images");
const BRANDS =
  /\b(adopt\s*me|roblox|fortnite|minecraft|disney|marvel|pok[eé]mon|among\s*us|nintendo|hello\s*kitty|epic\s*games)\b/i;

function ocr(file) {
  const r = spawnSync("tesseract", [file, "stdout", "-l", "eng"], { encoding: "utf8" });
  return r.status === 0 ? r.stdout || "" : "";
}

const hits = [];
for (const name of fs.readdirSync(imgDir).filter(f => /\.(jpe?g|png)$/i.test(f)).sort()) {
  const text = ocr(path.join(imgDir, name));
  if (BRANDS.test(text)) hits.push({ source: "ocr", file: `imagine_images/${name}`, snippet: text.slice(0, 120) });
}

function walkText(dir, out = []) {
  for (const e of fs.readdirSync(dir)) {
    const f = path.join(dir, e);
    if (fs.statSync(f).isDirectory()) walkText(f, out);
    else if (/\.(js|mjs|json|html)$/.test(e)) out.push(f);
  }
  return out;
}

for (const f of walkText(path.join(root, "js")).concat(
  fs.existsSync(path.join(root, "data")) ? walkText(path.join(root, "data")) : []
)) {
  if (BRANDS.test(fs.readFileSync(f, "utf8"))) hits.push({ source: "text", file: path.relative(root, f) });
}

console.log(JSON.stringify({ hits }, null, 2));
process.exit(hits.length ? 2 : 0);
