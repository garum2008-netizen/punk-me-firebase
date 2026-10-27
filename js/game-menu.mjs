/** Pause menu: help, journal, replay tutorial; audio via openAudioSettings (PR #35). */

import { getAudioManager } from "./audio-manager.mjs";

function el(id) { return document.getElementById(id); }

function lang() {
  return typeof getLanguage === "function" ? getLanguage() : "en";
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
  window.Onboarding?.onJournalOpen?.();
  renderJournal();
}

export function closeGameMenu() {
  document.body.dataset.gamePaused = "0";
  el("gameMenuOverlay")?.classList.remove("active");
}

export function initGameMenu() {
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
  am?.playLine?.(id, { subtitle, lang: lang() });
}

export function showStartGameOverlay(onStart) {
  const ov = el("startGameOverlay");
  if (!ov) {
    onStart?.();
    return;
  }
  if (window.me?.tutorial?.episode1Started) {
    onStart?.();
    return;
  }
  ov.classList.add("active");
  const btn = el("btnStartGame");
  const once = () => {
    btn?.removeEventListener("click", once);
    ov.classList.remove("active");
    if (window.me) {
      window.me.tutorial = { ...(window.me.tutorial || {}), episode1Started: true, version: 1, startedAt: Date.now() };
      window.saveMe?.();
    }
    const am = getAudioManager();
    am?.unlockAudio?.().then(() => {
      am?.setLocationMusic?.(window.me?.location || "room");
      playEp1Line("ep1_intro_01", "ep1_intro_01");
      playEp1Line("ep1_intro_02", "ep1_intro_02");
    });
    onStart?.();
  };
  btn?.addEventListener("click", once);
}

export function initStartFlow() {
  window.openGameMenu = openGameMenu;
  window.closeGameMenu = closeGameMenu;
  window.playEpisodeTutorialLine = playTutorialLineForStep;
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
