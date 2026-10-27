/** Chapter 0 onboarding — aligned with q_ch0_newbie / ch0_s_* (QUEST_TABLE.md). */
const ONBOARDING_STEPS = [
  {
    id: "awake",
    qt: "ch0_s_awake",
    key: "ch0_awake",
    goal: 1,
    reward: { coins: 5, xp: 8 },
    target: () => ({ loc: "room" }),
    hint_nudge: { ru: "Осмотрись вокруг", en: "Look around", da: "Kig rundt" },
    hint_60s: { ru: "Покрути камеру или пройдись", en: "Turn the camera or walk", da: "Drej kameraet eller gå" },
    hint_exact: { ru: "WASD или стик — сделай несколько шагов", en: "WASD or stick — take a few steps", da: "WASD — tag et par skridt" }
  },
  {
    id: "mom",
    qt: "ch0_s_mom",
    key: "ch0_mom_talk",
    goal: 1,
    reward: { coins: 8, xp: 10 },
    target: () => ({ loc: "room", wx: 8, wz: 42, door: "kitchen" }),
    hint_nudge: { ru: "Мама зовёт", en: "Mom is calling", da: "Mor kalder" },
    hint_60s: { ru: "Дверь на кухню слева", en: "Kitchen door on the left", da: "Køkkendør til venstre" },
    hint_exact: { ru: "Подойди к двери на кухню и нажми E", en: "Go to the kitchen door and press E", da: "Gå til køkkendøren og tryk E" }
  },
  {
    id: "shnurok_intro",
    qt: "ch0_s_shnurok",
    key: "ch0_feed_bowl",
    goal: 1,
    reward: { coins: 8, xp: 10 },
    target: () => ({ loc: "kitchen", wx: 0, wz: 30, bowl: true }),
    hint_nudge: { ru: "Шнурок голоден", en: "Shnurok is hungry", da: "Shnurok er sulten" },
    hint_60s: { ru: "Миска на кухне", en: "Bowl in the kitchen", da: "Skål i køkkenet" },
    hint_exact: { ru: "Нажми E у миски", en: "Press E at the food bowl", da: "Tryk E ved skålen" }
  },
  {
    id: "journal",
    qt: "ch0_s_interact",
    key: "ch0_journal_open",
    goal: 1,
    reward: { coins: 10, xp: 8 },
    target: () => ({ ui: "journal" }),
    hint_nudge: { ru: "Задание записано", en: "Quest logged", da: "Opgave logget" },
    hint_60s: { ru: "Открой журнал", en: "Open the journal", da: "Åbn journalen" },
    hint_exact: { ru: "Меню ☰ → журнал или клавиша Esc", en: "Menu ☰ → journal or Esc", da: "Menu ☰ → journal" }
  },
  {
    id: "shnurok_play",
    qt: "ch0_s_shnurok",
    key: "ch0_pet_shnurok",
    goal: 4,
    reward: { coins: 10, xp: 12 },
    target: () => ({ loc: "room", npcId: "shnurok" }),
    hint_nudge: { ru: "Шнурок хочет играть", en: "Shnurok wants to play", da: "Shnurok vil lege" },
    hint_60s: { ru: "Погладь пса и брось мяч", en: "Pet the dog and throw the ball", da: "Klapp hunden og kast bolden" },
    hint_exact: { ru: "E у Шнурка: погладить и мяч ×3", en: "E near Shnurok: pet and ball ×3", da: "E ved Shnurok: klap og bold ×3" }
  },
  {
    id: "avatar",
    qt: "ch0_s_avatar",
    key: "ch0_avatar_chosen",
    goal: 1,
    reward: { coins: 5, xp: 8 },
    target: () => ({ loc: "room", wx: 75, wz: 50, mirror: true }),
    hint_nudge: { ru: "Выбери образ", en: "Pick your look", da: "Vælg dit look" },
    hint_60s: { ru: "Зеркало в комнате", en: "Mirror in your room", da: "Spejl på værelset" },
    hint_exact: { ru: "Подойди к зеркалу и нажми E", en: "Go to the mirror and press E", da: "Gå til spejlet og tryk E" }
  },
  {
    id: "move",
    qt: "ch0_s_move",
    key: "ch0_move_done",
    goal: 1,
    reward: { coins: 8, xp: 10 },
    target: () => ({ loc: "room", wx: 44, wz: 72, door: "elevator" }),
    hint_nudge: { ru: "Кто-то стучит в дверь", en: "Someone knocks", da: "Nogen banker på" },
    hint_60s: { ru: "Иди к лифту", en: "Head to the elevator", da: "Gå til elevatoren" },
    hint_exact: { ru: "WASD к светящейся двери лифта", en: "WASD toward the elevator door", da: "WASD mod elevatordøren" },
    hint_solution: { ru: "Стой у двери лифта", en: "Stand at the elevator door", da: "Stå ved elevatordøren" },
    hint_solution_path: true
  },
  {
    id: "interact",
    qt: "ch0_s_interact",
    key: "ch0_interact_done",
    goal: 1,
    reward: { coins: 8, xp: 10 },
    target: () => ({ loc: "room" }),
    hint_nudge: { ru: "Попробуй взаимодействие", en: "Try interacting", da: "Prøv at interagere" },
    hint_60s: { ru: "Нажми E рядом с объектом", en: "Press E near an object", da: "Tryk E ved et objekt" },
    hint_exact: { ru: "E у дивана или телевизора", en: "E at the sofa or TV", da: "E ved sofaen eller TV" }
  },
  {
    id: "house",
    qt: "ch0_s_house",
    key: "ch0_house_tour",
    goal: 2,
    reward: { coins: 10, xp: 12 },
    target: () => ({ loc: "kitchen" }),
    hint_nudge: { ru: "Дом большой", en: "Big house", da: "Stort hus" },
    hint_60s: { ru: "Кухня и лифт", en: "Kitchen and elevator", da: "Køkken og elevator" },
    hint_exact: { ru: "Зайди на кухню, потом в лифт", en: "Visit kitchen, then elevator", da: "Besøg køkken, så elevator" },
    hint_solution: { ru: "Кухня → комната → лифт", en: "Kitchen → room → elevator", da: "Køkken → værelse → elevator" },
    hint_solution_path: true
  },
  {
    id: "go_street",
    qt: "ch0_s_street",
    key: "ch0_enter_street",
    goal: 1,
    reward: { coins: 12, xp: 14 },
    target: () => ({ loc: "elevator", door: "street" }),
    hint_nudge: { ru: "Пора на улицу", en: "Time for the street", da: "Tid til gaden" },
    hint_60s: { ru: "Лифт ведёт вниз", en: "Elevator goes down", da: "Elevatoren går ned" },
    hint_exact: { ru: "В лифте выбери «Улица»", en: "In the elevator pick Street", da: "Vælg Gade i elevatoren" }
  },
  {
    id: "talk_razor",
    qt: "ch0_s_razor",
    key: "ch0_razor_talk",
    goal: 1,
    reward: { coins: 12, xp: 14 },
    target: () => ({ loc: "street", npcId: "razor" }),
    hint_nudge: { ru: "Тебя ждут на улице", en: "They wait outside", da: "De venter ude" },
    hint_60s: { ru: "Рейзор у стены", en: "Razor by the wall", da: "Razor ved muren" },
    hint_exact: { ru: "Подойди к Рейзору и нажми E", en: "Go to Razor and press E", da: "Gå til Razor og tryk E" }
  }
];

