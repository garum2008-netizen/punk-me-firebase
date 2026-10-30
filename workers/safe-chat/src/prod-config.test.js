import { describe, it, expect } from "vitest";
import { loadConfig } from "./config.js";

describe("production config defaults in worker", () => {
  it("free text off and production CORS default", () => {
    const cfg = loadConfig({
      FIREBASE_PROJECT_ID: "punk-me-40605",
      SAFE_CHAT_FREE_TEXT: "false"
    });
    expect(cfg.freeTextEnabled).toBe(false);
    expect(cfg.corsOrigins).toContain("https://halloween.punk.contractbot.dk");
  });
});
