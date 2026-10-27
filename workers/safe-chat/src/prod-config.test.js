import { describe, it, expect } from "vitest";
import { loadConfig } from "./config.js";

describe("production config defaults in worker", () => {
  it("loadConfig keeps testMode and skipAuth off", () => {
    const cfg = loadConfig({
      FIREBASE_PROJECT_ID: "punk-me-40605",
      SAFE_CHAT_SKIP_AUTH: "false",
      SAFE_CHAT_FREE_TEXT: "false"
    });
    expect(cfg.testMode).toBe(false);
    expect(cfg.skipAuth).toBe(false);
  });
});
