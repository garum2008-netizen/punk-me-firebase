/** TZ §9 — Authority meter & gang join path */

let pathData = null;

function lang() {
  return typeof window.getLanguage === "function" ? window.getLanguage() : "ru";
}

function L(obj) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[lang()] || obj.en || obj.ru || "";
}

function me() {
  return window.me;
}

export function setAuthorityPathData(json) {
  pathData = json;
}

export function ensureAuthority(p) {
  if (!p) return null;
  if (!p.story) {
    p.story = {
      chapter: 1,
      flags: {},
      rel: { gang_rust: 0, zombie: 0 },
      energy: 100,
      mood: 100,
      materials: {},
      hangoutStage: 0,
      quest: { activeId: null, step: 0, completed: {} },
      earn: null,
      calloutAt: {},
      choices: {},
      events: {},
      idleHintLevel: 0,
      authority: 0,
      gang_rank: "newbie",
      auth: { stage: 1, s1Done: false, tasks: {}, trials: {}, ch2Done: false }
    };
  }
  const st = p.story;
  if (st.authority == null) st.authority = 0;
  if (!st.gang_rank) st.gang_rank = "newbie";
  if (!st.auth) {
    st.auth = {
      stage: 1,
      s1Done: false,
      tasks: {},
      trials: {},
      ch2Done: false
    };
  }
  p.authority = st.authority;
  p.gang_rank = st.gang_rank;
  return st;
}

export function getRankFromAuthority(value) {
  const ranks = pathData?.ranks || [];
  const v = Math.max(0, Math.min(100, value ?? 0));
  for (const r of ranks) {
    if (v >= r.min && v <= r.max) return r;
  }
  return ranks[0];
}

export function syncGangRank(p) {
  const st = ensureAuthority(p);
  const rank = getRankFromAuthority(st.authority);
  st.gang_rank = rank?.gang_rank || rank?.id || "newbie";
  p.gang_rank = st.gang_rank;
  return rank;
}

export function addAuthority(amount, p = me()) {
  const st = ensureAuthority(p);
  const before = st.authority;
  st.authority = Math.max(0, Math.min(100, st.authority + amount));
  p.authority = st.authority;
  const rank = syncGangRank(p);
  if (st.authority >= 20 && st.auth.stage === 1 && st.auth.s1Done) st.auth.stage = 2;
  if (st.authority >= 45 && st.auth.stage === 2 && stage2Complete(st)) st.auth.stage = 3;
  if (st.authority >= 80 && st.auth.stage === 3 && stage3Complete(st)) st.auth.stage = 4;
  if (before < 20 && st.authority >= 20) window.toast?.(L(rank?.label));
  renderAuthorityHud(p);
  window.saveMe?.();
  return st.authority;
}

function stage2Complete(st) {
  const tasks = pathData?.stages?.[1]?.tasks || [];
  return tasks.every(t => st.auth.tasks[t.id]);
}

function stage3Complete(st) {
  const trials = pathData?.stages?.[2]?.trials || [];
  return trials.every(t => st.auth.trials[t.id]);
}

export function renderAuthorityHud(p = me()) {
  const st = ensureAuthority(p);
  const rank = getRankFromAuthority(st.authority);
  const el = document.getElementById("authorityStat");
  const bar = document.getElementById("authorityBar");
  const lbl = document.getElementById("authorityRank");
  if (el) el.textContent = String(st.authority);
  if (bar) bar.style.width = `${st.authority}%`;
  if (lbl) lbl.textContent = L(rank?.label);
}

export function startAuthorityPath(p = me()) {
  const st = ensureAuthority(p);
  if (st.flags?.joined_gang) return;
  st.auth.stage = st.auth.s1Done ? st.auth.stage : 1;
  renderAuthorityHud(p);
}

