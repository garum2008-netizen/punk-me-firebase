import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import {
  buildLocationScene,
  gameToWorldLoc,
  worldToGameLoc,
  NPC_WORLD,
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
  updateLocomotionTimeScale
} from "./world/meshy-punk.mjs";

const MODEL_DOG = "assets/models/cc0/fox.glb";

const DOG_ANIM = { idle: "Survey", walk: "Walk", run: "Run" };
let renderer, scene, camera, clock, raycaster, pointer;
let dogTemplate, hooks = {};
let actors = new Map();
let car = null;
let locationRoot = null;
let bounds = null;
let furnitureColliders = [];
let floorMesh = null;
let currentLoc = "";
let locationProps = { showCar: false };
let particles = null;
let keys = { w: false, a: false, s: false, d: false };
let cameraYaw = 0;
let meLastDx = 0;
let meLastDy = 0;
let playerAnimState = "idle";
let modelsReady = false;
const talkingIds = new Set();
const texLoader = new THREE.TextureLoader();

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
  const angle = i * 1.35 + (id.length % 5) * 0.4;
  const r = 0.9 + (i % 6) * 0.55;
  return { x: Math.cos(angle) * r, z: Math.sin(angle) * r };
}

function createActorFromCatalog(id, characterId) {
  const def = charDef(characterId || "razor");
  const tpl = getTemplateForCharacter(characterId || "razor");
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
    id, characterId: characterId || "razor", group, root, mixer, actions,
    current: "idle", wx: 0, wz: 0, isNpc: false, def, _visibleReady: false,
    _tplKey: tpl.key, _meshy: built._meshy, _proc: built._proc
  };
  for (let i = 0; i < 4; i++) updateProcedural(actor, 1 / 60, null, false);
  actors.set(id, actor);
  return actor;
}

function ensureActor(id, characterId, isNpc) {
  const tplKey = getTemplateForCharacter(characterId || "razor").key;
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
  const locomotion = name === "walk" || name === "run";
  if (actor._meshy) {
    const key = locomotion && actor.actions?.[name] ? name : "idle";
    if (actor.current === key && (locomotion || !locomotion)) {
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
    return actor._holdAnim;
  }
  if (talking && speed < 0.08) return "idle";
  const walkGate = actor._meshy ? 0.16 : 0.08;
  if (speed > 1.2) return "run";
  if (speed > walkGate) return "walk";
  return "idle";
}

function playOneShot(actor, name, ms = 1400) {
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
  if (!dogTemplate) return null;
  const root = cloneSkinned(dogTemplate.scene);
  root.scale.setScalar(0.008);
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const m = o.material.clone();
    if (!m.map) m.color.set(0xc4783a);
    m.emissive = new THREE.Color(0x331808);
    m.emissiveIntensity = 0.12;
    o.material = m;
  });
  root.add(makeShadow());
  const mixer = new THREE.AnimationMixer(root);
  const clips = dogTemplate.animations;
  const actions = {
    idle: mixer.clipAction(clips.find(c => c.name === DOG_ANIM.idle) || clips[0]),
    walk: mixer.clipAction(clips.find(c => c.name === DOG_ANIM.walk) || clips[0]),
    run: mixer.clipAction(clips.find(c => c.name === DOG_ANIM.run) || clips[0])
  };
  actions.idle.play();
  const group = new THREE.Group();
  group.add(root);
  scene.add(group);
  return { group, root, mixer, actions, current: "idle", isDog: true };
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
  const loader = new GLTFLoader();
  dogTemplate = await loader.loadAsync(MODEL_DOG);
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
  currentLoc = locId;
  const built = buildLocationScene(locId, texLoader);
  locationRoot = built.root;
  bounds = built.bounds;
  floorMesh = built.floor;
  scene.add(locationRoot);
  const theme = built.theme || LOCATION_THEME.room;
  scene.fog = new THREE.FogExp2(theme.fog, theme.fogD);
  scene.background = new THREE.Color(theme.bg);
  locationProps = built.props || { showCar: false };
  furnitureColliders = built.colliders || [];
  (locationProps.cats || []).forEach(c => locationRoot.add(c));
  spawnParticles(locId === "street" || locId === "cemetery");
}

