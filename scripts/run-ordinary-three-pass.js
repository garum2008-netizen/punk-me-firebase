#!/usr/bin/env node
/**
 * Three consecutive clean-start ordinary-path captures at the current git HEAD.
 * Requires FIREBASE_EMULATOR=1 and running Firebase demo emulator hosts.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { assertFirebaseEmulatorTestEnv } = require("./firebase-test-emulator-guard");

assertFirebaseEmulatorTestEnv();

const ROOT = path.join(__dirname, "..");
const OUT = process.env.PUNK_ICE_OUT || path.join("/opt/cursor/artifacts", "ice-ch1-footage");
const SHA = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();

const summary = {
  repoSha: SHA,
  branch: "cursor/vertical-slice-ch1-d81d",
  startedAt: new Date().toISOString(),
  passes: [],
  failure: null,
};

fs.mkdirSync(OUT, { recursive: true });

for (let pass = 1; pass <= 3; pass++) {
  const logPath = path.join(OUT, `ice-ordinary-capture-pass${String(pass).padStart(2, "0")}.log`);
  const fd = fs.openSync(logPath, "w");
  console.log(`\n=== ORDINARY PASS ${pass}/3 @ ${SHA} ===\n`);
  const r = spawnSync("node", ["scripts/capture-ice-ordinary-path-footage.js"], {
    cwd: ROOT,
    env: { ...process.env, ORDINARY_PASS: String(pass), ORDINARY_INPUT: "keyboard" },
    stdio: ["ignore", fd, fd],
  });
  fs.closeSync(fd);
  const row = {
    pass,
    exitCode: r.status,
    logPath,
    metadataPath: path.join(OUT, "ice-ordinary-footage-metadata.json"),
  };
  if (r.status !== 0) {
    let metaFail = null;
    try {
      metaFail = JSON.parse(fs.readFileSync(row.metadataPath, "utf8")).failure;
    } catch (_) {}
    row.failure = metaFail || `exit ${r.status}`;
    summary.failure = row;
    summary.passes.push(row);
    break;
  }
  summary.passes.push(row);
}

summary.finishedAt = new Date().toISOString();
summary.success = summary.passes.length === 3 && !summary.failure;
const outPath = path.join(OUT, `ice-ordinary-three-pass-${SHA.slice(0, 12)}.json`);
fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));

if (summary.success) {
  process.env.SHA_SHORT = SHA.slice(0, 12);
  process.env.ORDINARY_PASS = "03";
  const d = spawnSync("node", ["scripts/export-ordinary-desktop-derivatives.js"], {
    cwd: ROOT,
    env: process.env,
    encoding: "utf8",
  });
  summary.desktopDerivatives = d.status === 0 ? "ok" : (d.stderr || "").slice(0, 400);
  fs.writeFileSync(outPath, JSON.stringify(summary, null, 2));
}

if (!summary.success) {
  console.error("THREE-PASS ordinary capture FAILED", summary.failure);
  process.exit(1);
}
process.exit(0);
