import { env, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { runSlaOverdueJob } from "./index.js";
import {
  authSignUp,
  apiPost,
  rtdbOwner,
  rtdbAuth,
  waitSendCooldown
} from "./test-helpers.js";

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

  it("PROTECT cluster cap: fourth global hide from same cluster IP is blocked", async () => {
    const clusterIp = { "CF-Connecting-IP": "198.51.100.77" };
    const repA = await authSignUp();
    const repB = await authSignUp();
    const triggerIp = { "CF-Connecting-IP": "203.0.113.90" };
    const author = await authSignUp();
    let hiddenCount = 0;
    for (let i = 0; i < 4; i++) {
      await waitSendCooldown();
      const { id: msgId } = await (await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "gg" })).json();
      await rtdbOwner(`chat/messages/${msgId}/text`, "PUT", "how old are you secret meet alone");
      await apiPost(SELF, "/api/chat/report", repA.idToken, { msgId, category: "grooming" }, clusterIp);
      await apiPost(
        SELF,
        "/api/chat/report",
        repB.idToken,
        { msgId, category: "grooming" },
        triggerIp
      );
      if ((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden) hiddenCount += 1;
    }
    expect(hiddenCount).toBeLessThanOrEqual(3);
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
