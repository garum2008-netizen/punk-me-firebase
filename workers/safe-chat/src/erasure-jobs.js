import { assertFirebaseId } from "./ids.js";
import { chatPublicSid, rtdbPath, rtdbRequest } from "./rtdb.js";
import { loadConfig } from "./config.js";
import { getCachedAdminToken } from "./admin-token.js";
import { runUserErasureBatch } from "./erasure.js";

const JOBS_ROOT = "chat/internal/erasureJobs";
const MAX_JOB_ATTEMPTS = 48;

async function eraseUserLimits(env, uid) {
  try {
    const id = env.CHAT_LIMITS.idFromName("global");
    const stub = env.CHAT_LIMITS.get(id);
    await stub.fetch(
      new Request("http://do/erase-user", {
        method: "POST",
        body: JSON.stringify({ uid })
      })
    );
  } catch (_) {}
}

function pathJob(uid) {
  return rtdbPath("chat", "internal", "erasureJobs", uid);
}

export function mapBatchToJobStatus(result) {
  if (result.completeWithHolds) return "complete_with_holds";
  if (result.complete) {
    if (result.allOwnRemaining == null) return "queued";
    if (result.allOwnRemaining > 0) return "queued";
    if (result.remainingDeletable == null) return "queued";
    if (result.remainingDeletable > 0) return "queued";
    return "complete";
  }
  if (!result.ok) return "failed";
  return "queued";
}

export function userFacingErasurePayload(job, batch) {
  let status = job?.status || mapBatchToJobStatus(batch);
  if (
    status === "complete" &&
    batch &&
    typeof batch.allOwnRemaining === "number" &&
    batch.allOwnRemaining > 0
  ) {
    status = "queued";
  }
  if (status === "complete" && job && job.status === "queued") {
    status = "queued";
  }
  const deferred =
    batch?.erasureDeferred?.length > 0
      ? batch.erasureDeferred
      : job?.holdMsgIds?.length > 0
        ? job.holdMsgIds
        : undefined;
  return {
    ok: true,
    status,
    complete: status === "complete",
    completeWithHolds: status === "complete_with_holds",
    subrequests: batch?.subrequests,
    deleted: batch?.deleted,
    cursor: batch?.cursor ?? job?.cursor ?? null,
    remainingDeletable: batch?.remainingDeletable,
    attempts: job?.attempts ?? 0,
    jobInProgress: status === "queued" || status === "in_progress",
    erasureDeferred: deferred,
    staleCursorCleared: batch?.staleCursorCleared
  };
}

async function readJob(config, token, emu, ns, uid) {
  const res = await rtdbRequest(config, pathJob(uid), "GET", null, token, emu, ns);
  return res.json && typeof res.json === "object" ? res.json : null;
}

async function writeJob(config, token, emu, ns, uid, job) {
  await rtdbRequest(config, pathJob(uid), "PUT", job, token, emu, ns);
}

async function deleteJob(config, token, emu, ns, uid) {
  await rtdbRequest(config, pathJob(uid), "DELETE", null, token, emu, ns);
}

const META_CLEAR_ON_HOLD = uid => [
  rtdbPath("chatMeta", uid, "chatAge13DeclaredAt"),
  rtdbPath("chatMeta", uid, "chatRegisteredAt"),
  rtdbPath("chatMeta", uid, "chatSendCount"),
  rtdbPath("chatMeta", uid, "erasureJobStartedAt"),
  rtdbPath("chatMeta", uid, "lastErasureRequestAt"),
  rtdbPath("chatMeta", uid, "erasureCursor")
];

export async function clearNonHoldMetaAfterParking(config, token, emu, ns, authUid) {
  for (const p of META_CLEAR_ON_HOLD(authUid)) {
    await rtdbRequest(config, p, "DELETE", null, token, emu, ns);
  }
}

