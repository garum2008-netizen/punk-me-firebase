#!/usr/bin/env node
/**
 * Mutation guard: patches worker source in a temp copy (no env kill-switches).
 * Each mutation must break at least one named integration/unit test.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { cpSync, mkdtempSync, rmSync } from "fs";
import os from "os";
import { withSafeChatRulesEmulator } from "./lib/safe-chat-emulator.mjs";
import { authSignUp } from "./lib/safe-chat-emulator-auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const workerRoot = path.join(root, "workers/safe-chat");
const alarmTest = path.join(__dirname, "safe-chat-limits-do-erasure-alarm.test.js");

/** @typedef {{ id: string, expectFailTest: string, unitOnly?: boolean, patches: { file: string, replacements: { from: string, to: string }[] }[] }} Mutation */

/** @type {Mutation[]} */
const mutations = [
  {
    id: "MUT-A",
    expectFailTest: "PROTECT hide quota:",
    patches: [
      {
        file: "src/child-safety-abuse.js",
        replacements: [
          {
            from: `  const hideCheck = await limitsStub(env, "/child-safety-hide-check", {
    uid: authUid,
    now,
    quota,
    bump: false
  });
  if (!hideCheck.ok) return { ok: false, reason: hideCheck.reason || "hide_quota" };`,
            to: `  /* MUT-A removed hide quota check */`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-B",
    expectFailTest: "PROTECT cluster cap: fourth global hide",
    patches: [
      {
        file: "src/child-safety-abuse.js",
        replacements: [
          {
            from: `  if (clusterHash) {
    const clusterCheck = await limitsStub(env, "/cluster-hide-check", {
      clusterHash,
      now,
      cap: configObj.childSafetyClusterHideCap,
      bump: false
    });
    if (!clusterCheck.ok) return { ok: false, reason: "cluster_hide_cap" };
  }`,
            to: `  /* MUT-B removed cluster cap pre-check */`
          },
          {
            from: `  if (clusterHash) {
    const bumpCluster = await limitsStub(env, "/cluster-hide-check", {
      clusterHash,
      now,
      cap: configObj.childSafetyClusterHideCap,
      bump: true
    });
    if (!bumpCluster.ok) return { ok: false, reason: "cluster_hide_cap" };
  }`,
            to: `  /* MUT-B removed cluster cap bump */`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-C",
    expectFailTest: "PROTECT brigading:",
    patches: [
      {
        file: "src/child-safety-abuse.js",
        replacements: [
          {
            from: `  const coordinated =
    sameSubRecent.length >= 3 &&
    clusters.size <= 1 &&
    sameSubRecent.every(r => now - r.at <= coordMs);`,
            to: `  const coordinated = false; /* MUT-C */`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-D",
    expectFailTest: "PROTECT false-report penalty:",
    patches: [
      {
        file: "src/child-safety-abuse.js",
        replacements: [
          {
            from: `export async function penalizeFalseChildSafetyReport(config, token, emu, ns, reporterHash, now, configObj) {
  const denyUntil = now + configObj.childSafetyHideDeniedMs;`,
            to: `export async function penalizeFalseChildSafetyReport(config, token, emu, ns, reporterHash, now, configObj) {
  return { denyUntil: 0, strikes: 0 }; /* MUT-D */
  const denyUntil = now + configObj.childSafetyHideDeniedMs;`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-E",
    expectFailTest: "PROTECT reporter privacy:",
    patches: [
      {
        file: "src/index.js",
        replacements: [
          {
            from: `    await enqueueChildSafetyReview({
      config,
      token,
      emu,
      ns,
      env,
      msgId,
      now,
      configObj: config,
      trigger: "report",
      hideMessage,
      childSafetyReportCount: distinct,
      subcategory: safetySub,
      extraQueueFields: extra,
      riskSnapshot: {
        intrinsicScore,
        effectiveScore: decision.effectiveScore,
        hideBasis: hideMessage ? decision.hideBasis : hideSkippedReason || "queued_only"
      },
      ctx
    });

    return json(request, env, {
      ...CHILD_SAFETY_REPORT_RECEIVED
    });`,
            to: `    await enqueueChildSafetyReview({
      config,
      token,
      emu,
      ns,
      env,
      msgId,
      now,
      configObj: config,
      trigger: "report",
      hideMessage,
      childSafetyReportCount: distinct,
      subcategory: safetySub,
      extraQueueFields: extra,
      riskSnapshot: {
        intrinsicScore,
        effectiveScore: decision.effectiveScore,
        hideBasis: hideMessage ? decision.hideBasis : hideSkippedReason || "queued_only"
      },
      ctx
    });

    return json(request, env, {
      ...CHILD_SAFETY_REPORT_RECEIVED,
      msgId,
      queuePriority: decision.queuePriority
    }); /* MUT-E */`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-F",
    expectFailTest: "PROTECT global hide gate:",
    patches: [
      {
        file: "src/child-safety-risk.js",
        replacements: [
          {
            from: `export function hasGlobalHideIndependentSignal({
  filterHit,
  authorConfirmedViolations,
  independentReporterCount,
  distinctClusterCount
}) {
  if (filterHit) return true;
  if (authorConfirmedViolations > 0) return true;
  if (independentReporterCount >= 2 && distinctClusterCount >= 2) return true;
  return false;
}`,
            to: `export function hasGlobalHideIndependentSignal() {
  return true; /* MUT-F */
}`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-G",
    expectFailTest: "PROTECT maxHold:",
    patches: [
      {
        file: "src/index.js",
        replacements: [
          {
            from: `        await rtdbRequest(
          config,
          "chat/internal/safetyDecisions",
          "POST",
          {
            msgId,
            action: "evidence_hold_expired",`,
            to: `        if (false) await rtdbRequest( /* MUT-G */
          config,
          "chat/internal/safetyDecisions",
          "POST",
          {
            msgId,
            action: "evidence_hold_expired",`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-H",
    expectFailTest: "PROTECT P-04:",
    patches: [
      {
        file: "src/child-safety-abuse.js",
        replacements: [
          {
            from: `export async function redactPublicMessageText(config, token, emu, ns, msgId) {
  await rtdbRequest(config, \`\${pathChatMessage(msgId)}/text\`, "DELETE", null, token, emu, ns);
  await rtdbRequest(config, \`\${pathChatMessage(msgId)}/textRedacted\`, "PUT", true, token, emu, ns);
}`,
            to: `export async function redactPublicMessageText() { /* MUT-H no-op */ }`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-I",
    expectFailTest: "PROTECT erasure budget:",
    patches: [
      {
        file: "src/erasure.js",
        replacements: [
          {
            from: `    if (subrequests + n > budget) {
      budgetExceeded = true;
      return false;
    }`,
            to: `    if (false && subrequests + n > budget) {
      budgetExceeded = true;
      return false;
    } /* MUT-I */`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-J",
    expectFailTest: "PROTECT erasure continuation: cron",
    patches: [
      {
        file: "src/erasure-jobs.js",
        replacements: [
          {
            from: `export async function runErasureQueueJob(env, nowOverride) {
  const config = loadConfig(env);`,
            to: `export async function runErasureQueueJob(env, nowOverride) {
  return { ok: true, processed: 0 }; /* MUT-J */
  const config = loadConfig(env);`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-K",
    expectFailTest: "H-1: cron queue drains 50",
    patches: [
      {
        file: "src/erasure-jobs.js",
        replacements: [
          {
            from: `  await persistJobAfterBatch(env, uid, batch, job, now);
  return { ok: true, processed: 1, uid, subrequests: batch.subrequests, status: mapBatchToJobStatus(batch) };`,
            to: `  /* MUT-K */ return { ok: true, processed: 0 };`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-ER1",
    erasureUnit: true,
    expectFailTest: "erasure honesty: mapBatchToJobStatus stays queued when allOwnRemaining is unknown",
    patches: [
      {
        file: "src/erasure-jobs.js",
        replacements: [
          {
            from: `    if (result.allOwnRemaining == null) return "queued";`,
            to: `    /* MUT-ER1 */`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-ER2",
    erasureUnit: true,
    expectFailTest: "erasure honesty: erasureJobMayDeleteFromBatch requires batch.complete true",
    patches: [
      {
        file: "src/erasure-jobs.js",
        replacements: [
          {
            from: `export function erasureJobMayDeleteFromBatch(batch) {
  return mapBatchToJobStatus(batch) === "complete" && batch.complete === true;
}`,
            to: `export function erasureJobMayDeleteFromBatch(batch) {
  return mapBatchToJobStatus(batch) === "complete"; /* MUT-ER2 */
}`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-ER3",
    erasureUnit: true,
    expectFailTest: "erasure honesty: erasureBatchStartIndex resumes at cursor without skipping earlier ids incorrectly",
    patches: [
      {
        file: "src/erasure.js",
        replacements: [
          {
            from: `export function erasureBatchStartIndex(entries, cursorMsgId) {
  if (!cursorMsgId) return 0;
  const idx = entries.findIndex(([id]) => id === cursorMsgId);
  return idx >= 0 ? idx : 0;
}`,
            to: `export function erasureBatchStartIndex(entries, cursorMsgId) {
  return 0; /* MUT-ER3 always restart from top */
}`
          }
        ]
      }
    ]
  }
];

function runErasureHonestyInCopy(mut, dest) {
  copyWorker(dest);
  applyPatches(mut, dest);
  return spawnSync("npx", ["vitest", "run", "src/erasure-honesty.test.js"], {
    cwd: dest,
    env: { ...process.env, SAFE_CHAT_INTEGRATION: "0" },
    encoding: "utf8"
  });
}

function applyPatches(mut, destRoot) {
  for (const p of mut.patches) {
    const fp = path.join(destRoot, p.file);
    let text = fs.readFileSync(fp, "utf8");
    for (const r of p.replacements) {
      if (!text.includes(r.from)) {
        throw new Error(`${mut.id}: patch miss in ${p.file}`);
      }
      text = text.replace(r.from, r.to);
    }
    fs.writeFileSync(fp, text);
  }
}

function copyWorker(dest) {
  cpSync(workerRoot, dest, { recursive: true, filter: src => !src.includes("node_modules") });
  cpSync(path.join(workerRoot, "node_modules"), path.join(dest, "node_modules"), { recursive: true });
}

function runIntegrationInCopy(mut, mod, dest) {
  copyWorker(dest);
  applyPatches(mut, dest);
  return spawnSync("npm", ["test"], {
    cwd: dest,
    env: {
      ...process.env,
      SAFE_CHAT_INTEGRATION: "1",
      SAFE_CHAT_TEST_MOD_UID: mod.localId,
      SAFE_CHAT_TEST_MOD_TOKEN: mod.idToken
    },
    encoding: "utf8"
  });
}

function runUnitInCopy(mut, dest) {
  copyWorker(dest);
  applyPatches(mut, dest);
  const limitsPath = path.join(dest, "src/limits-do.js");
  return spawnSync("node", [alarmTest], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      SAFE_CHAT_LIMITS_DO_PATH: limitsPath
    }
  });
}

function mutationCaught(mut, result) {
  const out = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status === 0) return false;
  if (out.includes(mut.expectFailTest)) return true;
  return out.includes("not ok") && mut.unitOnly;
}

async function main() {
  let failed = 0;
  await withSafeChatRulesEmulator(async () => {
    const mod = await authSignUp();
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "safe-chat-mut-"));
    try {
      for (const m of mutations) {
        const dest = path.join(tmpDir, m.id);
        const r = m.erasureUnit
          ? runErasureHonestyInCopy(m, dest)
          : m.unitOnly
            ? runUnitInCopy(m, dest)
            : runIntegrationInCopy(m, mod, dest);
        const ok = mutationCaught(m, r);
        console.log(`${m.id}: expected failure => ${ok ? "CAUGHT" : "NOT CAUGHT"}`);
        if (!ok) failed += 1;
      }
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
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