export function openStage1Dialog(opts = {}) {
  const st = ensureAuthority(me());
  if (st.auth.s1Done || st.flags?.joined_gang) return;
  const stage = pathData?.stages?.[0];
  if (!stage) return;
  if (!opts.force) {
    if (me().location !== "street") return;
    if (window.World3D?.getNearestNpc?.() !== "mohawk") return;
    if (window.StoryEngine?.canOpenStoryModal && !window.StoryEngine.canOpenStoryModal()) return;
  } else if (me().location !== "street") return;
  window.StoryEngine?.dismissAllStoryUi?.();
  document.querySelectorAll(".modal.active").forEach(el => el.classList.remove("active"));
  const dlg = document.getElementById("storyDialog");
  if (!dlg) return;
  dlg.classList.add("active");
  dlg.querySelector(".story-dialog-title").textContent = L(stage.title);
  const body = dlg.querySelector(".story-dialog-body");
  body.innerHTML = `<p class="story-line"><b>${L({ ru: "Ирокез", en: "Mohawk", da: "Mohawk" })}:</b> ${escapeHtml(L(stage.intro.text))}</p>`;
  stage.choices.forEach(c => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn story-choice";
    btn.innerHTML = `<span class="choice-text">${escapeHtml(L(c.text))}</span><small class="choice-hint">${escapeHtml(L(c.hint))}</small>`;
    btn.onclick = () => {
      if (st.auth.s1Choices?.[c.id]) return;
      st.auth.s1Choices = st.auth.s1Choices || {};
      st.auth.s1Choices[c.id] = true;
      addAuthority(c.authority ?? 0);
      (c.effects || []).forEach(e => window.StoryEngine?.applyEffect?.(e));
      st.auth.s1Done = true;
      if (st.authority < 15) addAuthority(15 - st.authority);
      st.auth.stage = 2;
      dlg.classList.remove("active");
      window.StoryEngine?.renderObjectivePanel?.();
      window.StoryEngine?.syncBeacon?.();
      window.saveMe?.();
    };
    body.appendChild(btn);
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function getAuthorityObjective(p = me()) {
  const st = ensureAuthority(p);
  if (st.flags?.joined_gang) return null;
  const stageNum = st.auth.stage;
  const stages = pathData?.stages || [];
  if (stageNum === 1 && !st.auth.s1Done) {
    return { title: L(stages[0]?.title), objective: L({ ru: "Иди на Улицу — банда подкалывает", en: "Go to Gang Street — the gang is teasing", da: "Gå til Bandegaden" }), beacon: "npc_mohawk_street" };
  }
  if (stageNum === 2) {
    const tasks = stages[1]?.tasks || [];
    const next = tasks.find(t => !st.auth.tasks[t.id]);
    if (next) return { title: L(stages[1]?.title), objective: L(next.objective), beacon: next.beacon, taskId: next.id };
  }
  if (stageNum === 3) {
    const trials = stages[2]?.trials || [];
    const next = trials.find(t => !st.auth.trials[t.id]);
    if (next) return { title: L(stages[2]?.title), objective: L(next.objective), beacon: next.beacon, trialId: next.id };
  }
  if (stageNum === 4) {
    return { title: L(stages[3]?.title), objective: L(stages[3]?.objective), beacon: stages[3]?.beacon };
  }
  return null;
}

export function completeAuthTask(taskId, p = me()) {
  const st = ensureAuthority(p);
  const tasks = pathData?.stages?.[1]?.tasks || [];
  const t = tasks.find(x => x.id === taskId);
  if (!t || st.auth.tasks[taskId]) return;
  st.auth.tasks[taskId] = true;
  addAuthority(t.authority || 5);
  if (stage2Complete(st) && st.authority < 45) addAuthority(45 - st.authority);
  st.auth.stage = stage2Complete(st) ? 3 : 2;
  window.StoryEngine?.renderObjectivePanel?.();
}

export function completeAuthTrial(trialId, p = me()) {
  const st = ensureAuthority(p);
  const trials = pathData?.stages?.[2]?.trials || [];
  const t = trials.find(x => x.id === trialId);
  if (!t || st.auth.trials[trialId]) return;
  st.auth.trials[trialId] = true;
  addAuthority(t.authority || 10);
  if (stage3Complete(st) && st.authority < 80) addAuthority(80 - st.authority);
  st.auth.stage = stage3Complete(st) ? 4 : 3;
  window.StoryEngine?.renderObjectivePanel?.();
}

export function runInitiationCeremony(opts = {}) {
  const st = ensureAuthority(me());
  if (st.flags?.joined_gang) return;
  if (!opts.force) {
    if (me().location !== "street") return;
    if (window.World3D?.getNearestNpc?.() !== "razor") return;
    if (window.StoryEngine?.canOpenStoryModal && !window.StoryEngine.canOpenStoryModal()) return;
  } else if (me().location !== "street") return;
  if (!stage3Complete(st) || st.authority < 80) {
    window.toast?.(L({ ru: "Сначала испытания", en: "Finish the trials first", da: "Fuldfør prøverne først" }));
    return;
  }
  const stage = pathData?.stages?.[3];
  const dlg = document.getElementById("storyDialog");
  if (dlg && stage?.ceremony) {
    dlg.classList.add("active");
    dlg.querySelector(".story-dialog-title").textContent = L(stage.title);
    dlg.querySelector(".story-dialog-body").innerHTML =
      `<p class="story-line">${escapeHtml(L(stage.ceremony.text))}</p>
       <button type="button" class="btn" id="authInitBtn">${L({ ru: "Принять нашивку", en: "Take the patch", da: "Tag mærket" })}</button>`;
    dlg.querySelector("#authInitBtn").onclick = () => {
      dlg.classList.remove("active");
      finishInitiation();
    };
    return;
  }
  finishInitiation();
}

function finishInitiation() {
  const st = ensureAuthority(me());
  st.authority = 100;
  st.gang_rank = "gang_member";
  me().authority = 100;
  me().gang_rank = "gang_member";
  st.flags.joined_gang = true;
  st.auth.stage = 5;
  renderAuthorityHud();
  window.StoryEngine?.applyEffect?.({ type: "flag", value: "joined_gang" });
  window.toast?.(L({ ru: "Член банды «Ржавые Цепи»!", en: "Rusty Chains gang member!", da: "Rusty Chains-medlem!" }));
  window.StoryEngine?.renderObjectivePanel?.();
  maybeChapter2Bullying();
}

export function maybeChapter2Bullying() {
  const st = ensureAuthority(me());
  if (st.auth.ch2Done || st.gang_rank !== "gang_member") return;
  if ((st.chapter || 1) < 2) {
    st.chapter = 2;
  }
  const ch2 = pathData?.chapter2_antibullying;
  if (!ch2) return;
  const dlg = document.getElementById("storyDialog");
  if (!dlg) return;
  dlg.classList.add("active");
  dlg.querySelector(".story-dialog-title").textContent = L({ ru: "Глава 2: новенький", en: "Chapter 2: new kid", da: "Kapitel 2: ny" });
  const body = dlg.querySelector(".story-dialog-body");
  body.innerHTML = `<p class="story-line">${escapeHtml(L(ch2.intro.text))}</p>`;
  ch2.choices.forEach(c => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn story-choice";
    btn.innerHTML = `<span class="choice-text">${escapeHtml(L(c.text))}</span><small class="choice-hint">${escapeHtml(L(c.hint))}</small>`;
    btn.onclick = () => {
      if (st.auth.ch2Choice) return;
      st.auth.ch2Choice = c.id;
      st.auth.ch2Done = true;
      if (c.authority > 0) addAuthority(c.authority);
      (c.effects || []).forEach(e => window.StoryEngine?.applyEffect?.(e));
      if (c.id === "stand_up") {
        window.toast?.(L(ch2.npc_reactions.razor_stand));
      } else {
        window.toast?.(L(ch2.npc_reactions.cobalt_disappointed));
      }
      dlg.classList.remove("active");
      window.saveMe?.();
    };
    body.appendChild(btn);
  });
}

export function getNpcLinesForRank(npcId, p = me()) {
  const st = ensureAuthority(p);
  const rank = st.gang_rank || "newbie";
  const table = pathData?.npc_lines_by_rank?.[npcId];
  if (!table) return null;
  const lines = table[rank] || table.newbie || table.gang_member;
  if (!lines) return null;
  const l = lines[lang()] || lines.en || lines.ru;
  return Array.isArray(l) ? l : [l];
}

export function onAuthStoryEvent(name, p = me()) {
  const st = ensureAuthority(p);
  if (st.flags?.joined_gang && !name.startsWith("auth_")) return;
  const map = {
    auth_pizza_done: () => completeAuthTask("pizza"),
    job_pizza_done: () => {
      if (st.auth.stage === 2 && !st.auth.tasks.pizza) {
        st.events = st.events || {};
        fireAndComplete("auth_pizza_done", "pizza");
      }
    },
    auth_no_rat: () => completeAuthTask("no_rat"),
    auth_cobalt_item: () => completeAuthTask("cobalt_item"),
    auth_ghost_prank: () => completeAuthTask("ghost_prank"),
    auth_trial_cemetery: () => completeAuthTrial("cemetery"),
    job_cemetery_done: () => {
      if (st.auth.stage === 3 && !st.auth.trials.cemetery) completeAuthTrial("cemetery");
    },
    auth_trial_roof: () => completeAuthTrial("roof_parkour"),
    auth_trial_duel: () => completeAuthTrial("duel_mohawk"),
    parkour_win: () => {
      if (st.auth.stage === 3 && !st.auth.trials.roof_parkour) completeAuthTrial("roof_parkour");
    }
  };
  if (map[name]) map[name]();
  else if (name === "auth_pizza_done") completeAuthTask("pizza");

  function fireAndComplete(evt, taskId) {
    completeAuthTask(taskId);
  }
}

export function tryAuthorityNpc(npcId, p = me()) {
  const st = ensureAuthority(p);
  if (st.flags?.joined_gang) {
    if (npcId === "razor" && st.gang_rank === "gang_member") return false;
  }
  if (npcId === "mohawk" && st.auth.stage === 1 && !st.auth.s1Done) {
    openStage1Dialog();
    return true;
  }
  if (npcId === "razor" && st.auth.stage === 4 && !st.flags?.joined_gang) {
    runInitiationCeremony();
    return true;
  }
  if (npcId === "gravedigger" && st.auth.stage === 2 && !st.auth.tasks.no_rat) {
    openNoRatChoice();
    return true;
  }
  if (npcId === "gravedigger" && st.auth.stage === 3 && !st.auth.trials.cemetery) {
    window.toast?.(L({ ru: "Начни ночную смену (кнопка Работа)", en: "Start night shift (Job button)", da: "Start nattevagt" }));
    return true;
  }
  if (npcId === "mohawk" && st.auth.stage === 3 && !st.auth.trials.duel_mohawk) {
    window.startTrainingDuelMohawk?.();
    return true;
  }
  if (npcId === "cobalt" && me().location === "roof" && st.auth.stage === 2 && !st.auth.tasks.cobalt_item) {
    completeAuthTask("cobalt_item");
    window.StoryEngine?.fireStoryEvent?.("auth_cobalt_item");
    window.toast?.(L({ ru: "Кобальт: «Нашла! Спасибо, свой.»", en: "Cobalt: \"Found it! Thanks, fam.\"", da: "Kobalt: \"Fundet! Tak.\"" }));
    return true;
  }
  if (npcId === "plukh" && st.auth.stage === 2 && !st.auth.tasks.ghost_prank) {
    completeAuthTask("ghost_prank");
    window.toast?.(L({ ru: "Плюх: «Испугал? Шучу! Ты выдержал.»", en: "Plukh: \"Scared you? Kidding — you handled it.\"", da: "Plukh: \"Blev du bange? Bare sjov.\"" }));
    return true;
  }
  if (npcId === "tony" && st.auth.stage === 2 && !st.auth.tasks.pizza) {
    const price = 15;
    if (p.coins < price) {
      window.StoryEngine?.beginEarnCoins?.(price - p.coins, { returnBeacon: "npc_tony", returnLabel: "Tony" });
      return true;
    }
    p.coins -= price;
    window.PlayV21?.startPizzaJob?.(p, { toast: window.toast, save: window.saveMe });
    return true;
  }
  return false;
}

function openNoRatChoice() {
  const dlg = document.getElementById("storyDialog");
  if (!dlg) return;
  dlg.classList.add("active");
  dlg.querySelector(".story-dialog-title").textContent = L({ ru: "Смотритель давит", en: "Keeper presses you", da: "Vogteren presser" });
  const body = dlg.querySelector(".story-dialog-body");
  body.innerHTML = "";
  [
    {
      id: "loyal",
      text: { ru: "Не сдам банду", en: "Won't rat them out", da: "Sladrer ikke" },
      hint: { ru: "Авторитет +7", en: "Authority +7", da: "Autoritet +7" },
      fn: () => {
        window.StoryEngine?.fireStoryEvent?.("auth_no_rat");
        completeAuthTask("no_rat");
      }
    },
    {
      id: "rat",
      text: { ru: "Рассказать про банду", en: "Tell about the gang", da: "Fortæl om banden" },
      hint: { ru: "Авторитет −10", en: "Authority −10", da: "Autoritet −10" },
      fn: () => addAuthority(-10)
    }
  ].forEach(c => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn story-choice";
    btn.innerHTML = `<span class="choice-text">${escapeHtml(L(c.text))}</span><small class="choice-hint">${escapeHtml(L(c.hint))}</small>`;
    btn.onclick = () => {
      c.fn();
      dlg.classList.remove("active");
    };
    body.appendChild(btn);
  });
}