export async function runErasureJobStep(env, uid, { now, bypassRateLimit = false } = {}) {
  const config = loadConfig(env);
  const token = await getCachedAdminToken(env);
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  assertFirebaseId(uid);
  const sid = await chatPublicSid(uid, env.SAFE_CHAT_HASH_SALT || "");
  const budget = config.erasureMaxSubrequests;
  let subrequestsUsed = 0;
  const spendPre = () => {
    subrequestsUsed += 1;
    return subrequestsUsed <= budget;
  };

  const cursorRes = await rtdbSpendGet(
    config,
    token,
    emu,
    ns,
    rtdbPath("chatMeta", uid, "erasureCursor"),
    spendPre
  );
  if (!spendPre()) {
    return { ok: true, status: "queued", subrequests: subrequestsUsed, budgetExceeded: true };
  }
  await rtdbSpendGet(
    config,
    token,
    emu,
    ns,
    rtdbPath("chatMeta", uid, "erasureJobStartedAt"),
    spendPre
  );
  const storedCursor = cursorRes.json != null && cursorRes.json !== "" ? cursorRes.json : null;

  const batch = await runUserErasureBatch({
    config,
    env,
    token,
    authUid: uid,
    sid,
    now: now ?? Date.now(),
    storedCursor,
    budget,
    subrequestsUsed,
    bypassRateLimit
  });

  return { ...batch, sid };
}

async function rtdbSpendGet(config, token, emu, ns, path, spendPre) {
  if (!spendPre()) return { skipped: true, json: null };
  return rtdbRequest(config, path, "GET", null, token, emu, ns);
}

export async function persistJobAfterBatch(env, uid, batch, existingJob, now) {
  const config = loadConfig(env);
  const token = await getCachedAdminToken(env);
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const status = mapBatchToJobStatus(batch);
  const attempts = existingJob?.attempts || 0;
  let nextAttempts = attempts;
  if (status === "queued") nextAttempts = attempts + 1;

  const holdMsgIds =
    batch.erasureDeferred?.length > 0 ? batch.erasureDeferred : existingJob?.holdMsgIds || null;

  if (status === "complete_with_holds") {
    await clearNonHoldMetaAfterParking(config, token, emu, ns, uid);
  }

  if (status === "complete" || status === "complete_with_holds") {
    if (batch.complete) {
      await eraseUserLimits(env, uid);
    }
    if (status === "complete") {
      if (batch.complete !== true) {
        await writeJob(config, token, emu, ns, uid, {
          status: "queued",
          cursor: batch.cursor || existingJob?.cursor || null,
          attempts: nextAttempts,
          updatedAt: now,
          requestedAt: existingJob?.requestedAt || now,
          holdMsgIds: existingJob?.holdMsgIds || null,
          subrequestsLast: batch.subrequests
        });
        return readJob(config, token, emu, ns, uid);
      }
      if (typeof batch.allOwnRemaining === "number" && batch.allOwnRemaining > 0) {
        await writeJob(config, token, emu, ns, uid, {
          status: "queued",
          cursor: batch.cursor || existingJob?.cursor || null,
          attempts: nextAttempts,
          updatedAt: now,
          requestedAt: existingJob?.requestedAt || now,
          holdMsgIds: existingJob?.holdMsgIds || null,
          subrequestsLast: batch.subrequests
        });
        return readJob(config, token, emu, ns, uid);
      }
      await deleteJob(config, token, emu, ns, uid);
      return null;
    }
  }

  if (status === "queued" && nextAttempts > MAX_JOB_ATTEMPTS) {
    await rtdbRequest(
      config,
      "chat/internal/safetyDecisions",
      "POST",
      {
        msgId: null,
        action: "erasure_job_failed",
        at: now,
        moderatorUid: null,
        note: `Erasure job for uid ${uid.slice(0, 8)}… exceeded attempt cap`
      },
      token,
      emu,
      ns
    );
    await writeJob(config, token, emu, ns, uid, {
      status: "failed",
      attempts: nextAttempts,
      updatedAt: now,
      failedAt: now
    });
    return readJob(config, token, emu, ns, uid);
  }

  const job = {
    status,
    cursor: batch.cursor || null,
    attempts: nextAttempts,
    updatedAt: now,
    requestedAt: existingJob?.requestedAt || now,
    holdMsgIds,
    subrequestsLast: batch.subrequests
  };
  await writeJob(config, token, emu, ns, uid, job);
  return job;
}

