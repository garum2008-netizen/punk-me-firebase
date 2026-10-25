/**
 * PUNK ME — Web Audio manager (music / speech / SFX).
 * Integrator API: playLine, stopSpeech, setLocationMusic, playSfx, unlockAudio.
 */

const STORAGE_KEY = "punkme_audio_v1";
const DUCK_DB = -12;
const DUCK_LINEAR = Math.pow(10, DUCK_DB / 20);
const CROSSFADE_SEC = 1.8;
const DEFAULTS = {
  music: 0.72,
  speech: 0.88,
  sfx: 0.8,
  muted: false,
  temporaryVoice: false
};

const MUSIC_BUCKETS = new Set([
  "home",
  "street",
  "cemetery",
  "city",
  "roof",
  "construction",
  "castle"
]);

const LOC_TO_MUSIC = {
  room: "home",
  kitchen: "home",
  toilet: "home",
  elevator: "home",
  street: "street",
  cemetery: "cemetery",
  city: "city",
  roof: "roof",
  parkour: "roof",
  construction: "construction",
  castle: "castle"
};

const SFX_NAMES = new Set([
  "interact",
  "quest_received",
  "quest_complete",
  "reward_coins",
  "error",
  "ui_click",
  "footstep"
]);

let instance = null;

function prefersMp3() {
  if (typeof document === "undefined") return false;
  const a = document.createElement("audio");
  if (!a.canPlayType) return true;
  const ogg = a.canPlayType('audio/ogg; codecs="vorbis"');
  return !ogg || ogg === "no";
}

function ext() {
  return prefersMp3() ? "mp3" : "ogg";
}

function clamp01(n, fallback) {
  const v = Number(n);
  if (Number.isNaN(v)) return fallback;
  return Math.max(0, Math.min(1, v));
}

function langKey(lang) {
  const l = (lang || (typeof getLanguage === "function" ? getLanguage() : "en")).toLowerCase();
  if (l === "ru" || l === "da") return l;
  return "en";
}

