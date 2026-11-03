import { env, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { runErasureQueueJob } from "./index.js";
import {
  authSignUp,
  apiPost,
  apiPostReport,
  apiSendJson,
  putChatMessageText,
  rtdbOwner,
  rtdbAuth,
  waitForMessageHidden,
  waitForSafetyQueue,
  apiGet
} from "./test-helpers.js";

const FORBIDDEN_MIRROR_KEYS = ["uid", "email", "cluster", "reporterSafetyHidden", "reporterSid"];

function expectMirrorWhitelist(mirrorJson) {
  if (!mirrorJson || typeof mirrorJson !== "object") return;
  for (const key of FORBIDDEN_MIRROR_KEYS) {
    expect(mirrorJson[key]).toBeUndefined();
  }
  for (const key of Object.keys(mirrorJson)) {
    expect(["sid", "name", "text", "time", "phraseId", "loc", "hidden", "textRedacted"]).toContain(key);
  }
}

describe.skipIf(env.SAFE_CHAT_INTEGRATION !== "1")("chat/clientMessages mirror (P4 client read path)", () => {
  it("PROTECT MIRROR: send creates mirror row without private fields", async () => {
    const author = await authSignUp();
    const { id: msgId } = await apiSendJson(SELF, author.idToken, { phraseId: "thanks" });
    const mirror = (await rtdbOwner(`chat/clientMessages/${msgId}`, "GET")).json;
    expect(typeof mirror?.sid).toBe("string");
    expect(typeof mirror?.text).toBe("string");
    expectMirrorWhitelist(mirror);
  });

  it("PROTECT MIRROR: hidden message mirror omits body text", async () => {
    const author = await authSignUp();
    const { id: msgId } = await apiSendJson(SELF, author.idToken, { phraseId: "thanks" });
    const seeded = (await rtdbOwner(`chat/clientMessages/${msgId}`, "GET")).json;
    expect(Object.hasOwn(seeded ?? {}, "text")).toBe(true);
    expect(typeof seeded.text).toBe("string");
    expect(seeded.text.length).toBeGreaterThan(0);
    const mirrorTextBeforeHide = seeded.text;
    await putChatMessageText(`${msgId}`, "kill the kid");
    const mirrorAfterCanonicalEdit = (await rtdbOwner(`chat/clientMessages/${msgId}`, "GET")).json;
    expect(Object.hasOwn(mirrorAfterCanonicalEdit ?? {}, "text")).toBe(true);
    expect(mirrorAfterCanonicalEdit.text).toBe(mirrorTextBeforeHide);
    const rep = await authSignUp();
    await apiPostReport(SELF, rep.idToken, { msgId, category: "other_child_safety" });
    await waitForMessageHidden(msgId);
    const mirror = (await rtdbOwner(`chat/clientMessages/${msgId}`, "GET")).json;
    expect(mirror?.hidden).toBe(true);
    expect(mirror?.textRedacted).toBe(true);
    expect(Object.hasOwn(mirror ?? {}, "text")).toBe(false);
    expect(mirror?.text).toBeUndefined();
    expectMirrorWhitelist(mirror);
  });

  it("PROTECT MIRROR: redacted generic auto-hide mirror has no text leaf", async () => {
    const author = await authSignUp();
    const { id: msgId } = await apiSendJson(SELF, author.idToken, { phraseId: "gg" });
    for (let i = 0; i < 3; i++) {
      const r = await authSignUp();
      await apiPostReport(SELF, r.idToken, { msgId, category: "generic" });
    }
    await waitForMessageHidden(msgId);
    for (let i = 0; i < 120; i++) {
      const mirror = (await rtdbOwner(`chat/clientMessages/${msgId}`, "GET")).json;
      if (mirror?.textRedacted === true && mirror?.text === undefined) break;
      if (i === 119) throw new Error(`mirror ${msgId} not redacted`);
      await new Promise(r => setTimeout(r, 50));
    }
    const mirror = (await rtdbOwner(`chat/clientMessages/${msgId}`, "GET")).json;
    expect(mirror?.text).toBeUndefined();
    expect(mirror?.textRedacted).toBe(true);
    expectMirrorWhitelist(mirror);
  });

  it("PROTECT MIRROR: author erasure deletes mirror row", async () => {
    const author = await authSignUp();
    const { id: msgId } = await apiSendJson(SELF, author.idToken, { phraseId: "thanks" });
    expect((await rtdbOwner(`chat/clientMessages/${msgId}`, "GET")).json?.sid).toBeTruthy();
    await (await apiPost(SELF, "/api/chat/delete-my-data", author.idToken, {})).json();
    for (let i = 0; i < 40; i++) {
      await runErasureQueueJob(env);
      const m = await rtdbOwner(`chat/clientMessages/${msgId}`, "GET");
      if (m.json == null) return;
    }
    expect((await rtdbOwner(`chat/clientMessages/${msgId}`, "GET")).json).toBeNull();
  });

  it("PROTECT MIRROR: held-message erasure removes public mirror", async () => {
    const author = await authSignUp();
    const sid = (await (await apiGet(SELF, "/api/chat/config", author.idToken)).json()).mySid;
    const { id: msgId } = await apiSendJson(SELF, author.idToken, { phraseId: "thanks" });
    await putChatMessageText(`${msgId}`, "held-but-not-hidden-yet");
    await rtdbOwner(`chat/internal/safetyHolds/${msgId}`, "PUT", {
      at: Date.now(),
      category: "child_safety",
      nextEscalateAt: Date.now() + 3600000
    });
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.hidden).not.toBe(true);
    expect((await rtdbOwner(`chat/clientMessages/${msgId}`, "GET")).json?.text).toBeTruthy();
    await (await apiPost(SELF, "/api/chat/delete-my-data", author.idToken, {})).json();
    expect((await rtdbOwner(`chat/clientMessages/${msgId}`, "GET")).json).toBeNull();
    expect((await rtdbOwner(`chat/messages/${msgId}`, "GET")).json?.sid).toBe(sid);
  });

  it("PROTECT MIRROR: client cannot write chat/clientMessages", async () => {
    const u = await authSignUp();
    const put = await rtdbAuth("chat/clientMessages/evil-id", "PUT", u.idToken, {
      sid: "a".repeat(32),
      name: "X",
      text: "injected",
      time: Date.now()
    });
    expect(put.status === 401 || put.status === 403).toBe(true);
  });

  it("PROTECT MIRROR: client cannot read another player's chatMeta", async () => {
    const a = await authSignUp();
    const b = await authSignUp();
    await rtdbOwner(`chatMeta/${b.localId}/chatSendCount`, "PUT", 3);
    const peek = await rtdbAuth(`chatMeta/${b.localId}/chatSendCount`, "GET", a.idToken);
    expect(peek.status === 401 || peek.status === 403).toBe(true);
  });

  it("PROTECT MIRROR: canonical internal fields never copied to mirror on report path", async () => {
    const author = await authSignUp();
    const { id: msgId } = await apiSendJson(SELF, author.idToken, { phraseId: "thanks" });
    await putChatMessageText(`${msgId}`, "how old are you secret");
    const rep = await authSignUp();
    await apiPostReport(SELF, rep.idToken, { msgId, category: "grooming" });
    await waitForSafetyQueue(msgId, q => Boolean(q?.childHarm || q?.subcategory));
    const mirror = (await rtdbOwner(`chat/clientMessages/${msgId}`, "GET")).json;
    expectMirrorWhitelist(mirror);
  });
});
