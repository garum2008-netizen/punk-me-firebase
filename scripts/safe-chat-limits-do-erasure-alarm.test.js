#!/usr/bin/env node
/**
 * t139u R-08: DO retention continuation must not drop pending flag when URL/secret missing.
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
  async delete(k) {
    this.m.delete(k);
  }
  async getAlarm() {
    return this.m.get("alarm");
  }
  async setAlarm(t) {
    this.m.set("alarm", t);
  }
}

test("R-08: retention alarm keeps pending when worker URL or secret missing", async () => {
  const storage = new MemStorage();
  const doObj = new ChatLimitsDO({ storage }, { SAFE_CHAT_WORKER_URL: "", SAFE_CHAT_INTERNAL_SECRET: "" });
  await storage.put("retentionContinuePending", true);
  await doObj.alarm();
  assert.equal(await storage.get("retentionContinuePending"), true);
  assert.ok(await storage.getAlarm(), "alarm re-armed");
});

test("R-08: erasure continuation is not scheduled via limits DO (removed)", async () => {
  const storage = new MemStorage();
  const doObj = new ChatLimitsDO({ storage }, {});
  const res = await doObj.fetch(
    new Request("http://do/schedule-erasure-continue", { method: "POST", body: JSON.stringify({ uid: "u1" }) })
  );
  assert.equal(res.status, 404);
});
