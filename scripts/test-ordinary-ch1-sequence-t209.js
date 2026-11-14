#!/usr/bin/env node
/**
 * t209u — Replays the exact ordinary capture sequence (onboarding 0–7 + Life Ch1 + save/reload).
 * Proves onboarding timeout fixes without requiring a new UNCUT video filename.
 * Uses Firebase emulator only.
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { assertFirebaseEmulatorTestEnv } = require("./firebase-test-emulator-guard");

assertFirebaseEmulatorTestEnv();

const ROOT = path.join(__dirname, "..");
const OUT = process.env.PUNK_ICE_OUT || path.join("/opt/cursor/artifacts", "ice-ch1-footage");
const PASS = process.env.ORDINARY_PASS || "t209-sequence-proof";
const sha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();

const env = {
  ...process.env,
  FIREBASE_EMULATOR: process.env.FIREBASE_EMULATOR || "1",
  ORDINARY_PASS: PASS,
  ORDINARY_DESKTOP_ONLY: "1",
  PUNK_FFMPEG_RECORD: "0",
  PUNK_EVIDENCE_SHA: sha,
  DISPLAY: ""
};

console.log("test-ordinary-ch1-sequence-t209: start", { sha, PASS });

const r = spawnSync(
  "node",
  [path.join(__dirname, "capture-ice-ordinary-path-footage.js")],
  { cwd: ROOT, env, stdio: "inherit", timeout: 1_320_000 }
);

if (r.status !== 0) {
  console.error("test-ordinary-ch1-sequence-t209: capture exit", r.status, r.error);
  process.exit(r.status || 1);
}

const passTag = PASS.match(/^\d+$/) ? `pass${String(PASS).padStart(2, "0")}` : `pass-${PASS.replace(/[^a-zA-Z0-9_-]/g, "")}`;
const metaPath = path.join(OUT, `ice-ordinary-footage-metadata-${passTag}.json`);
if (!fs.existsSync(metaPath)) {
  console.error("test-ordinary-ch1-sequence-t209: missing metadata", metaPath);
  process.exit(1);
}

const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
const rec = meta.recordings?.[0];
const scenes = (rec?.scenes || []).map(s => s.scene || s.name || "").join(" ");

const required = [
  ["onboarding_step_6", /onboarding_step_6/],
  ["ch1_complete", /ch1_complete/],
  ["ch1_reentry", /ch1_reentry/]
];

for (const [label, re] of required) {
  if (!re.test(scenes)) {
    console.error("test-ordinary-ch1-sequence-t209: missing scene", label, "scenes=", rec?.scenes);
    process.exit(1);
  }
}

if (!rec?.chapter1CompletedInSession) {
  console.error("test-ordinary-ch1-sequence-t209: chapter1CompletedInSession false");
  process.exit(1);
}

const proof = {
  test: "t209-sequence-proof",
  gitSha: meta.repoSha || sha,
  pass: PASS,
  chapter1CompletedInSession: true,
  scenes: rec.scenes,
  failure: meta.failure
};
const proofPath = path.join(OUT, `t209-onboarding-sequence-proof-${sha.slice(0, 12)}.json`);
fs.writeFileSync(proofPath, JSON.stringify(proof, null, 2));
console.log("test-ordinary-ch1-sequence-t209: PASS", proofPath);