import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { applyCharacterLook, createAnimActions } from "./character-rig.mjs";

const MODEL = "assets/models/punk-teen.glb";
let renderer, scene, camera, clock, rig, mixer, actorRoot, actions;
let selectedIdx = 0;
let raf = 0;
let onPickCb = null;

function waitTemplate() {
  return new Promise(resolve => {
    const tick = () => {
      const t = window.World3D?.getTeenTemplate?.();
      if (t) return resolve(t);
      setTimeout(tick, 200);
    };
    tick();
  });
}

async function loadRig() {
  if (window.World3D?.getTeenTemplate?.()) return window.World3D.getTeenTemplate();
  const loader = new GLTFLoader();
  const g = await loader.loadAsync(MODEL);
  const root = g.scene.getObjectByName("Rig") || g.scene;
  return { scene: root, animations: g.animations };
}

function showCharacter(id) {
  if (!rig) return;
  if (actorRoot) scene.remove(actorRoot);
  const def = getCharacterDef(id);
  actorRoot = cloneSkinned(rig.scene);
  actorRoot.scale.setScalar(2.6 * (def.look?.scale || 1));
  applyCharacterLook(actorRoot, def);
  scene.add(actorRoot);
  if (mixer) mixer.stopAllAction();
  mixer = new THREE.AnimationMixer(actorRoot);
  actions = createAnimActions(mixer, rig.animations, def);
  if (actions.emote) {
    actions.emote.reset().fadeIn(0.2).play();
    actions.idle?.fadeOut(0.2);
  }
  const line = characterIntroLine(id);
  const el = document.getElementById("charSelectIntro");
  if (el) el.textContent = line;
  if (line && window.Voice) Voice.speak(line, id);
}

function loop() {
  raf = requestAnimationFrame(loop);
  const dt = clock.getDelta();
  mixer?.update(dt);
  if (actorRoot) actorRoot.rotation.y += dt * 0.55;
  renderer?.render(scene, camera);
}

function buildUi() {
  const ui = document.getElementById("charSelectUi");
  if (!ui) return;
  ui.innerHTML = getPlayableCharacters().map((c, i) =>
    `<button type="button" class="btn char-pick ${i === selectedIdx ? "active" : ""}" data-idx="${i}" data-id="${c.id}">${c.id.toUpperCase()}</button>`
  ).join("") + `<button type="button" class="btn" id="charSelectConfirm">${typeof t === "function" ? t("char_select_confirm") : "Play"}</button>`;
  ui.querySelectorAll(".char-pick").forEach(btn => {
    btn.onclick = () => {
      selectedIdx = parseInt(btn.dataset.idx, 10);
      buildUi();
      showCharacter(btn.dataset.id);
    };
  });
  document.getElementById("charSelectConfirm")?.onclick = () => {
    const id = PLAYABLE_CHARACTER_IDS[selectedIdx];
    close();
    onPickCb?.(id);
  };
}

function open(onPick) {
  onPickCb = onPick;
  const wrap = document.getElementById("charSelect");
  if (!wrap) return;
  wrap.classList.add("active");
  const canvas = document.getElementById("charSelect3d");
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x08040f);
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 50);
    camera.position.set(0, 1.6, 4.2);
    camera.lookAt(0, 1.2, 0);
    scene.add(new THREE.AmbientLight(0x6644aa, 0.8));
    const key = new THREE.PointLight(0xff66ff, 2, 12);
    key.position.set(2, 3, 2);
    scene.add(key);
    clock = new THREE.Clock();
  }
  resize();
  loadRig().then(t => {
    rig = t;
    showCharacter(PLAYABLE_CHARACTER_IDS[selectedIdx]);
    loop();
  });
  buildUi();
}

function close() {
  cancelAnimationFrame(raf);
  document.getElementById("charSelect")?.classList.remove("active");
  if (window.speechSynthesis) speechSynthesis.cancel();
}

function resize() {
  const canvas = document.getElementById("charSelect3d");
  if (!canvas || !renderer) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  if (camera) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
}

window.CharSelect = { open, close, resize };
window.addEventListener("resize", () => CharSelect.resize?.());
