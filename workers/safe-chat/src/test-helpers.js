import { chatPublicSid } from "./rtdb.js";

const AUTH_HOST = "127.0.0.1";
const AUTH_PORT = 9099;
const DB_HOST = "127.0.0.1";
const DB_PORT = 9000;

export const PROJECT_ID = "punk-me-40605";
export const DB_NS = `${PROJECT_ID}-default-rtdb`;

export async function authSignUp(opts = {}) {
  const res = await fetch(
    `http://${AUTH_HOST}:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
  );
  const json = await res.json();
  if (!res.ok || !json.idToken) throw new Error(`signUp failed ${res.status}`);
  const user = { idToken: json.idToken, localId: json.localId };
  await seedChatPlayer(user, opts);
  return user;
}

/** Minimal RTDB player fields required for safe-chat sends in tests. */
export async function seedChatPlayer(user, opts = {}) {
  const name = opts.name ?? "Tester";
  await rtdbOwner(`players/${user.localId}/name`, "PUT", name);
  const declaredAt = Date.now() - 1000;
  await rtdbOwner(`chatMeta/${user.localId}/chatAge13DeclaredAt`, "PUT", declaredAt);
  if (opts.level != null) await rtdbOwner(`players/${user.localId}/level`, "PUT", opts.level);
  if (opts.location) await rtdbOwner(`players/${user.localId}/location`, "PUT", opts.location);
}

export async function rtdbOwner(path, method, body) {
  const url = `http://${DB_HOST}:${DB_PORT}/${path.replace(/^\//, "")}.json?ns=${encodeURIComponent(DB_NS)}&access_token=owner`;
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, ok: res.ok };
}

export function rtdbUrl(path, token) {
  const q = new URLSearchParams({ ns: DB_NS });
  if (token) q.set("auth", token);
  return `http://${DB_HOST}:${DB_PORT}/${path.replace(/^\//, "")}.json?${q}`;
}

