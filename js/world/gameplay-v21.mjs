import * as THREE from "three";
import { buildFurnitureMesh, FURNITURE_CATALOG } from "./room-furniture-catalog.mjs";

const DECOR_KEY = "punkme_room_decor_v21";
let ctxGet = null;
let state = {
  cemetery: null,
  duel: null,
  fetch: null,
  decor: { mode: false, ghost: null, group: null, pick: "sofa", rot: 0, selected: null, keyHandler: null },
  jukeboxTrack: 0,
  bgmCtx: null
};

function box(w, h, d, color, emi = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, emissive: emi || color, emissiveIntensity: emi ? 0.7 : 0, roughness: 0.7 })
  );
  return m;
}

function hudEl() {
  return document.getElementById("gameplayHud");
}

function setHud(html) {
  const el = hudEl();
  if (el) el.innerHTML = html;
}

function loadDecor() {
  try { return JSON.parse(localStorage.getItem(DECOR_KEY) || "[]"); } catch { return []; }
}

function saveDecor(items) {
  localStorage.setItem(DECOR_KEY, JSON.stringify(items));
}

export function bindGameplayToWorld3D(api, getCtx) {
  ctxGet = getCtx;
  api.startCemeteryJobMini = () => startCemeteryJob();
  api.startDuel3D = (nid, opts) => startDuel3D(nid || "razor", opts);
  api.prepareDuelCapturePose = (nid) => prepareDuelCapturePose(nid || "razor");
  api.setDecorGhostScreenCenter = () => setDecorGhostScreenCenter();
  api.stopDuel3D = () => stopDuel3D(false);
  api.throwFetchBall = () => throwFetchBall();
  api.setDecorMode = on => setDecorMode(!!on);
  api.placeDecorAt = (wx, wz, type) => placeDecorAt(wx, wz, type);
  api.getDecorPick = () => state.decor.pick;
  api.setDecorPick = id => setDecorPick(id);
  api.setDecorGhostAt = (wx, wz) => setDecorGhostAt(wx, wz);
  api.updateDecorGhostFromEvent = e => updateDecorGhostFromEvent(e);
  api.endAllGameplayActivities = endAllGameplayActivities;
  api.isGameplayActivityActive = isGameplayActivityActive;
  api.decorPointerDown = (wx, wz) => decorPointerDown(wx, wz);
  api.handleDecorKey = key => handleDecorKey(key);
  api.cycleJukebox = () => cycleJukebox();
  api.snapHeroForShop = bare => snapHeroCosmetics(!!bare);
}

export function endAllGameplayActivities() {
  if (state.cemetery?.active) endCemeteryJob(false);
  if (state.duel?.active) stopDuel3D(false);
  state.fetch = null;
  setHud("");
  document.getElementById("duel3dHud")?.classList.add("hidden");
  document.getElementById("duel3dResult")?.classList.add("hidden");
  document.getElementById("fightOverlay")?.classList.remove("active");
  if (state.decor.mode) setDecorMode(false);
}

export function onGameplayLocationChanged(nextLocId, prevLocId) {
  if (!prevLocId || prevLocId === nextLocId) return;
  endAllGameplayActivities();
}

export function isGameplayActivityActive() {
  return !!(state.cemetery?.active || state.duel?.active || state.fetch?.active || state.decor.mode);
}

export function onGameplayLocationBuilt(locId, root, bounds) {
  state.decor.group = null;
  if (locId !== "room" || !root) return;
  const g = new THREE.Group();
  g.name = "roomDecorPlaced";
  root.add(g);
  state.decor.group = g;
  loadDecor().forEach((item, i) => spawnDecorMesh(g, item, i));
}

function spawnDecorMesh(parent, item, idx) {
  const g = buildFurnitureMesh(item.type || "sofa");
  g.position.set(item.x, 0, item.z);
  g.rotation.y = item.rot || 0;
  g.userData.decorIndex = idx;
  g.userData.decorType = item.type;
  parent.add(g);
  return g;
}

function refreshDecorMeshes() {
  const g = state.decor.group;
  if (!g) return;
  while (g.children.length) g.children[0].removeFromParent();
  loadDecor().forEach((item, i) => spawnDecorMesh(g, item, i));
}

function setDecorHighlight(mesh, on) {
  if (!mesh) return;
  mesh.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (!m.emissive) return;
      if (on) {
        m.emissive.set(0x00ffcc);
        m.emissiveIntensity = 0.45;
      } else {
        m.emissiveIntensity = m.userData._baseEmi ?? 0;
      }
    });
  });
}

