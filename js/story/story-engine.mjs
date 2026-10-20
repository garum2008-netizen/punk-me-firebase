/**
 * Data-driven story / quests (TZ §7–9). Bubbles + subtitles + SFX only (no synth TTS).
 */

import * as Authority from "./authority.mjs";

const DATA_BASE = "data/story/";
const CALLOUT_COOLDOWN_MS = 90000;
const IDLE_HINTS = [60, 120, 180];

const BEACONS = {
  npc_razor: { loc: "street", npcId: "razor" },
  npc_tony: { loc: "city", npcId: "tony" },
  npc_bolt: { loc: "city", npcId: "bolt" },
  npc_zoya: { loc: "kitchen", npcId: "zoya" },
  npc_plukh: { loc: "toilet", npcId: "plukh" },
  npc_gravedigger: { loc: "cemetery", npcId: "gravedigger" },
  npc_foreman: { loc: "construction", npcId: "foreman" },
  npc_vintik: { loc: "construction", npcId: "vintik" },
  obj_hangout_site: { loc: "construction", wx: 0, wz: -2 },
  obj_fridge: { loc: "kitchen", wx: 4.2, wz: -3.2 },
  obj_dog_bowl: { loc: "room", wx: -2.5, wz: 3.5 },
  obj_decor_btn: { loc: "room", ui: "decor" },
  obj_scrap_roof: { loc: "roof", wx: 5, wz: -4 },
  obj_parkour_finish: { loc: "parkour", wx: 0, wz: -8 },
  portal_roof: { loc: "elevator", portalTo: "roof" },
  portal_construction: { loc: "city", portalTo: "construction" },
  npc_mohawk_street: { loc: "street", npcId: "mohawk" },
  npc_cobalt_roof: { loc: "roof", npcId: "cobalt" },
  obj_roof_parkour: { loc: "roof", wx: 4, wz: -3 }
};

const STORY_NPC_IDS = new Set([
  "razor", "tony", "bolt", "zoya", "plukh", "gravedigger", "foreman", "vintik"
]);

let data = { quests: [], dialogues: [], jobs: [], balance: null, hangout: null };
let hooks = {};
let loaded = false;
let idleSec = 0;
let lastMoveT = Date.now();
let activeDlg = null;
let audioCtx = null;

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

export function ensureStoryState(p) {
  if (!p.story) {
    p.story = {
      chapter: 1,
      flags: {},
      rel: { gang_rust: 0, zombie: 0 },
      energy: 100,
      mood: 100,
      materials: { board: 0, brick: 0, nails: 0, chain: 0, spray: 0, neon_tube: 0, scrap: 0 },
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
  if (p.story.authority != null) {
    p.authority = p.story.authority;
    p.gang_rank = p.story.gang_rank;
  }
  Authority.ensureAuthority(p);
  if (p.energy == null) p.energy = p.story.energy;
  if (p.mood == null) p.mood = p.story.mood;
  return p.story;
}

async function loadJson(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error("story load " + path);
  return r.json();
}

export async function loadStoryData() {
  if (loaded) return data;
  const [balance, jobs, hangout, dialogues, quests, authorityPath] = await Promise.all([
    loadJson(DATA_BASE + "balance.json"),
    loadJson(DATA_BASE + "jobs.json"),
    loadJson(DATA_BASE + "construction-hangout.json"),
    loadJson(DATA_BASE + "dialogues.json"),
    loadJson(DATA_BASE + "quests.json"),
    loadJson(DATA_BASE + "authority-path.json")
  ]);
  Authority.setAuthorityPathData(authorityPath);
  data.authorityPath = authorityPath;
  data.balance = balance;
  data.jobs = jobs.jobs || [];
  data.hangout = hangout;
  data.dialogues = dialogues.dialogues || [];
  data.quests = quests.quests || [];
  loaded = true;
  return data;
}

function playSfx(id) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.connect(g);
    g.connect(audioCtx.destination);
    const map = {
      sfx_whistle: { f: 880, dur: 0.12, type: "sine" },
      sfx_spoon: { f: 520, dur: 0.08, type: "triangle" },
      sfx_bubble: { f: 220, dur: 0.15, type: "sine" },
      sfx_crane: { f: 180, dur: 0.25, type: "square" },
      sfx_horn: { f: 440, dur: 0.18, type: "sawtooth" },
      sfx_lantern: { f: 660, dur: 0.1, type: "sine" },
      sfx_chain: { f: 320, dur: 0.14, type: "triangle" }
    };
    const s = map[id] || map.sfx_whistle;
    o.type = s.type;
    o.frequency.value = s.f;
    g.gain.value = 0.08;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + s.dur);
    o.stop(audioCtx.currentTime + s.dur);
  } catch (_) {}
}

