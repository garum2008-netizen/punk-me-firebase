/**
 * Angelina — in-world guide for Chapter 0–1 (until joined_gang).
 * Quest panel copy + 3D companion chip; pairs with onboarding + story-engine.
 */

import { ONBOARDING_STEP_IDS } from "./interact-priority.mjs";
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function initChapterGuide() {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  window.__qaFullNav = params.has("qaNav") || params.has("solo");
}

/** Until gang join: walk portals, hide map teleports (QA: ?qaNav=1). */
export function portalFirstNav() {
  if (window.__qaFullNav) return false;
  const p = window.me;
  if (!p) return false;
  if (p.story?.flags?.joined_gang) return false;
  return true;
}

export function isCompanionActive() {
  const p = window.me;
  if (!p) return false;
  if (p.story?.flags?.joined_gang) return false;
  if (window.Onboarding?.isActive?.()) return true;
  return !!p.onboarding?.done;
}

function onboardingStepKey() {
  if (!window.Onboarding?.isActive?.()) return null;
  const ob = window.me?.onboarding;
  if (!ob || ob.done) return null;
  const i = Math.min(Math.max(0, ob.step ?? 0), ONBOARDING_STEP_IDS.length - 1);
  return ONBOARDING_STEP_IDS[i] || "move";
}

export function resolveHintKey() {
  if (window.Onboarding?.isActive?.()) {
    const step = onboardingStepKey();
    return step ? `angelina_${step}_hint` : "angelina_move_hint";
  }
  const st = window.me?.story;
  const qid = st?.quest?.activeId;
  if (qid === "q_initiation_pay") return "angelina_ch1_pay";
  if (qid === "q_initiation_duel") return "angelina_ch1_duel";
  if (qid === "q_initiation_graffiti") return "angelina_ch1_graffiti";
  if (st?.flags?.joined_gang) return "angelina_ch1_done";
  if (window.me?.location === "street") return "angelina_ch1_razor";
  return "angelina_ch1_intro";
}

export function panelHtml() {
  if (!isCompanionActive()) return "";
  const key = resolveHintKey();
  const text = typeof window.t === "function" ? window.t(key) : key;
  return `<div class="angelina-guide" role="note"><span class="angelina-name">Angelina</span> — ${escapeHtml(text)}</div>`;
}

export function syncCompanion3d() {
  if (typeof window !== "undefined") {
    window.__angelinaCompanionText =
      typeof window.t === "function" ? window.t(resolveHintKey()) : resolveHintKey();
    window.__angelinaCompanionOn = isCompanionActive();
  }
}

export function onChapter0Complete() {
  const msg = typeof window.t === "function" ? window.t("angelina_ch1_intro") : "Chapter 1";
  window.toast?.(`Angelina: ${msg}`);
  syncCompanion3d();
  window.StoryEngine?.setBeacon?.("npc_razor");
  window.StoryEngine?.syncBeacon?.();
}

export function showPortalBlockedHint() {
  const msg = typeof window.t === "function" ? window.t("angelina_portal_only") : "Use the glowing portal.";
  window.toast?.(msg);
}

const api = {
  initChapterGuide,
  portalFirstNav,
  isCompanionActive,
  panelHtml,
  syncCompanion3d,
  onChapter0Complete,
  showPortalBlockedHint,
  resolveHintKey
};

export default api;