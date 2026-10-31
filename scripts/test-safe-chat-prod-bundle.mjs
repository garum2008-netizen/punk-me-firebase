#!/usr/bin/env node
/**
 * Ensures built worker bundle does not ship integration kill-switches.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerRoot = path.join(__dirname, "../workers/safe-chat");
const outDir = path.join(workerRoot, ".prod-bundle-check");

const r = spawnSync(
  "npx",
  ["wrangler", "deploy", "--dry-run", "--outdir", outDir],
  { cwd: workerRoot, encoding: "utf8" }
);
const cliOut = `${r.stdout || ""}${r.stderr || ""}`;
if (r.status !== 0) {
  console.error(cliOut);
  process.exit(r.status || 1);
}

const bundlePath = path.join(outDir, "index.js");
if (!fs.existsSync(bundlePath)) {
  console.error("FAIL  expected bundle at", bundlePath);
  process.exit(1);
}
const bundle = fs.readFileSync(bundlePath, "utf8");
const forbidden = ["SAFE_CHAT_TEST_DISABLE", "test-mutation-flags", "auth.integration", "admin-token.integration"];
let failed = 0;
for (const needle of forbidden) {
  const hit = bundle.includes(needle);
  console.log(`${hit ? "FAIL" : "PASS"}  bundle must not contain ${needle}`);
  if (hit) failed += 1;
}
if (failed) process.exit(1);
console.log("\nprod bundle file guard OK");
