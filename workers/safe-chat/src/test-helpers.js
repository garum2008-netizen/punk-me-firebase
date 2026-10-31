import { chatPublicSid } from "./rtdb.js";
import { env as workerEnv } from "cloudflare:test";
import { getActiveIntegrationRtdbNs, getActiveIntegrationDoName } from "./integration-isolation.js";
import { integrationIsolationHeaders } from "./integration-env-sync.js";
import { chatLimitsDoName } from "./limits-do-env.js";

const AUTH_HOST = "127.0.0.1";
const AUTH_PORT = 9099;
const DB_HOST = "127.0.0.1";
const DB_PORT = 9000;

export const PROJECT_ID = "punk-me-40605";
export const DB_NS = `${PROJECT_ID}-default-rtdb`;

function rtdbNs() {
  return workerEnv.SAFE_CHAT_INTEGRATION === "1" ? getActiveIntegrationRtdbNs() : DB_NS;
}

function integrationEnabled() {
  return workerEnv.SAFE_CHAT_INTEGRATION === "1";
}

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

/** Replicate Auth users' player/chatMeta into the current per-test RTDB namespace. */
export async function reseedAuthUsersInActiveNs(users) {
  for (const u of users) {
    if (u?.localId) await seedChatPlayer(u);
  }
}

export function integrationFetchHeaders() {
  if (!integrationEnabled()) return {};
  return integrationIsolationHeaders(getActiveIntegrationRtdbNs(), getActiveIntegrationDoName());
}

export async function rtdbOwner(path, method, body) {
  const url = `http://${DB_HOST}:${DB_PORT}/${path.replace(/^\//, "")}.json?ns=${encodeURIComponent(rtdbNs())}&access_token=owner`;
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
  const q = new URLSearchParams({ ns: rtdbNs() });
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
  const iso = integrationEnabled()
    ? integrationIsolationHeaders(getActiveIntegrationRtdbNs(), getActiveIntegrationDoName())
    : {};
  return SELF.fetch(`http://localhost${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
      ...iso,
      ...extraHeaders
    },
    body: JSON.stringify(body ?? {})
  });
}

export async function apiGet(SELF, path, idToken) {
  const iso = integrationEnabled()
    ? integrationIsolationHeaders(getActiveIntegrationRtdbNs(), getActiveIntegrationDoName())
    : {};
  return SELF.fetch(`http://localhost${path}`, {
    headers: { Authorization: `Bearer ${idToken}`, ...iso }
  });
}

export function isBlocked(blocklist, sid) {
  return Boolean(blocklist?.[sid]);
}

/** Wait until a message node exists (emulator visibility). */
async function readChatMessageRow(msgId) {
  const all = await rtdbOwner("chat/messages", "GET");
  const listed = all.json?.[msgId];
  if (listed && (listed.sid || listed.uid)) return listed;
  const m = await rtdbOwner(`chat/messages/${msgId}`, "GET");
  if (m.json && (m.json.sid || m.json.uid)) return m.json;
  const sidLeaf = await rtdbOwner(`chat/messages/${msgId}/sid`, "GET");
  if (typeof sidLeaf.json === "string" && /^[a-f0-9]{32}$/.test(sidLeaf.json)) {
    return { sid: sidLeaf.json, ...(typeof m.json === "object" && m.json ? m.json : {}) };
  }
  return null;
}

