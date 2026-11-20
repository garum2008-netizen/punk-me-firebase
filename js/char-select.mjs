import * as THREE from "three";
import {
  loadAllCc0Templates,
  getTemplateForCharacter,
  createCc0Actor
} from "./world/meshy-punk.mjs";
import { updateProcedural } from "./character-rig.mjs";
import { attachAvatarLook } from "./avatar-mesh.mjs";
import { presetFor, HAIR, HAIR_STYLES, SKINS, JACKETS, ACCESSORIES, CYBER_BLUE, WARM_CREW, isCyberBlue } from "./avatar-look.mjs";

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
let previewRim = null;
let draftLook = presetFor("vienna");

function framePreviewActor(root, cam, canvas) {
  root.updateMatrixWorld(true);
  let box = new THREE.Box3().setFromObject(root);
  if (!box.isEmpty()) {
    const center = box.getCenter(new THREE.Vector3());
    root.position.x -= center.x;
    root.position.z -= center.z;
    root.position.y -= box.min.y;
  }
  root.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(root);
  const posedTop = box.isEmpty() ? 1.8 : box.max.y;
  const frameTop = posedTop > 0.9 && posedTop < 3.1 ? Math.max(posedTop, 1.9) + 0.22 : 2.15;
  const centerY = frameTop * 0.5;
  const span = box.isEmpty() ? 1.4 : Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 1.35);
  const vFov = (cam.fov * Math.PI) / 180;
  const aspect = Math.max(canvas.clientWidth, 1) / Math.max(canvas.clientHeight, 1);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const vertFill = 0.76;
  const distV = frameTop / (vertFill * 2 * Math.tan(vFov / 2));
  const distH = span / (vertFill * 2 * Math.tan(hFov / 2));
  const dist = Math.max(distV, distH, 2.6);
  cam.position.set(0, centerY, dist);
  cam.lookAt(0, centerY, 0);
  cam.updateProjectionMatrix();
}

function previewFit() {
  const canvas = document.getElementById("charSelect3d");
  if (!canvas || !camera || !actorRoot) return null;
  const w = canvas.clientWidth || 1;
  const h = canvas.clientHeight || 1;
  const project = (x, y, z) => {
    const v = new THREE.Vector3(x, y, z);
    v.project(camera);
    return { x: (v.x * 0.5 + 0.5), y: (-v.y * 0.5 + 0.5) };
  };
  const feet = project(0, 0.05, 0);
  const head = project(0, 1.82, 0);
  const wingL = project(-0.72, 1.35, 0.08);
  const wingR = project(0.72, 1.35, 0.08);
  const inside = p => p.x > 0.04 && p.x < 0.96 && p.y > 0.04 && p.y < 0.96;
  const span = feet.y - head.y;
  return {
    pass: inside(feet) && inside(head) && inside(wingL) && inside(wingR) && span > 0.45,
    feet, head, wingL, wingR, span
  };
}

