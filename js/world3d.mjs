import * as THREE from "three";
import {
  buildLocationScene,
  gameToWorldLoc,
  worldToGameLoc,
  NPC_WORLD,
  NPC_PATROL,
  NPC_QUEST_GREET,
  PORTALS,
  LOCATION_THEME,
  resolveWorldPosition,
  findClearSpawn,
  pointInsideCollider
} from "./world/locations.mjs";
import { updateProcedural, markActorVisibleWhenReady } from "./character-rig.mjs";
import {
  loadAllCc0Templates,
  getTemplateForCharacter,
  createCc0Actor,
  updateLocomotionTimeScale,
  WAVE_EMOTE_ENABLED,
} from "./world/meshy-punk.mjs";
import { createAtmospherePipeline, renderAtmosphere } from "./world/atmosphere.mjs";
import { loadPunkDogTemplate, createMeshyDog, updateMeshyDogAnim } from "./world/meshy-dog.mjs";
import { pulseScene } from "./world/location-enrich.mjs";
import {
  ensureMarkerRoot,
  setQuestMarkerTarget,
  clearQuestMarkers
} from "./world/quest-markers.mjs";
import { initTouchControls } from "./touch-controls.mjs";
import {
  getInputState,
  consumeJump,
  consumeInteract,
  initControls3D
} from "./controls-3d.mjs";

function resolveAnimName(name) {
  if (name === "wave" && !WAVE_EMOTE_ENABLED) return "idle";
  return name;
}

const DOG_FOLLOW_DIST = 1.2;
const DOG_FOLLOW_SIDE = 0.45;
let punkDogTemplate = null;
let renderer, scene, camera, clock, raycaster, pointer;
let hooks = {};
let actors = new Map();
let car = null;
let locationRoot = null;
let bounds = null;
let furnitureColliders = [];
let floorMesh = null;
let currentLoc = "";
let locationProps = { showCar: false };
let particles = null;
let cameraYaw = 0;
let sceneTime = 0;
let meLastDx = 0;
let meLastDy = 0;
let playerAnimState = "idle";
let modelsReady = false;
let captureFrameLock = false;
let captureSavedRotY = 0;
let captureHideActors = null;
const talkingIds = new Set();
const texLoader = new THREE.TextureLoader();
let guideTarget = null;
let mobileQuality = false;
let locFillLight = null;
let atmospherePipe = null;

function charDef(id) {
  return (typeof getCharacterDef === "function" ? getCharacterDef(id) : null) || { look: {}, anim: {} };
}

function setTalking(characterId, on) {
  if (on) talkingIds.add(characterId);
  else talkingIds.delete(characterId);
}

function makeShadow() {
  const s = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false })
  );
  s.rotation.x = -Math.PI / 2;
  s.position.y = 0.02;
  return s;
}

function spawnOffsetForId(id, index) {
  const i = Math.max(0, index);
  const angle = i * 2.05 + (id.length % 7) * 0.55 + (id.charCodeAt(0) % 5) * 0.3;
  const r = 1.15 + (i % 5) * 0.52;
  return { x: Math.cos(angle) * r, z: Math.sin(angle) * r };
}

function createActorFromCatalog(id, characterId) {
  const def = charDef(characterId || "vienna");
  const tpl = getTemplateForCharacter(characterId || "vienna");
  if (!tpl?.gltf) return null;
  const built = createCc0Actor(tpl, characterId, def.look || {}, {
    isPlayer: id === "player",
    actorId: id
  });
  const { root, mixer, actions } = built;
  root.add(makeShadow());
  const group = new THREE.Group();
  group.add(root);
  scene.add(group);
  const actor = {
    id, characterId: characterId || "vienna", group, root, mixer, actions,
    current: "idle", wx: 0, wz: 0, isNpc: false, def, _visibleReady: false,
    _tplKey: tpl.key, _meshy: built._meshy, _proc: built._proc,
    _visPushX: 0, _visPushZ: 0
  };
  for (let i = 0; i < 4; i++) updateProcedural(actor, 1 / 60, null, false);
  actors.set(id, actor);
  return actor;
}

function ensureActor(id, characterId, isNpc) {
  const tplKey = getTemplateForCharacter(characterId || "vienna")?.key;
  let a = actors.get(id);
  if (a && (a.characterId !== characterId || a._tplKey !== tplKey)) {
    scene.remove(a.group);
    a.mixer?.stopAllAction();
    actors.delete(id);
    a = null;
  }
  if (!a) a = createActorFromCatalog(id, characterId);
  a.isNpc = isNpc;
  return a;
}

