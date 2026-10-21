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
  moveWithCollision,
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
  bindGameplayToWorld3D,
  onGameplayLocationBuilt,
  onGameplayLocationChanged,
  tickGameplayV21
} from "./world/gameplay-v21.mjs";
import {
  ensureMarkerRoot,
  setQuestMarkerTarget,
  setQuestMarkersVisible,
  clearQuestMarkers
} from "./world/quest-markers.mjs";
import { initTouchControls } from "./touch-controls.mjs";
import { buildHangoutVisual } from "./world/construction-hangout.mjs";
import { tickStory } from "./story/story-engine.mjs";
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
let elevatorCutawaySaved = null;
const talkingIds = new Set();
const texLoader = new THREE.TextureLoader();
let guideTarget = null;
let mobileQuality = false;
let locFillLight = null;
let atmospherePipe = null;
let motionProbe = null;
let dialogueCaptureBoost = null;
let dialogueKeyLight = null;
let dialogueBackdrop = null;
const heroCosmeticGroup = new THREE.Group();

function notePlayerMotion(actor) {
  if (!motionProbe || !actor?.isPlayer) return;
  if (motionProbe.frames.length >= motionProbe.need) return;
  const now = performance.now();
  const x = actor.wx;
  const z = actor.wz;
  const last = motionProbe.last;
  const d = last ? Math.hypot(x - last.x, z - last.z) : 0;
  const cam = camera;
  motionProbe.frames.push({
    t: now - motionProbe.start,
    x,
    z,
    d,
    cx: cam?.position.x ?? 0,
    cy: cam?.position.y ?? 0,
    cz: cam?.position.z ?? 0,
    spd: actor._locoSpeed ?? 0,
    anim: actor.current
  });
  motionProbe.last = { x, z };
  if (motionProbe.frames.length >= motionProbe.need && motionProbe.done) {
    const frames = motionProbe.frames.slice();
    const done = motionProbe.done;
    motionProbe = null;
    done({ frames, count: frames.length });
  }
}

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
  group.userData.isActor = true;
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
      const prevLoco = actor.current === "walk" || actor.current === "run" ? actor.current : null;
      actor.actions?.idle?.fadeOut(0.18);
      if (prevLoco && actor.actions[prevLoco] && prevLoco !== name) {
        const prev = actor.actions[prevLoco];
        next.setEffectiveWeight(0).play();
        prev.crossFadeTo(next, 0.2, false);
      } else {
        ["walk", "run"].forEach(k => {
          if (k === name) return;
          const act = actor.actions?.[k];
          act?.fadeOut(0.12);
          act?.setEffectiveWeight(0);
        });
        next.reset().setEffectiveWeight(1).fadeIn(0.2).play();
      }
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
  if (actor.isPlayer && actor._intentRun && speed > 0.05) return "run";
  const walkGate = actor._meshy ? 0.14 : 0.08;
  const prev = actor.current === "walk" || actor.current === "run" ? actor.current : "idle";
  if (prev === "run") {
    if (speed > 0.92) return "run";
    if (speed > walkGate * 0.75) return "walk";
    return "idle";
  }
  if (prev === "walk") {
    if (speed > 1.42) return "run";
    if (speed > walkGate * 0.65) return "walk";
    return "idle";
  }
  if (speed > 1.42) return "run";
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
  if (locId !== currentLoc) onGameplayLocationChanged(locId, currentLoc);
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
  onGameplayLocationBuilt(locId, locationRoot, bounds);
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
  const cols = furnitureColliders;
  return resolveWorldPosition(x, z, bounds, cols, radius);
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
          const wa = a.isPlayer ? 0 : 1;
          const wb = b.isPlayer ? 0 : 1;
          a._visPushX -= ux * push * wa;
          a._visPushZ -= uz * push * wa;
          b._visPushX += ux * push * wb;
          b._visPushZ += uz * push * wb;
        }
      }
    }
  }
  list.forEach(a => {
    if (a.isPlayer) {
      a.group.position.x = a.wx;
      a.group.position.z = a.wz;
      return;
    }
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
  const c =
    isPlayer && actor._fromLocomotion
      ? { x: wx, z: wz }
      : clampWorld(wx + offX, wz + offZ);
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
  const dist = Math.hypot(dx, dz);
  const now = performance.now();
  const lastT = actor._moveT || now;
  const dt = Math.max(0.001, Math.min(0.05, (now - lastT) / 1000));
  actor._moveT = now;
  let speed = dist / dt;
  if (actor.id.startsWith("demo_")) speed = 0;
  if (!isPlayer && isNpc && dist < 0.025) speed = 0;
  if (!isPlayer && actor._netAnim === "idle") speed = 0;
  const smooth = actor._locoSpeed ?? speed;
  actor._locoSpeed = smooth * 0.72 + speed * 0.28;
  actor._spd = actor._locoSpeed;
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

function resetOccluderOpacity() {
  if (!locationRoot) return;
  locationRoot.traverse(o => {
    if (!o.isMesh || !o.userData.cameraOccluder || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (!m) return;
      m.transparent = true;
      m.opacity = 1;
      m.depthWrite = true;
    });
  });
}

function boostActorCaptureLight(actor, on) {
  if (!actor?.group) return;
  actor.group.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (!m || m.isShaderMaterial) return;
      if (on) {
        if (m.userData._capBaseEmi === undefined) {
          m.userData._capBaseEmi = m.emissive?.getHex?.() ?? 0;
          m.userData._capBaseEmiI = m.emissiveIntensity ?? 0;
        }
        if (m.emissive) {
          m.emissive.set(0x554466);
          m.emissiveIntensity = Math.max(m.emissiveIntensity ?? 0, 0.55);
        }
      } else if (m.userData._capBaseEmi !== undefined) {
        m.emissive?.setHex?.(m.userData._capBaseEmi);
        m.emissiveIntensity = m.userData._capBaseEmiI ?? 0.2;
        delete m.userData._capBaseEmi;
        delete m.userData._capBaseEmiI;
      }
    });
  });
}

function resetPropDimOpacity() {
  if (!locationRoot) return;
  locationRoot.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (!m?.userData?._baseOpacitySaved) return;
      m.opacity = m.userData._baseOpacity ?? 1;
      m.transparent = m.userData._baseTransparent ?? false;
      m.depthWrite = true;
    });
  });
}

