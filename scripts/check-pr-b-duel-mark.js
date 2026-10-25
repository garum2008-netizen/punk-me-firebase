#!/usr/bin/env node
/** Fail CI/recording if tutorial_duel_result is not green. */
const fs = require("fs");
const path = require("path");

const marksPath = path.join(__dirname, "../qa/pr-b-full/marks.jsonl");
if (!fs.existsSync(marksPath)) {
  console.error("missing marks.jsonl");
  process.exit(1);
}
const lines = fs.readFileSync(marksPath, "utf8").trim().split("\n").filter(Boolean);
const marks = lines.map(l => JSON.parse(l));
const duel = marks.find(m => m.label === "tutorial_duel_result");
const victory = marks.find(m => m.label === "tutorial_duel_victory_frame");
const ok =
  duel &&
  String(duel.extra || "").includes("win_fight ok") &&
  victory;
const report = { ok: !!ok, duel, victory: !!victory };
console.log(JSON.stringify(report, null, 2));
process.exit(ok ? 0 : 1);
