/** First-session onboarding chain (RU/EN/DA via i18n). */
const ONBOARDING_STEPS = [
  { id: "move", key: "moved", goal: 1, reward: { coins: 20, xp: 15 },
    target: () => ({ loc: "room", wx: 1.2, wz: -0.35 }) },
  { id: "go_street", key: "visit_street", goal: 1, reward: { coins: 30, xp: 20 },
    target: () => ({ loc: "room", wx: 0, wz: 5.5 }) },
  { id: "talk_razor", key: "talk_razor", goal: 1, reward: { coins: 40, xp: 25 },
    target: () => ({ loc: "street", npcId: "razor" }) },
  { id: "angelina_street", key: "angelina_street", goal: 1, reward: { coins: 35, xp: 22 },
    target: () => ({ loc: "street", wx: -3.2, wz: -1.4 }) },
  { id: "visit_cemetery", key: "visit_cemetery", goal: 1, reward: { coins: 50, xp: 30 },
    target: () => ({ loc: "street", wx: 10, wz: -2 }) },
  { id: "win_fight", key: "win_fight", goal: 1, reward: { coins: 80, xp: 45 },
    target: () => ({ loc: "street", npcId: "razor" }) },
  { id: "shop_buy", key: "shop_buy", goal: 1, reward: { coins: 25, xp: 35 },
    target: () => ({ loc: "room", wx: -1, wz: 0, ui: "shop" }) },
  { id: "city_build", key: "city_build", goal: 1, reward: { coins: 55, xp: 40 },
    target: () => ({ loc: "city", ui: "build" }) }
];

/** Portal waypoints when the player is not yet in the step's target location. */
const PORTAL_WAYPOINTS = {
  street: {
    room: { wx: 0, wz: 5.5 },
    city: { wx: -8, wz: 7 },
    cemetery: { wx: 0, wz: 7.5 },
    construction: { wx: 0, wz: 8.5 },
    kitchen: { wx: 0, wz: 5.5 },
    toilet: { wx: 0, wz: 5.5 },
    elevator: { wx: 0.85, wz: -0.45 },
    roof: { wx: 0, wz: 5.5 }
  },
  cemetery: { street: { wx: 10, wz: -2 }, room: { wx: 0, wz: 5.5 } },
  city: { street: { wx: 45, wz: 70 }, room: { wx: 0, wz: 5.5 } }
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
  const nextSt = currentStep();
  if (nextSt?.key === "visit_street") window.World3D?.setPortalGrace?.(1400);
  if (nextSt?.key === "city_build") {
    window.me.inventory = window.me.inventory || { materials: {}, spells: [] };
    window.me.inventory.materials = window.me.inventory.materials || {};
    window.me.inventory.materials.crypt = (window.me.inventory.materials.crypt || 0) + 1;
  }
  if (window.me.onboarding.step >= ONBOARDING_STEPS.length) {
    window.me.onboarding.done = true;
    toast(typeof t === "function" ? t("onboard_all_done") : "Onboarding complete!");
    window.StoryEngine?.onOnboardingComplete?.();
    window.LifeCh1Slice?.tryStartAfterOnboarding?.();
  }
  if (window.saveMe) saveMe();
  else saveMeQuiet();
  renderOnboardingQuest();
  syncGuideTarget();
  window.AngelinaGuide?.refresh?.();
  window.AngelinaGuide?.react?.(`onboard_${st.id}`);
}

function saveMeQuiet() {
  if (window.saveMe) saveMe();
}