function logElevatorScreenshotRay() {
  const pl = actors.get("player");
  if (!locationRoot || !camera || !raycaster || currentLoc !== "elevator" || !pl) return [];
  const target = new THREE.Vector3(pl.wx, 0.95, pl.wz);
  const dir = target.clone().sub(camera.position).normalize();
  raycaster.set(camera.position, dir);
  const meshes = [];
  locationRoot.traverse(o => {
    if (o.isMesh && o.visible) meshes.push(o);
  });
  return raycaster.intersectObjects(meshes, false).slice(0, 16).map(h => ({
    dist: +h.distance.toFixed(3),
    cut: !!h.object.userData.elevatorCutaway,
    pos: h.object.position.toArray().map(v => +v.toFixed(2)),
    geo: h.object.geometry?.parameters
      ? `${h.object.geometry.parameters.width ?? "?"}x${h.object.geometry.parameters.height ?? "?"}x${h.object.geometry.parameters.depth ?? "?"}`
      : h.object.type
  }));
}

function setElevatorCutaway(active) {
  if (!locationRoot || currentLoc !== "elevator") return;
  if (!active) {
    if (!elevatorCutawaySaved) return;
    elevatorCutawaySaved.forEach(({ mesh, visible, mats }) => {
      mesh.visible = visible;
      mats.forEach(({ m, transparent, opacity, depthWrite }) => {
        m.transparent = transparent;
        m.opacity = opacity;
        m.depthWrite = depthWrite;
      });
    });
    elevatorCutawaySaved = null;
    return;
  }
  if (elevatorCutawaySaved) return;
  elevatorCutawaySaved = [];
  locationRoot.traverse(o => {
    if (!o.isMesh || !o.userData.elevatorCutaway) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    elevatorCutawaySaved.push({
      mesh: o,
      visible: o.visible,
      mats: mats.map(m => ({
        m,
        transparent: m.transparent,
        opacity: m.opacity,
        depthWrite: m.depthWrite
      }))
    });
    o.visible = false;
  });
}

function dimPropsBetweenCameraAnd(tx, ty, tz, opacity = 0.15) {
  if (!locationRoot || !camera || !raycaster) return;
  const eye = camera.position.clone();
  const aim = new THREE.Vector3(tx, ty, tz);
  const dir = aim.clone().sub(eye);
  const maxD = dir.length();
  if (maxD < 0.2) return;
  dir.normalize();
  raycaster.set(eye, dir);
  const meshes = [];
  locationRoot.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const tag = o.userData?.propTag || o.parent?.userData?.propTag;
    if (!tag) return;
    meshes.push(o);
  });
  const hits = raycaster.intersectObjects(meshes, false);
  const hitSet = new Set(hits.filter(h => h.distance < maxD - 0.15).map(h => h.object));
  locationRoot.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const tag = o.userData?.propTag || o.parent?.userData?.propTag;
    if (!tag) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (!m) return;
      if (!m.userData._baseOpacitySaved) {
        m.userData._baseOpacitySaved = true;
        m.userData._baseOpacity = m.opacity ?? 1;
        m.userData._baseTransparent = m.transparent;
      }
      const fade = hitSet.has(o);
      m.transparent = true;
      m.opacity = fade ? opacity : m.userData._baseOpacity ?? 1;
      m.depthWrite = !fade;
    });
  });
}

function updateCameraOccluders() {
  if (LOCATION_CAMERA[currentLoc]?.fixed) {
    resetOccluderOpacity();
    return;
  }
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
  elevator: {
    fixed: true,
    fov: 34,
    pos: [0.35, 1.78, 4.25],
    look: [0, 0.94, 0.04],
    player: { x: 0, z: 0.2, yaw: 0 },
    dog: { dx: 0.76, dz: -0.06 },
    mobile: {
      portraitFromPlayer: true,
      fov: 48,
      camOffset: [0.12, 2.38, 6.93],
      lookAtPlayerY: 0.92,
      player: { x: 0, z: 0.2, yaw: 0 },
      dog: { dx: 0.7, dz: -0.04 }
    }
  },
  street: { dist: 6.85, height: 2.55, lookY: 1.32, yaw: 0.38 },
  city: { dist: 7.2, height: 2.62, lookY: 1.34, yaw: 0.28 },
  cemetery: { dist: 7.0, height: 2.5, lookY: 1.3, yaw: 0.32 },
  roof: { dist: 7.4, height: 2.7, lookY: 1.36, yaw: 0.25 },
  toilet: { dist: 4.5, height: 2.38, lookY: 1.24, yaw: 0.22 },
  kitchen: {
    fixed: true,
    fov: 56,
    pos: [0.34, 2.48, 5.85],
    look: [0.08, 1.26, -2.55],
    player: { x: 0, z: 0.28, yaw: Math.PI },
    dog: { dx: 0.82, dz: 0.22 },
    mobile: {
      portraitFromPlayer: true,
      fov: 48,
      camOffset: [0.12, 2.38, 6.46],
      lookAtPlayerY: 0.92,
      player: { x: 0, z: -2.12, yaw: 0 },
      dog: { dx: 0.7, dz: -0.04 }
    }
  }
};

function getFixedLocationShot() {
  const spec = LOCATION_CAMERA[currentLoc];
  if (!spec?.fixed) return spec;
  if (!mobileQuality || !spec.mobile) return spec;
  const m = spec.mobile;
  return {
    ...spec,
    mobile: m,
    fov: m.fov ?? spec.fov,
    pos: m.pos ?? spec.pos,
    look: m.look ?? spec.look,
    player: { ...spec.player, ...m.player },
    dog: { ...spec.dog, ...m.dog }
  };
}

function projectWorldToScreen(wx, wy, wz) {
  const canvas = document.getElementById("stage3d");
  if (!canvas || !camera) return null;
  const v = new THREE.Vector3(wx, wy, wz);
  v.project(camera);
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h };
}

function resetActorStanding(actor) {
  if (!actor?.group) return;
  actor._vy = 0;
  actor._onGround = true;
  actor._holdAnim = null;
  actor._holdUntil = 0;
  actor.group.position.y = 0;
  actor.group.rotation.x = 0;
  actor.group.rotation.z = 0;
}

