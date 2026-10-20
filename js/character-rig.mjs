import * as THREE from "three";
import { buildBlockyPunkAvatar, hideTemplateMeshes } from "./world/punk-avatar.mjs";

const HIDE_MESH = /^(ClothBottom|ClothTop)$/i;
const SKIP_ANIM = /^(A_TPose|Death)/i;

export function findClip(clips, names) {
  if (!clips?.length) return null;
  const pool = clips.filter(c => c.name && !SKIP_ANIM.test(c.name));
  for (const n of names || []) {
    const c = pool.find(x => x.name === n);
    if (c) return c;
  }
  const idle = pool.find(c => /idle/i.test(c.name));
  return idle || pool[0] || null;
}

export function fixOpaqueMaterials(root) {
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m, i) => {
      const mat = m.clone();
      const n = (o.name || "").toLowerCase();
      const isEye = n.includes("eye");
      mat.transparent = isEye;
      mat.opacity = isEye ? 1 : 1;
      mat.depthWrite = true;
      mat.depthTest = true;
      mat.side = THREE.FrontSide;
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      if (!isEye && mat.alphaTest !== undefined) mat.alphaTest = 0.5;
      if (Array.isArray(o.material)) o.material[i] = mat;
      else o.material = mat;
    });
  });
}

/** Hide template clothes; fix materials; return foot lift for y=0 floor. */
export function prepareTeenScene(scene) {
  hideTemplateMeshes(scene);
  scene.traverse(o => {
    if (o.isMesh && HIDE_MESH.test(o.name || "")) o.visible = false;
  });
  fixOpaqueMaterials(scene);
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  return Math.max(0, -box.min.y + 0.02);
}

export function applyCharacterLook(root, def) {
  buildBlockyPunkAvatar(root, def.look || {});
}

export function createAnimActions(mixer, clips, def) {
  const a = def.anim || {};
  const mk = (key, fallback) => {
    const clip = findClip(clips, a[key] || fallback);
    return clip ? mixer.clipAction(clip) : null;
  };
  const actions = {
    idle: mk("idle", ["Idle_Loop"]),
    walk: mk("walk", ["Walk_Loop"]),
    run: mk("run", ["Jog_Fwd_Loop", "Sprint_Loop"]),
    talk: mk("talk", ["Idle_Talking_Loop"]),
    emote: mk("emote", ["Sword_Idle", "Dance_Loop"]),
    wave: mk("wave", ["Interact", "Spell_Simple_Enter"]),
    sit: mk("sit", ["Sitting_Idle_Loop"]),
    interact: mk("interact", ["Interact", "PickUp_Table", "Fixing_Kneeling"])
  };
  Object.values(actions).forEach(act => {
    if (!act) return;
    act.enabled = true;
    act.setLoop(THREE.LoopRepeat, Infinity);
    if (def.anim?.idleSpeed && act === actions.idle) act.setEffectiveTimeScale(def.anim.idleSpeed);
  });
  Object.values(actions).forEach(act => act?.stop());
  actions.idle?.reset().fadeIn(0.01).play();
  return actions;
}

export function updateProcedural(_actor, _dt, _playerPos, _talking) {
  /* Bone overrides disabled — they fought skinned clips and caused T-pose / spaghetti meshes. */
}

export function markActorVisibleWhenReady(actor) {
  const idle = actor.actions?.idle;
  if (!idle || actor._visibleReady) return;
  if (idle.getEffectiveWeight() > 0.35) {
    actor._visibleReady = true;
    actor.root.visible = true;
  }
}
