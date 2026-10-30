import { loadConfig, REPORT_CATEGORY_CHILD_SAFETY } from "./config.js";
import { verifyRequestAuth, isModerator } from "./auth-prod.js";
import { filterMessage } from "./filter.js";
import { PHRASES, phraseText } from "./phrases.js";
import { anonymizeUid, chatPublicSid, rtdbPath, rtdbRequest } from "./rtdb.js";
import { ChatLimitsDO } from "./limits-do.js";
import { resolveSendLimits } from "./limits-policy.js";
import { assertFirebaseId, assertReportHash } from "./ids.js";
import { loadPlayerProfileForChat } from "./player-profile.js";
import { getCachedAdminToken } from "./admin-token.js";
import { corsHeaders } from "./cors.js";

export { ChatLimitsDO };

function json(request, env, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(request, env) }
  });
}

function err(request, env, code, status = 400) {
  return json(request, env, { ok: false, error: code }, status);
}

export function getNow(env) {
  if (env.SAFE_CHAT_INTEGRATION === "1" && env.SAFE_CHAT_TEST_NOW_MS) {
    const n = parseInt(env.SAFE_CHAT_TEST_NOW_MS, 10);
    if (!Number.isNaN(n)) return n;
  }
  return Date.now();
}

function pathChatMessage(msgId) {
  return `${rtdbPath("chat", "messages", msgId)}`;
}

function pathPlayer(uid, ...rest) {
  return rtdbPath("players", uid, ...rest);
}

function pathChatMeta(uid, ...rest) {
  return rtdbPath("chatMeta", uid, ...rest);
}

function pathModState(uid, ...rest) {
  return rtdbPath("chat", "modState", uid, ...rest);
}

async function limitsStub(env, pathname, body) {
  const id = env.CHAT_LIMITS.idFromName("global");
  const stub = env.CHAT_LIMITS.get(id);
  const res = await stub.fetch(
    new Request(`http://do${pathname}`, {
      method: "POST",
      body: JSON.stringify(body)
    })
  );
  return res.json();
}

async function checkSendLimits(env, uid, limits) {
  return limitsStub(env, "/check", {
    uid,
    now: getNow(env),
    cooldownMs: limits.cooldownMs,
    dailyLimit: limits.dailyLimit
  });
}

async function checkReportLimits(env, uid, config) {
  return limitsStub(env, "/check-report", {
    uid,
    now: getNow(env),
    dailyLimit: config.reportDailyLimit
  });
}

async function fetchModState(config, env, token, uid) {
  assertFirebaseId(uid);
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const ban = await rtdbRequest(config, pathModState(uid, "ban"), "GET", null, token, emu, ns);
  if (ban.json) return { banned: true };
  const mute = await rtdbRequest(config, pathModState(uid, "mute"), "GET", null, token, emu, ns);
  const now = getNow(env);
  if (mute.json?.until && mute.json.until > now) return { muted: true, until: mute.json.until };
  return {};
}

function requireAgeDeclared(profile) {
  return !!profile.chatAge13DeclaredAt;
}

async function handleDeclareAge13(request, env) {
  const config = loadConfig(env);
  let auth;
  try {
    auth = await verifyRequestAuth(request, config, env);
  } catch {
    return err(request, env, "unauthorized", 401);
  }
  assertFirebaseId(auth.uid);
  const token = await getCachedAdminToken(env);
  const profile = await loadPlayerProfileForChat(config, env, token, auth.uid);
  if (profile.chatAge13DeclaredAt) {
    return json(request, env, { ok: true, already: true });
  }
  const body = await request.json().catch(() => ({}));
  if (body.confirmed !== true) return err(request, env, "confirmation_required");
  const now = getNow(env);
  await rtdbRequest(
    config,
    pathChatMeta(auth.uid, "chatAge13DeclaredAt"),
    "PUT",
    now,
    token,
    env.FIREBASE_EMULATOR_HOST,
    env.FIREBASE_EMULATOR_NS
  );
  return json(request, env, { ok: true, declaredAt: now });
}

