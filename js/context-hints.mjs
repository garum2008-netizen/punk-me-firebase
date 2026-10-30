import { pickContextHintKind } from "./interact-priority.mjs";

let el;

export function initContextHints() {
  el = document.getElementById("contextHint");
}

export function updateContextHints(data) {
  if (!el || !data) return;
  const { nearNpc, nearPortal, location } = data;
  const kind = pickContextHintKind(data);
  if (kind === "dog") {
    el.textContent = typeof t === "function" ? t("hint_pet_dog") : "E — pet";
    el.classList.add("visible");
  } else if (kind === "npc" && nearNpc) {
    el.textContent = typeof t === "function" ? t("hint_talk_npc") : "E — talk";
    el.classList.add("visible");
  } else if (kind === "portal" && nearPortal?.labelKey) {
    const dest = typeof doorT === "function" ? doorT(nearPortal.labelKey) : nearPortal.to;
    el.textContent = typeof t === "function"
      ? t("hint_portal_named").replace("{dest}", dest || "…")
      : `Portal: ${dest || ""}`;
    el.classList.add("visible");
  } else if (kind === "portal" && nearPortal) {
    el.textContent = typeof t === "function" ? t("hint_portal") : "Walk into the glow";
    el.classList.add("visible");
  } else if (window.Onboarding?.isActive?.() && location === "room") {
    const st = window.Onboarding.getGuideTarget?.();
    if (st && st.wx != null && !st.npcId) {
      el.textContent = typeof t === "function"
        ? t("hint_portal_named").replace("{dest}", doorT("door_street"))
        : "Portal: Street";
      el.classList.add("visible");
    } else el.classList.remove("visible");
  } else {
    el.classList.remove("visible");
  }
  window.updateInteractionHud?.(data, kind);
}

window.initContextHints = initContextHints;
window.updateContextHints = updateContextHints;