export function tickGameplayV21(dt, ctx) {
  if (state.cemetery?.active) tickCemetery(dt, ctx);
  if (state.duel?.active) tickDuel(dt, ctx);
  if (state.fetch?.active) tickFetch(dt, ctx);
  updateDuelHpBars(ctx);
}

function startCemeteryJob() {
  const ctx = ctxGet?.();
  if (!ctx?.locationRoot || ctx.currentLoc !== "cemetery") return false;
  const root = new THREE.Group();
  root.name = "cemeteryJob";
  ctx.locationRoot.add(root);
  const candles = [];
  for (let i = 0; i < 6; i++) {
    const c = box(0.08, 0.25, 0.08, 0x442211);
    const flame = box(0.06, 0.08, 0.06, 0xffaa22, 0xff6600);
    flame.position.y = 0.2;
    flame.material.emissiveIntensity = 0.15;
    const g = new THREE.Group();
    g.add(c, flame);
    g.position.set(-2.5 + i * 1, 0, -1 + (i % 2) * 2.5);
    root.add(g);
    candles.push({ g, flame, lit: false });
  }
  const ghosts = [];
  for (let i = 0; i < 3; i++) {
    const ghost = box(0.35, 0.5, 0.2, 0xaaddff, 0x88ccff);
    ghost.position.set(-3 + i * 3, 0.8, 3.5);
    ghost.material.transparent = true;
    ghost.material.opacity = 0.75;
    ghost.userData.ghostId = i;
    root.add(ghost);
    ghosts.push({ mesh: ghost, caught: false, t: i });
  }
  state.cemetery = {
    active: true,
    root,
    candles,
    ghosts,
    end: performance.now() + 28000,
    lit: 0,
    caught: 0,
    nextLight: performance.now() + 1200
  };
  setHud(`<b>${t("job_cemetery_hud")}</b><div class="gp-bar"><span id="gpCemeteryBar" style="width:0%"></span></div><div id="gpCemeteryTimer">28s</div>`);
  return true;
}

function tickCemetery(dt, ctx) {
  const job = state.cemetery;
  if (!job) return;
  const now = performance.now();
  const left = Math.max(0, Math.ceil((job.end - now) / 1000));
  const timer = document.getElementById("gpCemeteryTimer");
  if (timer) timer.textContent = `${left}s · ${t("job_candles")} ${job.lit}/6 · ${t("job_ghosts")} ${job.caught}/3`;
  if (now >= job.nextLight && job.lit < job.candles.length) {
    const c = job.candles[job.lit];
    c.lit = true;
    c.flame.material.emissiveIntensity = 1.4;
    job.lit++;
    job.nextLight = now + 900;
  }
  const pl = ctx.actors?.get("player");
  job.ghosts.forEach(g => {
    if (g.caught) return;
    g.t += dt;
    g.mesh.position.y = 0.75 + Math.sin(g.t * 3) * 0.25;
    g.mesh.position.x += Math.sin(g.t * 1.2) * dt * 0.15;
    if (pl) {
      const d = Math.hypot(pl.wx - g.mesh.position.x, pl.wz - g.mesh.position.z);
      if (d < 1.65) {
        g.caught = true;
        g.mesh.visible = false;
        job.caught++;
      }
    }
  });
  if (pl && window._lastInteract && consumeInteractNearGhosts(pl, job)) {
    job.caught++;
  }
  const prog = ((job.lit / 6) + (job.caught / 3)) / 2;
  const bar = document.getElementById("gpCemeteryBar");
  if (bar) bar.style.width = `${prog * 100}%`;
  if (now >= job.end || (job.lit >= 6 && job.caught >= 3)) endCemeteryJob(job.lit >= 6);
}

function consumeInteractNearGhosts(pl, job) {
  if (!window._lastInteract) return false;
  let hit = false;
  job.ghosts.forEach(g => {
    if (g.caught) return;
    const d = Math.hypot(pl.wx - g.mesh.position.x, pl.wz - g.mesh.position.z);
    if (d < 1.8) { g.caught = true; g.mesh.visible = false; hit = true; }
  });
  window._lastInteract = false;
  return hit;
}

function endCemeteryJob(success) {
  const job = state.cemetery;
  if (!job) return;
  job.root.removeFromParent();
  state.cemetery = null;
  setHud("");
  window._cemeteryJobDone?.(success);
}

