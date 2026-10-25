/** Episode 1 audio facade — integrates licensed assets from docs/audio/LICENSES.md (branch b). */

const DEFAULT = {
  music: 0.55,
  voice: 0.85,
  sfx: 0.7,
  muted: false,
  ttsFallback: false
};

let unlocked = false;
let musicEl = null;
let ducking = false;

function settings() {
  const s = window.me?.settings?.audio;
  return { ...DEFAULT, ...(s || {}) };
}

function persist(patch) {
  if (!window.me) return;
  window.me.settings = window.me.settings || {};
  window.me.settings.audio = { ...settings(), ...patch };
  window.saveMe?.();
}

function subtitle(text) {
  const el = document.getElementById("voiceSubtitle");
  if (!el) return;
  if (!text) {
    el.textContent = "";
    el.classList.remove("visible");
    return;
  }
  el.textContent = text;
  el.classList.add("visible");
}

export const AudioManager = {
  unlockFromUserGesture() {
    unlocked = true;
    if (!musicEl) {
      musicEl = new Audio();
      musicEl.loop = true;
      musicEl.volume = settings().muted ? 0 : settings().music * 0.4;
    }
    musicEl.play().catch(() => {});
  },
  stopMusic() {
    musicEl?.pause();
  },
  setMusicVolume(v) {
    persist({ music: v });
    if (musicEl && !settings().muted) musicEl.volume = v * 0.4;
  },
  setVoiceVolume(v) { persist({ voice: v }); },
  setSfxVolume(v) { persist({ sfx: v }); },
  setMuted(on) {
    persist({ muted: !!on });
    if (musicEl) musicEl.volume = on ? 0 : settings().music * 0.4;
  },
  setTtsFallback(on) {
    persist({ ttsFallback: !!on });
  },
  getSettings: () => settings(),
  playLine(lineId, opts = {}) {
    const text = opts.text || (typeof window.t === "function" ? window.t(`line_${lineId}`) : lineId);
    subtitle(text);
    if (settings().muted) return;
    if (ducking && musicEl) musicEl.volume = settings().music * 0.12;
    const asset = `assets/audio/voice/${lineId}.mp3`;
    const a = new Audio(asset);
    a.volume = settings().voice;
    a.onended = () => {
      if (musicEl && !settings().muted) musicEl.volume = settings().music * 0.4;
      ducking = false;
    };
    a.onerror = () => {
      if (settings().ttsFallback && window.speechSynthesis && opts.text) {
        const u = new SpeechSynthesisUtterance(opts.text);
        u.volume = settings().voice;
        window.speechSynthesis.speak(u);
      }
      ducking = false;
    };
    ducking = true;
    a.play().catch(() => a.onerror());
  },
  stopLine() {
    subtitle("");
    window.speechSynthesis?.cancel?.();
    if (musicEl && !settings().muted) musicEl.volume = settings().music * 0.4;
    ducking = false;
  },
  playSfx(name) {
    if (settings().muted) return;
    const a = new Audio(`assets/audio/sfx/${name}.mp3`);
    a.volume = settings().sfx;
    a.play().catch(() => {});
  }
};

export function initAudioManager() {
  window.AudioManager = AudioManager;
  return AudioManager;
}
