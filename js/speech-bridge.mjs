import { getAudioManager } from "./audio-manager.mjs";

let catalog = { lines: [] };
let indexByText = new Map();
let loaded = false;

function langKey() {
  return typeof getLanguage === "function" ? getLanguage() : "en";
}

function normalize(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

async function loadCatalog() {
  if (loaded) return catalog;
  try {
    const res = await fetch("data/audio/voice-lines.json");
    if (res.ok) catalog = await res.json();
  } catch (e) {}
  indexByText = new Map();
  for (const line of catalog.lines || []) {
    for (const lang of ["ru", "en", "da"]) {
      const text = normalize(line[lang]);
      if (!text) continue;
      const key = `${line.characterId || ""}|${lang}|${text}`;
      indexByText.set(key, line.id);
    }
  }
  loaded = true;
  return catalog;
}

function resolveLineId(text, characterId) {
  const lang = langKey();
  const key = `${characterId || ""}|${lang}|${normalize(text)}`;
  return indexByText.get(key) || null;
}

function markHeard(lineId) {
  if (!lineId || !window.me) return;
  window.me.dialogueHeard = window.me.dialogueHeard || {};
  if (window.me.dialogueHeard[lineId]) return;
  window.me.dialogueHeard[lineId] = true;
  if (window.__playerLoaded && typeof window.saveMe === "function") {
    try {
      window.saveMe();
    } catch (e) {}
  }
}

function subtitleFor(lineId, text, characterId) {
  const sub = text || "";
  const name =
    characterId && characterId !== "narrator" && typeof window.tNpcName === "function"
      ? window.tNpcName(characterId)
      : characterId === "narrator" && typeof window.t === "function"
        ? window.t("narrator_name")
        : "";
  return name ? `${name}: ${sub}` : sub;
}

export async function initSpeechBridge() {
  await loadCatalog();
  const am = getAudioManager();
  am.addEventListener("onLineStart", ev => {
    const sub = document.getElementById("voiceSubtitle");
    if (!sub) return;
    const text = ev.detail?.subtitle || "";
    sub.textContent = text;
    sub.classList.add("visible");
    clearTimeout(sub._hideT);
  });
  am.addEventListener("onLineEnd", ev => {
    if (ev.detail?.id) markHeard(ev.detail.id);
    const sub = document.getElementById("voiceSubtitle");
    if (!sub) return;
    clearTimeout(sub._hideT);
    sub._hideT = setTimeout(() => sub.classList.remove("visible"), 400);
  });
}

export function playSpeechLine(opts = {}) {
  const am = getAudioManager();
  if (!am.isUnlocked()) return null;
  const text = opts.text || "";
  const characterId = opts.characterId || opts.role || "npc";
  const lineId = opts.lineId || resolveLineId(text, characterId) || `legacy_${characterId}_${hashText(text)}`;
  const subtitle = opts.subtitle || subtitleFor(lineId, text, characterId);
  const handle = am.playLine(lineId, {
    subtitle,
    characterId,
    lang: opts.lang
  });
  if (opts.onEnd) {
    const once = ev => {
      if (ev.detail?.id === lineId) {
        am.removeEventListener("onLineEnd", once);
        opts.onEnd();
      }
    };
    am.addEventListener("onLineEnd", once);
  }
  return handle;
}

function hashText(text) {
  return Math.abs([...text].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0));
}

export function stopAllSpeech() {
  getAudioManager().stopSpeech();
}

window.SpeechBridge = {
  init: initSpeechBridge,
  play: playSpeechLine,
  stop: stopAllSpeech,
  resolveLineId
};