async function ensureRateLimitLevel(config, env, token, uid, rawPlayerLevel) {
  if (typeof rawPlayerLevel !== "number") return null;
  const path = pathChatMeta(uid, "rateLimitLevel");
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const cur = await rtdbRequest(config, path, "GET", null, token, emu, ns);
  if (typeof cur.json === "number") return cur.json;
  const snap = Math.min(rawPlayerLevel, 9999);
  await rtdbRequest(config, path, "PUT", snap, token, emu, ns);
  return snap;
}

async function handleSend(request, env) {
  const config = loadConfig(env);
  let auth;
  try {
    auth = await verifyRequestAuth(request, config, env);
  } catch {
    return err(request, env, "unauthorized", 401);
  }
  assertFirebaseId(auth.uid);
  const body = await request.json().catch(() => ({}));
  const phraseId = body.phraseId != null ? String(body.phraseId) : null;
  const freeText = body.text != null ? String(body.text).trim() : "";

  const token = await getCachedAdminToken(env);
  let profile;
  try {
    profile = await loadPlayerProfileForChat(config, env, token, auth.uid);
  } catch (e) {
    if (e.message === "impersonation_name" || e.message === "bad_display_name") {
      return err(request, env, e.message === "bad_display_name" ? "bad_display_name" : "impersonation_name");
    }
    throw e;
  }
  if (!requireAgeDeclared(profile)) {
    return err(request, env, "age_not_declared", 403);
  }

  const mod = await fetchModState(config, env, token, auth.uid);
  if (mod.banned) return err(request, env, "banned", 403);
  if (mod.muted) return err(request, env, "muted", 403);

  let text = "";
  const lang = typeof body.lang === "string" ? body.lang.slice(0, 8) : "en";

  if (!config.freeTextEnabled) {
    if (freeText) return err(request, env, "free_text_disabled");
    if (!phraseId || !/^[a-z0-9_]{1,32}$/.test(phraseId)) return err(request, env, "invalid_phrase");
    const pt = phraseText(phraseId, lang);
    if (!pt) return err(request, env, "invalid_phrase");
    text = pt;
  } else {
    if (phraseId) {
      const pt = phraseText(phraseId, lang);
      if (!pt) return err(request, env, "invalid_phrase");
      text = pt;
    } else {
      const reg = profile.chatRegisteredAt ?? (await ensureRegisteredAt(config, env, token, auth.uid));
      if (getNow(env) - reg < config.newbieMs) return err(request, env, "newbie_phrases_only");
      const filtered = filterMessage(freeText, config.msgMaxLen);
      if (!filtered.ok) return err(request, env, filtered.reason);
      text = filtered.text;
    }
  }

  const now = getNow(env);
  const accountAgeMs = profile.chatRegisteredAt ? now - profile.chatRegisteredAt : config.youngAccountMs + 1;
  const limitLevel = await ensureRateLimitLevel(config, env, token, auth.uid, profile.rawPlayerLevel);
  const sendLimits = resolveSendLimits(config, {
    accountAgeMs,
    playerLevel: limitLevel ?? profile.level
  });
  const limits = await checkSendLimits(env, auth.uid, sendLimits);
  if (!limits.ok) return err(request, env, limits.reason, 429);

  const salt = env.SAFE_CHAT_HASH_SALT || "";
  const sid = await chatPublicSid(auth.uid, salt);
  const msg = {
    sid,
    name: profile.name,
    text,
    time: now,
    phraseId: phraseId || null
  };
  if (profile.loc) msg.loc = profile.loc;

  const push = await rtdbRequest(
    config,
    "chat/messages",
    "POST",
    msg,
    token,
    env.FIREBASE_EMULATOR_HOST,
    env.FIREBASE_EMULATOR_NS
  );
  if (!push.ok) return err(request, env, "rtdb_write_failed", 502);
  return json(request, env, { ok: true, id: push.json?.name || push.json });
}

