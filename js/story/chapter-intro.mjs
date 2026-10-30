/** Short comic intro (RU/EN/DA) — chapter 0 «Новенький в доме 13». */
const SLIDE_KEYS = ["intro_slide1", "intro_slide2", "intro_slide3", "intro_slide4"];

let shown = false;

function tKey(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

export function shouldShowChapterIntro() {
  if (shown) return false;
  const p = window.me;
  if (!p) return false;
  if (p.story?.flags?.intro_seen) return false;
  const ob = p.onboarding;
  if (ob && !ob.done && (ob.step > 0 || (ob.progress && Object.keys(ob.progress).length > 0))) return false;
  return true;
}

export function playChapterIntro(opts = {}) {
  if (!shouldShowChapterIntro()) {
    opts.onDone?.();
    return;
  }
  shown = true;
  const startOv = document.getElementById("startGameOverlay");
  if (startOv) {
    startOv.classList.remove("active");
    startOv.setAttribute("aria-hidden", "true");
    startOv.inert = true;
  }
  const root = document.getElementById("chapterIntro");
  if (!root) {
    opts.onDone?.();
    return;
  }
  let idx = 0;
  const titleEl = root.querySelector(".chapter-intro-title");
  const bodyEl = root.querySelector(".chapter-intro-body");
  const progEl = root.querySelector(".chapter-intro-progress");
  const btn = root.querySelector(".chapter-intro-next");
  const skip = root.querySelector(".chapter-intro-skip");

  const speakSlide = key => {
    const text = tKey(key);
    const lineId = key;
    window.SpeechBridge?.play?.({
      lineId,
      text,
      characterId: "narrator",
      subtitle: `${tKey("intro_title")}: ${text}`
    });
  };

  const render = () => {
    const key = SLIDE_KEYS[idx];
    titleEl.textContent = tKey("intro_title");
    bodyEl.textContent = tKey(key);
    progEl.textContent = `${idx + 1}/${SLIDE_KEYS.length}`;
    btn.textContent = idx >= SLIDE_KEYS.length - 1 ? tKey("intro_start") : tKey("intro_next");
    window.AudioManager?.unlockAudio?.().then(() => speakSlide(key));
  };

  const finish = () => {
    root.classList.remove("active");
    root.setAttribute("aria-hidden", "true");
    const st = window.StoryEngine?.ensureStoryState?.(window.me);
    if (st?.flags) st.flags.intro_seen = true;
    window.saveMe?.();
    window.AudioManager?.playSfx?.("quest_received");
    opts.onDone?.();
    window.StoryGoalHud?.refresh?.();
    if (localStorage.getItem("punkme_howto_seen") !== "1") {
      setTimeout(() => {
        if (!document.getElementById("howToOverlay")?.classList.contains("active")) {
          window.initHowToPlay?.();
        }
      }, 400);
    }
  };

  btn.onclick = () => {
    window.AudioManager?.playSfx?.("ui_click");
    if (idx >= SLIDE_KEYS.length - 1) finish();
    else {
      idx += 1;
      render();
    }
  };
  skip.onclick = () => {
    window.AudioManager?.playSfx?.("ui_click");
    finish();
  };

  root.classList.add("active");
  root.setAttribute("aria-hidden", "false");
  render();
  window.AudioManager?.unlockAudio?.().then(() => window.AudioManager?.setLocationMusic?.("home"));
}

export function showChapterWrap(chapterNum) {
  document.getElementById("storyScene")?.classList.remove("active");
  document.getElementById("storyScene")?.setAttribute("aria-hidden", "true");
  const root = document.getElementById("chapterIntro");
  if (!root) return;
  const titleEl = root.querySelector(".chapter-intro-title");
  const bodyEl = root.querySelector(".chapter-intro-body");
  const btn = root.querySelector(".chapter-intro-next");
  const skip = root.querySelector(".chapter-intro-skip");
  titleEl.textContent = typeof window.t === "function" ? window.t(`chapter_${chapterNum}_wrap_title`) : "Chapter done";
  bodyEl.textContent = typeof window.t === "function" ? window.t(`chapter_${chapterNum}_wrap_body`) : "";
  root.querySelector(".chapter-intro-progress").textContent = "";
  skip.style.display = "none";
  btn.textContent = typeof window.t === "function" ? window.t("intro_gotit") : "OK";
  btn.onclick = () => {
    window.AudioManager?.playSfx?.("ui_click");
    root.classList.remove("active");
    root.setAttribute("aria-hidden", "true");
    skip.style.display = "";
  };
  root.classList.add("active");
  root.setAttribute("aria-hidden", "false");
}

window.ChapterIntro = { playChapterIntro, showChapterWrap, shouldShowChapterIntro };