function setSubtitle(text, speaker) {
  const el = document.getElementById("voiceSubtitle");
  if (el) el.textContent = speaker ? `${speaker}: ${text}` : text;
}

function showBubble(npcId, text) {
  const layer = document.getElementById("storyBubbles");
  if (!layer) return;
  const b = document.createElement("div");
  b.className = "story-bubble";
  b.textContent = text;
  layer.appendChild(b);
  setTimeout(() => b.remove(), 4200);
  positionBubbleTowardNpc(npcId);
}

function positionBubbleTowardNpc(npcId) {
  const ind = document.getElementById("storyDirection");
  if (!ind || !window.World3D) return;
  const pl = window.World3D.getDebugCamera?.()?.player;
  const loc = window.World3D.getLocation?.();
  const anchor = BEACONS["npc_" + npcId] || BEACONS["npc_" + (npcId === "gravedigger" ? "gravedigger" : npcId)];
  if (!anchor || anchor.loc !== loc) {
    ind.classList.remove("visible");
    return;
  }
  ind.classList.add("visible");
  ind.textContent = "!";
}

function hideDirection() {
  document.getElementById("storyDirection")?.classList.remove("visible");
}

function evalCondition(cond) {
  const p = me();
  const st = ensureStoryState(p);
  if (!cond) return true;
  if (cond.startsWith("onboarding:")) {
    const v = cond.split(":")[1];
    if (v === "done") return !!p.onboarding?.done;
  }
  if (cond.startsWith("flag:")) {
    const f = cond.slice(5);
    if (f.startsWith("!")) return !st.flags[f.slice(1)];
    return !!st.flags[f];
  }
  if (cond.startsWith("chapter>=")) return st.chapter >= parseInt(cond.split(">=")[1], 10);
  if (cond.startsWith("quest:")) {
    const [qid, state] = cond.slice(6).split("=");
    const q = st.quest;
    if (state === "done") return !!st.quest.completed[qid];
    if (state === "active") return q.activeId === qid;
  }
  if (cond.startsWith("energy>=")) return (p.energy ?? st.energy) >= parseInt(cond.split(">=")[1], 10);
  if (cond.startsWith("coins>=")) return p.coins >= parseInt(cond.split(">=")[1], 10);
  return true;
}

function checkRequires(list) {
  return (list || []).every(evalCondition);
}

function applyEffects(effects) {
  const p = me();
  const st = ensureStoryState(p);
  (effects || []).forEach(e => {
    switch (e.type) {
      case "coins":
        if (!window.isOwner) p.coins += e.value;
        break;
      case "xp":
        p.xp += e.value;
        break;
      case "rep":
        p.rep += e.value;
        break;
      case "energy":
        p.energy = Math.min(100, (p.energy || 50) + e.value);
        st.energy = p.energy;
        break;
      case "mood":
        p.mood = Math.min(100, (p.mood || 50) + e.value);
        st.mood = p.mood;
        break;
      case "rel":
        st.rel[e.target] = (st.rel[e.target] || 0) + e.value;
        break;
      case "flag":
        st.flags[e.value] = true;
        if (e.value === "joined_gang") onJoinedGang();
        break;
      case "quest_start":
        startQuest(e.id);
        break;
      case "beacon":
        setBeacon(e.target);
        break;
      case "unlock_location":
        st.flags["unlock_" + e.id] = true;
        break;
      case "material": {
        const id = e.id || e.material;
        st.materials[id] = (st.materials[id] || 0) + (e.value || 1);
        break;
      }
      case "start_duel":
        window.startNpcFight?.(e.id === "razor" ? "razor" : e.id);
        break;
      case "authority":
        Authority.addAuthority(e.value, p);
        break;
      case "gang_rank":
        st.gang_rank = e.value;
        p.gang_rank = e.value;
        Authority.renderAuthorityHud(p);
        break;
      default:
        break;
    }
  });
  hooks.save?.();
  renderObjectivePanel();
  syncBeacon();
}

