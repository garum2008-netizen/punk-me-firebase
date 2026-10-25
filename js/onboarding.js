/** First-session onboarding chain (RU/EN/DA via i18n). */
const ONBOARDING_STEPS = [
  { id: "move", key: "moved", goal: 1, reward: { coins: 20, xp: 15 },
    target: () => ({ loc: "room", wx: -4.2, wz: 3.8 }) },
  { id: "go_street", key: "visit_street", goal: 1, reward: { coins: 30, xp: 20 },
    target: () => ({ loc: "room", wx: 0, wz: 5.2 }) },
  { id: "talk_razor", key: "talk_razor", goal: 1, reward: { coins: 40, xp: 25 },
    target: () => ({ loc: "street", npcId: "razor" }) },
  { id: "visit_cemetery", key: "visit_cemetery", goal: 1, reward: { coins: 50, xp: 30 },
    target: () => ({ loc: "street", wx: 10, wz: -2 }) },
  { id: "win_fight", key: "win_fight", goal: 1, reward: { coins: 80, xp: 45 },
    target: () => ({ loc: "street", npcId: "razor" }) },
  { id: "shop_buy", key: "shop_buy", goal: 1, reward: { coins: 25, xp: 35 },
    target: () => ({ loc: "room", wx: -1, wz: 0, ui: "shop" }) }
];

/** Portal waypoints when the player is not yet in the step's target location. */
const PORTAL_WAYPOINTS = {
  street: { room: { wx: 0, wz: 5.2 } },
  cemetery: { street: { wx: 10, wz: -2 }, room: { wx: 0, wz: 5.2 } }
};

function stepIndex() {
  if (!window.me?.onboarding) return -1;
  if (window.me.onboarding.done) return -1;
  return Math.min(window.me.onboarding.step ?? 0, ONBOARDING_STEPS.length - 1);
}

function currentStep() {
  const i = stepIndex();
  return i < 0 ? null : ONBOARDING_STEPS[i];
}

function progress() {
  return window.me?.onboarding?.progress || {};
}

function bump(key, amt = 1) {
  const st = currentStep();
  if (!st || st.key !== key) return;
  const p = window.me.onboarding.progress;
  p[key] = (p[key] || 0) + amt;
  if (p[key] >= st.goal) completeStep();
  else saveMeQuiet();
  renderOnboardingQuest();
}

function completeStep() {
  const st = currentStep();
  if (!st) return;
  const r = st.reward || {};
  if (!window.isOwner && r.coins) window.me.coins += r.coins;
  if (r.xp) window.me.xp += r.xp;
  toast((typeof t === "function" ? t("onboard_step_done") : "Step complete!") + " +" + (r.coins || 0));
  window.me.onboarding.step = (window.me.onboarding.step || 0) + 1;
  window.me.onboarding.progress = {};
  if (window.me.onboarding.step >= ONBOARDING_STEPS.length) {
    window.me.onboarding.done = true;
    toast(typeof t === "function" ? t("onboard_all_done") : "Onboarding complete!");
    window.ChapterIntro?.showChapterWrap?.(0);
    window.StoryEngine?.onOnboardingComplete?.();
  }
  if (window.saveMe) saveMe();
  else saveMeQuiet();
  renderOnboardingQuest();
  syncGuideTarget();
  window.StoryGoalHud?.refresh?.();
}

function saveMeQuiet() {
  if (window.saveMe) saveMe();
}