function startDuel3D(nid, opts = {}) {
  const ctx = ctxGet?.();
  const pl = ctx?.actors?.get("player");
  if (!pl || !ctx.scene) return false;
  const npc = ctx.actors?.get("npc_" + nid) || ctx.actors?.get("npc_razor");
  if (!npc) {
    ensureActorNpc(ctx, nid);
  }
  const opponent = ctx.actors.get("npc_" + nid) || ctx.actors.get("npc_razor");
  if (!opponent) return false;
  opponent.wx = pl.wx + 2.2;
  opponent.wz = pl.wz;
  opponent.group.position.set(opponent.wx, 0, opponent.wz);
  opponent.group.rotation.y = Math.PI;
  const training = !!opts.training;
  const firstTo = opts.firstTo || (training ? 3 : 0);
  state.duel = {
    active: true,
    nid,
    training,
    firstTo,
    plHits: 0,
    npcHits: 0,
    plHp: training ? 999 : 100,
    npcHp: training ? 999 : 100,
    plMax: training ? 999 : 100,
    npcMax: training ? 999 : 100,
    cd: 0,
    npcCd: 0,
    plBlock: 0,
    trail: null,
    flashPl: 0,
    flashNpc: 0,
    plLunge: 0,
    npcLunge: 0,
    dodgeT: 0
  };
  document.getElementById("fightOverlay")?.classList.remove("active");
  document.getElementById("duel3dHud")?.classList.remove("hidden");
  document.getElementById("duel3dResult")?.classList.add("hidden");
  return true;
}

function ensureActorNpc(ctx, nid) {
  /* npc should exist from sync */
}

function stopDuel3D(win) {
  const d = state.duel;
  const wasTraining = d?.training;
  if (d?.trail) {
    d.trail.removeFromParent();
    d.trail = null;
  }
  state.duel = null;
  document.getElementById("duel3dHud")?.classList.add("hidden");
  const reward = win ? 70 + Math.floor(Math.random() * 40) : 0;
  const res = document.getElementById("duel3dResult");
  if (res) {
    res.classList.remove("hidden");
    res.innerHTML = win
      ? `<b>${wasTraining ? t("duel_training_win") || "Training win!" : t("win_fight")}</b><div>${wasTraining ? "" : `+${reward} coins · +25 XP`}</div>`
      : `<b>${t("lose_fight")}</b><div>${t("fight_try_again")}</div>`;
    setTimeout(() => res.classList.add("hidden"), 3200);
  }
  window._duel3dEnd?.(win);
}

function spawnChainTrail(ctx, fromX, fromZ, toX, toZ) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.85
  });
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.TorusGeometry(0.14 - i * 0.015, 0.03, 6, 12), mat);
    const t = i / 5;
    seg.position.set(fromX + (toX - fromX) * t, 1.1 + Math.sin(t * 6) * 0.15, fromZ + (toZ - fromZ) * t);
    seg.rotation.y = Math.atan2(toX - fromX, toZ - fromZ);
    g.add(seg);
  }
  ctx.scene.add(g);
  return g;
}

function restoreActorMaterials(actor) {
  if (!actor?.group) return;
  actor._hitFlash = 0;
  actor.group.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (m.userData._hitBaseEmi !== undefined) {
        m.emissive.setHex(m.userData._hitBaseEmi);
        m.emissiveIntensity = m.userData._hitBaseInt ?? 0.2;
      } else if (m.emissive) {
        m.emissiveIntensity = 0;
      }
    });
  });
}

function flashActor(actor, dur = 0.11) {
  if (!actor?.group) return;
  actor.group.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (!m.emissive) return;
      if (m.userData._hitBaseEmi === undefined) {
        m.userData._hitBaseEmi = m.emissive.getHex();
        m.userData._hitBaseInt = m.emissiveIntensity ?? 0.2;
      }
      m.emissive.set(0xffffff);
      m.emissiveIntensity = 0.72;
    });
  });
  actor._hitFlash = dur;
}

