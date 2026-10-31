import { env, SELF } from "cloudflare:test";
import { describe, it, expect, beforeEach } from "vitest";
import { runErasureQueueJob } from "./index.js";
import { authSignUp, apiPost, apiGet, rtdbOwner, resetHideCountersDo } from "./test-helpers.js";

async function drainDeleteViaCron(u, { onHop, ids, sid } = {}) {
  let j = await (await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {})).json();
  expect(j.ok).toBe(true);
  let guard = 0;
  while (guard < 500) {
    guard += 1;
    if (ids && sid && (await countOwnMessagesByIds(ids, sid)) === 0) {
      j = { ...j, status: "complete", complete: true };
      break;
    }
    const jobSnap = await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "GET");
    if (!jobSnap.json) {
      j = await (await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {})).json();
      expect(j.ok).toBe(true);
      continue;
    }
    if (jobSnap.json.status === "complete_with_holds" || jobSnap.json.status === "failed") {
      j = { ...jobSnap.json, complete: false };
      break;
    }
    if (jobSnap.json.status !== "queued") {
      j = { ...j, status: jobSnap.json.status, complete: jobSnap.json.status === "complete" };
      if (j.complete) break;
    }
    const hop = await runErasureQueueJob(env);
    if (onHop) onHop(hop);
    if (hop.processed && hop.subrequests != null) {
      expect(hop.subrequests).toBeLessThanOrEqual(Number(env.SAFE_CHAT_ERASURE_MAX_SUBREQUESTS || 40));
    }
    const job = await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "GET");
    if (!job.json) {
      continue;
    }
    j = { ...j, status: job.json.status, complete: false };
    if (job.json.status === "complete_with_holds") {
      j.completeWithHolds = true;
      break;
    }
  }
  return j;
}

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
  const ids = [];
  for (let i = 0; i < n; i++) {
    const ref = await rtdbOwner("chat/messages", "POST", {
      sid,
      name: "Erasure",
      text: `msg-${i}`,
      time: Date.now() + i
    });
    const id = ref.json?.name;
    if (id) ids.push(id);
  }
  return { sid, ids };
}

describe.skipIf(env.SAFE_CHAT_INTEGRATION !== "1")("H-1 erasure completion (cron queue)", () => {
  beforeEach(async () => {
    await resetHideCountersDo(env);
    await rtdbOwner("chat/messages", "DELETE");
    await rtdbOwner("chat/reports", "DELETE");
    await rtdbOwner("chat/internal", "DELETE");
  });

  it("H-1: delete-my-data then cron drains 25 messages with zero leftovers", async () => {
    const u = await authSignUp();
    const { sid, ids } = await seedOwnMessages(u, 25);
    expect(ids.length).toBe(25);
    expect(await countOwnMessagesByIds(ids, sid)).toBe(25);
    const out = await drainDeleteViaCron(u, { ids, sid });
    expect(out.status).toBe("complete");
    expect(await countOwnMessagesByIds(ids, sid)).toBe(0);
    expect((await rtdbOwner(`chatMeta/${u.localId}/erasureCursor`, "GET")).json).toBeNull();
    expect((await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "GET")).json).toBeNull();
  });

  it("H-1: cron queue drains 50 messages with metadata cleared", async () => {
    const u = await authSignUp();
    const { sid, ids } = await seedOwnMessages(u, 50);
    expect(ids.length).toBe(50);
    const out = await drainDeleteViaCron(u, { ids, sid });
    expect(out.status).toBe("complete");
    expect(await countOwnMessagesByIds(ids, sid)).toBe(0);
    expect((await rtdbOwner(`chatMeta/${u.localId}/chatSendCount`, "GET")).json).toBeNull();
  }, 120000);

  it("FT-04: cron erasure queue processes 100 messages with each hop ≤40 subrequests", async () => {
    const u = await authSignUp();
    const { sid, ids } = await seedOwnMessages(u, 100);
    expect(ids.length).toBe(100);
    const out = await drainDeleteViaCron(u, {
      ids,
      sid,
      onHop(hop) {
        if (hop.processed && hop.subrequests != null) {
          expect(hop.subrequests).toBeLessThanOrEqual(40);
        }
      }
    });
    expect(out.status).toBe("complete");
    expect(await countOwnMessagesByIds(ids, sid)).toBe(0);
    expect((await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "GET")).json).toBeNull();
  }, 180000);
});
