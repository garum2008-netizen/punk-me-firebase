import { env, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { authSignUp, apiPost, rtdbOwner } from "./test-helpers.js";

describe.skipIf(env.SAFE_CHAT_FREE_TEXT !== "true")("newbie free-text window (freeTextEnabled=true in this suite only)", () => {
  it("first 10 minutes allows only preset phrases", async () => {
    expect(env.SAFE_CHAT_FREE_TEXT).toBe("true");
    const u = await authSignUp();
    const now = Date.now();
    await rtdbOwner(`players/${u.localId}/chatRegisteredAt`, "PUT", now);

    const free = await apiPost(SELF, "/api/chat/send", u.idToken, { text: "hello", name: "N" });
    const fj = await free.json();
    expect(fj.ok).toBe(false);
    expect(fj.error).toBe("newbie_phrases_only");

    const phrase = await apiPost(SELF, "/api/chat/send", u.idToken, { phraseId: "hi", name: "N" });
    expect((await phrase.json()).ok).toBe(true);
  });

  it("server child-harm filter hides message and enqueues priority queue", async () => {
    const u = await authSignUp();
    const mature = Date.now() - 11 * 60 * 1000;
    await rtdbOwner(`chatMeta/${u.localId}/chatRegisteredAt`, "PUT", mature);
    const sent = await apiPost(SELF, "/api/chat/send", u.idToken, { text: "I will hurt the kid", name: "N" });
    const { id: msgId } = await sent.json();
    expect(msgId).toBeTruthy();
    const msg = await rtdbOwner(`chat/messages/${msgId}`, "GET");
    expect(msg.json.hidden).toBe(true);
    const q = await rtdbOwner(`chat/internal/safetyQueue/${msgId}`, "GET");
    expect(q.json?.priority).toBe("critical");
    expect(q.json?.trigger).toBe("filter");
  });
});
