import { assertFirebaseId, assertReportHash } from "./ids.js";
import { anonymizeUid, rtdbPath, rtdbRequest } from "./rtdb.js";

function pathChatMessage(msgId) {
  return rtdbPath("chat", "messages", msgId);
}

function pathChatMeta(uid, ...rest) {
  return rtdbPath("chatMeta", uid, ...rest);
}

function dayKey(ts) {
  return new Date(ts).toISOString().slice(0, 10);
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

/** Moderator-confirmed holds defer erasure. Child-harm queue/evidence also blocks author erasure until mod resolves. */
export async function messageErasureBlocked(config, token, emu, ns, msgId, msg) {
  if (msg?.safetyHold) return true;
  const hold = await rtdbRequest(
    config,
    rtdbPath("chat", "internal", "safetyHolds", msgId),
    "GET",
    null,
    token,
    emu,
    ns
  );
  if (hold.json) return true;
  const queue = await rtdbRequest(
    config,
    rtdbPath("chat", "internal", "safetyQueue", msgId),
    "GET",
    null,
    token,
    emu,
    ns
  );
  if (queue.json?.childHarm) return true;
  const evidence = await rtdbRequest(
    config,
    rtdbPath("chat", "internal", "safetyEvidence", msgId),
    "GET",
    null,
    token,
    emu,
    ns
  );
  if (evidence.json) return true;
  const deferred = await rtdbRequest(
    config,
    rtdbPath("chat", "internal", "erasureDeferred", msgId),
    "GET",
    null,
    token,
    emu,
    ns
  );
  if (deferred.json?.status === "erasure_deferred") return true;
  return false;
}

export async function deferMessageErasure(config, token, emu, ns, msgId, msg, now, configObj) {
  await rtdbRequest(
    config,
    rtdbPath("chat", "internal", "erasureDeferred", msgId),
    "PUT",
    {
      status: "erasure_deferred",
      reason: "safety_hold",
      requestedAt: now,
      expiresAt: now + configObj.erasureDeferredTtlMs,
      snapshot: minimizedSnapshot(msg)
    },
    token,
    emu,
    ns
  );
}

async function openCaseMsgIds(config, token, emu, ns) {
  const ids = new Set();
  const queue = await rtdbRequest(config, "chat/internal/safetyQueue", "GET", null, token, emu, ns);
  if (queue.json) Object.keys(queue.json).forEach(k => ids.add(k));
  const holds = await rtdbRequest(config, "chat/internal/safetyHolds", "GET", null, token, emu, ns);
  if (holds.json) Object.keys(holds.json).forEach(k => ids.add(k));
  const reports = await rtdbRequest(config, "chat/reports", "GET", null, token, emu, ns);
  if (reports.json) {
    for (const r of Object.values(reports.json)) {
      if (r?.msgId) ids.add(r.msgId);
    }
  }
  return ids;
}

export async function eraseReporterArtifacts(config, token, emu, ns, reporterHash, budget, openCases) {
  let used = 0;
  const reports = await rtdbRequest(config, "chat/reports", "GET", null, token, emu, ns);
  used += 1;
  if (reports.json && typeof reports.json === "object") {
    for (const [id, r] of Object.entries(reports.json)) {
      if (used >= budget) break;
      if (r?.reporterHash !== reporterHash) continue;
      if (openCases.has(r?.msgId)) continue;
      try {
        assertFirebaseId(id);
      } catch {
        continue;
      }
      await rtdbRequest(config, rtdbPath("chat", "reports", id), "DELETE", null, token, emu, ns);
      used += 1;
    }
  }
  const dedupRoot = await rtdbRequest(config, "chat/internal/reportDedup", "GET", null, token, emu, ns);
  used += 1;
  if (dedupRoot.json && typeof dedupRoot.json === "object") {
    for (const [msgId, reporters] of Object.entries(dedupRoot.json)) {
      if (used >= budget) break;
      if (openCases.has(msgId)) continue;
      if (!reporters || typeof reporters !== "object") continue;
      if (!reporters[reporterHash]) continue;
      try {
        assertFirebaseId(msgId);
        assertReportHash(reporterHash);
      } catch {
        continue;
      }
      await rtdbRequest(
        config,
        rtdbPath("chat", "internal", "reportDedup", msgId, reporterHash),
        "DELETE",
        null,
        token,
        emu,
        ns
      );
      used += 1;
    }
  }
  return { used };
}

async function countDeletableOwn(config, token, emu, ns, sid, authUid) {
  const msgs = await rtdbRequest(config, "chat/messages", "GET", null, token, emu, ns);
  let n = 0;
  if (msgs.json && typeof msgs.json === "object") {
    for (const [id, m] of Object.entries(msgs.json)) {
      if (!isOwnMessage(m, sid, authUid)) continue;
      try {
        assertFirebaseId(id);
      } catch {
        continue;
      }
      if (await messageErasureBlocked(config, token, emu, ns, id, m)) continue;
      n += 1;
    }
  }
  return { count: n, subrequests: 1 };
}

export async function runUserErasureBatch({
  config,
  env,
  token,
  authUid,
  sid,
  now,
  storedCursor,
  budget
}) {
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  let subrequests = 0;
  const bump = (n = 1) => {
    subrequests += n;
  };

  let cursorMsgId = null;
  if (storedCursor != null && storedCursor !== "") {
    try {
      cursorMsgId = assertFirebaseId(String(storedCursor), "cursor");
    } catch {
      return { ok: false, error: "invalid_cursor" };
    }
  }

  const cursorActive = await rtdbRequest(config, pathChatMeta(authUid, "erasureCursor"), "GET", null, token, emu, ns);
  bump();
  const jobActive = Boolean(cursorActive.json);

  const lastReq = await rtdbRequest(config, pathChatMeta(authUid, "lastErasureRequestAt"), "GET", null, token, emu, ns);
  bump();
  const lastAt = typeof lastReq.json === "number" ? lastReq.json : 0;
  if (!jobActive && lastAt && now - lastAt < config.erasureMinIntervalMs) {
    return { ok: false, error: "erasure_rate_limit", retryMs: config.erasureMinIntervalMs - (now - lastAt) };
  }

  if (!jobActive) {
    await rtdbRequest(config, pathChatMeta(authUid, "erasureJobStartedAt"), "PUT", now, token, emu, ns);
    bump();
    await rtdbRequest(config, pathChatMeta(authUid, "lastErasureRequestAt"), "PUT", now, token, emu, ns);
    bump();
  }

  const msgs = await rtdbRequest(config, "chat/messages", "GET", null, token, emu, ns);
  bump();
  const entries = Object.entries(msgs.json || {}).sort(([a], [b]) => a.localeCompare(b));
  let deleted = 0;
  const deferred = [];
  let nextCursor = null;
  let processedAll = true;
  let skipping = Boolean(cursorMsgId);

  for (const [id, m] of entries) {
    if (skipping) {
      if (id !== cursorMsgId) continue;
      skipping = false;
    }
    if (subrequests >= budget) {
      nextCursor = id;
      processedAll = false;
      break;
    }
    if (!isOwnMessage(m, sid, authUid)) continue;
    try {
      assertFirebaseId(id);
    } catch {
      continue;
    }

    const blocked = await messageErasureBlocked(config, token, emu, ns, id, m);
    bump(3);
    if (subrequests >= budget) {
      nextCursor = id;
      processedAll = false;
      break;
    }
    if (blocked) {
      await deferMessageErasure(config, token, emu, ns, id, m, now, config);
      bump();
      deferred.push(id);
      continue;
    }

    const cur = await rtdbRequest(config, pathChatMessage(id), "GET", null, token, emu, ns);
    bump();
    if (!cur.json || !isOwnMessage(cur.json, sid, authUid)) continue;
    if (await messageErasureBlocked(config, token, emu, ns, id, cur.json)) {
      await deferMessageErasure(config, token, emu, ns, id, cur.json, now, config);
      bump();
      deferred.push(id);
      continue;
    }
    await rtdbRequest(config, pathChatMessage(id), "DELETE", null, token, emu, ns);
    bump();
    deleted += 1;
  }

  const openCases = await openCaseMsgIds(config, token, emu, ns);
  bump(3);
  const reporterHash = assertReportHash(await anonymizeUid(authUid, env.SAFE_CHAT_HASH_SALT || ""));
  const repBudget = Math.max(0, budget - subrequests);
  if (repBudget > 2) {
    const rep = await eraseReporterArtifacts(config, token, emu, ns, reporterHash, repBudget, openCases);
    subrequests += rep.used;
  }

  const remaining = await countDeletableOwn(config, token, emu, ns, sid, authUid);
  subrequests += remaining.subrequests;
  const complete = remaining.count === 0 && processedAll && !nextCursor && deferred.length === 0;

  if (complete) {
    await rtdbRequest(config, pathChatMeta(authUid, "blockedSids"), "DELETE", null, token, emu, ns);
    bump();
    await rtdbRequest(config, pathChatMeta(authUid, "chatRegisteredAt"), "DELETE", null, token, emu, ns);
    bump();
    await rtdbRequest(config, pathChatMeta(authUid, "chatAge13DeclaredAt"), "DELETE", null, token, emu, ns);
    bump();
    await rtdbRequest(config, pathChatMeta(authUid, "chatSendCount"), "DELETE", null, token, emu, ns);
    bump();
    await rtdbRequest(config, pathChatMeta(authUid, "erasureCursor"), "DELETE", null, token, emu, ns);
    bump();
    await rtdbRequest(config, pathChatMeta(authUid, "erasureJobStartedAt"), "DELETE", null, token, emu, ns);
    bump();
  } else if (nextCursor) {
    const cursorStr = String(nextCursor);
    if (cursorStr.length > config.erasureCursorMaxLen) {
      return { ok: false, error: "invalid_cursor" };
    }
    await rtdbRequest(config, pathChatMeta(authUid, "erasureCursor"), "PUT", cursorStr, token, emu, ns);
    bump();
  }

  return {
    ok: true,
    complete,
    deleted,
    erasureDeferred: deferred,
    cursor: complete ? null : nextCursor,
    remainingDeletable: remaining.count,
    subrequests,
    continueScheduled: !complete
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
  if (!cursorRes.json) return { ok: true, skipped: true };
  return runUserErasureBatch({
    config,
    env,
    token,
    authUid: uid,
    sid,
    now: Date.now(),
    storedCursor: cursorRes.json,
    budget: config.erasureMaxSubrequests
  });
}
