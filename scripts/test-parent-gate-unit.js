#!/usr/bin/env node
const path = require("path");
const { pathToFileURL } = require("url");

const root = path.join(__dirname, "..");

async function main() {
  const mod = await import(pathToFileURL(path.join(root, "js/shop/parent-gate.mjs")).href);
  const { createParentChallenge, verifyParentGate } = mod;
  let failed = 0;
  function assert(c, msg) {
    if (!c) {
      console.error("FAIL:", msg);
      failed++;
    }
  }

  const ch = createParentChallenge(42);
  assert(ch.answer === String(ch.a + ch.b), "challenge answer");

  assert(!verifyParentGate({ ageConfirmed: false, adultConfirmed: true, userAnswer: ch.answer, challenge: ch }).ok, "needs age");
  assert(!verifyParentGate({ ageConfirmed: true, adultConfirmed: false, userAnswer: ch.answer, challenge: ch }).ok, "needs adult");
  assert(!verifyParentGate({ ageConfirmed: true, adultConfirmed: true, userAnswer: "0", challenge: ch }).ok, "wrong answer");
  assert(verifyParentGate({ ageConfirmed: true, adultConfirmed: true, userAnswer: ch.answer, challenge: ch }).ok, "pass");

  if (failed) process.exit(1);
  console.log("parent-gate-unit: PASS");
}

main().catch(e => {
  console.error("parent-gate-unit: FAIL", e);
  process.exit(1);
});