function renderOnboardingQuest() {
  const box = document.getElementById("questBox");
  if (!box) return;
  if (window.me?.onboarding?.done) {
    if (typeof renderQuest === "function") renderQuest();
    return;
  }
  const st = currentStep();
  if (!st) return;
  const i = stepIndex() + 1;
  const title = typeof t === "function" ? t("onboard_title") : "Your mission";
  const stepTitle = typeof t === "function" ? t(`onboard_${st.id}_title`) : st.id;
  const stepText = typeof t === "function" ? t(`onboard_${st.id}_text`) : "";
  const prog = progress()[st.key] || 0;
  box.innerHTML = `<div class="quest-tracker">
    <b>${escapeHtml(title)}</b> <span class="quest-step-num">${i}/${ONBOARDING_STEPS.length}</span>
    <div class="quest-step-title">${escapeHtml(stepTitle)}</div>
    <div class="quest-step-text">${escapeHtml(stepText)}</div>
    <div class="quest-progress">${prog}/${st.goal}</div>
  </div>`;
}

function waypointToReach(destLoc) {
  const here = window.me?.location;
  if (!here || here === destLoc) return null;
  const map = PORTAL_WAYPOINTS[destLoc];
  return map?.[here] || null;
}

function getGuideTarget() {
  const st = currentStep();
  if (!st || !window.me) return null;
  const tgt = st.target();
  if (tgt.ui === "shop") {
    if (window.me.location === "room") return { wx: tgt.wx, wz: tgt.wz };
    return waypointToReach("room") || null;
  }
  if (tgt.loc && window.me.location !== tgt.loc) {
    const wp = waypointToReach(tgt.loc);
    if (wp) return { wx: wp.wx, wz: wp.wz };
    return null;
  }
  if (tgt.npcId) return { npcId: tgt.npcId };
  if (tgt.wx != null && tgt.wz != null) return { wx: tgt.wx, wz: tgt.wz };
  return null;
}

function syncGuideTarget() {
  if (!window.World3D?.setGuideTarget) return;
  World3D.setGuideTarget(getGuideTarget());
}

function onMove(x, y) {
  const st = currentStep();
  if (!st || st.key !== "moved") return;
  if (!window.me._onboardOrigin) window.me._onboardOrigin = { x, y };
  const o = window.me._onboardOrigin;
  if (Math.hypot(x - o.x, y - o.y) > 8) bump("moved", 1);
}

function onEnterLocation(loc) {
  const st = currentStep();
  if (!st) return;
  if (st.key === "visit_street" && loc === "street") bump("visit_street", 1);
  if (st.key === "visit_cemetery" && loc === "cemetery") bump("visit_cemetery", 1);
}

function onTalkRazor() { bump("talk_razor", 1); }
function onVisitCemetery() { if (window.me?.location === "cemetery") bump("visit_cemetery", 1); }
function onWinFight() { bump("win_fight", 1); }

/** True after win_fight step is done (progress cleared on advance). */
function hasPassedWinFight() {
  const ob = window.me?.onboarding;
  if (!ob || ob.done) return !!ob?.done;
  const idx = Math.min(ob.step ?? 0, ONBOARDING_STEPS.length - 1);
  const winIdx = ONBOARDING_STEPS.findIndex(s => s.key === "win_fight");
  return idx > winIdx;
}
function onShopBuy() { bump("shop_buy", 1); }

function adaptSpawnLocation() {
  if (!window.me?.onboarding || window.me.onboarding.done) return;
  const loc = window.me.location;
  if (!loc || loc === "room") return;
  const st = currentStep();
  if (st?.key === "moved") {
    window.me.onboarding.progress.moved = st.goal;
    completeStep();
  }
}

function initOnboarding() {
  if (!window.me) return;
  if (!window.me.onboarding) {
    window.me.onboarding = { step: 0, progress: {}, done: false };
  }
  renderOnboardingQuest();
  syncGuideTarget();
  window.StoryGoalHud?.refresh?.();
}

window.Onboarding = {
  init: initOnboarding,
  getCurrentStep: currentStep,
  adaptSpawnLocation,
  render: renderOnboardingQuest,
  syncGuideTarget,
  onMove,
  onEnterLocation,
  onTalkRazor,
  onVisitCemetery,
  onWinFight,
  onShopBuy,
  getGuideTarget,
  hasPassedWinFight,
  isActive: () => !!(window.me?.onboarding && !window.me.onboarding.done)
};
