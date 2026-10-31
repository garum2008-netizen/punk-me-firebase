import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { detectChildHarmSignals } from "../workers/safe-chat/src/child-harm.js";

describe("child-harm signal detection", () => {
  it("detects explicit threat-to-child stems", () => {
    assert.equal(detectChildHarmSignals("I will hurt the kid"), true);
    assert.equal(detectChildHarmSignals("kill the kid now"), true);
  });

  it("allows benign preset-like phrases", () => {
    assert.equal(detectChildHarmSignals("thanks gg"), false);
    assert.equal(detectChildHarmSignals("hello street"), false);
  });
});
