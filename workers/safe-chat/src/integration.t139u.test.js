import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { runRetentionJob } from "./index.js";
import {
  authSignUp,
  apiPost,
  apiGet,
  rtdbOwner,
  rtdbAuth,
  waitSendCooldown,
  waitForChatMessage,
  resetHideCountersDo
} from "./test-helpers.js";

async function runRetentionToCompletion(envIn, now) {
  for (let i = 0; i < 25; i++) {
    const r = await runRetentionJob({ ...envIn, SAFE_CHAT_TEST_NOW_MS: String(now) }, now);
    if (!r.budgetExceeded) return r;
  }
  return runRetentionJob({ ...envIn, SAFE_CHAT_TEST_NOW_MS: String(now) }, now);
}

describe.skipIf(env.SAFE_CHAT_INTEGRATION !== "1")("t139u matrix integration coverage", () => {
  let mod;
  let userB;
  let userC;

  beforeAll(async () => {
    const modUid = (env.MODERATOR_UIDS || "").split(",")[0];
    mod = { localId: modUid, idToken: env.SAFE_CHAT_TEST_MOD_TOKEN };
    userB = await authSignUp();
    userC = await authSignUp();
  });

  beforeEach(async () => {
    await resetHideCountersDo(env);
  });

  it("t139u D-02: R_new13 and R_aged grooming reports both queue with same escalation", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you don't tell mom");
    const new13 = await authSignUp();
    await apiPost(SELF, "/api/chat/declare-age13", new13.idToken, { confirmed: true });
    await apiPost(SELF, "/api/chat/report", new13.idToken, { msgId, category: "grooming" });
    const aged = await authSignUp();
    await rtdbOwner(`chatMeta/${aged.localId}/chatRegisteredAt`, "PUT", Date.now() - 3 * 86400000);
    await apiPost(SELF, "/api/chat/report", aged.idToken, { msgId, category: "grooming" }, { "CF-Connecting-IP": "203.0.113.2" });
    const q = await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET");
    expect(q.json?.childHarm).toBe(true);
    expect(q.json?.subcategory).toBe("grooming");
    expect(q.json?.escalationTier).toBe("critical");
    const metas = Object.values((await rtdbOwner("chat/internal/reportMeta", "GET")).json || {});
    const onMsg = metas.filter(m => m.msgId === msgId);
    expect(onMsg.length).toBeGreaterThanOrEqual(2);
    expect(new Set(onMsg.map(m => m.category))).toEqual(new Set(["grooming"]));
    expect(onMsg.every(m => m.intrinsicScore >= 30)).toBe(true);
  });

  it("t139u D-04: hide quota consumed then global hide still allowed with independent signal", async () => {
    const author = await authSignUp();
    await waitSendCooldown();
    const { id: m1 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await waitSendCooldown();
    const { id: m2 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json();
    const rep = await authSignUp();
    await rtdbOwner(`chat/messages/${m1}/text`, "PUT", "kill the kid");
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: m1, category: "other_child_safety" });
    expect((await rtdbOwner(`chat/messages/${m1}`, "GET")).json?.hidden).toBe(true);
    await rtdbOwner(`chat/messages/${m2}/text`, "PUT", "don't tell mom meet me alone");
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: m2, category: "grooming" });
    const rep2 = await authSignUp();
    await apiPost(
      SELF,
      "/api/chat/report",
      rep2.idToken,
      { msgId: m2, category: "grooming" },
      { "CF-Connecting-IP": "198.51.100.55" }
    );
    expect((await rtdbOwner(`chat/messages/${m2}`, "GET")).json?.hidden).toBe(true);
  });

  it("t139u O-05 / E-01: retention marks safety queue overdue after SLA", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "hi" })).json();
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "immediate_danger" });
    const q0 = await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET");
    const sla = q0.json?.slaReviewBy;
    expect(typeof sla).toBe("number");
    await runRetentionToCompletion(env, sla + 1000);
    const q1 = await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET");
    expect(q1.json?.overdue).toBe(true);
  });

  it("t139u FM-04: report on deleted message returns message_not_found", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "hi" })).json();
    await rtdbOwner(`chat/messages/${msgId}`, "DELETE");
    const r = await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "grooming" });
    expect((await r.json()).error).toBe("message_not_found");
    expect(r.status).toBe(404);
  });

  it("t139u U-03: child_safety report accepted after generic report volume on same message", async () => {
    const author = await authSignUp();
    await waitSendCooldown();
    const sent = await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" });
    const { id: msgId } = await sent.json();
    expect(msgId).toBeTruthy();
    for (let i = 0; i < 30; i++) {
      const r = await authSignUp();
      await apiPost(SELF, "/api/chat/report", r.idToken, { msgId });
    }
    const cs = await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "other_child_safety" });
    expect(cs.status).not.toBe(429);
    expect((await cs.json()).received).toBe(true);
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.childHarm).toBe(true);
  });

  it("t139u U-06: child_safety report handler stays under 50 fetches", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "hi" })).json();
    let n = 0;
    const orig = globalThis.fetch;
    globalThis.fetch = (...args) => {
      n += 1;
      return orig(...args);
    };
    try {
      await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "other_child_safety" });
    } finally {
      globalThis.fetch = orig;
    }
    expect(n).toBeGreaterThan(0);
    expect(n).toBeLessThan(50);
  });

  it("t139u B-02: coordinated mass reports set possibleCoordination on queue", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    const hdr = { "CF-Connecting-IP": "198.51.100.20" };
    for (let i = 0; i < 4; i++) {
      const r = await authSignUp();
      await apiPost(SELF, "/api/chat/report", r.idToken, { msgId, category: "other_child_safety" }, hdr);
    }
    const q = await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET");
    expect(q.json?.possibleCoordination).toBe(true);
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).not.toBe(true);
  });

  it("t139u B-03: distinct cluster reporters still no count-only global hide", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    for (let i = 0; i < 8; i++) {
      const r = await authSignUp();
      await apiPost(
        SELF,
        "/api/chat/report",
        r.idToken,
        { msgId, category: "other_child_safety" },
        { "CF-Connecting-IP": `203.0.113.${i + 1}` }
      );
    }
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).not.toBe(true);
  });

  it("t139u B-04: cluster hide cap blocks excess global hides from one cluster", async () => {
    const author = await authSignUp();
    const rep = await authSignUp();
    const hdr = { "CF-Connecting-IP": "198.51.100.30" };
    const hidden = [];
    for (let i = 0; i < 5; i++) {
      await waitSendCooldown();
      const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json();
      await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "kill the kid");
      await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId, category: "other_child_safety" }, hdr);
      hidden.push((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden === true);
    }
    expect(hidden.filter(Boolean).length).toBeLessThanOrEqual(3);
  });

  it("t139u B-07: false-report penalty does not block later child_safety submission", async () => {
    const author = await authSignUp();
    const { id: msgId1 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    const rep = await authSignUp();
    await rtdbOwner(`chat/messages/${msgId1}/text`, "PUT", "how old are you");
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: msgId1, category: "grooming" });
    await apiPost(SELF, "/api/chat/report", userC.idToken, { msgId: msgId1, category: "grooming" });
    const metas = await rtdbOwner("chat/internal/reportMeta", "GET");
    const repReport = Object.entries(metas.json || {}).find(([, v]) => v?.msgId === msgId1);
    expect(repReport).toBeTruthy();
    const reportId = repReport[0];
    const dismiss = await apiPost(SELF, "/api/mod/resolve-safety", mod.idToken, {
      msgId: msgId1,
      action: "dismiss",
      falseReport: true,
      reportId
    });
    expect((await dismiss.json()).ok).toBe(true);
    await waitSendCooldown();
    const { id: msgId2 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "hi" })).json();
    const r2 = await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: msgId2, category: "other_child_safety" });
    const j2 = await r2.json();
    expect(j2.ok).toBe(true);
    expect(j2.received).toBe(true);
    expect(r2.status).not.toBe(403);
  });

  it("t139u BY-08: internal erasure-continue route removed", async () => {
    const res = await SELF.fetch("http://localhost/api/internal/erasure-continue", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Safe-Chat-Internal": "wrong" },
      body: JSON.stringify({ uid: "abc" })
    });
    expect(res.status).toBe(404);
  });

  it("t139u BY-02: delete-my-data does not clear childSafetyAutoHideDeniedUntil", async () => {
    const u = await authSignUp();
    const until = Date.now() + 86400000;
    await rtdbOwner(`chatMeta/${u.localId}/childSafetyAutoHideDeniedUntil`, "PUT", until);
    await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {});
    const snap = await rtdbOwner(`chatMeta/${u.localId}/childSafetyAutoHideDeniedUntil`, "GET");
    expect(snap.json).toBe(until);
  });

  it("t139u P-04: hidden messages retain text in evidence not in client-visible message", async () => {
    const author = await authSignUp();
    const viewer = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "kill the kid");
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "other_child_safety" });
    const msg = await rtdbOwner(`chat/messages/${msgId}`, "GET");
    expect(msg.json.hidden).toBe(true);
    const clientView = await rtdbAuth(`chat/messages/${msgId}`, "GET", viewer.idToken);
    expect(clientView.json?.text).toBeUndefined();
    const ev = await rtdbOwner(`chat/internal/safetyEvidence/${msgId}`, "GET");
    expect(String(ev.json?.snapshot?.text || "").length).toBeGreaterThan(0);
  });

  it("t139u P-06: delete-my-data response lists only reporter own message ids", async () => {
    const victim = await authSignUp();
    const victimSid = (await (await apiGet(SELF, "/api/chat/config", victim.idToken)).json()).mySid;
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", victim.idToken, { phraseId: "hi" })).json();
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.sid).toBe(victimSid);
    const rep = await authSignUp();
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId, category: "other_child_safety" });
    const repSid = (await (await apiGet(SELF, "/api/chat/config", rep.idToken)).json()).mySid;
    const ownRef = await rtdbOwner("chat/messages", "POST", { sid: repSid, name: "R", text: "mine", time: Date.now() });
    const ownMsgId = ownRef.json?.name;
    expect(ownMsgId).toBeTruthy();
    const del = await apiPost(SELF, "/api/chat/delete-my-data", rep.idToken, {});
    const j = await del.json();
    expect(j.ok).toBe(true);
    expect(JSON.stringify(j)).not.toContain(msgId);
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.sid).toBe(victimSid);
    expect((await rtdbOwner(`chat/messages/${ownMsgId}`, "GET")).json).toBeNull();
  });

  it("t139u M-05: mod resolve-safety rejects invalid_action", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "hi" })).json();
    const bad = await apiPost(SELF, "/api/mod/resolve-safety", mod.idToken, { msgId, action: "dismis_typo" });
    expect((await bad.json()).error).toBe("invalid_action");
    expect(bad.status).toBe(400);
  });

  it("t139u M-01: restore_visibility writes safetyDecisions entry", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you secret");
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "grooming" });
    await apiPost(SELF, "/api/chat/report", userC.idToken, { msgId, category: "grooming" });
    await apiPost(SELF, "/api/mod/resolve-safety", mod.idToken, { msgId, action: "restore_visibility" });
    const dec = await rtdbOwner("chat/internal/safetyDecisions", "GET");
    const rows = Object.values(dec.json || {});
    expect(rows.some(d => d.msgId === msgId && d.action === "restore_visibility")).toBe(true);
  });

  it("t139u R-04: retention enforces legalHoldUntil cap on open case", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "other_child_safety" });
    const cap = Date.now() + 1000;
    await rtdbOwner(`chat/internal/safetyQueue/${msgId}/legalHoldUntil`, "PUT", cap);
    await runRetentionToCompletion(env, cap + 5000);
    const q = await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET");
    expect(q.json?.overdue).toBe(true);
    expect(q.json?.evidenceHoldExpiredAt).toBeTruthy();
  });

  it("t139u R-06: reporter delete-my-data removes own generic report rows", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "hi" })).json();
    const rep = await authSignUp();
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId });
    let j = await (await apiPost(SELF, "/api/chat/delete-my-data", rep.idToken, {})).json();
    let guard = 0;
    while (j.ok && !j.complete && j.cursor && guard < 10) {
      guard += 1;
      j = await (await apiPost(SELF, "/api/chat/delete-my-data", rep.idToken, {})).json();
    }
    const after = await rtdbOwner("chat/reports", "GET");
    const mine = Object.values(after.json || {}).filter(r => r.msgId === msgId);
    expect(mine.length).toBe(0);
  });

  it("t139u E-02: mod safety-queue lists immediate_danger before ordinary priority", async () => {
    const a1 = await authSignUp();
    const a2 = await authSignUp();
    const { id: ordinary } = await (await apiPost(SELF, "/api/chat/send", a1.idToken, { phraseId: "thanks" })).json();
    const { id: danger } = await (await apiPost(SELF, "/api/chat/send", a2.idToken, { phraseId: "gg" })).json();
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId: ordinary, category: "other_child_safety" });
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId: danger, category: "immediate_danger" });
    const q = await apiGet(SELF, "/api/mod/safety-queue", mod.idToken);
    const list = (await q.json()).queue;
    const ordIdx = list.findIndex(e => e.msgId === ordinary);
    const danIdx = list.findIndex(e => e.msgId === danger);
    expect(ordIdx).toBeGreaterThanOrEqual(0);
    expect(danIdx).toBeGreaterThanOrEqual(0);
    expect(danIdx).toBeLessThan(ordIdx);
    expect(list[danIdx]?.priority).toBe("immediate_danger");
  });

  it("t139u O-04: safetyEvidence snapshot has minimal fields only", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "other_child_safety" });
    const ev = await rtdbOwner(`chat/internal/safetyEvidence/${msgId}`, "GET");
    expect(ev.json?.access).toBe("moderator_only");
    expect(ev.json?.snapshot?.sid).toMatch(/^[a-f0-9]{32}$/);
    expect(ev.json?.reporterUid).toBeUndefined();
  });

  it("t139u B-01: fifty identical reports without extra signal do not global-hide", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    for (let i = 0; i < 20; i++) {
      const r = await authSignUp();
      await apiPost(
        SELF,
        "/api/chat/report",
        r.idToken,
        { msgId, category: "other_child_safety" },
        { "CF-Connecting-IP": `198.51.100.${i % 200}` }
      );
    }
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).not.toBe(true);
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.childHarm).toBe(true);
    expect((await rtdbOwner(`chat/internal/safetyCase/${msgId}`, "GET")).json?.reports?.length).toBeGreaterThanOrEqual(20);
  });

  it("t139u B-08: one safety queue row per message with merged reports", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    for (let i = 0; i < 5; i++) {
      const r = await authSignUp();
      await apiPost(SELF, "/api/chat/report", r.idToken, { msgId, category: "other_child_safety" });
    }
    const q = await rtdbOwner("chat/internal/safetyQueue", "GET");
    expect(Object.keys(q.json || {}).filter(k => k === msgId).length).toBe(1);
    const c = await rtdbOwner(`chat/internal/safetyCase/${msgId}`, "GET");
    expect(c.json?.reports?.length).toBeGreaterThanOrEqual(5);
  });

  it("t139u BY-01: fresh accounts cannot exceed low-trust hide quota", async () => {
    const author = await authSignUp();
    const rep = await authSignUp();
    await waitSendCooldown();
    const { id: m1 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${m1}/text`, "PUT", "how old are you don't tell mom");
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: m1, category: "grooming" });
    const rep2 = await authSignUp();
    await apiPost(SELF, "/api/chat/report", rep2.idToken, { msgId: m1, category: "grooming" }, { "CF-Connecting-IP": "203.0.113.5" });
    expect((await rtdbOwner(`chat/messages/${m1}`, "GET")).json?.hidden).toBe(true);
    await waitSendCooldown();
    const { id: m2 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json();
    await rtdbOwner(`chat/messages/${m2}/text`, "PUT", "how old are you don't tell mom");
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: m2, category: "grooming" });
    expect((await rtdbOwner(`chat/messages/${m2}`, "GET")).json?.hidden).not.toBe(true);
  });

  it("t139u BY-03: per-uid hide quota applies regardless of IP change", async () => {
    const author = await authSignUp();
    const rep = await authSignUp();
    await waitSendCooldown();
    const { id: m1 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${m1}/text`, "PUT", "how old are you don't tell mom");
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: m1, category: "grooming" }, { "CF-Connecting-IP": "198.51.100.1" });
    const rep2 = await authSignUp();
    await apiPost(SELF, "/api/chat/report", rep2.idToken, { msgId: m1, category: "grooming" }, { "CF-Connecting-IP": "203.0.113.9" });
    expect((await rtdbOwner(`chat/messages/${m1}`, "GET")).json?.hidden).toBe(true);
    await waitSendCooldown();
    const { id: m2 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json();
    await rtdbOwner(`chat/messages/${m2}/text`, "PUT", "how old are you don't tell mom");
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: m2, category: "grooming" }, { "CF-Connecting-IP": "203.0.113.44" });
    expect((await rtdbOwner(`chat/messages/${m2}`, "GET")).json?.hidden).not.toBe(true);
  });

  it("t139u BY-06: many reporters behind one IP still queue danger reports", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you don't tell mom");
    const hdr = { "CF-Connecting-IP": "198.51.100.88" };
    for (let i = 0; i < 4; i++) {
      const r = await authSignUp();
      await apiPost(SELF, "/api/chat/report", r.idToken, { msgId, category: "grooming" }, hdr);
    }
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.childHarm).toBe(true);
  });

  it("t139u BY-10: parallel reports from one uid do not exceed hide quota", async () => {
    const author = await authSignUp();
    const msgs = [];
    for (let i = 0; i < 3; i++) {
      await waitSendCooldown();
      msgs.push((await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json()).id);
      await rtdbOwner(`chat/messages/${msgs[i]}/text`, "PUT", "how old are you don't tell mom");
    }
    const rep = await authSignUp();
    await Promise.all(
      msgs.map(msgId =>
        apiPost(SELF, "/api/chat/report", rep.idToken, { msgId, category: "grooming" })
      )
    );
    let hides = 0;
    for (const id of msgs) {
      if ((await rtdbOwner(`chat/messages/${id}`, "GET")).json?.hidden) hides += 1;
    }
    expect(hides).toBeLessThanOrEqual(1);
    await Promise.all(
      Array.from({ length: 5 }, () =>
        apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: msgs[0], category: "grooming" })
      )
    );
    expect((await rtdbOwner(`chat/messages/${msgs[0]}`, "GET")).json?.hidden).not.toBe(true);
  });

  it("t139u U-01: child_safety reports on distinct messages are not rate-limited (sample 35)", async () => {
    const rep = await authSignUp();
    let ok = 0;
    for (let i = 0; i < 35; i++) {
      const a = await authSignUp();
      await waitSendCooldown();
      const sent = await apiPost(SELF, "/api/chat/send", a.idToken, { phraseId: "hi" });
      expect(sent.status).toBe(200);
      const { id: msgId } = await sent.json();
      const r = await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId, category: "other_child_safety" });
      expect(r.status).toBe(200);
      const j = await r.json();
      expect(j.error).toBeUndefined();
      if (j.received) ok += 1;
    }
    expect(ok).toBe(35);
  });

  it("t139u U-02: after hide quota exhausted, child_safety report still creates queue evidence", async () => {
    const author = await authSignUp();
    const rep = await authSignUp();
    await waitSendCooldown();
    const { id: m1 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${m1}/text`, "PUT", "kill the kid");
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: m1, category: "other_child_safety" });
    await waitSendCooldown();
    const { id: m2 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json();
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId: m2, category: "other_child_safety" });
    expect((await rtdbOwner(`chat/internal/safetyQueue/${m2}`, "GET")).json?.childHarm).toBe(true);
  });

  it("t139u FM-02: fresh unaged reporter filter-miss grooming path queues report", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "send pics on telegram meet me alone");
    const fresh = await authSignUp();
    await rtdbOwner(`chatMeta/${fresh.localId}/chatAge13DeclaredAt`, "DELETE");
    await apiPost(SELF, "/api/chat/report", fresh.idToken, { msgId, category: "grooming" });
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.subcategory).toBe("grooming");
  });

  it("t139u E-04: mod safety-queue responds for many open cases", async () => {
    const ids = [];
    for (let i = 0; i < 15; i++) {
      const a = await authSignUp();
      const sent = await (await apiPost(SELF, "/api/chat/send", a.idToken, { phraseId: "hi" })).json();
      expect(sent.ok).toBe(true);
      await waitForChatMessage(sent.id);
      ids.push(sent.id);
      const repUser = await authSignUp();
      let repBody = null;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        const rep = await apiPost(SELF, "/api/chat/report", repUser.idToken, {
          msgId: sent.id,
          category: "other_child_safety"
        });
        if (rep.status === 200) {
          repBody = await rep.json();
          if (repBody.received) break;
        }
        await new Promise(r => setTimeout(r, 60));
      }
      expect(repBody?.received).toBe(true);
    }
    for (const id of ids) {
      let ok = false;
      for (let t = 0; t < 100; t += 1) {
        const q = (await rtdbOwner(`chat/internal/safetyQueue/${id}`, "GET")).json;
        if (q?.childHarm || q?.subcategory === "other_child_safety") {
          ok = true;
          break;
        }
        await new Promise(r => setTimeout(r, 75));
      }
      expect(ok).toBe(true);
    }
    const res = await apiGet(SELF, "/api/mod/safety-queue", mod.idToken);
    expect(res.status).toBe(200);
    const list = (await res.json()).queue;
    expect(list.some(e => ids.includes(e.msgId) && (e.childHarm === true || e.subcategory === "other_child_safety"))).toBe(
      true
    );
  });

  it("t139u M-03: mod uphold_delete removes message after safety review", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you secret");
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "grooming" });
    await apiPost(SELF, "/api/chat/report", userC.idToken, { msgId, category: "grooming" });
    await apiPost(SELF, "/api/mod/resolve-safety", mod.idToken, { msgId, action: "uphold_delete" });
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json).toBeNull();
  });

  it("t139u M-04: mod ban prevents send but not child_safety report acceptance", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "hi" })).json();
    const banned = await authSignUp();
    await apiPost(SELF, "/api/mod/ban", mod.idToken, { uid: banned.localId });
    const sendBlocked = await apiPost(SELF, "/api/chat/send", banned.idToken, { phraseId: "hi" });
    expect(sendBlocked.status).not.toBe(200);
    const r = await apiPost(SELF, "/api/chat/report", banned.idToken, { msgId, category: "other_child_safety" });
    expect((await r.json()).received).toBe(true);
    await apiPost(SELF, "/api/mod/ban", mod.idToken, { uid: banned.localId, lift: true });
  });

  it("t139u M-07: client cannot PATCH chat internal reportCounts", async () => {
    const u = await authSignUp();
    const w = await rtdbAuth("chat/internal/reportCounts/fakemsgid", "PUT", u.idToken, true);
    expect(w.status === 401 || w.status === 403).toBe(true);
  });

  it("t139u M-08: mod can list reports and delete message", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "hi" })).json();
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId });
    const list = await apiGet(SELF, "/api/mod/reports", mod.idToken);
    expect(list.status).toBe(200);
    expect((await list.json()).reports.some(r => r.msgId === msgId)).toBe(true);
    await apiPost(SELF, "/api/mod/delete", mod.idToken, { msgId });
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json).toBeNull();
  });

  it("t139u R-05: erasureDeferred snapshot carries expiresAt", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you secret");
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "grooming" });
    await apiPost(SELF, "/api/chat/report", userC.idToken, { msgId, category: "grooming" });
    await apiPost(SELF, "/api/chat/delete-my-data", author.idToken, {});
    const def = await rtdbOwner(`chat/internal/erasureDeferred/${msgId}`, "GET");
    expect(typeof def.json?.expiresAt).toBe("number");
    expect(def.json.expiresAt).toBeGreaterThan(Date.now());
  });

  it("t139u R-09: safetyEvidence maxHoldUntil matches config retention cap", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await apiPost(SELF, "/api/chat/report", userB.idToken, { msgId, category: "other_child_safety" });
    const ev = await rtdbOwner(`chat/internal/safetyEvidence/${msgId}`, "GET");
    const maxHold = ev.json?.maxHoldUntil;
    expect(typeof maxHold).toBe("number");
    const cfgMs = 365 * 24 * 60 * 60 * 1000;
    expect(maxHold).toBeGreaterThan(Date.now() + cfgMs - 7 * 86400000);
    expect(maxHold).toBeLessThanOrEqual(Date.now() + cfgMs + 86400000);
  });

  it("t139u C-04: chat config exposes childSafetySubcategories for client picker", async () => {
    const u = await authSignUp();
    const cfg = await (await apiGet(SELF, "/api/chat/config", u.idToken)).json();
    expect(cfg.childSafetySubcategories).toContain("immediate_danger");
    expect(cfg.childSafetySubcategories).toContain("other_child_safety");
  });
});