export async function resumeErasureJobsAfterHoldRelease(env, msgId) {
  const config = loadConfig(env);
  const token = await getCachedAdminToken(env);
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const jobsRes = await rtdbRequest(config, JOBS_ROOT, "GET", null, token, emu, ns);
  if (!jobsRes.json || typeof jobsRes.json !== "object") return;
  const now = Date.now();
  for (const [uid, job] of Object.entries(jobsRes.json)) {
    if (job?.status !== "complete_with_holds") continue;
    if (!job.holdMsgIds?.includes(msgId)) continue;
    const def = await rtdbRequest(
      config,
      rtdbPath("chat", "internal", "erasureDeferred", msgId),
      "GET",
      null,
      token,
      emu,
      ns
    );
    if (def.json) continue;
    const hold = await rtdbRequest(
      config,
      rtdbPath("chat", "internal", "safetyHolds", msgId),
      "GET",
      null,
      token,
      emu,
      ns
    );
    if (hold.json) continue;
    await writeJob(config, token, emu, ns, uid, {
      ...job,
      status: "queued",
      updatedAt: now,
      holdMsgIds: job.holdMsgIds.filter(id => id !== msgId)
    });
  }
}

export async function runErasureQueueJob(env, nowOverride) {
  const config = loadConfig(env);
  const token = await getCachedAdminToken(env);
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const now = nowOverride ?? Date.now();
  const jobsRes = await rtdbRequest(config, JOBS_ROOT, "GET", null, token, emu, ns);
  if (!jobsRes.json || typeof jobsRes.json !== "object") {
    return { ok: true, processed: 0 };
  }
  const candidates = Object.entries(jobsRes.json).filter(([, j]) => j?.status === "queued");
  if (!candidates.length) return { ok: true, processed: 0 };
  candidates.sort((a, b) => (a[1].updatedAt || 0) - (b[1].updatedAt || 0));
  const [uid, job] = candidates[0];
  assertFirebaseId(uid);
  const batch = await runErasureJobStep(env, uid, { now, bypassRateLimit: true });
  await persistJobAfterBatch(env, uid, batch, job, now);
  return { ok: true, processed: 1, uid, subrequests: batch.subrequests, status: mapBatchToJobStatus(batch) };
}

/** Used by delete-my-data and tests. */
export async function startOrContinueUserErasure(env, authUid, { now, respectRateLimit = true, lastRequestAt = 0 }) {
  const config = loadConfig(env);
  const token = await getCachedAdminToken(env);
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const existing = await readJob(config, token, emu, ns, authUid);

  if (
    respectRateLimit &&
    lastRequestAt &&
    now - lastRequestAt < config.erasureMinIntervalMs
  ) {
    if (existing) return { rateLimited: true, job: existing, batch: null };
    return { rateLimited: true, job: { status: "queued" }, batch: null };
  }

  if (
    existing &&
    (existing.status === "queued" ||
      existing.status === "in_progress" ||
      existing.status === "complete_with_holds" ||
      existing.status === "failed")
  ) {
    return { rateLimited: false, job: existing, batch: null, jobStatusOnly: true };
  }

  const batch = await runErasureJobStep(env, authUid, { now, bypassRateLimit: !respectRateLimit });
  if (!batch.ok) {
    return { rateLimited: false, job: existing, batch, error: batch.error };
  }
  const job = await persistJobAfterBatch(env, authUid, batch, existing, now);
  await rtdbRequest(
    config,
    rtdbPath("chatMeta", authUid, "lastErasureRequestAt"),
    "PUT",
    now,
    token,
    emu,
    ns
  );
  return { rateLimited: false, job, batch };
}

export async function loadUserErasureJob(env, uid) {
  const config = loadConfig(env);
  const token = await getCachedAdminToken(env);
  return readJob(config, token, env.FIREBASE_EMULATOR_HOST, env.FIREBASE_EMULATOR_NS, uid);
}
