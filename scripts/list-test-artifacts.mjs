#!/usr/bin/env node
/**
 * Read-only inventory of QA artifacts (no prod access, no writes).
 */
import fs from "fs";
import path from "path";

const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const qaRoot = path.join(root, "qa");

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else acc.push({ path: path.relative(root, p), bytes: st.size, mtime: st.mtime.toISOString() });
  }
  return acc;
}

const files = walk(qaRoot).sort((a, b) => b.mtime.localeCompare(a.mtime));
const summary = {
  qaRoot: path.relative(root, qaRoot),
  count: files.length,
  totalBytes: files.reduce((s, f) => s + f.bytes, 0),
  newest: files.slice(0, 15),
  byExt: {}
};
for (const f of files) {
  const ext = path.extname(f.path) || "(none)";
  summary.byExt[ext] = (summary.byExt[ext] || 0) + 1;
}
console.log(JSON.stringify(summary, null, 2));