function onJoinedGang() {
  const st = ensureStoryState(me());
  st.chapter = Math.max(st.chapter, 2);
  if (!st.quest.completed.q_hangout_build && !st.quest.activeId) {
    startQuest("q_hangout_build");
  }
  hooks.toast?.(L({ ru: "Нашивка «Ржавые Цепи» получена!", en: "Rusty Chains patch earned!", da: "Rusty Chains-mærke!" }));
}

export function startQuest(qid) {
  const p = me();
  const st = ensureStoryState(p);
  const q = data.quests.find(x => x.id === qid);
  if (!q || st.quest.completed[qid]) return;
  st.quest.activeId = qid;
  st.quest.step = 0;
  st.idleHintLevel = 0;
  idleSec = 0;
  const step = q.steps[0];
  if (step?.beacon) setBeacon(step.beacon);
  renderObjectivePanel();
  syncBeacon();
  logEvent("quest_start", qid);
}

function completeQuest(qid) {
  const p = me();
  const st = ensureStoryState(p);
  const q = data.quests.find(x => x.id === qid);
  if (!q) return;
  applyEffects(q.rewards);
  st.quest.completed[qid] = true;
  if (st.quest.activeId === qid) {
    st.quest.activeId = null;
    st.quest.step = 0;
  }
  hooks.toast?.(L({ ru: "Задание выполнено", en: "Quest complete", da: "Opgave fuldført" }) + ": " + L(q.title));
  pickNextObjective();
}

function pickNextObjective() {
  const p = me();
  const st = ensureStoryState(p);
  if (st.quest.activeId) return;
  if (!st.flags.joined_gang && p.onboarding?.done) {
    if (!st.quest.completed.q_initiation_pay && !st.quest.completed.q_initiation_duel && !st.quest.completed.q_initiation_graffiti) {
      return;
    }
  }
  const loc = p.location;
  const candidate = data.quests.find(
    q => !st.quest.completed[q.id] && q.loc === loc && q.type !== "main" && !st.quest.activeId
  );
  if (candidate) startQuest(candidate.id);
  else renderObjectivePanel();
}

function getActiveQuest() {
  const st = ensureStoryState(me());
  if (!st.quest.activeId) return null;
  return data.quests.find(q => q.id === st.quest.activeId);
}

function getActiveStep() {
  const q = getActiveQuest();
  if (!q) return null;
  const st = ensureStoryState(me());
  return q.steps[st.quest.step] || null;
}

function story() {
  return ensureStoryState(me());
}

export function setBeacon(beaconId) {
  story().beacon = beaconId;
  syncBeacon();
}

export function resolveGuideTarget() {
  const p = me();
  const st = ensureStoryState(p);
  const id = st.earn?.employerBeacon || st.beacon;
  if (!id) {
    const step = getActiveStep();
    if (step?.beacon) return beaconToGuide(step.beacon, p.location);
  }
  return beaconToGuide(id, p.location);
}

function beaconToGuide(beaconId, playerLoc) {
  const b = BEACONS[beaconId];
  if (!b) return null;
  if (b.loc && b.loc !== playerLoc) {
    const portal = findPortalTo(playerLoc, b.loc);
    if (portal) return { portalTo: portal.to, labelKey: portal.labelKey, wx: portal.x, wz: portal.z };
  }
  if (b.npcId) return { npcId: b.npcId };
  if (b.wx != null) return { wx: b.wx, wz: b.wz };
  if (b.ui === "decor") return { ui: "decor" };
  return null;
}

