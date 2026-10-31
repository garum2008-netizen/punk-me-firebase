import { env, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { continueErasureForUid, runUserErasureBatch } from "./erasure.js";
import { loadConfig } from "./config.js";
import { getCachedAdminToken } from "./admin-token.integration.js";
import { authSignUp, apiPost, apiGet, rtdbOwner } from "./test-helpers.js";

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

async function startPartialErasure(u, sid) {
  const token = await getCachedAdminToken(env);
  const config = loadConfig(env);
  return runUserErasureBatch({
    config,
    env,
    token,
    authUid: u.localId,
    sid,
    now: Date.now(),
    storedCursor: null,
    budget: config.erasureMaxSubrequests
  });
}

describe.skipIf(env.SAFE_CHAT_INTEGRATION !== "1")("erasure DO continuation path", () => {
  it("PROTECT erasure continuation: continueErasureForUid completes partial delete-my-data job", async () => {
    const u = await authSignUp();
    const sid = await seedOwnMessages(u, 50);
    const first = await startPartialErasure(u, sid);
    expect(first.complete).not.toBe(true);

    let guard = 0;
    let last = first;
    while (!last.complete && !last.completeWithHolds && guard < 30) {
      guard += 1;
      last = await continueErasureForUid(env, u.localId);
    }
    expect(last.complete).toBe(true);
    const all = await rtdbOwner("chat/messages", "GET");
    expect(Object.values(all.json || {}).filter(m => m?.sid === sid).length).toBe(0);
    expect((await rtdbOwner(`chatMeta/${u.localId}/erasureJobStartedAt`, "GET")).json).toBeNull();
  }, 120000);

  it("FT-04: each continueErasureForUid invocation performs at most 40 RTDB subrequests", async () => {
    const u = await authSignUp();
    const sid = await seedOwnMessages(u, 50);
    await startPartialErasure(u, sid);

    let guard = 0;
    let last = { complete: false };
    while (!last.complete && !last.completeWithHolds && guard < 30) {
      guard += 1;
      last = await continueErasureForUid(env, u.localId);
      expect(last.subrequests).toBeLessThanOrEqual(40);
    }
    expect(last.complete).toBe(true);
  }, 120000);

  it.skipIf(env.SAFE_CHAT_ERASURE_USE_DO_CONTINUE !== "1")(
    "FT-04 HTTP: internal erasure-continue uses at most 40 subrequests per hop",
    async () => {
      const u = await authSignUp();
      const sid = await seedOwnMessages(u, 50);
      const secret = env.SAFE_CHAT_INTERNAL_SECRET || "vitest-internal-secret";
      await startPartialErasure(u, sid);

      let guard = 0;
      let last = { complete: false };
      while (!last.complete && !last.completeWithHolds && guard < 30) {
        guard += 1;
        const res = await SELF.fetch("http://localhost/api/internal/erasure-continue", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Safe-Chat-Internal": secret
          },
          body: JSON.stringify({ uid: u.localId })
        });
        last = await res.json();
        expect(last.subrequests).toBeLessThanOrEqual(40);
      }
      expect(last.complete).toBe(true);
      const all = await rtdbOwner("chat/messages", "GET");
      expect(Object.values(all.json || {}).filter(m => m?.sid === sid).length).toBe(0);
    },
    120000
  );
});