async function ensureRegisteredAt(config, env, token, uid) {
  const path = pathChatMeta(uid, "chatRegisteredAt");
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const cur = await rtdbRequest(config, path, "GET", null, token, emu, ns);
  if (typeof cur.json === "number") return cur.json;
  const now = getNow(env);
  await rtdbRequest(config, path, "PUT", now, token, emu, ns);
  return now;
}

async function handleReport(request, env) {
  const config = loadConfig(env);
  let auth;
  try {
    auth = await verifyRequestAuth(request, config, env);
  } catch {
    return err(request, env, "unauthorized", 401);
  }
  assertFirebaseId(auth.uid);
  const body = await request.json().catch(() => ({}));
  let msgId;
  try {
    msgId = assertFirebaseId(body.msgId, "msgId");
  } catch {
    return err(request, env, "invalid_id");
  }
  const reportCategory = body.category ? String(body.category).slice(0, 32) : "generic";
  const isChildSafety = reportCategory === REPORT_CATEGORY_CHILD_SAFETY;

  const token = await getCachedAdminToken(env);
  let profile;
  try {
    profile = await loadPlayerProfileForChat(config, env, token, auth.uid);
  } catch (e) {
    if (e.message === "impersonation_name" || e.message === "bad_display_name") {
      return err(request, env, e.message === "bad_display_name" ? "bad_display_name" : "impersonation_name");
    }
    throw e;
  }
  if (!requireAgeDeclared(profile)) {
    return err(request, env, "age_not_declared", 403);
  }

  const repLimits = await checkReportLimits(env, auth.uid, config);
  if (!repLimits.ok) return err(request, env, repLimits.reason, 429);

  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;

  const msgRes = await rtdbRequest(config, pathChatMessage(msgId), "GET", null, token, emu, ns);
  if (!msgRes.json) return err(request, env, "message_not_found", 404);

  const salt = env.SAFE_CHAT_HASH_SALT || "";
  const reporter = assertReportHash(await anonymizeUid(auth.uid, salt));
  const dedupPath = rtdbPath("chat", "internal", "reportDedup", msgId, reporter);
  const existing = await rtdbRequest(config, dedupPath, "GET", null, token, emu, ns);
  if (existing.json) {
    return json(request, env, { ok: true, duplicate: true });
  }

  const report = {
    msgId,
    time: getNow(env),
    reporterHash: reporter,
    msgUidHash: assertReportHash(msgRes.json.sid || msgRes.json.uid || ""),
    category: reportCategory,
    priority: isChildSafety ? "high" : "normal"
  };
  await rtdbRequest(config, "chat/reports", "POST", report, token, emu, ns);
  await rtdbRequest(config, dedupPath, "PUT", true, token, emu, ns);

  if (isChildSafety) {
    await rtdbRequest(config, `${pathChatMessage(msgId)}/hidden`, "PUT", true, token, emu, ns);
    await rtdbRequest(config, `${pathChatMessage(msgId)}/safetyHold`, "PUT", true, token, emu, ns);
    await rtdbRequest(
      config,
      rtdbPath("chat", "internal", "safetyHolds", msgId),
      "PUT",
      { at: getNow(env), category: REPORT_CATEGORY_CHILD_SAFETY },
      token,
      emu,
      ns
    );
    return json(request, env, { ok: true, safetyHold: true });
  }

  const countPath = rtdbPath("chat", "internal", "reportCounts", msgId);
  const countRes = await rtdbRequest(config, countPath, "GET", null, token, emu, ns);
  const prev = typeof countRes.json === "number" ? countRes.json : 0;
  const next = prev + 1;
  await rtdbRequest(config, countPath, "PUT", next, token, emu, ns);

  if (next >= config.reportAutoHide) {
    await rtdbRequest(config, `${pathChatMessage(msgId)}/hidden`, "PUT", true, token, emu, ns);
  }
  return json(request, env, { ok: true });
}

