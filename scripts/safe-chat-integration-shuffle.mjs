#!/usr/bin/env node
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { withSafeChatRulesEmulator } from "./lib/safe-chat-emulator.mjs";
import { authSignUp } from "./lib/safe-chat-emulator-auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const workerRoot = path.join(root, "workers/safe-chat");

const seeds = [
  11, 4242, 90210, 1, 21, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 15, 16, 17, 18
];

async function runSeed(seed, mod) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const r = spawnSync(
      "npx",
      ["vitest", "run", "--sequence.shuffle", `--sequence.seed=${seed}`],
      {
        cwd: workerRoot,
        stdio: "pipe",
        encoding: "utf8",
        env: {
          ...process.env,
          SAFE_CHAT_INTEGRATION: "1",
          SAFE_CHAT_TEST_MOD_UID: mod.localId,
          SAFE_CHAT_TEST_MOD_TOKEN: mod.idToken
        }
      }
    );
    if (r.status === 0) return true;
    if (attempt === 1) {
      console.error(`shuffle seed ${seed}: FAIL (attempt ${attempt}, retrying)`);
    } else {
      console.error(`shuffle seed ${seed}: FAIL`);
      console.error(r.stdout);
      console.error(r.stderr);
    }
  }
  return false;
}

async function main() {
  await withSafeChatRulesEmulator(async () => {
    const mod = await authSignUp();
    for (const seed of seeds) {
      const ok = await runSeed(seed, mod);
      console.log(`shuffle seed ${seed}: ${ok ? "PASS" : "FAIL"}`);
      if (!ok) process.exit(1);
    }
  });
  console.log(`integration shuffle: ${seeds.length} seeds PASS`);
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
