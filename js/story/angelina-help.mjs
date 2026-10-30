/** Angelina help button: tiers 1–4 + settings (HINT_SYSTEM_SPEC). Placeholder portrait only. */

import { pickAngelinaHint } from "./angelina-guide.mjs";

function lang() {
  return typeof window.getLanguage === "function" ? window.getLanguage() : "ru";
}

function L(obj) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[lang()] || obj.en || obj.ru || "";
}

function t(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

function ensureHelpSettings(me) {
  if (!me.settings) me.settings = {};
  if (!me.settings.help) {
    me.settings.help = {
      autoHints: true,
      voiceHints: false,
      subtitles: true,
      hintMode: "full",
      seenExplains: []
    };
  }
  if (!Array.isArray(me.settings.help.seenExplains)) me.settings.help.seenExplains = [];
  return me.settings.help;
}

function currentHintStep() {
  if (window.me?.onboarding && !window.me.onboarding.done) {
    const st = window.Onboarding?.getCurrentStep?.();
    if (!st) return null;
    return {
      id: st.id || st.qt,
      hint_nudge: st.hint_nudge,
      hint_60s: st.hint_60s,
      hint_exact: st.hint_exact,
      hint_solution: st.hint_solution,
      objective: st.objective
    };
  }
  const step = window.StoryEngine?.getActiveStep?.() || null;
  if (step) return step;
  const auth = window.StoryEngine?.Authority?.getAuthorityObjective?.(window.me);
  if (auth) {
    const obj = auth.objective || "";
    return {
      id: `auth_${auth.beacon || "stage"}`,
      hint_nudge: { ru: obj, en: obj, da: obj },
      hint_60s: auth.title ? { ru: auth.title, en: auth.title, da: auth.title } : undefined,
      hint_exact: { ru: obj, en: obj, da: obj },
      hint_solution: auth.beacon ? { ru: obj, en: obj, da: obj } : undefined,
      hint_solution_path: !!auth.beacon
    };
  }
  return null;
}

function getRequestTier(me) {
  if (!me._angelinaHelp) me._angelinaHelp = { stepKey: "", tier: 0 };
  const step = currentHintStep();
  const key = step?.id || "none";
  if (me._angelinaHelp.stepKey !== key) {
    me._angelinaHelp.stepKey = key;
    me._angelinaHelp.tier = 0;
  }
  return me._angelinaHelp;
}

function explainId(stepId, tier) {
  return `angelina_${stepId}_t${tier}`;
}

function hasSeenExplain(help, id) {
  return help.seenExplains.includes(id);
}

function markSeenExplain(help, id) {
  if (!help.seenExplains.includes(id)) help.seenExplains.push(id);
}

function renderPanel(text) {
  const help = ensureHelpSettings(window.me);
  const body = document.getElementById("angelinaHelpBody");
  const sub = document.getElementById("angelinaHelpSub");
  // Text-only Angelina: one surface. Subtitle line reserved for future recorded VO.
  if (help.voiceHints && help.subtitles) {
    if (body) body.textContent = "";
    if (sub) {
      sub.textContent = text;
      sub.classList.add("visible");
    }
  } else {
    if (body) body.textContent = text;
    if (sub) {
      sub.textContent = "";
      sub.classList.remove("visible");
    }
  }
  window.AngelinaGuide?.refreshAngelinaContextBanner?.();
}

function showSolutionConfirm(onYes) {
  const dlg = document.getElementById("angelinaSolutionConfirm");
  if (!dlg) {
    onYes();
    return;
  }
  dlg.classList.add("active");
  const yes = dlg.querySelector("[data-angelina-solution=yes]");
  const no = dlg.querySelector("[data-angelina-solution=no]");
  const close = () => dlg.classList.remove("active");
  yes.onclick = () => {
    close();
    onYes();
  };
  no.onclick = close;
}

export function onAngelinaHelpRequest() {
  const me = window.me;
  if (!me) return;
  const help = ensureHelpSettings(me);
  const step = currentHintStep();
  if (!step) {
    renderPanel(t("angelina_no_step"));
    return;
  }
  const track = getRequestTier(me);
  const nextTier = Math.min(4, track.tier + 1);
  const eid = explainId(step.id, nextTier);
  if (hasSeenExplain(help, eid) && nextTier <= 3) {
    renderPanel(pickAngelinaHint(step, nextTier, false) || L(step.hint_nudge));
    return;
  }
  if (nextTier === 4) {
    const solutionText = L(step.hint_solution || step.hint_exact || step.hint_60s || step.objective);
    if (!solutionText) {
      renderPanel(t("angelina_no_solution"));
      return;
    }
    showSolutionConfirm(() => {
      track.tier = 4;
      markSeenExplain(help, eid);
      renderPanel(`${t("angelina_hint_exact")}: ${solutionText}`);
      window.Onboarding?.showSolutionPath?.();
      window.StoryEngine?.syncBeacon?.();
      window.saveMe?.();
    });
    return;
  }
  track.tier = nextTier;
  markSeenExplain(help, eid);
  const line =
    nextTier === 1
      ? `${t("angelina_hint_nudge")}: ${L(step.hint_nudge || step.objective)}`
      : nextTier === 2
        ? `${t("angelina_hint_direction")}: ${L(step.hint_60s || step.hint_nudge)}`
        : `${t("angelina_hint_exact")}: ${L(step.hint_exact || step.hint_60s)}`;
  renderPanel(line);
  window.saveMe?.();
}

export function reactAngelina(eventKey) {
  const map = {
    step_ok: t("angelina_react_ok"),
    step_fail: t("angelina_react_retry")
  };
  const line = map[eventKey];
  if (line) renderPanel(line);
}

export function initAngelinaHelp() {
  const btn = document.getElementById("btnAngelinaHelp");
  btn?.addEventListener("click", () => onAngelinaHelpRequest());
  document.addEventListener("keydown", e => {
    if (e.code === "KeyH" && !e.target?.matches?.("input, textarea")) {
      e.preventDefault();
      onAngelinaHelpRequest();
    }
  });
  window.AngelinaHelp = {
    onRequest: onAngelinaHelpRequest,
    react: reactAngelina,
    getSettings: () => ensureHelpSettings(window.me),
    resetHintTier: () => {
      if (window.me?._angelinaHelp) window.me._angelinaHelp.tier = 0;
    }
  };
}
