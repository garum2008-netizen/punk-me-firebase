/**
 * Chapter 1 life vertical slice — isolated save namespace `me.lifeCh1`.
 * Starts after onboarding.done (D3-C). Does not mutate legacy story quest ids.
 * Angelina skin switcher (t569u): `lifeCh1.angelinaSkin` A|B|C + manifest paths.
 */

import {
  loadAngelinaSkinManifest,
  portraitUrl,
  worldUrl,
  readSelectedSkin,
  writeSelectedSkin,
  getSkinEntry,
  normalizeSkinId
} from "./angelina-skin-manifest.mjs";

const DATA_URL = "data/story/life-ch1-slice.json";
const LOCAL_KEY_PREFIX = "punkme_lifeCh1_v1_";

let spec = null;
let skinManifest = null;
let hooks = {};
let activeDlg = null;
let wardrobePending = { skin: "A", outfitFlag: null };

function lang() {
  return typeof window.getLanguage === "function" ? window.getLanguage() : "ru";
}

function L(obj) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[lang()] || obj.ru || obj.en || "";
}

function me() {
  return window.me;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function defaultLifeCh1State() {
  return {
    v: 1,
    active: false,
    stepIndex: 0,
    flags: {},
    claimedSteps: {},
    angelinaSkin: "A",
    completed: false,
    startedAt: 0
  };
}

/** Internal QA only — slice OFF by default on main (never auto-start for live players). */
export function isLifeCh1SliceEnabled() {
  try {
    if (typeof window !== "undefined" && window.__PUNK_PREVIEW__ === true) return true;
    const q = new URLSearchParams(location.search);
    if (q.get("lifeCh1Slice") === "1") return true;
    if (q.get("lifeCh1E2e") === "1") return true;
  } catch (_) {}
  return false;
}

export function isLifeCh1TestMode() {
  try {
    const q = new URLSearchParams(location.search);
    if (q.get("lifeCh1E2e") === "1") return true;
    if (q.get("firebaseEmulator") === "1") return true;
  } catch (_) {}
  return false;
}

/** Additive only — never deletes or rewrites `me.story`. */
export function ensureLifeCh1(player) {
  const p = player || me();
  if (!p) return null;
  if (p.lifeCh1 == null) {
    if (!isLifeCh1SliceEnabled()) return null;
    p.lifeCh1 = { ...defaultLifeCh1State() };
  }
  if (typeof p.lifeCh1 !== "object") {
    if (!isLifeCh1SliceEnabled()) {
      p.lifeCh1 = null;
      return null;
    }
    p.lifeCh1 = { ...defaultLifeCh1State() };
  }
  if (p.lifeCh1.v !== 1) {
    const d = defaultLifeCh1State();
    p.lifeCh1 = {
      ...p.lifeCh1,
      v: 1,
      flags: p.lifeCh1.flags && typeof p.lifeCh1.flags === "object" ? p.lifeCh1.flags : {},
      claimedSteps:
        p.lifeCh1.claimedSteps && typeof p.lifeCh1.claimedSteps === "object" ? p.lifeCh1.claimedSteps : {},
      angelinaSkin: normalizeSkinId(p.lifeCh1.angelinaSkin)
    };
  }
  const st = p.lifeCh1;
  if (typeof st.active !== "boolean") st.active = !!st.active;
  if (typeof st.completed !== "boolean") st.completed = !!st.completed;
  if (typeof st.stepIndex !== "number" || !Number.isFinite(st.stepIndex)) st.stepIndex = 0;
  st.stepIndex = Math.max(0, Math.min(32, Math.floor(st.stepIndex)));
  if (typeof st.startedAt !== "number") st.startedAt = st.startedAt ? Number(st.startedAt) || 0 : 0;
  if (st.flags == null || typeof st.flags !== "object" || Array.isArray(st.flags)) st.flags = {};
  if (st.claimedSteps == null || typeof st.claimedSteps !== "object" || Array.isArray(st.claimedSteps)) {
    st.claimedSteps = {};
  }
  st.angelinaSkin = normalizeSkinId(st.angelinaSkin || "A");
  return st;
}

export function getAngelinaSkin() {
  return readSelectedSkin(ensureLifeCh1());
}

export function setAngelinaSkin(skinId) {
  const id = writeSelectedSkin(ensureLifeCh1(), skinId);
  persistLocalOverlay();
  hooks.save?.();
  syncPlayerLifeCh1Skin();
  return id;
}

function dialogPortraitHtml(skinId) {
  const url = portraitUrl(skinId, skinManifest);
  const entry = getSkinEntry(skinId, skinManifest);
  const label = L(entry?.title || { en: `Skin ${skinId}` });
  return `<img id="lifeCh1DialogPortrait" class="life-ch1-dialog-portrait" src="${escapeHtml(url)}" alt="${escapeHtml(label)}" width="96" height="144" data-skin="${escapeHtml(skinId)}">`;
}

export function syncPlayerLifeCh1Skin() {
  previewPlayerLifeCh1Skin(readSelectedSkin(ensureLifeCh1()));
}

function previewPlayerLifeCh1Skin(skinId) {
  const st = ensureLifeCh1();
  if (!st) {
    window.World3D?.setPlayerLifeCh1Skin?.({ visible: false });
    return;
  }
  const skin = normalizeSkinId(skinId);
  const url = worldUrl(skin, skinManifest);
  window.World3D?.clearAngelinaLifeBillboard?.();
  const show =
    (isActive() && !st.completed) ||
    st.completed ||
    (st.stepIndex || 0) >= 2 ||
    Object.keys(st.flags || {}).some(k => k.startsWith("outfit_"));
  if (!show) {
    window.World3D?.setPlayerLifeCh1Skin?.({ visible: false });
    return;
  }
  if (me()?.location !== "room") {
    window.World3D?.setPlayerLifeCh1Skin?.({ visible: false });
    return;
  }
  window.World3D?.setPlayerLifeCh1Skin?.({ visible: true, url });
}

function useLocalOverlay() {
  if (typeof window !== "undefined" && window.__PUNK_PREVIEW__ === true) return true;
  if (!isLifeCh1TestMode()) return false;
  try {
    return new URLSearchParams(location.search).get("lifeCh1Local") === "1";
  } catch {
    return false;
  }
}

function localKey() {
  if (typeof window !== "undefined" && window.__PUNK_PREVIEW__ === true) {
    const id = window.PunkPreviewSave?.getDeviceId?.() || "preview";
    return "punkme_preview_lifeCh1_v1_" + id;
  }
  const uid = window.uid || window.firebase?.auth?.()?.currentUser?.uid || "anon";
  return LOCAL_KEY_PREFIX + uid;
}

export function persistLocalOverlay() {
  if (!useLocalOverlay()) return;
  const st = ensureLifeCh1();
  if (!st) return;
  try {
    localStorage.setItem(localKey(), JSON.stringify(st));
  } catch (_) {}
}

export function restoreLocalOverlay() {
  if (!useLocalOverlay()) return;
  try {
    const raw = localStorage.getItem(localKey());
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.v === 1) me().lifeCh1 = parsed;
  } catch (_) {}
}

