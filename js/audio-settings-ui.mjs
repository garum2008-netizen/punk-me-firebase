import { getAudioManager } from "./audio-manager.mjs";

let panelEl = null;
let bound = false;

function t(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

function voiceStatusLabel(lang, status) {
  if (status === "recorded") return t("audio_voice_recorded");
  if (status === "synth") return t("audio_voice_synth");
  return t("audio_voice_none");
}

function renderVoiceRows(am) {
  const wrap = document.getElementById("audioVoiceStatus");
  if (!wrap) return;
  const avail = am.getVoiceAvailability();
  wrap.innerHTML = ["ru", "en", "da"]
    .map(l => {
      const langLabel = l.toUpperCase();
      return `<div class="audio-voice-row"><span>${langLabel}</span><span data-voice-lang="${l}">${voiceStatusLabel(l, avail[l])}</span></div>`;
    })
    .join("");
}

function syncSliders(am) {
  const m = document.getElementById("audioVolMusic");
  const s = document.getElementById("audioVolSpeech");
  const x = document.getElementById("audioVolSfx");
  if (m) m.value = String(Math.round(am.getChannelVolume("music") * 100));
  if (s) s.value = String(Math.round(am.getChannelVolume("speech") * 100));
  if (x) x.value = String(Math.round(am.getChannelVolume("sfx") * 100));
  const tv = document.getElementById("audioTemporaryVoice");
  if (tv) tv.checked = am.getTemporaryVoice();
  updateHudMute(am);
}

function updateHudMute(am) {
  const btn = document.getElementById("btnAudioMute");
  if (!btn) return;
  const muted = am.getMuted();
  btn.setAttribute("aria-pressed", muted ? "true" : "false");
  btn.textContent = muted ? t("audio_unmute_all") : t("audio_mute_all");
  btn.title = muted ? t("audio_unmute_all") : t("audio_mute_all");
  const legacy = document.getElementById("btnVoiceMute");
  if (legacy) legacy.textContent = muted ? t("voice_unmute") : t("voice_mute");
}

function buildPanel() {
  if (panelEl) return panelEl;
  panelEl = document.createElement("div");
  panelEl.id = "audioSettingsModal";
  panelEl.className = "modal audio-settings-modal";
  panelEl.innerHTML = `
    <button type="button" class="close" id="audioSettingsClose">✕</button>
    <h2 data-i18n="audio_settings_title">Audio</h2>
    <label class="audio-slider-row"><span data-i18n="audio_music">Music</span>
      <input type="range" id="audioVolMusic" min="0" max="100" value="72"></label>
    <label class="audio-slider-row"><span data-i18n="audio_speech">Speech</span>
      <input type="range" id="audioVolSpeech" min="0" max="100" value="88"></label>
    <label class="audio-slider-row"><span data-i18n="audio_sfx">SFX</span>
      <input type="range" id="audioVolSfx" min="0" max="100" value="80"></label>
    <label class="audio-toggle-row">
      <input type="checkbox" id="audioTemporaryVoice">
      <span data-i18n="audio_temp_voice">Temporary computer voice</span>
    </label>
    <p class="audio-hint" data-i18n="audio_temp_voice_hint">Off by default. Uses browser speech when no recorded line exists.</p>
    <div id="audioVoiceStatus" class="audio-voice-status"></div>
  `;
  document.body.appendChild(panelEl);
  return panelEl;
}

function openPanel() {
  const am = getAudioManager();
  buildPanel();
  panelEl.classList.add("active");
  if (typeof applyI18nDom === "function") applyI18nDom(panelEl);
  syncSliders(am);
  renderVoiceRows(am);
}

function closePanel() {
  panelEl?.classList.remove("active");
}

export function initAudioSettingsUi() {
  const am = getAudioManager();
  if (bound) return;
  bound = true;

  buildPanel();
  panelEl.querySelector("#audioSettingsClose")?.addEventListener("click", closePanel);

  const hud = document.querySelector(".hud");
  if (hud && !document.getElementById("btnAudioMute")) {
    const muteBtn = document.createElement("button");
    muteBtn.type = "button";
    muteBtn.className = "lang-btn hud-desktop-only";
    muteBtn.id = "btnAudioMute";
    muteBtn.addEventListener("click", () => {
      am.setMuted(!am.getMuted());
      syncSliders(am);
      am.playSfx("ui_click");
    });
    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "lang-btn hud-desktop-only";
    openBtn.id = "btnAudioSettings";
    openBtn.dataset.i18n = "audio_settings_btn";
    openBtn.textContent = t("audio_settings_btn");
    openBtn.addEventListener("click", () => {
      am.playSfx("ui_click");
      openPanel();
    });
    const langSwitch = document.getElementById("langSwitch");
    if (langSwitch?.parentElement) {
      langSwitch.parentElement.insertBefore(muteBtn, langSwitch);
      langSwitch.parentElement.insertBefore(openBtn, langSwitch);
    }
  }

  const onSlider = (id, channel) => {
    document.getElementById(id)?.addEventListener("input", e => {
      am.setChannelVolume(channel, Number(e.target.value) / 100);
    });
  };
  onSlider("audioVolMusic", "music");
  onSlider("audioVolSpeech", "speech");
  onSlider("audioVolSfx", "sfx");
  document.getElementById("audioTemporaryVoice")?.addEventListener("change", e => {
    am.setTemporaryVoice(!!e.target.checked);
    am.refreshVoiceAvailability();
    renderVoiceRows(am);
  });

  am.addEventListener("voiceschanged", () => renderVoiceRows(am));
  am.addEventListener("onLineStart", e => {
    const sub = document.getElementById("voiceSubtitle");
    if (!sub) return;
    const text = e.detail?.subtitle || "";
    const cid = e.detail?.characterId;
    const name = cid && typeof tNpcName === "function" ? tNpcName(cid) : "";
    sub.textContent = name ? `${name}: ${text}` : text;
    sub.classList.add("visible");
    clearTimeout(sub._hideT);
  });
  am.addEventListener("onLineEnd", () => {
    const sub = document.getElementById("voiceSubtitle");
    if (!sub) return;
    clearTimeout(sub._hideT);
    sub._hideT = setTimeout(() => sub.classList.remove("visible"), 400);
  });

  syncSliders(am);
  renderVoiceRows(am);

  window.toggleVoiceMute = function () {
    am.setMuted(!am.getMuted());
    syncSliders(am);
  };

  window.openAudioSettings = openPanel;
  window.__audioOnLangChanged = () => {
    if (panelEl?.classList.contains("active") && typeof applyI18nDom === "function") applyI18nDom(panelEl);
    renderVoiceRows(am);
    updateHudMute(am);
    const settingsBtn = document.getElementById("btnAudioSettings");
    if (settingsBtn) settingsBtn.textContent = t("audio_settings_btn");
  };
}
