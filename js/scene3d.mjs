import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

const MODEL_TEEN = "assets/models/punk-teen.glb";
const MODEL_DOG = "assets/models/fox.glb";

const ANIM = {
  idle: ["Idle_Loop", "Sitting_Idle_Loop", "Idle_Talking_Loop"],
  walk: ["Walk_Loop", "Walk_Formal_Loop"],
  run: ["Jog_Fwd_Loop", "Sprint_Loop"],
  talk: ["Idle_Talking_Loop", "Idle_Loop"]
};

const DOG_ANIM = { idle: "Survey", walk: "Walk", run: "Run" };

let renderer, scene, camera, clock, raycaster, pointer, ground;
let teenTemplate = null;
let dogTemplate = null;
let hooks = {};
let actors = new Map();
let car = null;
let lastPlayer = { x: 50, y: 60 };
let playerStillMs = 0;
let meLastDx = 0;
let meLastDy = 0;

function gameToWorld(gx, gy) {
  return { x: (gx / 100 - 0.5) * 14, z: (gy / 100 - 0.52) * 9 };
}

function worldToGame(x, z) {
  return {
    x: Math.max(5, Math.min(95, (x / 14 + 0.5) * 100)),
    y: Math.max(22, Math.min(92, (z / 9 + 0.52) * 100))
  };
}

function findClip(clips, names) {
  for (const n of names) {
    const c = clips.find(x => x.name === n);
    if (c) return c;
  }
  return clips[0];
}

const HIDE_MESH = /^(Mannequin|ClothBottom|ClothTop)$/i;

function punkify(root, palette) {
  root.traverse(o => {
    if (o.isMesh && HIDE_MESH.test(o.name || "")) {
      o.visible = false;
      return;
    }
    if (!o.isMesh || !o.material) return;
    const m = o.material.clone();
    const n = (o.name || "").toLowerCase();
    const isHair = n.includes("hair");
    const isCloth = n.includes("cloth") || n.includes("superhero");
    const isSkin = n.includes("body") || n.includes("head") || n.includes("hand") || n.includes("leg");
    if (isHair) {
      m.color = new THREE.Color(palette.hair || 0xff00ff);
      m.emissive = new THREE.Color(palette.hair || 0xff00ff);
      m.emissiveIntensity = 0.2;
    } else if (isCloth) {
      m.color = new THREE.Color(palette.jacket || 0x1a1a22);
      m.emissive = new THREE.Color(palette.emissive || 0x220033);
      m.emissiveIntensity = 0.15;
      m.roughness = 0.65;
      m.metalness = 0.25;
    } else if (isSkin) {
      m.emissive = new THREE.Color(0x000000);
      m.emissiveIntensity = 0;
      if (m.color) m.color.lerp(new THREE.Color(palette.tint || 0xffccaa), 0.12);
    } else {
      m.emissive = new THREE.Color(palette.emissive || 0x110022);
      m.emissiveIntensity = 0.08;
    }
    o.material = m;
    o.castShadow = true;
    o.receiveShadow = true;
  });
  const spine = root.getObjectByName("DEF-spine") || root.getObjectByName("mixamorigSpine") || root.getObjectByName("DEF-spine.001");
  if (spine) {
    const chain = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.035, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, roughness: 0.25, emissive: 0x00ffff, emissiveIntensity: 0.2 })
    );
    chain.position.set(0, 0.35, 0.12);
    chain.rotation.x = Math.PI / 2;
    spine.add(chain);
    const mohawk = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.45, 6),
      new THREE.MeshStandardMaterial({ color: palette.hair || 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.25 })
    );
    mohawk.position.set(0, 0.75, -0.05);
    mohawk.rotation.x = -0.25;
    spine.add(mohawk);
    const jacket = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.65, 0.28),
      new THREE.MeshStandardMaterial({
        color: palette.jacket || 0x1a1020,
        metalness: 0.35,
        roughness: 0.55,
        emissive: palette.emissive || 0x110022,
        emissiveIntensity: 0.12
      })
    );
    jacket.position.set(0, 0.15, 0.02);
    spine.add(jacket);
  }
}

function makeShadow() {
  const s = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 24),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.4 })
  );
  s.rotation.x = -Math.PI / 2;
  s.position.y = 0.03;
  return s;
}

