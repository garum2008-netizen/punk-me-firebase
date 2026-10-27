/**
 * Data-driven story / quests (TZ §7–9). Bubbles + subtitles + SFX only (no synth TTS).
 */

import * as Authority from "./authority.mjs";
import { buildEarnState, resolveReturnBeacon, resolveReturnLabel } from "./earn-state.mjs";
import { ensureStoryProgressSave, grantRewardOnce } from "./story-save-schema.mjs";
import { recordChapterCheckpoint } from "./story-checkpoints.mjs";
import { applyAntibullyChoice, maybeStartAntibully } from "./antibully-quest.mjs";

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
  obj_shop: { loc: "room", ui: "shop" },
  obj_scrap_roof: { loc: "roof", wx: 5, wz: -4 },
  obj_parkour_finish: { loc: "parkour", wx: 0, wz: -8 },
  portal_roof: { loc: "elevator", portalTo: "roof" },
  portal_construction: { loc: "city", portalTo: "construction" },
  npc_mohawk_street: { loc: "street", npcId: "mohawk" },
  npc_cobalt_roof: { loc: "roof", npcId: "cobalt" },
  obj_roof_parkour: { loc: "roof", wx: 4, wz: -3 },
  npc_count: { loc: "castle", npcId: "count" },
  npc_rookie: { loc: "street", npcId: "rookie" },
  obj_castle_stage: { loc: "castle", wx: 4, wz: 2 }
};