function findPortalTo(fromLoc, toLoc) {
  const portals = window.PORTALS_LIST?.[fromLoc];
  if (!portals) return null;
  return portals.find(p => p.to === toLoc) || null;
}

export function syncBeacon() {
  const t = resolveGuideTarget();
  window.World3D?.setGuideTarget?.(t);
  if (t?.ui === "decor") hooks.toast?.(L({ ru: "Нажми «Декор» внизу", en: "Tap Decor below", da: "Tryk Dekor" }));
}

function checkStepComplete() {
  const q = getActiveQuest();
  const step = getActiveStep();
  if (!q || !step) return;
  const st = ensureStoryState(me());
  const p = me();
  const co = step.complete_on || "";
  let done = false;
  if (co.startsWith("coins>=")) done = p.coins >= parseInt(co.split(">=")[1], 10);
  else if (co.startsWith("material:")) {
    const [mat, op] = co.split(":")[1].split(">=");
    done = (st.materials[mat] || 0) >= parseInt(op, 10);
  } else if (co.startsWith("hangout_stage>=")) done = st.hangoutStage >= parseInt(co.split(">=")[1], 10);
  else if (co.startsWith("event:")) done = !!st.events[co.slice(6)];
  if (!done) return;
  if (st.quest.step + 1 < q.steps.length) {
    st.quest.step += 1;
    const next = q.steps[st.quest.step];
    if (next?.beacon) setBeacon(next.beacon);
    renderObjectivePanel();
    syncBeacon();
    return;
  }
  if (q.choices?.length && !st.choices[q.id]) {
    openQuestChoices(q);
    return;
  }
  completeQuest(q.id);
}