function characterScale() {
  const vh = window.innerHeight || 720;
  const targetFrac = 0.46;
  const rigHeight = 1.88;
  const fovRad = (34 * Math.PI) / 180;
  const dist = 10.5;
  const visibleH = 2 * Math.tan(fovRad / 2) * dist;
  const sc = (visibleH * targetFrac) / rigHeight;
  return Math.max(2.4, Math.min(3.8, sc * (vh / 720)));
}

function fitCamera() {
  if (!camera) return;
  const vh = window.innerHeight || 720;
  const dist = vh < 800 ? 11.5 : 12.5;
  camera.fov = 34;
  camera.position.set(0.2, 2.05, dist);
  camera.lookAt(0, 1.05, 0);
  camera.updateProjectionMatrix();
}

function createActorFromTeen(id, palette) {
  const root = cloneSkinned(teenTemplate.scene);
  const sc = characterScale();
  root.scale.setScalar(sc);
  punkify(root, palette);
  const shadow = makeShadow();
  root.add(shadow);
  const mixer = new THREE.AnimationMixer(root);
  const clips = teenTemplate.animations;
  const actions = {
    idle: mixer.clipAction(findClip(clips, ANIM.idle)),
    walk: mixer.clipAction(findClip(clips, ANIM.walk)),
    run: mixer.clipAction(findClip(clips, ANIM.run)),
    talk: mixer.clipAction(findClip(clips, ANIM.talk))
  };
  Object.values(actions).forEach(a => { a.enabled = true; });
  actions.idle.play();
  mixer.update(0.02);
  const group = new THREE.Group();
  group.add(root);
  scene.add(group);
  const actor = { id, group, root, mixer, actions, current: "idle", gx: 50, gy: 60, isNpc: false, palette };
  actors.set(id, actor);
  return actor;
}

function fadeTo(actor, name) {
  if (!actor.actions[name] || actor.current === name) return;
  const prev = actor.actions[actor.current];
  const next = actor.actions[name];
  next.reset().fadeIn(0.25).play();
  if (prev) prev.fadeOut(0.25);
  actor.current = name;
}

function createDog() {
  if (!dogTemplate) return null;
  const root = cloneSkinned(dogTemplate.scene);
  root.scale.setScalar(characterScale() * 0.32);
  root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.color.set(0x332211); } });
  const shadow = makeShadow();
  shadow.scale.setScalar(0.5);
  root.add(shadow);
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
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.7, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x1e3a8a, metalness: 0.6, roughness: 0.35 })
  );
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.55, 0.95),
    new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.4, roughness: 0.5 })
  );
  cabin.position.set(-0.2, 1.05, 0);
  group.add(cabin);
  const wheels = [];
  [[-0.85, 0.22, 0.5], [-0.85, 0.22, -0.5], [0.85, 0.22, 0.5], [0.85, 0.22, -0.5]].forEach(p => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.18, 16), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    w.rotation.z = Math.PI / 2;
    w.position.set(...p);
    group.add(w);
    wheels.push(w);
  });
  const lightB = new THREE.PointLight(0x3b82f6, 3, 5);
  lightB.position.set(-1.1, 0.8, 0.35);
  const lightR = new THREE.PointLight(0xef4444, 3, 5);
  lightR.position.set(-1.1, 0.8, -0.35);
  group.add(lightB, lightR);
  group.position.set(5.5, 0, 0.5);
  group.scale.setScalar(1.15);
  scene.add(group);
  car = { group, wheels, lightB, lightR, dir: 1, x: 5.5, flash: 0 };
}

function extractRigScene(gltf) {
  const rig = gltf.scene.getObjectByName("Rig");
  if (rig) return rig;
  gltf.scene.traverse(o => {
    if (o.isSkinnedMesh && o.skeleton && !gltf._rigRoot) gltf._rigRoot = o.parent;
  });
  return gltf._rigRoot || gltf.scene;
}

async function loadModels() {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const teenGltf = await loader.loadAsync(MODEL_TEEN);
  teenGltf.scene = extractRigScene(teenGltf);
  teenGltf.scene.traverse(o => {
    if (o.isMesh && HIDE_MESH.test(o.name || "")) o.visible = false;
  });
  teenTemplate = teenGltf;
  dogTemplate = await loader.loadAsync(MODEL_DOG);
}

