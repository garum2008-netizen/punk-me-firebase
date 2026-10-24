#!/usr/bin/env node
const fs = require("fs");
const path = "/workspace/qa/playability/playthrough-report.json";
if (!fs.existsSync(path)) {
  console.error("Run npm run test:playthrough first");
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync(path, "utf8"));
const desk = report.suites?.find(s => s.tag === "desk-chromium");
const stage = desk?.hangout?.hangoutStage ?? 0;
const ok = report.pass && stage >= 4;
console.log(ok ? "Chapter 2 hangout PASS" : "FAIL", { hangoutStage: stage });
process.exit(ok ? 0 : 1);
