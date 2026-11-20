/**
 * Angelina's lines. The active voice comes from angelina-voice-config.mjs.
 * espeak-ng is the fallback. Nothing here calls a paid voice service.
 */
import { ANGELINA_VOICE } from "../angelina-voice-config.mjs";

let audio = null;
const heard = [];
let idleTimer = 0;
let lastIdlePlay = 0;
let watchStarted = false;
let lastId = "";
let hintKey = "";

function lang() {
  const code = typeof window.getLanguage === "function" ? window.getLanguage() : "ru";
  return code === "da" || code === "en" ? code : "ru";
}

function t(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

export function resolveClip(cfg, language, id) {
  const code = language === "da" || language === "en" ? language : "ru";
  const espeak = `assets/audio/voice/${code}/${id}.wav`;
  const name = String(cfg?.candidate || "").trim();
  if (!name) return { url: espeak, fallback: "" };
  return {
    url: `assets/audio/voice/candidates/${name}/${code}/${id}.mp3`,
    fallback: espeak
  };
}

export function clipUrl(id) {
  return resolveClip(ANGELINA_VOICE, lang(), id).url;
}

export function playAngelina(id) {
  if (!id) return;
  lastId = id;
  try {
    if (localStorage.getItem("punkme_voice_mute") === "1") return;
  } catch (_) {}
  const choice = resolveClip(ANGELINA_VOICE, lang(), id);
  heard.push(`${lang()}/${id}`);
  if (typeof window !== "undefined") window.__angelinaHeard = heard.slice();
  if (typeof Audio === "undefined") return;
  try {
    if (audio) {
      audio.pause();
      audio = null;
    }
    audio = new Audio(choice.url);
    audio.volume = 1;
    if (choice.fallback) {
      audio.addEventListener("error", () => {
        if (!audio || audio.dataset.fellBack === "1") return;
        audio.dataset.fellBack = "1";
        audio.src = choice.fallback;
        audio.play().catch(() => {});
      }, { once: true });
    }
    audio.play().catch(() => {});
  } catch (_) {}
}

function setHint(key) {
  hintKey = key || "";
  const hint = document.getElementById("angelinaHint");
  if (hint) hint.textContent = t(key);
}

export function refreshHint() {
  if (hintKey) setHint(hintKey);
}

export function replayCurrent() {
  if (lastId) playAngelina(lastId);
}

export function pokeAngelina() {
  idleTimer = typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function mistake() {
  playAngelina("angelina_mistake");
  setHint("angelina_mistake");
  pokeAngelina();
}

export function startIdleWatch() {
  if (watchStarted || typeof window === "undefined") return;
  watchStarted = true;
  pokeAngelina();
  window.addEventListener("keydown", pokeAngelina);
  window.addEventListener("pointerdown", pokeAngelina);
  window.setInterval(() => {
    const crawl = document.getElementById("chapterCrawl");
    if (crawl?.classList.contains("active")) return;
    const now = performance.now();
    if (now - idleTimer < 10000) return;
    if (now - lastIdlePlay < 25000) return;
    lastIdlePlay = now;
    playAngelina("angelina_idle");
    setHint("angelina_idle");
  }, 1000);
}

if (typeof window !== "undefined") {
  window.AngelinaVoice = { playAngelina, mistake, pokeAngelina, startIdleWatch, clipUrl, refreshHint, replayCurrent };
}
