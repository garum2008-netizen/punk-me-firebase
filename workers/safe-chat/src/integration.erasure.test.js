import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { runErasureQueueJob } from "./index.js";
import {
  authSignUp,
  apiPost,
  apiGet,
  rtdbOwner,
  drainErasureCronLoop
} from "./test-helpers.js";

async function countOwnMessagesByIds(ids, sid) {
  let n = 0;
  for (const id of ids) {
    const m = await rtdbOwner(`chat/messages/${id}`, "GET");
    if (m.json && m.json.sid === sid) n += 1;
  }
  return n;
}

async function seedOwnMessages(u, n) {
  const sid = (await (await apiGet(SELF, "/api/chat/config", u.idToken)).json()).mySid;
  expect(sid).toMatch(/^[a-f0-9]{32}$/);
  const ids = [];
  for (let i = 0; i < n; i++) {
    const ref = await rtdbOwner("chat/messages", "POST", {
      sid,
      name: "Erasure",
      text: `msg-${i}`,
      time: Date.now() + i
    });
    const id = ref.json?.name;
    expect(id).toBeTruthy();
    if (id) ids.push(id);
  }
  expect(ids.length).toBe(n);
  for (let t = 0; t < 200; t += 1) {
    if ((await countOwnMessagesByIds(ids, sid)) === n) return { sid, ids };
    await new Promise(r => setTimeout(r, 50));
  }
  expect(await countOwnMessagesByIds(ids, sid)).toBe(n);
  return { sid, ids };
}

describe.skipIf(env.SAFE_CHAT_INTEGRATION !== "1")("H-1 erasure completion (cron queue)", () => {
  it("H-1: delete-my-data then cron drains 25 messages with zero leftovers", async () => {
    const u = await authSignUp();
    const { sid, ids } = await seedOwnMessages(u, 25);
    const first = await (await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {})).json();
    expect(first.ok).toBe(true);
    const out = await drainErasureCronLoop(env, u, runErasureQueueJob, null, { ownSid: sid });
    expect(out.complete).toBe(true);
    expect(await countOwnMessagesByIds(ids, sid)).toBe(0);
    expect((await rtdbOwner(`chatMeta/${u.localId}/erasureCursor`, "GET")).json).toBeNull();
    expect((await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "GET")).json).toBeNull();
  });

  it("H-1: cron queue drains 50 messages with metadata cleared", async () => {
    const u = await authSignUp();
    const { sid, ids } = await seedOwnMessages(u, 50);
    expect(ids.length).toBe(50);
    await (await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {})).json();
    const out = await drainErasureCronLoop(env, u, runErasureQueueJob, null, { ownSid: sid });
    expect(out.complete).toBe(true);
    expect(await countOwnMessagesByIds(ids, sid)).toBe(0);
    expect((await rtdbOwner(`chatMeta/${u.localId}/chatSendCount`, "GET")).json).toBeNull();
  }, 120000);

  it("FT-04: cron erasure queue processes 100 messages with each hop ≤40 subrequests", async () => {
    const u = await authSignUp();
    const { sid, ids } = await seedOwnMessages(u, 100);
    expect(ids.length).toBe(100);
    await (await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {})).json();
    let guard = 0;
    while (guard < 500) {
      guard += 1;
      const hop = await runErasureQueueJob(env);
      if (hop.processed && hop.subrequests != null) {
        expect(hop.subrequests).toBeLessThanOrEqual(40);
      }
      const n = await countOwnMessagesByIds(ids, sid);
      if (n === 0) break;
      if (!hop.processed && n > 0) {
        await runErasureQueueJob(env);
      }
    }
    expect(await countOwnMessagesByIds(ids, sid)).toBe(0);
    expect((await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "GET")).json).toBeNull();
  }, 180000);
});