function openQuestChoices(q) {
  const dlg = document.getElementById("storyDialog");
  if (!dlg) return;
  dlg.classList.add("active");
  const body = dlg.querySelector(".story-dialog-body");
  const title = dlg.querySelector(".story-dialog-title");
  title.textContent = L(q.title);
  body.innerHTML = q.choices
    .map(
      c => `<button type="button" class="btn story-choice" data-choice="${c.id}">
      <span class="choice-text">${escapeHtml(L(c.text))}</span>
      <small class="choice-hint">${escapeHtml(L(c.hint || {}))}</small>
    </button>`
    )
    .join("");
  body.querySelectorAll(".story-choice").forEach(btn => {
    btn.onclick = () => {
      const c = q.choices.find(x => x.id === btn.dataset.choice);
      if (c && !story().choices[q.id + ":" + c.id]) {
        story().choices[q.id + ":" + c.id] = true;
        story().choices[q.id] = c.id;
        applyEffects(c.effects);
      }
      dlg.classList.remove("active");
      completeQuest(q.id);
    };
  });
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function applyEffect(effect) {
  applyEffects([effect]);
}

export function fireStoryEvent(name) {
  const st = ensureStoryState(me());
  st.events[name] = true;
  Authority.onAuthStoryEvent(name);
  if (name === "duel_razor_win" && st.quest.activeId === "q_initiation_duel") {
    applyEffects([{ type: "flag", value: "joined_gang" }]);
  }
  checkStepComplete();
  if (st.earn && name.startsWith("job_")) {
    onEarnProgress();
  }
  renderObjectivePanel();
  hooks.save?.();
}

function onEarnProgress() {
  const st = ensureStoryState(me());
  const eg = st.earn;
  if (!eg) return;
  const p = me();
  if (p.coins >= eg.needTotal) {
    hooks.toast?.(
      L({
        ru: `До цели осталось 0 — вернись: ${eg.returnLabel || ""}`,
        en: `Goal reached — return: ${eg.returnLabel || ""}`,
        da: `Mål nået — vend tilbage`
      })
    );
    setBeacon(eg.returnBeacon || st.beacon);
    st.earn = null;
    renderObjectivePanel();
    syncBeacon();
  }
}

export function beginEarnCoins(shortfall, context) {
  const p = me();
  const st = ensureStoryState(p);
  if ((p.energy ?? st.energy) < 10) {
    st.earn = {
      mode: "snack",
      needTotal: p.coins + shortfall,
      returnBeacon: context?.returnBeacon,
      returnLabel: context?.returnLabel
    };
    setBeacon("obj_fridge");
    renderObjectivePanel();
    hooks.toast?.(
      L({
        ru: "Ты выдохся. Перекуси на Кухне или в автомате",
        en: "You're wiped. Snack on the Kitchen or vending machine",
        da: "Du er udmattet. Snack i Køkkenet"
      })
    );
    return;
  }
  const job = pickNearestJob(p.location);
  st.earn = {
    needTotal: p.coins + shortfall,
    shortfall,
    jobId: job?.id,
    employerBeacon: job?.employer?.startsWith("npc_")
      ? job.employer
      : "npc_" + (job?.employer || "tony"),
    returnBeacon: context?.returnBeacon || st.beacon,
    returnLabel: context?.returnLabel || L(getActiveQuest()?.title)
  };
  setBeacon(st.earn.employerBeacon);
  st.flags.earn_mode = true;
  renderObjectivePanel();
  syncBeacon();
}

function pickNearestJob(loc) {
  const p = me();
  const order = {
    street: ["flyer_post", "pizza_delivery"],
    city: ["pizza_delivery", "construction_helper"],
    kitchen: ["dishes_zoya"],
    cemetery: ["cemetery_night"],
    construction: ["construction_helper"],
    room: ["flyer_post"],
    default: ["pizza_delivery", "flyer_post"]
  };
  const ids = order[loc] || order.default;
  for (const id of ids) {
    const j = data.jobs.find(x => x.id === id);
    if (j && j.loc === loc) return j;
  }
  return data.jobs.find(j => ids.includes(j.id)) || data.jobs[0];
}

export function tryStoryPurchase(cost, ctx) {
  const p = me();
  if (p.coins >= cost) return true;
  const short = cost - p.coins;
  beginEarnCoins(short, ctx);
  return false;
}

export function renderObjectivePanel() {
  const box = document.getElementById("questBox");
  if (!box || !window.me?.onboarding?.done) return false;
  const st = ensureStoryState(me());
  const p = me();
  let title = "";
  let objective = "";
  let sub = "";

  if (st.earn) {
    if (st.earn.mode === "snack") {
      title = L({ ru: "Перекуси", en: "Grab a snack", da: "Snacks" });
      objective = L({
        ru: "Кухня: холодильник +25 энергии",
        en: "Kitchen: fridge +25 energy",
        da: "Køkken: køleskab +25 energi"
      });
    } else {
      const job = data.jobs.find(j => j.id === st.earn.jobId);
      const need = Math.max(0, st.earn.needTotal - p.coins);
      title = L({ ru: "Заработай монеты", en: "Earn coins", da: "Tjen mønter" });
      objective = L({
        ru: `Заработай ${need} монет: ${L(job?.title || {})} (~${job?.minutes || 3} мин)`,
        en: `Earn ${need} coins: ${L(job?.title || {})} (~${job?.minutes || 3} min)`,
        da: `Tjen ${need} mønter: ${L(job?.title || {})}`
      });
      sub = L({
        ru: `Не хватает ${st.earn.shortfall || need} монет. Заработай на работе →`,
        en: `Need ${st.earn.shortfall || need} more coins. Go work →`,
        da: `Mangler ${st.earn.shortfall || need} mønter. Arbejd →`
      });
    }
  } else {
    const authObj = !st.flags.joined_gang ? Authority.getAuthorityObjective(p) : null;
    if (authObj) {
      title = authObj.title;
      objective = authObj.objective;
      if (authObj.beacon) setBeacon(authObj.beacon);
    } else {
    const q = getActiveQuest();
    const step = getActiveStep();
    if (q && step) {
      title = L(q.title);
      objective = L(step.objective);
      const hintLevel = st.idleHintLevel || 0;
      if (hintLevel > 0 && step.hint_60s) {
        sub = L(step.hint_60s);
        if (hintLevel >= 3) sub += " · " + L({ ru: "Показать путь", en: "Show path", da: "Vis vej" });
      }
    } else if (st.hangoutStage < 4 && st.flags.joined_gang) {
      title = L(data.hangout?.title || {});
      const stage = data.hangout?.stages?.[st.hangoutStage];
      objective = stage ? L(stage.hint) : L({ ru: "Стройка: Тусовка", en: "Construction: hangout", da: "Byggeplads" });
      renderConstructionBar();
    } else {
      title = L({ ru: "Тыквоград", en: "Pumpkin City", da: "Græskarby" });
      objective = L({
        ru: "Исследуй локации — NPC зовут сами",
        en: "Explore — NPCs call out to you",
        da: "Udforsk — NPC'er kalder"
      });
    }
    }
  }

  Authority.renderAuthorityHud(p);
  box.innerHTML = `<div class="quest-tracker story-objective">
    <b>${escapeHtml(title)}</b>
    <div class="quest-step-title">${escapeHtml(objective)}</div>
    ${sub ? `<div class="quest-step-text story-subgoal">${escapeHtml(sub)}</div>` : ""}
    <div class="story-meters"><span>⚡ ${Math.round(p.energy ?? st.energy)}</span> <span>☺ ${Math.round(p.mood ?? st.mood)}</span></div>
  </div>`;
  updateConstructionHud();
  return true;
}

function renderConstructionBar() {
  /* merged into updateConstructionHud */
}

export function updateConstructionHud() {
  const hud = document.getElementById("storyConstructionHud");
  if (!hud) return;
  const p = me();
  if (p.location !== "construction") {
    hud.classList.remove("active");
    return;
  }
  const st = ensureStoryState(p);
  const stage = data.hangout?.stages?.[st.hangoutStage];
  if (!stage) {
    hud.classList.remove("active");
    return;
  }
  hud.classList.add("active");
  const need = stage.need || {};
  const parts = Object.entries(need).map(([k, n]) => {
    const have = st.materials[k] || 0;
    return `${k} ${have}/${n}`;
  });
  hud.querySelector(".need-line").textContent = L({ ru: "Нужно: ", en: "Need: ", da: "Brug for: " }) + parts.join(", ");
  hud.querySelector(".stage-name").textContent =
    L(stage.name) + ` (${st.hangoutStage + 1}/4)`;
}

export function buildHangoutStage() {
  const p = me();
  const st = ensureStoryState(p);
  if (p.location !== "construction") {
    hooks.toast?.(L({ ru: "Иди на Стройку", en: "Go to Construction site", da: "Gå til byggepladsen" }));
    return;
  }
  const stage = data.hangout?.stages?.[st.hangoutStage];
  if (!stage) return;
  const need = stage.need || {};
  for (const [k, n] of Object.entries(need)) {
    if ((st.materials[k] || 0) < n) {
      hooks.toast?.(L(stage.hint));
      setBeacon(stage.beacon || "obj_hangout_site");
      syncBeacon();
      return;
    }
  }
  for (const [k, n] of Object.entries(need)) st.materials[k] -= n;
  st.hangoutStage += 1;
  window.World3D?.refreshHangoutStage?.(st.hangoutStage);
  hooks.toast?.(L({ ru: "Этап построен!", en: "Stage built!", da: "Etape bygget!" }));
  if (st.hangoutStage >= 4) fireStoryEvent("hangout_complete");
  checkStepComplete();
  renderObjectivePanel();
  hooks.save?.();
}

export function whereToGetMaterials() {
  const st = ensureStoryState(me());
  const stage = data.hangout?.stages?.[st.hangoutStage];
  if (stage?.beacon) setBeacon(stage.beacon);
  syncBeacon();
  hooks.toast?.(L(stage?.hint || {}));
}

function tryCallouts() {
  const p = me();
  const loc = p.location;
  const now = Date.now();
  const st = ensureStoryState(p);
  if (activeDlg) return;
  const dlgList = data.dialogues.filter(d => d.location === loc);
  for (const d of dlgList) {
    const key = d.id;
    if (now - (st.calloutAt[key] || 0) < CALLOUT_COOLDOWN_MS) continue;
    const tr = d.trigger || {};
    if (tr.type === "enter" && p._storyJustEntered !== loc) continue;
    if (tr.type === "proximity") {
      const npcKey = (d.callout?.bubble_key && "npc_" + (d.nodes?.[0]?.speaker || "").replace("npc_", "")) || null;
      const anchor = npcKey && BEACONS[npcKey];
      if (anchor?.npcId) {
        const near = window.World3D?.getNearestNpc?.();
        if (near !== anchor.npcId) continue;
      }
    }
    if (!checkRequires(tr.conditions)) continue;
    st.calloutAt[key] = now;
    triggerCalloutDialogue(d);
    break;
  }
}

function triggerCalloutDialogue(d) {
  const node = d.nodes?.find(n => n.id === (d.callout?.bubble_key || "n1")) || d.nodes?.[0];
  if (!node) return;
  const speaker = (node.speaker || "").replace("npc_", "");
  const text = L(node.text);
  playSfx(d.callout?.sound || "sfx_whistle");
  showBubble(speaker, text);
  setSubtitle(text, typeof window.tNpcName === "function" ? window.tNpcName(speaker) : speaker);
  if (d.id === "dlg_razor_initiation" && !story().flags.joined_gang) {
    setTimeout(() => openDialogueTree(d), 800);
  }
}

export function openDialogueTree(dlg) {
  activeDlg = dlg;
  const node = dlg.nodes?.[0];
  if (node) showDialogueNode(dlg, node);
}

function showDialogueNode(dlg, node) {
  const el = document.getElementById("storyDialog");
  if (!el) return;
  el.classList.add("active");
  const speaker = (node.speaker || "npc").replace("npc_", "");
  el.querySelector(".story-dialog-title").textContent =
    typeof window.tNpcName === "function" ? window.tNpcName(speaker) : speaker;
  const body = el.querySelector(".story-dialog-body");
  const text = L(node.text);
  setSubtitle(text);
  playSfx("sfx_chain");
  if (node.choices?.length) {
    body.innerHTML = node.choices
      .map(c => {
        const ok = checkRequires(c.requires);
        return `<button type="button" class="btn story-choice" data-next="${c.next}" ${ok ? "" : "disabled"}>
          <span class="choice-text">${escapeHtml(L(c.text))}</span>
          <small class="choice-hint">${escapeHtml(L(c.hint || {}))}</small>
        </button>`;
      })
      .join("");
    body.querySelectorAll(".story-choice").forEach(btn => {
      btn.onclick = () => {
        const c = node.choices.find(x => x.next === btn.dataset.next || x.id === btn.dataset.choice);
        applyEffects(c?.effects);
        if (c?.next === "END") closeDialogue();
        else {
          const n2 = dlg.nodes.find(n => n.id === c?.next);
          if (n2) showDialogueNode(dlg, n2);
          else closeDialogue();
        }
      };
    });
  } else {
    body.innerHTML = `<p class="story-line">${escapeHtml(text)}</p>
      <button type="button" class="btn" id="storyDlgNext">${L({ ru: "Дальше", en: "Next", da: "Næste" })}</button>`;
    applyEffects(node.effects);
    el.querySelector("#storyDlgNext").onclick = () => {
      if (node.next === "END") closeDialogue();
      else {
        const n2 = dlg.nodes.find(n => n.id === node.next);
        if (n2) showDialogueNode(dlg, n2);
        else closeDialogue();
      }
    };
  }
}

function closeDialogue() {
  if (activeDlg?.id === "dlg_plukh_enter" && story().flags.plukh_stays) fireStoryEvent("plukh_choice");
  if (activeDlg?.id === "dlg_plukh_enter" && story().flags.plukh_cemetery) fireStoryEvent("plukh_choice");
  activeDlg = null;
  document.getElementById("storyDialog")?.classList.remove("active");
  setSubtitle("");
  hideDirection();
}

export function tryStoryNpc(npcId) {
  if (Authority.tryAuthorityNpc(npcId)) return true;
  if (!STORY_NPC_IDS.has(npcId)) return false;
  const loc = me().location;
  const dlg = data.dialogues.find(d => {
    if (d.location !== loc) return false;
    return d.nodes?.some(n => (n.speaker || "").includes(npcId));
  });
  if (dlg) {
    openDialogueTree(dlg);
    return true;
  }
  if (npcId === "razor" && !story().flags.joined_gang && story().quest.activeId === "q_initiation_pay") {
    payInitiationFee();
    return true;
  }
  return false;
}

function payInitiationFee() {
  const p = me();
  const fee = data.balance?.initiationFee || 150;
  if (p.coins < fee) {
    beginEarnCoins(fee - p.coins, { returnBeacon: "npc_razor", returnLabel: "Razor" });
    return;
  }
  p.coins -= fee;
  fireStoryEvent("pay_initiation_fee");
  applyEffects([{ type: "flag", value: "joined_gang" }]);
  hooks.toast?.(L({ ru: "Взнос принят!", en: "Fee paid!", da: "Gebyr betalt!" }));
}

export function onLocationChange(loc) {
  const p = me();
  p._storyJustEntered = loc;
  setTimeout(() => {
    if (me()) me()._storyJustEntered = null;
  }, 1200);
  if (loc === "street") Authority.onEnterStreetForTeasing();
  tryCallouts();
  renderObjectivePanel();
  syncBeacon();
  updateConstructionHud();
  window.World3D?.refreshHangoutStage?.(ensureStoryState(p).hangoutStage);
}

export function tickStory(dt) {
  const p = me();
  if (!p?.onboarding?.done) return;
  const moved = Date.now() - lastMoveT < 1500;
  if (moved) {
    idleSec = 0;
    story().idleHintLevel = 0;
  } else {
    idleSec += dt;
    for (let i = IDLE_HINTS.length - 1; i >= 0; i--) {
      if (idleSec >= IDLE_HINTS[i]) {
        if (story().idleHintLevel < i + 1) {
          story().idleHintLevel = i + 1;
          renderObjectivePanel();
          if (i >= 2) syncBeacon();
        }
        break;
      }
    }
  }
  checkStepComplete();
  if (Math.random() < dt * 0.15) tryCallouts();
}

export function onPlayerMove() {
  lastMoveT = Date.now();
}

export function logEvent(type, detail) {
  console.info("[story]", type, detail || "");
}

export function initStoryEngine(h) {
  hooks = h || {};
  return loadStoryData()
    .then(() => {
      ensureStoryState(me());
      const bal = data.balance;
      if (bal?.startingCoins && !window.devCoinsEnabled?.()) {
        const p = me();
        if (p.coins > bal.startingCoins + 50) p.coins = bal.startingCoins;
      }
      renderObjectivePanel();
      window.StoryEngine = api;
      window.StoryEngine.openNoRatChoice = () => Authority.openNoRatChoice();
      window.StoryEngine.openTrialsChooserDialog = () => Authority.openTrialsChooserDialog();
      return true;
    })
    .catch(err => {
      console.error("StoryEngine load failed", err);
      return false;
    });
}

export function onOnboardingComplete() {
  Authority.startAuthorityPath(me());
  pickNextObjective();
  renderObjectivePanel();
  Authority.renderAuthorityHud();
}

const api = {
  initStoryEngine,
  loadStoryData,
  renderObjectivePanel,
  tickStory,
  onLocationChange,
  onPlayerMove,
  tryStoryNpc,
  fireStoryEvent,
  beginEarnCoins,
  tryStoryPurchase,
  buildHangoutStage,
  whereToGetMaterials,
  setBeacon,
  syncBeacon,
  resolveGuideTarget,
  startQuest,
  ensureStoryState,
  onOnboardingComplete,
  applyEffect,
  Authority,
  getJobs: () => data.jobs,
  getBalance: () => data.balance
};

export default api;
