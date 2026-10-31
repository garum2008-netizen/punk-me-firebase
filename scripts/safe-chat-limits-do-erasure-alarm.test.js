#!/usr/bin/env node
/**
 * t139u R-08: DO erasure continuation must not drop uids when URL/secret missing or fetch fails.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const limitsPath =
  process.env.SAFE_CHAT_LIMITS_DO_PATH ||
  path.join(__dirname, "../workers/safe-chat/src/limits-do.js");
const { ChatLimitsDO } = await import(pathToFileURL(limitsPath).href);

class MemStorage {
  constructor() {
    this.m = new Map();
  }
  async get(k) {
    return this.m.get(k);
  }
  async put(k, v) {
    this.m.set(k, v);
  }
  async getAlarm() {
    return this.m.get("alarm");
  }
  async setAlarm(t) {
    this.m.set("alarm", t);
  }
  async delete(k) {
    this.m.delete(k);
  }
}

async function scheduleUid(doObj, uid) {
  const res = await doObj.fetch(
    new Request("http://do/schedule-erasure-continue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid })
    })
  );
  assert.equal(res.status, 200);
}

test("R-08: alarm keeps uid in queue when worker URL or secret missing", async () => {
  const storage = new MemStorage();
  const doObj = new ChatLimitsDO({ storage }, { SAFE_CHAT_WORKER_URL: "", SAFE_CHAT_INTERNAL_SECRET: "" });
  await scheduleUid(doObj, "userA");
  await doObj.alarm();
  const queue = (await storage.get("erasureContinueQueue")) || [];
  assert.deepEqual(queue, ["userA"]);
  assert.ok(await storage.getAlarm(), "alarm re-armed");
});

test("R-08: alarm re-queues uid when internal erasure fetch fails", async () => {
  const storage = new MemStorage();
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  try {
    const doObj = new ChatLimitsDO(
      { storage },
      { SAFE_CHAT_WORKER_URL: "https://worker.example", SAFE_CHAT_INTERNAL_SECRET: "s3cret" }
    );
    await scheduleUid(doObj, "userB");
    await doObj.alarm();
    const queue = (await storage.get("erasureContinueQueue")) || [];
    assert.deepEqual(queue, ["userB"]);
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test("R-08: alarm re-queues uid when internal erasure fetch returns HTTP 500", async () => {
  const storage = new MemStorage();
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("err", { status: 500 });
  try {
    const doObj = new ChatLimitsDO(
      { storage },
      { SAFE_CHAT_WORKER_URL: "https://worker.example", SAFE_CHAT_INTERNAL_SECRET: "s3cret" }
    );
    await scheduleUid(doObj, "userD");
    await doObj.alarm();
    const queue = (await storage.get("erasureContinueQueue")) || [];
    assert.deepEqual(queue, ["userD"]);
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test("R-08: alarm uses backoff when URL missing (no tight 750ms loop)", async () => {
  const storage = new MemStorage();
  const doObj = new ChatLimitsDO({ storage }, { SAFE_CHAT_WORKER_URL: "", SAFE_CHAT_INTERNAL_SECRET: "" });
  await scheduleUid(doObj, "userE");
  await doObj.alarm();
  const backoff = await storage.get("erasureAlarmBackoffMs");
  assert.ok(typeof backoff === "number" && backoff >= 60_000);
});

test("R-08: alarm re-queues uid when erasure continue returns complete false", async () => {
  const storage = new MemStorage();
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ ok: true, complete: false, continueScheduled: true }), { status: 200 });
  try {
    const doObj = new ChatLimitsDO(
      { storage },
      { SAFE_CHAT_WORKER_URL: "https://worker.example", SAFE_CHAT_INTERNAL_SECRET: "s3cret" }
    );
    await scheduleUid(doObj, "userF");
    await doObj.alarm();
    const queue = (await storage.get("erasureContinueQueue")) || [];
    assert.deepEqual(queue, ["userF"]);
  } finally {
    globalThis.fetch = prevFetch;
  }
});

test("R-08: alarm shifts uid only after successful erasure continue fetch", async () => {
  const storage = new MemStorage();
  let hit = 0;
  const prevFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    hit += 1;
    assert.match(String(url), /erasure-continue/);
    assert.equal(init.method, "POST");
    return new Response(JSON.stringify({ ok: true, complete: true }), { status: 200 });
  };
  try {
    const doObj = new ChatLimitsDO(
      { storage },
      { SAFE_CHAT_WORKER_URL: "https://worker.example", SAFE_CHAT_INTERNAL_SECRET: "s3cret" }
    );
    await scheduleUid(doObj, "userC");
    await doObj.alarm();
    const queue = (await storage.get("erasureContinueQueue")) || [];
    assert.deepEqual(queue, []);
    assert.equal(hit, 1);
  } finally {
    globalThis.fetch = prevFetch;
  }
});
