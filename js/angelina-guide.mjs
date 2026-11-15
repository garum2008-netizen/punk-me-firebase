/**
 * Angelina — permanent story companion (text guide banner + reaction lines).
 * t208u: reacts to player actions; separate from the custom 3D hero.
 */
const ONBOARD_IDS = [
  "move",
  "go_street",
  "talk_razor",
  "angelina_street",
  "visit_cemetery",
  "win_fight",
  "shop_buy",
  "city_build"
];

let reactUntil = 0;
let reactKey = null;

function tt(key, fallback) {
  return typeof window.t === "function" ? window.t(key) : fallback;
}

function heroName() {
  const n = window.me?.heroName || window.me?.name;
  return n ? String(n).slice(0, 24) : "";
}

function pickLine() {
  if (reactKey && Date.now() < reactUntil) {
    const line = tt(reactKey, "");
    if (line) return line;
  }
  const me = window.me;
  const who = heroName();
  if (!me) return tt("angelina_guide_welcome", "Hey — I'll hint what to do next. Follow the quest box.");
  if (who && typeof tt === "function") {
    const named = tt("angelina_guide_welcome_named", "");
    if (named) return named.replace(/\{name\}/g, who);
  }
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

const REACT_I18N = {
  crypt_placed: "angelina_react_crypt_placed",
  fight_win: "angelina_react_fight_win",
  fight_lose: "angelina_react_fight_lose",
  shop_buy: "angelina_react_shop_buy",
  ch1_complete: "angelina_react_ch1_complete",
  street_brief_town: "angelina_react_street_brief_town",
  angelina_street_wrong_loc: "angelina_react_angelina_street_wrong_loc",
  angelina_street_back: "angelina_react_angelina_street_back",
  ch1_climax_town: "angelina_react_ch1_climax_town",
  trust_choice: "angelina_react_trust_choice",
  build_need_material: "angelina_react_build_need_material"
};

/** Short-lived reaction line (crypt, fight win, onboarding step, etc.). */
export function react(eventId, durationMs = 5200) {
  if (!eventId) return;
  let key = eventId;
  if (eventId.startsWith("onboard_")) {
    key = `angelina_guide_${eventId.slice("onboard_".length)}`;
  } else if (eventId.startsWith("angelina_")) {
    key = eventId;
  } else if (eventId.startsWith("lifech1_step_")) {
    key = "angelina_react_life_step";
  } else if (eventId.startsWith("trust_")) {
    key = "angelina_react_trust_choice";
  } else {
    key = REACT_I18N[eventId] || `angelina_react_${eventId}`;
  }
  reactKey = key;
  reactUntil = Date.now() + Math.max(1200, durationMs | 0);
  refresh();
  const el = document.getElementById("angelinaGuideBanner");
  el?.classList.add("angelina-guide-react");
  setTimeout(() => el?.classList.remove("angelina-guide-react"), durationMs);
  window.LifeCh1Slice?.syncCompanionAngelina3D?.();
}

export function initAngelinaGuide() {
  refresh();
  setInterval(refresh, 1400);
  window.addEventListener("punk-me-save", refresh, { passive: true });
}

window.AngelinaGuide = { refresh, react, init: initAngelinaGuide };

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => initAngelinaGuide(), { once: true });
} else {
  initAngelinaGuide();
}