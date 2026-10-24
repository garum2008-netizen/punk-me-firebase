#!/usr/bin/env node
/** Chapter 2 hangout build — run after full UI playthrough (desktop desk-chromium suite includes hangout). */
const fs = require("fs");
const path = "/workspace/qa/playability/playthrough-report.json";
if (!fs.existsSync(path)) {
  console.error("Missing playthrough report — run npm run test:playthrough first");
  process.exit(1);
}
const report = JSON.parse(fs.readFileSync(path, "utf8"));
const desk = report.suites?.find(s => s.tag === "desk-chromium");
const hang = desk?.hangout?.hangoutStage ?? 0;
const ok = report.pass && hang >= 4;
console.log(ok ? "Chapter 2 hangout UI PASS" : "FAIL", { hangoutStage: hang, pass: report.pass });
process.exit(ok ? 0 : 1);

main().catch(e => {
  console.error(e);
  process.exit(1);
});
