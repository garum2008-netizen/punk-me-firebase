import * as THREE from "three";

const DECOR_KEY = "punkme_room_decor_v21";
let ctxGet = null;
let state = {
  cemetery: null,
  duel: null,
  fetch: null,
  decor: { mode: false, ghost: null, group: null, pick: "crate" },
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
  api.startDuel3D = nid => startDuel3D(nid || "razor");
  api.stopDuel3D = () => stopDuel3D(false);
  api.throwFetchBall = () => throwFetchBall();
  api.setDecorMode = on => setDecorMode(!!on);
  api.placeDecorAt = (wx, wz, type) => placeDecorAt(wx, wz, type);
  api.cycleJukebox = () => cycleJukebox();
  api.snapHeroForShop = bare => snapHeroCosmetics(!!bare);
}

export function onGameplayLocationBuilt(locId, root, bounds) {
  state.decor.group = null;
  if (locId !== "room" || !root) return;
  const g = new THREE.Group();
  g.name = "roomDecorPlaced";
  root.add(g);
  state.decor.group = g;
  loadDecor().forEach(item => spawnDecorMesh(g, item));
}

function spawnDecorMesh(parent, item) {
  const m = box(0.55, 0.45, 0.55, item.type === "sofa" ? 0x5a3048 : 0x3a4858);
  m.position.set(item.x, 0.225, item.z);
  m.rotation.y = item.rot || 0;
  parent.add(m);
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

function startDuel3D(nid) {
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
  state.duel = {
    active: true,
    nid,
    plHp: 100,
    npcHp: 100,
    plMax: 100,
    npcMax: 100,
    cd: 0,
    npcCd: 0
  };
  document.getElementById("fightOverlay")?.classList.remove("active");
  document.getElementById("duel3dHud")?.classList.remove("hidden");
  return true;
}

function ensureActorNpc(ctx, nid) {
  /* npc should exist from sync */
}

function stopDuel3D(win) {
  state.duel = null;
  document.getElementById("duel3dHud")?.classList.add("hidden");
  window._duel3dEnd?.(win);
}

function tickDuel(dt, ctx) {
  const d = state.duel;
  if (!d) return;
  const pl = ctx.actors.get("player");
  const npc = ctx.actors.get("npc_" + d.nid) || ctx.actors.get("npc_razor");
  if (!pl || !npc) return;
  d.cd = Math.max(0, d.cd - dt);
  d.npcCd = Math.max(0, d.npcCd - dt);
  if (window._duelAttack) {
    d.npcHp -= 12 + Math.floor(Math.random() * 8);
    pl.group.position.z -= 0.15;
    fadeEmote(pl, "interact");
    window._duelAttack = false;
    d.cd = 0.45;
  }
  if (window._duelDodge) {
    d._dodge = 1.2;
    window._duelDodge = false;
  }
  if (d._dodge) d._dodge -= dt;
  if (d.npcCd <= 0 && d.npcHp > 0) {
    d.npcCd = 1.1;
    if (!d._dodge) {
      d.plHp -= 8 + Math.floor(Math.random() * 6);
      npc.group.position.z += 0.12;
      pl.group.position.z += 0.08;
    }
    fadeEmote(npc, "interact");
  }
  npc.group.lookAt(pl.group.position);
  if (d.plHp <= 0) stopDuel3D(false);
  if (d.npcHp <= 0) stopDuel3D(true);
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

function setDecorMode(on) {
  state.decor.mode = on;
  const ctx = ctxGet?.();
  if (!ctx?.locationRoot || ctx.currentLoc !== "room") return;
  if (on && !state.decor.ghost) {
    state.decor.ghost = box(0.55, 0.45, 0.55, 0x00ffaa, 0x00ffaa);
    state.decor.ghost.material.transparent = true;
    state.decor.ghost.material.opacity = 0.45;
    ctx.locationRoot.add(state.decor.ghost);
  }
  if (!on && state.decor.ghost) {
    state.decor.ghost.removeFromParent();
    state.decor.ghost = null;
  }
}

function placeDecorAt(wx, wz, type = "crate") {
  const items = loadDecor();
  if (items.length >= 12) return false;
  const snap = 0.5;
  const item = { type, x: Math.round(wx / snap) * snap, z: Math.round(wz / snap) * snap, rot: 0 };
  items.push(item);
  saveDecor(items);
  if (state.decor.group) spawnDecorMesh(state.decor.group, item);
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