function fadeTo(actor, name) {
  name = resolveAnimName(name);
  const locomotion = name === "walk" || name === "run";
  if (actor._meshy) {
    const key = locomotion && actor.actions?.[name] ? name : "idle";
    if (actor.current === key) {
      if (locomotion) updateLocomotionTimeScale(actor);
      return;
    }
    if (locomotion && actor.actions?.[name]) {
      const next = actor.actions[name];
      const other = name === "walk" ? actor.actions.run : actor.actions.walk;
      other?.stop();
      other?.setEffectiveWeight(0);
      actor.actions?.idle?.fadeOut(0.2);
      next.reset().setEffectiveWeight(1).fadeIn(0.22).play();
      actor.current = name;
      updateLocomotionTimeScale(actor);
      return;
    }
    ["walk", "run"].forEach(k => {
      const act = actor.actions?.[k];
      if (!act) return;
      act.fadeOut(0.15);
      act.stop();
      act.setEffectiveWeight(0);
    });
    actor.actions?.idle?.reset().fadeIn(0.2).play();
    actor.current = "idle";
    return;
  }
  const key = actor.actions?.[name] ? name : "idle";
  if (!actor.actions?.[key] || actor.current === key) return;
  const prev = actor.actions[actor.current];
  const next = actor.actions[key];
  next.reset().fadeIn(0.2).play();
  prev?.fadeOut(0.2);
  actor.current = key;
}

function pickLocomotionAnim(actor, speed, talking) {
  if (actor._holdAnim && actor._holdUntil > performance.now()) {
    if (actor._holdAnim === "walk" || actor._holdAnim === "run") return actor._holdAnim;
    return resolveAnimName(actor._holdAnim);
  }
  if (talking && speed < 0.08) return "idle";
  const walkGate = actor._meshy ? 0.16 : 0.08;
  if (speed > 1.2) return "run";
  if (speed > walkGate) return "walk";
  return "idle";
}

function playOneShot(actor, name, ms = 1400) {
  name = resolveAnimName(name);
  if (name === "idle") return;
  if (!actor.actions?.[name]) return;
  actor._holdAnim = name;
  actor._holdUntil = performance.now() + ms;
  fadeTo(actor, name);
  setTimeout(() => {
    if (actor._holdAnim === name) {
      actor._holdAnim = null;
      fadeTo(actor, "idle");
    }
  }, ms);
}

function createDog() {
  if (!punkDogTemplate) return null;
  const d = createMeshyDog(scene, punkDogTemplate);
  d.group.add(makeShadow());
  return d;
}

function syncDogBesidePlayer(pl) {
  const dog = actors.get("dog");
  if (!dog || !pl) return;
  const yaw = pl.group.rotation.y;
  dog.wx = pl.wx - Math.sin(yaw) * DOG_FOLLOW_DIST + Math.cos(yaw) * DOG_FOLLOW_SIDE;
  dog.wz = pl.wz - Math.cos(yaw) * DOG_FOLLOW_DIST - Math.sin(yaw) * DOG_FOLLOW_SIDE;
  const c = clampWorld(dog.wx, dog.wz);
  dog.wx = c.x;
  dog.wz = c.z;
  dog.group.position.set(c.x, dog.group.position.y || 0, c.z);
  dog.group.visible = true;
  if (dog.root) dog.root.visible = true;
}

function updateDogFollow(dt, pl) {
  const dog = actors.get("dog");
  if (!dog || !pl || !bounds) return;
  const yaw = pl.group.rotation.y;
  let tx = pl.wx - Math.sin(yaw) * DOG_FOLLOW_DIST + Math.cos(yaw) * DOG_FOLLOW_SIDE;
  let tz = pl.wz - Math.cos(yaw) * DOG_FOLLOW_DIST - Math.sin(yaw) * DOG_FOLLOW_SIDE;
  let dx = tx - pl.wx;
  let dz = tz - pl.wz;
  let d = Math.hypot(dx, dz);
  if (d < 1.05) {
    tx = pl.wx + (dx / (d || 1)) * 1.05;
    tz = pl.wz + (dz / (d || 1)) * 1.05;
  }
  const tgt = clampWorld(tx, tz);
  const lerp = Math.min(1, dt * 7.5);
  dog.wx += (tgt.x - dog.wx) * lerp;
  dog.wz += (tgt.z - dog.wz) * lerp;
  const move = Math.hypot(tgt.x - dog.wx, tgt.z - dog.wz);
  const playerSpd = pl._spd || 0;
  dog.group.position.set(dog.wx, 0, dog.wz);
  const moveSpd = move / Math.max(dt, 0.001);
  const following = moveSpd > 0.12 || playerSpd > 0.15;
  if (following) {
    const ty = Math.atan2(pl.wx - dog.wx, pl.wz - dog.wz);
    let diff = ty - dog.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    dog.group.rotation.y += diff * Math.min(1, dt * 8);
  }
  const spd = following ? Math.max(moveSpd, playerSpd * 0.85) : 0;
  dog._spd = spd;
  dog._anim = following ? "hop" : "idle";
  if (dog._meshyDog) updateMeshyDogAnim(dog, dt, following ? "hop" : "idle", spd);
}

function ensureCar(show) {
  if (!show) {
    if (car) { scene.remove(car.group); car = null; }
    return;
  }
  if (car) return;
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 1.1), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.6 }));
  body.position.y = 0.55;
  group.add(body);
  const wheels = [];
  [[-0.85, 0.22, 0.5], [-0.85, 0.22, -0.5], [0.85, 0.22, 0.5], [0.85, 0.22, -0.5]].forEach(p => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    w.rotation.z = Math.PI / 2;
    w.position.set(...p);
    group.add(w);
    wheels.push(w);
  });
  group.position.set(-4, 0, 4);
  scene.add(group);
  car = { group, wheels, dir: 1, x: -4, flash: 0 };
}