async function loadSpec() {
  if (spec) return spec;
  const r = await fetch(DATA_URL, { cache: "no-store" });
  spec = await r.json();
  return spec;
}

function currentStep() {
  const st = ensureLifeCh1();
  if (!st?.active || st.completed) return null;
  const steps = spec?.steps || [];
  return steps[st.stepIndex] || null;
}

function playerWorldPos() {
  const w3 = window.World3D;
  if (w3?.getPlayerWorldPosition) return w3.getPlayerWorldPosition();
  const p = me();
  return { x: (p.x - 50) * 0.12, z: (p.y - 50) * 0.12, loc: p.location };
}

function distWorld(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

function syncBeacon() {
  const step = currentStep();
  if (!step?.beacon) return;
  const b = step.beacon;
  window.World3D?.setGuideTarget?.({
    loc: b.loc,
    wx: b.wx,
    wz: b.wz,
    npcId: b.npcId
  });
}

function setSubtitle(text, ms = 4500) {
  const el = document.getElementById("voiceSubtitle");
  if (!el) return;
  el.textContent = text || "";
  el.classList.toggle("visible", !!text);
  if (ms > 0 && text) {
    clearTimeout(setSubtitle._t);
    setSubtitle._t = setTimeout(() => {
      el.classList.remove("visible");
    }, ms);
  }
}

function playUiBlip() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 520;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.14);
  } catch (_) {}
}

function grantCoins(n) {
  if (!n || window.isOwner) return;
  me().coins += n;
  if (typeof document !== "undefined") {
    const el = document.getElementById("coins");
    if (el && window.formatCoinsDisplay) el.textContent = window.formatCoinsDisplay();
  }
  hooks.toast?.(`+${n} ${L({ ru: "монет", en: "coins", da: "mønter" })}`);
}

