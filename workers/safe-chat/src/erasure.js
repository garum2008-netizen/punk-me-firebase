import { assertFirebaseId, assertReportHash } from "./ids.js";
import { anonymizeUid, rtdbPath, rtdbRequest } from "./rtdb.js";

function pathChatMessage(msgId) {
  return rtdbPath("chat", "messages", msgId);
}

function pathChatMeta(uid, ...rest) {
  return rtdbPath("chatMeta", uid, ...rest);
}

function isOwnMessage(m, sid, authUid) {
  return m?.sid === sid || m?.uid === authUid;
}

function minimizedSnapshot(msg) {
  return {
    sid: msg?.sid || null,
    text: msg?.text || "",
    time: msg?.time || null,
    phraseId: msg?.phraseId || null
  };
}

/** One RTDB round-trip per call — caller must bump budget for each request. */
async function rtdbSpend(config, token, emu, ns, path, method, body, spend) {
  if (!spend(1)) return { skipped: true, json: null };
  return rtdbRequest(config, path, method, body, token, emu, ns);
}

async function loadSafetyBlockCache(config, token, emu, ns, spend) {
  const holds = await rtdbSpend(config, token, emu, ns, "chat/internal/safetyHolds", "GET", null, spend);
  const queue = await rtdbSpend(config, token, emu, ns, "chat/internal/safetyQueue", "GET", null, spend);
  const evidence = await rtdbSpend(config, token, emu, ns, "chat/internal/safetyEvidence", "GET", null, spend);
  const deferred = await rtdbSpend(config, token, emu, ns, "chat/internal/erasureDeferred", "GET", null, spend);

  const holdIds = new Set(Object.keys(holds.json || {}));
  const queueChildHarm = new Set();
  if (queue.json && typeof queue.json === "object") {
    for (const [id, q] of Object.entries(queue.json)) {
      if (q?.childHarm) queueChildHarm.add(id);
    }
  }
  const evidenceIds = new Set(Object.keys(evidence.json || {}));
  const deferredIds = new Set();
  if (deferred.json && typeof deferred.json === "object") {
    for (const [id, d] of Object.entries(deferred.json)) {
      if (d?.status === "erasure_deferred") deferredIds.add(id);
    }
  }
  return { holdIds, queueChildHarm, evidenceIds, deferredIds };
}

function messageBlockedInCache(msgId, msg, cache) {
  if (cache.holdIds.has(msgId)) return true;
  if (cache.queueChildHarm.has(msgId)) return true;
  if (cache.evidenceIds.has(msgId)) return true;
  if (cache.deferredIds.has(msgId)) return true;
  return false;
}

export async function deferMessageErasure(config, token, emu, ns, msgId, msg, now, configObj, spend) {
  await rtdbSpend(
    config,
    token,
    emu,
    ns,
    rtdbPath("chat", "internal", "erasureDeferred", msgId),
    "PUT",
    {
      status: "erasure_deferred",
      reason: "safety_hold",
      requestedAt: now,
      expiresAt: now + configObj.erasureDeferredTtlMs,
      snapshot: minimizedSnapshot(msg)
    },
    spend
  );
}

async function openCaseMsgIds(config, token, emu, ns, spend) {
  const ids = new Set();
  const queue = await rtdbSpend(config, token, emu, ns, "chat/internal/safetyQueue", "GET", null, spend);
  if (queue.json) Object.keys(queue.json).forEach(k => ids.add(k));
  const holds = await rtdbSpend(config, token, emu, ns, "chat/internal/safetyHolds", "GET", null, spend);
  if (holds.json) Object.keys(holds.json).forEach(k => ids.add(k));
  const deferred = await rtdbSpend(config, token, emu, ns, "chat/internal/erasureDeferred", "GET", null, spend);
  if (deferred.json) Object.keys(deferred.json).forEach(k => ids.add(k));
  return ids;
}

