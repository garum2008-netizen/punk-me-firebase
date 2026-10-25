#!/usr/bin/env node
/** Run test:duel-onboarding + test:pr-b (Chromium/WebKit/mobile) and write qa report. */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const outDir = path.join(__dirname, "../qa/pr-b-full");
fs.mkdirSync(outDir, { recursive: true });
const lines = [`# PR B test report`, ``, `Generated: ${new Date().toISOString()}`, ``];

function run(cmd, title) {
  lines.push(`## ${title}`, ``);
  lines.push("```");
  try {
    const out = execSync(cmd, { encoding: "utf8", cwd: path.join(__dirname, ".."), stdio: "pipe" });
    lines.push(out.trim());
  } catch (e) {
    lines.push((e.stdout || "").trim());
    lines.push((e.stderr || "").trim());
    lines.push(`exit ${e.status}`);
  }
  lines.push("```", ``);
}

run("npm run test:duel-onboarding", "test:duel-onboarding");
run("npm run test:pr-b", "test:pr-b (Chromium, WebKit, mobile)");

const reportPath = path.join(outDir, "TEST-REPORT.md");
fs.writeFileSync(reportPath, lines.join("\n"));
console.log("Wrote", reportPath);
