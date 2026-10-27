#!/usr/bin/env node
/**
 * Build hotfix RTDB rules from live export — never deploy database.rules.json from git wholesale.
 *
 *   node scripts/build-hotfix-rules.mjs --input docs/release/prod-readonly-snapshots/rtdb-rules-prod-*.json
 *   node scripts/build-hotfix-rules.mjs --model-audit
 *   node scripts/build-hotfix-rules.mjs --model-audit --test
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { applyHotfixPatch, diffRules, formatDiff } from "./lib/rtdb-hotfix-patch.mjs";
import { withAuthDatabaseEmulator } from "./lib/run-auth-db-emulator.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "scripts/rules-deploy-snapshots/rtdb-rules-hotfix-from-live.json");
const modelPath = path.join(root, "scripts/rules-deploy-snapshots/rtdb-rules-prod-model-audit-2026-10-25.json");
const rulesPath = path.join(root, "database.rules.json");

function parseArgs() {
  const args = process.argv.slice(2);
  const inputIdx = args.findIndex(a => a === "--input" || a.startsWith("--input="));
  let inputArg;
  if (inputIdx >= 0) {
    const a = args[inputIdx];
    inputArg = a.includes("=") ? a.split("=")[1] : args[inputIdx + 1];
  }
  const modelAudit = args.includes("--model-audit");
  const test = args.includes("--test");
  let input = inputArg;
  if (!input && !modelAudit) {
    const snapDir = path.join(root, "docs/release/prod-readonly-snapshots");
    if (fs.existsSync(snapDir)) {
      const files = fs
        .readdirSync(snapDir)
        .filter(f => f.startsWith("rtdb-rules-prod-") && f.endsWith(".json"))
        .sort()
        .reverse();
      if (files[0]) input = path.join(snapDir, files[0]);
    }
  }
  if (modelAudit) input = modelPath;
  return { input, modelAudit, test };
}

function loadJson(p) {
  const raw = fs.readFileSync(p, "utf8");
  const j = JSON.parse(raw);
  if (j.result && typeof j.result === "object") return j;
  return j;
}

function runNode(script, envExtra = {}) {
  const r = spawnSync("node", [path.join(__dirname, script)], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...envExtra }
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

async function runWithRules(rulesJson, fn) {
  const backup = fs.existsSync(rulesPath) ? fs.readFileSync(rulesPath, "utf8") : null;
  fs.writeFileSync(rulesPath, JSON.stringify(rulesJson, null, 2) + "\n");
  try {
    return await fn();
  } finally {
    if (backup) fs.writeFileSync(rulesPath, backup);
    else fs.unlinkSync(rulesPath);
  }
}

async function emulatorPass(label, rulesJson, envExtra) {
  console.log(`\n=== ${label} ===`);
  await runWithRules(rulesJson, async () => {
    await withAuthDatabaseEmulator(() => {
      runNode("test-prod-rules-audit-model.js", envExtra);
      if (envExtra.PROD_AUDIT_MODE === "hotfix") {
        const scope = envExtra.RULES_TEST_SCOPE;
        const profile = envExtra.RULES_TEST_PROFILE || "prod-hotfix";
        runNode("test-database-rules.js", {
          RULES_TEST_PROFILE: profile,
          ...(scope ? { RULES_TEST_SCOPE: scope } : {})
        });
      }
    });
  });
}

async function main() {
  const { input, modelAudit, test } = parseArgs();
  if (!input || !fs.existsSync(input)) {
    console.error("Missing live export. Use --input=path or --model-audit or run owner-readonly-check.sh first.");
    process.exit(1);
  }

  const live = loadJson(input);
  const { rulesJson: hotfix, presenceRepair, chatRepair } = applyHotfixPatch(live);
  if (presenceRepair?.repaired) {
    console.log(
      "\nNote: presence rules repaired for client multiplayer (auth read + own write only):",
      presenceRepair.reason
    );
  }
  if (chatRepair?.repaired) {
    console.log("\nNote: chat rules repaired for gang chat (auth read + own message write):", chatRepair.reason);
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(hotfix, null, 2) + "\n");

  console.log(`Input:  ${input}`);
  console.log(`Output: ${outPath}`);
  console.log("\n--- diff (live → hotfix) ---\n");
  console.log(formatDiff(diffRules(live, hotfix)));

  if (!test) {
    console.log("\nDry run only. Add --test to run emulator checks (does not deploy prod).");
    return;
  }

  if (modelAudit) {
    await emulatorPass("Emulator: prod audit model (baseline)", live, { PROD_AUDIT_MODE: "baseline" });
    await emulatorPass("Emulator: prod audit model (hotfix)", hotfix, {
      PROD_AUDIT_MODE: "hotfix",
      RULES_TEST_PROFILE: "prod-hotfix"
    });
  } else {
    await runWithRules(hotfix, async () => {
      await withAuthDatabaseEmulator(() => {
        runNode("test-database-rules.js", { RULES_TEST_PROFILE: "prod-hotfix" });
      });
    });
  }

  console.log("\nbuild-hotfix-rules: --test complete (no prod deploy).");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