async function loadModels() {
  await loadAllCc0Templates();
  punkDogTemplate = await loadPunkDogTemplate();
  modelsReady = true;
}

function clearLocation() {
  if (locationRoot) {
    scene.remove(locationRoot);
    locationRoot = null;
  }
  floorMesh = null;
}

function rebuildLocation(locId) {
  clearLocation();
  actors.forEach((a, id) => {
    scene.remove(a.group);
    a.mixer?.stopAllAction();
  });
  actors.clear();
  if (car) { scene.remove(car.group); car = null; }
  guideTarget = null;
  currentLoc = locId;
  const built = buildLocationScene(locId, texLoader);
  locationRoot = built.root;
  bounds = built.bounds;
  floorMesh = built.floor;
  scene.add(locationRoot);
  const theme = built.theme || LOCATION_THEME.room;
  scene.fog = new THREE.FogExp2(theme.fog, theme.fogD);
  scene.background = new THREE.Color(theme.bg);
  if (locFillLight) scene.remove(locFillLight);
  locFillLight = new THREE.PointLight(theme.hemi || 0xffccff, 3.2, 28);
  locFillLight.position.set(0, 4.2, 1);
  scene.add(locFillLight);
  locationProps = built.props || { showCar: false };
  furnitureColliders = built.colliders || [];
  (locationProps.cats || []).forEach(c => locationRoot.add(c));
  spawnParticles(locId);
  ensureMarkerRoot(scene);
}

function spawnParticles(locId) {
  if (particles) { scene.remove(particles); particles = null; }
  if (!locId || locId === "kitchen" || locId === "toilet") return;
  const n = locId === "cemetery" ? 80 : 100;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 24;
    pos[i * 3 + 1] = 0.35 + Math.random() * 5.5;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const color = locId === "cemetery" ? 0x88ffbb : locId === "street" ? 0xff7744 : 0xff66ff;
  particles = new THREE.Points(geo, new THREE.PointsMaterial({
    color, size: 0.055, transparent: true, opacity: 0.62
  }));
  particles.userData.drift = true;
  scene.add(particles);
}

function clampWorld(x, z, radius = 0.42) {
  return resolveWorldPosition(x, z, bounds, furnitureColliders, radius);
}

function separateActors() {
  const list = [...actors.values()].filter(a => !a.isDog);
  const dog = actors.get("dog");
  const pl = actors.get("player");
  if (dog && pl) {
    const dx = pl.wx - dog.wx;
    const dz = pl.wz - dog.wz;
    const d = Math.hypot(dx, dz);
    if (d < 0.95 && d > 0.001) {
      const push = (0.95 - d) * 0.9;
      dog.wx -= (dx / d) * push;
      dog.wz -= (dz / d) * push;
    }
  }
  const minDist = 1.22;
  list.forEach(a => {
    a._visPushX = (a._visPushX || 0) * 0.9;
    a._visPushZ = (a._visPushZ || 0) * 0.9;
  });
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i];
        const b = list[j];
        const ax = a.group.position.x;
        const az = a.group.position.z;
        const bx = b.group.position.x;
        const bz = b.group.position.z;
        const dx = bx - ax;
        const dz = bz - az;
        const d = Math.hypot(dx, dz);
        if (d < minDist && d > 0.001) {
          const push = (minDist - d) * 0.55;
          const ux = dx / d;
          const uz = dz / d;
          const wa = a.isPlayer ? 0.2 : 1;
          const wb = b.isPlayer ? 0.2 : 1;
          a._visPushX -= ux * push * wa;
          a._visPushZ -= uz * push * wa;
          b._visPushX += ux * push * wb;
          b._visPushZ += uz * push * wb;
        }
      }
    }
  }
  list.forEach(a => {
    const baseX = a.wx + (a._visPushX || 0);
    const baseZ = a.wz + (a._visPushZ || 0);
    const p = clampWorld(baseX, baseZ);
    a.group.position.x = p.x;
    a.group.position.z = p.z;
  });
}

