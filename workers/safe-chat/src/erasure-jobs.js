import { assertFirebaseId } from "./ids.js";
import { chatPublicSid, rtdbPath, rtdbRequest } from "./rtdb.js";
import { loadConfig } from "./config.js";
import { getCachedAdminToken } from "./admin-token.js";
import { runUserErasureBatch } from "./erasure.js";
import { chatLimitsDoName } from "./limits-do-env.js";
import { sendModeratorAlert } from "./mod-alert.js";

const JOBS_ROOT = "chat/internal/erasureJobs";
const MAX_JOB_ATTEMPTS = 48;
const JOB_LEASE_MS = 90_000;

async function eraseUserLimits(env, uid) {
  try {
    const id = env.CHAT_LIMITS.idFromName(chatLimitsDoName(env));
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

/** True only when batch honestly reports zero own messages left (unit-tested guard). */
export function erasureJobMayDeleteFromBatch(batch) {
  return mapBatchToJobStatus(batch) === "complete" && batch.complete === true;
}

export function erasureBatchMadeProgress(batch, existingJob) {
  if (!batch || batch.ok === false) return false;
  if ((batch.deleted ?? 0) > 0) return true;
  if (batch.staleCursorCleared) return true;
  if (batch.complete === true) return true;
  const prev = existingJob?.cursor ?? null;
  const cur = batch.cursor ?? null;
  if (cur != null && cur !== prev) return true;
  return false;
}

export function userFacingErasurePayload(job, batch) {
  if (batch == null && job && typeof job.status === "string") {
    const status =
      job.status === "complete_with_holds"
        ? "complete_with_holds"
        : job.status === "failed"
          ? "failed"
          : job.status === "in_progress"
            ? "in_progress"
            : job.status === "complete"
              ? "complete"
              : "queued";
    const deferred =
      Array.isArray(job.holdMsgIds) && job.holdMsgIds.length > 0 ? job.holdMsgIds : undefined;
    return {
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

export async function runErasureJobStep(env, uid, { now, bypassRateLimit = false, externalSpend } = {}) {
  const config = loadConfig(env);
  const token = await getCachedAdminToken(env);
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  assertFirebaseId(uid);
  const sid = await chatPublicSid(uid, env.SAFE_CHAT_HASH_SALT || "");
  const budget = config.erasureMaxSubrequests;

  const batch = await runUserErasureBatch({
    config,
    env,
    token,
    authUid: uid,
    sid,
    now: now ?? Date.now(),
    storedCursor: null,
    budget,
    subrequestsUsed: 0,
    bypassRateLimit,
    externalSpend
  });

  return { ...batch, sid };
}

async function rtdbSpendGet(config, token, emu, ns, path, spendPre) {
  if (!spendPre()) return { skipped: true, json: null };
  return rtdbRequest(config, path, "GET", null, token, emu, ns);
}

async function recordErasureJobAlert(config, token, emu, ns, env, uid, note, batchError) {
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
  );
  await sendModeratorAlert(env, {
    kind: "erasure_job_failed",
    uidPrefix: uid.slice(0, 8),
    error: batchError || note
  });
}

async function recordErasureJobTransientAlert(config, token, emu, ns, env, uid, note, batchError, attempts) {
  await rtdbRequest(
    config,
    "chat/internal/safetyDecisions",
    "POST",
    {
      msgId: null,
      action: "erasure_job_retry",
      at: Date.now(),
      moderatorUid: null,
      note: `${note} (attempt ${attempts})`
    },
    token,
    emu,
    ns
  );
  await sendModeratorAlert(env, {
    kind: "erasure_job_retry",
    uidPrefix: uid.slice(0, 8),
    error: batchError || note
  });
}

export async function persistJobAfterBatch(env, uid, batch, existingJob, now) {
  const config = loadConfig(env);
  const token = await getCachedAdminToken(env);
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const status = mapBatchToJobStatus(batch);
  const attempts = existingJob?.attempts || 0;
  let nextAttempts = attempts;
  const progressed = erasureBatchMadeProgress(batch, existingJob);

  if (status === "failed" && batch?.ok === false) {
    nextAttempts = progressed ? attempts : attempts + 1;
    const note = `Erasure batch failed (${batch.error || "unknown"}); will retry`;
    const alertEvery = config.erasureTransientAlertEveryAttempts || 4;
    if (nextAttempts === 1 || nextAttempts % alertEvery === 0) {
      await recordErasureJobTransientAlert(
        config,
        token,
        emu,
        ns,
        env,
        uid,
        note,
        batch.error,
        nextAttempts
      );
    }
    if (nextAttempts >= MAX_JOB_ATTEMPTS) {
      await recordErasureJobAlert(config, token, emu, ns, env, uid, note, batch.error);
      await writeJob(config, token, emu, ns, uid, {
        status: "failed",
        attempts: nextAttempts,
        updatedAt: now,
        failedAt: now,
        lastError: batch.error || "unknown"
      });
      return readJob(config, token, emu, ns, uid);
    }
    await writeJob(config, token, emu, ns, uid, {
      status: "queued",
      cursor: existingJob?.cursor || batch?.cursor || null,
      attempts: nextAttempts,
      updatedAt: now,
      requestedAt: existingJob?.requestedAt || now,
      holdMsgIds: existingJob?.holdMsgIds || null,
      lastError: batch.error || "unknown",
      retryAfter: now + Math.min(600_000, 5000 * nextAttempts)
    });
    return readJob(config, token, emu, ns, uid);
  }

  if (status === "queued" && !progressed) nextAttempts = attempts + 1;
  else if (status === "queued") nextAttempts = attempts;

  if (batch.budgetExceeded) {
    const holdMsgIds =
      batch.erasureDeferred?.length > 0 ? batch.erasureDeferred : existingJob?.holdMsgIds || null;
    const job = {
      status: "queued",
      cursor: batch.cursor || existingJob?.cursor || null,
      attempts: nextAttempts,
      updatedAt: now,
      requestedAt: existingJob?.requestedAt || now,
      holdMsgIds,
      subrequestsLast: batch.subrequests
    };
    await writeJob(config, token, emu, ns, uid, job);
    return job;
  }

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
      if (!erasureJobMayDeleteFromBatch(batch)) {
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
    await recordErasureJobAlert(
      config,
      token,
      emu,
      ns,
      env,
      uid,
      `Erasure job for uid ${uid.slice(0, 8)}… exceeded attempt cap`,
      "attempt_cap"
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
    subrequestsLast: batch.subrequests,
    processingUntil: null,
    processingToken: null
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

async function tryClaimQueuedJob(config, token, emu, ns, uid, job, now) {
  const fresh = await readJob(config, token, emu, ns, uid);
  if (!fresh || fresh.status !== "queued") return null;
  if (fresh.retryAfter && now < fresh.retryAfter) return null;
  if (fresh.processingUntil && fresh.processingUntil > now) return null;
  const tokenLease = `${now}-${Math.random().toString(36).slice(2, 10)}`;
  const priorUpdatedAt = fresh.updatedAt ?? 0;
  await writeJob(config, token, emu, ns, uid, {
    ...fresh,
    status: "in_progress",
    processingUntil: now + JOB_LEASE_MS,
    processingToken: tokenLease,
    updatedAt: now
  });
  const verify = await readJob(config, token, emu, ns, uid);
  if (verify?.processingToken !== tokenLease || verify.status !== "in_progress") return null;
  if (verify.updatedAt !== now && verify.updatedAt !== priorUpdatedAt) return null;
  return verify;
}

async function withErasureQueueLock(env, fn) {
  let stub;
  try {
    const id = env.CHAT_LIMITS.idFromName(chatLimitsDoName(env));
    stub = env.CHAT_LIMITS.get(id);
    const acquire = await stub.fetch(
      new Request("http://do/erasure-queue-lock", {
        method: "POST",
        body: JSON.stringify({ op: "acquire", ttlMs: JOB_LEASE_MS })
      })
    );
    const lock = await acquire.json();
    if (lock?.ok) {
      try {
        return await fn(lock.token);
      } finally {
        /* Hold lock until TTL — do not release early or a queued waiter can drain twice. */
      }
    }
    if (lock?.reason === "locked") {
      return { ok: true, processed: 0, skipped: "queue_locked" };
    }
    return { ok: true, processed: 0, skipped: "queue_lock_unavailable" };
  } catch (_) {
    return { ok: true, processed: 0, skipped: "queue_lock_unavailable" };
  }
}

export async function runErasureQueueJob(env, nowOverride, opts = {}) {
  const spend = opts.spend;
  const budgetRemaining = opts.budgetRemaining;
  if (spend && budgetRemaining && budgetRemaining() <= 0) {
    return { ok: true, processed: 0, budgetStopped: true };
  }
  let stepEnv = env;
  if (budgetRemaining) {
    const config = loadConfig(env);
    const cap = Math.min(config.erasureMaxSubrequests, Math.max(0, budgetRemaining()));
    if (cap <= 0) return { ok: true, processed: 0, budgetStopped: true };
    stepEnv = { ...env, SAFE_CHAT_ERASURE_MAX_SUBREQUESTS: String(cap) };
  }
  return withErasureQueueLock(stepEnv, async () => {
  const config = loadConfig(stepEnv);
  const token = await getCachedAdminToken(stepEnv);
  const emu = stepEnv.FIREBASE_EMULATOR_HOST;
  const ns = stepEnv.FIREBASE_EMULATOR_NS;
  const now = nowOverride ?? Date.now();
  const jobsRes = await rtdbRequest(config, JOBS_ROOT, "GET", null, token, emu, ns);
  if (spend && !spend(1)) return { ok: true, processed: 0, budgetStopped: true };
  if (!jobsRes.json || typeof jobsRes.json !== "object") {
    return { ok: true, processed: 0 };
  }
  const candidates = Object.entries(jobsRes.json).filter(([, j]) => j?.status === "queued");
  if (!candidates.length) return { ok: true, processed: 0 };
  candidates.sort((a, b) => (a[1].updatedAt || 0) - (b[1].updatedAt || 0));
  const [uid, job] = candidates[0];
  assertFirebaseId(uid);
  const claimed = await tryClaimQueuedJob(config, token, emu, ns, uid, job, now);
  if (!claimed) return { ok: true, processed: 0, skipped: "not_claimed" };
  const batch = await runErasureJobStep(stepEnv, uid, { now, bypassRateLimit: true, externalSpend: spend });
  await persistJobAfterBatch(stepEnv, uid, batch, claimed, now);
  return { ok: true, processed: 1, uid, subrequests: batch.subrequests, status: mapBatchToJobStatus(batch) };
  });
}

/** Used by delete-my-data and tests. */
export async function startOrContinueUserErasure(
  env,
  authUid,
  { now, respectRateLimit = true, lastRequestAt = 0, initialSubrequests = 0, persistReserve = 2 } = {}
) {
  const config = loadConfig(env);
  const token = await getCachedAdminToken(env);
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const maxSub = config.erasureMaxSubrequests;
  let requestSubrequests = initialSubrequests;
  const countRtdb = async (promise) => {
    requestSubrequests += 1;
    return promise;
  };
  let existingRaw = await countRtdb(() => readJob(config, token, emu, ns, authUid));
  if (!existingRaw) {
    const jobsRes = await countRtdb(() => rtdbRequest(config, JOBS_ROOT, "GET", null, token, emu, ns));
    if (jobsRes.json?.[authUid]) existingRaw = jobsRes.json[authUid];
  }
  let existing = existingRaw;

  if (existing?.status === "failed") {
    const attempts = existing.attempts ?? 0;
    await countRtdb(() =>
      writeJob(config, token, emu, ns, authUid, {
        ...existing,
        status: "queued",
        attempts,
        failedAt: null,
        lastError: null,
        updatedAt: now
      })
    );
    existing = { ...existing, status: "queued", attempts, failedAt: null, lastError: null };
  }

  if (
    respectRateLimit &&
    lastRequestAt &&
    now - lastRequestAt < config.erasureMinIntervalMs
  ) {
    if (existing) return { rateLimited: true, job: existing, batch: null, requestSubrequests };
    return { rateLimited: true, job: { status: "queued" }, batch: null, requestSubrequests };
  }

  if (existing?.status === "in_progress") {
    return {
      rateLimited: false,
      job: existing,
      batch: null,
      jobStatusOnly: true,
      requestSubrequests
    };
  }

  if (existing?.status === "complete_with_holds") {
    if (!Array.isArray(existing.holdMsgIds) || existing.holdMsgIds.length === 0) {
      return {
        rateLimited: false,
        job: existing,
        batch: null,
        jobStatusOnly: true,
        requestSubrequests
      };
    }
    await countRtdb(() =>
      writeJob(config, token, emu, ns, authUid, {
        ...existing,
        status: "queued",
        updatedAt: now
      })
    );
    existing = { ...existing, status: "queued" };
  }

  if (existing?.status === "queued") {
    const pendingWork =
      existing.retryAfter ||
      existing.lastError ||
      existing.cursor ||
      (Array.isArray(existing.holdMsgIds) && existing.holdMsgIds.length > 0);
    if (!pendingWork) {
      const sid = await chatPublicSid(authUid, env.SAFE_CHAT_HASH_SALT || "");
      const msgsRes = await countRtdb(() =>
        rtdbRequest(config, "chat/messages", "GET", null, token, emu, ns)
      );
      const ownCount =
        msgsRes.json && typeof msgsRes.json === "object"
          ? Object.values(msgsRes.json).filter(m => m?.sid === sid).length
          : 0;
      if (ownCount === 0) {
        await countRtdb(() =>
          rtdbRequest(config, rtdbPath("chatMeta", authUid, "lastErasureRequestAt"), "PUT", now, token, emu, ns)
        );
        return {
          rateLimited: false,
          job: existing,
          batch: null,
          jobStatusOnly: true,
          requestSubrequests
        };
      }
    }
    if (!pendingWork) {
      /* own messages remain — run erasure batch below */
    } else if (existing.retryAfter) {
      await countRtdb(() =>
        writeJob(config, token, emu, ns, authUid, {
          ...existing,
          retryAfter: null,
          updatedAt: now
        })
      );
      existing = { ...existing, retryAfter: null };
    }
  }

  const batchBudget = Math.max(0, maxSub - requestSubrequests - persistReserve);
  const stepEnv =
    batchBudget < config.erasureMaxSubrequests
      ? { ...env, SAFE_CHAT_ERASURE_MAX_SUBREQUESTS: String(batchBudget) }
      : env;
  const batch = await runErasureJobStep(stepEnv, authUid, { now, bypassRateLimit: !respectRateLimit });
  if (!batch.ok) {
    const totalSubrequests = requestSubrequests + (batch.subrequests || 0);
    if (batch) batch.subrequests = totalSubrequests;
    return {
      rateLimited: false,
      job: existing,
      batch,
      error: batch.error,
      requestSubrequests: totalSubrequests
    };
  }
  const job = await persistJobAfterBatch(env, authUid, batch, existing, now);
  if (respectRateLimit) {
    await countRtdb(() =>
      rtdbRequest(config, rtdbPath("chatMeta", authUid, "lastErasureRequestAt"), "PUT", now, token, emu, ns)
    );
  }
  const totalSubrequests = requestSubrequests + (batch.subrequests || 0);
  batch.subrequests = totalSubrequests;
  return { rateLimited: false, job, batch, requestSubrequests: totalSubrequests };
}

export async function loadUserErasureJob(env, uid) {
  const config = loadConfig(env);
  const token = await getCachedAdminToken(env);
  return readJob(config, token, env.FIREBASE_EMULATOR_HOST, env.FIREBASE_EMULATOR_NS, uid);
}
