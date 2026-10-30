import { assertFirebaseId, assertReportHash } from "./ids.js";
import { anonymizeUid, rtdbPath, rtdbRequest } from "./rtdb.js";

function pathChatMessage(msgId) {
  return rtdbPath("chat", "messages", msgId);
}

function pathChatMeta(uid, ...rest) {
  return rtdbPath("chatMeta", uid, ...rest);
}

function pathPlayer(uid, ...rest) {
  return rtdbPath("players", uid, ...rest);
}

function dayKey(ts) {
  return new Date(ts).toISOString().slice(0, 10);
}

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
  if (queue.json) return true;
  const deferred = await rtdbRequest(
    config,
    rtdbPath("chat", "internal", "erasureDeferred", msgId),
    "GET",
    null,
    token,
    emu,
    ns
  );
  if (deferred.json) return true;
  return false;
}

export async function deferMessageErasure(config, token, emu, ns, msgId, msg, authUid, now) {
  await rtdbRequest(
    config,
    rtdbPath("chat", "internal", "erasureDeferred", msgId),
    "PUT",
    {
      status: "erasure_deferred",
      reason: "safety_hold_or_active_review",
      requestedAt: now,
      requestedByUid: authUid,
      message: msg
    },
    token,
    emu,
    ns
  );
}

export async function eraseReporterArtifacts(config, token, emu, ns, reporterHash, budget) {
  let used = 0;
  const reports = await rtdbRequest(config, "chat/reports", "GET", null, token, emu, ns);
  used += 1;
  if (reports.json && typeof reports.json === "object") {
    for (const [id, r] of Object.entries(reports.json)) {
      if (used >= budget) break;
      if (r?.reporterHash !== reporterHash) continue;
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

export async function runUserErasureBatch({
  config,
  env,
  token,
  authUid,
  sid,
  now,
  cursorMsgId,
  budget
}) {
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  let subrequests = 0;
  const bump = () => {
    subrequests += 1;
  };

  const lastReq = await rtdbRequest(config, pathChatMeta(authUid, "lastErasureRequestAt"), "GET", null, token, emu, ns);
  bump();
  const lastAt = typeof lastReq.json === "number" ? lastReq.json : 0;
  if (lastAt && now - lastAt < config.erasureMinIntervalMs && !cursorMsgId) {
    return { ok: false, error: "erasure_rate_limit", retryMs: config.erasureMinIntervalMs - (now - lastAt) };
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
    if (m?.sid !== sid && m?.uid !== authUid) continue;
    try {
      assertFirebaseId(id);
    } catch {
      continue;
    }
    if (await messageErasureBlocked(config, token, emu, ns, id, m)) {
      await deferMessageErasure(config, token, emu, ns, id, m, authUid, now);
      bump();
      deferred.push(id);
      continue;
    }
    await rtdbRequest(config, pathChatMessage(id), "DELETE", null, token, emu, ns);
    bump();
    deleted += 1;
  }

  const reporterHash = assertReportHash(await anonymizeUid(authUid, env.SAFE_CHAT_HASH_SALT || ""));
  const repBudget = budget - subrequests;
  if (repBudget > 2) {
    const rep = await eraseReporterArtifacts(config, token, emu, ns, reporterHash, repBudget);
    subrequests += rep.used;
  }

  if (processedAll && !nextCursor) {
    await rtdbRequest(config, pathChatMeta(authUid, "blockedSids"), "DELETE", null, token, emu, ns);
    bump();
    await rtdbRequest(config, pathChatMeta(authUid, "chatRegisteredAt"), "DELETE", null, token, emu, ns);
    bump();
    await rtdbRequest(config, pathChatMeta(authUid, "chatAge13DeclaredAt"), "DELETE", null, token, emu, ns);
    bump();
    await rtdbRequest(config, pathChatMeta(authUid, "erasureCursor"), "DELETE", null, token, emu, ns);
    bump();
    await rtdbRequest(config, pathPlayer(authUid, "chatAge13DeclaredAt"), "DELETE", null, token, emu, ns);
    bump();
    await rtdbRequest(config, pathPlayer(authUid, "chatRegisteredAt"), "DELETE", null, token, emu, ns);
    bump();
    await rtdbRequest(config, pathChatMeta(authUid, "lastErasureRequestAt"), "PUT", now, token, emu, ns);
    bump();
  } else {
    await rtdbRequest(config, pathChatMeta(authUid, "erasureCursor"), "PUT", nextCursor || cursorMsgId, token, emu, ns);
    bump();
    if (!cursorMsgId) {
      await rtdbRequest(config, pathChatMeta(authUid, "lastErasureRequestAt"), "PUT", now, token, emu, ns);
      bump();
    }
  }

  return {
    ok: true,
    complete: processedAll && !nextCursor,
    deleted,
    erasureDeferred: deferred,
    cursor: nextCursor,
    subrequests
  };
}
