import * as THREE from "three";
import {
  loadAllCc0Templates,
  getTemplateForCharacter,
  createCc0Actor
} from "./world/meshy-punk.mjs";
import { updateProcedural } from "./character-rig.mjs";
import { loadAvatarCatalog } from "./avatar/avatar-catalog.mjs";
import { mountCharacterStudio } from "./avatar/character-studio.mjs";

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
let pendingSliceSkin = "A";

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

function showCharacter(id, lookOverride) {
  if (!templatesReady) return;
  if (actorRoot) scene.remove(actorRoot);
  const def = getCharacterDef(id);
  const tpl = getTemplateForCharacter(id);
  const look = lookOverride ? { ...(def.look || {}), ...lookOverride } : def.look || {};
  const built = createCc0Actor(tpl, id, look, {
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
    if (typeof window !== "undefined") window.__charSelectPreviewYaw = actorRoot.rotation.y;
  }
  renderer?.render(scene, camera);
}

/** t204u: Character Studio from first session (player ≠ Angelina). */
function useCharacterStudio() {
  if (typeof window !== "undefined" && window.__PUNK_PREVIEW__ === true) return true;
  if (typeof window !== "undefined" && window.__PUNK_LIFE_CH1_LOCAL__ === true) return true;
  return window.LifeCh1Slice?.isLifeCh1SliceEnabled?.() === true;
}

let studioApi = null;

function portraitUrl(manifest, skinId) {
  const rel = manifest?.skins?.[skinId]?.portrait?.path;
  return rel ? rel : "";
}

async function buildSlicePortraitUi() {
  const canvas = document.getElementById("charSelect3d");
  const portraits = document.getElementById("charSelectPortraits");
  if (canvas) {
    canvas.hidden = true;
    canvas.setAttribute("aria-hidden", "true");
  }
  if (!portraits) return;
  portraits.hidden = false;
  portraits.removeAttribute("aria-hidden");
  let manifest = null;
  try {
    const r = await fetch("data/story/angelina-skin-manifest.json", { cache: "no-store" });
    manifest = await r.json();
  } catch (_) {}
  pendingSliceSkin = "A";
  const confirmLabel = typeof t === "function" ? t("char_select_confirm") : "Play";
  const title = typeof t === "function" ? t("char_select_angelina") : "Angelina";
  portraits.innerHTML =
    `<p class="char-select-slice-title" data-testid="char-select-angelina">${escapeHtml(title)}</p>` +
    `<div class="char-select-portrait-grid">` +
    ["A", "B", "C"]
      .map(
        id =>
          `<button type="button" class="char-portrait-pick${id === "A" ? " selected" : ""}" data-skin="${id}">` +
          `<img src="${portraitUrl(manifest, id)}" alt="Angelina ${id}" loading="eager">` +
          `<span>${id}</span></button>`
      )
      .join("") +
    `</div>` +
    `<button type="button" class="btn" id="charSelectConfirm">${confirmLabel}</button>`;
  portraits.querySelectorAll(".char-portrait-pick").forEach(btn => {
    btn.onclick = () => {
      pendingSliceSkin = btn.dataset.skin || "A";
      portraits.querySelectorAll(".char-portrait-pick").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
    };
  });
  const meshId = window.LIFE_CH1_PLAYER_MESH_ID || "life_ch1_proxy";
  document.getElementById("charSelectConfirm").onclick = () => {
    close();
    onPickCb?.(meshId, pendingSliceSkin);
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function buildUi() {
  const ui = document.getElementById("charSelectUi");
  if (!ui) return;
  if (useCharacterStudio()) {
    ui.innerHTML = "";
    return;
  }
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
      close();
      onPickCb?.(pick);
    };
  }
}

async function openCharacterStudio(onPick) {
  onPickCb = onPick;
  const wrap = document.getElementById("charSelect");
  if (!wrap) return;
  wrap.classList.add("active");
  const canvas = document.getElementById("charSelect3d");
  const portraits = document.getElementById("charSelectPortraits");
  if (canvas) {
    canvas.hidden = false;
    canvas.removeAttribute("aria-hidden");
  }
  if (portraits) {
    portraits.hidden = true;
    portraits.setAttribute("aria-hidden", "true");
  }
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
  await loadAvatarCatalog();
  await loadAllCc0Templates().then(() => {
    templatesReady = true;
    if (!raf) loop();
  });
  const studioHost = document.getElementById("charSelectUi");
  studioApi = await mountCharacterStudio(studioHost, {
    onPreview: (meshId, look) => showCharacter(meshId, look),
    onConfirm: cfg => {
      close();
      onPickCb?.(cfg.meshId, cfg.companionAngelinaSkin, cfg);
    }
  });
}

function open(onPick) {
  onPickCb = onPick;
  const wrap = document.getElementById("charSelect");
  if (!wrap) return;
  wrap.classList.add("active");
  if (useCharacterStudio()) {
    openCharacterStudio(onPick);
    return;
  }
  const canvas = document.getElementById("charSelect3d");
  const portraits = document.getElementById("charSelectPortraits");
  if (canvas) {
    canvas.hidden = false;
    canvas.removeAttribute("aria-hidden");
  }
  if (portraits) {
    portraits.hidden = true;
    portraits.setAttribute("aria-hidden", "true");
  }
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
  loadAllCc0Templates().then(() => {
    templatesReady = true;
    buildUi();
    showCharacter(PLAYABLE_CHARACTER_IDS[selectedIdx]);
    if (!raf) loop();
  });
}

function resize() {
  const canvas = document.getElementById("charSelect3d");
  if (!canvas || !renderer || canvas.hidden) return;
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

window.CharSelect = {
  open,
  close,
  resize,
  getPendingSliceSkin: () => pendingSliceSkin,
  useCharacterStudio
};
