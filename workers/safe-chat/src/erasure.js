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
  if (msg?.safetyHold) return true;
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
        assertReportHash(reporterHash);
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

async function countDeletableOwn(config, token, emu, ns, sid, authUid, cache, spend) {
  const msgs = await rtdbSpend(config, token, emu, ns, "chat/messages", "GET", null, spend);
  if (msgs.skipped) return { count: 0, subrequests: 0 };
  let n = 0;
  if (msgs.json && typeof msgs.json === "object") {
    for (const [id, m] of Object.entries(msgs.json)) {
      if (!isOwnMessage(m, sid, authUid)) continue;
      try {
        assertFirebaseId(id);
      } catch {
        continue;
      }
      if (messageBlockedInCache(id, m, cache)) continue;
      n += 1;
    }
  }
  return { count: n, subrequests: 0 };
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
  staleRetry = false,
  bypassRateLimit = false
}) {
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  let subrequests = 0;
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
  const jobActive = Boolean(cursorActive.json);

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
      subrequests
    };
  }

  if (!jobActive) {
    await rtdbSpend(config, token, emu, ns, pathChatMeta(authUid, "erasureJobStartedAt"), "PUT", now, spend);
    await rtdbSpend(config, token, emu, ns, pathChatMeta(authUid, "lastErasureRequestAt"), "PUT", now, spend);
  }

  const cache = await loadSafetyBlockCache(config, token, emu, ns, spend);
  if (budgetExceeded) {
    const cursorToStore = storedCursor || null;
    if (cursorToStore) {
      await rtdbSpend(config, token, emu, ns, pathChatMeta(authUid, "erasureCursor"), "PUT", cursorToStore, spend);
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
    if (cursorToStore) {
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
  let skipping = Boolean(cursorMsgId);
  let cursorFound = !cursorMsgId;
  let maxDeletes = config.erasureBatchSize;

  for (const [id, m] of entries) {
    if (budgetExceeded) {
      nextCursor = nextCursor || id;
      processedAll = false;
      break;
    }
    if (skipping) {
      if (id !== cursorMsgId) continue;
      skipping = false;
      cursorFound = true;
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

  if (cursorMsgId && !cursorFound) {
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
        staleRetry: true,
        bypassRateLimit: true
      }).then(retry => ({
        ...retry,
        subrequests: subrequests + (retry.subrequests || 0),
        staleCursorCleared: true
      }));
    }
  }

  const openCases = await openCaseMsgIds(config, token, emu, ns, spend);
  const reporterHash = assertReportHash(await anonymizeUid(authUid, env.SAFE_CHAT_HASH_SALT || ""));
  if (!budgetExceeded) {
    await eraseReporterArtifacts(config, token, emu, ns, reporterHash, openCases, spend);
  }

  const remaining = await countDeletableOwn(config, token, emu, ns, sid, authUid, cache, spend);
  const complete =
    remaining.count === 0 && processedAll && !nextCursor && deferred.length === 0 && !budgetExceeded;

  if (complete && !budgetExceeded) {
    await rtdbSpend(config, token, emu, ns, pathChatMeta(authUid, "blockedSids"), "DELETE", null, spend);
    await rtdbSpend(config, token, emu, ns, pathChatMeta(authUid, "chatRegisteredAt"), "DELETE", null, spend);
    await rtdbSpend(config, token, emu, ns, pathChatMeta(authUid, "chatAge13DeclaredAt"), "DELETE", null, spend);
    await rtdbSpend(config, token, emu, ns, pathChatMeta(authUid, "chatSendCount"), "DELETE", null, spend);
    await rtdbSpend(config, token, emu, ns, pathChatMeta(authUid, "reporterSafetyHidden"), "DELETE", null, spend);
    await rtdbSpend(config, token, emu, ns, pathChatMeta(authUid, "lastErasureRequestAt"), "DELETE", null, spend);
    await rtdbSpend(config, token, emu, ns, pathChatMeta(authUid, "erasureCursor"), "DELETE", null, spend);
    await rtdbSpend(config, token, emu, ns, pathChatMeta(authUid, "erasureJobStartedAt"), "DELETE", null, spend);
  } else if (!complete) {
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
    remainingDeletable: remaining.count,
    subrequests,
    continueScheduled: !complete,
    budgetExceeded,
    staleCursorCleared: staleRetry ? true : undefined
  };
}

export async function continueErasureForUid(env, uid) {
  const config = (await import("./config.js")).loadConfig(env);
  const { getCachedAdminToken } = await import("./admin-token.js");
  const { chatPublicSid } = await import("./rtdb.js");
  const token = await getCachedAdminToken(env);
  assertFirebaseId(uid);
  const sid = await chatPublicSid(uid, env.SAFE_CHAT_HASH_SALT || "");
  const cursorRes = await rtdbRequest(
    config,
    pathChatMeta(uid, "erasureCursor"),
    "GET",
    null,
    token,
    env.FIREBASE_EMULATOR_HOST,
    env.FIREBASE_EMULATOR_NS
  );
  const jobRes = await rtdbRequest(
    config,
    pathChatMeta(uid, "erasureJobStartedAt"),
    "GET",
    null,
    token,
    env.FIREBASE_EMULATOR_HOST,
    env.FIREBASE_EMULATOR_NS
  );
  if (!cursorRes.json && !jobRes.json) return { ok: true, skipped: true };
  return runUserErasureBatch({
    config,
    env,
    token,
    authUid: uid,
    sid,
    now: Date.now(),
    storedCursor: cursorRes.json != null && cursorRes.json !== "" ? cursorRes.json : null,
    budget: config.erasureMaxSubrequests,
    bypassRateLimit: true
  });
}
