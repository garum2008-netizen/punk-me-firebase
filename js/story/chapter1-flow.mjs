/**
 * Chapter 1 flow on top of the existing onboarding and gang initiation.
 * Angelina's voice files are local recordings, one file per language.
 */

import { playAngelina, startIdleWatch } from "./angelina-voice.mjs";

export const CHAPTER1_PLAY_ID = "ch1-child";

const CRAWL_KEYS = ["crawl_1", "crawl_2", "crawl_3", "crawl_4"];
const CRAWL_CLIPS = ["angelina_crawl_1", "angelina_crawl_2", "angelina_crawl_3", "angelina_crawl_4"];
const STEP_CLIPS = {
  move: "angelina_beginning",
  go_street: "angelina_conflict",
  talk_razor: "angelina_conflict",
  visit_cemetery: "angelina_climax",
  win_fight: "angelina_climax",
  shop_buy: "angelina_shop",
  room_decor: "angelina_room",
  city_build: "angelina_plots"
};

let playedStep = "";

export function ensureChapter1(player) {
  if (!player) return null;
  if (!player.chapter1 || typeof player.chapter1 !== "object") {
    player.chapter1 = { crawlSeen: false, ended: false };
  }
  if (typeof player.chapter1.crawlSeen !== "boolean") player.chapter1.crawlSeen = !!player.chapter1.crawlSeen;
  if (typeof player.chapter1.finaleSeen !== "boolean") player.chapter1.finaleSeen = !!player.chapter1.finaleSeen;
  if (typeof player.chapter1.ended !== "boolean") player.chapter1.ended = !!player.chapter1.ended;
  return player.chapter1;
}

export function shouldShowCrawl(player) {
  const st = ensureChapter1(player);
  if (!st || st.crawlSeen) return false;
  if (player.onboarding?.done) return false;
  if ((player.onboarding?.step || 0) > 0) return false;
  return true;
}

export function ensureCityKit(player) {
  if (!player) return 0;
  player.inventory = player.inventory || { materials: {}, spells: [] };
  player.inventory.materials = player.inventory.materials || {};
  if ((player.inventory.materials.crypt || 0) < 1) player.inventory.materials.crypt = 1;
  return player.inventory.materials.crypt;
}

export const CHAPTER1_OBJECTIVES = [
  "move",
  "go_street",
  "talk_razor",
  "visit_cemetery",
  "win_fight",
  "shop_buy",
  "room_decor",
  "city_build"
];

/** Old saves have no play id, so the active chapter starts again. Coins and the avatar stay. */
export function adoptChapterSave(player) {
  if (!player) return false;
  ensureChapter1(player);
  const tutorial = typeof location !== "undefined" && new URLSearchParams(location.search).has("tutorial");
  const nextId = tutorial ? CHAPTER1_PLAY_ID : "ms-signal";
  if (player.chapter1.playId === nextId) return false;
  player.chapter1 = {
    playId: nextId,
    crawlSeen: false,
    finaleSeen: false,
    ended: false
  };
  player.onboarding = { step: 0, progress: {}, done: false, paid: {} };
  player.gang_rank = "newbie";
  if (player.story && typeof player.story === "object") {
    player.story.chapter = 1;
    player.story.gang_rank = "newbie";
    player.story.flags = { ...(player.story.flags || {}), joined_gang: false };
    if (player.story.quest && player.story.quest.activeId === "q_hangout_build") {
      player.story.quest.activeId = null;
    }
  }
  return true;
}

/** Training steps plus the gang patch. The city step is one crypt stone, not a finished district. */
export function chapterObjectivesMet(player) {
  if (!player?.onboarding?.done) return false;
  if (!player.story?.flags?.joined_gang) return false;
  const paid = player.onboarding.paid || {};
  return CHAPTER1_OBJECTIVES.every(id => paid[id] === true);
}

const ANGELINA_BEAT = {
  move: "angelina_beginning",
  go_street: "angelina_conflict",
  talk_razor: "angelina_conflict",
  visit_cemetery: "angelina_climax",
  win_fight: "angelina_climax",
  shop_buy: "angelina_shop",
  room_decor: "angelina_room",
  city_build: "angelina_plots"
};

