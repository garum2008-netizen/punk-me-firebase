#!/usr/bin/env node
/**
 * Mutation guard: patches worker source in a temp copy (no env kill-switches).
 * Each mutation must break at least one named integration/unit test.
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { cpSync, mkdtempSync, rmSync, symlinkSync, existsSync } from "fs";
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
            from: `export async function checkDiscretionaryHideQuota({
  env,
  configObj,
  limitsStub,
  authUid,
  profile,
  now,
  clusterHash
}) {
  const trust = reporterTrustForChildSafety(profile, now, configObj);`,
            to: `export async function checkDiscretionaryHideQuota({
  env,
  configObj,
  limitsStub,
  authUid,
  profile,
  now,
  clusterHash
}) {
  return { ok: true }; /* MUT-A */
  const trust = reporterTrustForChildSafety(profile, now, configObj);`
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
            from: `        cap != null &&
        now > cap &&`,
            to: `        false && /* MUT-G */`
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
  await rtdbRequest(config, \`\${pathClientChatMessage(msgId)}/text\`, "DELETE", null, token, emu, ns);
  await rtdbRequest(config, \`\${pathClientChatMessage(msgId)}/textRedacted\`, "PUT", true, token, emu, ns);
  await rtdbRequest(config, \`\${pathClientChatMessage(msgId)}/hidden\`, "PUT", true, token, emu, ns);
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
            from: `      if (subrequests + 1 > budget) {
        budgetExceeded = true;
        return false;
      }`,
            to: `      if (false && subrequests + 1 > budget) {
        budgetExceeded = true;
        return false;
      } /* MUT-I */`
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
            from: `  if (result.complete) {`,
            to: `  if (true) { /* MUT-ER2 */`
          },
          {
            from: `  return mapBatchToJobStatus(batch) === "complete" && batch.complete === true;`,
            to: `  return mapBatchToJobStatus(batch) === "complete"; /* MUT-ER2 */`
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
  },
  {
    id: "MUT-MIRROR-HIDDEN",
    expectFailTest: "PROTECT MIRROR: hidden message mirror omits body text",
    patches: [
      {
        file: "src/client-message-mirror.js",
        replacements: [
          {
            from: `  if (canonical.hidden === true) {
    out.hidden = true;
    delete out.text;
  }
  if (canonical.textRedacted === true) {
    out.textRedacted = true;
    delete out.text;
  }`,
            to: `  if (canonical.hidden === true) {
    out.hidden = true;
  }
  if (canonical.textRedacted === true) {
    out.textRedacted = true;
  } /* MUT-MIRROR-HIDDEN: keep text on client mirror */`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-DEFER-MIRROR",
    expectFailTest: "PROTECT MIRROR: held-message erasure removes public mirror",
    patches: [
      {
        file: "src/erasure.js",
        replacements: [
          {
            from: `  if (blockedOnlyBySafetyHold(msgId, cache)) {
    await rtdbSpend(config, token, emu, ns, rtdbPath("chat", "clientMessages", msgId), "DELETE", null, spend);
    return;
  }`,
            to: `  if (blockedOnlyBySafetyHold(msgId, cache)) {
    /* MUT-DEFER-MIRROR */
    return;
  }`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-X4",
    expectFailTest: "GUARD X4: attempt cap fails job",
    patches: [
      {
        file: "src/erasure-jobs.js",
        replacements: [
          {
            from: `const MAX_JOB_ATTEMPTS = 48;`,
            to: `const MAX_JOB_ATTEMPTS = 9999; /* MUT-X4 */`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-X5",
    expectFailTest: "GUARD X5: permanent erasure failure records",
    patches: [
      {
        file: "src/erasure-jobs.js",
        replacements: [
          {
            from: `async function recordErasureJobAlert(config, token, emu, ns, env, uid, note, batchError) {
  await rtdbRequest(
    config,
    "chat/internal/safetyDecisions",
    "POST",
    {
      msgId: null,
      action: "erasure_job_failed",
      at: Date.now(),
      moderatorUid: null,
      note
    },
    token,
    emu,
    ns
  );`,
            to: `async function recordErasureJobAlert(config, token, emu, ns, env, uid, note, batchError) {
  return; /* MUT-X5 */
  await rtdbRequest(
    config,
    "chat/internal/safetyDecisions",
    "POST",
    {
      msgId: null,
      action: "erasure_job_failed",
      at: Date.now(),
      moderatorUid: null,
      note
    },
    token,
    emu,
    ns
  );`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-X6",
    expectFailTest: "GUARD X6: hold release resumes",
    patches: [
      {
        file: "src/erasure-jobs.js",
        replacements: [
          {
            from: `export async function resumeErasureJobsAfterHoldRelease(env, msgId) {`,
            to: `export async function resumeErasureJobsAfterHoldRelease(env, msgId) {
  return; /* MUT-X6 */`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-X9",
    expectFailTest: "GUARD X9: erasure rate limit blocks",
    patches: [
      {
        file: "src/erasure-jobs.js",
        replacements: [
          {
            from: `  if (
    respectRateLimit &&
    lastRequestAt &&
    now - lastRequestAt < config.erasureMinIntervalMs
  ) {`,
            to: `  if (false && /* MUT-X9 */
    respectRateLimit &&
    lastRequestAt &&
    now - lastRequestAt < config.erasureMinIntervalMs
  ) {`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-X10",
    expectFailTest: "GUARD X10: job status honesty",
    patches: [
      {
        file: "src/erasure-jobs.js",
        replacements: [
          {
            from: `  if (
    status === "complete" &&
    batch &&
    typeof batch.allOwnRemaining === "number" &&
    batch.allOwnRemaining > 0
  ) {
    status = "queued";
  }`,
            to: `  /* MUT-X10 removed honesty guard */`
          }
        ]
      }
    ]
  },
  {
    id: "MUT-X12",
    expectFailTest: "GUARD X12: delete-my-data with active queued job",
    patches: [
      {
        file: "src/erasure-jobs.js",
        replacements: [
          {
            from: `    return {
      ok: true,
      status,
      complete: status === "complete",
      completeWithHolds: status === "complete_with_holds",
      subrequests: undefined,
      deleted: undefined,
      cursor: job.cursor ?? null,
      remainingDeletable: undefined,
      attempts: job.attempts ?? 0,
      jobInProgress: status === "queued" || status === "in_progress",
      erasureDeferred: deferred,
      staleCursorCleared: undefined
    };
  }
  let status = job?.status || mapBatchToJobStatus(batch);`,
            to: `    return {
      ok: true,
      status,
      complete: true, /* MUT-X12 */
      completeWithHolds: status === "complete_with_holds",
      subrequests: undefined,
      deleted: undefined,
      cursor: job.cursor ?? null,
      remainingDeletable: undefined,
      attempts: job.attempts ?? 0,
      jobInProgress: status === "queued" || status === "in_progress",
      erasureDeferred: deferred,
      staleCursorCleared: undefined
    };
  }
  let status = job?.status || mapBatchToJobStatus(batch);`
          }
        ]
      }
    ]
  }
];

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

function prepareWorkerCopy(dest) {
  cpSync(workerRoot, dest, { recursive: true, filter: src => !src.includes("node_modules") });
  const nmDest = path.join(dest, "node_modules");
  if (!existsSync(nmDest)) {
    symlinkSync(path.join(workerRoot, "node_modules"), nmDest, "dir");
  }
  fs.copyFileSync(path.join(root, "database.rules.json"), path.join(dest, "database.rules.json"));
}

function copyWorker(dest) {
  prepareWorkerCopy(dest);
}

function runIntegrationInCopy(mut, mod, dest) {
  prepareWorkerCopy(dest);
  if (mut.patches?.length) applyPatches(mut, dest);
  const r = spawnSync("npm", ["test"], {
    cwd: dest,
    env: {
      ...process.env,
      SAFE_CHAT_INTEGRATION: "1",
      SAFE_CHAT_TEST_MOD_UID: mod.localId,
      SAFE_CHAT_TEST_MOD_TOKEN: mod.idToken
    },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024
  });
  rmSync(dest, { recursive: true, force: true });
  return r;
}

function runErasureHonestyInCopy(mut, dest) {
  prepareWorkerCopy(dest);
  applyPatches(mut, dest);
  const r = spawnSync("npx", ["vitest", "run", "src/erasure-honesty.test.js"], {
    cwd: dest,
    env: { ...process.env, SAFE_CHAT_INTEGRATION: "0" },
    encoding: "utf8"
  });
  rmSync(dest, { recursive: true, force: true });
  return r;
}

function runUnitInCopy(mut, dest) {
  prepareWorkerCopy(dest);
  applyPatches(mut, dest);
  const limitsPath = path.join(dest, "src/limits-do.js");
  const r = spawnSync("node", [alarmTest], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      SAFE_CHAT_LIMITS_DO_PATH: limitsPath
    }
  });
  rmSync(dest, { recursive: true, force: true });
  return r;
}

function mutationCaught(mut, result) {
  const out = `${result.stdout || ""}${result.stderr || ""}`;
  if (result.status === 0) return false;
  const needle = mut.expectFailTest;
  for (const line of out.split("\n")) {
    if (!line.includes(needle)) continue;
    if (line.includes("×") || /\bFAIL\b/.test(line)) return true;
  }
  return false;
}

async function main() {
  let failed = 0;
  await withSafeChatRulesEmulator(async () => {
    const mod = await authSignUp();
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), "safe-chat-mut-"));
    try {
      const ctrlDest = path.join(tmpDir, "CTRL0");
      prepareWorkerCopy(ctrlDest);
      const ctrl = runIntegrationInCopy({ id: "CTRL0", expectFailTest: "", patches: [] }, mod, ctrlDest);
      if (ctrl.status !== 0) {
        console.error("mutation-check: CTRL0 (unmutated copy) must pass");
        console.error(`${ctrl.stdout || ""}${ctrl.stderr || ""}`);
        process.exit(1);
      }
      console.log("CTRL0: unmutated copy PASS");

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