function freezeActorIdleForCapture(actor) {
  if (!actor) return;
  resetActorStanding(actor);
  if (!actor.isDog) {
    fadeTo(actor, "idle");
    actor._spd = 0;
  } else {
    fadeToDog(actor, "idle");
  }
  for (let i = 0; i < 36; i++) {
    actor.mixer?.update(1 / 30);
    updateProcedural(actor, 1 / 30, null, false);
  }
}

function applyMobilePortraitShowcaseFromPlayer(shot) {
  const pl = actors.get("player");
  if (!pl || !camera || !mobileQuality) return;
  const mob = shot?.mobile || LOCATION_CAMERA[currentLoc]?.mobile;
  const off = mob?.camOffset ?? [0.12, 2.38, 6.93];
  const lookY = mob?.lookAtPlayerY ?? 0.92;
  const px = pl.wx;
  const pz = pl.wz;
  camera.position.set(px + off[0], off[1], pz + off[2]);
  camera.lookAt(px, lookY, pz);
  camera.fov = shot.fov ?? mob?.fov ?? 48;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
}

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

function applyFixedLocationActors() {
  const spec = getFixedLocationShot();
  if (!spec?.player) return;
  const pl = actors.get("player");
  if (pl && spec.player) {
    pl.wx = spec.player.x;
    pl.wz = spec.player.z;
    pl.group.position.set(spec.player.x, 0, spec.player.z);
    if (spec.player.yaw != null) pl.group.rotation.y = spec.player.yaw;
  }
  const dog = actors.get("dog");
  if (dog && pl) {
    if (spec.dog) {
      dog.wx = pl.wx + spec.dog.dx;
      dog.wz = pl.wz + spec.dog.dz;
      const c = clampWorld(dog.wx, dog.wz);
      dog.wx = c.x;
      dog.wz = c.z;
    } else {
      syncDogBesidePlayer(pl);
    }
    dog.group.position.set(dog.wx, 0, dog.wz);
    dog.group.visible = true;
    if (dog.root) dog.root.visible = true;
  }
}

let lastCameraDt = 1 / 60;

function positionCameraBehindPlayer(instant = false, dt = lastCameraDt) {
  const player = actors.get("player");
  if (!player || !camera) return;
  const fixed = getFixedLocationShot();
  if (fixed?.fixed) {
    if (fixed.fov && camera.fov !== fixed.fov) {
      camera.fov = fixed.fov;
      camera.updateProjectionMatrix();
    }
    camera.position.set(fixed.pos[0], fixed.pos[1], fixed.pos[2]);
    camera.lookAt(fixed.look[0], fixed.look[1], fixed.look[2]);
    updateCameraOccluders();
    return;
  }
  const p = player.group.position;
  const { dist, height, lookY } = cameraFollowProfile();
  const ox = Math.sin(cameraYaw) * dist;
  const oz = Math.cos(cameraYaw) * dist;
  const eye = p.clone().add(new THREE.Vector3(0, lookY - 0.15, 0));
  let target = new THREE.Vector3(p.x + ox, height, p.z + oz);
  target = resolveCameraWallCollision(eye, target);
  const t = instant ? 1 : 1 - Math.exp(-14 * Math.max(dt, 0.001));
  if (instant) camera.position.copy(target);
  else camera.position.lerp(target, t);
  const lookAhead = LOCATION_CAMERA[currentLoc]?.lookAhead ?? 0;
  const look = new THREE.Vector3(p.x, lookY, p.z + lookAhead);
  if (!instant && camera._lookTarget) {
    camera._lookTarget.lerp(look, t);
    camera.lookAt(camera._lookTarget);
  } else {
    camera._lookTarget = look.clone();
    camera.lookAt(look);
  }
  updateCameraOccluders();
}

function resetCameraForLocation() {
  applyViewportCameraProfile();
  const fixedShot = getFixedLocationShot();
  const fixedFov = fixedShot?.fov;
  if (fixedFov && camera) {
    camera.fov = fixedFov;
    camera.updateProjectionMatrix();
  }
  cameraYaw = LOCATION_CAMERA[currentLoc]?.yaw ?? 0.38;
  positionCameraBehindPlayer(true);
}

