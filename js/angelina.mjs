/** In-world guide UI. Angelina herself is the 3D companion; this is her speech. */

import { installStoryChapters, chapterTitle, currentChapterIndex, journalHtml as chapterJournal } from "./story-chapters.mjs";
import { getLine, lineText, objectiveBeatId, selectBeat } from "./angelina-lines.mjs";

installStoryChapters();

const MUTE_KEY = "punkme_angelina_mute";
const MIN_KEY = "punkme_angelina_min";
const VOICE_KEY = "punkme_angelina_voice";

let said = {};
let lastMoveAt = Date.now();
let lastPos = null;
let mood = "talk";
let currentId = "hello";
let currentText = "";
let booted = false;

function lang() {
  return typeof window.getLanguage === "function" ? window.getLanguage() : "ru";
}

function t(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

function loadFlag(key) {
  try { return localStorage.getItem(key) === "1"; } catch { return false; }
}

function saveFlag(key, on) {
  try { localStorage.setItem(key, on ? "1" : "0"); } catch { /* ignore */ }
}

function flags() {
  window.__angelinaFlags = window.__angelinaFlags || {};
  return window.__angelinaFlags;
}

function readState() {
  const me = window.me || {};
  const now = Date.now();
  let idleSec = 0;
  if (me.x != null && !lastPos) lastMoveAt = now;
  if (me.x != null && lastPos) {
    const moved = Math.hypot((me.x || 0) - lastPos.x, (me.y || 0) - lastPos.y) > 0.8;
    if (moved) lastMoveAt = now;
    idleSec = (now - lastMoveAt) / 1000;
  }
  lastPos = { x: me.x || 0, y: me.y || 0 };
  const f = flags();
  const fight = !!document.getElementById("duel3dHud") && !document.getElementById("duel3dHud").classList.contains("hidden");
  return {
    now,
    step: me.onboarding?.step || 0,
    done: !!me.onboarding?.done,
    location: me.location || "room",
    coins: me.coins || 0,
    joined: !!me.story?.flags?.joined_gang,
    hangoutStage: me.story?.hangoutStage || 0,
    fight: fight || !!document.getElementById("fightOverlay")?.classList.contains("active"),
    idleSec,
    justLost: !!f.lost,
    justWon: !!f.won,
    justJoined: !!f.joined,
    justBrick: !!f.brick,
    justBroke: !!f.broke,
    justDecor: !!f.decor,
    justHangout: !!f.hangout
  };
}

function consumeFlags(beat) {
  const f = flags();
  if (!beat) return;
  if (beat.id === "duel_lose") f.lost = false;
  if (beat.id === "duel_win") f.won = false;
  if (beat.id === "gang") f.joined = false;
  if (beat.id === "brick") f.brick = false;
  if (beat.id === "broke") f.broke = false;
  if (beat.id === "decor") f.decor = false;
  if (beat.id === "hangout_done") f.hangout = false;
}

function render(text, id) {
  const layer = document.getElementById("angelinaLayer");
  const bubble = document.getElementById("angelinaBubble");
  const line = document.getElementById("angelinaLine");
  const chip = document.getElementById("angelinaChip");
  if (!layer || !bubble || !line) return;
  const min = loadFlag(MIN_KEY);
  currentText = text || "";
  currentId = id || currentId;
  layer.hidden = false;
  if (min) {
    bubble.hidden = true;
    if (chip) {
      chip.hidden = false;
      chip.textContent = "Angelina";
      chip.title = currentText;
    }
    return;
  }
  if (chip) chip.hidden = true;
  if (!currentText) {
    bubble.hidden = true;
    return;
  }
  bubble.hidden = false;
  line.textContent = currentText;
  const voiceBtn = document.getElementById("angelinaMute");
  if (voiceBtn) {
    voiceBtn.textContent = voiceOn() ? "♪" : "♪̸";
    voiceBtn.setAttribute("aria-pressed", voiceOn() ? "true" : "false");
  }
  paintChapter();
}

function voiceOn() {
  try {
    const v = localStorage.getItem(VOICE_KEY);
    if (v == null) return true;
    return v === "1";
  } catch {
    return true;
  }
}

let voiceUnlocked = false;
let pendingSpeech = "";

function subtitle(text) {
  const el = document.getElementById("voiceSubtitle");
  if (!el) return;
  el.textContent = text ? "Angelina: " + text : "";
  el.classList.toggle("visible", !!text);
  clearTimeout(el._hideT);
  if (text) el._hideT = setTimeout(() => el.classList.remove("visible"), Math.max(5000, text.length * 42));
}

function speak(text) {
  subtitle(text);
  pendingSpeech = text || "";
  if (!voiceOn() || !text || !voiceUnlocked || typeof speechSynthesis === "undefined") return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const l = lang();
    u.lang = l === "ru" ? "ru-RU" : l === "uk" ? "uk-UA" : l === "da" ? "da-DK" : "en-US";
    u.rate = 0.96;
    u.pitch = 1.18;
    speechSynthesis.speak(u);
  } catch {
    /* The bubble and the subtitle stay. */
  }
}

