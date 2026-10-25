#!/usr/bin/env node
/** Unit: RTDB payload must not contain undefined (shop shortfall / earn path). */
const assert = require("assert");

function stripUndefinedDeep(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(stripUndefinedDeep).filter(v => v !== undefined);
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue;
    const next = stripUndefinedDeep(v);
    if (next !== undefined) out[k] = next;
  }
  return out;
}

const earnWithUndefined = {
  needTotal: 120,
  shortfall: 20,
  jobId: undefined,
  employerBeacon: undefined,
  returnLabel: "Neon chain"
};
const cleaned = stripUndefinedDeep(earnWithUndefined);
assert.strictEqual(cleaned.jobId, undefined);
assert.ok(!("jobId" in cleaned));
assert.ok(!("employerBeacon" in cleaned));
assert.strictEqual(JSON.stringify(cleaned).includes("undefined"), false);

const story = { earn: earnWithUndefined, flags: { a: 1 } };
const storyClean = stripUndefinedDeep(JSON.parse(JSON.stringify(story, (k, v) => (v === undefined ? "__undef__" : v))));
// simulate beginEarnCoins fix: null instead of undefined
story.earn = {
  needTotal: 100,
  shortfall: 5,
  jobId: null,
  employerBeacon: "npc_tony",
  returnLabel: null
};
const payload = stripUndefinedDeep(story);
assert.ok(payload.earn.jobId === null);

console.log("PASS test-save-sanitize");
process.exit(0);