function spawnParticles(night) {
  if (particles) { scene.remove(particles); particles = null; }
  if (!night) return;
  const n = 120;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 24;
    pos[i * 3 + 1] = Math.random() * 6;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 20;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  particles = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xff66ff, size: 0.06, transparent: true, opacity: 0.7 }));
  scene.add(particles);
}

function clampWorld(x, z, radius = 0.42) {
  return resolveWorldPosition(x, z, bounds, furnitureColliders, radius);
}

function separateActors() {
  const list = [...actors.values()].filter(a => !a.isDog);
  const minDist = 1.05;
  for (let pass = 0; pass < 5; pass++) {
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const dx = b.group.position.x - a.group.position.x;
      const dz = b.group.position.z - a.group.position.z;
      const d = Math.hypot(dx, dz);
      if (d < minDist && d > 0.001) {
        const push = (minDist - d) * 0.5;
        const ux = dx / d;
        const uz = dz / d;
        a.group.position.x -= ux * push;
        a.group.position.z -= uz * push;
        b.group.position.x += ux * push;
        b.group.position.z += uz * push;
        a.wx -= ux * push;
        a.wz -= uz * push;
        b.wx += ux * push;
        b.wz += uz * push;
      }
    }
  }
  }
  list.forEach(a => {
    const p = clampWorld(a.group.position.x, a.group.position.z);
    a.group.position.x = p.x;
    a.group.position.z = p.z;
    a.wx = p.x;
    a.wz = p.z;
  });
}

