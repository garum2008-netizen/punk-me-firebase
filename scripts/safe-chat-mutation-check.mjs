#!/usr/bin/env node
/**
 * Mutation guard: disabling each protective mechanism must break at least one automated test.
 * Runs the full Worker integration vitest suite (not protections-only).
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { withSafeChatRulesEmulator } from "./lib/safe-chat-emulator.mjs";
import { authSignUp } from "./lib/safe-chat-emulator-auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const mutations = [
  {
    id: "MUT-A",
    env: { SAFE_CHAT_TEST_DISABLE_HIDE_QUOTA: "1" },
    expectFailTest: "PROTECT hide quota:"
  },
  {
    id: "MUT-B",
    env: { SAFE_CHAT_TEST_DISABLE_CLUSTER_CAP: "1" },
    expectFailTest: "PROTECT cluster cap: cluster-hide-check"
  },
  {
    id: "MUT-C",
    env: { SAFE_CHAT_TEST_DISABLE_BRIGADING: "1" },
    expectFailTest: "PROTECT brigading:"
  },
  {
    id: "MUT-D",
    env: { SAFE_CHAT_TEST_DISABLE_FALSE_REPORT_PENALTY: "1" },
    expectFailTest: "PROTECT false-report penalty:"
  },
  {
    id: "MUT-E",
    env: { SAFE_CHAT_TEST_DISABLE_REPORTER_PRIVACY: "1" },
    expectFailTest: "PROTECT reporter privacy:"
  },
  {
    id: "MUT-F",
    env: { SAFE_CHAT_TEST_DISABLE_GLOBAL_HIDE_GATE: "1" },
    expectFailTest: "PROTECT global hide gate:"
  },
  {
    id: "MUT-G",
    env: { SAFE_CHAT_TEST_DISABLE_MAX_HOLD_ESCALATION: "1" },
    expectFailTest: "PROTECT maxHold:"
  },
  {
    id: "MUT-H",
    env: { SAFE_CHAT_TEST_DISABLE_P04_REDACTION: "1" },
    expectFailTest: "PROTECT P-04:"
  },
  {
    id: "MUT-I",
    env: { SAFE_CHAT_TEST_DISABLE_ERASURE_BUDGET: "1" },
    expectFailTest: "PROTECT erasure budget:"
  }
];

function runIntegrationSuite(extraEnv, mod) {
  return spawnSync("npm", ["test"], {
    cwd: path.join(root, "workers/safe-chat"),
    env: {
      ...process.env,
      SAFE_CHAT_INTEGRATION: "1",
      SAFE_CHAT_TEST_MOD_UID: mod?.localId || process.env.SAFE_CHAT_TEST_MOD_UID || "mod",
      SAFE_CHAT_TEST_MOD_TOKEN: mod?.idToken || process.env.SAFE_CHAT_TEST_MOD_TOKEN || "token",
      ...extraEnv
    },
    encoding: "utf8"
  });
}

async function main() {
  let failed = 0;
  await withSafeChatRulesEmulator(async () => {
    const mod = await authSignUp();
    for (const m of mutations) {
      const r = runIntegrationSuite(m.env, mod);
      const out = `${r.stdout || ""}${r.stderr || ""}`;
      const testFailed = out.includes("FAIL") && out.includes(m.expectFailTest);
      const ok = r.status !== 0 && testFailed;
      console.log(`${m.id}: expected failure => ${ok ? "CAUGHT" : "NOT CAUGHT"}`);
      if (!ok) {
        failed += 1;
        if (r.status === 0) {
          console.error(`  suite passed with ${m.id} enabled (mechanism not disabled in integration?)`);
        } else if (!testFailed) {
          console.error(`  suite failed but not on ${m.expectFailTest}`);
        }
      }
    }
  });
  if (failed) {
    console.error(`mutation-check: ${failed} mutation(s) not caught`);
    process.exit(1);
  }
  console.log("mutation-check: all protective mutations caught by failing tests");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