function prepareDuelCapturePose(nid = "razor") {
  const ctx = ctxGet?.();
  if (!ctx?.actors) return false;
  if (!state.duel?.active) startDuel3D(nid, { training: true, firstTo: 3 });
  const d = state.duel;
  const pl = ctx.actors.get("player");
  const npc = ctx.actors.get("npc_" + nid) || ctx.actors.get("npc_razor");
  if (!pl || !npc || !d) return false;
  d.cd = 0.6;
  d.plLunge = 0.26;
  d.npcLunge = 0;
  d.trail = null;
  restoreActorMaterials(pl);
  restoreActorMaterials(npc);
  pl._vy = 0;
  pl._onGround = true;
  pl.group.position.y = 0;
  pl.group.rotation.x = 0;
  pl.group.rotation.z = 0;
  npc.group.position.y = 0;
  npc.group.rotation.x = 0;
  npc.group.rotation.z = 0;
  ctx.actors.forEach((act, id) => {
    if (id === "player" || id === `npc_${nid}`) return;
    act.group.visible = false;
  });
  const dx = npc.wx - pl.wx;
  const dz = npc.wz - pl.wz;
  const len = Math.hypot(dx, dz) || 1;
  pl.group.rotation.y = Math.atan2(dx, dz);
  npc.group.rotation.y = Math.atan2(-dx, -dz);
  fadeTo(pl, "run");
  pl._spd = 2.4;
  fadeTo(npc, "idle");
  return true;
}

function tickDuel(dt, ctx) {
  const d = state.duel;
  if (!d) return;
  const pl = ctx.actors.get("player");
  const npc = ctx.actors.get("npc_" + d.nid) || ctx.actors.get("npc_razor");
  if (!pl || !npc) return;
  d.cd = Math.max(0, d.cd - dt);
  d.npcCd = Math.max(0, d.npcCd - dt);
  d.plBlock = Math.max(0, d.plBlock - dt);
  d.plLunge = Math.max(0, d.plLunge - dt);
  d.npcLunge = Math.max(0, d.npcLunge - dt);
  d.dodgeT = Math.max(0, d.dodgeT - dt);
  d.flashPl = Math.max(0, d.flashPl - dt);
  d.flashNpc = Math.max(0, d.flashNpc - dt);
  if (d.trail) {
    d.trail.rotation.y += dt * 8;
    d.trail.children.forEach(c => { c.material.opacity = Math.max(0, c.material.opacity - dt * 2.5); });
    if (d.trail.children[0]?.material.opacity < 0.05) {
      d.trail.removeFromParent();
      d.trail = null;
    }
  }
  [pl, npc].forEach(a => {
    if (a._hitFlash > 0) {
      a._hitFlash -= dt;
      if (a._hitFlash <= 0) {
        a.group.traverse(o => {
          if (!o.isMesh || !o.material) return;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach(m => {
            if (m.userData._hitBaseEmi !== undefined) {
              m.emissive.setHex(m.userData._hitBaseEmi);
              m.emissiveIntensity = m.userData._hitBaseInt ?? 0.2;
            } else {
              m.emissiveIntensity = 0;
            }
          });
        });
      }
    }
  });
  if (window._duelAttack && d.cd <= 0) {
    const dmg = 12 + Math.floor(Math.random() * 8);
    if (d.training) d.plHits += 1;
    else d.npcHp -= dmg;
    d.plLunge = 0.32;
    const dx = npc.wx - pl.wx;
    const dz = npc.wz - pl.wz;
    const len = Math.hypot(dx, dz) || 1;
    pl.wx += (dx / len) * 0.35;
    pl.wz += (dz / len) * 0.35;
    pl.group.position.set(pl.wx, pl.group.position.y, pl.wz);
    npc.wx -= (dx / len) * 0.55;
    npc.wz -= (dz / len) * 0.55;
    npc.group.position.set(npc.wx, 0, npc.wz);
    d.trail = spawnChainTrail(ctx, pl.wx, pl.wz, npc.wx, npc.wz);
    flashActor(npc, 0.11);
    d.flashNpc = 0.11;
    fadeEmote(pl, "interact");
    window._duelAttack = false;
    d.cd = 0.55;
  }
  if (window._duelDodge) {
    d.dodgeT = 0.85;
    const side = pl.group.rotation.y + Math.PI / 2;
    pl.wx += Math.sin(side) * 0.9;
    pl.wz += Math.cos(side) * 0.9;
    pl.group.position.set(pl.wx, pl.group.position.y, pl.wz);
    fadeEmote(pl, "walk");
    window._duelDodge = false;
  }
  if (window._duelBlock) {
    d.plBlock = 1.1;
    pl.group.rotation.x = -0.12;
    window._duelBlock = false;
  } else if (d.plBlock <= 0) {
    pl.group.rotation.x *= 0.85;
  }
  if (d.npcCd <= 0 && d.npcHp > 0) {
    d.npcCd = 1.15;
    d.npcLunge = 0.28;
    if (d.dodgeT <= 0 && d.plBlock <= 0) {
      let dmg = 8 + Math.floor(Math.random() * 6);
      if (d.plBlock > 0) dmg = Math.floor(dmg * 0.25);
      if (d.training) d.npcHits += 1;
      else d.plHp -= dmg;
      const dx = pl.wx - npc.wx;
      const dz = pl.wz - npc.wz;
      const len = Math.hypot(dx, dz) || 1;
      pl.wx += (dx / len) * 0.22;
      pl.wz += (dz / len) * 0.22;
      pl.group.position.set(pl.wx, pl.group.position.y, pl.wz);
      flashActor(pl, 0.35);
      d.flashPl = 0.35;
    }
    fadeEmote(npc, "interact");
  }
  npc.group.lookAt(pl.group.position);
  if (d.training) {
    if (d.plHits >= d.firstTo) stopDuel3D(true);
    else if (d.npcHits >= d.firstTo) stopDuel3D(false);
  } else {
    if (d.plHp <= 0) stopDuel3D(false);
    if (d.npcHp <= 0) stopDuel3D(true);
  }
}

