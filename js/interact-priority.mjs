/** Quest-aware E-interact priority: story/onboarding target NPC > other NPC > dog > props. */

const PROP_STEPS = new Set([
  "ch0_mom_talk",
  "ch0_feed_bowl",
  "ch0_avatar_chosen",
  "ch0_interact_done",
  "ch0_journal_open"
]);

const DOG_STEPS = new Set(["ch0_pet_shnurok"]);

function questNpcId() {
  if (window.Onboarding?.isActive?.()) {
    const gt = window.Onboarding.getGuideTarget?.();
    if (gt?.npcId) return gt.npcId;
  }
  const auth = window.StoryEngine?.Authority?.getAuthorityObjective?.(window.me);
  if (auth?.beacon === "npc_mohawk_street") return "mohawk";
  const step = window.StoryEngine?.getActiveStep?.();
  if (step?.npcId) return step.npcId;
  const beacon = window.StoryEngine?.ensureStoryState?.(window.me)?.beacon;
  if (beacon === "npc_razor_street" || beacon === "npc_razor") return "razor";
  if (beacon === "npc_mohawk_street") return "mohawk";
  return null;
}

/**
 * @returns {"npc"|"dog"|"prop"|"none"}
 */
export function resolveInteractKind(hints = {}) {
  const nearNpc = hints.nearNpc || null;
  const nearDog = !!hints.nearDog;
  const obStep = window.Onboarding?.getCurrentStep?.()?.key;
  const obActive = window.Onboarding?.isActive?.();
  const questNpc = questNpcId();

  if (questNpc && nearNpc === questNpc) return "npc";

  if (obActive && DOG_STEPS.has(obStep)) {
    if (nearDog) return "dog";
    return "prop";
  }

  if (obActive && PROP_STEPS.has(obStep)) return "prop";

  if (nearNpc) return "npc";
  if (nearDog) return "dog";
  return "none";
}

export function pickContextHintKind(hints = {}) {
  const kind = resolveInteractKind(hints);
  if (kind === "npc") return "npc";
  if (kind === "dog") return "dog";
  if (kind === "prop" && hints.nearPortal) return "portal";
  return kind;
}

window.resolveInteractKind = resolveInteractKind;
