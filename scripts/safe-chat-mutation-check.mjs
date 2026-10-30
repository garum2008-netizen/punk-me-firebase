#!/usr/bin/env node
/**
 * Mutation guard: disabling each protective mechanism must break at least one automated test.
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const mutations = [
  {
    id: "MUT-A",
    env: { SAFE_CHAT_TEST_DISABLE_HIDE_QUOTA: "1" },
    expectFailIn: "workers/safe-chat/src/integration.protections.test.js"
  },
  {
    id: "MUT-B",
    env: { SAFE_CHAT_TEST_DISABLE_CLUSTER_CAP: "1" },
    expectFailIn: "workers/safe-chat/src/integration.protections.test.js"
  }
];

function runProtections(extraEnv) {
  return spawnSync(
    "npm",
    ["test", "--", "src/integration.protections.test.js"],
    {
      cwd: path.join(root, "workers/safe-chat"),
      env: {
        ...process.env,
        SAFE_CHAT_INTEGRATION: "1",
        SAFE_CHAT_TEST_MOD_UID: process.env.SAFE_CHAT_TEST_MOD_UID || "mod",
        SAFE_CHAT_TEST_MOD_TOKEN: process.env.SAFE_CHAT_TEST_MOD_TOKEN || "token",
        ...extraEnv
      },
      encoding: "utf8"
    }
  );
}

let failed = 0;
for (const m of mutations) {
  const r = runProtections(m.env);
  const ok = r.status !== 0;
  console.log(`${m.id}: expected failure => ${ok ? "CAUGHT" : "NOT CAUGHT"}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`mutation-check: ${failed} mutation(s) not caught`);
  process.exit(1);
}
console.log("mutation-check: all protective mutations caught by failing tests");
