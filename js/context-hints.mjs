let el;

export function initContextHints() {
  el = document.getElementById("contextHint");
}

export function updateContextHints(data) {
  if (!el || !data) return;
  const { nearNpc, nearPortal, nearDog, location } = data;
  const step = window.Onboarding?.isActive?.() ? window.Onboarding.currentStepId?.() : null;
  if (step === "move") {
    el.textContent = typeof t === "function" ? t("hint_move") : "WASD or the left joystick";
    el.classList.add("visible");
    return;
  }
  if (step === "win_fight" && !nearNpc) {
    el.textContent = typeof t === "function" ? t("hint_duel") : "Fight, then strike";
    el.classList.add("visible");
    return;
  }
  if (step === "shop_buy" && !nearNpc && !nearPortal) {
    el.textContent = typeof t === "function" ? t("hint_shop") : "Open the Shop";
    el.classList.add("visible");
    return;
  }
  if (nearDog) {
    el.textContent = typeof t === "function" ? t("hint_pet_dog") : "E — pet";
    el.classList.add("visible");
  } else if (nearNpc) {
    el.textContent = typeof t === "function" ? t("hint_talk_npc") : "E — talk";
    el.classList.add("visible");
  } else if (nearPortal?.labelKey) {
    const dest = typeof doorT === "function" ? doorT(nearPortal.labelKey) : nearPortal.to;
    el.textContent = typeof t === "function"
      ? t("hint_portal_named").replace("{dest}", dest || "…")
      : `Portal: ${dest || ""}`;
    el.classList.add("visible");
  } else if (nearPortal) {
    el.textContent = typeof t === "function" ? t("hint_portal") : "Walk into the glow";
    el.classList.add("visible");
  } else if (step === "go_street" || step === "visit_cemetery" || step === "talk_razor") {
    const key = step === "talk_razor" ? "hint_find_razor" : step === "visit_cemetery" ? "hint_find_cemetery" : "hint_find_street";
    el.textContent = typeof t === "function" ? t(key) : key;
    el.classList.add("visible");
  } else {
    el.classList.remove("visible");
  }
}

window.initContextHints = initContextHints;
window.updateContextHints = updateContextHints;