function updateThirdPersonCamera(dt = lastCameraDt) {
  positionCameraBehindPlayer(false, dt);
  const pl = actors.get("player");
  if (pl && !captureFrameLock) dimPropsBetweenCameraAnd(pl.wx, 1.05, pl.wz, 0.22);
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
  if (motionProbe || captureFrameLock) return;
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

const LOCO_DT = 1 / 60;

function processInput(dt) {
  const player = actors.get("player");
  if (!player || !bounds) return;
  const input = getInputState();
  const step = (motionProbe || input.run ? 7.2 : 4.5) * LOCO_DT;
  let mx = 0;
  let mz = 0;
  if (motionProbe) {
    const dirZ = motionProbe.moveZ ?? 1;
    const dirX = motionProbe.moveX ?? 0;
    const mag = Math.hypot(dirX, dirZ) || 1;
    mx = (dirX / mag) * step;
    mz = (dirZ / mag) * step;
  } else {
    const fwd = new THREE.Vector3(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    const mag = Math.hypot(input.moveX, input.moveZ);
    if (mag > 0.05) {
      const nx = input.moveX / mag;
      const nz = input.moveZ / mag;
      mx = (fwd.x * nz + right.x * nx) * step;
      mz = (fwd.z * nz + right.z * nx) * step;
    }
  }
  if (mx !== 0 || mz !== 0) {
    const cols = furnitureColliders;
    const moved = moveWithCollision(player.wx, player.wz, mx, mz, bounds, cols, 0.42);
    const px = moved.x;
    const pz = moved.z;
    player._intentRun = motionProbe ? true : input.run;
    player._fromLocomotion = true;
    placeActorWorld(player, px, pz, true);
    player._fromLocomotion = false;
    player._gameSyncT = (player._gameSyncT || 0) - dt;
    if (!motionProbe && player._gameSyncT <= 0) {
      player._gameSyncT = 0.1;
      const g = worldToGameLoc(px, pz, bounds);
      hooks.onMove?.(g.x, g.y, { sync3d: false });
      window.StoryEngine?.onPlayerMove?.();
    }
  } else {
    player._locoSpeed = (player._locoSpeed || 0) * 0.55;
    player._spd = player._locoSpeed;
    fadeTo(player, pickLocomotionAnim(player, player._locoSpeed, false));
    updateLocomotionTimeScale(player);
  }
  if (consumeJump() && (player._onGround ?? true)) {
    player._vy = 5.2;
    player._onGround = false;
  }
  if (consumeInteract()) {
    window._lastInteract = true;
    hooks.onInteract?.();
  }
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
    setElevatorCutaway(false);
    const dogActor = actors.get("dog");
    if (dogActor) dogActor._placed = false;
  }
  if (justChangedLoc && location === "elevator" && player && bounds) {
    const g = worldToGameLoc(0, 0.2, bounds);
    hooks.onMove?.(g.x, g.y);
  }
  if (justChangedLoc && location === "kitchen" && player && bounds) {
    const g = worldToGameLoc(-0.12, 0.36, bounds);
    hooks.onMove?.(g.x, g.y);
  }

  const keep = new Set(["player"]);
  if (player) {
    const a = ensureActor("player", player.characterId || "vienna", false);
    if (!motionProbe) {
      const w = gameToWorldLoc(player.x, player.y, bounds);
      placeActorWorld(a, w.x, w.z, true);
    }
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
    const a = ensureActor(id, n.characterId || n.id, true);
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

  const playerActor = actors.get("player");
  const spawnPref = currentLoc === "kitchen"
    ? { x: -0.12, z: 0.36 }
    : currentLoc === "elevator"
      ? { x: 0, z: 0.02 }
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
    applyFixedLocationActors();
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
    if (window.me?._decorMode) {
      if (api.decorPointerDown?.(hit.point.x, hit.point.z)) return;
      window.decorPlaceAtWorld?.(hit.point.x, hit.point.z);
      return;
    }
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
  separateActors();
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
  if (captureFrameLock) setQuestMarkersVisible(false);
  else {
    setQuestMarkersVisible(true);
    setQuestMarkerTarget(guideTarget, actors, sceneTime);
  }
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
  if (motionProbe && pl?.isPlayer) notePlayerMotion(pl);
  tickGameplayV21(dt, { actors, scene, locationRoot, bounds, currentLoc, hooks, camera });
  tickStory(dt);
  lastCameraDt = dt;
  if (!captureFrameLock) updateThirdPersonCamera(dt);
  else if (captureHideActors?.length && !motionProbe) {
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
    powerPreference: "high-performance",
    preserveDrawingBuffer: true
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
  canvas.addEventListener("pointermove", e => {
    if (e.target !== canvas) return;
    api.updateDecorGhostFromEvent?.(e);
  });
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
  getDebugCamera: () => {
    const pl = actors.get("player");
    const dog = actors.get("dog");
    return {
      loc: currentLoc,
      pos: camera ? camera.position.toArray() : null,
      fov: camera?.fov,
      player: pl ? [pl.wx, pl.wz, pl.group.rotation.y] : null,
      dog: dog ? [dog.wx, dog.wz] : null,
      rootName: locationRoot?.name
    };
  },
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
  refreshHangoutStage: stage => {
    if (locationRoot && currentLoc === "construction") buildHangoutVisual(stage, locationRoot);
  },
  releaseCaptureFrame: () => {
    const a = actors.get("player");
    if (a) a.group.rotation.y = captureSavedRotY;
    if (captureHideActors) {
      captureHideActors.forEach(act => { if (act.group) act.group.visible = true; });
      captureHideActors = null;
    }
    setElevatorCutaway(false);
    resetPropDimOpacity();
    resetOccluderOpacity();
    if (dialogueCaptureBoost) {
      if (scene.fog && dialogueCaptureBoost.fogD != null) scene.fog.density = dialogueCaptureBoost.fogD;
      if (dialogueCaptureBoost.exp != null) renderer.toneMappingExposure = dialogueCaptureBoost.exp;
      if (scene.background?.setHex && dialogueCaptureBoost.bg != null) scene.background.setHex(dialogueCaptureBoost.bg);
      if (dialogueCaptureBoost.hemi != null) {
        scene.traverse(c => {
          if (c.isHemisphereLight) c.intensity = dialogueCaptureBoost.hemi;
        });
      }
      dialogueCaptureBoost = null;
    }
    if (locFillLight) locFillLight.intensity = 3.2;
    if (dialogueKeyLight) dialogueKeyLight.visible = false;
    if (dialogueBackdrop) dialogueBackdrop.visible = false;
    const pl = actors.get("player");
    actors.forEach(a => {
      if (a.isPlayer || a.id?.startsWith("npc_")) boostActorCaptureLight(a, false);
    });
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
  measureDialogueFraming: (npcId = "mohawk") => {
    const canvas = document.getElementById("stage3d");
    const cw = canvas?.clientWidth || 1;
    const ch = canvas?.clientHeight || 1;
    const headY = 1.72;
    if (camera) camera.updateMatrixWorld(true);
    const plA = actors.get("player");
    const npcA = actors.get(`npc_${npcId}`);
    plA?.group?.updateMatrixWorld(true);
    npcA?.group?.updateMatrixWorld(true);
    const norm = actor => {
      if (!actor?.group) return null;
      const wx = actor.wx ?? actor.group.position.x;
      const wz = actor.wz ?? actor.group.position.z;
      const p = projectWorldToScreen(wx, headY, wz);
      if (!p) return null;
      return { x: p.x / cw, y: p.y / ch, px: p.x, py: p.y };
    };
    const player = norm(actors.get("player"));
    const npc = norm(actors.get(`npc_${npcId}`));
    const reasons = [];
    const check = (tag, pt) => {
      if (!pt) {
        reasons.push(`${tag}_missing`);
        return false;
      }
      let ok = true;
      if (pt.y >= 0.55) {
        reasons.push(`${tag}_y_high`);
        ok = false;
      }
      if (pt.x < 0.15 || pt.x > 0.85) {
        reasons.push(`${tag}_x_oob`);
        ok = false;
      }
      return ok;
    };
    const pass = check("player", player) && check("npc", npc);
    if (camera) camera.updateMatrixWorld(true);
    return { pass, player, npc, reasons };
  },
  renderCaptureFrame: () => {
    if (!renderer || !camera) return false;
    renderAtmosphere(atmospherePipe, renderer, scene, camera);
    return true;
  },
  snapDialogueNpcShot: (npcId = "mohawk") => {
    const pl = actors.get("player");
    if (!pl || !camera || !renderer) return false;
    resetPropDimOpacity();
    resetOccluderOpacity();
    if (captureHideActors) {
      captureHideActors.forEach(act => { if (act.group) act.group.visible = true; });
      captureHideActors = null;
    }
    captureHideActors = [];
    actors.forEach((act, id) => {
      if (id === "player" || id === "dog" || id === `npc_${npcId}`) return;
      act.group.visible = false;
      captureHideActors.push(act);
    });
    if (car?.group) {
      car.group.visible = false;
      captureHideActors.push({ group: car.group, _carHide: true });
    }
    const npcKey = `npc_${npcId}`;
    const npc = ensureActor(npcKey, npcId, true);
    actors.forEach((a, id) => {
      if (!id.startsWith("npc_")) return;
      a.group.visible = id === npcKey;
    });
    npc._patrol = null;
    npc._patrolLoc = null;
    const midZ = bounds ? (bounds.minZ + bounds.maxZ) * 0.5 - 0.65 : -0.4;
    const sep = npcId === "razor"
      ? (mobileQuality ? 1.72 : 2.55)
      : (mobileQuality ? 1.85 : 2.75);
    const shiftX = npcId === "razor"
      ? (mobileQuality ? 0.78 : 0.94)
      : (mobileQuality ? 0.82 : 0.68);
    const px = shiftX - sep * 0.5;
    const ax = shiftX + sep * 0.5;
    const pz = midZ;
    const az = midZ;
    const plYaw = Math.atan2(ax - px, az - pz);
    const npcYaw = Math.atan2(px - ax, pz - az) + 0.38;
    pl.wx = px;
    pl.wz = pz;
    npc.wx = ax;
    npc.wz = az;
    pl._vy = 0;
    pl._onGround = true;
    npc._vy = 0;
    npc._onGround = true;
    placeActorWorld(pl, px, pz, true);
    placeActorWorld(npc, ax, az, false, true);
    pl.group.position.y = 0;
    npc.group.position.y = 0;
    pl.group.rotation.set(0, plYaw, 0);
    npc.group.rotation.set(0, npcYaw, 0);
    let camX = shiftX;
    let camY = mobileQuality ? 1.58 : 1.66;
    let camZ = midZ + (mobileQuality ? 5.35 : 6.15);
    let lookX = shiftX;
    let lookY = 1.36;
    let lookZ = midZ;
    camera.fov = mobileQuality ? 42 : 38;
    const canvas = document.getElementById("stage3d");
    const cw = canvas?.clientWidth || 1;
    const ch = canvas?.clientHeight || 1;
    const headY = 1.72;
    const normHead = actor => {
      if (!actor?.group) return null;
      const wx = actor.wx ?? actor.group.position.x;
      const wz = actor.wz ?? actor.group.position.z;
      const p = projectWorldToScreen(wx, headY, wz);
      if (!p) return null;
      return { x: p.x / cw, y: p.y / ch };
    };
    const panScale = mobileQuality ? 6.5 : 4.6;
    for (let pass = 0; pass < 18; pass++) {
      camera.position.set(camX, camY, camZ);
      camera.lookAt(lookX, lookY, lookZ);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
      pl.group.updateMatrixWorld(true);
      npc.group.updateMatrixWorld(true);
      const playerPt = normHead(pl);
      const npcPt = normHead(npc);
      if (!playerPt || !npcPt) break;
      const minX = Math.min(playerPt.x, npcPt.x);
      const maxX = Math.max(playerPt.x, npcPt.x);
      const maxY = Math.max(playerPt.y, npcPt.y);
      const safeMinX = mobileQuality ? 0.2 : 0.17;
      const safeMaxX = mobileQuality ? 0.8 : 0.83;
      const okX = minX >= safeMinX && maxX <= safeMaxX;
      const okY = maxY < 0.52 && maxY > 0.22;
      if (okX && okY) break;
      if (minX < safeMinX) {
        const err = safeMinX - minX;
        camX += err * panScale;
        lookX += err * (panScale * 0.55);
      }
      if (maxX > safeMaxX) {
        const err = maxX - safeMaxX;
        camX -= err * panScale;
        lookX -= err * (panScale * 0.55);
      }
      if (maxY >= 0.5) {
        camZ += 0.35;
        camY += 0.05;
      } else if (maxY < 0.26) {
        camZ -= 0.35;
      }
    }
    camera.position.set(camX, camY, camZ);
    camera.lookAt(lookX, lookY, lookZ);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld(true);
    pl.group.updateMatrixWorld(true);
    npc.group.updateMatrixWorld(true);
    for (let fin = 0; fin < 14; fin++) {
      const fp = normHead(pl);
      const fn = normHead(npc);
      if (!fp || !fn) break;
      const minX = Math.min(fp.x, fn.x);
      const maxX = Math.max(fp.x, fn.x);
      let nudged = false;
      if (minX < 0.15) {
        const err = 0.16 - minX;
        camX += err * 9.5;
        lookX += err * 5.8;
        nudged = true;
      }
      if (fp && fp.x < 0.15) {
        const err = 0.16 - fp.x;
        camX += err * 4.2;
        lookX += err * 2.6;
        nudged = true;
      }
      if (maxX > 0.85) {
        const err = maxX - 0.84;
        camX -= err * (mobileQuality ? 8.5 : 6.5);
        lookX -= err * (mobileQuality ? 5.2 : 4.2);
        nudged = true;
      }
      if (fp && fp.x > (mobileQuality ? 0.83 : 0.85)) {
        const target = mobileQuality ? 0.8 : 0.84;
        const err = fp.x - target;
        camX -= err * (mobileQuality ? 12 : 7);
        lookX -= err * (mobileQuality ? 7 : 4.5);
        nudged = true;
      }
      if (fn && fn.x > 0.85) {
        const err = fn.x - 0.84;
        camX -= err * 7;
        lookX -= err * 4.2;
        nudged = true;
      }
      if (!nudged) break;
      camera.position.set(camX, camY, camZ);
      camera.lookAt(lookX, lookY, lookZ);
      camera.updateProjectionMatrix();
      camera.updateMatrixWorld(true);
    }
    pl.group.updateMatrixWorld(true);
    npc.group.updateMatrixWorld(true);
    if (npcId === "razor" && !mobileQuality) {
      for (let rz = 0; rz < 6; rz++) {
        const fp = normHead(pl);
        if (!fp || fp.x >= 0.16) break;
        const err = 0.17 - fp.x;
        camX += err * 14;
        lookX += err * 8.5;
        camera.position.set(camX, camY, camZ);
        camera.lookAt(lookX, lookY, lookZ);
        camera.updateProjectionMatrix();
        camera.updateMatrixWorld(true);
        pl.group.updateMatrixWorld(true);
        npc.group.updateMatrixWorld(true);
      }
    }
    pl.group.visible = true;
    npc.group.visible = true;
    if (locFillLight) {
      locFillLight.intensity = 11;
      locFillLight.position.set(lookX, lookY + 2.4, lookZ + 0.5);
    }
    dialogueCaptureBoost = { fogD: scene.fog?.density, exp: renderer.toneMappingExposure, bg: scene.background?.getHex?.(), hemi: null };
    scene.traverse(c => {
      if (c.isHemisphereLight) {
        dialogueCaptureBoost.hemi = c.intensity;
        c.intensity = 4.8;
      }
    });
    if (scene.fog?.density != null) scene.fog.density = 0.0018;
    if (scene.background?.setHex) scene.background.setHex(0x2a2438);
    renderer.toneMappingExposure = 2.15;
    if (!dialogueKeyLight) {
      dialogueKeyLight = new THREE.DirectionalLight(0xfff4ff, 4.2);
      dialogueKeyLight.castShadow = false;
      scene.add(dialogueKeyLight);
      scene.add(dialogueKeyLight.target);
    }
    dialogueKeyLight.position.set(camX + 0.4, camY + 3.2, camZ + 0.8);
    dialogueKeyLight.target.position.set(lookX, 1.48, lookZ);
    dialogueKeyLight.target.updateMatrixWorld();
    dialogueKeyLight.visible = true;
    if (locationRoot && !dialogueBackdrop) {
      dialogueBackdrop = new THREE.Mesh(
        new THREE.PlaneGeometry(5.5, 2.8),
        new THREE.MeshStandardMaterial({
          color: 0x3a3348,
          emissive: 0x443355,
          emissiveIntensity: 0.12,
          roughness: 0.9
        })
      );
      dialogueBackdrop.userData.propTag = "dialogue_capture_backdrop";
      locationRoot.add(dialogueBackdrop);
    }
    if (dialogueBackdrop) dialogueBackdrop.visible = false;
    boostActorCaptureLight(pl, true);
    boostActorCaptureLight(npc, true);
    document.getElementById("storyDialog")?.classList.add("story-dialog-cinematic");
    guideTarget = null;
    setQuestMarkersVisible(false);
    setTalking(npcId, true);
    freezeActorIdleForCapture(pl);
    freezeActorIdleForCapture(npc);
    boostActorCaptureLight(pl, true);
    boostActorCaptureLight(npc, true);
    const dogActor = actors.get("dog");
    if (dogActor) {
      dogActor.group.visible = false;
      captureHideActors.push(dogActor);
    }
    captureFrameLock = true;
    captureSavedRotY = pl.group.rotation.y;
    if (locationRoot) pulseScene(locationRoot, sceneTime);
    renderAtmosphere(atmospherePipe, renderer, scene, camera);
    return true;
  },
  snapScreenshotView: () => {
    const a = actors.get("player");
    if (!a || !bounds || !renderer || !camera) return false;
    if (captureHideActors) {
      captureHideActors.forEach(act => { if (act.group) act.group.visible = true; });
      captureHideActors = null;
    }
    captureHideActors = [];
    actors.forEach((act, id) => {
      if (id === "player" || id === "dog") return;
      act.group.visible = false;
      captureHideActors.push(act);
    });
    if (car?.group) {
      car.group.visible = false;
      captureHideActors.push({ group: car.group, _carHide: true });
    }
    applyViewportCameraProfile();
    const shot = getFixedLocationShot();
    if (shot?.player) applyFixedLocationActors();
    else {
      a.group.rotation.y = 0.12;
      syncDogBesidePlayer(a);
    }
    freezeActorIdleForCapture(a);
    const dogActor = actors.get("dog");
    if (dogActor) freezeActorIdleForCapture(dogActor);
    resetCameraForLocation();
    if (shot?.fixed) {
      if (currentLoc === "elevator") setElevatorCutaway(true);
      else setElevatorCutaway(false);
      if (mobileQuality && shot.mobile?.portraitFromPlayer) {
        applyMobilePortraitShowcaseFromPlayer(shot);
      } else {
        camera.position.set(shot.pos[0], shot.pos[1], shot.pos[2]);
        camera.lookAt(shot.look[0], shot.look[1], shot.look[2]);
        if (shot.fov) {
          camera.fov = shot.fov;
          camera.updateProjectionMatrix();
        }
      }
      resetOccluderOpacity();
      if (currentLoc === "elevator" && typeof console !== "undefined") {
        console.info("[elevator-shot] ray hits " + JSON.stringify(logElevatorScreenshotRay()));
      }
    }
    document.getElementById("howToOverlay")?.classList.remove("active");
    captureFrameLock = true;
    guideTarget = null;
    if (locationRoot) pulseScene(locationRoot, sceneTime);
    setQuestMarkerTarget(null, actors, sceneTime);
    actors.forEach(act => act.mixer?.update(1 / 60));
    const capPl = actors.get("player");
    if (capPl) dimPropsBetweenCameraAnd(capPl.wx, 1.05, capPl.wz, 0.2);
    renderAtmosphere(atmospherePipe, renderer, scene, camera);
    return true;
  },
  getShowcaseScreenProjection: () => {
    const pl = actors.get("player");
    const dog = actors.get("dog");
    const canvas = document.getElementById("stage3d");
    if (!pl || !canvas || !camera) return { ok: false };
    const footY = 0.06;
    const headY = 1.78;
    const hero = projectWorldToScreen(pl.wx, footY, pl.wz);
    const heroHead = projectWorldToScreen(pl.wx, headY, pl.wz);
    const floorPts = [
      [pl.wx, 0, pl.wz + 1.2],
      [pl.wx - 1.4, 0, pl.wz + 2.4],
      [pl.wx + 1.4, 0, pl.wz + 2.4],
      [pl.wx, 0, pl.wz + 3.6]
    ];
    const floor = floorPts.map(([x, y, z]) => projectWorldToScreen(x, y, z)).filter(Boolean);
    const heroScreenH = hero && heroHead ? hero.y - heroHead.y : null;
    const floorMaxY = floor.length ? Math.max(...floor.map(p => p.y)) : null;
    return {
      ok: true,
      location: currentLoc,
      mobile: mobileQuality,
      viewport: { w: canvas.clientWidth, h: canvas.clientHeight },
      hero,
      heroHead,
      heroScreenH,
      heroChest: projectWorldToScreen(pl.wx, 1.02, pl.wz),
      dog: dog ? projectWorldToScreen(dog.wx, footY, dog.wz) : null,
      floorMaxY,
      floor
    };
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
  },
  isMotionProbeActive: () => !!motionProbe,
  startMotionProbe: (need = 120, scenario = "free") => {
    captureFrameLock = false;
    if (captureHideActors) {
      captureHideActors.forEach(act => { if (act.group) act.group.visible = true; });
      captureHideActors = null;
    }
    resetPropDimOpacity();
    resetOccluderOpacity();
    const pl = actors.get("player");
    const cols = furnitureColliders;
    const cx = bounds ? (bounds.minX + bounds.maxX) * 0.5 : 0;
    const cz = bounds ? (bounds.minZ + bounds.maxZ) * 0.5 : -1.2;
    const pickFreeSpawn = () => {
      if (!bounds) return { x: 0, z: -1.4 };
      const xs = [];
      for (let x = bounds.minX + 1.4; x <= bounds.maxX - 1.4; x += 0.85) xs.push(x);
      for (const sx of xs) {
        for (let z = bounds.minZ + 1.1; z < bounds.minZ + 3.2; z += 0.3) {
          let clear = true;
          for (let s = 0; s < 90; s++) {
            const pz = z + s * 0.12;
            if (pz > bounds.maxZ - 1.05) break;
            if (pointInsideCollider(sx, pz, cols, 0.38)) {
              clear = false;
              break;
            }
          }
          if (clear) return resolveWorldPosition(sx, z, bounds, cols, 0.42);
        }
      }
      return findClearSpawn(bounds, cols, { x: cx, z: bounds.minZ + 1.2 });
    };
    let spawn = bounds ? pickFreeSpawn() : { x: 0, z: -1.4 };
    let moveX = 0;
    let moveZ = 1;
    const baseYaw = LOCATION_CAMERA[currentLoc]?.yaw ?? 0.38;
    if (bounds && scenario === "free") {
      if (currentLoc === "room") {
        spawn = resolveWorldPosition(bounds.maxX - 1.75, bounds.minZ + 1.15, bounds, cols, 0.42);
      } else {
        spawn = pickFreeSpawn();
      }
      moveZ = 1;
    } else if (bounds && scenario === "wall") {
      const wallPref = {
        x: cx,
        z: bounds.minZ + (currentLoc === "street" ? 2.15 : 1.85)
      };
      spawn = findClearSpawn(bounds, cols, wallPref);
      moveX = 1;
      moveZ = 0;
    } else if (bounds && scenario === "slide") {
      const slidePref = {
        x: bounds.maxX - (currentLoc === "street" ? 2.55 : 2.1),
        z: cz
      };
      spawn = findClearSpawn(bounds, cols, slidePref);
      moveX = 0;
      moveZ = 1;
    }
    if (pl) {
      pl._visPushX = 0;
      pl._visPushZ = 0;
      placeActorWorld(pl, spawn.x, spawn.z, true);
      fadeTo(pl, "run");
      pl._intentRun = true;
      updateLocomotionTimeScale(pl);
    }
    cameraYaw = baseYaw;
    positionCameraBehindPlayer(true);
    motionProbe = {
      active: true,
      start: performance.now(),
      frames: [],
      last: null,
      need,
      scenario,
      moveX,
      moveZ
    };
    return true;
  },
  stopMotionProbe: () => {
    if (!motionProbe) return { frames: [] };
    motionProbe.active = false;
    const frames = motionProbe.frames.slice();
    const deltas = frames.map(f => f.d).filter(d => d > 0 && d < 1.2);
    const maxD = deltas.length ? Math.max(...deltas) : 0;
    const med = deltas.length ? deltas.slice().sort((a, b) => a - b)[Math.floor(deltas.length / 2)] : 0;
    const spikes = deltas.filter(d => Math.abs(d - med) > 0.032).length;
    motionProbe = null;
    return { frames, maxD, spikes, count: frames.length };
  },
  runMotionProbe: (need = 120) =>
    new Promise(resolve => {
      const pl = actors.get("player");
      const pref = bounds
        ? { x: (bounds.minX + bounds.maxX) * 0.5, z: (bounds.minZ + bounds.maxZ) * 0.5 }
        : { x: 0, z: -1.4 };
      const spawn = bounds ? findClearSpawn(bounds, [], pref) : pref;
      if (pl) {
        pl._visPushX = 0;
        pl._visPushZ = 0;
        placeActorWorld(pl, spawn.x, spawn.z, true);
        fadeTo(pl, "run");
        pl._intentRun = true;
        updateLocomotionTimeScale(pl);
      }
      cameraYaw = LOCATION_CAMERA[currentLoc]?.yaw ?? 0.38;
      positionCameraBehindPlayer(true);
      motionProbe = {
        active: true,
        start: performance.now(),
        frames: [],
        last: null,
        need,
        done: resolve
      };
    }),
  applyHeroCosmetics: (owned = [], equipped = {}) => {
    const pl = actors.get("player");
    if (!pl?.group) return;
    while (heroCosmeticGroup.children.length) heroCosmeticGroup.remove(heroCosmeticGroup.children[0]);
    if (!pl.group.children.includes(heroCosmeticGroup)) pl.group.add(heroCosmeticGroup);
    const hat = equipped.hat || (owned.includes("hat_spike") ? "hat_spike" : null);
    const collar = equipped.collar || (owned.includes("chain_neon") ? "chain_neon" : null);
    if (hat) {
      const h = new THREE.Mesh(
        new THREE.ConeGeometry(0.22, 0.35, 8),
        new THREE.MeshStandardMaterial({ color: 0xff00aa, emissive: 0xff0066, emissiveIntensity: 0.5 })
      );
      h.position.set(0, 1.72, 0);
      heroCosmeticGroup.add(h);
    }
    if (collar) {
      const c = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.03, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.8 })
      );
      c.rotation.x = Math.PI / 2;
      c.position.set(0, 1.38, 0.02);
      heroCosmeticGroup.add(c);
    }
    if (owned.includes("jacket_neon") && pl.root && !pl._jacketTinted) {
      pl.root.traverse(o => {
        if (!o.isMesh || !o.material) return;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m, i) => {
          if (!m || m.isShaderMaterial) return;
          const mat = m.clone();
          if (mat.emissive) {
            mat.emissive.set(0x330044);
            mat.emissiveIntensity = 0.35;
          }
          if (Array.isArray(o.material)) o.material[i] = mat;
          else o.material = mat;
        });
      });
      pl._jacketTinted = true;
    }
  },
  setPlayerSit: (on) => {
    const pl = actors.get("player");
    if (!pl) return;
    pl._sitting = on;
    fadeTo(pl, on ? "sit" : "idle");
  },
  getMotionProbeCount: () => motionProbe?.frames?.length || 0,
  countVisibleProps: (opts = {}) => countVisiblePropsInScene(opts),
  auditLargeMeshes: (minSize = 1.5) => {
    const rows = [];
    if (!locationRoot) return rows;
    locationRoot.updateMatrixWorld(true);
    const box3 = new THREE.Box3();
    const size = new THREE.Vector3();
    const world = new THREE.Vector3();
    const sourceOf = o => {
      const parts = [];
      let n = o;
      while (n && n !== locationRoot) {
        if (n.userData?.propTag) parts.push(`tag:${n.userData.propTag}`);
        else if (n.name) parts.push(n.name);
        n = n.parent;
      }
      return parts.reverse().join(" / ") || locationRoot.name || currentLoc;
    };
    locationRoot.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      if (o.userData?.decorOnly || o.userData?.cameraOccluder) return;
      box3.setFromObject(o);
      if (box3.isEmpty()) return;
      box3.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim < minSize) return;
      box3.getCenter(world);
      const mats = Array.isArray(o.material) ? o.material[0] : o.material;
      const color = mats?.color?.getHex?.() ?? 0;
      const emissive = mats?.emissive?.getHex?.() ?? 0;
      rows.push({
        name: o.name || "(unnamed)",
        tag: o.userData?.propTag || o.parent?.userData?.propTag || null,
        source: sourceOf(o),
        parent: o.parent?.name || o.parent?.type || null,
        maxDim: +maxDim.toFixed(3),
        size: { x: +size.x.toFixed(2), y: +size.y.toFixed(2), z: +size.z.toFixed(2) },
        world: { x: +world.x.toFixed(2), y: +world.y.toFixed(2), z: +world.z.toFixed(2) },
        color,
        emissive
      });
    });
    const sorted = rows.sort((a, b) => b.maxDim - a.maxDim);
    if (typeof console !== "undefined" && new URLSearchParams(location.search).has("dev")) {
      console.info(
        `[auditLargeMeshes] ${currentLoc} >=${minSize}m (${sorted.length})`,
        sorted.map(r => `${r.maxDim}m ${r.tag || r.name} @ ${r.source} pos(${r.world.x},${r.world.z})`)
      );
    }
    return sorted;
  },
  ensureThirdPersonRunCamera: () => {
    captureFrameLock = false;
    setElevatorCutaway(false);
    const pl = actors.get("player");
    if (pl) {
      fadeTo(pl, "run");
      pl._spd = 2.4;
      updateLocomotionTimeScale(pl);
    }
    cameraYaw = LOCATION_CAMERA.street?.yaw ?? 0.38;
    positionCameraBehindPlayer(true);
    if (camera) {
      camera.fov = 42;
      camera.updateProjectionMatrix();
    }
    return true;
  }
};