const PORTAL_WAYPOINTS = {
  kitchen: { room: { wx: 8, wz: 42 } },
  elevator: { room: { wx: 44, wz: 72 } },
  street: { elevator: { wx: 62, wz: 30 }, room: { wx: 44, wz: 72 } }
};

function stepIndex() {
  if (!window.me?.onboarding) return -1;
  if (window.me.onboarding.done) return -1;
  return Math.min(window.me.onboarding.step ?? 0, ONBOARDING_STEPS.length - 1);
}

function currentStep() {
  const i = stepIndex();
  return i < 0 ? null : ONBOARDING_STEPS[i];
}

function progress() {
  return window.me?.onboarding?.progress || {};
}

function syncCh0QuestStep(qtId) {
  const st = window.StoryEngine?.ensureStoryState?.(window.me);
  if (!st) return;
  st.flags.ch0_current_step = qtId;
  st.quest.activeId = st.quest.activeId || "q_ch0_newbie";
}

function bump(key, amt = 1) {
  const st = currentStep();
  if (!st || st.key !== key) return;
  if (!window.me.onboarding.progress || typeof window.me.onboarding.progress !== "object") {
    window.me.onboarding.progress = {};
  }
  const p = window.me.onboarding.progress;
  p[key] = (p[key] || 0) + amt;
  if (p[key] >= st.goal) completeStep();
  else {
    saveMeQuiet();
    window.AngelinaHelp?.resetHintTier?.();
  }
  renderOnboardingQuest();
}

