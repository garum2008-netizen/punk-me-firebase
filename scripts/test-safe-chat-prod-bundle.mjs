#!/usr/bin/env node
/**
 * Ensures wrangler dry-run bundle does not ship integration kill-switches.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerRoot = path.join(__dirname, "../workers/safe-chat");

const r = spawnSync("npx", ["wrangler", "deploy", "--dry-run"], {
  cwd: workerRoot,
  encoding: "utf8"
});
const out = `${r.stdout || ""}${r.stderr || ""}`;
if (r.status !== 0) {
  console.error(out);
  process.exit(r.status || 1);
}

const forbidden = ["SAFE_CHAT_TEST_DISABLE", "test-mutation-flags"];
let failed = 0;
for (const needle of forbidden) {
  const hit = out.includes(needle);
  console.log(`${hit ? "FAIL" : "PASS"}  dry-run output must not contain ${needle}`);
  if (hit) failed += 1;
}
if (failed) process.exit(1);
console.log("\nprod bundle dry-run guard OK");
