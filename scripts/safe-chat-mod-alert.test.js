import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { sendModeratorAlert } from "../workers/safe-chat/src/mod-alert.js";

describe("moderator alert hook", () => {
  it("is disabled without URL", async () => {
    const r = await sendModeratorAlert({}, { msgId: "abc" });
    assert.equal(r.sent, false);
    assert.equal(r.reason, "disabled");
  });

  it("POSTs JSON when URL configured", async () => {
    const calls = [];
    mock.method(globalThis, "fetch", async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return new Response("ok", { status: 200 });
    });
    const r = await sendModeratorAlert({ SAFE_CHAT_MOD_ALERT_URL: "https://example.test/hook" }, { msgId: "m1" });
    assert.equal(r.sent, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].body.msgId, "m1");
    mock.restoreAll();
  });
});
