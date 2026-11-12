#!/usr/bin/env node
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { withSafeChatRulesEmulator } from "./lib/safe-chat-emulator.mjs";
import { authSignUp } from "./lib/safe-chat-emulator-auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const workerRoot = path.join(root, "workers/safe-chat");

const integrationFiles = [
  "src/integration.erasure.test.js",
  "src/integration.erasure-guards.test.js",
  "src/integration.protections.test.js",
  "src/integration.emulator.test.js",
  "src/integration.t139u.test.js",
  "src/integration.client-mirror.test.js"
];

/** Twenty vitest shuffle seeds (order must pass; bounded retry only for vitest worker lifecycle flakes). */
const seeds = [
  11, 4242, 90210, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18
];

function isVitestWorkerLifecycleFlake(stdout, stderr) {
  const blob = `${stdout}\n${stderr}`;
  return (
    blob.includes('Timeout calling "snapshotSaved"') ||
    blob.includes("[vitest-worker]: Timeout")
  );
}

function runSeedOnce(seed, mod, file) {
  return spawnSync(
    "npx",
    ["vitest", "run", file, "--sequence.shuffle", `--sequence.seed=${seed}`, "--pool=forks"],
    {
      cwd: workerRoot,
      stdio: "pipe",
      encoding: "utf8",
      env: {
        ...process.env,
        SAFE_CHAT_INTEGRATION: "1",
        SAFE_CHAT_TEST_MOD_UID: mod.localId,
        SAFE_CHAT_TEST_MOD_TOKEN: mod.idToken,
        CI: "true"
      }
    }
  );
}

function runSeed(seed, mod) {
  const maxAttempts = 3;
  for (const file of integrationFiles) {
    let r;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      r = runSeedOnce(seed, mod, file);
      if (r.status === 0) break;
      if (attempt < maxAttempts && isVitestWorkerLifecycleFlake(r.stdout, r.stderr)) {
        console.error(
          `shuffle seed ${seed} file ${file}: vitest worker flake (attempt ${attempt}/${maxAttempts}), retrying…`
        );
        continue;
      }
      break;
    }
    if (r.status !== 0) {
      console.error(`shuffle seed ${seed} file ${file}: FAIL`);
      console.error(r.stdout);
      console.error(r.stderr);
      return false;
    }
  }
  return true;
}

async function main() {
  await withSafeChatRulesEmulator(async () => {
    const mod = await authSignUp();
    for (const seed of seeds) {
      const ok = runSeed(seed, mod);
      console.log(`shuffle seed ${seed}: ${ok ? "PASS" : "FAIL"}`);
      if (!ok) throw new Error(`integration shuffle failed at seed ${seed}`);
    }
  });
  console.log(`integration shuffle: ${seeds.length} seeds PASS`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
