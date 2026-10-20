import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { buildIdleStandClip } from "./meshy-idle-clip.mjs";
import { buildWaveClip } from "./meshy-wave-clip.mjs";
import { accentForActor, hueShiftAccentTexture } from "./meshy-accent-tint.mjs";

export const MESHY_PUNK_URL = "assets/models/meshy/punk_pink.glb";

const CLIPS = {
  idle: ["IdleStand"],
  walk: ["Walking"],
  run: ["Running"],
  wave: ["PlayerWave"]
};
const SKIP_CLIP = /tpose|bind/i;
const WALK_SPEED_REF = 1.05;
const RUN_SPEED_REF = 2.35;

let template = null;

export async function loadMeshyPunkTemplate() {
  if (template) return template;
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(MESHY_PUNK_URL);
  gltf.scene.updateMatrixWorld(true);
  const foot = computeFootLift(gltf.scene);
  const idleClip = buildIdleStandClip(gltf);
  const waveClip = idleClip ? buildWaveClip(gltf, idleClip) : null;
  const animations = [...gltf.animations];
  if (idleClip) animations.push(idleClip);
  if (waveClip) animations.push(waveClip);
  template = {
    gltf: { ...gltf, animations },
    foot,
    idleClip,
    waveClip,
    def: { url: MESHY_PUNK_URL, scale: 1.0, yRot: 0, clips: CLIPS }
  };
  return template;
}

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
    `mixamorig:${shortName}`
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
  return findBone(root, "Head");
}

export function applyPunkMaterials(root, _look = {}, opts = {}) {
  const { isPlayer = false, accent = null } = opts;
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m, i) => {
      const mat = m.clone();
      if (mat.map) {
        if (!isPlayer && accent) {
          mat.map = hueShiftAccentTexture(mat.map, accent);
        } else {
          mat.map = mat.map.clone();
          mat.map.needsUpdate = true;
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

export function buildMeshyActions(mixer, clips, clipMap) {
  const actions = {};
  for (const [state, names] of Object.entries(clipMap)) {
    const clip = pickClip(clips, names);
    if (!clip) continue;
    const a = mixer.clipAction(clip);
    a.enabled = true;
    if (state === "wave") {
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
    } else {
      a.setLoop(THREE.LoopRepeat, Infinity);
    }
    a.stop();
    actions[state] = a;
  }
  return actions;
}

export function bindProceduralBones(root) {
  return {
    bones: {
      spine: findBone(root, "Spine"),
      spine1: findBone(root, "Spine1"),
      head: findHeadBone(root),
      rightArm: findBone(root, "RightArm"),
      rightForeArm: findBone(root, "RightForeArm")
    },
    rest: {}
  };
}

export function createMeshyActor(templateEntry, characterId, look, opts = {}) {
  const { gltf, foot, def } = templateEntry;
  const actorId = opts.actorId || "player";
  const isPlayer = opts.isPlayer ?? actorId === "player";
  const accent = isPlayer ? null : accentForActor(characterId, actorId);

  const root = cloneSkinned(gltf.scene);
  const scl = def.scale * (look.scale || 1);
  root.scale.setScalar(scl);
  root.rotation.y = def.yRot;
  root.position.y = foot * scl;
  root.visible = false;

  applyPunkMaterials(root, look, { isPlayer, accent });

  const mixer = new THREE.AnimationMixer(root);
  const actions = buildMeshyActions(mixer, gltf.animations, def.clips);
  ["walk", "run", "wave"].forEach(k => actions[k]?.stop());
  actions.idle?.reset().play();
  mixer.update(0);

  const proc = bindProceduralBones(root);
  if (proc.bones.spine) proc.rest.spineX = proc.bones.spine.rotation.x;
  if (proc.bones.spine1) proc.rest.spine1X = proc.bones.spine1.rotation.x;
  if (proc.bones.head) proc.rest.headX = proc.bones.head.rotation.x;
  if (proc.bones.rightArm) {
    proc.rest.rightArmX = proc.bones.rightArm.rotation.x;
    proc.rest.rightArmZ = proc.bones.rightArm.rotation.z;
  }
  if (proc.bones.rightForeArm) proc.rest.rightForeArmX = proc.bones.rightForeArm.rotation.x;

  return {
    root,
    mixer,
    actions,
    templateKey: def.url,
    _meshy: true,
    _proc: proc,
    _accent: accent
  };
}

export function createCc0Actor(templateEntry, characterId, look, opts) {
  return createMeshyActor(templateEntry, characterId, look, opts);
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