function fadeEmote(actor, name) {
  if (actor?.actions?.[name]) {
    actor.actions[name].reset().fadeIn(0.08).play();
  }
}

function updateDuelHpBars(ctx) {
  const d = state.duel;
  if (!d) return;
  const pl = ctx.actors?.get("player");
  const npc = ctx.actors?.get("npc_" + d.nid) || ctx.actors?.get("npc_razor");
  const proj = (a, y) => {
    if (!a || !ctx.camera) return null;
    const v = new THREE.Vector3(a.wx, y, a.wz);
    v.project(ctx.camera);
    const canvas = document.getElementById("stage3d");
    if (!canvas) return null;
    return { x: (v.x * 0.5 + 0.5) * canvas.clientWidth, y: (-v.y * 0.5 + 0.5) * canvas.clientHeight };
  };
  const p1 = proj(pl, 1.85);
  const p2 = proj(npc, 1.85);
  const hud = document.getElementById("duel3dHud");
  if (!hud || !p1 || !p2) return;
  const hpP = hud.querySelector(".duel-hp-player");
  const hpN = hud.querySelector(".duel-hp-npc");
  if (hpP) hpP.style.cssText = `left:${p1.x}px;top:${p1.y}px;width:64px;`;
  if (hpN) hpN.style.cssText = `left:${p2.x}px;top:${p2.y}px;width:64px;`;
  if (hpP) hpP.style.setProperty("--w", `${d.plHp}%`);
  if (hpN) hpN.style.setProperty("--w", `${d.npcHp}%`);
}

function throwFetchBall() {
  const ctx = ctxGet?.();
  const pl = ctx?.actors?.get("player");
  const dog = ctx?.actors?.get("dog");
  if (!pl || !dog || !ctx.scene) return false;
  const ball = new THREE.Mesh(
    new THREE.SphereGeometry(0.12, 12, 12),
    new THREE.MeshStandardMaterial({ color: 0xff00aa, emissive: 0xff0066, emissiveIntensity: 0.6 })
  );
  ctx.scene.add(ball);
  const tx = pl.wx + Math.sin(pl.group.rotation.y) * 4;
  const tz = pl.wz + Math.cos(pl.group.rotation.y) * 4;
  state.fetch = { active: true, ball, tx, tz, t: 0, phase: "fly" };
  return true;
}

function tickFetch(dt, ctx) {
  const f = state.fetch;
  if (!f) return;
  const dog = ctx.actors.get("dog");
  const pl = ctx.actors.get("player");
  if (!dog || !pl) return;
  f.t += dt;
  if (f.phase === "fly") {
    f.ball.position.x += (f.tx - f.ball.position.x) * dt * 4;
    f.ball.position.z += (f.tz - f.ball.position.z) * dt * 4;
    f.ball.position.y = 0.2 + Math.sin(f.t * 8) * 0.15;
    if (f.t > 0.55) f.phase = "chase";
  } else {
    const dx = f.ball.position.x - dog.wx;
    const dz = f.ball.position.z - dog.wz;
    const dist = Math.hypot(dx, dz);
    dog.wx += (dx / (dist || 1)) * dt * 5.5;
    dog.wz += (dz / (dist || 1)) * dt * 5.5;
    dog.group.position.set(dog.wx, 0, dog.wz);
    dog._spd = 2.2;
    if (dist < 0.35) {
      f.ball.removeFromParent();
      state.fetch = null;
      window._fetchDone?.();
    }
  }
}

