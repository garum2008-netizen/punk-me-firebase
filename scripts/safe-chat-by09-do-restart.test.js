#!/usr/bin/env node
/** BY-09 executable: DO quota state survives new ChatLimitsDO instance on same storage. */
import { test } from "node:test";
import assert from "node:assert/strict";
import { ChatLimitsDO } from "../workers/safe-chat/src/limits-do.js";

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
}

test("BY-09: child-safety hide quota persists across DO restart simulation", async () => {
  const storage = new MemStorage();
  const now = Date.now();
  const do1 = new ChatLimitsDO({ storage }, {});
  const first = await do1.checkChildSafetyHide({ uid: "u1", now, quota: 1, bump: true });
  assert.equal(first.ok, true);
  const do2 = new ChatLimitsDO({ storage }, {});
  const second = await do2.checkChildSafetyHide({ uid: "u1", now, quota: 1, bump: false });
  assert.equal(second.ok, false);
  assert.equal(second.reason, "hide_quota");
});
