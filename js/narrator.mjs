import { playSpeechLine, stopAllSpeech } from "./speech-bridge.mjs";
import { getAudioManager } from "./audio-manager.mjs";

let lastStepKey = "";

function touchPrimary() {
  return (
    window.matchMedia("(max-width: 900px)").matches ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 1100)
  );
}

function narratorEnabled() {
  const am = getAudioManager();
  if (am.getNarratorEnabled && !am.getNarratorEnabled()) return false;
  return true;
}

function currentOnboardStep() {
  if (!window.me?.onboarding || window.me.onboarding.done) return null;
  const steps = window.Onboarding?.STEPS;
  const i = Math.min(window.me.onboarding.step ?? 0, (steps?.length || 6) - 1);
  return steps?.[i] || null;
}

export function narratorLineIdForStep(stepId) {
  const variant = touchPrimary() ? "touch" : "desktop";
  return `narr_onboard_${stepId}_${variant}`;
}

export function refreshNarratorForGoal() {
  if (!narratorEnabled()) return;
  if (!window.me?.onboarding || window.me.onboarding.done) {
    lastStepKey = "";
    return;
  }
  const st = currentOnboardStep();
  if (!st) return;
  const key = `${st.id}:${window.me.onboarding.step}`;
  if (key === lastStepKey) return;
  lastStepKey = key;
  if (!getAudioManager().isUnlocked()) return;
  const lineId = narratorLineIdForStep(st.id);
  const title = typeof window.t === "function" ? window.t(`onboard_${st.id}_title`) : st.id;
  const text = typeof window.t === "function" ? window.t(`onboard_${st.id}_text`) : "";
  const hintKey = touchPrimary() ? `narr_ctrl_${st.id}_touch` : `narr_ctrl_${st.id}_desktop`;
  const hint = typeof window.t === "function" ? window.t(hintKey) : "";
  const spoken = `${title}. ${text} ${hint}`.trim();
  stopAllSpeech();
  playSpeechLine({
    lineId,
    text: spoken,
    characterId: "narrator",
    subtitle: spoken
  });
  window.StoryGoalHud?.refresh?.();
}

export function initNarrator() {
  window.Narrator = {
    refresh: refreshNarratorForGoal,
    reset: () => {
      lastStepKey = "";
    }
  };
  setInterval(() => {
    if (document.hidden) return;
    refreshNarratorForGoal();
  }, 1500);
}