function placeActorWorld(actor, wx, wz, isPlayer, isNpc) {
  const c = clampWorld(wx, wz);
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
  if (actor.isDog) {
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
  if (!dog.actions[name] || dog.current === name) return;
  dog.actions[dog.current]?.fadeOut(0.15);
  dog.actions[name].reset().fadeIn(0.15).play();
  dog.current = name;
}

function updateThirdPersonCamera() {
  const player = actors.get("player");
  if (!player) return;
  const p = player.group.position;
  const dist = 5.4;
  const height = 2.05;
  const ox = Math.sin(cameraYaw) * dist;
  const oz = Math.cos(cameraYaw) * dist;
  const target = new THREE.Vector3(p.x + ox, height, p.z + oz);
  camera.position.lerp(target, 0.12);
  camera.lookAt(p.x, 1.28, p.z);
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
  let mx = 0;
  let mz = 0;
  const speed = 4.5 * dt;
  const fwd = new THREE.Vector3(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
  const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
  if (keys.w) { mx += fwd.x * speed; mz += fwd.z * speed; }
  if (keys.s) { mx -= fwd.x * speed; mz -= fwd.z * speed; }
  if (keys.a) { mx -= right.x * speed; mz -= right.z * speed; }
  if (keys.d) { mx += right.x * speed; mz += right.z * speed; }
  if (mx !== 0 || mz !== 0) {
    const np = clampWorld(player.wx + mx, player.wz + mz);
    const g = worldToGameLoc(np.x, np.z, bounds);
    hooks.onMove?.(g.x, g.y);
  }
}

function sync(data) {
  if (!modelsReady) return;
  const { player, others, npcs, location, hasDog, carVisible } = data;
  const justChangedLoc = location !== currentLoc;
  if (justChangedLoc) rebuildLocation(location);
  if (justChangedLoc && location === "kitchen" && player && bounds) {
    const clear = findClearSpawn(bounds, furnitureColliders, { x: -2.8, z: -1.2 });
    const g = worldToGameLoc(clear.x, clear.z, bounds);
    hooks.onMove?.(g.x, g.y);
  }

  const keep = new Set(["player"]);
  if (player) {
    const w = gameToWorldLoc(player.x, player.y, bounds);
    const a = ensureActor("player", player.characterId || "razor", false);
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

  (npcs || []).forEach(n => {
    const id = "npc_" + n.id;
    keep.add(id);
    const a = ensureActor(id, n.id, true);
    const wp = NPC_WORLD[location]?.[n.id] || gameToWorldLoc(n.x, n.y, bounds);
    placeActorWorld(a, wp.x, wp.z, false, true);
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
      if (d) actors.set("dog", { ...d, id: "dog", wx: 0, wz: 0 });
    }
    const dog = actors.get("dog");
    const pl = actors.get("player");
    if (dog && pl) placeActorWorld(dog, pl.wx - 1.2, pl.wz + 0.8, false);
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
}

function applyNetworkAnim(actor, anim) {
  const map = { talk: "talk", wave: "wave", sit: "sit", interact: "interact", run: "run", walk: "walk", idle: "idle", emote: "emote" };
  const key = map[anim] || "idle";
  if (key === "wave" || key === "interact") playOneShot(actor, key, 1600);
  else if (key === "sit") fadeTo(actor, "sit");
  else fadeTo(actor, key);
}

function onPointer(e) {
  const canvas = document.getElementById("stage3d");
  if (!canvas || e.target !== canvas || !floorMesh) return;
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

function onKeyDown(e) {
  const k = e.key.toLowerCase();
  if (k in keys) keys[k] = true;
  if (e.key === "ArrowLeft") cameraYaw += 0.08;
  if (e.key === "ArrowRight") cameraYaw -= 0.08;
}
function onKeyUp(e) {
  const k = e.key.toLowerCase();
  if (k in keys) keys[k] = false;
}

function loop() {
  requestAnimationFrame(loop);
  if (!renderer || !modelsReady) return;
  const dt = Math.min(clock.getDelta(), 0.05);
  processInput(dt);
  const pl = actors.get("player");
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
  updateThirdPersonCamera();
  checkPortals();
  renderer.render(scene, camera);
}

function init(h) {
  hooks = h;
  const canvas = document.getElementById("stage3d");
  if (!canvas) return Promise.resolve(false);
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  scene.add(new THREE.HemisphereLight(0xffe8ff, 0x2a1838, 1.45));
  const fill = new THREE.DirectionalLight(0xaaddff, 0.85);
  fill.position.set(-4, 8, -3);
  scene.add(fill);
  const sun = new THREE.DirectionalLight(0xffffff, 1.55);
  sun.position.set(5, 12, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.42;

  canvas.addEventListener("pointerdown", onPointer);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
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

function resize() {
  const canvas = document.getElementById("stage3d");
  if (!canvas || !renderer) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  if (camera) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

const api = {
  init, sync, resize, setLocation: rebuildLocation, setTalking,
  playEmote: (id, name) => {
    const a = actors.get(id || "player");
    if (a) playOneShot(a, name === "wave" ? "wave" : name === "sit" ? "sit" : "interact", 1500);
  },
  isReady: () => modelsReady,
  getLocation: () => currentLoc,
  captureCloseup: (pose = "idle", talking = false) => {
    const a = actors.get("player");
    if (!a?.root) return false;
    const key = pose === "run" ? "run" : pose === "walk" ? "walk" : "idle";
    fadeTo(a, key);
    if (key === "walk" || key === "run") {
      a._spd = key === "run" ? 2.4 : 1.1;
      updateLocomotionTimeScale(a);
    }
    if (talking) setTalking(a.characterId || "player", true);
    for (let i = 0; i < 48; i++) {
      a.mixer?.update(1 / 30);
      const talk = talking || talkingIds.has(a.characterId) || talkingIds.has("player");
      updateProcedural(a, 1 / 30, null, talk);
    }
    if (talking) setTalking(a.characterId || "player", false);
    markActorVisibleWhenReady(a);
    a.root.visible = true;
    const p = a.group.position;
    const side = talking ? 0.55 : 1.35;
    const distZ = talking ? 2.05 : 2.15;
    camera.position.set(p.x + side, p.y + 1.42, p.z + distZ);
    camera.lookAt(p.x, p.y + (talking ? 1.35 : 1.22), p.z);
    renderer.render(scene, camera);
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