function init(h) {
  hooks = h;
  const canvas = document.getElementById("stage3d");
  if (!canvas) return Promise.resolve(false);
  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  resize();
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(34, canvas.clientWidth / canvas.clientHeight, 0.1, 80);
  fitCamera();
  clock = new THREE.Clock();
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2();

  scene.add(new THREE.AmbientLight(0x8866aa, 0.9));
  const key = new THREE.DirectionalLight(0xff66ff, 1.4);
  key.position.set(3, 8, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x00ccff, 0.5);
  fill.position.set(-4, 4, -2);
  scene.add(fill);

  ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 16),
    new THREE.MeshStandardMaterial({ color: 0x0a0612, transparent: true, opacity: 0.01 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  canvas.addEventListener("pointerdown", onPointer);
  window.addEventListener("resize", resize);
  document.body.classList.add("mode-3d");

  return loadModels().then(() => {
    fitCamera();
    loop();
    hooks.onReady?.();
    return true;
  }).catch(err => {
    console.error("3D load failed", err);
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
    fitCamera();
  }
}

function onPointer(e) {
  const canvas = document.getElementById("stage3d");
  if (e.target !== canvas) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObject(ground);
  if (hits[0]) {
    const g = worldToGame(hits[0].point.x, hits[0].point.z);
    hooks.onMove?.(g.x, g.y);
  }
  let best = null;
  let bestD = 1.5;
  actors.forEach((a, id) => {
    if (!id.startsWith("npc_")) return;
    const d = Math.hypot(a.group.position.x - hits[0]?.point.x, a.group.position.z - hits[0]?.point.z);
    if (d < bestD) { bestD = d; best = id.replace("npc_", ""); }
  });
  if (best) hooks.onNpcClick?.(best);
}

const PALETTES = {
  player: { tint: 0xffccaa, emissive: 0x004466, hair: 0x00ffff, jacket: 0x0d3d4a },
  razor: { tint: 0xffccaa, emissive: 0x440022, hair: 0xff00ff, jacket: 0x2a0a18 },
  mohawk: { tint: 0xffccaa, emissive: 0x114422, hair: 0x66ff00, jacket: 0x1a2a10 },
  vienna: { tint: 0xffccaa, emissive: 0x331155, hair: 0xaa00ff, jacket: 0x251040 },
  ghost: { tint: 0xccccff, emissive: 0x222244, hair: 0xccccff, jacket: 0x1a1a2a },
  gravedigger: { tint: 0xddccaa, emissive: 0x222211, hair: 0x444433, jacket: 0x2a2820 },
  other: { tint: 0xffccaa, emissive: 0x442200, hair: 0xff8800, jacket: 0x3a2208 }
};

function sync(data) {
  if (!teenTemplate) return;
  const { player, others, npcs, location, hasDog, carVisible } = data;
  const keep = new Set(["player"]);

  if (player) {
    lastPlayer = { x: player.x, y: player.y };
    let a = actors.get("player");
    if (!a) a = createActorFromTeen("player", PALETTES.player);
    placeActor(a, player.x, player.y, true);
  }

  Object.entries(others || {}).forEach(([id, p]) => {
    keep.add(id);
    let a = actors.get(id);
    if (!a) a = createActorFromTeen(id, PALETTES.other);
    placeActor(a, p.x, p.y, false);
  });

  (npcs || []).forEach(n => {
    const id = "npc_" + n.id;
    keep.add(id);
    let a = actors.get(id);
    const pal = PALETTES[n.id] || PALETTES.other;
    if (!a) a = createActorFromTeen(id, pal);
    placeActor(a, n.x, n.y, false, true);
  });

  actors.forEach((a, id) => {
    if (!keep.has(id)) {
      scene.remove(a.group);
      a.mixer.stopAllAction();
      actors.delete(id);
    }
  });

  if (hasDog) {
    if (!actors.get("dog")) {
      const d = createDog();
      if (d) actors.set("dog", { ...d, id: "dog", gx: player.x, gy: player.y });
    }
    const dog = actors.get("dog");
    if (dog && player) placeActor(dog, player.x - 8, player.y + 2, false);
    keep.add("dog");
  } else if (actors.get("dog")) {
    scene.remove(actors.get("dog").group);
    actors.delete("dog");
  }

  ensureCar(!!carVisible);
  document.getElementById("streetCover")?.classList.toggle("visible", location === "street");
  document.body.classList.toggle("loc-street", location === "street");
}

function placeActor(actor, gx, gy, isPlayer, isNpc) {
  const w = gameToWorld(gx, gy);
  const lerp = isPlayer ? 0.4 : 0.22;
  actor.group.position.x += (w.x - actor.group.position.x) * lerp;
  actor.group.position.z += (w.z - actor.group.position.z) * lerp;
  actor.group.position.y = 0;
  const dx = gx - (actor.gx ?? gx);
  const dy = gy - (actor.gy ?? gy);
  const speed = Math.hypot(dx, dy);
  actor._spd = speed;
  if (isPlayer) { meLastDx = dx; meLastDy = dy; }
  actor.gx = gx;
  actor.gy = gy;
  actor.isNpc = isNpc;
  actor.isPlayer = isPlayer;
  if (actor.isDog) {
    fadeToDog(actor, speed > 1.2 ? "run" : speed > 0.15 ? "walk" : "idle");
  } else if (actor.actions) {
    if (isNpc) fadeTo(actor, speed > 0.25 ? "walk" : "idle");
    else fadeTo(actor, speed > 1.5 ? "run" : speed > 0.2 ? "walk" : "idle");
  }
  const dir = actor.group.position.x - (actor._lx ?? actor.group.position.x);
  if (Math.abs(dir) > 0.001) actor.group.rotation.y = dir < 0 ? 0.15 : -0.15;
  actor._lx = actor.group.position.x;
}

function boneWalkPhase(actor, speed) {
  const t = clock.elapsedTime;
  const amp = speed > 1.2 ? 0.42 : speed > 0.2 ? 0.28 : 0.06;
  const freq = speed > 0.2 ? 9 : 2.2;
  const root = actor.root;
  if (!root) return;
  root.traverse(o => {
    if (!o.isBone) return;
    const n = (o.name || "").toLowerCase();
    if (n.includes("spine") && !n.includes("spine.0")) {
      o.rotation.y = Math.sin(t * 1.1 + actor.gx) * 0.05;
      o.rotation.x = Math.sin(t * 2.1) * 0.025;
    }
    if (n.includes("upper_arm")) {
      o.rotation.z = Math.sin(t * freq + (n.includes(".l") ? 0 : 1)) * amp * 0.35;
    }
    if (n.includes("thigh")) {
      const side = n.includes(".l") ? 0 : Math.PI;
      o.rotation.x = Math.sin(t * freq + side) * amp;
    }
    if (n.includes("shin") || n.includes("calf")) {
      o.rotation.x = Math.max(0, Math.sin(t * freq + (n.includes(".l") ? 0.4 : -0.4))) * amp * 0.55;
    }
  });
}

function fadeToDog(dog, name) {
  if (!dog.actions[name] || dog.current === name) return;
  dog.actions[dog.current]?.fadeOut(0.2);
  dog.actions[name].reset().fadeIn(0.2).play();
  dog.current = name;
}

function loop() {
  requestAnimationFrame(loop);
  if (!renderer) return;
  const dt = clock.getDelta();
  playerStillMs += dt * 1000;

  actors.forEach(a => {
    if (a.mixer) a.mixer.update(dt);
    if (a.root) {
      let spd = a.isDog ? 0.55 : (a.isPlayer ? Math.hypot(meLastDx, meLastDy) : (a._spd || 0));
      if (a.isNpc) spd = 0.25 + Math.sin(clock.elapsedTime * 0.9 + (a.gx || 0)) * 0.12;
      boneWalkPhase(a, spd);
    }
    if (a.isNpc && a.actions) {
      a.group.rotation.y = Math.sin(clock.elapsedTime * 0.5 + (a.gx || 0)) * 0.35;
      if (Math.sin(clock.elapsedTime * 0.9 + a.gx) > 0.92 && a.current === "idle") fadeTo(a, "talk");
      else if (a.current === "talk" && Math.sin(clock.elapsedTime * 0.9 + a.gx) < 0.5) fadeTo(a, "idle");
    }
  });

  if (car) {
    car.x += car.dir * dt * 2.8;
    if (car.x > 8 || car.x < 2) car.dir *= -1;
    car.group.position.x = car.x;
    car.group.rotation.y = car.dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    car.flash += dt;
    car.lightB.intensity = 2 + Math.sin(car.flash * 10) * 1.5;
    car.lightR.intensity = 2 + Math.cos(car.flash * 10) * 1.5;
    car.wheels.forEach(w => { w.rotation.x += dt * 6 * car.dir; });
  }

  renderer.render(scene, camera);
}

function afterEntityRender() {}

window.Scene3D = { init, sync, resize, afterEntityRender };
window.dispatchEvent(new Event("scene3d-ready"));
