/** Pause menu: help, journal, replay tutorial; audio via openAudioSettings (PR #35). */

import { getAudioManager } from "./audio-manager.mjs";

function el(id) { return document.getElementById(id); }

function lang() {
  return typeof getLanguage === "function" ? getLanguage() : "en";
}

function setStartOverlayVisible(visible) {
  const ov = el("startGameOverlay");
  const btn = el("btnStartGame");
  if (!ov) return;
  if (visible) {
    refreshStartOverlayCopy();
    ov.classList.add("active");
    ov.setAttribute("aria-hidden", "false");
    ov.inert = false;
    btn?.removeAttribute("tabindex");
    btn?.focus?.();
  } else {
    ov.classList.remove("active");
    ov.setAttribute("aria-hidden", "true");
    ov.inert = true;
    btn?.setAttribute("tabindex", "-1");
  }
}

function refreshStartOverlayCopy() {
  const body = el("startGameOverlay")?.querySelector("[data-i18n=start_game_body]");
  if (!body || typeof t !== "function") return;
  const me = window.me;
  const inCh1 =
    me?.onboarding?.done ||
    me?.story?.flags?.ch1_started ||
    (me?.story?.chapter != null && me.story.chapter >= 1) ||
    (window.StoryEngine?.ensureStoryState?.(me)?.chapter >= 1);
  body.textContent = inCh1 ? t("start_game_body_ch1") : t("start_game_body");
}

function shouldSkipStartOverlay() {
  const me = window.me;
  if (!me) return false;
  if (me.tutorial?.episode1Started) return true;
  const ob = me.onboarding;
  if (ob && !ob.done) {
    if ((ob.step || 0) > 0) return true;
    const prog = ob.progress || {};
    if (Object.keys(prog).some(k => !k.startsWith("_") && (prog[k] || 0) > 0)) return true;
  }
  return false;
}

function shouldPlayStartNarrator() {
  const me = window.me;
  if (!me?.onboarding || me.onboarding.done) return false;
  if ((me.onboarding.step || 0) > 0) return false;
  return true;
}

function playStartNarrator() {
  if (!shouldPlayStartNarrator()) return;
  const line = typeof t === "function" ? t("start_narrator_welcome") : "";
  if (!line || line === "start_narrator_welcome") return;
  window.SpeechBridge?.play?.({
    text: line,
    characterId: "narrator",
    lineId: "start_narrator_welcome",
    subtitle: line
  });
}

function renderJournal() {
  const box = el("gameMenuJournal");
  if (!box || !window.me) return;
  if (window.Onboarding?.isActive?.()) {
    window.Onboarding.render?.();
    box.innerHTML = el("questBox")?.innerHTML || "";
    return;
  }
  if (window.StoryEngine?.renderObjectivePanel) window.StoryEngine.renderObjectivePanel();
  box.innerHTML = el("questBox")?.innerHTML || `<p>${typeof t === "function" ? t("journal_empty") : "No active quest."}</p>`;
}

export function openGameMenu() {
  document.body.dataset.gamePaused = "1";
  el("gameMenuOverlay")?.classList.add("active");
  el("gameMenuOverlay")?.setAttribute("aria-hidden", "false");
  window.Onboarding?.onJournalOpen?.();
  renderJournal();
}

export function closeGameMenu() {
  document.body.dataset.gamePaused = "0";
  const ov = el("gameMenuOverlay");
  ov?.classList.remove("active");
  ov?.setAttribute("aria-hidden", "true");
}

export function initGameMenu() {
  setStartOverlayVisible(false);
  el("btnGameMenu")?.addEventListener("click", () => openGameMenu());
  el("gameMenuClose")?.addEventListener("click", () => closeGameMenu());
  el("gameMenuHelp")?.addEventListener("click", () => {
    closeGameMenu();
    window.openHowToPlay?.();
  });
  el("gameMenuAudio")?.addEventListener("click", () => {
    window.openAudioSettings?.();
  });
  el("gameMenuReplayTutorial")?.addEventListener("click", () => {
    window.Onboarding?.replay?.();
    closeGameMenu();
    window.toast?.(typeof t === "function" ? t("tutorial_replay_started") : "Tutorial restarted");
  });
  document.addEventListener("keydown", e => {
    if (e.code === "Escape" && !e.target?.matches?.("input, textarea")) {
      if (el("gameMenuOverlay")?.classList.contains("active")) closeGameMenu();
      else openGameMenu();
    }
  });
}

function playEp1Line(id, fallbackKey) {
  const am = getAudioManager();
  const subtitle = typeof t === "function" ? t(fallbackKey) : id;
  if (!subtitle || subtitle === fallbackKey) return;
  am?.playLine?.(id, { subtitle, lang: lang() });
}

export function showStartGameOverlay(onStart) {
  const ov = el("startGameOverlay");
  if (!ov) {
    onStart?.();
    return;
  }
  if (shouldSkipStartOverlay()) {
    onStart?.();
    return;
  }
  window.__punkHideLoading?.();
  setStartOverlayVisible(true);
  const btn = el("btnStartGame");
  const once = () => {
    btn?.removeEventListener("click", once);
    setStartOverlayVisible(false);
    if (window.me) {
      window.me.tutorial = { ...(window.me.tutorial || {}), episode1Started: true, version: 1, startedAt: Date.now() };
      window.saveMe?.();
    }
    const am = getAudioManager();
    am?.unlockAudio?.().then(() => {
      am?.setLocationMusic?.(window.me?.location || "room");
      playStartNarrator();
    });
    onStart?.();
  };
  btn?.addEventListener("click", once);
}

export function initStartFlow() {
  window.openGameMenu = openGameMenu;
  window.closeGameMenu = closeGameMenu;
  window.playEpisodeTutorialLine = playTutorialLineForStep;
  window.refreshStartOverlayCopy = refreshStartOverlayCopy;
  if (window.__playerLoaded && window.me?.characterId && !window.me.tutorial?.episode1Started) {
    showStartGameOverlay(() => {});
  }
  window.dispatchEvent(new Event("punk-episode1-ready"));
}

export function playTutorialLineForStep(stepId) {
  const map = {
    move: "ep1_tut_move",
    go_street: "ep1_tut_street",
    talk_razor: "ep1_tut_talk"
  };
  const line = map[stepId];
  if (line) playEp1Line(line, line);
}