async function handleBlock(request, env) {
  const config = loadConfig(env);
  let auth;
  try {
    auth = await verifyRequestAuth(request, config, env);
  } catch {
    return err(request, env, "unauthorized", 401);
  }
  assertFirebaseId(auth.uid);
  const body = await request.json().catch(() => ({}));
  const token = await getCachedAdminToken(env);
  const mySid = await chatPublicSid(auth.uid, env.SAFE_CHAT_HASH_SALT || "");
  let targetSid = body.sid ? String(body.sid).slice(0, 32) : null;
  if (body.msgId) {
    let msgId;
    try {
      msgId = assertFirebaseId(body.msgId, "msgId");
    } catch {
      return err(request, env, "invalid_id");
    }
    const msgRes = await rtdbRequest(
      config,
      pathChatMessage(msgId),
      "GET",
      null,
      token,
      env.FIREBASE_EMULATOR_HOST,
      env.FIREBASE_EMULATOR_NS
    );
    targetSid = msgRes.json?.sid || null;
  }
  if (!targetSid || !/^[a-f0-9]{32}$/.test(targetSid)) return err(request, env, "invalid_sid");
  if (targetSid === mySid) return err(request, env, "cannot_block_self");
  await rtdbRequest(
    config,
    pathChatMeta(auth.uid, "blockedSids", targetSid),
    "PUT",
    true,
    token,
    env.FIREBASE_EMULATOR_HOST,
    env.FIREBASE_EMULATOR_NS
  );
  return json(request, env, { ok: true, sid: targetSid });
}

async function handleUnblock(request, env) {
  const config = loadConfig(env);
  let auth;
  try {
    auth = await verifyRequestAuth(request, config, env);
  } catch {
    return err(request, env, "unauthorized", 401);
  }
  assertFirebaseId(auth.uid);
  const body = await request.json().catch(() => ({}));
  const targetSid = body.sid ? String(body.sid).slice(0, 32) : null;
  if (!targetSid || !/^[a-f0-9]{32}$/.test(targetSid)) return err(request, env, "invalid_sid");
  const token = await getCachedAdminToken(env);
  await rtdbRequest(
    config,
    pathChatMeta(auth.uid, "blockedSids", targetSid),
    "DELETE",
    null,
    token,
    env.FIREBASE_EMULATOR_HOST,
    env.FIREBASE_EMULATOR_NS
  );
  return json(request, env, { ok: true });
}

async function handleDeleteMyData(request, env) {
  const config = loadConfig(env);
  let auth;
  try {
    auth = await verifyRequestAuth(request, config, env);
  } catch {
    return err(request, env, "unauthorized", 401);
  }
  assertFirebaseId(auth.uid);
  const token = await getCachedAdminToken(env);
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const sid = await chatPublicSid(auth.uid, env.SAFE_CHAT_HASH_SALT || "");

  const msgs = await rtdbRequest(config, "chat/messages", "GET", null, token, emu, ns);
  if (msgs.json && typeof msgs.json === "object") {
    for (const [id, m] of Object.entries(msgs.json)) {
      if (m?.sid !== sid && m?.uid !== auth.uid) continue;
      try {
        assertFirebaseId(id);
      } catch {
        continue;
      }
      await rtdbRequest(config, pathChatMessage(id), "DELETE", null, token, emu, ns);
    }
  }

  await rtdbRequest(config, pathChatMeta(auth.uid), "DELETE", null, token, emu, ns);
  await rtdbRequest(config, pathPlayer(auth.uid, "chatAge13DeclaredAt"), "DELETE", null, token, emu, ns);
  await rtdbRequest(config, pathPlayer(auth.uid, "chatRegisteredAt"), "DELETE", null, token, emu, ns);

  return json(request, env, { ok: true });
}

