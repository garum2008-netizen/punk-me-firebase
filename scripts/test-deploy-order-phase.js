#!/usr/bin/env node
const phase = process.argv[2];
if (!phase || !["a1", "a2", "b"].includes(phase)) {
  console.error("Usage: node test-deploy-order-phase.js a1|a2|b");
  process.exit(1);
}
const { ensureBackup, restore } = require("./emulator-rules-swap");
const { runPhase } = require("./test-deploy-order-safety.js");

(async () => {
  ensureBackup();
  await runPhase(phase);
  console.log(`deploy-order phase ${phase}: PASS`);
  if (phase === "b") restore();
  process.exit(0);
})().catch(e => {
  console.error(e);
  restore();
  process.exit(1);
});
