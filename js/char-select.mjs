import * as THREE from "three";
import {
  loadAllCc0Templates,
  getTemplateForCharacter,
  createCc0Actor
} from "./world/meshy-punk.mjs";
import { updateProcedural } from "./character-rig.mjs";

/** Vertical padding inside the canvas (hair top / boots bottom). */
const PREVIEW_MARGIN_Y = 0.08;
/** Camera on +Z; model forward is -Z — quarter-turn toward lens. */
const PREVIEW_FACE_YAW = 0.24;

let renderer, scene, camera, clock, actorRoot, mixer, actions, previewProc;
let selectedIdx = Math.max(0, (typeof PLAYABLE_CHARACTER_IDS !== "undefined"
  ? PLAYABLE_CHARACTER_IDS.indexOf("vienna")
  : 1));
let raf = 0;
let onPickCb = null;
let templatesReady = false;
let previewPhase = 0;
let previewLights = null;

function framePreviewActor(root, cam, canvas) {
  root.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  root.position.y -= box.min.y;

  root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(root);
  const h = Math.max(box.max.y - box.min.y, 0.01);
  const centerY = (box.min.y + box.max.y) * 0.5;
  const wXZ = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 0.01);

  const vFov = (cam.fov * Math.PI) / 180;
  const aspect = canvas.clientWidth / Math.max(canvas.clientHeight, 1);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const vertFill = 1 - PREVIEW_MARGIN_Y * 2;

  const distV = h / (vertFill * 2 * Math.tan(vFov / 2));
  const distH = wXZ / (vertFill * 2 * Math.tan(hFov / 2));
  const dist = Math.max(distV, distH) * 1.02;

  cam.position.set(0, centerY, dist);
  cam.lookAt(0, centerY, 0);
}

function ensurePreviewLights() {
  if (previewLights) return;
  previewLights = new THREE.Group();
  previewLights.add(new THREE.HemisphereLight(0xfff0ff, 0x1a1028, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(2.2, 4.5, 3.8);
  const fill = new THREE.DirectionalLight(0x99ddff, 1.05);
  fill.position.set(-3, 2.5, 2.5);
  const rim = new THREE.DirectionalLight(0xff66ff, 1.35);
  rim.position.set(-0.5, 3.2, -4.2);
  previewLights.add(key, fill, rim);
  scene.add(previewLights);
}

function showCharacter(id) {
  if (!templatesReady) return;
  if (actorRoot) scene.remove(actorRoot);
  const def = getCharacterDef(id);
  const tpl = getTemplateForCharacter(id);
  const built = createCc0Actor(tpl, id, def.look || {}, {
    isPlayer: false,
    actorId: id
  });
  actorRoot = built.root;
  actorRoot.visible = true;
  scene.add(actorRoot);
  mixer = built.mixer;
  actions = built.actions;
  previewProc = built._proc;
  actions.idle?.reset().setEffectiveWeight(1).play();
  mixer.update(0);
  actorRoot.rotation.y = PREVIEW_FACE_YAW;
  updateProcedural(
    { _meshy: true, _proc: previewProc, current: "idle", root: actorRoot },
    0,
    null,
    false
  );
  const canvas = document.getElementById("charSelect3d");
  if (canvas && camera) framePreviewActor(actorRoot, camera, canvas);
  previewPhase = 0;
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
    updateProcedural(
      { _meshy: true, _proc: previewProc, current: "idle", root: actorRoot },
      dt,
      null,
      false
    );
    previewPhase += dt;
    actorRoot.rotation.y = PREVIEW_FACE_YAW + Math.sin(previewPhase * 0.75) * 0.18;
  }
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
    const id = PLAYABLE_CHARACTER_IDS[selectedIdx];
    const joinable = typeof isCharacterJoinable === "function" ? isCharacterJoinable(id) : true;
    confirmBtn.disabled = !joinable;
    confirmBtn.classList.toggle("disabled", !joinable);
    confirmBtn.title = !joinable && typeof t === "function" ? t("char_razor_soon") : "";
    confirmBtn.onclick = () => {
      const pick = PLAYABLE_CHARACTER_IDS[selectedIdx];
      if (typeof isCharacterJoinable === "function" && !isCharacterJoinable(pick)) return;
      // AUDIO_HOOK: unlock Web Audio on explicit confirm
      window.AudioManager?.unlockAudio?.();
      close();
      onPickCb?.(pick);
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
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    } catch (e) {
      wrap.classList.remove("active");
      const msg = e?.message || String(e);
      const detail = /webgl/i.test(msg) ? msg : `Error creating WebGL context: ${msg}`;
      if (typeof window.__punkShowBootFailure === "function") {
        window.__punkShowBootFailure("webgl", detail, { kind: "webgl", code: "webgl" });
      } else if (typeof window.__showLoadingFailure === "function") {
        window.__showLoadingFailure(typeof t === "function" ? t("boot_title_webgl") : "WebGL", detail, { kind: "webgl" });
      }
      return;
    }
    if (!renderer.getContext()) {
      wrap.classList.remove("active");
      const detail = "Error creating WebGL context";
      window.__punkShowBootFailure?.("webgl", detail, { kind: "webgl", code: "webgl" });
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.38;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x12081c);
    camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
    ensurePreviewLights();
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
  if (actorRoot && camera) {
    const savedY = actorRoot.rotation.y;
    actorRoot.rotation.y = PREVIEW_FACE_YAW;
    framePreviewActor(actorRoot, camera, canvas);
    actorRoot.rotation.y = savedY;
  }
}

function close() {
  document.getElementById("charSelect")?.classList.remove("active");
}

window.CharSelect = { open, close, resize };
