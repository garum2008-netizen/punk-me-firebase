import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

export const MESHY_PUNK_URL = "assets/models/meshy/punk_pink.glb";

/** In-place clip names from Meshy / Mixamo export */
const CLIPS = { walk: ["Walking"], run: ["Running"] };

const SKIP_CLIP = /tpose|bind/i;

/** Nominal locomotion speeds (world units/s) for timeScale tuning */
const WALK_SPEED_REF = 1.05;
const RUN_SPEED_REF = 2.35;

let template = null;

export async function loadMeshyPunkTemplate() {
  if (template) return template;
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(MESHY_PUNK_URL);
  gltf.scene.updateMatrixWorld(true);
  const foot = computeFootLift(gltf.scene);
  template = { gltf, foot, def: { url: MESHY_PUNK_URL, scale: 1.0, yRot: 0, clips: CLIPS } };
  return template;
}

/** @deprecated alias for world3d */
export async function loadAllCc0Templates() {
  await loadMeshyPunkTemplate();
  return new Map([["meshy", template]]);
}

export function getTemplateForCharacter(_characterId) {
  return { key: "meshy", ...template };
}

function computeFootLift(scene) {
  const box = new THREE.Box3().setFromObject(scene);
  return Math.max(0, -box.min.y + 0.002);
}

export function findBone(root, shortName) {
  const variants = [
    shortName,
    `mixamorig${shortName}`,
    `mixamorig:${shortName}`,
    `mixamorig${shortName.replace(/^mixamorig/i, "")}`
  ];
  for (const n of variants) {
    const b = root.getObjectByName(n);
    if (b) return b;
  }
  let found = null;
  root.traverse(o => {
    if (found || !o.isBone) return;
    const tail = o.name.split(/[:]/).pop();
    if (tail === shortName || o.name.endsWith(shortName)) found = o;
  });
  return found;
}

export function findHeadBone(root) {
  return findBone(root, "Head") || findBone(root, "head");
}

/** Tint single-material Meshy mesh per character look (hair / jacket accents). */
export function applyPunkMaterials(root, look = {}) {
  const jacket = new THREE.Color(look.jacket || 0x1a1030);
  const emissive = new THREE.Color(look.emissive || 0xff00ff);
  const hairCol = new THREE.Color(look.hair || 0xff3399);
  const skinTint = look.tint ? new THREE.Color(look.tint) : null;

  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m, i) => {
      const mat = m.clone();
      if (mat.map) {
        mat.color.lerp(jacket, 0.12);
        mat.emissive.copy(emissive);
        mat.emissiveIntensity = 0.06;
        if (skinTint) mat.color.lerp(skinTint, 0.08);
        const h = hairCol.getHSL({ h: 0, s: 0, l: 0 });
        if (h.s > 0.35) {
          mat.color.lerp(hairCol, 0.22);
          mat.emissive.lerp(hairCol, 0.18);
          mat.emissiveIntensity = 0.12;
        }
      }
      mat.metalness = Math.min(0.4, mat.metalness ?? 0.25);
      mat.roughness = Math.max(0.42, mat.roughness ?? 0.55);
      mat.transparent = false;
      mat.depthWrite = true;
      if (Array.isArray(o.material)) o.material[i] = mat;
      else o.material = mat;
      o.castShadow = true;
      o.receiveShadow = true;
    });
  });
}

function pickClip(clips, names) {
  const pool = (clips || []).filter(c => c.name && !SKIP_CLIP.test(c.name));
  for (const n of names || []) {
    const c = pool.find(x => x.name === n);
    if (c) return c;
  }
  return pool[0];
}

export function buildLocomotionActions(mixer, clips, clipMap) {
  const actions = {};
  for (const [state, names] of Object.entries(clipMap)) {
    const clip = pickClip(clips, names);
    if (clip) {
      const a = mixer.clipAction(clip);
      a.enabled = true;
      a.setLoop(THREE.LoopRepeat, Infinity);
      a.stop();
      actions[state] = a;
    }
  }
  return actions;
}

/** Lower arms from bind T/A-pose toward natural stand (local Z, Mixamo). */
const ARM_REST_Z = 1.12;

export function bindProceduralBones(root) {
  const bones = {
    hips: findBone(root, "Hips"),
    spine: findBone(root, "Spine"),
    spine1: findBone(root, "Spine1"),
    spine2: findBone(root, "Spine2"),
    neck: findBone(root, "Neck"),
    head: findHeadBone(root),
    leftArm: findBone(root, "LeftArm"),
    rightArm: findBone(root, "RightArm"),
    rightForeArm: findBone(root, "RightForeArm")
  };
  const rest = {};
  if (bones.leftArm) rest.leftArmZ = bones.leftArm.rotation.z;
  if (bones.rightArm) rest.rightArmZ = bones.rightArm.rotation.z;
  if (bones.spine) rest.spineX = bones.spine.rotation.x;
  if (bones.spine1) rest.spine1X = bones.spine1.rotation.x;
  if (bones.head) rest.headX = bones.head.rotation.x;
  if (bones.rightArm) rest.rightArmX = bones.rightArm.rotation.x;
  if (bones.rightForeArm) rest.rightForeArmX = bones.rightForeArm.rotation.x;
  return { bones, rest };
}

export function createMeshyActor(templateEntry, _characterId, look) {
  const { gltf, foot, def } = templateEntry;
  const root = cloneSkinned(gltf.scene);
  const scl = def.scale * (look.scale || 1);
  root.scale.setScalar(scl);
  root.rotation.y = def.yRot;
  root.position.y = foot * scl;
  root.visible = false;
  applyPunkMaterials(root, look);
  const mixer = new THREE.AnimationMixer(root);
  const actions = buildLocomotionActions(mixer, gltf.animations, def.clips);
  actions.walk?.stop();
  actions.run?.stop();
  const proc = bindProceduralBones(root);
  return {
    root,
    mixer,
    actions,
    templateKey: def.url,
    _meshy: true,
    _proc: proc,
    _walkDur: gltf.animations.find(c => c.name === "Walking")?.duration || 1.03,
    _runDur: gltf.animations.find(c => c.name === "Running")?.duration || 0.63
  };
}

export function createCc0Actor(templateEntry, characterId, look) {
  return createMeshyActor(templateEntry, characterId, look);
}

export function updateLocomotionTimeScale(actor) {
  if (!actor._meshy || !actor.actions) return;
  const spd = actor._spd || 0;
  if (actor.current === "walk" && actor.actions.walk) {
    actor.actions.walk.timeScale = THREE.MathUtils.clamp(spd / WALK_SPEED_REF, 0.55, 2.1);
  } else if (actor.current === "run" && actor.actions.run) {
    actor.actions.run.timeScale = THREE.MathUtils.clamp(spd / RUN_SPEED_REF, 0.65, 2.4);
  }
}

export { ARM_REST_Z };