export function claimStepReward(st, stepIndex, amount) {
  if (!amount || !st) return 0;
  const key = String(stepIndex);
  if (st.claimedSteps[key]) return 0;
  st.claimedSteps[key] = true;
  grantCoins(amount);
  return amount;
}

function trustChoiceReflectBonus(st) {
  if (st.flags.mystery_trust_angelina) return 20;
  if (st.flags.mystery_secret) return 15;
  if (st.flags.mystery_open) return 8;
  return 0;
}

function advanceStep(extraReward = 0) {
  const st = ensureLifeCh1();
  const step = currentStep();
  const idx = st.stepIndex;
  if (step?.rewardCoins) claimStepReward(st, idx, step.rewardCoins);
  if (step?.id === "reflect") {
    claimStepReward(st, `${idx}_trust_bonus`, trustChoiceReflectBonus(st));
  }
  if (extraReward) claimStepReward(st, `${idx}_extra`, extraReward);
  st.stepIndex += 1;
  const steps = spec?.steps || [];
  if (st.stepIndex >= steps.length) {
    st.completed = true;
    st.active = false;
    document.body.classList.remove("life-ch1-active");
    hooks.toast?.(
      L({
        ru: "Глава жизни 1 — фрагмент завершён!",
        en: "Life chapter 1 slice complete!",
        da: "Liv kapitel 1 færdig!"
      })
    );
  }
  persistLocalOverlay();
  hooks.save?.();
  renderObjectivePanel();
  syncBeacon();
  updateChatPresetMode();
  applyMusicSceneClass();
  syncPlayerLifeCh1Skin();
}

export function lifeCh1PayloadForSave(player) {
  const p = player || me();
  if (!p?.lifeCh1 || typeof p.lifeCh1 !== "object") return undefined;
  if (!isLifeCh1SliceEnabled()) {
    const st = p.lifeCh1;
    const hasProgress =
      st.completed ||
      st.active ||
      (st.stepIndex || 0) > 0 ||
      (st.flags && Object.keys(st.flags).length > 0) ||
      (st.claimedSteps && Object.keys(st.claimedSteps).length > 0);
    if (!hasProgress) return undefined;
  }
  return ensureLifeCh1(p);
}

export function isActive() {
  if (!isLifeCh1SliceEnabled()) return false;
  const st = ensureLifeCh1(me());
  return !!(st?.active && !st.completed);
}

export function isCompleted() {
  if (!isLifeCh1SliceEnabled()) return false;
  return !!ensureLifeCh1(me())?.completed;
}

export async function tryStartAfterOnboarding() {
  if (!isLifeCh1SliceEnabled()) return false;
  await loadSpec();
  const p = me();
  if (!p?.onboarding?.done) return false;
  const st = ensureLifeCh1(p);
  if (st.completed) return false;
  if (st.active) return true;
  st.active = true;
  st.startedAt = Date.now();
  st.stepIndex = 0;
  document.body.classList.add("life-ch1-active");
  persistLocalOverlay();
  hooks.save?.();
  setSubtitle(
    L({
      ru: "Новенькая история: начни с движения по комнате.",
      en: "New life story: start by walking in your room.",
      da: "Nyt liv: gå rundt i værelset."
    })
  );
  renderObjectivePanel();
  syncBeacon();
  updateChatPresetMode();
  applyMusicSceneClass();
  syncPlayerLifeCh1Skin();
  return true;
}

export function onBoot() {
  restoreLocalOverlay();
  loadSpec().then(() => {
    if (!isLifeCh1SliceEnabled()) return;
    if (me()?.onboarding?.done && ensureLifeCh1()?.active) {
      syncBeacon();
      renderObjectivePanel();
      updateChatPresetMode();
      applyMusicSceneClass();
      syncPlayerLifeCh1Skin();
    } else if (me()?.onboarding?.done && !isCompleted()) {
      tryStartAfterOnboarding();
    } else if (me()?.onboarding?.done) {
      syncPlayerLifeCh1Skin();
    }
  });
  if (typeof window !== "undefined") {
    window.addEventListener("scene3d-ready", () => syncPlayerLifeCh1Skin(), { passive: true });
  }
}