export function guideKey(player) {
  if (!player) return "";
  if (player.chapter1?.ended) return "angelina_closing";
  if (player.onboarding && !player.onboarding.done) {
    const step = window.Onboarding?.stepId?.();
    return ANGELINA_BEAT[step] || "angelina_beginning";
  }
  if (chapterObjectivesMet(player)) return "angelina_finale";
  return "angelina_initiation";
}

function t(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

function markToken(player) {
  const kinds = (player?.cityPlots || []).map(plot => plot.kind || plot.id);
  const key = kinds.includes("stall") ? "mark_stall"
    : kinds.includes("arch") ? "mark_arch"
    : kinds.includes("crypt") ? "mark_crypt"
    : "mark_plot";
  return t(key);
}

function lineText(key, player) {
  const mark = markToken(player || window.me);
  const raw = String(t(key));
  const text = raw.replaceAll("{mark}", mark);
  if (raw.startsWith("{mark}") && mark) {
    return mark.charAt(0).toUpperCase() + mark.slice(1) + text.slice(mark.length);
  }
  return text;
}

function playClip(id) {
  playAngelina(id);
}

function setOverlay(id, on) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle("active", on);
  el.setAttribute("aria-hidden", on ? "false" : "true");
}

export function refreshGuide() {
  const el = document.getElementById("angelinaGuide");
  const player = window.me;
  if (!el || !player) return;
  if (window.MissingSignal?.owns?.(player)) {
    window.MissingSignal.refresh?.();
    return;
  }
  ensureChapter1(player);
  const key = guideKey(player);
  const stepId = window.Onboarding?.stepId?.() || "";
  el.hidden = false;
  let line = el.querySelector(".angelina-line");
  if (!line) {
    el.innerHTML = `<b></b><span class="angelina-line"></span><span id="angelinaHint" class="angelina-hint"></span>`;
    line = el.querySelector(".angelina-line");
  }
  const tag = el.querySelector("b");
  if (tag) tag.textContent = t("angelina_tag");
  line.textContent = lineText(key, player);
  const sceneFor = {
    angelina_conflict: "conflict",
    angelina_climax: "climax",
    angelina_plots: "plots",
    angelina_finale: "finale"
  }[key];
  const scene = document.getElementById("chapterScene");
  if (sceneFor) showScene(sceneFor);
  else if (scene) scene.hidden = true;
  if (shouldShowCrawl(player) || document.getElementById("chapterCrawl")?.classList.contains("active")) return;
  if (stepId && stepId !== playedStep && STEP_CLIPS[stepId] && !player.onboarding?.done) {
    playedStep = stepId;
    playClip(STEP_CLIPS[stepId]);
  }
}

function finishCrawl() {
  const player = window.me;
  if (player) {
    ensureChapter1(player).crawlSeen = true;
    window.saveMe?.();
  }
  setOverlay("chapterCrawl", false);
  refreshGuide();
}

export function showScene(kind) {
  const el = document.getElementById("chapterScene");
  if (!el || !kind) return;
  el.hidden = false;
  el.textContent = t(`scene_${kind}`);
}

export function openCrawl() {
  const root = document.getElementById("chapterCrawl");
  if (!root) return;
  const body = root.querySelector(".chapter-crawl-body");
  if (body) {
    body.innerHTML = `<h2>${t("crawl_title")}</h2>` + CRAWL_KEYS.map(k => `<p>${t(k)}</p>`).join("");
  }
  const skip = root.querySelector(".chapter-crawl-skip");
  if (skip) skip.textContent = t("crawl_skip");
  setOverlay("chapterCrawl", true);
  playClip(CRAWL_CLIPS[0]);
  let idx = 0;
  const timer = setInterval(() => {
    if (!root.classList.contains("active")) {
      clearInterval(timer);
      return;
    }
    idx += 1;
    if (idx >= CRAWL_CLIPS.length) {
      clearInterval(timer);
      return;
    }
    playClip(CRAWL_CLIPS[idx]);
  }, 7000);
  root.querySelector(".chapter-crawl-skip").onclick = () => {
    clearInterval(timer);
    finishCrawl();
  };
  root.querySelector(".chapter-crawl-body").addEventListener("animationend", () => {
    clearInterval(timer);
    finishCrawl();
  }, { once: true });
}

