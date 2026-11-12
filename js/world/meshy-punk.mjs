import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "../vendor/meshopt_decoder.module.js";
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
const templateLoadedListeners = new Set();

export function onMeshyTemplateLoaded(fn) {
  if (typeof fn !== "function") return () => {};
  templateLoadedListeners.add(fn);
  return () => templateLoadedListeners.delete(fn);
}

function notifyTemplateLoaded(characterId) {
  templateLoadedListeners.forEach(fn => {
    try {
      fn(characterId);
    } catch (e) {
      console.warn("onMeshyTemplateLoaded", e);
    }
  });
}

export function meshyTemplateReady(characterId, opts = {}) {
  const { allowFallback = false } = opts;
  const t = getTemplateForCharacter(characterId, { allowFallback });
  return !!t?.gltf;
}

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

function isRootMotionTrack(track) {
  const n = track.name || "";
  if (!/\.position$/i.test(n)) return false;
  return /hips|root|pelvis/i.test(n);
}

/** Remove horizontal root translation from locomotion clips (code drives XZ). */
function stripLocomotionRootMotion(clip) {
  if (!clip?.tracks?.length) return clip;
  const tracks = clip.tracks.filter(t => !isRootMotionTrack(t));
  if (tracks.length === clip.tracks.length) return clip;
  return new THREE.AnimationClip(clip.name, clip.duration, tracks);
}

function sanitizeGltfAnimations(animations) {
  return (animations || []).map(c => {
    if (!/walk|run/i.test(c.name)) return c;
    return stripLocomotionRootMotion(c);
  });
}

function buildTemplateFromGltf(gltf, url, usesFallback) {
  gltf.scene.updateMatrixWorld(true);
  const foot = computeFootLift(gltf.scene);
  const hasNativeIdle = gltfHasIdleClip(gltf);
  const idleClip = hasNativeIdle ? null : buildIdleStandClip(gltf);
  const animations = sanitizeGltfAnimations([...gltf.animations]);
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

/** Heroes that must use their own GLB when present in shipped.json (not Vienna stand-in). */
export function isDedicatedShippedHero(characterId) {
  const id = characterId || DEFAULT_MESHY_CHARACTER;
  if (id === "vienna" || id === "life_ch1_proxy") return true;
  if (!shippedMeshyIds) return id === "vienna";
  return shippedMeshyIds.includes(id);
}

async function loadGltfOnce(loader, url) {
  return loader.loadAsync(url);
}

async function loadGltfWithRetry(loader, url) {
  try {
    return await loadGltfOnce(loader, url);
  } catch (_) {
    await new Promise(r => setTimeout(r, 450));
    return loadGltfOnce(loader, url);
  }
}

function markTemplateLoadFailed(id, url) {
  templateByCharacter.set(id, {
    loadFailed: true,
    failedUrl: url,
    usesFallback: false,
    def: { url, scale: 1.0, yRot: 0, clips: CLIPS_MESHY_IDLE }
  });
  notifyTemplateLoaded(id);
}

export async function loadMeshyTemplateForCharacter(characterId) {
  const id = characterId || DEFAULT_MESHY_CHARACTER;
  const existing = templateByCharacter.get(id);
  if (existing) {
    if (existing.loadFailed) return null;
    return existing;
  }

  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
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

  try {
    const gltf = await loadGltfWithRetry(loader, url);
    const entry = buildTemplateFromGltf(gltf, url, usesFallback);
    if (id === "vienna") entry.usesFallback = false;
    templateByCharacter.set(id, entry);
    notifyTemplateLoaded(id);
    return entry;
  } catch (_) {
    if (shipped.includes(id) && id !== "vienna") {
      markTemplateLoadFailed(id, url.split("?")[0]);
      return null;
    }
    if (!usesFallback && id !== "vienna") {
      markTemplateLoadFailed(id, url);
      return null;
    }
    try {
      const gltf = await loadGltfWithRetry(loader, MESHY_FALLBACK_GLB);
      const entry = buildTemplateFromGltf(gltf, MESHY_FALLBACK_GLB, true);
      entry.usesFallback = true;
      templateByCharacter.set(id, entry);
      notifyTemplateLoaded(id);
      return entry;
    } catch (_e) {
      markTemplateLoadFailed(id, url);
      return null;
    }
  }
}

/** @deprecated use loadMeshyTemplateForCharacter("vienna") */
export async function loadMeshyPunkTemplate() {
  return loadMeshyTemplateForCharacter("vienna");
}

export async function loadAllCc0Templates() {
  const ids =
    typeof PLAYABLE_CHARACTER_IDS !== "undefined"
      ? PLAYABLE_CHARACTER_IDS
      : ["razor", "vienna", "cobalt", "mohawk"];
  await Promise.all(ids.map(id => loadMeshyTemplateForCharacter(id)));
  const proxy = templateByCharacter.get("vienna");
  if (proxy) templateByCharacter.set("life_ch1_proxy", proxy);
  return templateByCharacter;
}

export function getTemplateForCharacter(characterId, opts = {}) {
  const { allowFallback = true } = opts;
  const raw = characterId || DEFAULT_MESHY_CHARACTER;
  const id = raw === "life_ch1_proxy" ? "vienna" : raw;
  let t = templateByCharacter.get(raw) || templateByCharacter.get(id);
  if (t?.loadFailed) return null;
  if (t && !allowFallback && t.usesFallback) t = null;
  if (!t && allowFallback) t = templateByCharacter.get(DEFAULT_MESHY_CHARACTER);
  if (t?.loadFailed) return null;
  if (!t) return null;
  return { key: raw, characterId: id, ...t };
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

function attachCosmeticWings(root, look) {
  if (!look?.wings) return null;
  const existing = root.getObjectByName("cosmetic_wings");
  if (existing) root.remove(existing);
  const wingGroup = new THREE.Group();
  wingGroup.name = "cosmetic_wings";
  const em = look.emissive ?? 0x95ff00;
  const mat = new THREE.MeshStandardMaterial({
    color: em,
    emissive: em,
    emissiveIntensity: 0.75,
    metalness: 0.15,
    roughness: 0.45,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2
  });
  const geo = new THREE.PlaneGeometry(0.48, 1.05);
  for (const side of [-1, 1]) {
    const w = new THREE.Mesh(geo, mat.clone());
    w.position.set(side * 0.36, 1.28, -0.18);
    w.rotation.y = side * 0.42;
    w.rotation.z = side * 0.22;
    wingGroup.add(w);
  }
  root.add(wingGroup);
  return wingGroup;
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

  const wings = attachCosmeticWings(root, look);

  return {
    root,
    mixer,
    actions,
    templateKey: def.url,
    meshUrl: def.url,
    _meshy: true,
    _proc: proc,
    _accent: accent,
    _wings: wings
  };
}

export function createCc0Actor(templateEntry, characterId, look, opts) {
  return createMeshyActor(templateEntry, characterId, look, opts);
}

export function updateLocomotionTimeScale(actor) {
  if (!actor._meshy || !actor.actions) return;
  const spd = actor._locoSpeed ?? actor._spd ?? 0;
  if (actor.current === "walk" && actor.actions.walk) {
    actor.actions.walk.timeScale = THREE.MathUtils.clamp(spd / WALK_SPEED_REF, 0.72, 1.35);
  } else if (actor.current === "run" && actor.actions.run) {
    actor.actions.run.timeScale = THREE.MathUtils.clamp(spd / RUN_SPEED_REF, 0.82, 1.45);
  }
}
