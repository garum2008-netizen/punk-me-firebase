/** Pause menu: help, journal, audio, replay tutorial. */

import { AudioManager } from "./audio-manager.mjs";

function el(id) { return document.getElementById(id); }

function renderJournal() {
  const box = el("gameMenuJournal");
  if (!box || !window.me) return;
  const parts = [];
  if (window.Onboarding?.isActive?.()) {
    parts.push(`<p><b>${typeof t === "function" ? t("onboard_title") : "Tutorial"}</b></p>`);
    window.Onboarding.render?.();
    parts.push(el("questBox")?.innerHTML || "");
  } else if (window.StoryEngine?.renderObjectivePanel) {
    window.StoryEngine.renderObjectivePanel();
    parts.push(el("questBox")?.innerHTML || "");
  }
  box.innerHTML = parts.join("") || `<p>${typeof t === "function" ? t("journal_empty") : "No active quest."}</p>`;
}

function syncAudioSliders() {
  const s = AudioManager.getSettings();
  el("audioMusic")?.value = String(Math.round(s.music * 100));
  el("audioVoice")?.value = String(Math.round(s.voice * 100));
  el("audioSfx")?.value = String(Math.round(s.sfx * 100));
  el("audioMuted")?.checked = !!s.muted;
  el("audioTtsFallback")?.checked = !!s.ttsFallback;
}

export function openGameMenu() {
  document.body.dataset.gamePaused = "1";
  el("gameMenuOverlay")?.classList.add("active");
  renderJournal();
  syncAudioSliders();
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
  el("gameMenuReplayTutorial")?.addEventListener("click", () => {
    window.Onboarding?.replay?.();
    closeGameMenu();
    window.toast?.(typeof t === "function" ? t("tutorial_replay_started") : "Tutorial restarted");
  });
  el("audioMusic")?.addEventListener("input", e => AudioManager.setMusicVolume(Number(e.target.value) / 100));
  el("audioVoice")?.addEventListener("input", e => AudioManager.setVoiceVolume(Number(e.target.value) / 100));
  el("audioSfx")?.addEventListener("input", e => AudioManager.setSfxVolume(Number(e.target.value) / 100));
  el("audioMuted")?.addEventListener("change", e => AudioManager.setMuted(e.target.checked));
  el("audioTtsFallback")?.addEventListener("change", e => AudioManager.setTtsFallback(e.target.checked));
  document.addEventListener("keydown", e => {
    if (e.code === "Escape" && !e.target?.matches?.("input, textarea")) {
      if (el("gameMenuOverlay")?.classList.contains("active")) closeGameMenu();
      else openGameMenu();
    }
  });
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
    AudioManager.unlockFromUserGesture();
    AudioManager.playLine("ep1_intro_01", {
      text: typeof t === "function" ? t("ep1_intro_01") : "Welcome to house 13."
    });
    onStart?.();
  };
  btn?.addEventListener("click", once);
}

export function initStartFlow() {
  window.openGameMenu = openGameMenu;
  window.closeGameMenu = closeGameMenu;
}
