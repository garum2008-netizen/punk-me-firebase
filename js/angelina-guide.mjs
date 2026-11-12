/**
 * Angelina teen coach — persistent contextual guide (first-person teen voice).
 * Updates on a timer and when onboarding / Life Ch1 / location changes.
 */
const ONBOARD_IDS = ["move", "go_street", "talk_razor", "visit_cemetery", "win_fight", "shop_buy", "city_build"];

function tt(key, fallback) {
  return typeof window.t === "function" ? window.t(key) : fallback;
}

function pickLine() {
  const me = window.me;
  if (!me) return tt("angelina_guide_welcome", "Hey — I'll hint what to do next. Follow the quest box.");
  if (window.LifeCh1Slice?.isActive?.()) {
    const idx = me.lifeCh1?.stepIndex ?? 0;
    const stepIds = ["move", "outfit", "trust", "reflect"];
    const sid = stepIds[idx] ?? String(idx);
    return tt(
      `angelina_guide_lifech1_${sid}`,
      tt(`angelina_guide_lifech1_${idx}`, tt("angelina_guide_lifech1", "Life Ch1: read the panel, walk, press E at the marker."))
    );
  }
  if (window.Onboarding?.isActive?.()) {
    const si = Math.min(me.onboarding?.step ?? 0, ONBOARD_IDS.length - 1);
    const id = ONBOARD_IDS[si] || "move";
    return tt(`angelina_guide_${id}`, tt(`onboard_${id}_text`, ""));
  }
  if (me.location === "city") {
    return tt("angelina_guide_city", "City: open Build, tap the ground — place your first piece.");
  }
  if (me.location === "construction") {
    return tt("angelina_guide_construction", "Construction zone — jobs and builds live here later.");
  }
  return tt("angelina_guide_default", "Map → travel. Gang → talk. E → interact. I'm Angelina — you've got this.");
}

function refresh() {
  const el = document.getElementById("angelinaGuideBanner");
  if (!el) return;
  const text = pickLine();
  if (!text) {
    el.classList.remove("visible");
    return;
  }
  el.textContent = text;
  el.classList.add("visible");
}

export function initAngelinaGuide() {
  refresh();
  setInterval(refresh, 1400);
  window.addEventListener("punk-me-save", refresh, { passive: true });
}

window.AngelinaGuide = { refresh, init: initAngelinaGuide };

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initAngelinaGuide(), { once: true });
} else {
  initAngelinaGuide();
}