function rebuildDecorGhost(ctx) {
  if (state.decor.ghost) state.decor.ghost.removeFromParent();
  state.decor.ghost = buildFurnitureMesh(state.decor.pick);
  state.decor.ghost.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      m.transparent = true;
      m.opacity = 0.58;
      m.depthWrite = false;
      if (m.emissive) m.emissiveIntensity = Math.max(m.emissiveIntensity ?? 0, 0.35);
    });
  });
  state.decor.ghost.rotation.y = state.decor.rot;
  ctx.locationRoot.add(state.decor.ghost);
}

function setDecorPick(id) {
  if (!FURNITURE_CATALOG.some(f => f.id === id)) return;
  state.decor.pick = id;
  const ctx = ctxGet?.();
  if (state.decor.mode && ctx?.locationRoot) rebuildDecorGhost(ctx);
}

function setDecorGhostAt(wx, wz) {
  const ctx = ctxGet?.();
  if (!ctx?.locationRoot || ctx.currentLoc !== "room") return false;
  if (!state.decor.ghost) rebuildDecorGhost(ctx);
  if (!state.decor.ghost) return false;
  state.decor.ghost.position.set(wx, 0, wz);
  state.decor.ghost.rotation.y = state.decor.rot;
  state.decor.ghost.visible = true;
  return true;
}

function setDecorGhostScreenCenter() {
  const ctx = ctxGet?.();
  const canvas = document.getElementById("stage3d");
  if (!canvas || !ctx?.camera || !ctx.locationRoot || ctx.currentLoc !== "room") return false;
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(0, -0.08), ctx.camera);
  const hits = rc.intersectObject(ctx.locationRoot, true);
  const hit = hits.find(h => {
    if (h.point.y < 0.02 || h.point.y > 0.38) return false;
    let o = h.object;
    while (o) {
      if (o.userData?.isActor) return false;
      o = o.parent;
    }
    return true;
  });
  if (!hit) return false;
  return setDecorGhostAt(hit.point.x, hit.point.z);
}

function setDecorMode(on) {
  state.decor.mode = on;
  const ctx = ctxGet?.();
  if (!ctx?.locationRoot || ctx.currentLoc !== "room") return;
  if (on) {
    if (!state.decor.ghost) rebuildDecorGhost(ctx);
    if (!state.decor.keyHandler) {
      state.decor.keyHandler = e => {
        if (!state.decor.mode || e.target?.matches?.("input, textarea")) return;
        handleDecorKey(e.key);
      };
      window.addEventListener("keydown", state.decor.keyHandler);
    }
    const label = FURNITURE_CATALOG.find(f => f.id === state.decor.pick)?.label || state.decor.pick;
    setHud(`<b>${t("decor_mode_on")}</b> · ${label} · R rotate · [ ] catalog · Del remove`);
  } else {
    if (state.decor.ghost) {
      state.decor.ghost.removeFromParent();
      state.decor.ghost = null;
    }
    if (state.decor.selected) {
      setDecorHighlight(state.decor.selected, false);
      state.decor.selected = null;
    }
    setHud("");
  }
}

function rayFloorFromEvent(e, ctx) {
  const canvas = document.getElementById("stage3d");
  if (!canvas || !ctx.camera) return null;
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  const rc = new THREE.Raycaster();
  rc.setFromCamera(new THREE.Vector2(x, y), ctx.camera);
  const floor = ctx.locationRoot?.getObjectByName?.("floor") || ctx.locationRoot?.children?.find(c => c.isMesh);
  const hits = rc.intersectObject(ctx.locationRoot, true);
  const hit = hits.find(h => h.object.isMesh && Math.abs(h.face?.normal?.y ?? 1) > 0.5);
  return hit?.point || null;
}

function updateDecorGhostFromEvent(e) {
  if (!state.decor.mode) return;
  const ctx = ctxGet?.();
  if (!ctx?.locationRoot || !state.decor.ghost) return;
  const pt = rayFloorFromEvent(e, ctx);
  if (!pt) return;
  const snap = 0.5;
  state.decor.ghost.position.set(
    Math.round(pt.x / snap) * snap,
    0,
    Math.round(pt.z / snap) * snap
  );
  state.decor.ghost.rotation.y = state.decor.rot;
}

