import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { runSlaOverdueJob, runErasureQueueJob } from "./index.js";
import { loadConfig } from "./config.js";
import { runUserErasureBatch } from "./erasure.js";
import { persistJobAfterBatch } from "./erasure-jobs.js";
import { getCachedAdminToken } from "./admin-token.integration.js";
import {
  authSignUp,
  apiPost,
  apiGet,
  rtdbOwner,
  rtdbAuth,
  waitSendCooldown,
  resetHideCountersDo,
  putChatMessageText,
  apiPostReport,
  waitForChatMessage,
  apiSend
} from "./test-helpers.js";

describe.skipIf(env.SAFE_CHAT_INTEGRATION !== "1")("t139u protective mechanisms (must fail if disabled)", () => {
  beforeEach(async () => {
    await resetHideCountersDo(env);
  });
  it("PROTECT hide quota: second discretionary global hide on new messages is blocked", async () => {
    const author = await authSignUp();
    const repA = await authSignUp();
    const repB = await authSignUp();
    await waitSendCooldown();
    const { id: m1 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await putChatMessageText(`${m1}`, "how old are you don't tell mom");
    await apiPostReport(SELF, repA.idToken, { msgId: m1, category: "grooming" });
    await apiPostReport(SELF, repB.idToken,
      { msgId: m1, category: "grooming" },
      { "CF-Connecting-IP": "203.0.113.10" });
    expect((await rtdbOwner(`chat/messages/${m1}`, "GET")).json?.hidden).toBe(true);

    await waitSendCooldown();
    const { id: m2 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json();
    await putChatMessageText(`${m2}`, "how old are you don't tell mom");
    await apiPostReport(SELF, repA.idToken, { msgId: m2, category: "grooming" });
    await apiPostReport(SELF, repB.idToken,
      { msgId: m2, category: "grooming" },
      { "CF-Connecting-IP": "203.0.113.11" });
    expect((await rtdbOwner(`chat/messages/${m2}`, "GET")).json?.hidden).not.toBe(true);
  });

  it("PROTECT cluster cap: fourth global hide from same cluster IP is blocked", async () => {
    await resetHideCountersDo(env);
    const author = await authSignUp();
    const sid = (await (await apiGet(SELF, "/api/chat/config", author.idToken)).json()).mySid;
    const clusterHdr = { "CF-Connecting-IP": "203.0.113.55" };
    const otherHdr = { "CF-Connecting-IP": "203.0.113.56" };
    const msgIds = [];
    for (let i = 0; i < 4; i++) {
      const ref = await rtdbOwner("chat/messages", "POST", {
        sid,
        name: "Cap",
        text: "how old are you don't tell mom",
        time: Date.now() + i * 1000
      });
      const msgId = ref.json?.name;
      expect(msgId).toBeTruthy();
      await waitForChatMessage(msgId);
      msgIds.push(msgId);
    }
    for (let i = 0; i < 3; i++) {
      const msgId = msgIds[i];
      expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.sid).toBe(sid);
      const repA = await authSignUp();
      const repB = await authSignUp();
      await rtdbOwner(`chatMeta/${repB.localId}/chatRegisteredAt`, "PUT", Date.now() - 3 * 86400000);
      await rtdbOwner(`chatMeta/${repB.localId}/chatSendCount`, "PUT", 12);
      const r1 = await apiPostReport(SELF, repA.idToken, { msgId, category: "grooming" });
      expect(r1.status).toBe(200);
      const r2 = await apiPostReport(SELF, repB.idToken, { msgId, category: "grooming" }, clusterHdr);
      expect(r2.status).toBe(200);
      expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).toBe(true);
    }
    const m4 = msgIds[3];
    const repA4 = await authSignUp();
    const repB4 = await authSignUp();
    await rtdbOwner(`chatMeta/${repB4.localId}/chatRegisteredAt`, "PUT", Date.now() - 3 * 86400000);
    await rtdbOwner(`chatMeta/${repB4.localId}/chatSendCount`, "PUT", 12);
    await apiPostReport(SELF, repA4.idToken, { msgId: m4, category: "grooming" }, otherHdr);
    await apiPostReport(SELF, repB4.idToken, { msgId: m4, category: "grooming" }, clusterHdr);
    expect((await rtdbOwner(`chat/messages/${m4}`, "GET")).json?.hidden).not.toBe(true);
    expect((await rtdbOwner(`chat/internal/safetyQueue/${m4}`, "GET")).json?.hideSkipReason).toBe(
      "cluster_hide_cap"
    );
  }, 120000);

  it("PROTECT global hide gate: single reporter cannot globally hide grooming preset alone", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await putChatMessageText(`${msgId}`, "how old are you");
    const rep = await authSignUp();
    await apiPostReport(SELF, rep.idToken, { msgId, category: "grooming" });
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).not.toBe(true);
  });

  it("PROTECT P-04: globally hidden message text is not readable by another client", async () => {
    const author = await authSignUp();
    const viewer = await authSignUp();
    const { j: sent } = await apiSend(SELF, author.idToken, { phraseId: "thanks" });
    const msgId = sent.id;
    await putChatMessageText(`${msgId}`, "kill the kid", { skipWait: true });
    const rep = await authSignUp();
    await apiPostReport(SELF, rep.idToken, { msgId, category: "other_child_safety" });
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).toBe(true);
    const clientView = await rtdbAuth(`chat/messages/${msgId}`, "GET", viewer.idToken);
    expect(clientView.json?.text).toBeUndefined();
    expect(clientView.json?.textRedacted).toBe(true);
    const ev = await rtdbAuth(`chat/internal/safetyEvidence/${msgId}`, "GET", viewer.idToken);
    expect(ev.status === 401 || ev.status === 403).toBe(true);
  });

  it("PROTECT brigading: coordinated mass reports set possibleCoordination", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    const hdr = { "CF-Connecting-IP": "198.51.100.42" };
    for (let i = 0; i < 4; i++) {
      const r = await authSignUp();
      await apiPostReport(SELF, r.idToken, { msgId, category: "other_child_safety" }, hdr);
    }
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.possibleCoordination).toBe(true);
  });

  it("PROTECT false-report penalty: dismiss with falseReport sets reporterAutoHideDenied", async () => {
    const modUid = (env.MODERATOR_UIDS || "").split(",")[0];
    const modToken = env.SAFE_CHAT_TEST_MOD_TOKEN;
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await putChatMessageText(`${msgId}`, "how old are you");
    const rep = await authSignUp();
    await apiPostReport(SELF, rep.idToken, { msgId, category: "grooming" });
    const rep2 = await authSignUp();
    await apiPostReport(SELF, rep2.idToken, { msgId, category: "grooming" });
    const metas = await rtdbOwner("chat/internal/reportMeta", "GET");
    const repReport = Object.entries(metas.json || {}).find(([, v]) => v?.msgId === msgId);
    expect(repReport).toBeTruthy();
    await apiPost(SELF, "/api/mod/resolve-safety", modToken, {
      msgId,
      action: "dismiss",
      falseReport: true,
      reportId: repReport[0]
    });
    const denied = await rtdbOwner(`chat/internal/reporterAutoHideDenied/${repReport[1].reporterHash}`, "GET");
    expect(typeof denied.json).toBe("number");
    expect(denied.json).toBeGreaterThan(Date.now());
  });

  it("PROTECT reporter privacy: child_safety report JSON exposes no case or target fields", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    const rep = await authSignUp();
    const r = await apiPostReport(SELF, rep.idToken, { msgId, category: "violence_threat" });
    const j = await r.json();
    expect(j.received).toBe(true);
    expect(j.msgId).toBeUndefined();
    expect(j.queuePriority).toBeUndefined();
    expect(j.escalationTier).toBeUndefined();
    expect(j.evidence).toBeUndefined();
  });

  it("PROTECT maxHold: retention escalates when maxHoldUntil is in the past", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    const rep = await authSignUp();
    await apiPostReport(SELF, rep.idToken, { msgId, category: "other_child_safety" });
    const rep2 = await authSignUp();
    await apiPostReport(SELF, rep2.idToken,
      { msgId, category: "other_child_safety" },
      { "CF-Connecting-IP": "203.0.113.88" });
    const cap = Date.now() + 500;
    await rtdbOwner(`chat/internal/safetyEvidence/${msgId}/maxHoldUntil`, "PUT", cap);
    await rtdbOwner(`chat/internal/safetyQueue/${msgId}/legalHoldUntil`, "PUT", cap);
    const { runRetentionJob } = await import("./index.js");
    await runRetentionJob({ ...env, SAFE_CHAT_TEST_NOW_MS: String(cap + 5000), SAFE_CHAT_RETENTION_BATCH: "120" }, cap + 5000);
    const q = await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET");
    expect(q.json?.overdue).toBe(true);
    expect(q.json?.evidenceHoldExpiredAt).toBeTruthy();
    const decisions = await rtdbOwner("chat/internal/safetyDecisions", "GET");
    const actions = Object.values(decisions.json || {}).map(d => d?.action);
    expect(actions).toContain("evidence_hold_expired");
  });

  it("PROTECT erasure budget: runUserErasureBatch stops with budgetExceeded", async () => {
    const u = await authSignUp();
    const sid = (await (await apiGet(SELF, "/api/chat/config", u.idToken)).json()).mySid;
    for (let i = 0; i < 80; i++) {
      await rtdbOwner("chat/messages", "POST", { sid, name: "E", text: `e${i}`, time: Date.now() + i });
    }
    const testEnv = { ...env, SAFE_CHAT_ERASURE_MAX_SUBREQUESTS: "12" };
    const token = await getCachedAdminToken(testEnv);
    const config = loadConfig(testEnv);
    const out = await runUserErasureBatch({
      config,
      env: testEnv,
      token,
      authUid: u.localId,
      sid,
      now: Date.now(),
      storedCursor: null,
      budget: config.erasureMaxSubrequests
    });
    expect(out.budgetExceeded).toBe(true);
    expect(out.complete).not.toBe(true);
    expect(out.subrequests).toBeLessThanOrEqual(12);
  });

  it("PROTECT erasure continuation: cron queue drains a partial delete-my-data job", async () => {
    const u = await authSignUp();
    const sid = (await (await apiGet(SELF, "/api/chat/config", u.idToken)).json()).mySid;
    for (let i = 0; i < 30; i++) {
      await rtdbOwner("chat/messages", "POST", { sid, name: "E", text: `e${i}`, time: Date.now() + i });
    }
    const first = await (await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {})).json();
    expect(first.status).toBe("queued");
    const hop = await runErasureQueueJob(env);
    expect(hop.processed).toBe(1);
    expect(hop.subrequests).toBeGreaterThan(0);
  });

  it("PROTECT erasure with safety hold: parks complete_with_holds and clears non-hold meta", async () => {
    const author = await authSignUp();
    await waitSendCooldown();
    const { id: msgId } = await (
      await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })
    ).json();
    await putChatMessageText(`${msgId}`, "kill the kid");
    await apiPostReport(SELF, author.idToken, { msgId, category: "immediate_danger" });
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.childHarm).toBe(true);
    const token = await getCachedAdminToken(env);
    const config = loadConfig(env);
    const sid = (await (await apiGet(SELF, "/api/chat/config", author.idToken)).json()).mySid;
    const out = await runUserErasureBatch({
      config,
      env,
      token,
      authUid: author.localId,
      sid,
      now: Date.now(),
      storedCursor: null,
      budget: config.erasureMaxSubrequests
    });
    expect(out.completeWithHolds || out.status === "complete_with_holds").toBe(true);
    await persistJobAfterBatch(env, author.localId, out, null, Date.now());
    expect((await rtdbOwner(`chatMeta/${author.localId}/erasureJobStartedAt`, "GET")).json).toBeNull();
    expect((await rtdbOwner(`chatMeta/${author.localId}/chatSendCount`, "GET")).json).toBeNull();
    expect((await rtdbOwner(`chatMeta/${author.localId}/lastErasureRequestAt`, "GET")).json).toBeNull();
  });

  it("PROTECT GEN-SNAP: generic auto-hide snapshot allows restore_visibility text", async () => {
    const modToken = env.SAFE_CHAT_TEST_MOD_TOKEN;
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json();
    await putChatMessageText(`${msgId}`, "restore me please");
    for (let i = 0; i < 3; i++) {
      const r = await authSignUp();
      await apiPostReport(SELF, r.idToken, { msgId, category: "generic" });
    }
    expect((await rtdbOwner(`chat/messages/${msgId}/text`, "GET")).json).toBeNull();
    await apiPost(SELF, "/api/mod/resolve-safety", modToken, { msgId, action: "restore_visibility" });
    expect((await rtdbOwner(`chat/messages/${msgId}/text`, "GET")).json).toBe("restore me please");
  });

  it("PROTECT EV-SNAP: second child_safety report keeps evidence snapshot text", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (
      await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })
    ).json();
    await putChatMessageText(`${msgId}`, "kill the kid");
    const rep1 = await authSignUp();
    const rep2 = await authSignUp();
    await apiPostReport(SELF, rep1.idToken, { msgId, category: "other_child_safety" });
    await apiPostReport(SELF, rep2.idToken,
      { msgId, category: "other_child_safety" },
      { "CF-Connecting-IP": "203.0.113.77" });
    expect((await rtdbOwner(`chat/internal/safetyEvidence/${msgId}`, "GET")).json?.snapshot?.text).toContain(
      "kill"
    );
    const rep3 = await authSignUp();
    await apiPostReport(SELF, rep3.idToken, { msgId, category: "other_child_safety" });
    expect((await rtdbOwner(`chat/internal/safetyEvidence/${msgId}`, "GET")).json?.snapshot?.text).toContain(
      "kill"
    );
  });

  it("PROTECT P-04g: generic auto-hide redacts message text for other clients", async () => {
    const author = await authSignUp();
    const viewer = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json();
    for (let i = 0; i < 3; i++) {
      const r = await authSignUp();
      await apiPostReport(SELF, r.idToken, { msgId, category: "generic" });
    }
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).toBe(true);
    const clientView = await rtdbAuth(`chat/messages/${msgId}`, "GET", viewer.idToken);
    expect(clientView.json?.text).toBeUndefined();
    expect(clientView.json?.textRedacted).toBe(true);
  });

  it("PROTECT O-03: benign preset other_child_safety does not global-hide without corroboration", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    const rep = await authSignUp();
    await apiPostReport(SELF, rep.idToken, { msgId, category: "other_child_safety" });
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).not.toBe(true);
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.intrinsicRisk).toBeLessThan(50);
  });

  it("PROTECT E-05: runSlaOverdueJob marks overdue at configured SLA boundary", async () => {
    const author = await authSignUp();
    const rep = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "hi" })).json();
    await apiPostReport(SELF, rep.idToken, { msgId, category: "immediate_danger" });
    const q0 = await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET");
    const sla = q0.json?.slaReviewBy;
    expect(typeof sla).toBe("number");
    await runSlaOverdueJob({ ...env, SAFE_CHAT_TEST_NOW_MS: String(sla - 1000) }, sla - 1000);
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.overdue).not.toBe(true);
    const after = await runSlaOverdueJob({ ...env, SAFE_CHAT_TEST_NOW_MS: String(sla + 5) }, sla + 5);
    expect(after.marked).toBeGreaterThanOrEqual(1);
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.overdue).toBe(true);
  });
});
