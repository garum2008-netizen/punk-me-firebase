import { env, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { authSignUp, apiPost, apiGet, rtdbOwner } from "./test-helpers.js";

async function drainDelete(token) {
  let j = await (await apiPost(SELF, "/api/chat/delete-my-data", token, {})).json();
  let guard = 0;
  while (j.continueScheduled && !j.complete && guard < 80) {
    guard += 1;
    j = await (await apiPost(SELF, "/api/chat/delete-my-data", token, {})).json();
  }
  return j;
}

async function countOwnMessages(sid) {
  const all = await rtdbOwner("chat/messages", "GET");
  return Object.values(all.json || {}).filter(m => m?.sid === sid).length;
}

async function seedOwnMessages(u, n) {
  const sid = (await (await apiGet(SELF, "/api/chat/config", u.idToken)).json()).mySid;
  for (let i = 0; i < n; i++) {
    await rtdbOwner("chat/messages", "POST", {
      sid,
      name: "Erasure",
      text: `msg-${i}`,
      time: Date.now() + i
    });
  }
  return sid;
}

describe.skipIf(env.SAFE_CHAT_INTEGRATION !== "1")("H-1 erasure completion", () => {
  it("H-1: erasure deletes 25 own messages with zero leftovers and metadata cleared", async () => {
    const u = await authSignUp();
    const sid = await seedOwnMessages(u, 25);
    expect(await countOwnMessages(sid)).toBe(25);
    const out = await drainDelete(u.idToken);
    expect(out.complete).toBe(true);
    expect(out.subrequests).toBeLessThanOrEqual(Number(env.SAFE_CHAT_ERASURE_MAX_SUBREQUESTS || 40));
    expect(await countOwnMessages(sid)).toBe(0);
    expect((await rtdbOwner(`chatMeta/${u.localId}/erasureCursor`, "GET")).json).toBeNull();
    expect((await rtdbOwner(`chatMeta/${u.localId}/erasureJobStartedAt`, "GET")).json).toBeNull();
    expect((await rtdbOwner(`chatMeta/${u.localId}/lastErasureRequestAt`, "GET")).json).toBeNull();
  });

  it("H-1: erasure deletes 50 own messages with zero leftovers and metadata cleared", async () => {
    const u = await authSignUp();
    const sid = await seedOwnMessages(u, 50);
    expect(await countOwnMessages(sid)).toBe(50);
    const out = await drainDelete(u.idToken);
    expect(out.complete).toBe(true);
    expect(await countOwnMessages(sid)).toBe(0);
    expect((await rtdbOwner(`chatMeta/${u.localId}/chatAge13DeclaredAt`, "GET")).json).toBeNull();
    expect((await rtdbOwner(`chatMeta/${u.localId}/reporterSafetyHidden`, "GET")).json).toBeNull();
    expect((await rtdbOwner(`chatMeta/${u.localId}/chatSendCount`, "GET")).json).toBeNull();
  }, 120000);
});