function showBeat(beat) {
  if (!beat) return;
  const text = lineText(beat, lang());
  mood = beat.mood || "talk";
  said[beat.memoryKey] = Date.now();
  consumeFlags(beat);
  render(text, beat.id);
  const layer = document.getElementById("angelinaLayer");
  if (layer) {
    layer.dataset.beat = beat.id;
    if (beat.id === "hello") layer.dataset.hello = "1";
  }
  speak(text);
}

export function currentMood() {
  return mood;
}

export function place() {
  /* Position comes from CSS so the line never sits on the character or the joystick. */
}

function paintChapter() {
  const el = document.getElementById("chapterStrip");
  if (!el || !window.me) return;
  el.textContent = chapterTitle(currentChapterIndex(window.me));
}

export function tick() {
  if (!window.me?.characterId) return;
  paintChapter();
  const beat = selectBeat(readState(), { said });
  if (beat) showBeat(beat);
}

export function repeat() {
  const st = readState();
  const id = st.done
    ? (st.joined && st.location === "construction" ? "build" : (st.joined ? "gang" : "ch1"))
    : (objectiveBeatId(st.step) || "hello");
  const row = getLine(id) || getLine("hello");
  const text = lineText({ text: row }, lang());
  mood = row?.mood || "point";
  saveFlag(MUTE_KEY, false);
  saveFlag(MIN_KEY, false);
  render(text, id);
  speak(text);
  window.Onboarding?.syncGuideTarget?.();
  window.StoryEngine?.syncBeacon?.();
}

export function showWhere() {
  repeat();
  const hint = document.getElementById("contextHint");
  if (hint && !hint.classList.contains("visible")) {
    hint.textContent = t("hint_where_pulse");
    hint.classList.add("visible");
  }
}

function journalHtml() {
  return chapterJournal(window.me || {});
}

export function openJournal() {
  const modal = document.getElementById("visionJournal");
  const body = document.getElementById("visionJournalBody");
  if (!modal || !body) return;
  body.innerHTML = journalHtml();
  modal.classList.add("active");
}

function bind() {
  document.getElementById("angelinaRepeat")?.addEventListener("click", e => {
    e.stopPropagation();
    repeat();
  });
  document.getElementById("angelinaMin")?.addEventListener("click", e => {
    e.stopPropagation();
    const next = !loadFlag(MIN_KEY);
    saveFlag(MIN_KEY, next);
    render(currentText, currentId);
  });
  document.getElementById("angelinaMute")?.addEventListener("click", e => {
    e.stopPropagation();
    const next = !voiceOn();
    saveFlag(VOICE_KEY, next);
    if (!next && typeof speechSynthesis !== "undefined") {
      try { speechSynthesis.cancel(); } catch { /* ignore */ }
    }
    render(currentText, currentId);
    if (next) speak(currentText);
  });
  document.getElementById("angelinaVoice")?.addEventListener("click", e => {
    e.stopPropagation();
    const next = !loadFlag(VOICE_KEY);
    saveFlag(VOICE_KEY, next);
    e.currentTarget.setAttribute("aria-pressed", next ? "true" : "false");
    if (next) speak(currentText);
  });
  document.getElementById("angelinaChip")?.addEventListener("click", () => {
    saveFlag(MIN_KEY, false);
    saveFlag(MUTE_KEY, false);
    render(currentText, currentId);
  });
  document.getElementById("btnWhere")?.addEventListener("click", showWhere);
  document.getElementById("btnJournal")?.addEventListener("click", openJournal);
  document.getElementById("visionJournalClose")?.addEventListener("click", () => {
    document.getElementById("visionJournal")?.classList.remove("active");
  });
}

export function initAngelina() {
  if (booted) return;
  booted = true;
  bind();
  const unlock = () => {
    voiceUnlocked = true;
    if (pendingSpeech && voiceOn()) speak(pendingSpeech);
  };
  window.addEventListener("pointerdown", unlock, { once: true });
  window.addEventListener("keydown", unlock, { once: true });
  window.Angelina = {
    tick, repeat, showWhere, openJournal, place, currentMood, onLanguage, initAngelina
  };
  window.Onboarding?.render?.();
  window.StoryEngine?.renderObjectivePanel?.();
  setInterval(() => {
    if (window.me?.characterId) tick();
  }, 900);
}

export function onLanguage() {
  const row = getLine(currentId);
  if (row) {
    const text = lineText({ text: row }, lang());
    render(text, currentId);
    speak(text);
  }
  paintChapter();
  window.Onboarding?.render?.();
}