export function onMove() {
  if (!isActive()) return;
  const step = currentStep();
  if (!step || step.id !== "move") return;
  const p = me();
  if (p.location !== "room") return;
  advanceStep();
  setSubtitle(
    L({
      ru: "Отлично. Теперь зеркало — выбери образ.",
      en: "Great. Now the mirror — pick your look.",
      da: "Godt. Nu spejlet."
    })
  );
}

function nearInteract(target) {
  if (!target) return false;
  const p = me();
  if (p.location !== target.loc) return false;
  const pos = playerWorldPos();
  return distWorld(pos.x, pos.z, target.wx, target.wz) <= (target.radius || 2);
}

export function pickReflectNode(dlg, flags) {
  const stFlags = flags || ensureLifeCh1()?.flags || {};
  const nodes = dlg.nodes;
  if (stFlags.mystery_secret && nodes.n_secret) return nodes.n_secret;
  if (stFlags.mystery_open && nodes.n_open) return nodes.n_open;
  if (stFlags.mystery_trust_angelina && nodes.n_trust) return nodes.n_trust;
  return nodes.n_fallback;
}

function pickTrustNode(dlg) {
  const st = ensureLifeCh1();
  const nodes = dlg.nodes;
  if (st.flags.outfit_bold && nodes.n_after_bold) return nodes.n_after_bold;
  if (st.flags.outfit_bright && nodes.n_after_bright) return nodes.n_after_bright;
  if (st.flags.outfit_calm && nodes.n_after_calm) return nodes.n_after_calm;
  return nodes.n0;
}

function openWardrobePanel() {
  const panel = document.getElementById("lifeCh1Wardrobe");
  if (!panel || !skinManifest) return;
  const st = ensureLifeCh1();
  wardrobePending.skin = readSelectedSkin(st);
  wardrobePending.outfitFlag = null;
  panel.hidden = false;
  document.getElementById("lifeCh1WardrobeTitle").textContent = L({
    ru: "Твой образ — A / B / C",
    en: "Your look — A / B / C",
    da: "Dit look — A / B / C"
  });
  document.getElementById("lifeCh1WardrobeHint").textContent = L({
    ru: "Выбери вид героя (Owner PNG) — в мире меняется твой персонаж.",
    en: "Pick your hero look (Owner PNG) — your character updates in the world.",
    da: "Vælg dit helte-look."
  });
  document.getElementById("lifeCh1OutfitLabel").textContent = L({
    ru: "Стиль на сегодня:",
    en: "Today's style:",
    da: "Stil:"
  });
  const grid = document.getElementById("lifeCh1SkinGrid");
  grid.innerHTML = ["A", "B", "C"]
    .map(id => {
      const e = getSkinEntry(id, skinManifest);
      const url = portraitUrl(id, skinManifest);
      const sel = wardrobePending.skin === id ? " selected" : "";
      return `<button type="button" class="life-ch1-skin-tile${sel}" data-skin="${id}" data-testid="life-ch1-skin-${id}">
        <img src="${escapeHtml(url)}" alt="${escapeHtml(L(e.title))}" width="72" height="108" loading="eager" decoding="async">
        <span>${escapeHtml(id)}</span></button>`;
    })
    .join("");
  grid.querySelectorAll(".life-ch1-skin-tile").forEach(btn => {
    btn.onclick = () => {
      wardrobePending.skin = btn.dataset.skin;
      grid.querySelectorAll(".life-ch1-skin-tile").forEach(b => b.classList.toggle("selected", b === btn));
      previewPlayerLifeCh1Skin(wardrobePending.skin);
      updateWardrobeConfirmState();
    };
  });
  const outfitRow = document.getElementById("lifeCh1OutfitRow");
  const dlg = spec?.dialogues?.dlg_life_ch1_outfit?.nodes?.n0;
  outfitRow.innerHTML = (dlg?.choices || [])
    .map(
      (c, i) =>
        `<button type="button" class="btn secondary life-ch1-outfit-pick" data-flag="${escapeHtml(c.flag)}" data-i="${i}">${escapeHtml(L(c.text))}</button>`
    )
    .join("");
  outfitRow.querySelectorAll(".life-ch1-outfit-pick").forEach(btn => {
    btn.onclick = () => {
      wardrobePending.outfitFlag = btn.dataset.flag;
      outfitRow.querySelectorAll(".life-ch1-outfit-pick").forEach(b => b.classList.toggle("selected", b === btn));
      updateWardrobeConfirmState();
    };
  });
  const confirm = document.getElementById("lifeCh1WardrobeConfirm");
  confirm.textContent = L({ ru: "Сохранить и продолжить", en: "Save and continue", da: "Gem" });
  confirm.onclick = () => {
    if (!wardrobePending.outfitFlag) return;
    setAngelinaSkin(wardrobePending.skin);
    ensureLifeCh1().flags[wardrobePending.outfitFlag] = true;
    closeWardrobePanel();
    advanceStep();
  };
  document.getElementById("lifeCh1WardrobeClose").textContent = L({ ru: "Закрыть", en: "Close", da: "Luk" });
  document.getElementById("lifeCh1WardrobeClose").onclick = () => closeWardrobePanel();
  updateWardrobeConfirmState();
  syncPlayerLifeCh1Skin();
}

