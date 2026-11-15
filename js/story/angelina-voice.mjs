/**
 * Angelina's lines. Files are local espeak-ng recordings, one per language.
 * Nothing here calls a paid voice service.
 */

let audio = null;
const heard = [];
let idleTimer = 0;
let lastIdlePlay = 0;
let watchStarted = false;

function lang() {
  const code = typeof window.getLanguage === "function" ? window.getLanguage() : "ru";
  return code === "da" || code === "en" ? code : "ru";
}

function t(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

export function clipUrl(id) {
  return `assets/audio/voice/${lang()}/${id}.wav`;
}

export function playAngelina(id) {
  if (!id) return;
  try {
    if (localStorage.getItem("punkme_voice_mute") === "1") return;
  } catch (_) {}
  const url = clipUrl(id);
  heard.push(`${lang()}/${id}`);
  if (typeof window !== "undefined") window.__angelinaHeard = heard.slice();
  if (typeof Audio === "undefined") return;
  try {
    if (audio) {
      audio.pause();
      audio = null;
    }
    audio = new Audio(url);
    audio.volume = 1;
    audio.play().catch(() => {});
  } catch (_) {}
}

function setHint(key) {
  const hint = document.getElementById("angelinaHint");
  if (hint) hint.textContent = t(key);
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
  window.AngelinaVoice = { playAngelina, mistake, pokeAngelina, startIdleWatch, clipUrl };
}