export async function waitForChatMessage(msgId, { attempts, delayMs = 100 } = {}) {
  const max = attempts ?? (integrationEnabled() ? 600 : 200);
  for (let i = 0; i < max; i += 1) {
    const row = await readChatMessageRow(msgId);
    if (row) return row;
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(`message ${msgId} not visible in RTDB`);
}

/** Harness barrier: sid + text visible (matches worker report GET needs). */
export async function waitForReportableMessage(msgId, { attempts, delayMs = 100 } = {}) {
  const max = attempts ?? (integrationEnabled() ? 600 : 200);
  for (let i = 0; i < max; i += 1) {
    const row = await readChatMessageRow(msgId);
    if (row?.sid && typeof row.text === "string" && row.text.length > 0) return row;
    const textLeaf = await rtdbOwner(`chat/messages/${msgId}/text`, "GET");
    if (row?.sid && typeof textLeaf.json === "string" && textLeaf.json.length > 0) {
      return { ...row, text: textLeaf.json };
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(`message ${msgId} not reportable in RTDB`);
}

/** Wait until a safetyQueue row exists and matches predicate (harness barrier). */
export async function waitForSafetyQueue(msgId, predicate, { attempts = 240, delayMs = 100 } = {}) {
  const pred = predicate || (q => Boolean(q?.childHarm || q?.subcategory));
  for (let i = 0; i < attempts; i += 1) {
    const all = await rtdbOwner("chat/internal/safetyQueue", "GET");
    const qListed = all.json?.[msgId];
    if (qListed && pred(qListed)) return qListed;
    const snap = await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET");
    const q = snap.json;
    if (q && pred(q)) return q;
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(`safetyQueue ${msgId} not ready`);
}

/** Harness barrier: message.hidden === true (async hide after filter/report). */
export async function waitForMessageHidden(msgId, { attempts = 120, delayMs = 100 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    const row = await readChatMessageRow(msgId);
    if (row?.hidden === true) return row;
    const leaf = await rtdbOwner(`chat/messages/${msgId}/hidden`, "GET");
    if (leaf.json === true) return { hidden: true, ...(row || {}) };
    await new Promise(r => setTimeout(r, delayMs));
  }
  throw new Error(`message ${msgId} not hidden in RTDB`);
}

/** After owner PATCH of text, wait until body is visible (RTDB under load). */
export async function waitForMessageText(msgId, textNeedle, { attempts, delayMs = 100 } = {}) {
  const needle = String(textNeedle || "");
  const max = attempts ?? (integrationEnabled() ? 600 : 200);
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

export async function expectedChatSid(localId) {
  return chatPublicSid(localId, process.env.SAFE_CHAT_HASH_SALT || "vitest-local-salt-do-not-use-in-prod");
}

/** Owner-POST N messages for erasure integration tests (deterministic sid, visibility barrier). */
export async function seedOwnMessagesForErasure(SELF, u, n) {
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await seedOwnMessagesForErasureOnce(SELF, u, n);
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 300));
    }
  }
  throw lastErr;
}

async function seedOwnMessagesForErasureOnce(SELF, u, n) {
  let sid = null;
  for (let t = 0; t < 80; t += 1) {
    sid = (await (await apiGet(SELF, "/api/chat/config", u.idToken)).json()).mySid;
    if (typeof sid === "string" && /^[a-f0-9]{32}$/.test(sid)) break;
    await new Promise(r => setTimeout(r, 50));
  }
  if (!sid) throw new Error("erasure seed: config mySid not available");
  const ids = [];
  for (let i = 0; i < n; i += 1) {
    const ref = await rtdbOwner("chat/messages", "POST", {
      sid,
      name: "Erasure",
      text: `msg-${i}`,
      time: Date.now() + i
    });
    if (!ref.ok) throw new Error(`erasure seed POST failed: ${ref.status}`);
    const id = ref.json?.name;
    if (!id) throw new Error(`erasure seed POST failed at index ${i}`);
    ids.push(id);
    await waitForChatMessage(id);
  }
  if (ids.length !== n) throw new Error(`erasure seed expected ${n} ids got ${ids.length}`);
  let visible = 0;
  for (let t = 0; t < 120; t += 1) {
    visible = 0;
    for (const id of ids) {
      const m = await rtdbOwner(`chat/messages/${id}`, "GET");
      if (m.json?.sid === sid) visible += 1;
    }
    if (visible === n) return { sid, ids };
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error(`erasure seed: only ${visible}/${n} messages visible with sid`);
}

/** Integration-only: reset discretionary hide + cluster counters on the global limits DO. */
export async function resetHideCountersDo(env) {
  if (env.SAFE_CHAT_INTEGRATION !== "1" || !env.CHAT_LIMITS) return;
  const name = chatLimitsDoName(env);
  if (name !== "global") return;
  const id = env.CHAT_LIMITS.idFromName(name);
  const stub = env.CHAT_LIMITS.get(id);
  await stub.fetch(new Request("http://do/integration-reset-hide-counters", { method: "POST" }));
}

/** Integration: limits DO is namespaced per test; no shared RTDB wipe (fresh ns each test). */
export async function resetIntegrationIsolation(env) {
  if (workerEnv.SAFE_CHAT_INTEGRATION !== "1") return;
  delete env.SAFE_CHAT_TEST_NOW_MS;
}

export async function apiSend(SELF, idToken, body) {
  const r = await apiPost(SELF, "/api/chat/send", idToken, body);
  const j = await r.json();
  if (!j.ok) throw new Error(`apiSend failed: ${j.error || "unknown"} status=${r.status}`);
  if (j.id) await waitForChatMessage(j.id);
  return { r, j };
}

/** Same as apiSend but returns parsed JSON body; does not throw on send errors (e.g. daily_limit). */
export async function apiSendJson(SELF, idToken, body) {
  const r = await apiPost(SELF, "/api/chat/send", idToken, body);
  const j = await r.json();
  if (j.ok && j.id) await waitForChatMessage(j.id);
  return j;
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
    else if (opts.requireText) await waitForReportableMessage(msgId);
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