function updateWardrobeConfirmState() {
  const confirm = document.getElementById("lifeCh1WardrobeConfirm");
  if (confirm) confirm.disabled = !wardrobePending.outfitFlag;
}

export function closeWardrobePanel() {
  const panel = document.getElementById("lifeCh1Wardrobe");
  if (panel) panel.hidden = true;
}

function showDialogue(dlgId) {
  const dlgRoot = spec?.dialogues?.[dlgId];
  if (!dlgRoot) return;
  let node;
  if (dlgId === "dlg_life_ch1_reflect") node = pickReflectNode(dlgRoot, ensureLifeCh1().flags);
  else if (dlgId === "dlg_life_ch1_trust") node = pickTrustNode(dlgRoot);
  else node = dlgRoot.nodes?.n0;
  if (!node) return;

  activeDlg = { dlgId, node };
  const panel = document.getElementById("storyDialog");
  const title = panel?.querySelector(".story-dialog-title");
  const body = panel?.querySelector(".story-dialog-body");
  if (!panel || !body) return;
  window.StoryEngine?.dismissAllStoryUi?.();
  panel.classList.add("active", "life-ch1-dialog");
  if (title) {
    title.textContent = L({
      ru: "Ангелина",
      en: "Angelina",
      da: "Angelina"
    });
  }
  const speakerLine = L(node.text);
  setSubtitle(speakerLine, 8000);
  playUiBlip();
  const skin = readSelectedSkin(ensureLifeCh1());
  const portrait = node.speaker === "angelina" ? dialogPortraitHtml(skin) : "";

  if (node.choices?.length) {
    body.innerHTML =
      `<div class="life-ch1-dialog-row">${portrait}<div class="life-ch1-dialog-text"><p>${escapeHtml(speakerLine)}</p></div></div>` +
      node.choices
        .map(
          (c, i) =>
            `<button type="button" class="btn life-ch1-choice" data-idx="${i}" style="display:block;margin:8px 0;width:100%">${escapeHtml(L(c.text))}</button>`
        )
        .join("");
    body.querySelectorAll(".life-ch1-choice").forEach(btn => {
      btn.onclick = () => {
        const ch = node.choices[+btn.dataset.idx];
        if (ch?.flag) ensureLifeCh1().flags[ch.flag] = true;
        closeDialogue();
        advanceStep();
      };
    });
  } else {
    body.innerHTML = `<div class="life-ch1-dialog-row">${portrait}<div class="life-ch1-dialog-text"><p>${escapeHtml(speakerLine)}</p></div></div><button type="button" class="btn" id="lifeCh1DlgOk">OK</button>`;
    body.querySelector("#lifeCh1DlgOk").onclick = () => {
      closeDialogue();
      advanceStep();
    };
  }
}

export function closeDialogue() {
  activeDlg = null;
  const panel = document.getElementById("storyDialog");
  panel?.classList.remove("active", "life-ch1-dialog");
}

function outfitInteractTarget() {
  const steps = spec?.steps || [];
  const outfit = steps.find(s => s.id === "outfit");
  return outfit?.interact || { loc: "room", wx: -3.2, wz: 2.5, radius: 2.8 };
}

export function canReopenWardrobe() {
  if (!isLifeCh1SliceEnabled()) return false;
  const st = me()?.lifeCh1;
  if (!st || typeof st !== "object") return false;
  return st.completed || st.active || (st.stepIndex || 0) >= 1 || Object.keys(st.flags || {}).length > 0;
}