export async function eraseReporterArtifacts(config, token, emu, ns, reporterHash, openCases, spend) {
  let used = 0;
  const reports = await rtdbSpend(config, token, emu, ns, "chat/reports", "GET", null, spend);
  if (reports.skipped) return { used };
  used += 1;
  if (reports.json && typeof reports.json === "object") {
    for (const [id, r] of Object.entries(reports.json)) {
      if (r?.reporterHash !== reporterHash) continue;
      if (openCases.has(r?.msgId)) continue;
      try {
        assertFirebaseId(id);
      } catch {
        continue;
      }
      if (!spend(1)) break;
      used += 1;
      await rtdbRequest(config, rtdbPath("chat", "reports", id), "DELETE", null, token, emu, ns);
    }
  }
  const dedupRoot = await rtdbSpend(config, token, emu, ns, "chat/internal/reportDedup", "GET", null, spend);
  if (dedupRoot.skipped) return { used };
  used += 1;
  if (dedupRoot.json && typeof dedupRoot.json === "object") {
    for (const [msgId, reporters] of Object.entries(dedupRoot.json)) {
      if (openCases.has(msgId)) continue;
      if (!reporters || typeof reporters !== "object") continue;
      if (!reporters[reporterHash]) continue;
      try {
        assertFirebaseId(msgId);
      } catch {
        continue;
      }
      if (!spend(1)) break;
      used += 1;
      await rtdbRequest(
        config,
        rtdbPath("chat", "internal", "reportDedup", msgId, reporterHash),
        "DELETE",
        null,
        token,
        emu,
        ns
      );
    }
  }
  return { used };
}

async function countOwnMessageStats(config, token, emu, ns, sid, authUid, cache, spend) {
  const msgs = await rtdbSpend(config, token, emu, ns, "chat/messages", "GET", null, spend);
  if (msgs.skipped) return { deletable: null, allOwn: null, unknown: true };
  let deletable = 0;
  let allOwn = 0;
  if (msgs.json && typeof msgs.json === "object") {
    for (const [id, m] of Object.entries(msgs.json)) {
      if (!isOwnMessage(m, sid, authUid)) continue;
      try {
        assertFirebaseId(id);
      } catch {
        continue;
      }
      allOwn += 1;
      if (!messageBlockedInCache(id, m, cache)) deletable += 1;
    }
  }
  return { deletable, allOwn, unknown: false };
}

const META_CLEANUP_PATHS = uid => [
  pathChatMeta(uid, "blockedSids"),
  pathChatMeta(uid, "chatRegisteredAt"),
  pathChatMeta(uid, "chatAge13DeclaredAt"),
  pathChatMeta(uid, "chatSendCount"),
  pathChatMeta(uid, "reporterSafetyHidden"),
  pathChatMeta(uid, "lastErasureRequestAt"),
  pathChatMeta(uid, "erasureCursor"),
  pathChatMeta(uid, "erasureJobStartedAt")
];

async function deleteErasureMeta(config, token, emu, ns, authUid, spend) {
  for (const p of META_CLEANUP_PATHS(authUid)) {
    if (!spend(1)) return false;
    await rtdbRequest(config, p, "DELETE", null, token, emu, ns);
  }
  return true;
}