export async function rtdbAuth(path, method, idToken, body) {
  const res = await fetch(rtdbUrl(path, idToken), {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, ok: res.ok };
}

export async function apiPost(SELF, path, idToken, body, extraHeaders = {}) {
  return SELF.fetch(`http://localhost${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
      ...extraHeaders
    },
    body: JSON.stringify(body ?? {})
  });
}

export async function apiGet(SELF, path, idToken) {
  return SELF.fetch(`http://localhost${path}`, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
}

export function isBlocked(blocklist, sid) {
  return Boolean(blocklist?.[sid]);
}

/** Wait until a message node exists (emulator visibility). */
export async function waitForChatMessage(msgId, { attempts, delayMs = 100 } = {}) {
  const max = attempts ?? (process.env.SAFE_CHAT_INTEGRATION === "1" ? 400 : 200);
  for (let i = 0; i < max; i += 1) {
    const m = await rtdbOwner(`chat/messages/${msgId}`, "GET");
    if (m.json && (m.json.sid || m.json.uid)) return m.json;
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(`message ${msgId} not visible in RTDB`);
}

/** After owner PATCH of text, wait until body is visible (RTDB under load). */
export async function waitForMessageText(msgId, textNeedle, { attempts, delayMs = 100 } = {}) {
  const needle = String(textNeedle || "");
  const max = attempts ?? (process.env.SAFE_CHAT_INTEGRATION === "1" ? 400 : 200);
  for (let i = 0; i < max; i += 1) {
    const m = await rtdbOwner(`chat/messages/${msgId}`, "GET");
    const text = m.json?.text;
    if (m.json && (m.json.sid || m.json.uid) && typeof text === "string" && text.includes(needle)) {
      return m.json;
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(`message ${msgId} text not visible in RTDB (needle=${needle.slice(0, 32)})`);
}

/** Worker send cooldown is 3s; wait between sends from the same uid in integration tests. */
export function waitSendCooldown() {
  return new Promise(r => setTimeout(r, 3100));
}

export function expectedChatSid(localId) {
  return chatPublicSid(localId, process.env.SAFE_CHAT_HASH_SALT || "vitest-local-salt-do-not-use-in-prod");
}

/** Owner-POST N messages for erasure integration tests (deterministic sid, visibility barrier). */
export async function seedOwnMessagesForErasure(u, n) {
  const sid = expectedChatSid(u.localId);
  expect(sid).toMatch(/^[a-f0-9]{32}$/);
  const ids = [];
  for (let i = 0; i < n; i += 1) {
    const ref = await rtdbOwner("chat/messages", "POST", {
      sid,
      name: "Erasure",
      text: `msg-${i}`,
      time: Date.now() + i
    });
    const id = ref.json?.name;
    expect(id).toBeTruthy();
    ids.push(id);
    await waitForChatMessage(id);
  }
  expect(ids.length).toBe(n);
  return { sid, ids };
}

/** Integration-only: reset discretionary hide + cluster counters on the global limits DO. */
export async function resetHideCountersDo(env) {
  if (env.SAFE_CHAT_INTEGRATION !== "1" || !env.CHAT_LIMITS) return;
  const id = env.CHAT_LIMITS.idFromName("global");
  const stub = env.CHAT_LIMITS.get(id);
  await stub.fetch(new Request("http://do/integration-reset-hide-counters", { method: "POST" }));
}

/** Wipe shared RTDB chat state and DO limits so shuffled tests do not leak reports, hides, or jobs. */
export async function resetIntegrationIsolation(env) {
  if (env.SAFE_CHAT_INTEGRATION !== "1") return;
  delete env.SAFE_CHAT_TEST_NOW_MS;
  await resetHideCountersDo(env);
  await rtdbOwner("chat/messages", "DELETE");
  await rtdbOwner("chat/reports", "DELETE");
  await rtdbOwner("chat/internal", "DELETE");
  for (let i = 0; i < 60; i += 1) {
    const snap = await rtdbOwner("chat/messages", "GET");
    if (!snap.json || Object.keys(snap.json).length === 0) break;
    await new Promise(r => setTimeout(r, 25));
  }
}

export async function apiSend(SELF, idToken, body) {
  const r = await apiPost(SELF, "/api/chat/send", idToken, body);
  const j = await r.json();
  if (j.ok && j.id) await waitForChatMessage(j.id);
  return { r, j };
}

export async function putChatMessageText(msgId, text, opts = {}) {
  if (!opts.skipWait) await waitForChatMessage(msgId);
  else {
    const peek = await rtdbOwner(`chat/messages/${msgId}`, "GET");
    if (!peek.json?.sid && !peek.json?.uid) await waitForChatMessage(msgId);
  }
  const cur = await rtdbOwner(`chat/messages/${msgId}`, "GET");
  if (!cur.json?.sid && !cur.json?.uid) await waitForChatMessage(msgId);
  const merged = { ...(cur.json || {}), text: String(text) };
  if (!merged.sid && !merged.uid) throw new Error(`putChatMessageText: message ${msgId} missing sid/uid`);
  await rtdbOwner(`chat/messages/${msgId}`, "PUT", merged);
  const needle = String(text).trim().slice(0, Math.min(32, String(text).length));
  await waitForMessageText(msgId, needle);
}

function looksLikeChatMsgId(msgId) {
  return typeof msgId === "string" && /^[-A-Za-z0-9]+$/.test(msgId);
}

/** POST /api/chat/report after the message node is visible in RTDB (emulator timing). */
export async function apiPostReport(SELF, idToken, body, extraHeaders = {}, opts = {}) {
  const msgId = body?.msgId;
  if (msgId && !opts.skipWait && looksLikeChatMsgId(msgId)) {
    if (opts.textNeedle) await waitForMessageText(msgId, opts.textNeedle);
    else await waitForChatMessage(msgId);
  }
  return apiPost(SELF, "/api/chat/report", idToken, body, extraHeaders);
}

async function countOwnMessagesForSid(ownSid) {
  if (!ownSid) return null;
  const remaining = await rtdbOwner("chat/messages", "GET");
  return Object.values(remaining.json || {}).filter(m => m.sid === ownSid).length;
}

/** Cron queue drain after delete-my-data (does not call delete-my-data again). */
export async function drainErasureCronLoop(env, user, runErasureQueueJob, requeueDelete, opts = {}) {
  const ownSid = opts.ownSid || null;
  let guard = 0;
  let idleRequeues = 0;
  while (guard < 500) {
    guard += 1;
    if (ownSid) {
      const n = await countOwnMessagesForSid(ownSid);
      if (n === 0) return { status: "complete", complete: true };
    }
    const jobSnap = await rtdbOwner(`chat/internal/erasureJobs/${user.localId}`, "GET");
    if (jobSnap.json?.status === "complete_with_holds" || jobSnap.json?.status === "failed") {
      return { ...jobSnap.json, complete: false };
    }
    if (!jobSnap.json) {
      if (ownSid) {
        const n = await countOwnMessagesForSid(ownSid);
        if (n > 0) {
          if (typeof requeueDelete === "function" && idleRequeues < 8) {
            idleRequeues += 1;
            await requeueDelete();
            continue;
          }
          return { status: "queued", complete: false };
        }
      }
      if (typeof requeueDelete === "function" && idleRequeues < 8) {
        idleRequeues += 1;
        await requeueDelete();
        continue;
      }
      return { status: "complete", complete: true };
    }
    idleRequeues = 0;
    await runErasureQueueJob(env);
  }
  const finalJob = await rtdbOwner(`chat/internal/erasureJobs/${user.localId}`, "GET");
  if (ownSid) {
    const n = await countOwnMessagesForSid(ownSid);
    if (n > 0) return { status: finalJob.json?.status || "queued", complete: false };
    return { status: "complete", complete: true };
  }
  if (!finalJob.json) return { status: "complete", complete: true };
  return { status: finalJob.json.status, complete: false };
}
