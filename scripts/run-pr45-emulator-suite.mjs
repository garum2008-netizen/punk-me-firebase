#!/usr/bin/env node
/**
 * PR #45 full emulator protocol (no prod deploy). Runs all checks; each sub-suite prints PASS/FAIL summary.
 */
import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

function stopEmulators() {
  spawnSync("pkill", ["-9", "-f", "firebase emulators:start"], { stdio: "ignore" });
  spawnSync("pkill", ["-9", "-f", "java.*firebase"], { stdio: "ignore" });
  spawnSync("fuser", ["-k", "9000/tcp", "9099/tcp", "4400/tcp", "4401/tcp"], { stdio: "ignore" });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const suites = [];

function run(label, cmd, args, env = {}) {
  console.log(`\n########## ${label} ##########\n`);
  stopEmulators();
  spawnSync("sleep", ["3"]);
  const r = spawnSync(cmd, args, { cwd: root, stdio: "inherit", env: { ...process.env, ...env } });
  const ok = r.status === 0;
  suites.push({ label, ok });
  stopEmulators();
  return ok;
}

function main() {
  stopEmulators();
  run(
    "hotfix rules (model audit + prod-hotfix matrix)",
    "node",
    ["scripts/build-hotfix-rules.mjs", "--model-audit", "--test"]
  );
  run("save sanitize", "node", ["scripts/test-save-sanitize.js"]);
  run("git target rules (database.rules.json)", "node", ["scripts/run-rules-emulator.js"]);

  const failed = suites.filter(s => !s.ok);
  console.log("\n========================================");
  console.log(`PR #45 emulator suite: ${suites.length - failed.length} PASS, ${failed.length} FAIL`);
  for (const s of suites) {
    console.log(`  ${s.ok ? "PASS" : "FAIL"}: ${s.label}`);
  }
  console.log("========================================\n");
  process.exit(failed.length ? 1 : 0);
}

main();