const _propFrustum = new THREE.Frustum();
const _propProj = new THREE.Matrix4();
const _propCenter = new THREE.Vector3();
const _propCam = new THREE.Vector3();

function isPropRootVisible(root, frustumOnly = false) {
  if (!root?.userData?.propTag || !locationRoot || !camera) return false;
  const box3 = new THREE.Box3().setFromObject(root);
  if (box3.isEmpty()) return false;
  if (!_propFrustum.intersectsBox(box3)) return false;
  if (frustumOnly) return true;
  box3.getCenter(_propCenter);
  camera.getWorldPosition(_propCam);
  const toProp = _propCenter.clone().sub(_propCam);
  if (toProp.dot(camera.getWorldDirection(new THREE.Vector3())) < 0.05) return false;
  const dist = toProp.length();
  const dir = toProp.normalize();
  raycaster.set(_propCam, dir);
  raycaster.far = dist + 0.55;
  const hits = raycaster.intersectObject(locationRoot, true);
  for (const h of hits) {
    if (h.distance > dist + 0.35) break;
    let o = h.object;
    while (o) {
      if (o === root) return true;
      o = o.parent;
    }
    if (h.object.userData?.cameraOccluder) return false;
    const ny = h.face?.normal?.y ?? 0;
    if (Math.abs(ny) > 0.92) continue;
    if (h.object.userData?.propTag) continue;
    if (h.distance < dist - 0.2) return false;
  }
  return _propFrustum.containsPoint(_propCenter);
}

