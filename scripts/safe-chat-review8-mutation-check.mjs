#!/usr/bin/env node
/**
 * Review #8 mutation guard (reviewer mutate8.py equivalents).
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { cpSync, mkdtempSync, rmSync, symlinkSync, existsSync } from "fs";
import os from "os";
import { withSafeChatRulesEmulator } from "./lib/safe-chat-emulator.mjs";
import { authSignUp } from "./lib/safe-chat-emulator-auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const workerRoot = path.join(root, "workers/safe-chat");

const INDEX_CLUSTER_PRECHECK = `    if (
      !hideMessage &&
      !hideSkippedReason &&
      !filterHit &&
      decision.reporterLocalHide &&
      mergeInfo.independentReporterCount >= 2
    ) {
      const clusterCap = await limitsStub(env, "/cluster-hide-check", {
        clusterHash,
        now,
        cap: config.childSafetyClusterHideCap,
        bump: false
      });
      if (!clusterCap.ok && clusterCap.reason === "cluster_hide_cap") {
        hideSkippedReason = clusterCap.reason;
      }
    }`;

const patches = {
  M1: {
    expectFailTest: "PROTECT hide quota:",
    list: [
      {
        file: "src/child-safety-abuse.js",
        from: `  if (!hideCheck.ok) return { ok: false, reason: hideCheck.reason || "hide_quota" };`,
        to: ""
      },
      {
        file: "src/child-safety-abuse.js",
        from: `  if (!bumpHide.ok) return { ok: false, reason: bumpHide.reason || "hide_quota" };`,
        to: ""
      }
    ]
  },
  M2: {
    expectFailTest: "PROTECT cluster cap:",
    list: [
      {
        file: "src/index.js",
        from: INDEX_CLUSTER_PRECHECK,
        to: `    /* M2 removed index cluster cap pre-check */`
      }
    ]
  },
  M2b: {
    expectFailTest: "PROTECT cluster cap:",
    list: [
      {
        file: "src/index.js",
        from: INDEX_CLUSTER_PRECHECK,
        to: `    /* M2b removed index cluster cap pre-check */`
      },
      {
        file: "src/child-safety-abuse.js",
        from: `    if (!bumpCluster.ok) return { ok: false, reason: "cluster_hide_cap" };`,
        to: ""
      }
    ]
  },
  M3: {
    expectFailTest: "PROTECT global hide gate:",
    list: [
      {
        file: "src/child-safety-risk.js",
        from: `  if (filterHit) return true;`,
        to: `  return true;`
      }
    ]
  },
  M4: {
    expectFailTest: "PROTECT GEN-SNAP:",
    list: [
      {
        file: "src/child-safety-abuse.js",
        from: `    if (snap?.text) {`,
        to: `    if (false) {`
      }
    ]
  },
  M5a: {
    expectFailTest: "PROTECT erasure budget:",
    list: [
      {
        file: "src/erasure.js",
        from: `    if (subrequests + n > budget) {`,
        to: `    if (false) {`
      }
    ]
  },
  M5b: {
    expectFailTest: "H-1: cron queue drains 50",
    list: [
      {
        file: "src/erasure-jobs.js",
        from: `export async function runErasureQueueJob(env, nowOverride) {
  return withErasureQueueLock(env, async () => {`,
        to: `export async function runErasureQueueJob(env, nowOverride) {
  return { ok: true, processed: 0 }; /* M5b */
  return withErasureQueueLock(env, async () => {`
      }
    ]
  },
  M5c: {
    expectFailTest: "H-1: cron queue drains 50",
    list: [
      {
        file: "src/erasure-jobs.js",
        from: `  await persistJobAfterBatch(env, uid, batch, claimed, now);
  return { ok: true, processed: 1, uid, subrequests: batch.subrequests, status: mapBatchToJobStatus(batch) };`,
        to: `  return { ok: true, processed: 0 }; /* M5c */`
      }
    ]
  },
  M6a: {
    expectFailTest: "PROTECT maxHold:",
    list: [
      {
        file: "src/index.js",
        from: `        cap != null &&
        now > cap &&`,
        to: `        false &&`
      }
    ]
  },
  M6b: {
    expectFailTest: "PROTECT maxHold:",
    list: [
      {
        file: "src/index.js",
        from: `        await rtdbRequest(
          config,
          "chat/internal/safetyDecisions",
          "POST",
          {
            msgId,
            action: "evidence_hold_expired",
            at: now,
            moderatorUid: null,
            note: "Automatic escalation: legal/max hold reached without moderator decision"
          },
          token,
          emu,
          ns
        );
        bump();`,
        to: `        if (false) await rtdbRequest(
          config,
          "chat/internal/safetyDecisions",
          "POST",
          {
            msgId,
            action: "evidence_hold_expired",
            at: now,
            moderatorUid: null,
            note: "Automatic escalation: legal/max hold reached without moderator decision"
          },
          token,
          emu,
          ns
        ); /* M6b */
        bump();`
      }
    ]
  }
};

function prepareCopy(dest) {
  cpSync(workerRoot, dest, { recursive: true, filter: s => !s.includes("node_modules") });
  const nm = path.join(dest, "node_modules");
  if (!existsSync(nm)) symlinkSync(path.join(workerRoot, "node_modules"), nm, "dir");
  fs.copyFileSync(path.join(root, "database.rules.json"), path.join(dest, "database.rules.json"));
}

function apply(mutId, dest) {
  for (const p of patches[mutId].list) {
    const fp = path.join(dest, p.file);
    let text = fs.readFileSync(fp, "utf8");
    if (!text.includes(p.from)) throw new Error(`${mutId} patch miss ${p.file}`);
    fs.writeFileSync(fp, text.replace(p.from, p.to));
  }
}

function runTests(dest, mod) {
  return spawnSync("npm", ["test"], {
    cwd: dest,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: {
      ...process.env,
      SAFE_CHAT_INTEGRATION: "1",
      SAFE_CHAT_TEST_MOD_UID: mod.localId,
      SAFE_CHAT_TEST_MOD_TOKEN: mod.idToken
    }
  });
}

function mutationCaught(mutId, result) {
  const spec = patches[mutId];
  const out = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status === 0) return false;
  return out.includes(spec.expectFailTest);
}

async function main() {
  let failed = 0;
  await withSafeChatRulesEmulator(async () => {
    const mod = await authSignUp();
    const tmp = mkdtempSync(path.join(os.tmpdir(), "review8-mut-"));
    try {
      const ctrlDest = path.join(tmp, "CTRL0");
      prepareCopy(ctrlDest);
      const ctrl = runTests(ctrlDest, mod);
      rmSync(ctrlDest, { recursive: true, force: true });
      if (ctrl.status !== 0) {
        console.error("review8-mutation-check: CTRL0 (unmutated copy) must pass");
        console.error(`${ctrl.stdout || ""}${ctrl.stderr || ""}`);
        process.exit(1);
      }
      console.log("CTRL0: unmutated copy PASS");

      for (const mutId of Object.keys(patches)) {
        const dest = path.join(tmp, mutId);
        prepareCopy(dest);
        apply(mutId, dest);
        const r = runTests(dest, mod);
        rmSync(dest, { recursive: true, force: true });
        const caught = mutationCaught(mutId, r);
        console.log(`${mutId}: expected failure => ${caught ? "CAUGHT" : "NOT CAUGHT"}`);
        if (!caught) failed += 1;
      }
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
  if (failed) {
    console.error(`review8-mutation-check: ${failed} mutation(s) not caught`);
    process.exit(1);
  }
  console.log("review8-mutation-check: all reviewer mutations caught");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
