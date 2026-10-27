import { loadConfig } from "./config.js";
import { verifyRequestAuth, isModerator } from "./auth.js";
import { filterMessage } from "./filter.js";
import { PHRASES, phraseText } from "./phrases.js";
import { anonymizeUid, getServiceAccountAccessToken, rtdbRequest } from "./rtdb.js";
import { ChatLimitsDO } from "./limits-do.js";

export { ChatLimitsDO };

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...CORS } });
}

function err(code, status = 400) {
  return json({ ok: false, error: code }, status);
}

export function getNow(env) {
  if (env.SAFE_CHAT_TEST_MODE === "true" && env.SAFE_CHAT_TEST_NOW_MS) {
    const n = parseInt(env.SAFE_CHAT_TEST_NOW_MS, 10);
    if (!Number.isNaN(n)) return n;
  }
  return Date.now();
}

async function getAdminToken(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    if (env.SAFE_CHAT_EMULATOR === "true") return "owner";
    throw new Error("missing FIREBASE_SERVICE_ACCOUNT_JSON");
  }
  return getServiceAccountAccessToken(env.FIREBASE_SERVICE_ACCOUNT_JSON);
}

async function checkLimits(env, uid, config) {
  const id = env.CHAT_LIMITS.idFromName("global");
  const stub = env.CHAT_LIMITS.get(id);
  const res = await stub.fetch(
    new Request("http://do/check", {
      method: "POST",
      body: JSON.stringify({
        uid,
        now: getNow(env),
        cooldownMs: config.cooldownMs,
        dailyLimit: config.dailyLimit
      })
    })
  );
  return res.json();
}

async function fetchModState(config, env, token, uid) {
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const ban = await rtdbRequest(config, `chat/modState/${uid}/ban`, "GET", null, token, emu, ns);
  if (ban.json) return { banned: true };
  const mute = await rtdbRequest(config, `chat/modState/${uid}/mute`, "GET", null, token, emu, ns);
  const now = getNow(env);
  if (mute.json?.until && mute.json.until > now) return { muted: true, until: mute.json.until };
  return {};
}

async function handleSend(request, env) {
  const config = loadConfig(env);
  let auth;
  try {
    auth = await verifyRequestAuth(request, config, env);
  } catch {
    return err("unauthorized", 401);
  }
  const body = await request.json().catch(() => ({}));
  const phraseId = body.phraseId || null;
  const freeText = body.text != null ? String(body.text) : "";
  const lang = body.lang || "en";
  const loc = body.loc || null;
  const name = (body.name || "Player").slice(0, 64);

  const token = await getAdminToken(env);
  const mod = await fetchModState(config, env, token, auth.uid);
  if (mod.banned) return err("banned", 403);
  if (mod.muted) return err("muted", 403);

  let text = "";
  if (phraseId) {
    const pt = phraseText(phraseId, lang);
    if (!pt) return err("invalid_phrase");
    text = pt;
  } else {
    if (!config.freeTextEnabled) return err("free_text_disabled");
    const reg = await ensureRegisteredAt(config, env, token, auth.uid);
    if (getNow(env) - reg < config.newbieMs) return err("newbie_phrases_only");
    const filtered = filterMessage(freeText, config.msgMaxLen);
    if (!filtered.ok) return err(filtered.reason);
    text = filtered.text;
  }

  const limits = await checkLimits(env, auth.uid, config);
  if (!limits.ok) return err(limits.reason, 429);

  const msg = {
    uid: auth.uid,
    name,
    text,
    time: getNow(env),
    phraseId: phraseId || null
  };
  if (loc) msg.loc = String(loc).slice(0, 64);

  const push = await rtdbRequest(
    config,
    "chat/messages",
    "POST",
    msg,
    token,
    env.FIREBASE_EMULATOR_HOST,
    env.FIREBASE_EMULATOR_NS
  );
  if (!push.ok) return err("rtdb_write_failed", 502);
  return json({ ok: true, id: push.json?.name || push.json });
}

async function ensureRegisteredAt(config, env, token, uid) {
  const path = `players/${uid}/chatRegisteredAt`;
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
    return err("unauthorized", 401);
  }
  const { msgId } = await request.json().catch(() => ({}));
  if (!msgId) return err("missing_msg_id");
  const token = await getAdminToken(env);
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;

  const msgRes = await rtdbRequest(config, `chat/messages/${msgId}`, "GET", null, token, emu, ns);
  if (!msgRes.json) return err("message_not_found", 404);

  const reporter = await anonymizeUid(auth.uid);
  const report = {
    msgId,
    time: getNow(env),
    reporterHash: reporter,
    msgUidHash: await anonymizeUid(msgRes.json.uid || "")
  };
  await rtdbRequest(config, "chat/reports", "POST", report, token, emu, ns);

  const countPath = `chat/internal/reportCounts/${msgId}`;
  const countRes = await rtdbRequest(config, countPath, "GET", null, token, emu, ns);
  const prev = typeof countRes.json === "number" ? countRes.json : 0;
  const next = prev + 1;
  await rtdbRequest(config, countPath, "PUT", next, token, emu, ns);

  if (next >= config.reportAutoHide) {
    await rtdbRequest(
      config,
      `chat/messages/${msgId}/hidden`,
      "PUT",
      true,
      token,
      emu,
      ns
    );
  }
  return json({ ok: true });
}

