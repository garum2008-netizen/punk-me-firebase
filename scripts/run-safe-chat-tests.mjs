#!/usr/bin/env node
/**
 * Safe chat test runner: filter unit tests + RTDB rules (emulator) + Worker logic (node).
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync as spawnSync2 } from "child_process";
import { withSafeChatRulesEmulator } from "./lib/safe-chat-emulator.mjs";
import { authSignUp } from "./lib/safe-chat-emulator-auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function runNode(script, args = []) {
  const r = spawnSync("node", [path.join(__dirname, script), ...args], { cwd: root, stdio: "inherit" });
  return r.status === 0;
}

async function main() {
  console.log("\n=== safe-chat filter unit tests ===");
  if (!runNode("safe-chat-filter.test.js")) process.exit(1);
  if (!runNode("safe-chat-filter-bypass.test.js")) process.exit(1);

  console.log("\n=== safe-chat limits policy ===");
  if (!runNode("safe-chat-limits-policy.test.js")) process.exit(1);

  console.log("\n=== safe-chat worker unit (limits DO) ===");
  if (!runNode("safe-chat-worker-logic.test.js")) process.exit(1);

  console.log("\n=== production config guard (wrangler.toml) ===");
  if (!runNode("test-safe-chat-prod-config.mjs")) process.exit(1);
  if (!runNode("test-safe-chat-prod-bundle.mjs")) process.exit(1);
  if (!runNode("test-safe-chat-free-tier-config.mjs")) process.exit(1);
  if (!runNode("test-safe-chat-prod-source.mjs")) process.exit(1);

  console.log("\n=== safe-chat security unit tests ===");
  if (!runNode("safe-chat-security.test.js")) process.exit(1);

  console.log("\n=== safe-chat child-harm detection ===");
  if (!runNode("safe-chat-child-harm.test.js")) process.exit(1);

  console.log("\n=== safe-chat child-safety risk scoring ===");
  if (!runNode("safe-chat-child-safety-risk.test.js")) process.exit(1);

  console.log("\n=== safe-chat mod alert hook ===");
  if (!runNode("safe-chat-mod-alert.test.js")) process.exit(1);

  console.log("\n=== safe-chat cluster IPv6 ===");
  if (!runNode("safe-chat-cluster-ipv6.test.js")) process.exit(1);

  console.log("\n=== safe-chat limits DO erasure alarm (t139u R-08) ===");
  if (!runNode("safe-chat-limits-do-erasure-alarm.test.js")) process.exit(1);

  console.log("\n=== safe-chat t139u matrix unit tests ===");
  if (!runNode("safe-chat-t139u-matrix-unit.test.js")) process.exit(1);

  console.log("\n=== safe-chat BY-09 DO restart (executable) ===");
  if (!runNode("safe-chat-by09-do-restart.test.js")) process.exit(1);

  console.log("\n=== RTDB rules (emulator) ===");
  let rulesOk = false;
  await withSafeChatRulesEmulator(() => {
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
  await withSafeChatRulesEmulator(async () => {
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
    const rDo = spawnSync2("npm", ["test"], {
      cwd: path.join(root, "workers/safe-chat"),
      stdio: "inherit",
      env: {
        ...process.env,
        SAFE_CHAT_INTEGRATION: "1",
        SAFE_CHAT_ERASURE_USE_DO_CONTINUE: "1",
        SAFE_CHAT_TEST_MOD_UID: mod.localId,
        SAFE_CHAT_TEST_MOD_TOKEN: mod.idToken
      }
    });
    integrationOk = rDo.status === 0;
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

  console.log("\n=== mutation guard (protective mechanisms) ===");
  const mut = spawnSync2("node", [path.join(__dirname, "safe-chat-mutation-check.mjs")], {
    cwd: root,
    stdio: "inherit",
    env: process.env
  });
  if (mut.status !== 0) process.exit(1);

  console.log("\n=== wrangler deploy --dry-run (no publish) ===");
  const dry = spawnSync2("npx", ["wrangler", "deploy", "--dry-run"], {
    cwd: path.join(root, "workers/safe-chat"),
    stdio: "inherit"
  });
  if (dry.status !== 0) process.exit(1);

  console.log("\nAll safe-chat automated checks passed.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
