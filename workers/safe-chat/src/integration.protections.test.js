import { env, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { runSlaOverdueJob } from "./index.js";
import { loadConfig } from "./config.js";
import { runUserErasureBatch } from "./erasure.js";
import { getCachedAdminToken } from "./admin-token.integration.js";
import {
  authSignUp,
  apiPost,
  apiGet,
  rtdbOwner,
  rtdbAuth,
  waitSendCooldown
} from "./test-helpers.js";

import { ChatLimitsDO } from "./limits-do.js";

class MemDoStorage {
  constructor() {
    this.m = new Map();
  }
  async get(k) {
    return this.m.get(k);
  }
  async put(k, v) {
    this.m.set(k, v);
  }
  async getAlarm() {
    return this.m.get("alarm");
  }
  async setAlarm(t) {
    this.m.set("alarm", t);
  }
}

describe.skipIf(env.SAFE_CHAT_INTEGRATION !== "1")("t139u protective mechanisms (must fail if disabled)", () => {
  it("PROTECT hide quota: second discretionary global hide on new messages is blocked", async () => {
    const author = await authSignUp();
    const repA = await authSignUp();
    const repB = await authSignUp();
    await waitSendCooldown();
    const { id: m1 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${m1}/text`, "PUT", "how old are you don't tell mom");
    await apiPost(SELF, "/api/chat/report", repA.idToken, { msgId: m1, category: "grooming" });
    await apiPost(
      SELF,
      "/api/chat/report",
      repB.idToken,
      { msgId: m1, category: "grooming" },
      { "CF-Connecting-IP": "203.0.113.10" }
    );
    expect((await rtdbOwner(`chat/messages/${m1}`, "GET")).json?.hidden).toBe(true);

    await waitSendCooldown();
    const { id: m2 } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json();
    await rtdbOwner(`chat/messages/${m2}/text`, "PUT", "how old are you don't tell mom");
    await apiPost(SELF, "/api/chat/report", repA.idToken, { msgId: m2, category: "grooming" });
    await apiPost(
      SELF,
      "/api/chat/report",
      repB.idToken,
      { msgId: m2, category: "grooming" },
      { "CF-Connecting-IP": "203.0.113.11" }
    );
    expect((await rtdbOwner(`chat/messages/${m2}`, "GET")).json?.hidden).not.toBe(true);
  });

  it("PROTECT cluster cap: cluster-hide-check enforces cap in limits DO", async () => {
    const now = Date.now();
    const storage = new MemDoStorage();
    const limits = new ChatLimitsDO({ storage }, env);
    const hash = "cluster-cap-test-hash";
    expect((await limits.checkClusterHide({ clusterHash: hash, now, cap: 2, bump: true })).ok).toBe(true);
    expect((await limits.checkClusterHide({ clusterHash: hash, now, cap: 2, bump: true })).ok).toBe(true);
    expect((await limits.checkClusterHide({ clusterHash: hash, now, cap: 2, bump: false })).ok).toBe(false);
  });

  it("PROTECT global hide gate: single reporter cannot globally hide grooming preset alone", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you");
    const rep = await authSignUp();
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId, category: "grooming" });
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).not.toBe(true);
  });

  it("PROTECT P-04: globally hidden message text is not readable by another client", async () => {
    const author = await authSignUp();
    const viewer = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "kill the kid");
    const rep = await authSignUp();
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId, category: "other_child_safety" });
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
      await apiPost(SELF, "/api/chat/report", r.idToken, { msgId, category: "other_child_safety" }, hdr);
    }
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.possibleCoordination).toBe(true);
  });

  it("PROTECT false-report penalty: dismiss with falseReport sets reporterAutoHideDenied", async () => {
    const modUid = (env.MODERATOR_UIDS || "").split(",")[0];
    const modToken = env.SAFE_CHAT_TEST_MOD_TOKEN;
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you");
    const rep = await authSignUp();
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId, category: "grooming" });
    const rep2 = await authSignUp();
    await apiPost(SELF, "/api/chat/report", rep2.idToken, { msgId, category: "grooming" });
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
    const r = await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId, category: "violence_threat" });
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
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId, category: "other_child_safety" });
    const rep2 = await authSignUp();
    await apiPost(
      SELF,
      "/api/chat/report",
      rep2.idToken,
      { msgId, category: "other_child_safety" },
      { "CF-Connecting-IP": "203.0.113.88" }
    );
    const cap = Date.now() + 500;
    await rtdbOwner(`chat/internal/safetyEvidence/${msgId}/maxHoldUntil`, "PUT", cap);
    await rtdbOwner(`chat/internal/safetyQueue/${msgId}/legalHoldUntil`, "PUT", cap);
    const { runRetentionJob } = await import("./index.js");
    await runRetentionJob({ ...env, SAFE_CHAT_TEST_NOW_MS: String(cap + 5000), SAFE_CHAT_RETENTION_BATCH: "120" }, cap + 5000);
    const q = await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET");
    expect(q.json?.overdue).toBe(true);
    expect(q.json?.evidenceHoldExpiredAt).toBeTruthy();
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

  it("PROTECT O-03: benign preset other_child_safety does not global-hide without corroboration", async () => {
    const author = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" })).json();
    const rep = await authSignUp();
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId, category: "other_child_safety" });
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).not.toBe(true);
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.intrinsicRisk).toBeLessThan(50);
  });

  it("PROTECT E-05: runSlaOverdueJob marks overdue at configured SLA boundary", async () => {
    const author = await authSignUp();
    const rep = await authSignUp();
    const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "hi" })).json();
    await apiPost(SELF, "/api/chat/report", rep.idToken, { msgId, category: "immediate_danger" });
    const q0 = await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET");
    const sla = q0.json?.slaReviewBy;
    expect(typeof sla).toBe("number");
    const before = await runSlaOverdueJob({ ...env, SAFE_CHAT_TEST_NOW_MS: String(sla - 1000) }, sla - 1000);
    expect(before.marked).toBe(0);
    const after = await runSlaOverdueJob({ ...env, SAFE_CHAT_TEST_NOW_MS: String(sla + 5) }, sla + 5);
    expect(after.marked).toBeGreaterThanOrEqual(1);
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.overdue).toBe(true);
  });
});