function decorPointerDown(wx, wz) {
  if (!state.decor.mode) return false;
  const ctx = ctxGet?.();
  if (!ctx?.locationRoot) return false;
  const rc = new THREE.Raycaster();
  const from = ctx.camera.position.clone();
  const to = new THREE.Vector3(wx, 0.1, wz);
  rc.set(from, to.sub(from).normalize());
  const hits = rc.intersectObject(state.decor.group, true);
  const hit = hits.find(h => h.object.userData.decorItem || h.object.parent?.userData?.decorItem);
  if (hit) {
    let g = hit.object;
    while (g.parent && !g.userData.decorIndex && g.parent !== state.decor.group) g = g.parent;
    if (state.decor.selected) setDecorHighlight(state.decor.selected, false);
    state.decor.selected = g.userData.decorItem ? g : g.parent;
    setDecorHighlight(state.decor.selected, true);
    return true;
  }
  return false;
}

function handleDecorKey(key) {
  if (!state.decor.mode) return;
  const k = key.toLowerCase();
  if (k === "r") {
    state.decor.rot += Math.PI / 2;
    if (state.decor.ghost) state.decor.ghost.rotation.y = state.decor.rot;
    if (state.decor.selected) {
      state.decor.selected.rotation.y = state.decor.rot;
      const idx = state.decor.selected.userData.decorIndex;
      const items = loadDecor();
      if (items[idx]) {
        items[idx].rot = state.decor.rot;
        saveDecor(items);
  window.StoryEngine?.fireStoryEvent?.("decor_placed");
      }
    }
  } else if (key === "[" || key === "]") {
    const ids = FURNITURE_CATALOG.map(f => f.id);
    let i = ids.indexOf(state.decor.pick);
    i = key === "[" ? (i - 1 + ids.length) % ids.length : (i + 1) % ids.length;
    setDecorPick(ids[i]);
    setDecorMode(true);
  } else if (key === "Delete" || key === "Backspace") {
    if (!state.decor.selected) return;
    const idx = state.decor.selected.userData.decorIndex;
    const items = loadDecor().filter((_, j) => j !== idx);
    saveDecor(items);
  window.StoryEngine?.fireStoryEvent?.("decor_placed");
    state.decor.selected.removeFromParent();
    state.decor.selected = null;
    refreshDecorMeshes();
  }
}

function placeDecorAt(wx, wz, type) {
  const items = loadDecor();
  if (items.length >= 12) return false;
  const snap = 0.5;
  const pick = type || state.decor.pick;
  const item = {
    type: pick,
    x: Math.round(wx / snap) * snap,
    z: Math.round(wz / snap) * snap,
    rot: state.decor.rot
  };
  items.push(item);
  saveDecor(items);
  window.StoryEngine?.fireStoryEvent?.("decor_placed");
  if (state.decor.group) spawnDecorMesh(state.decor.group, item, items.length - 1);
  state.decor.rot = 0;
  return true;
}

function snapHeroCosmetics(bare) {
  const ctx = ctxGet?.();
  const pl = ctx?.actors?.get("player");
  if (!pl) return;
  pl._shopBare = bare;
  window.World3D?.applyHeroCosmetics?.(bare ? [] : (window.me?.owned || []), window.me?.equipped || {});
}

function cycleJukebox() {
  state.jukeboxTrack = (state.jukeboxTrack + 1) % 3;
  try { localStorage.setItem("punkme_jukebox", String(state.jukeboxTrack)); } catch (e) {}
  playJukeboxTrack(state.jukeboxTrack);
  return state.jukeboxTrack;
}

function playJukeboxTrack(track) {
  if (!state.bgmCtx) {
    try {
      state.bgmCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) { return; }
  }
  const freqs = [110, 146, 196];
  const osc = state.bgmCtx.createOscillator();
  const gain = state.bgmCtx.createGain();
  osc.frequency.value = freqs[track] || 110;
  gain.gain.value = 0.04;
  osc.connect(gain);
  gain.connect(state.bgmCtx.destination);
  osc.start();
  state._bgmOsc = osc;
  setTimeout(() => { try { osc.stop(); } catch (e) {} }, 2400);
}

function t(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}