const STORY_NPC_IDS = new Set([
  "razor", "tony", "bolt", "zoya", "plukh", "gravedigger", "foreman", "vintik", "count", "rookie"
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

export function syncUnifiedMaterials(p) {
  const inv = p?.inventory?.materials;
  if (!inv || typeof inv !== "object") return;
  const st = p.story || {};
  if (!st.materials) return;
  for (const [k, v] of Object.entries(inv)) {
    const n = Number(v) || 0;
    if (n <= 0) continue;
    st.materials[k] = (st.materials[k] || 0) + n;
    inv[k] = 0;
  }
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
  if (!p.story.flags) p.story.flags = {};
  if (!p.story.calloutAt) p.story.calloutAt = {};
  if (!p.story.choices) p.story.choices = {};
  if (!p.story.events) p.story.events = {};
  if (p.energy == null) p.energy = p.story.energy;
  if (p.mood == null) p.mood = p.story.mood;
  if (!p.story.quest || typeof p.story.quest !== "object") {
    p.story.quest = { activeId: null, step: 0, completed: {} };
  }
  const q = p.story.quest;
  if (q.activeId === undefined) q.activeId = null;
  if (q.step == null) q.step = 0;
  if (!q.completed || typeof q.completed !== "object" || Array.isArray(q.completed)) {
    q.completed = {};
  } else if (q.completed.__ === 1 && Object.keys(q.completed).length === 1) {
    q.completed = {};
  } else if (q.completed.__ != null) {
    delete q.completed.__;
  }
  if (!p.story.materials || typeof p.story.materials !== "object") {
    p.story.materials = { board: 0, brick: 0, nails: 0, chain: 0, spray: 0, neon_tube: 0, scrap: 0 };
  }
  if (!p.story.rewardsGranted || typeof p.story.rewardsGranted !== "object") {
    p.story.rewardsGranted = {};
  }
  syncUnifiedMaterials(p);
  if (!p.story.rel || typeof p.story.rel !== "object") p.story.rel = { gang_rust: 0, zombie: 0 };
  if (!p.story.auth || typeof p.story.auth !== "object") {
    p.story.auth = { stage: 1, s1Done: false, tasks: {}, trials: {}, ch2Done: false };
  } else {
    if (!p.story.auth.tasks) p.story.auth.tasks = {};
    if (!p.story.auth.trials) p.story.auth.trials = {};
  }
  if (p.story.hangoutStage == null) p.story.hangoutStage = 0;
  if (p.story.chapter == null) p.story.chapter = 1;
  if (p.story.authority == null) p.story.authority = 0;
  if (!p.story.gang_rank) p.story.gang_rank = "newbie";
  ensureStoryProgressSave(p);
  if (p.story.rewardsGiven && p.story.rewardsGranted) {
    Object.assign(p.story.rewardsGranted, p.story.rewardsGiven);
  }
  return p.story;
}

function speakerToNpcId(speaker) {
  if (!speaker) return null;
  const s = String(speaker).replace(/^npc_/, "");
  return s || null;
}

export function applyDialogueCamera(npcId) {
  if (!npcId || !window.World3D?.engageDialogueFraming) return;
  requestAnimationFrame(() => {
    window.World3D.engageDialogueFraming(npcId, { live: true });
  });
}

export function clearDialogueCamera() {
  window.World3D?.releaseCaptureFrame?.();
  document.getElementById("storyDialog")?.classList.remove("story-dialog-cinematic");
  talkingIdsClear();
}

function talkingIdsClear() {
  if (window.World3D?.setTalking) {
    ["razor", "mohawk", "gravedigger", "zoya", "plukh", "foreman", "tony", "bolt", "cobalt", "vintik"].forEach(id => {
      window.World3D.setTalking(id, false);
    });
  }
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

function speakStoryLine(speaker, text, lineId) {
  if (!text) return;
  const npcId = (speaker || "").replace(/^npc_/, "") || speaker;
  const cid = npcId.startsWith("npc_") ? npcId.replace("npc_", "") : npcId;
  if (window.SpeechBridge?.play) {
    window.SpeechBridge.play({
      lineId,
      text,
      characterId: cid,
      subtitle: speaker
        ? `${typeof window.tNpcName === "function" ? window.tNpcName(cid) : speaker}: ${text}`
        : text
    });
  } else if (window.Voice) {
    Voice.speakCharacter(cid, text);
  }
  if (window.World3D?.setTalking) World3D.setTalking(cid, true);
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
  if (cond.startsWith("auth:")) {
    const v = cond.split(":")[1];
    const auth = st.auth || {};
    if (v === "s1Done") return !!auth.s1Done;
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
  if (cond.startsWith("unique:")) return !!st.unique?.[cond.slice(7)];
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
      case "story_event":
        fireStoryEvent(e.name);
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
  const p = me();
  st.chapter = Math.max(st.chapter, 2);
  st.gang_rank = st.gang_rank === "newbie" ? "gang_member" : st.gang_rank;
  p.gang_rank = st.gang_rank;
  ["q_initiation_pay", "q_initiation_duel", "q_initiation_graffiti"].forEach(id => {
    st.quest.completed[id] = true;
  });
  if (["q_initiation_pay", "q_initiation_duel", "q_initiation_graffiti"].includes(st.quest.activeId)) {
    st.quest.activeId = null;
    st.quest.step = 0;
  }
  st.earn = null;
  if (!st.quest.completed.q_ch2_hangout && !st.quest.activeId) {
    startQuest("q_ch2_hangout");
  }
  hooks.toast?.(L({ ru: "Нашивка «Ржавые Цепи» получена!", en: "Rusty Chains patch earned!", da: "Rusty Chains-mærke!" }));
  window.StoryScenes?.playInitiationCeremony?.(p, hooks);
  renderObjectivePanel();
}

const INITIATION_QUESTS = new Set(["q_initiation_pay", "q_initiation_duel", "q_initiation_graffiti"]);

export function startQuest(qid) {
  const p = me();
  const st = ensureStoryState(p);
  const q = data.quests.find(x => x.id === qid);
  if (!q || st.quest.completed[qid]) return;
  if (INITIATION_QUESTS.has(qid)) {
    st.flags.initiation_locked = true;
    st.decisions.initiation_branch = qid;
  }
  if (q.type === "main" && q.chapter) {
    st.chapter = Math.max(st.chapter || 1, q.chapter);
    st.mainlineChapter = st.chapter;
  }
  if (q.type === "main" && q.chapter >= 3) {
    const prev = st.quest.activeId;
    if (prev && prev !== qid) {
      const prevQ = data.quests.find(x => x.id === prev);
      if (prevQ && prevQ.type !== "main") {
        st.quest.activeId = null;
        st.quest.step = 0;
      }
    }
  }
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

export function completeQuest(qid) {
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
  if (qid === "q_ch2_hangout" && !st.flags.hangout_open_scene_played) {
    st.flags.hangout_open_scene_played = true;
    window.StoryScenes?.playHangoutOpeningScene?.(p, hooks);
  }
  if (qid === "q_ch3_cemetery_night") {
    window.ChapterIntro?.showChapterWrap?.(3);
  }
  if (qid === "q_ch2_hangout" && !st.quest.completed.q_ch3_cemetery_night && !st.quest.activeId) {
    startQuest("q_ch3_cemetery_night");
  }
  pickNextObjective();
}

function pickNextObjective() {
  const p = me();
  const st = ensureStoryState(p);
  if (st.quest.activeId) return;
  if (!st.flags.joined_gang && p.onboarding?.done) {
    if (
      !st.quest.completed?.q_initiation_pay &&
      !st.quest.completed?.q_initiation_duel &&
      !st.quest.completed?.q_initiation_graffiti
    ) {
      return;
    }
  }
  if (st.unique?.bell_rim || st.chapter >= 3 || st.quest.completed?.q_ch3_cemetery_night) return;
  const loc = p.location;
  const candidate = data.quests.find(
    q => !st.quest.completed?.[q.id] && q.loc === loc && q.type !== "main" && !st.quest.activeId
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
  else if (co.startsWith("flag:")) done = !!st.flags[co.slice(5)];
  else if (co.startsWith("unique:")) done = !!st.unique?.[co.slice(7)];
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
  if (name === "duel_razor_win" && st.quest.activeId === "q_initiation_duel" && !st.flags.joined_gang) {
    applyEffects([{ type: "flag", value: "joined_gang" }]);
  }
  if (name === "hangout_complete") {
    if (!st.quest.completed.q_ch2_hangout && st.quest.activeId === "q_ch2_hangout") checkStepComplete();
    if (
      st.hangoutStage >= 4 &&
      !st.quest.completed.q_ch3_cemetery_night &&
      !st.quest.activeId
    ) {
      if (!st.quest.completed.q_ch2_hangout) st.quest.completed.q_ch2_hangout = true;
      startQuest("q_ch3_cemetery_night");
    }
  }
  if (name === "job_cemetery_done" && !st.unique.bell_rim && !st.events.ch3_bell_ready) {
    if (st.hangoutStage >= 4) {
      if (!st.quest.completed.q_ch3_cemetery_night && st.quest.activeId !== "q_ch3_cemetery_night") {
        startQuest("q_ch3_cemetery_night");
      }
      if (st.quest.activeId === "q_ch3_cemetery_night") {
        window.StoryScenes?.playCemeteryBellScene?.(me(), hooks);
        st.events.ch3_bell_ready = true;
        checkStepComplete();
      }
    }
  }
  if (name === "graph_confession_done") {
    st.chapter = 4;
    st.mainlineChapter = 4;
    completeQuest("q_ch4_castle");
    window.StoryScenes?.playFinaleBriefingBeforeChoice?.({ toast: hooks.toast, save: hooks.save });
  }
  if (name === "antibully_help") applyAntibullyChoice(true, hooks);
  if (name === "antibully_mock") applyAntibullyChoice(false, hooks);
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
  const need = Math.max(0, Number(shortfall) || 0);
  const returnBeacon = resolveReturnBeacon(context, st);
  const returnLabel = resolveReturnLabel(context, () => L(getActiveQuest()?.title));
  if ((p.energy ?? st.energy) < 10) {
    st.earn = buildEarnState({
      mode: "snack",
      needTotal: p.coins + need,
      shortfall: need,
      returnBeacon,
      returnLabel
    });
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
  const employer = job?.employer;
  const employerBeacon = employer
    ? (employer.startsWith("npc_") ? employer : "npc_" + employer)
    : "npc_tony";
  st.earn = buildEarnState({
    needTotal: p.coins + need,
    shortfall: need,
    jobId: job?.id || null,
    employerBeacon,
    returnBeacon,
    returnLabel
  });
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

export function getArcadeDailyCap() {
  return data.balance?.arcadeDailyCap ?? 100;
}

export function onEconomyChanged() {
  checkStepComplete();
  onEarnProgress();
  renderObjectivePanel();
}

export function storyQuestCompletedForSave(completed) {
  const c = { ...(completed || {}) };
  if (Object.keys(c).length === 0) c.__ = 1;
  return c;
}

export function tryBeaconInteract() {
  const p = me();
  const st = ensureStoryState(p);
  const id = st.beacon;
  if (p.location === "parkour" && (id === "obj_parkour_finish" || getActiveStep()?.beacon === "obj_parkour_finish")) {
    window.runParkour?.();
    return true;
  }
  if (p.location === "roof" && st.auth?.stage === 3 && !st.auth.trials?.roof_parkour && id === "obj_roof_parkour") {
    window.runParkour?.();
    return true;
  }
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
      if (q.id === "q_ch2_hangout" && st.hangoutStage < 4) {
        sub = hangoutObjectiveSub(st);
      }
      const hintLevel = st.idleHintLevel || 0;
      const yt = window.AudioManager?.getYoutubeNarratorMode?.() || false;
      const angelina = window.AngelinaGuide?.pickAngelinaHint?.(step, hintLevel, yt);
      if (angelina) sub = angelina;
      else if (hintLevel >= 3) {
        sub = (sub ? sub + " · " : "") + L({ ru: "Показать путь", en: "Show path", da: "Vis vej" });
      }
      window.AngelinaGuide?.refreshAngelinaContextBanner?.();
    } else if (st.hangoutStage < 4 && st.flags.joined_gang) {
      title = L(data.hangout?.title || {});
      const stage = data.hangout?.stages?.[st.hangoutStage];
      objective = stage ? L(stage.hint) : L({ ru: "Стройка: Тусовка", en: "Construction: hangout", da: "Byggeplads" });
      renderConstructionBar();
    } else if (st.flags.postgame || st.ending) {
      title = L({ ru: "Свободная игра", en: "Free play", da: "Fri leg" });
      objective = L({
        ru: "История Колокола завершена — исследуй Тыквоград",
        en: "The Bell story is complete — explore Pumpkin City",
        da: "Historien er færdig — udforsk byen"
      });
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
  const builtStage = st.hangoutStage + 1;
  st.hangoutStage = builtStage;
  st.events[`hangout_stage_${builtStage}`] = true;
  window.World3D?.refreshHangoutStage?.(st.hangoutStage);
  hooks.toast?.(L({ ru: "Этап построен!", en: "Stage built!", da: "Etape bygget!" }));
  fireStoryEvent(`hangout_stage_${builtStage}`);
  if (st.hangoutStage >= 4) fireStoryEvent("hangout_complete");
  checkStepComplete();
  renderObjectivePanel();
  hooks.save?.();
}

const STORY_MAT_SHOP = ["brick", "board", "nails", "chain", "spray", "neon_tube"];

export function purchaseStoryMaterial(materialId, qty = 1) {
  const p = me();
  const st = ensureStoryState(p);
  const prices = data.balance?.materialPrices || {};
  const unit = prices[materialId];
  if (unit == null) return false;
  const cost = unit * qty;
  if (!tryStoryPurchase(cost, { returnBeacon: "npc_bolt", returnLabel: L({ ru: "Дядя Болт", en: "Uncle Bolt", da: "Onkel Bolt" }) })) {
    return false;
  }
  if (!window.isOwner) p.coins -= cost;
  st.materials[materialId] = (st.materials[materialId] || 0) + qty;
  hooks.toast?.(
    L({
      ru: `Куплено: ${materialId} ×${qty} (−${cost} монет)`,
      en: `Bought: ${materialId} ×${qty} (−${cost} coins)`,
      da: `Købt: ${materialId} ×${qty} (−${cost} mønter)`
    })
  );
  onEconomyChanged();
  hooks.save?.();
  return true;
}

export function openBoltMaterialShop() {
  const dlg = document.getElementById("storyDialog");
  if (!dlg) return;
  const st = ensureStoryState(me());
  const prices = data.balance?.materialPrices || {};
  dlg.classList.add("active");
  dlg.querySelector(".story-dialog-title").textContent = L({
    ru: "Скобяная лавка — Дядя Болт",
    en: "Hardware stall — Uncle Bolt",
    da: "Hardwarebod — Onkel Bolt"
  });
  const body = dlg.querySelector(".story-dialog-body");
  const stage = data.hangout?.stages?.[st.hangoutStage];
  const need = stage?.need || {};
  body.innerHTML =
    `<p class="story-line">${escapeHtml(L(stage?.hint || { ru: "Материалы для Тусовки", en: "Hangout materials", da: "Hæng-materialer" }))}</p>` +
    STORY_MAT_SHOP.map(id => {
      const have = st.materials[id] || 0;
      const needN = need[id] || 0;
      const price = prices[id] ?? "?";
      return `<button type="button" class="btn story-choice" data-mat="${id}">
        <span class="choice-text">${escapeHtml(id)} — ${price} 🪙</span>
        <small class="choice-hint">${escapeHtml(L({ ru: `Есть: ${have}${needN ? ` / нужно ${needN}` : ""}`, en: `Have: ${have}${needN ? ` / need ${needN}` : ""}`, da: `Har: ${have}` }))}</small>
      </button>`;
    }).join("");
  body.querySelectorAll("[data-mat]").forEach(btn => {
    btn.onclick = () => {
      purchaseStoryMaterial(btn.dataset.mat, 1);
      openBoltMaterialShop();
    };
  });
  applyDialogueCamera("bolt");
}

function hangoutObjectiveSub(st) {
  const stage = data.hangout?.stages?.[st.hangoutStage];
  if (!stage) return "";
  const need = stage.need || {};
  const parts = Object.entries(need).map(([k, n]) => `${k} ${st.materials[k] || 0}/${n}`);
  return L(stage.name) + ` (${st.hangoutStage + 1}/4) · ` + parts.join(", ");
}

export function getHangoutStageNeed(stageIndex) {
  const stage = data.hangout?.stages?.[stageIndex];
  return stage?.need ? { ...stage.need } : {};
}

export function whereToGetMaterials() {
  const st = ensureStoryState(me());
  const stage = data.hangout?.stages?.[st.hangoutStage];
  if (stage?.beacon) setBeacon(stage.beacon);
  syncBeacon();
  const missing = [];
  const need = stage?.need || {};
  for (const [k, n] of Object.entries(need)) {
    const short = n - (st.materials[k] || 0);
    if (short > 0) missing.push(`${k} ×${short}`);
  }
  if (missing.length) {
    hooks.toast?.(
      L({
        ru: `Не хватает: ${missing.join(", ")}. Город — Дядя Болт (Скобяная лавка) или смена «Подсобник» на Стройке`,
        en: `Short: ${missing.join(", ")}. City — Uncle Bolt (hardware stall) or Site helper shift`,
        da: `Mangler: ${missing.join(", ")}. By — Onkel Bolt eller byggehjælper`
      })
    );
  } else hooks.toast?.(L(stage?.hint || {}));
  if (me().location !== "city") setBeacon("npc_bolt");
  else openBoltMaterialShop();
}

function tryCallouts() {
  const p = me();
  if (!p) return;
  const loc = p.location;
  const now = Date.now();
  const st = ensureStoryState(p);
  if (!st.calloutAt) st.calloutAt = {};
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
  speakStoryLine(speaker, text, `dlg_${d.id}_${node.id}`);
  const ind = document.getElementById("storyDirection");
  if (ind) {
    ind.textContent = d.callout?.icon || "!";
    ind.classList.add("visible");
  }
  const stFlags = ensureStoryState(me()).flags;
  if (d.id === "dlg_razor_initiation" && !stFlags.joined_gang) {
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
  applyDialogueCamera(speakerToNpcId(node.speaker) || speaker);
  const st = ensureStoryState(me());
  const metKey = `met_${speaker}`;
  if (!st.flags[metKey] && speaker && speaker !== "player") {
    st.flags[metKey] = true;
    const introKey = `npc_intro_${speaker}`;
    const introLine = typeof window.t === "function" ? window.t(introKey) : "";
    if (introLine && introLine !== introKey) hooks.toast?.(introLine);
  }
  el.querySelector(".story-dialog-title").textContent =
    typeof window.tNpcName === "function" ? window.tNpcName(speaker) : speaker;
  const body = el.querySelector(".story-dialog-body");
  const text = L(node.text);
  setSubtitle(text);
  speakStoryLine(speaker, text, `dlg_${dlg.id}_${node.id}`);
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
  clearDialogueCamera();
  setSubtitle("");
  window.AudioManager?.stopSpeech?.();
  hideDirection();
}

export function dismissAllStoryUi() {
  closeDialogue();
  clearDialogueCamera();
  document.getElementById("storyDialog")?.classList.remove("active");
  const body = document.getElementById("storyDialog")?.querySelector(".story-dialog-body");
  if (body && !activeDlg) body.innerHTML = "";
  document.getElementById("storyBubbles")?.replaceChildren?.();
  document.getElementById("storyDirection")?.classList.remove("visible");
  const sub = document.getElementById("voiceSubtitle");
  if (sub) sub.textContent = "";
  window.AudioManager?.stopSpeech?.();
}

export function canOpenStoryModal() {
  if (activeDlg) return false;
  if (document.getElementById("storyDialog")?.classList.contains("active")) return false;
  if (document.getElementById("howToOverlay")?.classList.contains("active")) return false;
  if (document.querySelector(".modal.active")) return false;
  if (window.World3D?.isGameplayActivityActive?.()) return false;
  return true;
}

export function showNpcProximityCallout(npcId, text) {
  if (!canOpenStoryModal()) return;
  showBubble(npcId, text);
  setSubtitle(text, typeof window.tNpcName === "function" ? window.tNpcName(npcId) : npcId);
  speakStoryLine(npcId, text);
}

function showRankNpcChatter(npcId) {
  const lines = Authority.getNpcLinesForRank(npcId, me());
  if (!lines?.length) return false;
  const line = lines[Math.floor(Math.random() * lines.length)];
  const dlg = document.getElementById("storyDialog");
  if (!dlg) return false;
  dlg.classList.add("active");
  dlg.querySelector(".story-dialog-title").textContent =
    typeof window.tNpcName === "function" ? window.tNpcName(npcId) : npcId;
  dlg.querySelector(".story-dialog-body").innerHTML =
    `<p class="story-line">${escapeHtml(line)}</p>
     <button type="button" class="btn" id="storyRankDlgClose">${L({ ru: "Ок", en: "OK", da: "OK" })}</button>`;
  dlg.querySelector("#storyRankDlgClose").onclick = () => dlg.classList.remove("active");
  return true;
}

export function tryStoryNpc(npcId) {
  if (Authority.tryAuthorityNpc(npcId)) return true;
  const st = story();
  const loc = me().location;
  if (npcId === "bolt" && st.flags.joined_gang) {
    openBoltMaterialShop();
    return true;
  }
  if (npcId === "foreman" && st.flags.joined_gang) {
    startQuest("q_construction_sign");
    hooks.toast?.(L({ ru: "Список прораба: собери кирпичи для вывески", en: "Foreman's list: gather bricks for the sign", da: "Formandens liste" }));
    return true;
  }
  if (npcId === "razor" && st.flags.joined_gang) {
    return showRankNpcChatter("razor");
  }
  if (npcId === "rookie" && st.quest.activeId === "q_ch2_antibully" && !st.flags.ch2_antibully_resolved) {
    return openDialogueById("dlg_antibully_rookie");
  }
  if (npcId === "count" && loc === "castle") {
    return window.CastleGameplay?.tryCastleInteract?.(hooks) || openDialogueById("dlg_count_confession");
  }
  if (!STORY_NPC_IDS.has(npcId)) return false;
  const dlg = data.dialogues.find(d => {
    if (d.location !== loc) return false;
    if (st.flags.joined_gang && d.id === "dlg_razor_initiation") return false;
    const tr = d.trigger || {};
    if (tr.flag && !evalCondition(`flag:${tr.flag}`)) return false;
    if (!checkRequires(tr.conditions)) return false;
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
  onEconomyChanged();
  hooks.save?.();
}

export function openDialogueById(dlgId) {
  const d = data.dialogues.find(x => x.id === dlgId);
  if (!d) return false;
  openDialogueTree(d);
  return true;
}

export function onLocationChange(loc) {
  dismissAllStoryUi();
  const p = me();
  const st = ensureStoryState(p);
  if (loc === "street") maybeStartAntibully();
  if (
    loc === "cemetery" &&
    st.hangoutStage >= 4 &&
    !st.unique.bell_rim &&
    !st.quest.completed.q_ch3_cemetery_night &&
    !st.quest.activeId
  ) {
    startQuest("q_ch3_cemetery_night");
  }
  if (loc === "cemetery" && st.quest.completed.q_ch3_cemetery_night && !st.unique.bell_rim) {
    window.StoryScenes?.playCemeteryBellScene?.(p, hooks);
    st.events.ch3_bell_ready = true;
  }
  window.CastleGameplay?.tryTongueQuest?.(hooks);
  if (
    loc === "castle" &&
    st.unique?.bell_rim &&
    !st.flags.castle_enter_hint
  ) {
    st.flags.castle_enter_hint = true;
    hooks.toast?.(
      L({
        ru: "Замок: зажги свечи у органа (ноты C E G C E), подготовь концерт на сцене, затем поговори с Графом.",
        en: "Castle: light organ candles (C E G C E), prep the concert stage, then speak to the Count.",
        da: "Slot: tænd orgellys, forbered koncerten, tal med greven."
      })
    );
  }
  p._storyJustEntered = loc;
  setTimeout(() => {
    if (me()) me()._storyJustEntered = null;
  }, 1200);
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
  Authority.tryStage1ProximityCallout?.();
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
      window.StoryEngine.openNoRatChoice = () => Authority.openNoRatChoice?.();
      window.StoryEngine.openTrialsChooserDialog = () => Authority.openTrialsChooserDialog?.();
      return true;
    })
    .catch(err => {
      console.error("StoryEngine load failed", err);
      return false;
    });
}

export function onOnboardingComplete() {
  const p = me();
  const st = ensureStoryState(p);
  grantRewardOnce(p, "reward_ch0_complete", () => {
    st.quest.completed.q_ch0_newbie = true;
    st.mainlineChapter = 1;
    st.chapter = Math.max(st.chapter || 0, 1);
    st.flags.ch0_razor_talk = true;
  });
  st.quest.activeId = null;
  Authority.startAuthorityPath(p);
  pickNextObjective();
  renderObjectivePanel();
  Authority.renderAuthorityHud();
  window.AngelinaGuide?.refreshAngelinaContextBanner?.();
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
  updateConstructionHud,
  whereToGetMaterials,
  purchaseStoryMaterial,
  openBoltMaterialShop,
  tryBeaconInteract,
  getArcadeDailyCap,
  onEconomyChanged,
  storyQuestCompletedForSave,
  setBeacon,
  syncBeacon,
  resolveGuideTarget,
  startQuest,
  completeQuest,
  ensureStoryState,
  syncUnifiedMaterials,
  onOnboardingComplete,
  recordChapterCheckpoint,
  openDialogueById,
  dismissAllStoryUi,
  applyDialogueCamera,
  clearDialogueCamera,
  canOpenStoryModal,
  showNpcProximityCallout,
  applyEffect,
  Authority,
  getJobs: () => data.jobs,
  getBalance: () => data.balance,
  getHangoutStageNeed,
  getActiveStep
};

export default api;
