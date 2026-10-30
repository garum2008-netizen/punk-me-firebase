import { describe, it, expect } from "vitest";
import { loadConfig } from "./config.js";
import { TEST_MUTATION_DISABLE_ENV_KEYS } from "./test-mutation-flags.js";

describe("production config defaults in worker", () => {
  it("free text off and production CORS default", () => {
    const cfg = loadConfig({
      FIREBASE_PROJECT_ID: "punk-me-40605",
      SAFE_CHAT_FREE_TEXT: "false"
    });
    expect(cfg.freeTextEnabled).toBe(false);
    expect(cfg.corsOrigins).toContain("https://halloween.punk.contractbot.dk");
  });

  it("test mutation disable flags throw outside integration harness", () => {
    for (const key of TEST_MUTATION_DISABLE_ENV_KEYS) {
      expect(() => loadConfig({ [key]: "1" })).toThrow(/test-only/i);
    }
  });
});