function ensurePreviewLights() {
  if (previewLights) return;
  previewLights = new THREE.Group();
  previewLights.add(new THREE.HemisphereLight(0xfff0ff, 0x1a1028, 1.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(2.2, 4.5, 3.8);
  const fill = new THREE.DirectionalLight(0x99ddff, 1.05);
  fill.position.set(-3, 2.5, 2.5);
  previewRim = new THREE.DirectionalLight(0xff66ff, 1.35);
  previewRim.position.set(-0.5, 3.2, -4.2);
  previewLights.add(key, fill, previewRim);
  scene.add(previewLights);
}

function showCharacter(id) {
  if (!templatesReady) return;
  if (actorRoot) scene.remove(actorRoot);
  const def = getCharacterDef(id);
  const tpl = getTemplateForCharacter(id);
  const cyber = isCyberBlue(draftLook);
  if (previewRim) {
    previewRim.color.set(cyber ? 0x33bbff : 0xff66ff);
    previewRim.intensity = cyber ? 0.55 : 1.35;
  }
  const built = createCc0Actor(tpl, id, def.look || {}, {
    isPlayer: false,
    actorId: id,
    forceAccent: cyber ? "blue" : ""
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
  attachAvatarLook(actorRoot, draftLook);
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

function label(key, fallback) {
  return typeof t === "function" ? t(key) : fallback;
}

function swatchButtons(list, key, current) {
  return list.map(sw =>
    `<button type="button" class="avatar-swatch ${current === sw.id ? "active" : ""}" data-avatar-${key}="${sw.id}" style="background:#${sw.color.toString(16).padStart(6, "0")}" aria-label="${sw.id}"></button>`
  ).join("");
}

function creatorHtml() {
  const styles = HAIR_STYLES.map(id =>
    `<button type="button" class="avatar-acc ${draftLook.hairStyle === id ? "active" : ""}" data-avatar-hairstyle="${id}">${label("avatar_style_" + id, id)}</button>`
  ).join("");
  const accessory = ACCESSORIES.map(id =>
    `<button type="button" class="avatar-acc ${draftLook.accessory === id ? "active" : ""}" data-avatar-accessory="${id}">${label("avatar_" + id, id)}</button>`
  ).join("");
  return `<div id="avatarCreator" class="avatar-creator">
    <p>${label("avatar_creator", "Make your look")}</p>
    <div class="avatar-row"><span>${label("avatar_hair", "Hair")}</span>${swatchButtons(HAIR, "hair", draftLook.hair)}</div>
    <div class="avatar-row"><span>${label("avatar_style", "Style")}</span>${styles}</div>
    <div class="avatar-row"><span>${label("avatar_skin", "Skin")}</span>${swatchButtons(SKINS, "skin", draftLook.skin)}</div>
    <div class="avatar-row"><span>${label("avatar_jacket", "Jacket")}</span>${swatchButtons(JACKETS, "jacket", draftLook.jacket)}</div>
    <div class="avatar-row"><span>${label("avatar_accessory", "Detail")}</span>${accessory}</div>
    <button type="button" class="btn" id="avatarCyberBlue" data-avatar-preset="cyber-blue">${label("avatar_cyber", "Cyber punk blue")}</button>
    <button type="button" class="btn" id="avatarWarmCrew" data-avatar-preset="warm-crew">${label("avatar_warm", "Warm skin, blue mohawk, wings")}</button>
  </div>`;
}

function buildUi() {
  const ui = document.getElementById("charSelectUi");
  if (!ui) return;
  ui.innerHTML = getPlayableCharacters().map((c, i) =>
    `<button type="button" class="btn char-pick ${i === selectedIdx ? "active" : ""}" data-idx="${i}" data-id="${c.id}">${c.id.toUpperCase()}</button>`
  ).join("") + creatorHtml() + `<button type="button" class="btn" id="charSelectConfirm">${label("char_select_confirm", "Play")}</button>`;
  ui.querySelectorAll(".char-pick").forEach(btn => {
    btn.onclick = () => {
      selectedIdx = parseInt(btn.dataset.idx, 10);
      draftLook = presetFor(btn.dataset.id);
      buildUi();
      showCharacter(btn.dataset.id);
    };
  });
  ui.querySelectorAll("[data-avatar-hair]").forEach(btn => {
    btn.onclick = () => {
      draftLook = { ...draftLook, hair: btn.dataset.avatarHair };
      buildUi();
      showCharacter(PLAYABLE_CHARACTER_IDS[selectedIdx]);
    };
  });
  ui.querySelectorAll("[data-avatar-jacket]").forEach(btn => {
    btn.onclick = () => {
      draftLook = { ...draftLook, jacket: btn.dataset.avatarJacket };
      buildUi();
      showCharacter(PLAYABLE_CHARACTER_IDS[selectedIdx]);
    };
  });
  ui.querySelectorAll("[data-avatar-accessory]").forEach(btn => {
    btn.onclick = () => {
      draftLook = { ...draftLook, accessory: btn.dataset.avatarAccessory };
      buildUi();
      showCharacter(PLAYABLE_CHARACTER_IDS[selectedIdx]);
    };
  });
  ui.querySelectorAll("[data-avatar-hairstyle]").forEach(btn => {
    btn.onclick = () => {
      draftLook = { ...draftLook, hairStyle: btn.dataset.avatarHairstyle };
      buildUi();
      showCharacter(PLAYABLE_CHARACTER_IDS[selectedIdx]);
    };
  });
  ui.querySelectorAll("[data-avatar-skin]").forEach(btn => {
    btn.onclick = () => {
      draftLook = { ...draftLook, skin: btn.dataset.avatarSkin };
      buildUi();
      showCharacter(PLAYABLE_CHARACTER_IDS[selectedIdx]);
    };
  });
  const cyber = document.getElementById("avatarCyberBlue");
  if (cyber) {
    cyber.onclick = () => {
      draftLook = { ...CYBER_BLUE };
      buildUi();
      showCharacter(PLAYABLE_CHARACTER_IDS[selectedIdx]);
    };
  }
  const warm = document.getElementById("avatarWarmCrew");
  if (warm) {
    warm.onclick = () => {
      draftLook = { ...WARM_CREW };
      buildUi();
      showCharacter(PLAYABLE_CHARACTER_IDS[selectedIdx]);
    };
  }
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
      close();
      onPickCb?.({ id: pick, look: { ...draftLook } });
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
  requestAnimationFrame(() => resize());
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

window.CharSelect = { open, close, resize, previewFit };
