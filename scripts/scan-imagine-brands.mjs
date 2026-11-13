#!/usr/bin/env node
/**
 * Grep game text for third-party brand keywords (images: use visual review + patch script).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRANDS =
  /\b(adopt\s*me|roblox|fortnite|minecraft|disney|marvel|pok[eé]mon|among\s*us|nintendo|hello\s*kitty|epic\s*games)\b/i;

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir)) {
    const f = path.join(dir, e);
    if (fs.statSync(f).isDirectory()) walk(f, out);
    else if (/\.(js|mjs|json|html)$/.test(e)) out.push(f);
  }
  return out;
}

const hits = [];
for (const f of walk(path.join(root, "js"))) {
  if (BRANDS.test(fs.readFileSync(f, "utf8"))) hits.push({ source: "text", file: path.relative(root, f) });
}
if (fs.existsSync(path.join(root, "data"))) {
  for (const f of walk(path.join(root, "data"))) {
    if (BRANDS.test(fs.readFileSync(f, "utf8"))) hits.push({ source: "text", file: path.relative(root, f) });
  }
}

console.log(JSON.stringify({ hits, note: "RgdDh.jpg checked visually; tesseract unreliable on neon" }, null, 2));
process.exit(hits.length ? 2 : 0);
