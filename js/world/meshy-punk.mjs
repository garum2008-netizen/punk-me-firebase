import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";
import { buildIdleStandClip } from "./meshy-idle-clip.mjs";
// PlayerWave builder kept in meshy-wave-clip.mjs (disabled for release — see WAVE_EMOTE_ENABLED).
import { accentForActor, hueShiftAccentTexture } from "./meshy-accent-tint.mjs";

/** Inna-approved merge: wave emote off; clip file remains for future use. */
export const WAVE_EMOTE_ENABLED = false;

/** Neon Rebel — canonical Vienna mesh (Inna). */
export const MESHY_FALLBACK_GLB = "assets/models/meshy/punk_pink.glb";
export const MESHY_PUNK_URL = MESHY_FALLBACK_GLB;
export const DEFAULT_MESHY_CHARACTER = "vienna";

const MESHY_FOOT_LIFT_EXTRA = { razor: 0.03 };

const CLIPS_FALLBACK = {
  idle: ["IdleStand"],
  walk: ["Walking"],
  run: ["Running"]
};
const CLIPS_MESHY_IDLE = {
  idle: ["Idle"],
  walk: ["Walking"],
  run: ["Running"]
};
const SKIP_CLIP = /tpose|bind/i;
const WALK_SPEED_REF = 1.05;
const RUN_SPEED_REF = 2.35;

/** Per-hero GLB path; drop `assets/models/meshy/<id>.glb` to replace stand-ins. */
const MESHY_DIRECT_URL = {
  vienna: MESHY_FALLBACK_GLB
};

const templateByCharacter = new Map();

export function meshyGlbPathForHero(characterId) {
  const id = characterId || DEFAULT_MESHY_CHARACTER;
  if (id === "razor") return "assets/models/meshy/razor.glb?v=2";
  return MESHY_DIRECT_URL[id] || `assets/models/meshy/${id}.glb`;
}

/** Original albedo (no hue shift) — Vienna always; others when their dedicated GLB loaded. */
export function meshyUsesTint(characterId, templateEntry) {
  if ((characterId || DEFAULT_MESHY_CHARACTER) === "vienna") return false;
  return !!templateEntry?.usesFallback;
}

function computeFootLift(scene) {
  const box = new THREE.Box3().setFromObject(scene);
  return Math.max(0, -box.min.y + 0.002);
}

function gltfHasIdleClip(gltf) {
  return (gltf.animations || []).some(c => c.name === "Idle" && !SKIP_CLIP.test(c.name));
}

function clipMapForGltf(gltf) {
  return gltfHasIdleClip(gltf) ? CLIPS_MESHY_IDLE : CLIPS_FALLBACK;
}

function buildTemplateFromGltf(gltf, url, usesFallback) {
  gltf.scene.updateMatrixWorld(true);
  const foot = computeFootLift(gltf.scene);
  const hasNativeIdle = gltfHasIdleClip(gltf);
  const idleClip = hasNativeIdle ? null : buildIdleStandClip(gltf);
  const animations = [...gltf.animations];
  if (idleClip) animations.push(idleClip);
  return {
    gltf: { ...gltf, animations },
    foot,
    idleClip,
    usesFallback,
    hasNativeIdle,
    def: { url, scale: 1.0, yRot: 0, clips: clipMapForGltf({ animations }) }
  };
}

let shippedMeshyIds = null;

async function getShippedMeshyIds() {
  if (shippedMeshyIds) return shippedMeshyIds;
  try {
    const res = await fetch("assets/models/meshy/shipped.json");
    shippedMeshyIds = res.ok ? await res.json() : ["vienna"];
  } catch {
    shippedMeshyIds = ["vienna"];
  }
  return shippedMeshyIds;
}

export async function loadMeshyTemplateForCharacter(characterId) {
  const id = characterId || DEFAULT_MESHY_CHARACTER;
  if (templateByCharacter.has(id)) return templateByCharacter.get(id);

  const loader = new GLTFLoader();
  const shipped = await getShippedMeshyIds();
  const primary = meshyGlbPathForHero(id);
  let url;
  let usesFallback;

  if (id === "vienna") {
    url = MESHY_FALLBACK_GLB;
    usesFallback = false;
  } else if (shipped.includes(id)) {
    url = primary;
    usesFallback = false;
  } else {
    url = MESHY_FALLBACK_GLB;
    usesFallback = true;
  }

  const gltf = await loader.loadAsync(url);
  const entry = buildTemplateFromGltf(gltf, url, usesFallback);
  if (id === "vienna") entry.usesFallback = false;
  templateByCharacter.set(id, entry);
  return entry;
}

/** @deprecated use loadMeshyTemplateForCharacter("vienna") */
export async function loadMeshyPunkTemplate() {
  return loadMeshyTemplateForCharacter("vienna");
}

export async function loadAllCc0Templates() {
  const ids = typeof PLAYABLE_CHARACTER_IDS !== "undefined"
    ? PLAYABLE_CHARACTER_IDS
    : ["razor", "vienna", "cobalt", "mohawk"];
  await Promise.all(ids.map(id => loadMeshyTemplateForCharacter(id)));
  return templateByCharacter;
}

export function getTemplateForCharacter(characterId) {
  const id = characterId || DEFAULT_MESHY_CHARACTER;
  const t = templateByCharacter.get(id) || templateByCharacter.get(DEFAULT_MESHY_CHARACTER);
  if (!t) return null;
  return { key: id, characterId: id, ...t };
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
  const { accent = null } = opts;
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m, i) => {
      const mat = m.clone();
      if (mat.map) {
        if (accent) {
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
    a.setLoop(THREE.LoopRepeat, Infinity);
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

function accentForMeshyActor(characterId, templateEntry, opts) {
  if (!meshyUsesTint(characterId, templateEntry)) return null;
  const actorId = opts.actorId || "player";
  const accentKey = actorId === "player" ? characterId : actorId;
  return accentForActor(characterId, accentKey);
}

export function createMeshyActor(templateEntry, characterId, look, opts = {}) {
  const { gltf, foot, def } = templateEntry;
  const accent = accentForMeshyActor(characterId, templateEntry, opts);

  const root = cloneSkinned(gltf.scene);
  const scl = def.scale * (look.scale || 1);
  root.scale.setScalar(scl);
  root.rotation.y = def.yRot;
  root.position.y = foot * scl + (MESHY_FOOT_LIFT_EXTRA[characterId] || 0);
  root.visible = false;

  applyPunkMaterials(root, look, { accent });

  const mixer = new THREE.AnimationMixer(root);
  const actions = buildMeshyActions(mixer, gltf.animations, def.clips);
  ["walk", "run"].forEach(k => actions[k]?.stop());
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