function completeStep() {
  const st = currentStep();
  if (!st) return;
  window.Narrator?.reset?.();
  window.AngelinaHelp?.react?.("step_ok");
  const r = st.reward || {};
  const grantedKey = `onboard_step_${st.qt}_${window.me.onboarding.step}`;
  const stStory = window.StoryEngine?.ensureStoryState?.(window.me);
  if (stStory && !stStory.rewardsGiven?.[grantedKey] && !window.isOwner) {
    if (r.coins) window.me.coins += r.coins;
    if (r.xp) window.me.xp += r.xp;
    if (stStory.rewardsGiven) stStory.rewardsGiven[grantedKey] = Date.now();
  } else if (!window.isOwner && r.coins) {
    window.me.coins += r.coins;
    if (r.xp) window.me.xp += r.xp;
  }
  toast((typeof t === "function" ? t("onboard_step_done") : "Step complete!") + " +" + (r.coins || 0));
  syncCh0QuestStep(st.qt);
  window.me.onboarding.step = (window.me.onboarding.step || 0) + 1;
  window.me.onboarding.progress = {};
  window.AngelinaHelp?.resetHintTier?.();
  maybeAutoCompleteAvatar();
  if (window.me.onboarding.step >= ONBOARDING_STEPS.length) {
    finishOnboarding();
  } else {
    saveMeQuiet();
  }
  renderOnboardingQuest();
  syncGuideTarget();
  window.Narrator?.refresh?.();
  window.StoryGoalHud?.refresh?.();
  window.refreshSocialPresenceUi?.();
}

function finishOnboarding() {
  window.me.onboarding.done = true;
  toast(typeof t === "function" ? t("onboard_all_done") : "Onboarding complete!");
  toast(typeof t === "function" ? t("onboard_save_toast") : "Game saved.");
  window.StoryEngine?.fireStoryEvent?.("ch0_razor_talk");
  window.StoryEngine?.recordChapterCheckpoint?.(window.me, 0, { beat: "onboarding_done" });
  window.ChapterIntro?.showChapterWrap?.(0);
  window.StoryEngine?.onOnboardingComplete?.();
  window.StoryEngine?.syncBeacon?.();
  if (window.saveMe) saveMe();
  renderOnboardingQuest();
  window.refreshSocialPresenceUi?.();
}

function saveMeQuiet() {
  if (window.saveMe) saveMe();
}

function renderOnboardingQuest() {
  const box = document.getElementById("questBox");
  if (!box) return;
  if (window.me?.onboarding?.done) {
    if (typeof renderQuest === "function") renderQuest();
    return;
  }
  const st = currentStep();
  if (!st) return;
  const i = stepIndex() + 1;
  const title = typeof t === "function" ? t("onboard_title") : "Your mission";
  const stepTitle = typeof t === "function" ? t(`onboard_${st.id}_title`) : st.id;
  const stepText = typeof t === "function" ? t(`onboard_${st.id}_text`) : "";
  const prog = progress()[st.key] || 0;
  box.innerHTML = `<div class="quest-tracker">
    <b>${escapeHtml(title)}</b> <span class="quest-step-num">${i}/${ONBOARDING_STEPS.length}</span>
    <div class="quest-step-title">${escapeHtml(stepTitle)}</div>
    <div class="quest-step-text">${escapeHtml(stepText)}</div>
    <div class="quest-progress">${prog}/${st.goal}</div>
  </div>`;
}

function waypointToReach(destLoc) {
  const here = window.me?.location;
  if (!here || here === destLoc) return null;
  const map = PORTAL_WAYPOINTS[destLoc];
  return map?.[here] || null;
}

function getGuideTarget() {
  const st = currentStep();
  if (!st || !window.me) return null;
  const tgt = st.target();
  if (tgt.npcId) return { npcId: tgt.npcId };
  if (tgt.loc && window.me.location !== tgt.loc) {
    const wp = waypointToReach(tgt.loc);
    if (wp) return { wx: wp.wx, wz: wp.wz };
    return null;
  }
  if (tgt.wx != null && tgt.wz != null) return { wx: tgt.wx, wz: tgt.wz };
  return null;
}

function syncGuideTarget() {
  if (!window.World3D?.setGuideTarget) return;
  World3D.setGuideTarget(getGuideTarget());
}

function showSolutionPath() {
  syncGuideTarget();
}

function onMove(x, y) {
  const st = currentStep();
  if (!st) return;
  if (st.key === "ch0_awake" || st.key === "ch0_move_done") {
    if (!window.me._onboardOrigin) window.me._onboardOrigin = { x, y };
    const o = window.me._onboardOrigin;
    if (Math.hypot(x - o.x, y - o.y) > 6) bump(st.key, 1);
  }
}