async function handleConfig(_request, env) {
  const config = loadConfig(env);
  return json({
    ok: true,
    freeTextEnabled: config.freeTextEnabled,
    phrases: PHRASES.map(p => ({ id: p.id, text: p })),
    maxLen: config.msgMaxLen,
    cooldownMs: config.cooldownMs
  });
}

async function requireMod(request, env) {
  const config = loadConfig(env);
  const auth = await verifyRequestAuth(request, config, env);
  if (!isModerator(auth.uid, env, auth.claims)) throw new Error("forbidden");
  return { config, auth, token: await getAdminToken(env) };
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
    return json({ ok: true, reports: res.json || {} });
  } catch (e) {
    return err(e.message === "forbidden" ? "forbidden" : "unauthorized", e.message === "forbidden" ? 403 : 401);
  }
}

async function handleModDelete(request, env) {
  try {
    const { config, token } = await requireMod(request, env);
    const { msgId } = await request.json().catch(() => ({}));
    if (!msgId) return err("missing_msg_id");
    await rtdbRequest(
      config,
      `chat/messages/${msgId}`,
      "DELETE",
      null,
      token,
      env.FIREBASE_EMULATOR_HOST,
      env.FIREBASE_EMULATOR_NS
    );
    return json({ ok: true });
  } catch (e) {
    return err(e.message === "forbidden" ? "forbidden" : "unauthorized", e.message === "forbidden" ? 403 : 401);
  }
}

async function handleModMute(request, env) {
  try {
    const { config, token } = await requireMod(request, env);
    const { uid, durationMs } = await request.json().catch(() => ({}));
    if (!uid) return err("missing_uid");
    const until = durationMs ? getNow(env) + durationMs : null;
    if (durationMs === 0 || durationMs === null) {
      await rtdbRequest(
        config,
        `chat/modState/${uid}/mute`,
        "DELETE",
        null,
        token,
        env.FIREBASE_EMULATOR_HOST,
        env.FIREBASE_EMULATOR_NS
      );
    } else {
      await rtdbRequest(
        config,
        `chat/modState/${uid}/mute`,
        "PUT",
        { until },
        token,
        env.FIREBASE_EMULATOR_HOST,
        env.FIREBASE_EMULATOR_NS
      );
    }
    return json({ ok: true });
  } catch (e) {
    return err(e.message === "forbidden" ? "forbidden" : "unauthorized", e.message === "forbidden" ? 403 : 401);
  }
}

async function handleModBan(request, env) {
  try {
    const { config, token } = await requireMod(request, env);
    const { uid, lift } = await request.json().catch(() => ({}));
    if (!uid) return err("missing_uid");
    if (lift) {
      await rtdbRequest(
        config,
        `chat/modState/${uid}/ban`,
        "DELETE",
        null,
        token,
        env.FIREBASE_EMULATOR_HOST,
        env.FIREBASE_EMULATOR_NS
      );
    } else {
      await rtdbRequest(
        config,
        `chat/modState/${uid}/ban`,
        "PUT",
        { at: getNow(env) },
        token,
        env.FIREBASE_EMULATOR_HOST,
        env.FIREBASE_EMULATOR_NS
      );
    }
    return json({ ok: true });
  } catch (e) {
    return err(e.message === "forbidden" ? "forbidden" : "unauthorized", e.message === "forbidden" ? 403 : 401);
  }
}

export async function runRetentionJob(env, nowOverride) {
  const config = loadConfig(env);
  const token = await getAdminToken(env);
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const now = nowOverride ?? getNow(env);

  const msgs = await rtdbRequest(config, "chat/messages", "GET", null, token, emu, ns);
  if (msgs.json && typeof msgs.json === "object") {
    for (const [id, m] of Object.entries(msgs.json)) {
      if (m?.time && now - m.time > config.msgRetentionMs) {
        await rtdbRequest(config, `chat/messages/${id}`, "DELETE", null, token, emu, ns);
      }
    }
  }
  const reports = await rtdbRequest(config, "chat/reports", "GET", null, token, emu, ns);
  if (reports.json && typeof reports.json === "object") {
    for (const [id, r] of Object.entries(reports.json)) {
      if (r?.time && now - r.time > config.reportRetentionMs) {
        await rtdbRequest(config, `chat/reports/${id}`, "DELETE", null, token, emu, ns);
      }
    }
  }
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/chat/config" && request.method === "GET") return handleConfig(request, env);
      if (url.pathname === "/api/chat/send" && request.method === "POST") return handleSend(request, env);
      if (url.pathname === "/api/chat/report" && request.method === "POST") return handleReport(request, env);
      if (url.pathname === "/api/mod/reports" && request.method === "GET") return handleModReports(request, env);
      if (url.pathname === "/api/mod/delete" && request.method === "POST") return handleModDelete(request, env);
      if (url.pathname === "/api/mod/mute" && request.method === "POST") return handleModMute(request, env);
      if (url.pathname === "/api/mod/ban" && request.method === "POST") return handleModBan(request, env);
      return err("not_found", 404);
    } catch (e) {
      return err("server_error", 500);
    }
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runRetentionJob(env));
  }
};