export async function runUserErasureBatch({
  config,
  env,
  token,
  authUid,
  sid,
  now,
  storedCursor,
  budget,
  subrequestsUsed = 0,
  staleRetry = false,
  bypassRateLimit = false
}) {
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  let subrequests = subrequestsUsed;
  let budgetExceeded = false;
  const spend = (n = 1) => {
    if (subrequests + n > budget) {
      budgetExceeded = true;
      return false;
    }
    subrequests += n;
    return true;
  };

  let cursorMsgId = null;
  if (storedCursor != null && storedCursor !== "") {
    try {
      cursorMsgId = assertFirebaseId(String(storedCursor), "cursor");
    } catch {
      return { ok: false, error: "invalid_cursor", subrequests };
    }
  }

  const cursorActive = await rtdbSpend(
    config,
    token,
    emu,
    ns,
    pathChatMeta(authUid, "erasureCursor"),
    "GET",
    null,
    spend
  );
  const jobStartedRes = await rtdbSpend(
    config,
    token,
    emu,
    ns,
    pathChatMeta(authUid, "erasureJobStartedAt"),
    "GET",
    null,
    spend
  );
  const jobActive = Boolean(cursorActive.json) || Boolean(jobStartedRes.json);

  const lastReq = await rtdbSpend(
    config,
    token,
    emu,
    ns,
    pathChatMeta(authUid, "lastErasureRequestAt"),
    "GET",
    null,
    spend
  );
  const lastAt = typeof lastReq.json === "number" ? lastReq.json : 0;
  if (!jobActive && !bypassRateLimit && !staleRetry && lastAt && now - lastAt < config.erasureMinIntervalMs) {
    return {
      ok: false,
      error: "erasure_rate_limit",
      retryMs: config.erasureMinIntervalMs - (now - lastAt),
      subrequests,
      jobInProgress: Boolean(jobStartedRes.json)
    };
  }

  if (!jobActive) {
    await rtdbSpend(config, token, emu, ns, pathChatMeta(authUid, "erasureJobStartedAt"), "PUT", now, spend);
    await rtdbSpend(config, token, emu, ns, pathChatMeta(authUid, "lastErasureRequestAt"), "PUT", now, spend);
  }

  const cache = await loadSafetyBlockCache(config, token, emu, ns, spend);
  if (budgetExceeded) {
    const cursorToStore = storedCursor || null;
    if (cursorToStore && spend(1)) {
      await rtdbRequest(config, pathChatMeta(authUid, "erasureCursor"), "PUT", String(cursorToStore), token, emu, ns);
    }
    return {
      ok: true,
      complete: false,
      continueScheduled: true,
      subrequests,
      budgetExceeded: true,
      cursor: cursorToStore
    };
  }

  const msgs = await rtdbSpend(config, token, emu, ns, "chat/messages", "GET", null, spend);
  if (msgs.skipped || budgetExceeded) {
    const cursorToStore = storedCursor || null;
    if (cursorToStore && spend(1)) {
      await rtdbRequest(config, pathChatMeta(authUid, "erasureCursor"), "PUT", String(cursorToStore), token, emu, ns);
    }
    return {
      ok: true,
      complete: false,
      continueScheduled: true,
      subrequests,
      budgetExceeded: true,
      cursor: cursorToStore
    };
  }

  const entries = Object.entries(msgs.json || {}).sort(([a], [b]) => a.localeCompare(b));
  let deleted = 0;
  const deferred = [];
  let nextCursor = null;
  let processedAll = true;
  let startIdx = 0;
  if (cursorMsgId) {
    const idx = entries.findIndex(([id]) => id === cursorMsgId);
    if (idx >= 0) startIdx = idx;
  }
  let maxDeletes = config.erasureBatchSize;

  for (let ei = startIdx; ei < entries.length; ei += 1) {
    const [id, m] = entries[ei];
    if (budgetExceeded) {
      nextCursor = nextCursor || id;
      processedAll = false;
      break;
    }
    if (!isOwnMessage(m, sid, authUid)) continue;
    try {
      assertFirebaseId(id);
    } catch {
      continue;
    }

    if (messageBlockedInCache(id, m, cache)) {
      await deferMessageErasure(config, token, emu, ns, id, m, now, config, spend);
      if (budgetExceeded) {
        nextCursor = id;
        processedAll = false;
        break;
      }
      deferred.push(id);
      continue;
    }

    if (deleted >= maxDeletes) {
      nextCursor = id;
      processedAll = false;
      break;
    }

    const cur = await rtdbSpend(config, token, emu, ns, pathChatMessage(id), "GET", null, spend);
    if (cur.skipped) {
      nextCursor = id;
      processedAll = false;
      break;
    }
    if (!cur.json || !isOwnMessage(cur.json, sid, authUid)) continue;

    await rtdbSpend(config, token, emu, ns, pathChatMessage(id), "DELETE", null, spend);
    if (budgetExceeded) {
      nextCursor = id;
      processedAll = false;
      break;
    }
    deleted += 1;
  }

  if (cursorMsgId && startIdx === 0 && entries.findIndex(([id]) => id === cursorMsgId) < 0) {
    await rtdbSpend(config, token, emu, ns, pathChatMeta(authUid, "erasureCursor"), "DELETE", null, spend);
    if (!staleRetry) {
      return runUserErasureBatch({
        config,
        env,
        token,
        authUid,
        sid,
        now,
        storedCursor: null,
        budget,
        subrequestsUsed: subrequests,
        staleRetry: true,
        bypassRateLimit: true
      }).then(retry => ({
        ...retry,
        staleCursorCleared: true
      }));
    }
  }

  const ownStats = await countOwnMessageStats(config, token, emu, ns, sid, authUid, cache, spend);
  const statsKnown = !ownStats.unknown && ownStats.deletable != null && ownStats.allOwn != null;
  const remaining = { count: ownStats.deletable, unknown: ownStats.unknown };
  const allOwn = { count: ownStats.allOwn, unknown: ownStats.unknown };
  const remainingKnown = statsKnown;
  const allOwnKnown = statsKnown;
  const workDone =
    allOwnKnown &&
    remainingKnown &&
    processedAll &&
    !nextCursor &&
    !budgetExceeded;

  if (workDone && deferred.length > 0) {
    return {
      ok: true,
      complete: false,
      completeWithHolds: true,
      status: "complete_with_holds",
      continueScheduled: false,
      deleted,
      erasureDeferred: deferred,
      cursor: null,
      remainingDeletable: 0,
      subrequests,
      budgetExceeded: false
    };
  }

  const logicalComplete =
    workDone &&
    deferred.length === 0 &&
    remaining.count === 0 &&
    allOwn.count === 0;

  if (workDone && deferred.length === 0 && remaining.count === 0 && allOwn.count > 0) {
    return {
      ok: true,
      complete: false,
      completeWithHolds: true,
      status: "complete_with_holds",
      continueScheduled: false,
      deleted,
      erasureDeferred: [],
      cursor: null,
      remainingDeletable: 0,
      subrequests,
      budgetExceeded: false
    };
  }

  let metaCleanupOk = !logicalComplete;
  if (logicalComplete) {
    const openCases = await openCaseMsgIds(config, token, emu, ns, spend);
    const reporterHash = assertReportHash(await anonymizeUid(authUid, env.SAFE_CHAT_HASH_SALT || ""));
    if (!budgetExceeded) {
      await eraseReporterArtifacts(config, token, emu, ns, reporterHash, openCases, spend);
    }
    metaCleanupOk = await deleteErasureMeta(config, token, emu, ns, authUid, spend);
  }

  const complete =
    logicalComplete &&
    metaCleanupOk &&
    !budgetExceeded &&
    allOwnKnown &&
    allOwn.count === 0;

  if (logicalComplete && !metaCleanupOk) {
    let cursorToStore = nextCursor || storedCursor;
    if (cursorToStore && spend(1)) {
      await rtdbRequest(
        config,
        pathChatMeta(authUid, "erasureCursor"),
        "PUT",
        String(cursorToStore),
        token,
        emu,
        ns
      );
    }
    return {
      ok: true,
      complete: false,
      continueScheduled: true,
      deleted,
      erasureDeferred: deferred,
      cursor: cursorToStore || storedCursor,
      remainingDeletable: remainingKnown ? remaining.count : undefined,
      subrequests,
      budgetExceeded
    };
  }

  if (!complete) {
    let cursorToStore = nextCursor || storedCursor;
    if (!cursorToStore) {
      for (const [id, m] of entries) {
        if (!isOwnMessage(m, sid, authUid)) continue;
        try {
          assertFirebaseId(id);
        } catch {
          continue;
        }
        if (messageBlockedInCache(id, m, cache)) continue;
        cursorToStore = id;
        break;
      }
    }
    if (cursorToStore) {
      const cursorStr = String(cursorToStore);
      if (cursorStr.length > config.erasureCursorMaxLen) {
        return { ok: false, error: "invalid_cursor", subrequests };
      }
      if (spend(1)) {
        await rtdbRequest(config, pathChatMeta(authUid, "erasureCursor"), "PUT", cursorStr, token, emu, ns);
      }
      nextCursor = cursorToStore;
    }
  }

  return {
    ok: true,
    complete,
    deleted,
    erasureDeferred: deferred,
    cursor: complete ? null : nextCursor || storedCursor,
    remainingDeletable: remainingKnown ? remaining.count : undefined,
    allOwnRemaining: allOwnKnown ? allOwn.count : undefined,
    subrequests,
    continueScheduled: !complete,
    budgetExceeded,
    staleCursorCleared: staleRetry ? true : undefined
  };
}

export async function continueErasureForUid(env, uid) {
  const { runErasureJobStep, persistJobAfterBatch, loadUserErasureJob } = await import("./erasure-jobs.js");
  const now = Date.now();
  const existing = await loadUserErasureJob(env, uid);
  const batch = await runErasureJobStep(env, uid, { now, bypassRateLimit: true });
  await persistJobAfterBatch(env, uid, batch, existing, now);
  return batch;
}
