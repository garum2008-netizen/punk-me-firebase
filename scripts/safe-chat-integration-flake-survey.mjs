#!/usr/bin/env node
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { withSafeChatRulesEmulator } from "./lib/safe-chat-emulator.mjs";
import { authSignUp } from "./lib/safe-chat-emulator-auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const workerRoot = path.join(root, "workers/safe-chat");
const runs = parseInt(process.env.SURVEY_RUNS || "10", 10);

function parseFailures(text) {
  const fails = [];
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*FAIL\s+(.+?)\s+>\s+(.+)$/);
    if (m) fails.push(`${m[1].trim()} > ${m[2].trim()}`);
  }
  return fails;
}

async function main() {
  const counts = new Map();
  let passRuns = 0;
  await withSafeChatRulesEmulator(async () => {
    const mod = await authSignUp();
    for (let r = 1; r <= runs; r += 1) {
      process.stderr.write(`\n--- integration survey run ${r}/${runs} ---\n`);
      const out = spawnSync("npx", ["vitest", "run", "--sequence.concurrent=false"], {
        cwd: workerRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          SAFE_CHAT_INTEGRATION: "1",
          SAFE_CHAT_TEST_MOD_UID: mod.localId,
          SAFE_CHAT_TEST_MOD_TOKEN: mod.idToken
        }
      });
      const blob = `${out.stdout || ""}\n${out.stderr || ""}`;
      if (out.status === 0) passRuns += 1;
      for (const f of parseFailures(blob)) {
        counts.set(f, (counts.get(f) || 0) + 1);
      }
    }
  });
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  console.log("\n=== integration flake survey (commit f2c6782 baseline) ===");
  console.log(`runs: ${runs}, vitest EXIT 0: ${passRuns}/${runs}`);
  console.log("failure frequency (test title):");
  for (const [name, n] of sorted) {
    console.log(`  ${n}/${runs}\t${name}`);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