function onEnterLocation(loc) {
  const st = currentStep();
  if (!st) return;
  if (st.key === "ch0_enter_street" && loc === "street") bump("ch0_enter_street", 1);
  if (st.key === "ch0_house_tour") {
    const p = window.me.onboarding.progress;
    if (loc === "kitchen") p._kitchen = true;
    if (loc === "elevator") p._elevator = true;
    const visits = (p._kitchen ? 1 : 0) + (p._elevator ? 1 : 0);
    p.ch0_house_tour = visits;
    if (visits >= st.goal) completeStep();
    else saveMeQuiet();
    renderOnboardingQuest();
  }
}

function showMomSubtitle(line) {
  const el = document.getElementById("voiceSubtitle");
  if (!el) return;
  el.textContent = line;
  el.classList.add("visible");
  clearTimeout(window._momSubtitleTimer);
  window._momSubtitleTimer = setTimeout(() => el.classList.remove("visible"), 4200);
}

function onMomTalk() {
  const st = currentStep();
  if (st?.key !== "ch0_mom_talk") return;
  const line =
    typeof t === "function"
      ? t("onboard_mom_subtitle")
      : "Lida (behind the door): «Wake up! Breakfast is in the kitchen.»";
  showMomSubtitle(line);
  window.setTimeout(() => bump("ch0_mom_talk", 1), 900);
}

function onFeedBowl() {
  if (window.me) {
    window.me.owned = window.me.owned || [];
    if (!window.me.owned.includes("pet_dog")) window.me.owned.push("pet_dog");
    window.me.pet = "pet_dog";
  }
  bump("ch0_feed_bowl", 1);
}

function onShnurokInteract(kind) {
  const st = currentStep();
  if (st?.key !== "ch0_pet_shnurok") return;
  bump("ch0_pet_shnurok", kind === "ball" ? 2 : 1);
}

function onJournalOpen() {
  bump("ch0_journal_open", 1);
}

function onAvatarMirror() {
  bump("ch0_avatar_chosen", 1);
}

function onInteractTutorial() {
  bump("ch0_interact_done", 1);
}

function onTalkRazor() {
  const st = currentStep();
  if (st?.key === "ch0_razor_talk") bump("ch0_razor_talk", 1);
}

function maybeAutoCompleteAvatar() {
  /* Avatar step requires mirror E — no auto-skip from character select. */
}

function adaptSpawnLocation() {
  if (!window.me?.onboarding || window.me.onboarding.done) return;
  const loc = window.me.location;
  if (!loc || loc === "room") return;
  const st = currentStep();
  if (st?.key === "ch0_awake" || st?.key === "ch0_move_done") {
    window.me.onboarding.progress[st.key] = st.goal;
    completeStep();
  }
}

function initOnboarding() {
  if (!window.me) return;
  if (!window.me.onboarding) {
    window.me.onboarding = { step: 0, progress: {}, done: false };
  }
  if (!window.me.onboarding.progress || typeof window.me.onboarding.progress !== "object") {
    window.me.onboarding.progress = {};
  }
  syncCh0QuestStep(ONBOARDING_STEPS[window.me.onboarding.step || 0]?.qt);
  renderOnboardingQuest();
  syncGuideTarget();
  window.Narrator?.refresh?.();
  window.StoryGoalHud?.refresh?.();
}

function resetOnboarding() {
  if (!window.me) return;
  window.me.onboarding = { step: 0, progress: {}, done: false };
  window.Narrator?.reset?.();
  renderOnboardingQuest();
  syncGuideTarget();
  if (window.saveMe) saveMe();
  window.Narrator?.refresh?.();
  window.StoryGoalHud?.refresh?.();
}

/** Legacy hooks — initiation duel only after ch1 choice, not onboarding. */
function onWinFight() {}
function onShopBuy() {}
function onVisitCemetery() {}
function hasPassedWinFight() {
  return !!window.me?.onboarding?.done;
}
function applyPendingOnboardingWins() {}

window.Onboarding = {
  STEPS: ONBOARDING_STEPS,
  init: initOnboarding,
  adaptSpawnLocation,
  render: renderOnboardingQuest,
  syncGuideTarget,
  showSolutionPath,
  onMove,
  onEnterLocation,
  onMomTalk,
  onFeedBowl,
  onShnurokInteract,
  onJournalOpen,
  onAvatarMirror,
  onInteractTutorial,
  onTalkRazor,
  onVisitCemetery,
  onWinFight,
  onShopBuy,
  getGuideTarget,
  getCurrentStep: currentStep,
  reset: resetOnboarding,
  replay: resetOnboarding,
  hasPassedWinFight,
  isActive: () => !!(window.me?.onboarding && !window.me.onboarding.done)
};