function placeActorWorld(actor, wx, wz, isPlayer, isNpc) {
  const offX = isPlayer ? 0 : (actor._visPushX || 0);
  const offZ = isPlayer ? 0 : (actor._visPushZ || 0);
  const c = clampWorld(wx + offX, wz + offZ);
  if (isPlayer) {
    actor.group.position.x = c.x;
    actor.group.position.z = c.z;
  } else {
    const lerp = 0.22;
    actor.group.position.x += (c.x - actor.group.position.x) * lerp;
    actor.group.position.z += (c.z - actor.group.position.z) * lerp;
    const snapped = clampWorld(actor.group.position.x, actor.group.position.z);
    actor.group.position.x = snapped.x;
    actor.group.position.z = snapped.z;
  }
  actor.group.position.y = 0;
  const dx = c.x - (actor.wx ?? c.x);
  const dz = c.z - (actor.wz ?? c.z);
  let speed = Math.hypot(dx, dz) * (isPlayer ? 8 : 2.5);
  if (actor.id.startsWith("demo_")) speed = 0;
  if (!isPlayer && isNpc && Math.hypot(dx, dz) < 0.025) speed = 0;
  if (!isPlayer && actor._netAnim === "idle") speed = 0;
  actor._spd = speed;
  if (isPlayer) { meLastDx = dx; meLastDy = dz; }
  actor.wx = actor.group.position.x;
  actor.wz = actor.group.position.z;
  actor.isNpc = isNpc;
  actor.isPlayer = isPlayer;
  if (Math.hypot(dx, dz) > 0.01) {
    actor.group.rotation.y = Math.atan2(dx, dz);
  }
  if (actor.isDog && !actor._proceduralDog) {
    fadeToDog(actor, speed > 0.8 ? "run" : speed > 0.08 ? "walk" : "idle");
  } else if (actor.actions || actor._meshy) {
    const talking = talkingIds.has(actor.characterId) || talkingIds.has(actor.id.replace("npc_", ""));
    fadeTo(actor, pickLocomotionAnim(actor, speed, talking));
    updateLocomotionTimeScale(actor);
  }
  if (isPlayer) {
    const st = talkingIds.has("player") ? "talk" : (speed > 1.2 ? "run" : speed > 0.08 ? "walk" : "idle");
    if (st !== playerAnimState) {
      playerAnimState = st;
      hooks.onAnimState?.(st);
    }
  }
}

function fadeToDog(dog, name) {
  if (dog._proceduralDog || !dog.actions?.[name] || dog.current === name) return;
  dog.actions[dog.current]?.fadeOut(0.15);
  dog.actions[name].reset().fadeIn(0.15).play();
  dog.current = name;
}

function updateCameraOccluders() {
  const player = actors.get("player");
  if (!player || !locationRoot || !raycaster) return;
  const eye = camera.position.clone();
  const aim = player.group.position.clone().add(new THREE.Vector3(0, 1.15, 0));
  const dir = aim.clone().sub(eye).normalize();
  const maxD = eye.distanceTo(aim);
  raycaster.set(eye, dir);
  const occluders = [];
  locationRoot.traverse(o => {
    if (o.isMesh && o.userData.cameraOccluder) occluders.push(o);
  });
  const hitSet = new Set(raycaster.intersectObjects(occluders, false).map(h => h.object));
  locationRoot.traverse(o => {
    if (!o.isMesh || !o.userData.cameraOccluder || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (!m) return;
      m.transparent = true;
      m.opacity = hitSet.has(o) ? 0.22 : 1;
      m.depthWrite = !hitSet.has(o);
    });
  });
}

const LOCATION_CAMERA = {
  /** 3/4 front: camera in front of player so face + doors (+Z) read in frame */
  elevator: { dist: 3.85, height: 2.02, lookY: 1.16, yaw: -0.52, lookAhead: 1.85 },
  toilet: { dist: 4.5, height: 2.38, lookY: 1.24, yaw: 0.22 },
  kitchen: { dist: 5.6, height: 2.42, lookY: 1.28, yaw: 0.35 }
};

function cameraFollowProfile() {
  const loc = LOCATION_CAMERA[currentLoc] || {};
  const baseDist = loc.dist ?? 6.4;
  const dist = mobileQuality ? baseDist * 0.96 : baseDist;
  return {
    dist,
    height: loc.height ?? (mobileQuality ? 2.48 : 2.4),
    lookY: loc.lookY ?? 1.28
  };
}

function collectCameraOccluders() {
  const list = [];
  if (!locationRoot) return list;
  locationRoot.traverse(o => {
    if (o.isMesh && o.userData.cameraOccluder) list.push(o);
  });
  return list;
}

function resolveCameraWallCollision(eye, desired) {
  const occluders = collectCameraOccluders();
  if (!occluders.length || !raycaster) return desired;
  const dir = desired.clone().sub(eye);
  const dist = dir.length();
  if (dist < 0.05) return desired;
  dir.normalize();
  raycaster.set(eye, dir);
  const hits = raycaster.intersectObjects(occluders, false);
  if (hits.length && hits[0].distance < dist - 0.08) {
    return eye.clone().add(dir.multiplyScalar(Math.max(0.45, hits[0].distance - 0.42)));
  }
  return desired;
}

function positionCameraBehindPlayer(instant = false) {
  const player = actors.get("player");
  if (!player || !camera) return;
  const p = player.group.position;
  const { dist, height, lookY } = cameraFollowProfile();
  const ox = Math.sin(cameraYaw) * dist;
  const oz = Math.cos(cameraYaw) * dist;
  const eye = p.clone().add(new THREE.Vector3(0, lookY - 0.15, 0));
  let target = new THREE.Vector3(p.x + ox, height, p.z + oz);
  target = resolveCameraWallCollision(eye, target);
  if (instant) camera.position.copy(target);
  else camera.position.lerp(target, 0.12);
  const lookAhead = LOCATION_CAMERA[currentLoc]?.lookAhead ?? 0;
  camera.lookAt(p.x, lookY, p.z + lookAhead);
  updateCameraOccluders();
}

function resetCameraForLocation() {
  cameraYaw = LOCATION_CAMERA[currentLoc]?.yaw ?? 0.38;
  positionCameraBehindPlayer(true);
}

function updateThirdPersonCamera() {
  positionCameraBehindPlayer(false);
}

