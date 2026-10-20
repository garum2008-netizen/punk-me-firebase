import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import {
  buildLocationScene,
  gameToWorldLoc,
  worldToGameLoc,
  NPC_WORLD,
  PORTALS,
  LOCATION_THEME
} from "./world/locations.mjs";
import {
  applyCharacterLook,
  createAnimActions,
  updateProcedural,
  prepareTeenScene,
  markActorVisibleWhenReady
} from "./character-rig.mjs";

const MODEL_TEEN = "assets/models/punk-teen.glb";
const MODEL_DOG = "assets/models/dog.glb";
const MODEL_DOG_FALLBACK = "assets/models/fox.glb";

const DOG_ANIM = { idle: "Survey", walk: "Walk", run: "Run" };
let renderer, scene, camera, clock, raycaster, pointer;
let teenTemplate, dogTemplate, hooks = {};
let actors = new Map();
let car = null;
let locationRoot = null;
let bounds = null;
let floorMesh = null;
let currentLoc = "";
let locationProps = { showCar: false };
let particles = null;
let keys = { w: false, a: false, s: false, d: false };
let cameraYaw = 0;
let meLastDx = 0;
let meLastDy = 0;
let playerAnimState = "idle";
let teenFootLift = 0;
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

function characterScale() {
  return 1.05;
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

function createActorFromTeen(id, characterId) {
  const def = charDef(characterId || "razor");
  const root = cloneSkinned(teenTemplate.scene);
  const scl = characterScale() * (def.look?.scale || 1);
  root.scale.setScalar(scl);
  root.position.y = teenFootLift * scl;
  root.visible = false;
  applyCharacterLook(root, def);
  root.add(makeShadow());
  const mixer = new THREE.AnimationMixer(root);
  const actions = createAnimActions(mixer, teenTemplate.animations, def);
  const group = new THREE.Group();
  group.add(root);
  scene.add(group);
  const actor = {
    id, characterId: characterId || "razor", group, root, mixer, actions,
    current: "idle", wx: 0, wz: 0, isNpc: false, def, _visibleReady: false
  };
  actors.set(id, actor);
  return actor;
}

function ensureActor(id, characterId, isNpc) {
  let a = actors.get(id);
  if (a && a.characterId !== characterId) {
    scene.remove(a.group);
    a.mixer?.stopAllAction();
    actors.delete(id);
    a = null;
  }
  if (!a) a = createActorFromTeen(id, characterId);
  a.isNpc = isNpc;
  return a;
}

function fadeTo(actor, name) {
  const key = actor.actions?.[name] ? name : "idle";
  if (!actor.actions?.[key] || actor.current === key) return;
  const prev = actor.actions[actor.current];
  const next = actor.actions[key];
  next.reset().fadeIn(0.2).play();
  prev?.fadeOut(0.2);
  actor.current = key;
}

function pickLocomotionAnim(actor, speed, talking) {
  if (talking) return "talk";
  if (actor._holdAnim && actor._holdUntil > performance.now()) return actor._holdAnim;
  if (speed > 1.2) return "run";
  if (speed > 0.08) return "walk";
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
  root.scale.setScalar(characterScale() * 0.3);
  root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.set(0x553322); } });
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
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const teenGltf = await loader.loadAsync(MODEL_TEEN);
  let rigRoot = teenGltf.scene.getObjectByName("Rig");
  if (!rigRoot) {
    const altScene = await teenGltf.parser.getDependency("scene", 1);
    rigRoot = altScene.getObjectByName("Rig") || altScene;
  }
  teenGltf.scene = rigRoot;
  teenFootLift = prepareTeenScene(teenGltf.scene);
  teenTemplate = teenGltf;
  try {
    dogTemplate = await loader.loadAsync(MODEL_DOG);
  } catch (e) {
    dogTemplate = await loader.loadAsync(MODEL_DOG_FALLBACK);
  }
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

function clampWorld(x, z) {
  if (!bounds) return { x, z };
  return {
    x: Math.max(bounds.minX + 0.5, Math.min(bounds.maxX - 0.5, x)),
    z: Math.max(bounds.minZ + 0.5, Math.min(bounds.maxZ - 0.5, z))
  };
}

function placeActorWorld(actor, wx, wz, isPlayer, isNpc) {
  const c = clampWorld(wx, wz);
  const lerp = isPlayer ? 0.35 : 0.2;
  actor.group.position.x += (c.x - actor.group.position.x) * lerp;
  actor.group.position.z += (c.z - actor.group.position.z) * lerp;
  actor.group.position.y = 0;
  const dx = c.x - (actor.wx ?? c.x);
  const dz = c.z - (actor.wz ?? c.z);
  const speed = Math.hypot(dx, dz) * (isPlayer ? 8 : 4);
  actor._spd = speed;
  if (isPlayer) { meLastDx = dx; meLastDy = dz; }
  actor.wx = c.x;
  actor.wz = c.z;
  actor.isNpc = isNpc;
  actor.isPlayer = isPlayer;
  if (Math.hypot(dx, dz) > 0.01) {
    actor.group.rotation.y = Math.atan2(dx, dz);
  }
  if (actor.isDog) {
    fadeToDog(actor, speed > 0.8 ? "run" : speed > 0.08 ? "walk" : "idle");
  } else if (actor.actions) {
    const talking = talkingIds.has(actor.characterId) || talkingIds.has(actor.id.replace("npc_", ""));
    fadeTo(actor, pickLocomotionAnim(actor, speed, talking));
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
  if (!teenTemplate || !modelsReady) return;
  const { player, others, npcs, location, hasDog, carVisible } = data;
  if (location !== currentLoc) rebuildLocation(location);

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
    markActorVisibleWhenReady(a);
    if (a.root && !a.isDog) {
      const talk = talkingIds.has(a.characterId) || talkingIds.has(a.id.replace("npc_", ""));
      updateProcedural(a, dt, a.isNpc ? playerPos : null, talk);
      if (a.isNpc && a._visibleReady && Math.sin(clock.elapsedTime * 0.4 + a.wx) > 0.97 && a.current === "idle") {
        playOneShot(a, "wave", 1200);
      }
    }
  });
  if (car) {
    car.x += car.dir * dt * 2.5;
    if (car.x > 6 || car.x < -8) car.dir *= -1;
    car.group.position.x = car.x;
    car.wheels.forEach(w => { w.rotation.x += dt * 5 * car.dir; });
  }
  if (particles) particles.rotation.y += dt * 0.02;
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

function getTeenTemplate() {
  return teenTemplate;
}

const api = {
  init, sync, resize, setLocation: rebuildLocation, setTalking, getTeenTemplate,
  playEmote: (id, name) => {
    const a = actors.get(id || "player");
    if (a) playOneShot(a, name === "wave" ? "wave" : name === "sit" ? "sit" : "interact", 1500);
  },
  isReady: () => modelsReady,
  getLocation: () => currentLoc
};
window.World3D = api;
window.Scene3D = api;
window.dispatchEvent(new Event("scene3d-ready"));
