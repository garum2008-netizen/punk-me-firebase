import {
  allowLocationProp,
  onboardingStepId,
  resolvePrimaryInteract,
  streetTalkBlocksArcade
} from "../js/interact-priority.mjs";

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed += 1;
  }
}

assert(onboardingStepId({ step: 2, done: false }) === "talk_razor", "step 2 is razor");
assert(streetTalkBlocksArcade({ step: 2 }) === true, "talk step blocks arcade");
assert(streetTalkBlocksArcade({ step: 4 }) === true, "duel step blocks arcade");
const npc = resolvePrimaryInteract({ location: "street", nearestNpcId: "razor" });
assert(npc.type === "npc" && npc.npcId === "razor", "street E prefers Razor");
assert(allowLocationProp("street", { nearestNpcId: "razor", onboarding: { step: 2 } }) === false, "arcade does not steal Razor");
assert(allowLocationProp("street", { nearestNpcId: null, onboarding: { step: 1 } }) === true, "arcade allowed when clear");

if (failed) process.exit(1);
console.log("interact-priority: PASS");
