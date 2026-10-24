#!/usr/bin/env node
/**
 * Verifies internal markdown links in docs/game-design and README.md.
 * Exits 0 if all resolvable; 1 if any broken.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");

const files = [
  path.join(root, "README.md"),
  ...walk(path.join(root, "docs", "game-design")),
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".md")) out.push(p);
  }
  return out;
}

const linkRe = /\[[^\]]+\]\(([^)]+)\)/g;
const broken = [];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  let m;
  while ((m = linkRe.exec(text)) !== null) {
    const target = m[1].trim();
    if (/^https?:\/\//i.test(target) || target.startsWith("#")) continue;
    const noAnchor = target.split("#")[0];
    if (!noAnchor) continue;
    const resolved = path.resolve(path.dirname(file), noAnchor);
    if (!fs.existsSync(resolved)) {
      broken.push({ from: path.relative(root, file), link: target });
    }
  }
}

if (broken.length) {
  console.error("Broken links:");
  for (const b of broken) console.error(`  ${b.from} → ${b.link}`);
  process.exit(1);
}
console.log(`OK: ${files.length} markdown files, all internal links resolve.`);
process.exit(0);