export function tryInteract() {
  if (activeDlg) return false;
  if (canReopenWardrobe() && me()?.location === "room" && nearInteract(outfitInteractTarget())) {
    openWardrobePanel();
    return true;
  }
  if (!isActive() || activeDlg) return false;
  const step = currentStep();
  if (!step?.interact) return false;
  if (!nearInteract(step.interact)) return false;
  if (step.id === "outfit") {
    openWardrobePanel();
    return true;
  }
  if (!step.dialogue) return false;
  showDialogue(step.dialogue);
  return true;
}

export function renderObjectivePanel() {
  if (!isActive()) return false;
  const box = document.getElementById("questBox");
  if (!box) return false;
  const step = currentStep();
  const title = L({
    ru: "Новенький в городе",
    en: "New in Town",
    da: "Ny i byen"
  });
  const objective = step ? L(step.objective) : L({ ru: "Готово", en: "Done", da: "Færdig" });
  const st = ensureLifeCh1();
  const i = (st.stepIndex || 0) + 1;
  const n = spec?.steps?.length || 4;
  box.innerHTML = `<div class="quest-tracker story-objective life-ch1-tracker" data-testid="life-ch1-quest-panel">
    <b>${escapeHtml(title)}</b> <span class="quest-step-num">${i}/${n}</span>
    <div class="quest-step-title">${escapeHtml(objective)}</div>
    <div class="quest-step-text life-ch1-sub">${escapeHtml(L({ ru: "Жизненная глава · отдельное сохранение lifeCh1", en: "Life chapter · lifeCh1 save namespace", da: "Liv kapitel" }))}</div>
  </div>`;
  syncBeacon();
  const qw = document.getElementById("hudQuestsWrap");
  const qt = document.getElementById("hudQuestsToggle");
  if (qw?.classList.contains("collapsed")) {
    qw.classList.remove("collapsed");
    qt?.setAttribute("aria-expanded", "true");
    if (qt) qt.textContent = "▾";
  }
  return true;
}

const PRESET_PHRASES = [
  { ru: "Привет!", en: "Hi!", da: "Hej!" },
  { ru: "Спасибо!", en: "Thanks!", da: "Tak!" },
  { ru: "Пока!", en: "Bye!", da: "Hej hej!" }
];

function updateChatPresetMode() {
  const input = document.getElementById("chatInput");
  let bar = document.getElementById("lifeCh1PhraseBar");
  if (!isActive()) {
    input?.removeAttribute("readonly");
    bar?.remove();
    return;
  }
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "lifeCh1PhraseBar";
    bar.className = "life-ch1-phrases";
    input?.parentElement?.insertBefore(bar, input);
  }
  if (input) {
    input.placeholder = L({
      ru: "Только готовые фразы (D12-A)",
      en: "Preset phrases only (D12-A)",
      da: "Kun faste sætninger"
    });
  }
  bar.innerHTML = PRESET_PHRASES.map((p, i) =>
    `<button type="button" class="btn secondary life-ch1-phrase" data-i="${i}">${escapeHtml(L(p))}</button>`
  ).join(" ");
  bar.querySelectorAll(".life-ch1-phrase").forEach(btn => {
    btn.onclick = () => {
      const phrase = L(PRESET_PHRASES[+btn.dataset.i]);
      hooks.toast?.(phrase);
      playUiBlip();
    };
  });
}

/** D11-B: softer ambient when life quest UI active (CSS + life canvas gain). */
function applyMusicSceneClass() {
  document.body.classList.toggle("life-ch1-music-soft", isActive());
}

export function getMusicVolumeFactor() {
  return isActive() ? 0.55 : 1;
}

export async function initLifeCh1Slice(h) {
  hooks = h || {};
  skinManifest = await loadAngelinaSkinManifest();
  await loadSpec();
  window.LifeCh1Slice = {
    tryStartAfterOnboarding,
    onBoot,
    onMove,
    tryInteract,
    renderObjectivePanel,
    isActive,
    isCompleted,
    closeDialogue,
    closeWardrobePanel,
    openWardrobePanel,
    ensureLifeCh1,
    lifeCh1PayloadForSave,
    persistLocalOverlay,
    getMusicVolumeFactor,
    getAngelinaSkin,
    setAngelinaSkin,
    syncPlayerLifeCh1Skin,
    isLifeCh1SliceEnabled,
    isLifeCh1TestMode,
    pickReflectNode,
    portraitUrl: id => portraitUrl(id, skinManifest)
  };
}

export function runUnitScenario(state, action) {
  return { state, action, ok: true };
}