function tickNpcPatrols(dt) {
  const pl = actors.get("player");
  actors.forEach((a, id) => {
    if (!id.startsWith("npc_")) return;
    const greet = NPC_QUEST_GREET[currentLoc]?.[a.characterId];
    if (greet && pl) {
      const d = Math.hypot(pl.wx - a.wx, pl.wz - a.wz);
      if (d < greet.range) {
        a.wx = greet.anchor.x;
        a.wz = greet.anchor.z;
        a.group.position.x = a.wx;
        a.group.position.z = a.wz;
        const dx = pl.wx - a.wx;
        const dz = pl.wz - a.wz;
        const targetY = Math.atan2(dx, dz);
        let diff = targetY - a.group.rotation.y;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.group.rotation.y += diff * Math.min(1, dt * 3.2);
        a._spd = 0;
        fadeTo(a, "idle");
        updateLocomotionTimeScale(a);
        return;
      }
    }
    if (!a._patrol?.length) return;
    const path = a._patrol;
    let idx = a._patrolIdx || 0;
    const tgt = path[idx];
    const dx = tgt.x - a.wx;
    const dz = tgt.z - a.wz;
    const dist = Math.hypot(dx, dz);
    const step = 1.55 * dt;
    if (dist < 0.4) {
      a._patrolIdx = (idx + 1) % path.length;
      if (dist < 0.08) return;
    }
    const ux = dx / (dist || 1);
    const uz = dz / (dist || 1);
    const move = Math.min(step, dist);
    const c = clampWorld(a.wx + ux * move, a.wz + uz * move);
    a.wx = c.x;
    a.wz = c.z;
    a.group.rotation.y = Math.atan2(ux, uz);
    const spd = move / Math.max(dt, 0.001);
    a._spd = spd;
    fadeTo(a, spd > 1.15 ? "run" : "walk");
    updateLocomotionTimeScale(a);
    a.group.position.x = a.wx;
    a.group.position.z = a.wz;
  });
}

function checkPortals() {
  const player = actors.get("player");
  if (!player || !bounds) return;
  const portals = PORTALS[currentLoc] || [];
  const px = player.group.position.x;
  const pz = player.group.position.z;
  for (const portal of portals) {
    if (Math.hypot(px - portal.x, pz - portal.z) < portal.r) {
      hooks.onPortal?.(portal.to);
      break;
    }
  }
}

