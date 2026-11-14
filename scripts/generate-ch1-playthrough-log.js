#!/usr/bin/env node
/** Build step-by-step playthrough log from ice-ordinary-footage-metadata JSON (t208u). */
const fs = require("fs");
const path = require("path");

const metaPath =
  process.argv[2] ||
  path.join("/opt/cursor/artifacts/ice-ch1-footage", "ice-ordinary-footage-metadata-pass-t208-ch1-full.json");

if (!fs.existsSync(metaPath)) {
  console.error("metadata not found:", metaPath);
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
const rec = meta.recordings?.[0];
const scenes = rec?.scenes || [];
const beats = [
  { match: /character studio|CYBER PUNK/i, beat: "Hero create (CYBER PUNK BLUE)" },
  { match: /onboarding_start/, beat: "Onboarding — goal / conflict setup" },
  { match: /onboarding_step_0/, beat: "Tutorial: move in room" },
  { match: /onboarding_step_1/, beat: "Travel to Street" },
  { match: /onboarding_step_2/, beat: "Meet Razor (Gang)" },
  { match: /onboarding_step_3/, beat: "Visit cemetery" },
  { match: /onboarding_step_4/, beat: "Win fight (climax skirmish)" },
  { match: /onboarding_step_5/, beat: "Shop reward" },
  { match: /onboarding_step_6|onboarding_done/, beat: "City build / crypt (reward)" },
  { match: /ch1_start/, beat: "Life Ch1 — story slice begins" },
  { match: /ch1_mirror/, beat: "Wardrobe — player look" },
  { match: /ch1_complete/, beat: "Reflect — chapter climax + reward" },
  { match: /ch1_save|ch1_reentry/, beat: "Save, exit, re-entry (state proof)" }
];

function fmtMs(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

const lines = [
  `# Chapter 1 playthrough log`,
  ``,
  `| Field | Value |`,
  `|-------|-------|`,
  `| Commit | \`${meta.repoSha}\` |`,
  `| Pass | ${meta.ordinaryPass} |`,
  `| Completed in session | ${rec?.chapter1CompletedInSession} |`,
  `| Video | \`${rec?.file || "—"}\` |`,
  `| SHA256 | ${rec?.sha256 || "—"} |`,
  `| Duration | ${rec?.durationSec ? rec.durationSec + "s" : "—"} |`,
  ``,
  `## Timeline (scene log → story beats)`,
  ``,
  `| Video time | Scene | Story beat |`,
  `|------------|-------|------------|`
];

for (const sc of scenes) {
  const beat = beats.find(b => b.match.test(sc.id || sc.scene || sc.name || ""))?.beat || "";
  const key = sc.id || sc.scene || sc.name || sc.note || "";
  const tSec = sc.tSec != null ? Math.round(sc.tSec * 1000) : (sc.tMs ?? sc.ms ?? 0);
  lines.push(`| ${fmtMs(tSec)} | ${key} | ${beat} |`);
}

const out = path.join(
  path.dirname(metaPath),
  `CH1_PLAYTHROUGH_LOG-${meta.repoSha?.slice(0, 12) || "unknown"}.md`
);
fs.writeFileSync(out, lines.join("\n") + "\n");
console.log("wrote", out);