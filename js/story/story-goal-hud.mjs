/** Persistent on-screen goal + chapter label (RU/EN/DA). */
function chapterLabel(ch) {
  const n = Number(ch) || 0;
  const key = `chapter_${n}_title`;
  return typeof window.t === "function" ? window.t(key) : `Chapter ${n}`;
}

function onboardingGoal() {
  const st = window.Onboarding?.getCurrentStep?.();
  if (!st) return null;
  const i = (window.me?.onboarding?.step ?? 0) + 1;
  const title = typeof window.t === "function" ? window.t(`onboard_${st.id}_title`) : st.id;
  const text = typeof window.t === "function" ? window.t(`onboard_${st.id}_text`) : "";
  const prog = window.me?.onboarding?.progress?.[st.key] || 0;
  return { chapter: 0, title: chapterLabel(0), step: `${i}/6`, goal: title, hint: text, progress: `${prog}/${st.goal}` };
}

function storyQuestGoal() {
  const st = window.StoryEngine?.ensureStoryState?.(window.me);
  const chapter = st?.mainlineChapter ?? st?.chapter ?? 1;
  const titleEl = document.querySelector("#questBox .quest-step-title, #questBox b");
  const hintEl = document.querySelector("#questBox .quest-step-text, #questBox .quest-objective");
  const goal = titleEl?.textContent?.trim() || (typeof window.t === "function" ? window.t("quests_label") : "Quest");
  const hint = hintEl?.textContent?.trim() || "";
  if (!goal && !st?.quest?.activeId && !st?.earn) return null;
  return { chapter, title: chapterLabel(chapter), step: "", goal, hint, progress: "" };
}

export function refreshStoryGoalHud() {
  const bar = document.getElementById("storyGoalBar");
  if (!bar) return;
  const p = window.me;
  if (!p) {
    bar.classList.remove("visible");
    return;
  }
  const info = !p.onboarding?.done ? onboardingGoal() : storyQuestGoal();
  if (!info) {
    bar.classList.remove("visible");
    return;
  }
  bar.classList.add("visible");
  bar.querySelector(".story-goal-chapter").textContent = info.title;
  bar.querySelector(".story-goal-main").textContent = info.goal;
  bar.querySelector(".story-goal-hint").textContent = info.hint || "";
  const prog = bar.querySelector(".story-goal-progress");
  if (prog) prog.textContent = info.progress || info.step || "";
}

export function initStoryGoalHud() {
  refreshStoryGoalHud();
  setInterval(refreshStoryGoalHud, 1200);
}

window.StoryGoalHud = { refresh: refreshStoryGoalHud, init: initStoryGoalHud };