async function handleConfig(request, env) {
  const config = loadConfig(env);
  const base = {
    ok: true,
    freeTextEnabled: config.freeTextEnabled,
    phrases: PHRASES.map(p => ({ id: p.id, text: p })),
    maxLen: config.msgMaxLen,
    cooldownMs: config.cooldownMs
  };
  const authHeader = request.headers.get("Authorization") || "";
  if (!/^Bearer\s+/i.test(authHeader)) {
    return json(request, env, base);
  }
  try {
    const auth = await verifyRequestAuth(request, config, env);
    assertFirebaseId(auth.uid);
    const token = await getCachedAdminToken(env);
    const profile = await loadPlayerProfileForChat(config, env, token, auth.uid);
    const salt = env.SAFE_CHAT_HASH_SALT || "";
    base.mySid = await chatPublicSid(auth.uid, salt);
    base.blockedSids = Object.entries(profile.blockedSids || {})
      .filter(([, v]) => v)
      .map(([k]) => k);
  } catch (_) {
    /* public portion still returned */
  }
  return json(request, env, base);
}

async function requireMod(request, env) {
  const config = loadConfig(env);
  const auth = await verifyRequestAuth(request, config, env);
  assertFirebaseId(auth.uid);
  if (!isModerator(auth.uid, env, auth.claims)) throw new Error("forbidden");
  return { config, auth, token: await getCachedAdminToken(env) };
}

async function handleModReports(request, env) {
  try {
    const { config, token } = await requireMod(request, env);
    const res = await rtdbRequest(
      config,
      "chat/reports",
      "GET",
      null,
      token,
      env.FIREBASE_EMULATOR_HOST,
      env.FIREBASE_EMULATOR_NS
    );
    const entries = Object.entries(res.json || {}).map(([id, r]) => ({ id, ...r }));
    entries.sort((a, b) => {
      const pa = a.priority === "high" ? 0 : 1;
      const pb = b.priority === "high" ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return (b.time || 0) - (a.time || 0);
    });
    return json(request, env, { ok: true, reports: entries });
  } catch (e) {
    return err(
      request,
      env,
      e.message === "forbidden" ? "forbidden" : "unauthorized",
      e.message === "forbidden" ? 403 : 401
    );
  }
}

async function handleModDelete(request, env) {
  try {
    const { config, token } = await requireMod(request, env);
    const body = await request.json().catch(() => ({}));
    let msgId;
    try {
      msgId = assertFirebaseId(body.msgId, "msgId");
    } catch {
      return err(request, env, "invalid_id");
    }
    await rtdbRequest(
      config,
      pathChatMessage(msgId),
      "DELETE",
      null,
      token,
      env.FIREBASE_EMULATOR_HOST,
      env.FIREBASE_EMULATOR_NS
    );
    return json(request, env, { ok: true });
  } catch (e) {
    return err(
      request,
      env,
      e.message === "forbidden" ? "forbidden" : "unauthorized",
      e.message === "forbidden" ? 403 : 401
    );
  }
}

async function handleModMute(request, env) {
  try {
    const { config, token } = await requireMod(request, env);
    const body = await request.json().catch(() => ({}));
    let uid;
    try {
      uid = assertFirebaseId(body.uid, "uid");
    } catch {
      return err(request, env, "invalid_id");
    }
    const durationMs = body.durationMs;
    if (durationMs === 0 || durationMs === null) {
      await rtdbRequest(
        config,
        pathModState(uid, "mute"),
        "DELETE",
        null,
        token,
        env.FIREBASE_EMULATOR_HOST,
        env.FIREBASE_EMULATOR_NS
      );
    } else {
      const d = Number(durationMs);
      const maxMs = 30 * 24 * 60 * 60 * 1000;
      if (!Number.isFinite(d) || d < 60_000 || d > maxMs) {
        return err(request, env, "invalid_mute_duration");
      }
      const until = getNow(env) + d;
      await rtdbRequest(
        config,
        pathModState(uid, "mute"),
        "PUT",
        { until },
        token,
        env.FIREBASE_EMULATOR_HOST,
        env.FIREBASE_EMULATOR_NS
      );
    }
    return json(request, env, { ok: true });
  } catch (e) {
    return err(
      request,
      env,
      e.message === "forbidden" ? "forbidden" : "unauthorized",
      e.message === "forbidden" ? 403 : 401
    );
  }
}