function countVisiblePropsInScene(opts = {}) {
  const frustumOnly = !!opts.frustumOnly;
  if (!locationRoot || !camera) return { unique: 0, tags: [], instances: 0, location: currentLoc, frustumOnly };
  camera.updateMatrixWorld();
  _propProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  _propFrustum.setFromProjectionMatrix(_propProj);
  const roots = [];
  locationRoot.traverse(obj => {
    if (!obj.userData?.propTag) return;
    if (obj.parent?.userData?.propTag) return;
    roots.push(obj);
  });
  const tags = new Set();
  let instances = 0;
  roots.forEach(root => {
    if (!isPropRootVisible(root, frustumOnly)) return;
    tags.add(root.userData.propTag);
    instances++;
  });
  const out = { unique: tags.size, tags: [...tags].sort(), instances, location: currentLoc, frustumOnly };
  if (!frustumOnly) {
    const fr = countVisiblePropsInScene({ frustumOnly: true });
    out.frustumUnique = fr.unique;
    out.frustumTags = fr.tags;
  }
  return out;
}
bindGameplayToWorld3D(api, () => ({
  actors,
  scene,
  locationRoot,
  bounds,
  currentLoc,
  hooks,
  camera
}));
window.World3D = api;
window.Scene3D = api;
window.PORTALS_LIST = PORTALS;
window.dispatchEvent(new Event("scene3d-ready"));
