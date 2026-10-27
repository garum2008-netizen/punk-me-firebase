#!/usr/bin/env node
/**
 * Safe chat test runner: filter unit tests + RTDB rules (emulator) + Worker logic (node).
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync as spawnSync2 } from "child_process";
import { withAuthDatabaseEmulator } from "./lib/run-auth-db-emulator.mjs";
import { authSignUp } from "./lib/safe-chat-emulator-auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function runNode(script, args = []) {
  const r = spawnSync("node", [path.join(__dirname, script), ...args], { cwd: root, stdio: "inherit" });
  return r.status === 0;
}

async function main() {
  console.log("=== safe-chat filter unit tests ===");
  if (!runNode("safe-chat-filter.test.js")) process.exit(1);

  console.log("\n=== safe-chat worker unit (limits DO) ===");
  if (!runNode("safe-chat-worker-logic.test.js")) process.exit(1);

  console.log("\n=== production config guard (wrangler.toml) ===");
  if (!runNode("test-safe-chat-prod-config.mjs")) process.exit(1);

  console.log("\n=== RTDB rules (emulator) ===");
  let rulesOk = false;
  await withAuthDatabaseEmulator(() => {
    rulesOk = runNode("test-safe-chat-rules.js");
  });
  if (!rulesOk) process.exit(1);

  console.log("\n=== Worker vitest (smoke + prod config guard) ===");
  const smoke = spawnSync2("npm", ["test"], {
    cwd: path.join(root, "workers/safe-chat"),
    stdio: "inherit",
    env: { ...process.env, SAFE_CHAT_INTEGRATION: "0" }
  });
  if (smoke.status !== 0) process.exit(1);

  console.log("\n=== Worker integration (emulator + miniflare DO) ===");
  let integrationOk = false;
  await withAuthDatabaseEmulator(async () => {
    const mod = await authSignUp();
    const r = spawnSync2("npm", ["test"], {
      cwd: path.join(root, "workers/safe-chat"),
      stdio: "inherit",
      env: {
        ...process.env,
        SAFE_CHAT_INTEGRATION: "1",
        SAFE_CHAT_TEST_MOD_UID: mod.localId,
        SAFE_CHAT_TEST_MOD_TOKEN: mod.idToken
      }
    });
    integrationOk = r.status === 0;
    if (!integrationOk) return;
    const r2 = spawnSync2("npm", ["test"], {
      cwd: path.join(root, "workers/safe-chat"),
      stdio: "inherit",
      env: {
        ...process.env,
        SAFE_CHAT_INTEGRATION: "1",
        SAFE_CHAT_INTEGRATION_NEWBIE: "1",
        SAFE_CHAT_TEST_MOD_UID: mod.localId,
        SAFE_CHAT_TEST_MOD_TOKEN: mod.idToken
      }
    });
    integrationOk = r2.status === 0;
  });
  if (!integrationOk) process.exit(1);

  console.log("\nAll safe-chat automated checks passed.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
