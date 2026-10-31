#!/usr/bin/env node
/**
 * Review #8 mutation guard (reviewer mutate8.py equivalents).
 */
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { cpSync, mkdtempSync, rmSync } from "fs";
import os from "os";
import { withSafeChatRulesEmulator } from "./lib/safe-chat-emulator.mjs";
import { authSignUp } from "./lib/safe-chat-emulator-auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const workerRoot = path.join(root, "workers/safe-chat");

const patches = {
  M1: [
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
  ],
  M2: [
    {
      file: "src/child-safety-abuse.js",
      from: `    if (!clusterCheck.ok) return { ok: false, reason: "cluster_hide_cap" };`,
      to: ""
    }
  ],
  M2b: [
    {
      file: "src/child-safety-abuse.js",
      from: `    if (!clusterCheck.ok) return { ok: false, reason: "cluster_hide_cap" };`,
      to: ""
    },
    {
      file: "src/child-safety-abuse.js",
      from: `    if (!bumpCluster.ok) return { ok: false, reason: "cluster_hide_cap" };`,
      to: ""
    }
  ],
  M3: [
    {
      file: "src/child-safety-risk.js",
      from: `  if (filterHit) return true;`,
      to: `  return true;`
    }
  ],
  M4: [
    {
      file: "src/child-safety-abuse.js",
      from: `    if (snap?.text) {`,
      to: `    if (false) {`
    }
  ],
  M5a: [
    {
      file: "src/erasure.js",
      from: `    if (subrequests + n > budget) {`,
      to: `    if (false) {`
    }
  ],
  M5b: [
    {
      file: "src/erasure-jobs.js",
      from: `export async function runErasureQueueJob(env, nowOverride) {
  const config = loadConfig(env);`,
      to: `export async function runErasureQueueJob(env, nowOverride) {
  return { ok: true, processed: 0 }; /* M5b */
  const config = loadConfig(env);`
    }
  ],
  M5c: [
    {
      file: "src/erasure-jobs.js",
      from: `  await persistJobAfterBatch(env, uid, batch, job, now);
  return { ok: true, processed: 1, uid, subrequests: batch.subrequests, status: mapBatchToJobStatus(batch) };`,
      to: `  return { ok: true, processed: 0 }; /* M5c */`
    }
  ],
  M6a: [
    {
      file: "src/index.js",
      from: `        cap != null &&
        now > cap &&`,
      to: `        false &&`
    }
  ],
  M6b: [
    {
      file: "src/index.js",
      from: `            action: "evidence_hold_expired",
            at: now,
            moderatorUid: null,
            note: "Automatic escalation: legal/max hold reached without moderator decision"
          },
          token,
          emu,
          ns
        );
        bump();
        await rtdbRequest(
          config,
          rtdbPath("chat", "internal", "safetyQueue", msgId),
          "PUT",`,
      to: `            action: "evidence_hold_expired",
            at: now,
            moderatorUid: null,
            note: "Automatic escalation: legal/max hold reached without moderator decision"
          },
          token,
          emu,
          ns
        ); if (false) { bump(); }
        await rtdbRequest(
          config,
          rtdbPath("chat", "internal", "safetyQueue", msgId),
          "PUT",`
    }
  ]
};

function apply(mutId, dest) {
  for (const p of patches[mutId]) {
    const fp = path.join(dest, p.file);
    let text = fs.readFileSync(fp, "utf8");
    if (!text.includes(p.from)) throw new Error(`${mutId} patch miss ${p.file}`);
    fs.writeFileSync(fp, text.replace(p.from, p.to));
  }
}

async function main() {
  let failed = 0;
  await withSafeChatRulesEmulator(async () => {
    const mod = await authSignUp();
    const tmp = mkdtempSync(path.join(os.tmpdir(), "review8-mut-"));
    try {
      for (const mutId of Object.keys(patches)) {
        const dest = path.join(tmp, mutId);
        cpSync(workerRoot, dest, { recursive: true, filter: s => !s.includes("node_modules") });
        cpSync(path.join(workerRoot, "node_modules"), path.join(dest, "node_modules"), { recursive: true });
        apply(mutId, dest);
        const r = spawnSync("npm", ["test"], {
          cwd: dest,
          encoding: "utf8",
          env: {
            ...process.env,
            SAFE_CHAT_INTEGRATION: "1",
            SAFE_CHAT_TEST_MOD_UID: mod.localId,
            SAFE_CHAT_TEST_MOD_TOKEN: mod.idToken
          }
        });
        const caught = r.status !== 0;
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