async function handleModBan(request, env) {
  try {
    const { config, token } = await requireMod(request, env);
    const body = await request.json().catch(() => ({}));
    let uid;
    try {
      uid = assertFirebaseId(body.uid, "uid");
    } catch {
      return err(request, env, "invalid_id");
    }
    if (body.lift) {
      await rtdbRequest(
        config,
        pathModState(uid, "ban"),
        "DELETE",
        null,
        token,
        env.FIREBASE_EMULATOR_HOST,
        env.FIREBASE_EMULATOR_NS
      );
    } else {
      await rtdbRequest(
        config,
        pathModState(uid, "ban"),
        "PUT",
        { at: getNow(env) },
        token,
        env.FIREBASE_EMULATOR_HOST,
        env.FIREBASE_EMULATOR_NS
      );
    }
    return json(request, env, { ok: true });
  } catch (e) {
    return err(
      request,
      env,
      e.message === "forbidden" ? "forbidden" : "unauthorized",
      e.message === "forbidden" ? 403 : 401
    );
  }
}

async function handleModResolveSafety(request, env) {
  try {
    const { config, token } = await requireMod(request, env);
    const body = await request.json().catch(() => ({}));
    let msgId;
    try {
      msgId = assertFirebaseId(body.msgId, "msgId");
    } catch {
      return err(request, env, "invalid_id");
    }
    const emu = env.FIREBASE_EMULATOR_HOST;
    const ns = env.FIREBASE_EMULATOR_NS;
    await rtdbRequest(config, `${pathChatMessage(msgId)}/safetyHold`, "DELETE", null, token, emu, ns);
    await rtdbRequest(config, rtdbPath("chat", "internal", "safetyHolds", msgId), "DELETE", null, token, emu, ns);
    if (body.action === "uphold_delete") {
      await rtdbRequest(config, pathChatMessage(msgId), "DELETE", null, token, emu, ns);
    } else if (body.action === "dismiss") {
      await rtdbRequest(config, `${pathChatMessage(msgId)}/hidden`, "DELETE", null, token, emu, ns);
    }
    return json(request, env, { ok: true });
  } catch (e) {
    return err(
      request,
      env,
      e.message === "forbidden" ? "forbidden" : "unauthorized",
      e.message === "forbidden" ? 403 : 401
    );
  }
}

