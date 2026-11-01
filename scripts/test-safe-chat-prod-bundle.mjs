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
const forbidden = [
  "SAFE_CHAT_TEST_DISABLE",
  "test-mutation-flags",
  "auth.integration",
  "admin-token.integration",
  "X-Safe-Chat-Integration-Ns",
  "X-Safe-Chat-Integration-Do",
  "SAFE_CHAT_TEST_DO_NAME",
  "X-Sc-Rtdb-Ns",
  "X-Sc-Lim-Do",
  "SAFE_CHAT_LIMITS_DO_NAME",
  "SAFE_CHAT_TEST_NOW_MS",
  "runtime-env.integration",
  "integration-reset-hide-counters",
  "integration-isolation.js",
  "integration-env-sync.js",
  "integration-rtdb-rules.js"
];
const forbiddenPatterns = [
  /X-Sc-[A-Za-z0-9-]+/,
  /SAFE_CHAT_[A-Z0-9_]*TEST[A-Z0-9_]*/,
  /runtime-env\.integration/
];
let failed = 0;
for (const needle of forbidden) {
  const hit = bundle.includes(needle);
  console.log(`${hit ? "FAIL" : "PASS"}  bundle must not contain ${needle}`);
  if (hit) failed += 1;
}
for (const re of forbiddenPatterns) {
  const hit = re.test(bundle);
  console.log(`${hit ? "FAIL" : "PASS"}  bundle must not match ${re}`);
  if (hit) failed += 1;
}
if (failed) process.exit(1);

const prodRuntimePath = path.join(workerRoot, "src/runtime-env.js");
const prodRuntime = fs.readFileSync(prodRuntimePath, "utf8");
const exportMatches = [...prodRuntime.matchAll(/export\s+function\s+([A-Za-z0-9_]+)/g)].map(m => m[1]);
const allowedRuntimeExports = new Set(["applyIntegrationRequestEnv", "integrationNowMs"]);
const extraExports = exportMatches.filter(n => !allowedRuntimeExports.has(n));
const missingExports = [...allowedRuntimeExports].filter(n => !exportMatches.includes(n));
if (extraExports.length || missingExports.length) {
  console.log(
    `FAIL  runtime-env.js exports must be exactly ${[...allowedRuntimeExports].join(", ")}; got ${exportMatches.join(", ") || "(none)"}`
  );
  failed += 1;
} else {
  console.log("PASS  runtime-env.js export allowlist");
}
if (!/applyIntegrationRequestEnv\([^)]*\)\s*\{\s*\}/.test(prodRuntime.replace(/\s+/g, " "))) {
  console.log("FAIL  applyIntegrationRequestEnv must be a no-op in production runtime-env.js");
  failed += 1;
} else {
  console.log("PASS  applyIntegrationRequestEnv is no-op");
}

if (failed) process.exit(1);
console.log("\nprod bundle file guard OK");
