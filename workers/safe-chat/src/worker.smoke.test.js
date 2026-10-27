import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "./index.js";

describe("safe-chat worker smoke", () => {
  it("returns config without auth", async () => {
    const ctx = createExecutionContext();
    const req = new Request("http://localhost/api/chat/config");
    const res = await worker.fetch(req, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.freeTextEnabled).toBe(false);
    expect(json.phrases.length).toBeGreaterThan(0);
  });
});