const FINALE_LINES = ["chapter1_finale_1", "chapter1_finale_2", "chapter1_finale_3"];
let finaleTimer = 0;

function overlaysClear() {
  const fight = document.getElementById("fightOverlay");
  const howto = document.getElementById("howToOverlay");
  return !fight?.classList.contains("active") && !howto?.classList.contains("active");
}

/** Razor's patch scene in the street dialog. The completion card comes after it. */
export function playFinale() {
  const player = window.me;
  if (!player || !chapterObjectivesMet(player)) return false;
  const st = ensureChapter1(player);
  if (st.ended || st.finaleSeen) return false;
  const el = document.getElementById("storyDialog");
  if (!el) return false;
  if (!overlaysClear()) {
    if (!finaleTimer) {
      finaleTimer = setTimeout(() => {
        finaleTimer = 0;
        playFinale();
      }, 400);
    }
    return true;
  }
  if (el.classList.contains("chapter-finale")) return true;
  el.classList.add("active", "chapter-finale");
  el.setAttribute("aria-hidden", "false");
  const title = el.querySelector(".story-dialog-title");
  if (title) title.textContent = "Razor";
  try { window.StoryEngine?.applyDialogueCamera?.("razor"); } catch (_) {}
  let idx = 0;
  const showLine = () => {
    const body = el.querySelector(".story-dialog-body");
    if (!body) return;
    body.innerHTML = `<p class="story-line" id="chapterFinaleLine">${lineText(FINALE_LINES[idx])}</p>
      <button type="button" class="btn" id="storyDlgNext">${t("chapter1_finale_next")}</button>`;
    el.querySelector("#storyDlgNext").onclick = () => {
      idx += 1;
      if (idx >= FINALE_LINES.length) finishFinale();
      else showLine();
    };
  };
  showLine();
  playClip("angelina_finale");
  showScene("finale");
  refreshGuide();
  return true;
}

function finishFinale() {
  const player = window.me;
  if (!player) return;
  const st = ensureChapter1(player);
  st.finaleSeen = true;
  const el = document.getElementById("storyDialog");
  el?.classList.remove("active", "chapter-finale");
  if (el) el.setAttribute("aria-hidden", "true");
  window.StoryEngine?.clearDialogueCamera?.();
  showEnding();
}

export function tryFinishChapter() {
  const player = window.me;
  if (window.MissingSignal?.owns?.(player)) return false;
  if (!player || !chapterObjectivesMet(player)) return false;
  const st = ensureChapter1(player);
  if (st.ended) return false;
  if (!st.finaleSeen) {
    setTimeout(() => playFinale(), 40);
    return true;
  }
  showEnding();
  return true;
}

export function showEnding() {
  const player = window.me;
  if (!player || !chapterObjectivesMet(player)) return;
  const st = ensureChapter1(player);
  if (st.ended) return;
  st.ended = true;
  window.saveMe?.();
  const root = document.getElementById("chapterEnding");
  if (!root) return;
  root.querySelector(".chapter-ending-title").textContent = t("chapter1_end_title");
  root.querySelector(".chapter-ending-body").textContent = lineText("chapter1_end_body", player);
  const btn = root.querySelector(".chapter-ending-ok");
  btn.textContent = t("howto_gotit");
  btn.onclick = () => {
    setOverlay("chapterEnding", false);
    refreshGuide();
  };
  setOverlay("chapterEnding", true);
  refreshGuide();
}

export function onWorldReady() {
  const player = window.me;
  if (!player) return;
  ensureChapter1(player);
  adoptChapterSave(player);
  startIdleWatch();
  if (window.MissingSignal?.owns?.(player)) {
    window.MissingSignal.boot?.();
    return;
  }
  if (shouldShowCrawl(player)) openCrawl();
  else {
    refreshGuide();
    tryFinishChapter();
  }
}

if (typeof window !== "undefined") {
  window.Chapter1 = {
    onWorldReady,
    refreshGuide,
    showEnding,
    tryFinishChapter,
    playFinale,
    chapterObjectivesMet,
    ensureCityKit,
    shouldShowCrawl,
    ensureChapter1,
    adoptChapterSave,
    showScene,
    CHAPTER1_PLAY_ID
  };
}
