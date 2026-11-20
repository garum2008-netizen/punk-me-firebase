/** Pure E-key routing. Street arcade must not swallow a nearby NPC or a talk step. */

export const ONBOARDING_STEP_IDS = [
  "move",
  "visit_kitchen",
  "pet_dog",
  "visit_elevator",
  "visit_street",
  "talk_razor"
];

export function onboardingStepId(onboarding) {
  if (!onboarding || onboarding.done) return null;
  const raw = onboarding.step ?? 0;
  const i = Math.min(Math.max(0, raw), ONBOARDING_STEP_IDS.length - 1);
  return ONBOARDING_STEP_IDS[i] || null;
}

/** Talk / duel steps on the street: E must not pay the arcade. */
export function streetTalkBlocksArcade(onboarding) {
  const id = onboardingStepId(onboarding);
  return id === "talk_razor";
}

/**
 * @returns {{ type: "npc", npcId: string } | { type: "continue" }}
 */
export function resolvePrimaryInteract({ location, nearestNpcId }) {
  if (location === "street" && nearestNpcId) return { type: "npc", npcId: nearestNpcId };
  return { type: "continue" };
}

export function allowLocationProp(location, { nearestNpcId, onboarding } = {}) {
  if (location !== "street") return true;
  if (nearestNpcId) return false;
  if (streetTalkBlocksArcade(onboarding)) return false;
  return true;
}
