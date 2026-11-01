#!/usr/bin/env node
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadConfig } from "../workers/safe-chat/src/config.js";
import { resolveSendLimits } from "../workers/safe-chat/src/limits-policy.js";

test("young account gets stricter cooldown and daily cap", () => {
  const cfg = loadConfig({});
  const young = resolveSendLimits(cfg, { accountAgeMs: 1000 });
  assert.equal(young.cooldownMs, cfg.youngCooldownMs);
  assert.equal(young.dailyLimit, cfg.youngDailyLimit);
});

test("missing registration is treated as youngest (accountAgeMs 0)", () => {
  const cfg = loadConfig({});
  const fresh = resolveSendLimits(cfg, { accountAgeMs: 0 });
  assert.equal(fresh.dailyLimit, cfg.youngDailyLimit);
});

test("mature account uses defaults", () => {
  const cfg = loadConfig({});
  const mature = resolveSendLimits(cfg, {
    accountAgeMs: cfg.youngAccountMs + 1
  });
  assert.equal(mature.cooldownMs, cfg.cooldownMs);
  assert.equal(mature.dailyLimit, cfg.dailyLimit);
});
