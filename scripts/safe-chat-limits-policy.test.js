#!/usr/bin/env node
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../workers/safe-chat/src/config.js";
import { resolveSendLimits } from "../workers/safe-chat/src/limits-policy.js";

test("young account gets stricter cooldown and daily cap", () => {
  const cfg = loadConfig({});
  const young = resolveSendLimits(cfg, { accountAgeMs: 1000, playerLevel: 10 });
  assert.equal(young.cooldownMs, cfg.youngCooldownMs);
  assert.equal(young.dailyLimit, cfg.youngDailyLimit);
});

test("low level stacks with young limits", () => {
  const cfg = loadConfig({});
  const both = resolveSendLimits(cfg, { accountAgeMs: 1000, playerLevel: 1 });
  assert.ok(both.cooldownMs >= cfg.lowLevelCooldownMs);
  assert.ok(both.dailyLimit <= cfg.lowLevelDailyLimit);
});

test("mature high-level player uses defaults", () => {
  const cfg = loadConfig({});
  const mature = resolveSendLimits(cfg, {
    accountAgeMs: cfg.youngAccountMs + 1,
    playerLevel: cfg.lowLevelThreshold
  });
  assert.equal(mature.cooldownMs, cfg.cooldownMs);
  assert.equal(mature.dailyLimit, cfg.dailyLimit);
});