function renderOnboardingQuest() {
  syncGuideTarget();
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
  let stepText = typeof t === "function" ? t(`onboard_${st.id}_text`) : "";
  if (st.key === "moved" && !worldLocomotionReady()) {
    stepText = typeof t === "function" ? t("onboard_loading_room") : "Loading your room…";
  }
  let offPath =
    st.key === "angelina_street" && window.me?.location && window.me.location !== "street"
      ? typeof t === "function"
        ? t("onboard_angelina_street_offpath")
        : ""
      : "";
  const prog = progress()[st.key] || 0;
  box.innerHTML = `<div class="quest-tracker">
    <b>${escapeHtml(title)}</b> <span class="quest-step-num">${i}/${ONBOARDING_STEPS.length}</span>
    <div class="quest-step-title">${escapeHtml(stepTitle)}</div>
    <div class="quest-step-text">${escapeHtml(stepText)}</div>
    ${offPath ? `<div class="quest-step-offpath">${escapeHtml(offPath)}</div>` : ""}
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
  if (tgt.ui === "build") {
    if (window.me.location === "city") return { wx: 0, wz: 0, loc: "city" };
    return waypointToReach("city") || null;
  }
  const here = window.me.location;
  if (st.key === "angelina_street" && tgt.loc === "street" && here !== "street") {
    const wp = waypointToReach("street");
    if (wp) return { wx: wp.wx, wz: wp.wz, loc: here, returnTo: "street" };
    return { wx: 0, wz: 0, loc: here, returnTo: "street", useMap: true };
  }
  if (tgt.loc && here !== tgt.loc) {
    const wp = waypointToReach(tgt.loc);
    if (wp) return { wx: wp.wx, wz: wp.wz, loc: here };
    return { wx: 0, wz: 0, loc: here, useMap: true };
  }
  if (tgt.npcId) return { npcId: tgt.npcId };
  if (tgt.wx != null && tgt.wz != null) return { wx: tgt.wx, wz: tgt.wz, loc: here };
  return null;
}

function syncGuideTarget() {
  if (!window.World3D?.setGuideTarget) return;
  World3D.setGuideTarget(getGuideTarget());
}

const ONBOARD_WORLD_MOVE_DIST = 0.88;

function worldLocomotionReady() {
  const W = window.World3D || window.Scene3D;
  return !!(
    document.body?.classList?.contains("mode-world3d") &&
    W?.isReady?.() &&
    typeof W?.getPlayerWorldPosition === "function"
  );
}

function onWorldMove(wx, wz) {
  const st = currentStep();
  if (!st) return;
  if (st.key === "angelina_street" && window.me?.location === "street" && wx != null && wz != null) {
    const tgt = st.target();
    if (Math.hypot(wx - tgt.wx, wz - tgt.wz) < 2.25) {
      window.AngelinaGuide?.react?.("street_brief_town", 6500);
      bump("angelina_street", 1);
      return;
    }
  }
  if (st.key !== "moved") return;
  if (wx == null || wz == null) return;
  const last = window.me._onboardLastW;
  if (!last) {
    window.me._onboardLastW = { wx, wz };
    return;
  }
  const leg = Math.hypot(wx - last.wx, wz - last.wz);
  if (leg < 0.02) return;
  window.me._onboardLastW = { wx, wz };
  window.me._onboardPathM = (window.me._onboardPathM || 0) + leg;
  if (window.me._onboardPathM >= ONBOARD_WORLD_MOVE_DIST) bump("moved", 1);
}

function onMove(x, y) {
  const st = currentStep();
  if (!st || st.key !== "moved") return;
  if (document.body?.classList?.contains("mode-world3d")) {
    if (!worldLocomotionReady()) {
      window.me._onboardAwaitWorld = true;
      return;
    }
    delete window.me._onboardAwaitWorld;
    const W = window.World3D || window.Scene3D;
    const w = W.getPlayerWorldPosition();
    onWorldMove(w.x, w.z);
    return;
  }
  if (!window.me._onboardOrigin) window.me._onboardOrigin = { x, y };
  const o = window.me._onboardOrigin;
  if (Math.hypot(x - o.x, y - o.y) > 8) bump("moved", 1);
}

function onEnterLocation(loc) {
  const st = currentStep();
  if (!st) return;
  if (st.key === "angelina_street") {
    syncGuideTarget();
    if (loc === "street") {
      if (window.me?._onboardLeftStreetDuringAngelina) {
        window.AngelinaGuide?.react?.("angelina_street_back", 6200);
        window.me._onboardLeftStreetDuringAngelina = false;
      }
    } else {
      window.me._onboardLeftStreetDuringAngelina = true;
      window.AngelinaGuide?.react?.("angelina_street_wrong_loc", 7800);
    }
  }
  if (st.key === "visit_street" && loc === "street") bump("visit_street", 1);
  if (st.key === "visit_cemetery" && loc === "cemetery") bump("visit_cemetery", 1);
  if (st.key === "city_build" && loc === "city") syncGuideTarget();
  syncGuideTarget();
}

function onTalkRazor() { bump("talk_razor", 1); }
function onVisitCemetery() { if (window.me?.location === "cemetery") bump("visit_cemetery", 1); }
function onWinFight() {
  window.AngelinaGuide?.react?.("fight_win");
  bump("win_fight", 1);
}
function onShopBuy() {
  window.AngelinaGuide?.react?.("shop_buy");
  bump("shop_buy", 1);
}

function onCityBuildPlaced() {
  if (window.me?.location !== "city") return;
  const st = currentStep();
  if (st?.key === "city_build") {
    const line = typeof t === "function" ? t("story_crypt_placed") : "";
    if (line) toast(line);
    window.AngelinaGuide?.react?.("crypt_placed");
  }
  bump("city_build", 1);
}

/** t208u: never auto-skip the move tutorial — kids must earn step 0 with real movement. */
function adaptSpawnLocation() {
  if (!window.me?.onboarding || window.me.onboarding.done) return;
  renderOnboardingQuest();
  syncGuideTarget();
  window.AngelinaGuide?.refresh?.();
}

function onRoomPlayableForOnboarding() {
  if (!window.me?.onboarding || window.me.onboarding.done) return;
  const st = currentStep();
  if (!st || st.key !== "moved") return;
  delete window.me._onboardAwaitWorld;
  delete window.me._onboardLastW;
  delete window.me._onboardOrigin;
  delete window.me._onboardPathM;
  renderOnboardingQuest();
  syncGuideTarget();
  window.AngelinaGuide?.refresh?.();
}

function initOnboarding() {
  if (!window.me) return;
  if (!window.me.onboarding) {
    window.me.onboarding = { step: 0, progress: {}, done: false };
  }
  if (!window.__punkOnboardRoomPlayableBound) {
    window.__punkOnboardRoomPlayableBound = true;
    window.addEventListener("punk-room-playable", onRoomPlayableForOnboarding, { passive: true });
  }
  renderOnboardingQuest();
  syncGuideTarget();
  window.AngelinaGuide?.refresh?.();
  if (worldLocomotionReady()) onRoomPlayableForOnboarding();
}

window.Onboarding = {
  init: initOnboarding,
  adaptSpawnLocation,
  render: renderOnboardingQuest,
  syncGuideTarget,
  onMove,
  onWorldMove,
  onEnterLocation,
  onTalkRazor,
  onVisitCemetery,
  onWinFight,
  onShopBuy,
  onCityBuildPlaced,
  getGuideTarget,
  worldLocomotionReady,
  isActive: () => !!(window.me?.onboarding && !window.me.onboarding.done),
  currentStep
};
