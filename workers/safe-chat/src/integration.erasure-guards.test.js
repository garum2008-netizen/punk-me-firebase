import { env, SELF } from "cloudflare:test";
import { describe, it, expect, vi } from "vitest";
import { runErasureQueueJob } from "./index.js";
import {
  persistJobAfterBatch,
  erasureBatchMadeProgress,
  userFacingErasurePayload,
  resumeErasureJobsAfterHoldRelease,
  startOrContinueUserErasure
} from "./erasure-jobs.js";
import { authSignUp, apiPost, apiGet, rtdbOwner } from "./test-helpers.js";

async function sidOf(u) {
  return (await (await apiGet(SELF, "/api/chat/config", u.idToken)).json()).mySid;
}

describe.skipIf(env.SAFE_CHAT_INTEGRATION !== "1")("erasure guards (integration)", () => {
  it("GUARD P10: delete-my-data with held messages uses ≤40 subrequests in one request", async () => {
    const u = await authSignUp();
    const sid = await sidOf(u);
    const N = 30;
    for (let i = 0; i < N; i++) {
      const id = (await rtdbOwner("chat/messages", "POST", { sid, name: "H", text: "thanks", time: Date.now() + i }))
        .json?.name;
      await rtdbOwner(`chat/internal/safetyHolds/${id}`, "PUT", {
        at: Date.now(),
        category: "child_safety",
        nextEscalateAt: Date.now() + 3600000
      });
    }
    const real = globalThis.fetch;
    let n = 0;
    const spy = vi.spyOn(globalThis, "fetch").mockImplementation((...a) => {
      n += 1;
      return real(...a);
    });
    const res = await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {});
    spy.mockRestore();
    const j = await res.json();
    expect(j.ok).toBe(true);
    expect(j.subrequests).toBeLessThanOrEqual(40);
    expect(n).toBeLessThanOrEqual(45);
  }, 120000);

  it("GUARD P5: transient batch failure re-queues job and user retry continues erasure", async () => {
    const u = await authSignUp();
    const sid = await sidOf(u);
    await rtdbOwner("chat/messages", "POST", { sid, name: "X", text: "thanks", time: Date.now() });
    const now = Date.now();
    await persistJobAfterBatch(env, u.localId, { ok: false, error: "rtdb_unavailable", subrequests: 3 }, null, now);
    let job = (await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "GET")).json;
    expect(job.status).toBe("queued");
    const decisions = Object.values((await rtdbOwner("chat/internal/safetyDecisions", "GET")).json || {});
    expect(decisions.some(d => d?.action === "erasure_job_failed")).toBe(false);
    const retry = await (await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {})).json();
    expect(retry.status).not.toBe("failed");
    await runErasureQueueJob(env);
    for (let i = 0; i < 30; i++) {
      await runErasureQueueJob(env);
      const remaining = Object.values((await rtdbOwner("chat/messages", "GET")).json || {}).filter(
        m => m.sid === sid
      ).length;
      if (remaining === 0) break;
    }
    const remaining = Object.values((await rtdbOwner("chat/messages", "GET")).json || {}).filter(
      m => m.sid === sid
    ).length;
    expect(remaining).toBe(0);
  }, 120000);

  it("GUARD P6: attempt cap ignores hops that make erasure progress", async () => {
    const u = await authSignUp();
    let job = null;
    for (let i = 0; i < 49; i++) {
      const batch = {
        ok: true,
        complete: false,
        cursor: `-Nqa${String(i).padStart(4, "0")}`,
        subrequests: 40,
        deleted: 1
      };
      expect(erasureBatchMadeProgress(batch, job)).toBe(true);
      job = await persistJobAfterBatch(env, u.localId, batch, job, Date.now());
    }
    const j = (await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "GET")).json;
    expect(j.status).not.toBe("failed");
    expect(j.attempts).toBe(0);
    await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "DELETE");
  });

  it("GUARD P7: concurrent cron drains cannot process the same uid twice", async () => {
    const u = await authSignUp();
    await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "PUT", {
      status: "queued",
      attempts: 0,
      updatedAt: 1,
      requestedAt: 1
    });
    const [a, b] = await Promise.all([runErasureQueueJob(env), runErasureQueueJob(env)]);
    const processed = [a, b].filter(r => r.processed === 1).length;
    expect(processed).toBeLessThanOrEqual(1);
    await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "DELETE");
  });

  it("GUARD X4: attempt cap fails job after too many no-progress hops", async () => {
    const u = await authSignUp();
    let job = null;
    const now = Date.now();
    for (let i = 0; i < 49; i++) {
      job = await persistJobAfterBatch(
        env,
        u.localId,
        { ok: true, complete: false, subrequests: 1 },
        job,
        now + i
      );
    }
    const j = (await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "GET")).json;
    expect(j.status).toBe("failed");
    await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "DELETE");
  });

  it("GUARD X5: permanent erasure failure records safetyDecisions alert", async () => {
    const u = await authSignUp();
    const beforeIds = new Set(
      Object.keys((await rtdbOwner("chat/internal/safetyDecisions", "GET")).json || {})
    );
    let job = null;
    const now = Date.now();
    for (let i = 0; i < 60; i++) {
      job = await persistJobAfterBatch(
        env,
        u.localId,
        { ok: false, error: "simulated-x5-guard", subrequests: 2 },
        job,
        now + i
      );
      if (job?.status === "failed") break;
    }
    expect(job?.status).toBe("failed");
    const after = (await rtdbOwner("chat/internal/safetyDecisions", "GET")).json || {};
    const fresh = Object.entries(after).filter(([id]) => !beforeIds.has(id)).map(([, d]) => d);
    expect(
      fresh.some(
        d =>
          d?.action === "erasure_job_failed" &&
          String(d?.note || "").includes("Erasure batch failed") &&
          String(d?.note || "").includes("simulated-x5-guard")
      )
    ).toBe(true);
    await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "DELETE");
  });

  it("GUARD X6: hold release resumes complete_with_holds erasure job", async () => {
    const u = await authSignUp();
    const sid = await sidOf(u);
    const id = (await rtdbOwner("chat/messages", "POST", { sid, name: "H", text: "held", time: Date.now() })).json
      ?.name;
    expect(id).toBeTruthy();
    await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "PUT", {
      status: "complete_with_holds",
      holdMsgIds: [id],
      attempts: 0,
      updatedAt: Date.now(),
      requestedAt: Date.now()
    });
    await rtdbOwner(`chat/internal/safetyHolds/${id}`, "DELETE");
    await resumeErasureJobsAfterHoldRelease(env, id);
    const job = (await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "GET")).json;
    expect(job.status).toBe("queued");
    expect(job.holdMsgIds || []).not.toContain(id);
    await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "DELETE");
  });

  it("GUARD X9: erasure rate limit blocks rapid delete-my-data", async () => {
    const u = await authSignUp();
    const now = Date.now();
    Object.assign(env, { SAFE_CHAT_ERASURE_MIN_INTERVAL_MS: String(60 * 60 * 1000) });
    const out = await startOrContinueUserErasure(env, u.localId, {
      now,
      respectRateLimit: true,
      lastRequestAt: now - 5000
    });
    expect(out.rateLimited).toBe(true);
    Object.assign(env, { SAFE_CHAT_ERASURE_MIN_INTERVAL_MS: "0" });
  });

  it("GUARD X10: job status honesty when work remains", async () => {
    const batch = {
      ok: true,
      complete: true,
      allOwnRemaining: 5,
      remainingDeletable: 0,
      subrequests: 10
    };
    const job = { status: "complete", attempts: 0 };
    const payload = userFacingErasurePayload(job, batch);
    expect(payload.status).toBe("queued");
    expect(payload.complete).toBe(false);
  });

  it("GUARD X12: delete-my-data with active queued job does not lie complete", async () => {
    const u = await authSignUp();
    await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "PUT", {
      status: "queued",
      attempts: 0,
      updatedAt: Date.now(),
      requestedAt: Date.now()
    });
    const j = await (await apiPost(SELF, "/api/chat/delete-my-data", u.idToken, {})).json();
    expect(j.complete).not.toBe(true);
    expect(j.status).toBe("queued");
    await rtdbOwner(`chat/internal/erasureJobs/${u.localId}`, "DELETE");
  });
});