export function createAudioManager() {
  const bus = new EventTarget();
  let ctx = null;
  let unlocked = false;
  let settings = { ...DEFAULTS };
  let voiceManifest = { version: 1, lines: {} };
  let manifestLoaded = false;

  const masterGain = { node: null };
  const channel = {
    music: { gain: null, duck: null },
    speech: { gain: null },
    sfx: { gain: null }
  };

  let musicA = null;
  let musicB = null;
  let musicActive = "a";
  let currentMusicKey = null;
  let ducking = false;
  let captureDest = null;
  let captureGain = null;

  const buffers = new Map();
  const speechQueue = [];
  let speechToken = 0;
  let activeSpeech = null;
  let voicesReady = false;
  const voiceAvailability = { ru: "unknown", en: "unknown", da: "unknown" };

  function loadStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      applySettings(parsed, false);
    } catch (e) {}
  }

  function saveStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(exportSettings()));
    } catch (e) {}
  }

  function applySettings(partial, persist = true) {
    if (!partial || typeof partial !== "object") return;
    settings.music = clamp01(partial.music, settings.music);
    settings.speech = clamp01(partial.speech, settings.speech);
    settings.sfx = clamp01(partial.sfx, settings.sfx);
    if (typeof partial.muted === "boolean") settings.muted = partial.muted;
    if (typeof partial.temporaryVoice === "boolean") settings.temporaryVoice = partial.temporaryVoice;
    syncGains();
    if (persist) saveStorage();
    syncPlayerSettingsBlob();
  }

  function exportSettings() {
    return {
      music: settings.music,
      speech: settings.speech,
      sfx: settings.sfx,
      muted: settings.muted,
      temporaryVoice: settings.temporaryVoice
    };
  }

  function syncPlayerSettingsBlob() {
    if (!window.me) return;
    window.me.settings = window.me.settings || {};
    window.me.settings.audio = exportSettings();
  }

  function ensureGraph() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      masterGain.node = ctx.createGain();
      channel.music.gain = ctx.createGain();
      channel.music.duck = ctx.createGain();
      channel.speech.gain = ctx.createGain();
      channel.sfx.gain = ctx.createGain();
      channel.music.gain.connect(channel.music.duck);
      channel.music.duck.connect(masterGain.node);
      channel.speech.gain.connect(masterGain.node);
      channel.sfx.gain.connect(masterGain.node);
      masterGain.node.connect(ctx.destination);
      channel.music.duck.gain.value = 1;
      syncGains();
    }
    return true;
  }

  function syncGains() {
    const m = settings.muted ? 0 : 1;
    if (masterGain.node) masterGain.node.gain.value = m;
    if (channel.music.gain) channel.music.gain.gain.value = settings.music;
    if (channel.speech.gain) channel.speech.gain.gain.value = settings.speech;
    if (channel.sfx.gain) channel.sfx.gain.gain.value = settings.sfx;
  }

  function rampDuck(on) {
    if (!ctx || !channel.music.duck) return;
    const t = ctx.currentTime;
    const target = on ? DUCK_LINEAR : 1;
    ducking = on;
    channel.music.duck.gain.cancelScheduledValues(t);
    channel.music.duck.gain.setValueAtTime(channel.music.duck.gain.value, t);
    channel.music.duck.gain.linearRampToValueAtTime(target, t + 0.35);
  }

  function unlockAudio() {
    if (!ensureGraph()) return Promise.resolve(false);
    // Synchronous silent blip — required for Safari / WebKit user-gesture unlock.
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const blip = ctx.createBufferSource();
      blip.buffer = buffer;
      blip.connect(masterGain.node);
      blip.start(0);
    } catch (e) {}
    try {
      const tag = new Audio(`assets/audio/sfx/ui_click.${ext()}`);
      tag.volume = 0.02;
      const p = tag.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } catch (e) {}
    const resume = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
    return resume.then(() => {
      unlocked = ctx.state === "running";
      if (unlocked && !manifestLoaded) loadVoiceManifest();
      return unlocked;
    }).catch(() => {
      unlocked = false;
      return false;
    });
  }

  function isUnlocked() {
    return unlocked && ctx && ctx.state === "running";
  }

  async function loadVoiceManifest() {
    if (manifestLoaded) return voiceManifest;
    try {
      const res = await fetch("assets/audio/voice/manifest.json");
      if (res.ok) voiceManifest = await res.json();
    } catch (e) {}
    manifestLoaded = true;
    refreshVoiceAvailability();
    return voiceManifest;
  }

  function refreshVoiceAvailability() {
    const langs = ["ru", "en", "da"];
    const lines = voiceManifest?.lines || {};
    const hasManifestLine = langs.some(l =>
      Object.values(lines).some(entry => entry && entry[l])
    );
    const synth = window.speechSynthesis;
    const voices = synth ? synth.getVoices() : [];
    for (const l of langs) {
      const manifestOk = Object.values(lines).some(entry => entry?.[l]);
      const synthOk = voices.some(v => (v.lang || "").toLowerCase().startsWith(l));
      if (manifestOk) voiceAvailability[l] = "recorded";
      else if (synthOk) voiceAvailability[l] = "synth";
      else voiceAvailability[l] = "none";
    }
    if (!hasManifestLine && !voices.length && synth) {
      synth.onvoiceschanged = () => {
        voicesReady = true;
        refreshVoiceAvailability();
        bus.dispatchEvent(new CustomEvent("voiceschanged", { detail: { ...voiceAvailability } }));
      };
    } else {
      voicesReady = true;
    }
    bus.dispatchEvent(new CustomEvent("voiceschanged", { detail: { ...voiceAvailability } }));
  }

  function getVoiceAvailability() {
    return { ...voiceAvailability };
  }

  function resolveLineUrl(id, lang) {
    const lk = langKey(lang);
    const entry = voiceManifest?.lines?.[id];
    if (entry?.[lk]) return `assets/audio/${entry[lk].replace(/^\//, "")}`;
    return `assets/audio/voice/${lk}/${id}.${ext()}`;
  }

  async function decodeUrl(url) {
    if (buffers.has(url)) return buffers.get(url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`audio fetch ${url}`);
    const ab = await res.arrayBuffer();
    const buf = await ctx.decodeAudioData(ab);
    buffers.set(url, buf);
    return buf;
  }

  function musicUrl(bucket) {
    return `assets/audio/music/music_${bucket}.${ext()}`;
  }

  function stopMusicSlot(slot) {
    if (!slot?.source) return;
    try {
      slot.source.stop();
    } catch (e) {}
    slot.source = null;
  }

  async function startMusicOnSlot(slot, bucket, fadeIn) {
    const url = musicUrl(bucket);
    let buf;
    try {
      buf = await decodeUrl(url);
    } catch (e) {
      console.warn("music load failed", bucket, e);
      return;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = fadeIn ? 0 : 1;
    src.connect(g);
    g.connect(channel.music.gain);
    src.start();
    if (fadeIn) {
      const t = ctx.currentTime;
      g.gain.linearRampToValueAtTime(1, t + CROSSFADE_SEC);
    }
    slot.source = src;
    slot.gain = g;
  }

  async function setLocationMusic(locOrBucket) {
    if (!unlocked) return;
    if (!ensureGraph()) return;
    const bucket = MUSIC_BUCKETS.has(locOrBucket)
      ? locOrBucket
      : LOC_TO_MUSIC[locOrBucket] || "home";
    if (bucket === currentMusicKey && (musicA?.source || musicB?.source)) return;
    currentMusicKey = bucket;

    if (!musicA) musicA = { source: null, gain: null };
    if (!musicB) musicB = { source: null, gain: null };

    const incoming = musicActive === "a" ? musicB : musicA;
    const outgoing = musicActive === "a" ? musicA : musicB;
    musicActive = musicActive === "a" ? "b" : "a";

    await startMusicOnSlot(incoming, bucket, true);

    if (outgoing?.source && outgoing.gain) {
      const t = ctx.currentTime;
      outgoing.gain.gain.cancelScheduledValues(t);
      outgoing.gain.gain.setValueAtTime(outgoing.gain.gain.value, t);
      outgoing.gain.gain.linearRampToValueAtTime(0, t + CROSSFADE_SEC);
      const old = outgoing.source;
      setTimeout(() => {
        try {
          old.stop();
        } catch (e) {}
      }, CROSSFADE_SEC * 1000 + 50);
      outgoing.source = null;
    }
  }

  async function playSfx(name) {
    if (!SFX_NAMES.has(name)) return;
    if (!unlocked || settings.muted) return;
    if (!ensureGraph()) return;
    const url = `assets/audio/sfx/${name}.${ext()}`;
    try {
      const buf = await decodeUrl(url);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(channel.sfx.gain);
      src.start();
    } catch (e) {
      console.warn("sfx", name, e);
    }
  }

  function emitLineEvent(type, detail) {
    bus.dispatchEvent(new CustomEvent(type, { detail }));
  }

  function subtitleDurationMs(text) {
    return Math.max(2200, (text || "").length * 48);
  }

  function cancelActiveSpeech() {
    if (!activeSpeech) return;
    if (activeSpeech.utterance && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    if (activeSpeech.timeout) clearTimeout(activeSpeech.timeout);
    if (activeSpeech.audio) {
      try {
        activeSpeech.audio.stop();
      } catch (e) {}
    }
    activeSpeech = null;
  }

  function finishSpeechLine(handle, detail) {
    if (!activeSpeech || activeSpeech.handle !== handle) return;
    cancelActiveSpeech();
    rampDuck(false);
    emitLineEvent("onLineEnd", detail);
    activeSpeech = null;
    drainSpeechQueue();
  }

  function drainSpeechQueue() {
    if (activeSpeech || !speechQueue.length) return;
    const job = speechQueue.shift();
    runSpeechJob(job);
  }

  async function runSpeechJob(job) {
    const token = ++speechToken;
    const handle = { id: job.id, token, cancel: () => {} };
    const detail = {
      id: job.id,
      subtitle: job.subtitle || "",
      lang: langKey(job.lang),
      characterId: job.characterId || null
    };
    emitLineEvent("onLineStart", detail);

    handle.cancel = () => {
      if (activeSpeech?.token !== token) return;
      cancelActiveSpeech();
      rampDuck(false);
      emitLineEvent("onLineEnd", detail);
      activeSpeech = null;
    };

    activeSpeech = { handle, token, detail };

    if (settings.muted) {
      const ms = subtitleDurationMs(job.subtitle);
      activeSpeech.timeout = setTimeout(() => finishSpeechLine(handle, detail), ms);
      rampDuck(true);
      return handle;
    }

    rampDuck(true);
    const url = resolveLineUrl(job.id, job.lang);
    let played = false;
    try {
      const buf = await decodeUrl(url);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(channel.speech.gain);
      src.onended = () => finishSpeechLine(handle, detail);
      src.start();
      activeSpeech.audio = src;
      played = true;
    } catch (e) {
      played = false;
    }

    if (!played && settings.temporaryVoice && job.subtitle && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(job.subtitle);
      u.lang = langKey(job.lang) === "da" ? "da-DK" : langKey(job.lang) === "ru" ? "ru-RU" : "en-US";
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find(v => (v.lang || "").toLowerCase().startsWith(langKey(job.lang)));
      if (match) u.voice = match;
      u.volume = settings.speech;
      u.onend = () => finishSpeechLine(handle, detail);
      u.onerror = () => finishSpeechLine(handle, detail);
      activeSpeech.utterance = u;
      window.speechSynthesis.speak(u);
      return handle;
    }

    if (!played) {
      const ms = subtitleDurationMs(job.subtitle);
      activeSpeech.timeout = setTimeout(() => finishSpeechLine(handle, detail), ms);
    }
    return handle;
  }

  function playLine(id, opts = {}) {
    const job = {
      id: String(id),
      subtitle: opts.subtitle || "",
      lang: opts.lang,
      characterId: opts.characterId || null,
      onEnd: opts.onEnd
    };
    const handle = { id: job.id, cancel: () => {} };
    speechQueue.push(job);
    if (!activeSpeech) drainSpeechQueue();
    return handle;
  }

  function stopSpeech() {
    speechQueue.length = 0;
    speechToken++;
    if (activeSpeech) {
      const detail = activeSpeech.detail || { id: "", subtitle: "", lang: langKey() };
      cancelActiveSpeech();
      rampDuck(false);
      emitLineEvent("onLineEnd", detail);
      activeSpeech = null;
    }
  }

  function setMuted(m) {
    settings.muted = !!m;
    syncGains();
    saveStorage();
    if (settings.muted) stopSpeech();
  }

  function getMuted() {
    return settings.muted;
  }

  function setChannelVolume(which, v) {
    if (!(which in settings)) return;
    settings[which] = clamp01(v, settings[which]);
    syncGains();
    saveStorage();
  }

  function getChannelVolume(which) {
    return settings[which];
  }

  function setTemporaryVoice(on) {
    settings.temporaryVoice = !!on;
    saveStorage();
  }

  function getTemporaryVoice() {
    return settings.temporaryVoice;
  }

  function importFromPlayerSave(audio) {
    applySettings(audio, true);
  }

  function addEventListener(type, fn) {
    bus.addEventListener(type, fn);
  }

  function removeEventListener(type, fn) {
    bus.removeEventListener(type, fn);
  }

  function getDuckFactor() {
    return channel.music.duck?.gain?.value ?? 1;
  }

  function getCreditsLine() {
    return "Music & SFX: PUNK ME (procedural, CC0). Voice lines: cast recordings (pending).";
  }

  /** QA / episode capture: parallel tap of master bus for MediaRecorder in-page. */
  function installCaptureTap() {
    if (!ensureGraph()) return null;
    if (!captureDest) {
      captureDest = ctx.createMediaStreamDestination();
      captureGain = ctx.createGain();
      captureGain.gain.value = 5.5;
      masterGain.node.connect(captureGain);
      captureGain.connect(captureDest);
    }
    return captureDest.stream;
  }

  loadStorage();
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.getVoices();
  }

  return {
    unlockAudio,
    isUnlocked,
    setLocationMusic,
    playSfx,
    playLine,
    stopSpeech,
    setMuted,
    getMuted,
    setChannelVolume,
    getChannelVolume,
    setTemporaryVoice,
    getTemporaryVoice,
    exportSettings,
    importFromPlayerSave,
    getVoiceAvailability,
    refreshVoiceAvailability,
    addEventListener,
    removeEventListener,
    getDuckFactor,
    getCreditsLine,
    installCaptureTap,
    /** @internal tests */
    _test: { getCtx: () => ctx, isDucking: () => ducking }
  };
}

export function initAudioManager() {
  if (!instance) instance = createAudioManager();
  window.AudioManager = instance;
  return instance;
}

export function getAudioManager() {
  return instance || initAudioManager();
}
