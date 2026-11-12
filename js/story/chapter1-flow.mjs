/**
 * Chapter 1 flow on top of the existing onboarding and gang initiation.
 * Crawl copy matches the approved intro slides. Voice files are the existing
 * narrator clips; nothing here is synthesized.
 */

const CRAWL_KEYS = ["crawl_1", "crawl_2", "crawl_3", "crawl_4"];
const CRAWL_CLIPS = ["intro_slide1", "intro_slide2", "intro_slide3", "intro_slide4"];
const STEP_CLIPS = {
  move: "narr_onboard_move",
  go_street: "narr_onboard_go_street",
  talk_razor: "narr_onboard_talk_razor",
  visit_cemetery: "narr_onboard_visit_cemetery",
  win_fight: "narr_onboard_win_fight",
  shop_buy: "narr_onboard_shop_buy"
};

let audio = null;
let playedStep = "";

export function ensureChapter1(player) {
  if (!player) return null;
  if (!player.chapter1 || typeof player.chapter1 !== "object") {
    player.chapter1 = { crawlSeen: false, ended: false };
  }
  if (typeof player.chapter1.crawlSeen !== "boolean") player.chapter1.crawlSeen = !!player.chapter1.crawlSeen;
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

export function guideKey(player) {
  if (!player) return "";
  if (player.chapter1?.ended) return "angelina_closing";
  if (player.onboarding && !player.onboarding.done) {
    const steps = window.Onboarding?.stepId?.();
    return steps ? `onboard_${steps}_text` : "onboard_move_text";
  }
  if (player.story?.flags?.joined_gang) return "angelina_closing";
  return "onboard_talk_razor_text";
}

function lang() {
  return typeof window.getLanguage === "function" ? window.getLanguage() : "ru";
}

function t(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

function clipUrl(id) {
  const code = lang() === "da" ? "da" : lang() === "en" ? "en" : "ru";
  // Approved crawl recordings exist only in Russian.
  if (id.startsWith("intro_")) return `assets/audio/voice/ru/${id}.ogg`;
  const coarse = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  return `assets/audio/voice/${code}/${id}_${coarse ? "touch" : "desktop"}.ogg`;
}

function voiceAllowed() {
  try {
    return localStorage.getItem("punkme_voice_mute") !== "1";
  } catch (_) {
    return true;
  }
}

function playClip(id) {
  if (!voiceAllowed() || typeof Audio === "undefined") return;
  try {
    if (audio) {
      audio.pause();
      audio = null;
    }
    audio = new Audio(clipUrl(id));
    audio.volume = 1;
    audio.play().catch(() => {});
  } catch (_) {}
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
  ensureChapter1(player);
  const key = guideKey(player);
  const stepId = window.Onboarding?.stepId?.() || "";
  el.hidden = false;
  el.innerHTML = `<b>${t("angelina_tag")}</b><span>${t(key)}</span>`;
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
  if (audio) audio.pause();
  refreshGuide();
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

export function showEnding() {
  const player = window.me;
  if (!player) return;
  const st = ensureChapter1(player);
  if (st.ended) return;
  st.ended = true;
  window.saveMe?.();
  const root = document.getElementById("chapterEnding");
  if (!root) return;
  root.querySelector(".chapter-ending-title").textContent = t("chapter1_end_title");
  root.querySelector(".chapter-ending-body").textContent = t("chapter1_end_body");
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
  if (shouldShowCrawl(player)) openCrawl();
  else refreshGuide();
}

if (typeof window !== "undefined") {
  window.Chapter1 = {
    onWorldReady,
    refreshGuide,
    showEnding,
    ensureCityKit,
    shouldShowCrawl,
    ensureChapter1
  };
}