const STAGE1_CALLOUT_MS = 9000;

export function tryStage1ProximityCallout(p = me()) {
  const st = ensureAuthority(p);
  if (st.auth.stage !== 1 || st.auth.s1Done || st.flags?.joined_gang) return;
  if (p.location !== "street") return;
  if (window.World3D?.getNearestNpc?.() !== "mohawk") return;
  if (!window.StoryEngine?.canOpenStoryModal?.()) return;
  const now = Date.now();
  if (now - (st.auth.s1CalloutAt || 0) < STAGE1_CALLOUT_MS) return;
  st.auth.s1CalloutAt = now;
  const intro = pathData?.stages?.[0]?.intro?.text;
  if (intro) window.StoryEngine?.showNpcProximityCallout?.("mohawk", L(intro));
}

export function onEnterStreetForTeasing() {
  /* legacy no-op: stage 1 opens via proximity callout or E on Mohawk only */
}

export function openTrialsChooserDialog() {
  const st = ensureAuthority(me());
  const trials = pathData?.stages?.[2]?.trials || [];
  const dlg = document.getElementById("storyDialog");
  if (!dlg) return;
  dlg.classList.add("active");
  dlg.querySelector(".story-dialog-title").textContent = L(pathData.stages[2]?.title);
  const body = dlg.querySelector(".story-dialog-body");
  body.innerHTML = `<p class="story-line">${escapeHtml(L({ ru: "Три испытания — провал можно повторить.", en: "Three trials — you can retry if you fail.", da: "Tre prøver — du kan prøve igen." }))}</p>`;
  trials.forEach(t => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn story-choice";
    btn.innerHTML = `<span class="choice-text">${escapeHtml(L(t.name))}</span><small class="choice-hint">${escapeHtml(L(t.objective))}</small>`;
    btn.onclick = () => dlg.classList.remove("active");
    body.appendChild(btn);
  });
}

export const Authority = {
  setAuthorityPathData,
  ensureAuthority,
  renderAuthorityHud,
  startAuthorityPath,
  getAuthorityObjective,
  openStage1Dialog,
  openNoRatChoice,
  openTrialsChooserDialog,
  addAuthority,
  getNpcLinesForRank,
  onAuthStoryEvent,
  tryAuthorityNpc,
  runInitiationCeremony,
  maybeChapter2Bullying,
  onEnterStreetForTeasing,
  tryStage1ProximityCallout,
  syncGangRank
};

export default Authority;