export async function runRetentionJob(env, nowOverride) {
  const config = loadConfig(env);
  const token = await getCachedAdminToken(env);
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const now = nowOverride ?? getNow(env);
  let subrequests = 0;
  const budget = config.retentionBatchSize;

  const bump = () => {
    subrequests += 1;
    if (subrequests >= budget) throw new Error("retention_budget");
  };

  try {
    await limitsStub(env, "/prune", { now, maxAgeMs: config.limitsRetentionMs });
  } catch (_) {}

  const msgs = await rtdbRequest(config, "chat/messages", "GET", null, token, emu, ns);
  bump();
  if (msgs.json && typeof msgs.json === "object") {
    for (const [id, m] of Object.entries(msgs.json)) {
      if (subrequests >= budget) break;
      if (m?.safetyHold) continue;
      try {
        assertFirebaseId(id);
      } catch {
        continue;
      }
      if (m?.time && now - m.time > config.msgRetentionMs) {
        await rtdbRequest(config, pathChatMessage(id), "DELETE", null, token, emu, ns);
        bump();
      }
    }
  }

  const holds = await rtdbRequest(config, "chat/internal/safetyHolds", "GET", null, token, emu, ns);
  bump();
  const heldMsgIds = new Set(Object.keys(holds.json || {}));

  const reports = await rtdbRequest(config, "chat/reports", "GET", null, token, emu, ns);
  bump();
  if (reports.json && typeof reports.json === "object") {
    for (const [id, r] of Object.entries(reports.json)) {
      if (subrequests >= budget) break;
      if (heldMsgIds.has(r?.msgId)) continue;
      if (r?.time && now - r.time > config.reportRetentionMs) {
        try {
          assertFirebaseId(id);
        } catch {
          continue;
        }
        await rtdbRequest(config, rtdbPath("chat", "reports", id), "DELETE", null, token, emu, ns);
        bump();
      }
    }
  }

  const activeReportMsgIds = new Set();
  const reportsAfter = await rtdbRequest(config, "chat/reports", "GET", null, token, emu, ns);
  bump();
  if (reportsAfter.json && typeof reportsAfter.json === "object") {
    for (const r of Object.values(reportsAfter.json)) {
      if (r?.msgId) activeReportMsgIds.add(r.msgId);
    }
  }

  const dedupRoot = await rtdbRequest(config, "chat/internal/reportDedup", "GET", null, token, emu, ns);
  bump();
  if (dedupRoot.json && typeof dedupRoot.json === "object") {
    for (const msgId of Object.keys(dedupRoot.json)) {
      if (subrequests >= budget) break;
      if (heldMsgIds.has(msgId)) continue;
      if (activeReportMsgIds.has(msgId)) continue;
      try {
        assertFirebaseId(msgId);
      } catch {
        continue;
      }
      await rtdbRequest(config, rtdbPath("chat", "internal", "reportDedup", msgId), "DELETE", null, token, emu, ns);
      bump();
      await rtdbRequest(config, rtdbPath("chat", "internal", "reportCounts", msgId), "DELETE", null, token, emu, ns);
      bump();
    }
  }

  const modState = await rtdbRequest(config, "chat/modState", "GET", null, token, emu, ns);
  bump();
  if (modState.json && typeof modState.json === "object") {
    for (const [uid, state] of Object.entries(modState.json)) {
      if (subrequests >= budget) break;
      try {
        assertFirebaseId(uid);
      } catch {
        continue;
      }
      const muteUntil = state?.mute?.until;
      const banAt = state?.ban?.at;
      if (muteUntil && now > muteUntil && now - muteUntil > config.modStateRetentionMs) {
        await rtdbRequest(config, pathModState(uid, "mute"), "DELETE", null, token, emu, ns);
        bump();
      }
      if (banAt && now - banAt > config.modStateRetentionMs) {
        await rtdbRequest(config, pathModState(uid), "DELETE", null, token, emu, ns);
        bump();
      }
    }
  }

  return { subrequests, budgetExceeded: subrequests >= budget };
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(request, env) });
    }
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/chat/config" && request.method === "GET") return handleConfig(request, env);
      if (url.pathname === "/api/chat/declare-age13" && request.method === "POST")
        return handleDeclareAge13(request, env);
      if (url.pathname === "/api/chat/send" && request.method === "POST") return handleSend(request, env);
      if (url.pathname === "/api/chat/report" && request.method === "POST") return handleReport(request, env);
      if (url.pathname === "/api/chat/block" && request.method === "POST") return handleBlock(request, env);
      if (url.pathname === "/api/chat/unblock" && request.method === "POST") return handleUnblock(request, env);
      if (url.pathname === "/api/chat/delete-my-data" && request.method === "POST")
        return handleDeleteMyData(request, env);
      if (url.pathname === "/api/mod/reports" && request.method === "GET") return handleModReports(request, env);
      if (url.pathname === "/api/mod/delete" && request.method === "POST") return handleModDelete(request, env);
      if (url.pathname === "/api/mod/mute" && request.method === "POST") return handleModMute(request, env);
      if (url.pathname === "/api/mod/ban" && request.method === "POST") return handleModBan(request, env);
      if (url.pathname === "/api/mod/resolve-safety" && request.method === "POST")
        return handleModResolveSafety(request, env);
      return err(request, env, "not_found", 404);
    } catch (e) {
      if (e.message === "invalid_id" || e.message === "invalid_rtdb_path") {
        return err(request, env, "invalid_id");
      }
      return err(request, env, "server_error", 500);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runRetentionJob(env));
  }
};
