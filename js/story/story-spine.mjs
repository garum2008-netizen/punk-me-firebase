/**
 * Chapter 0 spine: which locations are in play and why the next portal matters.
 * Does not change canon text — only routing hints and soft locks during training.
 */

const CH0_UNLOCK_ORDER = ["room", "street", "cemetery", "city", "roof", "construction", "parkour"];

const CH0_LABEL = {
  room: "spine_loc_room",
  street: "spine_loc_street",
  cemetery: "spine_loc_cemetery",
  city: "spine_loc_city",
  roof: "spine_loc_roof",
  construction: "spine_loc_construction",
  parkour: "spine_loc_parkour"
};

function storyChapter() {
  const st = window.StoryEngine?.ensureStoryState?.(window.me);
  return st?.chapter ?? 0;
}

function onboardingActive() {
  return window.Onboarding?.isActive?.();
}

function maxUnlockedIndex() {
  if (!onboardingActive()) {
    if (storyChapter() >= 1) return CH0_UNLOCK_ORDER.length - 1;
    const done = window.me?.onboarding?.done;
    if (done) return 3;
    return 2;
  }
  const step = window.Onboarding?.getCurrentStep?.();
  if (!step) return 0;
  const map = {
    move: 0,
    go_street: 1,
    talk_razor: 1,
    visit_cemetery: 2,
    win_fight: 1,
    shop_buy: 0
  };
  return map[step.id] ?? 0;
}

export function isLocationUnlocked(locId) {
  if (locId === "castle") {
    const st = window.StoryEngine?.ensureStoryState?.(window.me);
    return !!(st?.unique?.bell_rim);
  }
  const idx = CH0_UNLOCK_ORDER.indexOf(locId);
  if (idx < 0) return true;
  return idx <= maxUnlockedIndex();
}

export function blockReason(locId) {
  if (isLocationUnlocked(locId)) return null;
  const key = CH0_LABEL[locId] || "spine_loc_locked";
  return typeof window.t === "function" ? window.t(key) : locId;
}

export function explainPortal(toLoc) {
  if (!onboardingActive()) return null;
  const step = window.Onboarding?.getCurrentStep?.();
  if (!step) return null;
  const tgt = step.target?.();
  if (tgt?.loc === toLoc) {
    return typeof window.t === "function" ? window.t(`spine_portal_${step.id}`) : "";
  }
  return null;
}

export function initStorySpine() {
  window.StorySpine = {
    isLocationUnlocked,
    blockReason,
    explainPortal,
    maxUnlockedIndex
  };
}
