import { env, SELF } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import { runErasureQueueJob } from "./index.js";
import {
  authSignUp,
  apiPost,
  rtdbOwner,
  drainErasureCronLoop,
  seedOwnMessagesForErasure
} from "./test-helpers.js";

async function countOwnMessagesByIds(ids, sid) {
  let n = 0;
  for (const id of ids) {
    const m = await rtdbOwner(`chat/messages/${id}`, "GET");
    if (m.json && m.json.sid === sid) n += 1;
  }
  return n;
}

describe.skipIf(env.SAFE_CHAT_INTEGRATION !== "1")("H-1 erasure completion (cron queue)", () => {
  it("FT-04: cron erasure queue processes 100 messages with each hop ≤40 subrequests", async () => {
    const u = await authSignUp();
    const { sid, ids } = await seedOwnMessagesForErasure(SELF, u, 100);
    await (await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {})).json();
    let guard = 0;
    while (guard < 500) {
      guard += 1;
      const hop = await runErasureQueueJob(env);
      if (hop.processed && hop.subrequests != null) {
        expect(hop.subrequests).toBeLessThanOrEqual(40);
      }
      if ((await countOwnMessagesByIds(ids, sid)) === 0) break;
    }
    expect(await countOwnMessagesByIds(ids, sid)).toBe(0);
    expect((await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "GET")).json).toBeNull();
  }, 180000);

  it("H-1: cron queue drains 50 messages with metadata cleared", async () => {
    const u = await authSignUp();
    const { sid, ids } = await seedOwnMessagesForErasure(SELF, u, 50);
    await (await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {})).json();
    const out = await drainErasureCronLoop(env, u, runErasureQueueJob, null, { ownSid: sid });
    expect(out.complete).toBe(true);
    expect(await countOwnMessagesByIds(ids, sid)).toBe(0);
    expect((await rtdbOwner(`chatMeta/${u.localId}/chatSendCount`, "GET")).json).toBeNull();
  }, 120000);

  it("H-1: delete-my-data then cron drains 25 messages with zero leftovers", async () => {
    const u = await authSignUp();
    const { sid, ids } = await seedOwnMessagesForErasure(SELF, u, 25);
    expect(await countOwnMessagesByIds(ids, sid)).toBe(25);
    const first = await (await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {})).json();
    expect(first.ok).toBe(true);
    const out = await drainErasureCronLoop(env, u, runErasureQueueJob, null, { ownSid: sid });
    expect(out.complete).toBe(true);
    expect(await countOwnMessagesByIds(ids, sid)).toBe(0);
    expect((await rtdbOwner(`chatMeta/${u.localId}/erasureCursor`, "GET")).json).toBeNull();
    expect((await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "GET")).json).toBeNull();
  });
});
