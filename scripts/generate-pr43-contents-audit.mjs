#!/usr/bin/env node
/**
 * Build docs/release/PR43_CONTENTS_AUDIT.md from git diff vs main.
 * Usage: node scripts/generate-pr43-contents-audit.mjs [baseRef] [headRef]
 */
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const base = process.argv[2] || "origin/main";
const head = process.argv[3] || "HEAD";

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).trim();
}

const files = sh(`git diff --name-only ${base}...${head}`).split("\n").filter(Boolean);
const baseSha = sh(`git rev-parse ${base}`);
const headSha = sh(`git rev-parse ${head}`);

function categorize(f) {
  if (f.startsWith("js/") || f === "index.html" || f.startsWith("css/")) return "game";
  if (f.startsWith("data/")) return "data";
  if (f.startsWith("audio/") || f.startsWith("docs/audio/") || f.startsWith("voice/")) return "audio";
  if (f === "database.rules.json" || f.includes("firestore") || f.endsWith("storage.rules")) return "rules";
  if (f.startsWith("functions/")) return "functions";
  if (f.startsWith("docs/")) return "docs";
  if (
    f.startsWith("qa/") ||
    f.startsWith("artifacts/") ||
    f.startsWith("walkthrough/") ||
    f.startsWith("tools/piper") ||
    /\.(png|jpe?g|gif|webp|mp4|webm|mov|tgz)$/i.test(f) ||
    /capture|proof|record|screenshot/i.test(f)
  ) {
    return "qa_artifacts";
  }
  if (f.startsWith("scripts/")) return "scripts";
  if (f.startsWith("imagine_images/") || f.startsWith("models/") || f.startsWith("public/")) return "assets";
  return "other";
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KiB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MiB`;
}

const byCat = {};
let total = 0;
for (const f of files) {
  let size = 0;
  try {
    size = fs.statSync(f).size;
  } catch {
    size = 0;
  }
  total += size;
  const c = categorize(f);
  if (!byCat[c]) byCat[c] = { bytes: 0, files: [] };
  byCat[c].bytes += size;
  byCat[c].files.push({ f, size });
}

const diff = sh(`git diff ${base}...${head} --unified=0`);
const emailRe = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const emails = [...new Set([...diff.matchAll(emailRe)].map(m => m[0]))];

const deployExclude = [
  "qa/**",
  "artifacts/**",
  "walkthrough/**",
  "tools/piper.tgz",
  "**/*.mp4",
  "**/*.webm",
  "scripts/recordings/**",
  "node_modules/**"
];

const order = ["game", "data", "audio", "rules", "functions", "docs", "scripts", "assets", "qa_artifacts", "other"];
const labels = {
  game: "Игровой код (js, index, css)",
  data: "Данные сюжета / конфиги",
  audio: "Аудио / voice / лицензии",
  rules: "Firebase RTDB rules",
  functions: "Cloud Functions",
  docs: "Документация release",
  scripts: "Скрипты CI, capture, тесты",
  assets: "Статические ассеты",
  qa_artifacts: "QA: скрины, видео, piper, capture",
  other: "Прочее"
};

const lines = [];
lines.push("# PR #43 — аудит состава (`cursor/scenario-preview-d81d` vs `main`)");
lines.push("");
lines.push(`- **Base:** \`${baseSha}\` (${base})`);
lines.push(`- **Head:** \`${headSha}\` (${head})`);
lines.push(`- **Файлов в diff:** ${files.length}`);
lines.push(`- **Суммарный размер (working tree):** ${fmtBytes(total)}`);
lines.push(`- **Security hotfix (отдельно):** PR [#45](https://github.com/garum2008-netizen/punk-me-firebase/pull/45) от \`main\`, не из этого PR.`);
lines.push("");
lines.push("| Группа | Файлов | Размер |");
lines.push("|--------|--------|--------|");
for (const c of order) {
  const b = byCat[c];
  if (!b) continue;
  lines.push(`| ${labels[c]} | ${b.files.length} | ${fmtBytes(b.bytes)} |`);
}
lines.push("");
lines.push("## Исключить из production deploy (`firebase.json` hosting.ignore)");
for (const p of deployExclude) lines.push(`- \`${p}\``);
lines.push("");
lines.push(`QA-артефакты в diff: **${fmtBytes(byCat.qa_artifacts?.bytes || 0)}** — вынести в ветку артефактов или не мержить в релиз.`);
lines.push("");
lines.push("## Секреты / PII в diff");
lines.push("- Ключи/service-account: не обнаружено по расширениям.");
lines.push(`- Email в тексте diff: ${emails.map(e => `\`${e}\``).join(", ") || "—"} (тестовые контакты, не UID игроков).`);
lines.push("- Полные UID: не публикуются; инвентаризация — `npm run list:test-artifacts` (владелец, read-only).");
lines.push("");
lines.push("Пересобрать: `node scripts/generate-pr43-contents-audit.mjs`");

const out = path.join("docs", "release", "PR43_CONTENTS_AUDIT.md");
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, lines.join("\n"));
console.log(`Wrote ${out}`);
