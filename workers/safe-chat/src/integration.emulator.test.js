import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { runRetentionJob } from "./index.js";
import {
  authSignUp,
  apiPost,
  apiGet,
  rtdbOwner,
  rtdbAuth,
  isBlocked,
  waitSendCooldown,
  PROJECT_ID
} from "./test-helpers.js";
import { detectChildHarmSignals } from "./child-harm.js";

async function runRetentionToCompletion(env, now) {
  for (let i = 0; i < 25; i++) {
    const r = await runRetentionJob({ ...env, SAFE_CHAT_TEST_NOW_MS: String(now) }, now);
    if (!r.budgetExceeded) return r;
  }
  return runRetentionJob({ ...env, SAFE_CHAT_TEST_NOW_MS: String(now) }, now);
}

describe.skipIf(env.SAFE_CHAT_INTEGRATION !== "1")("safe-chat integration (Auth + RTDB emulators, miniflare DO)", () => {
  let mod;
  let userA;
  let userB;
  let userC;
  let userD;

  beforeAll(async () => {
    expect(env.SAFE_CHAT_EMULATOR).toBe("true");
    const modUid = (env.MODERATOR_UIDS || "").split(",")[0];
    const modToken = env.SAFE_CHAT_TEST_MOD_TOKEN;
    expect(modUid).toBeTruthy();
    expect(modToken).toBeTruthy();
    mod = { localId: modUid, idToken: modToken };
    userA = await authSignUp();
    userB = await authSignUp();
    userC = await authSignUp();
    userD = await authSignUp();
    expect(env.MODERATOR_UIDS).toContain(modUid);
  });

  it("freeTextEnabled=false rejects free text, allows preset phrase", async () => {
    const cfg = await (await SELF.fetch("http://localhost/api/chat/config")).json();
    expect(cfg.freeTextEnabled).toBe(false);

    const bad = await apiPost(SELF, "/api/chat/send", userA.idToken, { text: "hello world", name: "A" });
    const badJson = await bad.json();
    expect(badJson.ok).toBe(false);
    expect(badJson.error).toBe("free_text_disabled");

    const ok = await apiPost(SELF, "/api/chat/send", userA.idToken, { phraseId: "hi", name: "A" });
    const okJson = await ok.json();
    expect(okJson.ok).toBe(true);
  });

  it("rate limit: cooldown 3s between messages", async () => {
    const u = await authSignUp();
    const r1 = await apiPost(SELF, "/api/chat/send", u.idToken, { phraseId: "gg", name: "R1" });
    expect((await r1.json()).ok).toBe(true);
    const r2 = await apiPost(SELF, "/api/chat/send", u.idToken, { phraseId: "gg", name: "R1" });
    const j2 = await r2.json();
    expect(j2.ok).toBe(false);
    expect(j2.error).toBe("cooldown");
    expect(r2.status).toBe(429);
  });

  it("rejects path injection in msgId on report", async () => {
    const bad = await apiPost(SELF, "/api/chat/report", userA.idToken, { msgId: "../../players/secret" });
    expect((await bad.json()).error).toBe("invalid_id");
  });

  it("rejects profanity or PII in display name from server profile", async () => {
    const u = await authSignUp({ name: "email me at test@example.com" });
    const r = await apiPost(SELF, "/api/chat/send", u.idToken, { phraseId: "hi" });
    expect((await r.json()).error).toBe("bad_display_name");
  });

  it("rejects impersonation display name from server profile", async () => {
    const u = await authSignUp({ name: "Moderator" });
    const r = await apiPost(SELF, "/api/chat/send", u.idToken, { phraseId: "hi" });
    expect((await r.json()).error).toBe("impersonation_name");
  });

  it("messages store public sid not raw uid", async () => {
    const u = await authSignUp();
    const sent = await apiPost(SELF, "/api/chat/send", u.idToken, { phraseId: "hi" });
    const { id: msgId } = await sent.json();
    const msg = await rtdbOwner(`chat/messages/${msgId}`, "GET");
    expect(msg.json.sid).toMatch(/^[a-f0-9]{32}$/);
    expect(msg.json.uid).toBeUndefined();
  });

  it("requires chatAge13DeclaredAt before send", async () => {
    const u = await authSignUp();
    await rtdbOwner(`chatMeta/${u.localId}/chatAge13DeclaredAt`, "DELETE");
    const r = await apiPost(SELF, "/api/chat/send", u.idToken, { phraseId: "hi" });
    expect((await r.json()).error).toBe("age_not_declared");
  });

  it("deduplicates reports from the same reporter", async () => {
    const author = await authSignUp();
    const sent = await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" });
    const { id: msgId } = await sent.json();
    expect((await (await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId })).json()).ok).toBe(true);
    const dup = await (await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId })).json();
    expect(dup.duplicate).toBe(true);
    const msg = await rtdbOwner(`chat/messages/${msgId}`, "GET");
    expect(msg.json.hidden).not.toBe(true);
  });

  it("rejects invalid Bearer token with 401", async () => {
    const res = await SELF.fetch("http://localhost/api/chat/send", {
      method: "POST",
      headers: { Authorization: "Bearer not-a-real-token", "Content-Type": "application/json" },
      body: JSON.stringify({ phraseId: "hi", name: "X" })
    });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthorized");
  });

  it("security: muted reporter child_safety report still accepted", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "hi" })).json();
    const muted = await authSignUp();
    await apiPost(SELF, "/api/mod/mute", mod.idToken, { uid: muted.localId, durationMs: 86400000 });
    const r = await apiPost(SELF, "/api/chat/report", muted.idToken, { msgId, category: "other_child_safety" });
    expect((await r.json()).received).toBe(true);
    await apiPost(SELF, "/api/mod/mute", mod.idToken, { uid: muted.localId, lift: true });
  });

  it("security: child_safety reports bypass daily report cap (U-01 sample)", async () => {
    const rep = await authSignUp();
    for (let i = 0; i < 12; i++) {
      const a = await authSignUp();
      const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", a.idToken, { phraseId: "hi" })).json();
      const r = await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId, category: "other_child_safety" });
      expect(r.status).not.toBe(429);
      expect((await r.json()).received).toBe(true);
    }
  });

  it("security: reportMeta stores reporterSid not raw uid", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you secret");
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "grooming" });
    const meta = await rtdbOwner("chat/internal/reportMeta", "GET");
    const entry = Object.values(meta.json || {})[0];
    expect(entry?.reporterSid).toBeTruthy();
    expect(entry?.reporterSid).not.toBe(userB.localId);
    expect(entry?.reporterUid).toBeUndefined();
  });

  it("security: erasure completes after stale cursor (NEW-11b)", async () => {
    const u = await authSignUp();
    const sid = (await (await apiGet(SELF, "/api/chat/config", u.idToken)).json()).mySid;
    const ids = [];
    for (let i = 0; i < 8; i++) {
      const p = await rtdbOwner("chat/messages", "POST", { sid, name: "T", text: `m${i}`, time: Date.now() + i });
      ids.push(p.json?.name);
    }
    await rtdbOwner(`chatMeta/${u.localId}/erasureCursor`, "PUT", ids[0]);
    const del = await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {});
    const j = await del.json();
    expect(j.ok).toBe(true);
    expect(j.staleCursorCleared === true || j.complete === true || j.cursor != null).toBe(true);
  });

  it("risk: other_child_safety on benign phrase queues without auto-hide (false positive guard)", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    const rep = await authSignUp();
    const r = await apiPost(SELF, "/api/chat/report", rep.idToken, {
      msgId,
      category: "other_child_safety"
    });
    const j = await r.json();
    expect(j.received).toBe(true);
    expect(j.hidden).toBeUndefined();
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).not.toBe(true);
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.subcategory).toBe("other_child_safety");
  });

  it("risk: unaged reporter grooming report with message context still hides", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    const sid = (await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.sid;
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you? don't tell your mom");
    const rep = await authSignUp();
    await rtdbOwner(`chatMeta/${rep.localId}/chatAge13DeclaredAt`, "DELETE");
    const r = await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId, category: "grooming" });
    expect((await r.json()).received).toBe(true);
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).toBe(true);
    expect(sid).toBeTruthy();
  });

  it("risk: filter miss caught by player grooming report (explicit)", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "send pics on telegram meet me alone");
    expect(detectChildHarmSignals("send pics on telegram meet me alone")).toBe(false);
    const rep = await authSignUp();
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId, category: "grooming" });
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).toBe(true);
  });

  it("risk: banned reporter submission accepted but cannot alone auto-hide benign message", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "hi" })).json();
    const banned = await authSignUp();
    await apiPost(SELF, "/api/mod/ban", mod.idToken, { uid: banned.localId });
    const r = await apiPost(SELF, "/api/chat/report", banned.idToken, { msgId, category: "other_child_safety" });
    expect((await r.json()).received).toBe(true);
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).not.toBe(true);
    await apiPost(SELF, "/api/mod/ban", mod.idToken, { uid: banned.localId, lift: true });
  });

  it("risk: child-safety reports never rejected for rate limits or undeclared age", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "hi" })).json();
    const noAge = await authSignUp();
    await rtdbOwner(`chatMeta/${noAge.localId}/chatAge13DeclaredAt`, "DELETE");
    for (let i = 0; i < 5; i++) {
      const rr = await apiPost(SELF, "/api/chat/report", noAge.idToken, {
        msgId,
        category: "other_child_safety"
      });
      expect((await rr.json()).received).toBe(true);
    }
  });

  it("risk: mass identical coordinated reports do not hide from count alone", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    const ip = "198.51.100.10";
    const hdr = { "CF-Connecting-IP": ip };
    for (let i = 0; i < 6; i++) {
      const r = await authSignUp();
      const reg = Date.now() - 5000;
      await rtdbOwner(`chatMeta/${r.localId}/chatRegisteredAt`, "PUT", reg);
      await apiPost(SELF, "/api/chat/report", r.idToken, { msgId, category: "other_child_safety" }, hdr);
    }
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).not.toBe(true);
    expect((await rtdbOwner(`chat/internal/safetyCase/${msgId}`, "GET")).json?.reports?.length).toBeGreaterThan(3);
  });

  it("risk: high-tier hide bypasses discretionary hide quota", async () => {
    const author = await authSignUp();
    const { id: msgId1 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await waitSendCooldown();
    const { id: msgId2 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json();
    const rep = await authSignUp();
    await rtdbOwner(`chat/messages/${msgId1}/text`, "PUT", "how old are you");
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: msgId1, category: "other_child_safety" });
    await rtdbOwner(`chat/messages/${msgId2}/text`, "PUT", "don't tell mom meet me alone");
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: msgId2, category: "grooming" });
    expect((await rtdbOwner(`chat/messages/${msgId2}`, "GET")).json?.hidden).toBe(true);
  });

  it("risk: reporter privacy response has no case or target details", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    const r = await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "violence_threat" });
    const j = await r.json();
    expect(j.messageKey).toBe("thanks_received");
    expect(j.hidden).toBeUndefined();
    expect(j.msgId).toBeUndefined();
    expect(j.evidence).toBeUndefined();
    expect(j.priority).toBeUndefined();
  });

  it("risk: immediate_danger uses escalation tier and moderator notify", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "I will hurt the kid now");
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "immediate_danger" });
    const q = await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET");
    expect(q.json?.escalationTier).toBe("immediate_danger");
    expect(q.json?.moderatorNotify).toBe(true);
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).toBe(true);
  });

  it("risk: false dismiss reduces auto-hide weight but report still accepted", async () => {
    const author = await authSignUp();
    const { id: msgId1 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await waitSendCooldown();
    const { id: msgId2 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json();
    const rep = await authSignUp();
    await rtdbOwner(`chat/messages/${msgId1}/text`, "PUT", "how old are you secret");
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: msgId1, category: "grooming" });
    const reports = await rtdbOwner("chat/reports", "GET");
    const reportId = Object.entries(reports.json || {}).find(([, v]) => v?.msgId === msgId1)?.[0];
    await apiPost(SELF, "/api/mod/resolve-safety", mod.idToken, {
      msgId: msgId1,
      action: "dismiss",
      falseReport: true,
      reportId
    });
    await rtdbOwner(`chat/messages/${msgId2}/text`, "PUT", "thanks");
    const r2 = await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: msgId2, category: "other_child_safety" });
    expect((await r2.json()).received).toBe(true);
    expect((await rtdbOwner(`chat/messages/${msgId2}`, "GET")).json?.hidden).not.toBe(true);
  });

  it("risk: appeal and moderator restore after wrongful hide", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you don't tell mom");
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "grooming" });
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).toBe(true);
    await apiPost(SELF, "/api/chat/appeal-hide", author.idToken, { msgId, reasonCode: "wrongful_hide" });
    await apiPost(SELF, "/api/mod/resolve-safety", mod.idToken, { msgId, action: "restore_visibility" });
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).not.toBe(true);
  });

  it("filter-detected message content hides regardless of reporter auto-hide quota", async () => {
    const author = await authSignUp();
    const { id: msgId1 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await waitSendCooldown();
    const { id: msgId2 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json();
    const rep = await authSignUp();
    await rtdbOwner(`chat/messages/${msgId1}/text`, "PUT", "kill the kid");
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: msgId1, category: "other_child_safety" });
    await rtdbOwner(`chat/messages/${msgId2}/text`, "PUT", "kill the kid");
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: msgId2, category: "other_child_safety" });
    expect((await rtdbOwner(`chat/messages/${msgId1}`, "GET")).json?.hidden).toBe(true);
    expect((await rtdbOwner(`chat/messages/${msgId2}`, "GET")).json?.hidden).toBe(true);
  });

  it("moderator restore_visibility unhides with decision log", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you secret");
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "grooming" });
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json.hidden).toBe(true);
    await apiPost(SELF, "/api/mod/resolve-safety", mod.idToken, { msgId, action: "restore_visibility" });
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json.hidden).not.toBe(true);
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.restoredAt).toBeTruthy();
  });

  it("client cannot read moderator-only safetyEvidence or safetyQueue", async () => {
    const author = await authSignUp();
    const sent = await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" });
    const { id: msgId } = await sent.json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you secret");
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "grooming" });
    const ev = await rtdbAuth(`chat/internal/safetyEvidence/${msgId}`, "GET", userA.idToken);
    expect(ev.status === 401 || ev.status === 403).toBe(true);
    const q = await rtdbAuth("chat/internal/safetyQueue", "GET", userA.idToken);
    expect(q.status === 401 || q.status === 403).toBe(true);
    const modQ = await apiGet(SELF, "/api/mod/safety-queue", mod.idToken);
    expect(modQ.status).toBe(200);
    const modJson = await modQ.json();
    expect(modJson.queue.some(e => e.msgId === msgId && e.priority === "critical")).toBe(true);
  });

  it("detectChildHarmSignals flags harm patterns for server-side hide path", () => {
    expect(detectChildHarmSignals("I will hurt the kid tonight")).toBe(true);
    expect(detectChildHarmSignals("gg wp")).toBe(false);
  });

  it("retention keeps child_safety queued message past msg retention", async () => {
    const author = await authSignUp();
    const sent = await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" });
    const { id: msgId } = await sent.json();
    const fresh = await authSignUp();
    await apiPost(SELF, "/api/chat/declare-age13", fresh.idToken, { confirmed: true });
    await apiPost(SELF, "/api/chat/report", fresh.idToken, { msgId, category: "other_child_safety" });
    const now = 2_000_000_000_000;
    await rtdbOwner(`chat/messages/${msgId}/time`, "PUT", now - 8 * 24 * 60 * 60 * 1000);
    await runRetentionToCompletion(env, now);
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.text).toBeTruthy();
  });

  it("duplicate reports do not consume global per-message report cap", async () => {
    const author = await authSignUp();
    const sent = await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" });
    const { id: msgId } = await sent.json();
    const spammer = await authSignUp();
    for (let i = 0; i < 105; i++) {
      await apiPost(SELF, "/api/chat/report", spammer.idToken, { msgId });
    }
    await rtdbOwner(`chatMeta/${userB.localId}/chatRegisteredAt`, "PUT", Date.now() - 3 * 24 * 60 * 60 * 1000);
    await rtdbOwner(`chatMeta/${userB.localId}/chatSendCount`, "PUT", 20);
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you don't tell mom");
    const trusted = await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "grooming" });
    const tj = await trusted.json();
    expect(tj.global_report_limit).toBeUndefined();
    expect(tj.received).toBe(true);
  });

  it("bogus client erasure cursor cannot force complete or bypass rate limit", async () => {
    const u = await authSignUp();
    const sid = (await (await apiGet(SELF, "/api/chat/config", u.idToken)).json()).mySid;
    await rtdbOwner("chat/messages", "POST", { sid, name: "X", text: "keep", time: Date.now() });
    const first = await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {});
    const j1 = await first.json();
    expect(j1.ok).toBe(true);
    if (j1.complete) return;
    const bogus = await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, { cursor: "-zzzznotrealzzzz" });
    const j2 = await bogus.json();
    expect(j2.complete).not.toBe(true);
    expect(j2.ok).toBe(true);
    const rate = await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {});
    if (j1.complete) return;
    expect([429, 200]).toContain(rate.status);
  });

  it("child_safety evidence defers author erasure until moderator resolves", async () => {
    const author = await authSignUp();
    const sent = await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" });
    const { id: msgId } = await sent.json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you secret");
    const fresh = await authSignUp();
    await apiPost(SELF, "/api/chat/report", fresh.idToken, { msgId, category: "grooming" });
    const del = await apiPost(SELF, "/api/chat/delete-my-data", author.idToken, {});
    const dj = await del.json();
    expect(dj.ok).toBe(true);
    expect(dj.complete).not.toBe(true);
    expect(dj.erasureDeferred).toContain(msgId);
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).toBe(true);
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.childHarm).toBe(true);
  });

  it("child_safety hides after trusted reporter age and retains evidence on author erasure", async () => {
    const author = await authSignUp();
    const sent = await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" });
    const { id: msgId } = await sent.json();
    const mature = Date.now() - 2 * 24 * 60 * 60 * 1000;
    await rtdbOwner(`chatMeta/${userB.localId}/chatRegisteredAt`, "PUT", mature);
    await rtdbOwner(`chatMeta/${userB.localId}/chatSendCount`, "PUT", 10);
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you don't tell mom");
    const rep = await apiPost(SELF, "/api/chat/report", userB.idToken, {
      msgId,
      category: "grooming"
    });
    expect((await rep.json()).received).toBe(true);
    const msg = await rtdbOwner(`chat/messages/${msgId}`, "GET");
    expect(msg.json.hidden).toBe(true);

    const del = await apiPost(SELF, "/api/chat/delete-my-data", author.idToken, {});
    const delJson = await del.json();
    expect(delJson.ok).toBe(true);
    expect(delJson.erasureDeferred).toContain(msgId);
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).toBe(true);

    const now = 2_000_000_000_000;
    await rtdbOwner(`chat/messages/${msgId}/time`, "PUT", now - 8 * 24 * 60 * 60 * 1000);
    await runRetentionToCompletion(env, now);
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).toBe(true);
    expect((await rtdbOwner(`chat/internal/safetyEvidence/${msgId}`, "GET")).json?.access).toBe(
      "moderator_only"
    );

    await apiPost(SELF, "/api/mod/resolve-safety", mod.idToken, { msgId, action: "uphold_delete" });
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json).toBeNull();
  });

  it("reports from three players auto-hide message", async () => {
    const author = await authSignUp();
    const sent = await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks", name: "Auth" });
    const { id: msgId } = await sent.json();
    expect(msgId).toBeTruthy();

    for (const u of [userB, userC, userD]) {
      const rep = await apiPost(SELF, "/api/chat/report", u.idToken, { msgId });
      expect((await rep.json()).ok).toBe(true);
    }
    const msg = await rtdbOwner(`chat/messages/${msgId}`, "GET");
    expect(msg.json.hidden).toBe(true);
  });

  it("mute prevents send; ban prevents send", async () => {
    const victim = await authSignUp();
    await apiPost(SELF, "/api/mod/mute", mod.idToken, { uid: victim.localId, durationMs: 3600000 });
    const muted = await apiPost(SELF, "/api/chat/send", victim.idToken, { phraseId: "hi", name: "V" });
    expect((await muted.json()).error).toBe("muted");

    await apiPost(SELF, "/api/mod/mute", mod.idToken, { uid: victim.localId, durationMs: 0 });
    await apiPost(SELF, "/api/mod/ban", mod.idToken, { uid: victim.localId });
    const banned = await apiPost(SELF, "/api/chat/send", victim.idToken, { phraseId: "hi", name: "V" });
    expect((await banned.json()).error).toBe("banned");
    await apiPost(SELF, "/api/mod/ban", mod.idToken, { uid: victim.localId, lift: true });
  });

  it("mod API forbidden for non-moderator (moderation.html uses same API)", async () => {
    const res = await apiGet(SELF, "/api/mod/reports", userA.idToken);
    expect(res.status).toBe(403);
    const del = await apiPost(SELF, "/api/mod/delete", userA.idToken, { msgId: "x" });
    expect(del.status).toBe(403);
  });

  it("mod can list reports and delete message", async () => {
    const sent = await apiPost(SELF, "/api/chat/send", userA.idToken, { phraseId: "lol", name: "A" });
    const { id: msgId } = await sent.json();
    const list = await apiGet(SELF, "/api/mod/reports", mod.idToken);
    expect(list.status).toBe(200);
    const del = await apiPost(SELF, "/api/mod/delete", mod.idToken, { msgId });
    expect((await del.json()).ok).toBe(true);
    const gone = await rtdbOwner(`chat/messages/${msgId}`, "GET");
    expect(gone.json).toBeNull();
  });

  it("server blocklist hides peer by sid", async () => {
    const author = await authSignUp();
    const sent = await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "hi" });
    const { id: msgId } = await sent.json();
    const msg = await rtdbOwner(`chat/messages/${msgId}`, "GET");
    const sid = msg.json.sid;
    const block = await apiPost(SELF, "/api/chat/block", userA.idToken, { msgId });
    expect((await block.json()).ok).toBe(true);
    const cfg = await apiGet(SELF, "/api/chat/config", userA.idToken);
    const cfgJson = await cfg.json();
    expect(cfgJson.blockedSids).toContain(sid);
    expect(isBlocked(Object.fromEntries(cfgJson.blockedSids.map(s => [s, true])), sid)).toBe(true);
  });

  it("retention deletes messages >7d and reports >90d (test clock)", async () => {
    const now = 2_000_000_000_000;
    const oldMsg = await rtdbOwner("chat/messages", "POST", {
      sid: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      name: "O",
      text: "old",
      time: now - 8 * 24 * 60 * 60 * 1000
    });
    const oldMsgId = oldMsg.json?.name;
    const freshMsg = await rtdbOwner("chat/messages", "POST", {
      sid: "cccccccccccccccccccccccccccccccc",
      name: "N",
      text: "new",
      time: now - 1 * 24 * 60 * 60 * 1000
    });
    const freshId = freshMsg.json?.name;

    const oldRep = await rtdbOwner("chat/reports", "POST", {
      msgId: "x",
      time: now - 91 * 24 * 60 * 60 * 1000
    });
    const oldRepId = oldRep.json?.name;
    const newRep = await rtdbOwner("chat/reports", "POST", {
      msgId: "y",
      time: now - 1 * 24 * 60 * 60 * 1000
    });
    const newRepId = newRep.json?.name;

    const testEnv = { ...env, SAFE_CHAT_TEST_NOW_MS: String(now) };
    await runRetentionToCompletion(testEnv, now);

    expect((await rtdbOwner(`chat/messages/${oldMsgId}`, "GET")).json).toBeNull();
    expect((await rtdbOwner(`chat/messages/${freshId}`, "GET")).json?.text).toBe("new");
    expect((await rtdbOwner(`chat/reports/${oldRepId}`, "GET")).json).toBeNull();
    expect((await rtdbOwner(`chat/reports/${newRepId}`, "GET")).json?.msgId).toBe("y");
  });

  it("players level does not affect server chat tier (young account limits)", async () => {
    const u = await authSignUp();
    await rtdbOwner(`players/${u.localId}/level`, "PUT", 9999);
    await rtdbOwner(`players/${u.localId}/name`, "PUT", "TierTest");
    const metaBefore = await rtdbOwner(`chatMeta/${u.localId}`, "GET");
    expect(metaBefore.json?.rateLimitLevel).toBeUndefined();
    const sent = await apiPost(SELF, "/api/chat/send", u.idToken, { phraseId: "gg" });
    expect((await sent.json()).ok).toBe(true);
    const metaAfter = await rtdbOwner(`chatMeta/${u.localId}`, "GET");
    expect(metaAfter.json?.rateLimitLevel).toBeUndefined();
    expect(metaAfter.json?.chatRegisteredAt).toBeTruthy();
  });

  it("delete-my-data completes large own-message sets without client cursor", async () => {
    const u = await authSignUp();
    const sid = (await (await apiGet(SELF, "/api/chat/config", u.idToken)).json()).mySid;
    for (let i = 0; i < 12; i++) {
      await rtdbOwner("chat/messages", "POST", {
        sid,
        name: "B",
        text: `m${i}`,
        time: Date.now() - i
      });
    }
    let complete = false;
    for (let step = 0; step < 5 && !complete; step++) {
      const res = await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {});
      const j = await res.json();
      expect(j.ok).toBe(true);
      complete = j.complete;
    }
    expect(complete).toBe(true);
    const remaining = await rtdbOwner("chat/messages", "GET");
    const own = Object.values(remaining.json || {}).filter(m => m.sid === sid);
    expect(own.length).toBe(0);
  });

  it("uses Auth emulator ID tokens in integration", async () => {
    expect(env.SAFE_CHAT_INTEGRATION).toBe("1");
    const res = await apiPost(SELF, "/api/chat/send", userC.idToken, { phraseId: "street" });
    expect((await res.json()).ok).toBe(true);
  });
});

describe.skipIf(env.SAFE_CHAT_INTEGRATION !== "1")("daily limit (DO)", () => {
  it(
    "rejects after daily limit exceeded",
    async () => {
      expect(env.SAFE_CHAT_DAILY_LIMIT).toBe("2");
      const u = await authSignUp();
      const mature = Date.now() - 10 * 24 * 60 * 60 * 1000;
      await rtdbOwner(`chatMeta/${u.localId}/chatRegisteredAt`, "PUT", mature);
      const wait = () => new Promise(r => setTimeout(r, 3100));
      expect((await (await apiPost(SELF, "/api/chat/send", u.idToken, { phraseId: "gg", name: "D" })).json()).ok).toBe(
        true
      );
      await wait();
      expect((await (await apiPost(SELF, "/api/chat/send", u.idToken, { phraseId: "gg", name: "D" })).json()).ok).toBe(
        true
      );
      await wait();
      const third = await (await apiPost(SELF, "/api/chat/send", u.idToken, { phraseId: "gg", name: "D" })).json();
      expect(third.ok).toBe(false);
      expect(third.error).toBe("daily_limit");
    },
    20000
  );
});
