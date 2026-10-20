import * as THREE from "three";
import {
  loadAllCc0Templates,
  getTemplateForCharacter,
  createCc0Actor
} from "./world/meshy-punk.mjs";
import { updateProcedural } from "./character-rig.mjs";

let renderer, scene, camera, clock, actorRoot, mixer, actions, previewProc;
let selectedIdx = 0;
let raf = 0;
let onPickCb = null;
let templatesReady = false;

function showCharacter(id) {
  if (!templatesReady) return;
  if (actorRoot) scene.remove(actorRoot);
  const def = getCharacterDef(id);
  const tpl = getTemplateForCharacter(id);
  const built = createCc0Actor(tpl, id, def.look || {}, { isPlayer: true, actorId: "player" });
  actorRoot = built.root;
  actorRoot.visible = true;
  scene.add(actorRoot);
  mixer = built.mixer;
  actions = built.actions;
  previewProc = built._proc;
  const line = characterIntroLine(id);
  const el = document.getElementById("charSelectIntro");
  if (el) el.textContent = line;
  if (line && window.Voice) Voice.speak(line, id);
}

function loop() {
  raf = requestAnimationFrame(loop);
  const dt = clock.getDelta();
  mixer?.update(dt);
  if (actorRoot && previewProc) {
    updateProcedural({ _meshy: true, _proc: previewProc, current: "idle", root: actorRoot }, dt, null, false);
  }
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
  const confirmBtn = document.getElementById("charSelectConfirm");
  if (confirmBtn) {
    confirmBtn.onclick = () => {
      const id = PLAYABLE_CHARACTER_IDS[selectedIdx];
      close();
      onPickCb?.(id);
    };
  }
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
  loadAllCc0Templates().then(() => {
    templatesReady = true;
    buildUi();
    showCharacter(PLAYABLE_CHARACTER_IDS[selectedIdx]);
    if (!raf) loop();
  });
}

function resize() {
  const canvas = document.getElementById("charSelect3d");
  if (!canvas || !renderer) return;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  renderer.setSize(w, h, false);
  if (camera) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
}

function close() {
  document.getElementById("charSelect")?.classList.remove("active");
}

window.CharSelect = { open, close, resize };
