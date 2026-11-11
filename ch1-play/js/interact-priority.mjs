/** Pure E-key routing. A nearby NPC or a talk step must beat street props. */

export const ONBOARDING_STEP_IDS = [
  "move",
  "go_street",
  "talk_razor",
  "visit_cemetery",
  "win_fight",
  "shop_buy"
];

export function onboardingStepId(onboarding) {
  if (!onboarding || onboarding.done) return null;
  const raw = onboarding.step ?? 0;
  const i = Math.min(Math.max(0, raw), ONBOARDING_STEP_IDS.length - 1);
  return ONBOARDING_STEP_IDS[i] || null;
}

export function streetTalkBlocksArcade(onboarding) {
  const id = onboardingStepId(onboarding);
  return id === "talk_razor" || id === "win_fight";
}

export function resolvePrimaryInteract({ location, nearestNpcId }) {
  if (nearestNpcId && (location === "street" || location === "cemetery" || location === "room" || location === "city")) {
    return { type: "npc", npcId: nearestNpcId };
  }
  return { type: "continue" };
}

export function allowLocationProp(location, { nearestNpcId, onboarding } = {}) {
  if (nearestNpcId && (location === "street" || location === "cemetery" || location === "city")) return false;
  if (location === "street" && streetTalkBlocksArcade(onboarding)) return false;
  return true;
}