function processInput(dt) {
  const player = actors.get("player");
  if (!player || !bounds) return;
  const input = getInputState();
  const speed = (input.run ? 7.2 : 4.5) * dt;
  const fwd = new THREE.Vector3(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
  const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
  let mx = 0;
  let mz = 0;
  const mag = Math.hypot(input.moveX, input.moveZ);
  if (mag > 0.05) {
    const nx = input.moveX / mag;
    const nz = input.moveZ / mag;
    mx = (fwd.x * nz + right.x * nx) * speed;
    mz = (fwd.z * nz + right.z * nx) * speed;
  }
  if (mx !== 0 || mz !== 0) {
    const np = clampWorld(player.wx + mx, player.wz + mz);
    const g = worldToGameLoc(np.x, np.z, bounds);
    hooks.onMove?.(g.x, g.y);
  }
  if (consumeJump() && (player._onGround ?? true)) {
    player._vy = 5.2;
    player._onGround = false;
  }
  if (consumeInteract()) hooks.onInteract?.();
}

function getNearestDogId() {
  const pl = actors.get("player");
  const dog = actors.get("dog");
  if (!pl || !dog) return false;
  const d = Math.hypot(pl.wx - dog.wx, pl.wz - dog.wz);
  return d < 2.15;
}

function getNearestNpcId() {
  const pl = actors.get("player");
  if (!pl) return null;
  let best = null;
  let bestD = 2.4;
  actors.forEach((a, id) => {
    if (!id.startsWith("npc_")) return;
    const d = Math.hypot(pl.wx - a.wx, pl.wz - a.wz);
    if (d < bestD) { bestD = d; best = id.replace("npc_", ""); }
  });
  return best;
}

function getNearPortal() {
  const pl = actors.get("player");
  if (!pl) return null;
  const portals = PORTALS[currentLoc] || [];
  let best = null;
  let bestD = Infinity;
  for (const portal of portals) {
    const d = Math.hypot(pl.wx - portal.x, pl.wz - portal.z);
    if (d < portal.r + 0.35 && d < bestD) {
      bestD = d;
      best = portal;
    }
  }
  return best;
}

function sync(data) {
  if (!modelsReady) return;
  const { player, others, npcs, location, hasDog, carVisible } = data;
  const justChangedLoc = location !== currentLoc;
  if (justChangedLoc) {
    rebuildLocation(location);
    captureFrameLock = false;
    const dogActor = actors.get("dog");
    if (dogActor) dogActor._placed = false;
  }
  if (justChangedLoc && location === "kitchen" && player && bounds) {
    const clear = findClearSpawn(bounds, furnitureColliders, { x: -2.8, z: -1.2 });
    const g = worldToGameLoc(clear.x, clear.z, bounds);
    hooks.onMove?.(g.x, g.y);
  }
  if (justChangedLoc && location === "elevator" && player && bounds) {
    const clear = findClearSpawn(bounds, furnitureColliders, { x: 0, z: -2.1 });
    const g = worldToGameLoc(clear.x, clear.z, bounds);
    hooks.onMove?.(g.x, g.y);
  }

  const keep = new Set(["player"]);
  if (player) {
    const w = gameToWorldLoc(player.x, player.y, bounds);
    const a = ensureActor("player", player.characterId || "vienna", false);
    placeActorWorld(a, w.x, w.z, true);
    if (player.anim && player.anim !== a._netAnim) {
      applyNetworkAnim(a, player.anim);
      a._netAnim = player.anim;
    }
  }

  const otherEntries = Object.entries(others || {}).slice(0, 5);
  otherEntries.forEach(([id, p], idx) => {
    keep.add(id);
    const a = ensureActor(id, p.characterId || "cobalt", false);
    const w = gameToWorldLoc(p.x, p.y, bounds);
    const off = spawnOffsetForId(id, idx + 1);
    placeActorWorld(a, w.x + off.x, w.z + off.z, false);
    if (p.anim && p.anim !== a._netAnim) {
      applyNetworkAnim(a, p.anim);
      a._netAnim = p.anim;
    }
  });

  const heroId = player?.characterId || "vienna";
  (npcs || []).forEach(n => {
    if (n.id === heroId) return;
    const id = "npc_" + n.id;
    keep.add(id);
    const a = ensureActor(id, n.id, true);
    const wp = NPC_WORLD[location]?.[n.id] || gameToWorldLoc(n.x, n.y, bounds);
    const path = NPC_PATROL[location]?.[n.id];
    if (path?.length) {
      if (!a._patrol || a._patrolLoc !== location) {
        a._patrol = path;
        a._patrolLoc = location;
        a._patrolIdx = 0;
        a.wx = path[0].x;
        a.wz = path[0].z;
      }
    } else {
      a._patrol = null;
      a.wx = wp.x;
      a.wz = wp.z;
    }
    placeActorWorld(a, a.wx, a.wz, false, true);
  });

  actors.forEach((a, id) => {
    if (!keep.has(id)) {
      scene.remove(a.group);
      a.mixer?.stopAllAction();
      actors.delete(id);
    }
  });

  if (hasDog) {
    if (!actors.get("dog")) {
      const d = createDog();
      if (d) actors.set("dog", { ...d, id: "dog", isDog: true, wx: 0, wz: 0 });
    }
    const dog = actors.get("dog");
    const pl = actors.get("player");
    if (dog && pl) {
      syncDogBesidePlayer(pl);
      dog._placed = true;
    }
    keep.add("dog");
  } else if (actors.get("dog")) {
    scene.remove(actors.get("dog").group);
    actors.delete("dog");
  }

  ensureCar(location === "street" && (!!carVisible || locationProps.showCar));

  separateActors();

  const playerActor = actors.get("player");
  const spawnPref = currentLoc === "kitchen"
    ? { x: -2.8, z: -1.2 }
    : currentLoc === "elevator"
      ? { x: 0, z: -2.1 }
      : { x: 0, z: -1.2 };
  if (playerActor && pointInsideCollider(playerActor.wx, playerActor.wz, furnitureColliders, 0.38)) {
    const clear = findClearSpawn(bounds, furnitureColliders, spawnPref);
    playerActor.group.position.x = clear.x;
    playerActor.group.position.z = clear.z;
    playerActor.wx = clear.x;
    playerActor.wz = clear.z;
    if (bounds) {
      const g = worldToGameLoc(clear.x, clear.z, bounds);
      hooks.onMove?.(g.x, g.y);
    }
  }
  if (justChangedLoc) {
    const plActor = actors.get("player");
    if (plActor && currentLoc === "elevator") plActor.group.rotation.y = 0;
    resetCameraForLocation();
    const dogPl = actors.get("player");
    if (actors.get("dog") && dogPl) syncDogBesidePlayer(dogPl);
  }
}

function applyNetworkAnim(actor, anim) {
  const map = { talk: "talk", wave: "wave", sit: "sit", interact: "interact", run: "run", walk: "walk", idle: "idle", emote: "emote" };
  const key = resolveAnimName(map[anim] || "idle");
  if (key === "interact") playOneShot(actor, key, 1600);
  else if (key === "sit") fadeTo(actor, "sit");
  else fadeTo(actor, key);
}

function onPointer(e) {
  const canvas = document.getElementById("stage3d");
  if (!canvas || e.target !== canvas || !floorMesh || e.button !== 0) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(floorMesh, true);
  const hit = hits.find(h => h.object.isMesh);
  if (hit && bounds) {
    const g = worldToGameLoc(hit.point.x, hit.point.z, bounds);
    hooks.onMove?.(g.x, g.y);
  }
  let best = null;
  let bestD = 1.8;
  actors.forEach((a, id) => {
    if (!id.startsWith("npc_")) return;
    const d = Math.hypot(a.group.position.x - hit?.point.x, a.group.position.z - hit?.point.z);
    if (d < bestD) { bestD = d; best = id.replace("npc_", ""); }
  });
  if (best) hooks.onNpcClick?.(best);
}

function loop() {
  requestAnimationFrame(loop);
  if (!renderer || !modelsReady) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  sceneTime += dt;
  processInput(dt);
  tickNpcPatrols(dt);
  const pl = actors.get("player");
  if (pl && actors.get("dog")) updateDogFollow(dt, pl);
  if (pl) {
    pl._vy = (pl._vy || 0) - 14 * dt;
    let y = (pl.group.position.y || 0) + pl._vy * dt;
    if (y <= 0) { y = 0; pl._vy = 0; pl._onGround = true; }
    else pl._onGround = false;
    pl.group.position.y = y;
  }
  if (locationRoot) pulseScene(locationRoot, sceneTime);
  if (particles?.geometry?.attributes?.position) {
    const attr = particles.geometry.attributes.position;
    for (let i = 0; i < attr.count; i++) {
      let y = attr.getY(i) + Math.sin(sceneTime * 1.4 + i) * 0.0012;
      if (y > 5.5) y = 0.35;
      attr.setY(i, y);
    }
    attr.needsUpdate = true;
  }
  setQuestMarkerTarget(guideTarget, actors, sceneTime);
  const nearNpc = getNearestNpcId();
  const nearPortal = getNearPortal();
  const nearDog = getNearestDogId();
  hooks.onHints?.({ nearNpc, nearPortal, nearDog, location: currentLoc });
  const playerPos = pl ? pl.group.position : null;
  actors.forEach(a => {
    a.mixer?.update(dt);
    if (a._meshy && a.current !== "walk" && a.current !== "run") {
      ["walk", "run"].forEach(k => {
        const act = a.actions?.[k];
        if (!act || act.getEffectiveWeight() < 0.02) return;
        act.stop();
        act.setEffectiveWeight(0);
      });
    }
    markActorVisibleWhenReady(a);
    if (a._meshyDog) updateMeshyDogAnim(a, dt, a._anim === "hop" ? "hop" : "idle", a._spd || 0);
    if (a.root && !a.isDog) {
      const talk = talkingIds.has(a.characterId) || talkingIds.has(a.id.replace("npc_", ""));
      updateProcedural(a, dt, a.isNpc ? playerPos : null, talk);
    }
  });
  if (car) {
    car.x += car.dir * dt * 2.5;
    if (car.x > 6 || car.x < -8) car.dir *= -1;
    car.group.position.x = car.x;
    car.wheels.forEach(w => { w.rotation.x += dt * 5 * car.dir; });
  }
  if (particles) particles.rotation.y += dt * 0.02;
  separateActors();
  if (!captureFrameLock) updateThirdPersonCamera();
  else if (captureHideActors?.length) {
    renderAtmosphere(atmospherePipe, renderer, scene, camera);
    checkPortals();
    return;
  }
  checkPortals();
  renderAtmosphere(atmospherePipe, renderer, scene, camera);
}

function init(h) {
  hooks = h;
  const canvas = document.getElementById("stage3d");
  if (!canvas) return Promise.resolve(false);
  mobileQuality = window.matchMedia("(max-width: 900px)").matches;
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !mobileQuality,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(mobileQuality ? 1 : Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = !mobileQuality;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  scene.add(new THREE.HemisphereLight(0xfff0ff, 0x3a2848, 1.95));
  const fill = new THREE.DirectionalLight(0xb8e8ff, 1.15);
  fill.position.set(-4, 8, -3);
  scene.add(fill);
  const sun = new THREE.DirectionalLight(0xffffff, 1.95);
  sun.position.set(5, 12, 5);
  if (!mobileQuality) {
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
  }
  scene.add(sun);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  atmospherePipe = createAtmospherePipeline(renderer, scene, camera, !mobileQuality);

  canvas.addEventListener("pointerdown", onPointer);
  initControls3D(canvas, delta => { cameraYaw += delta; });
  initTouchControls({ onCameraOrbit: delta => { cameraYaw += delta; } });
  window.addEventListener("resize", resize);
  document.body.classList.add("mode-world3d");

  return loadModels().then(() => {
    resize();
    loop();
    hooks.onReady?.();
    return true;
  }).catch(err => {
    console.error("World3D load failed", err);
    return false;
  });
}

function applyViewportCameraProfile() {
  mobileQuality = window.matchMedia("(max-width: 900px)").matches;
  if (!camera) return;
  camera.fov = mobileQuality ? 48 : 42;
  camera.updateProjectionMatrix();
}

function resize() {
  const canvas = document.getElementById("stage3d");
  if (!canvas || !renderer) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  applyViewportCameraProfile();
  if (camera) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  atmospherePipe?.resize(w, h);
}

const api = {
  init, sync, resize, setLocation: rebuildLocation, setTalking,
  playEmote: (id, name) => {
    const a = actors.get(id || "player");
    if (!a) return;
    const resolved = resolveAnimName(name === "wave" ? "wave" : name);
    if (resolved === "idle") {
      fadeTo(a, "idle");
      return;
    }
    playOneShot(a, name === "sit" ? "sit" : "interact", 1500);
  },
  isReady: () => modelsReady,
  isDogActive: () => {
    const d = actors.get("dog");
    if (!d?.group) return false;
    return d.group.visible && d.group.parent === scene;
  },
  getLocation: () => currentLoc,
  getNearestNpc: getNearestNpcId,
  getNearestDog: getNearestDogId,
  getNearPortal,
  setGuideTarget: t => { guideTarget = t; },
  releaseCaptureFrame: () => {
    const a = actors.get("player");
    if (a) a.group.rotation.y = captureSavedRotY;
    if (captureHideActors) {
      captureHideActors.forEach(act => { act.group.visible = true; });
      captureHideActors = null;
    }
    captureFrameLock = false;
  },
  captureDogCloseup: () => {
    const dog = actors.get("dog");
    const pl = actors.get("player");
    if (!dog?.group || !pl || !renderer || !camera || !bounds) return false;
    captureFrameLock = true;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;
    captureHideActors = [];
    pl.group.visible = false;
    captureHideActors.push(pl);
    actors.forEach(a => {
      if (a.id.startsWith("npc_")) {
        a.group.visible = false;
        captureHideActors.push(a);
      }
    });
    dog.wx = cx;
    dog.wz = cz;
    dog.group.position.set(cx, 0, cz);
    dog.group.rotation.y = 0;
    dog._anim = "idle";
    updateMeshyDogAnim(dog, 0.4, "idle", 0);
    const p = dog.group.position;
    camera.position.set(p.x + 1.45, p.y + 0.5, p.z + 0.02);
    camera.lookAt(p.x, p.y + 0.4, p.z);
    if (locationRoot) pulseScene(locationRoot, sceneTime);
    renderAtmosphere(atmospherePipe, renderer, scene, camera);
    return true;
  },
  captureDogThreeQuarter: () => {
    const dog = actors.get("dog");
    const pl = actors.get("player");
    if (!dog?.group || !pl || !renderer || !camera || !bounds) return false;
    captureFrameLock = true;
    const cx = (bounds.minX + bounds.maxX) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;
    captureHideActors = [];
    pl.group.visible = false;
    captureHideActors.push(pl);
    actors.forEach(a => {
      if (a.id.startsWith("npc_")) {
        a.group.visible = false;
        captureHideActors.push(a);
      }
    });
    dog.wx = cx;
    dog.wz = cz;
    dog.group.position.set(cx, 0, cz);
    dog.group.rotation.y = 0.55;
    dog._anim = "idle";
    updateMeshyDogAnim(dog, 0.35, "idle", 0);
    const p = dog.group.position;
    camera.position.set(p.x + 1.05, p.y + 0.62, p.z + 1.35);
    camera.lookAt(p.x, p.y + 0.44, p.z);
    if (locationRoot) pulseScene(locationRoot, sceneTime);
    renderAtmosphere(atmospherePipe, renderer, scene, camera);
    return true;
  },
  captureCloseup: (pose = "idle") => {
    const a = actors.get("player");
    if (!a?.root) return false;
    captureFrameLock = true;
    const key = pose === "run" ? "run" : pose === "walk" ? "walk" : "idle";
    fadeTo(a, key);
    if (key === "walk" || key === "run") {
      a._spd = key === "run" ? 2.4 : 1.1;
      updateLocomotionTimeScale(a);
    }
    captureSavedRotY = a.group.rotation.y;
    if (pose === "front") a.group.rotation.y = Math.PI;
    for (let i = 0; i < 48; i++) {
      a.mixer?.update(1 / 30);
      updateProcedural(a, 1 / 30, null, false);
    }
    markActorVisibleWhenReady(a);
    a.root.visible = true;
    const p = a.group.position;
    if (pose === "front") {
      camera.position.set(p.x, p.y + 0.98, p.z - 2.85);
      camera.lookAt(p.x, p.y + 0.88, p.z);
    } else {
      camera.position.set(p.x + 1.35, p.y + 1.42, p.z + 2.15);
      camera.lookAt(p.x, p.y + 1.22, p.z);
    }
    renderAtmosphere(atmospherePipe, renderer, scene, camera);
    return true;
  },
  snapScreenshotView: () => {
    const a = actors.get("player");
    if (!a || !bounds || !renderer || !camera) return false;
    if (currentLoc === "elevator") a.group.rotation.y = 0;
    else a.group.rotation.y = 0.12;
    const dog = actors.get("dog");
    if (dog) syncDogBesidePlayer(a);
    resetCameraForLocation();
    captureFrameLock = true;
    if (locationRoot) pulseScene(locationRoot, sceneTime);
    setQuestMarkerTarget(guideTarget, actors, sceneTime);
    actors.forEach(act => act.mixer?.update(1 / 60));
    renderAtmosphere(atmospherePipe, renderer, scene, camera);
    return true;
  },
  nudgePlayer: (dx, dz, steps = 8) => {
    const a = actors.get("player");
    if (!a || !bounds) return;
    for (let i = 0; i < steps; i++) {
      const np = clampWorld(a.wx + dx, a.wz + dz);
      placeActorWorld(a, np.x, np.z, true);
      a.mixer?.update(1 / 30);
      updateProcedural(a, 1 / 30, null, false);
    }
  }
};
window.World3D = api;
window.Scene3D = api;
window.dispatchEvent(new Event("scene3d-ready"));
