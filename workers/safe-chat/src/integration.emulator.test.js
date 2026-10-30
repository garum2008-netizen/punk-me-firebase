import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeAll } from "vitest";
import { runRetentionJob } from "./index.js";
import {
  authSignUp,
  apiPost,
  apiGet,
  rtdbOwner,
  isBlocked,
  PROJECT_ID
} from "./test-helpers.js";

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

  it("child_safety from new reporter queues without instant hide", async () => {
    const author = await authSignUp();
    const sent = await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" });
    const { id: msgId } = await sent.json();
    const fresh = await authSignUp();
    await apiPost(SELF, "/api/chat/declare-age13", fresh.idToken, { confirmed: true });
    const rep = await apiPost(SELF, "/api/chat/report", fresh.idToken, {
      msgId,
      category: "child_safety"
    });
    const body = await rep.json();
    expect(body.ok).toBe(true);
    expect(body.queued).toBe(true);
    expect(body.safetyHold).not.toBe(true);
    const msg = await rtdbOwner(`chat/messages/${msgId}`, "GET");
    expect(msg.json.hidden).not.toBe(true);
    expect(msg.json.safetyHold).not.toBe(true);
    expect((await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET")).json?.childSafetyReports).toBe(1);
  });

  it("child_safety hides after trusted reporter age and retains evidence on author erasure", async () => {
    const author = await authSignUp();
    const sent = await apiPost(SELF, "/api/chat/send", author.idToken, { phraseId: "thanks" });
    const { id: msgId } = await sent.json();
    const mature = Date.now() - 2 * 24 * 60 * 60 * 1000;
    await rtdbOwner(`chatMeta/${userB.localId}/chatRegisteredAt`, "PUT", mature);
    const rep = await apiPost(SELF, "/api/chat/report", userB.idToken, {
      msgId,
      category: "child_safety"
    });
    expect((await rep.json()).safetyHold).toBe(true);
    const msg = await rtdbOwner(`chat/messages/${msgId}`, "GET");
    expect(msg.json.hidden).toBe(true);
    expect(msg.json.safetyHold).toBe(true);

    const del = await apiPost(SELF, "/api/chat/delete-my-data", author.idToken, {});
    const delJson = await del.json();
    expect(delJson.ok).toBe(true);
    expect(delJson.erasureDeferred).toContain(msgId);
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.safetyHold).toBe(true);

    const now = 2_000_000_000_000;
    await rtdbOwner(`chat/messages/${msgId}/time`, "PUT", now - 8 * 24 * 60 * 60 * 1000);
    await runRetentionJob({ ...env, SAFE_CHAT_TEST_NOW_MS: String(now) }, now);
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.safetyHold).toBe(true);

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
    await runRetentionJob(testEnv, now);

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

  it("delete-my-data batches past subrequest budget", async () => {
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
    let cursor = null;
    let complete = false;
    for (let step = 0; step < 10 && !complete; step++) {
      const body = cursor ? { cursor } : {};
      const res = await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, body);
      const j = await res.json();
      expect(j.ok).toBe(true);
      complete = j.complete;
      cursor = j.cursor || null;
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
