import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/addons/utils/SkeletonUtils.js";

/** Self-contained GLB per archetype — mesh + clips share one skeleton. */
export const CC0_MODELS = {
  soldier: {
    url: "assets/models/cc0/soldier.glb",
    clips: { idle: ["Idle"], walk: ["Walk"], run: ["Run"], sit: ["Idle"], wave: ["Idle"], talk: ["Idle"], interact: ["Idle"], emote: ["Idle"] },
    scale: 1.0,
    yRot: 0
  },
  xbot: {
    url: "assets/models/cc0/xbot.glb",
    clips: { idle: ["idle"], walk: ["walk"], run: ["run"], sit: ["sad_pose"], wave: ["agree"], talk: ["idle"], interact: ["headShake"], emote: ["sneak_pose"] },
    scale: 1.0,
    yRot: 0
  },
  robot: {
    url: "assets/models/cc0/robot-expressive.glb",
    clips: {
      idle: ["Idle"], walk: ["Walking"], run: ["Running"], sit: ["Sitting"],
      wave: ["ThumbsUp"], talk: ["Idle"], interact: ["Punch"], emote: ["Dance"]
    },
    scale: 1.0,
    yRot: 0
  }
};

const SKIP_CLIP = /tpose|bind/i;

const templates = new Map();

export async function loadAllCc0Templates() {
  const loader = new GLTFLoader();
  const entries = Object.entries(CC0_MODELS);
  await Promise.all(entries.map(async ([key, def]) => {
    const gltf = await loader.loadAsync(def.url);
    gltf.scene.updateMatrixWorld(true);
    const foot = computeFootLift(gltf.scene);
    templates.set(key, { gltf, foot, def });
  }));
  return templates;
}

export function getTemplateForCharacter(characterId) {
  const map = {
    razor: "soldier",
    mohawk: "xbot",
    vienna: "robot",
    cobalt: "xbot",
    ghost: "robot",
    gravedigger: "soldier"
  };
  const key = map[characterId] || "soldier";
  return { key, ...templates.get(key) };
}

function computeFootLift(scene) {
  const box = new THREE.Box3().setFromObject(scene);
  return Math.max(0, -box.min.y + 0.01);
}

export function findHeadBone(root) {
  const names = ["mixamorigHead", "Head", "head", "mixamorig:Head", "DEF-head"];
  for (const n of names) {
    const b = root.getObjectByName(n);
    if (b) return b;
  }
  let found = null;
  root.traverse(o => {
    if (!found && o.isBone && /head/i.test(o.name)) found = o;
  });
  return found;
}

export function applyPunkMaterials(root, look = {}) {
  const jacket = new THREE.Color(look.jacket || 0x1a1030);
  const emissive = new THREE.Color(look.emissive || 0xff00ff);
  const hairCol = new THREE.Color(look.hair || 0xff00ff);
  root.traverse(o => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m, i) => {
      const mat = m.clone();
      const n = (o.name || "").toLowerCase();
      if (mat.map) {
        mat.emissive.copy(emissive);
        mat.emissiveIntensity = 0.06;
      } else if (n.includes("hair") || n.includes("mohawk")) {
        mat.color.copy(hairCol);
        mat.emissive.copy(hairCol);
        mat.emissiveIntensity = 0.35;
      } else if (look.tint && (n.includes("skin") || n.includes("face"))) {
        mat.color.lerp(new THREE.Color(look.tint), 0.2);
      } else {
        mat.color.lerp(jacket, 0.22);
        mat.emissive.copy(emissive);
        mat.emissiveIntensity = 0.1;
      }
      mat.transparent = false;
      mat.depthWrite = true;
      mat.metalness = Math.min(0.35, mat.metalness ?? 0.2);
      mat.roughness = Math.max(0.35, mat.roughness ?? 0.5);
      if (Array.isArray(o.material)) o.material[i] = mat;
      else o.material = mat;
      o.castShadow = true;
      o.receiveShadow = true;
    });
  });
}

export function attachMohawk(headBone, look) {
  if (!headBone || !look.hairStyle) return;
  const hairCol = new THREE.Color(look.hair || 0xff00ff);
  const mat = new THREE.MeshStandardMaterial({
    color: hairCol, emissive: hairCol, emissiveIntensity: 0.4, roughness: 0.4
  });
  const style = look.hairStyle;
  if (style === "mohawk") {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 6), mat);
    m.position.set(0, 0.14, 0);
    m.rotation.x = -0.12;
    headBone.add(m);
  } else if (style === "pigtails") {
    [-0.11, 0.11].forEach(sx => {
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), mat);
      t.position.set(sx, 0.1, -0.02);
      headBone.add(t);
    });
  } else if (style === "spikes") {
    for (let i = -1; i <= 1; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 5), mat);
      s.position.set(i * 0.05, 0.15, 0);
      headBone.add(s);
    }
  }
}

function pickClip(clips, names) {
  const pool = (clips || []).filter(c => c.name && !SKIP_CLIP.test(c.name));
  for (const n of names || []) {
    const c = pool.find(x => x.name === n);
    if (c) return c;
  }
  return pool.find(c => /idle/i.test(c.name)) || pool[0];
}

export function buildActions(mixer, clips, clipMap) {
  const actions = {};
  for (const [state, names] of Object.entries(clipMap)) {
    const clip = pickClip(clips, names);
    if (clip) actions[state] = mixer.clipAction(clip);
  }
  Object.values(actions).forEach(a => {
    a.enabled = true;
    a.setLoop(THREE.LoopRepeat, Infinity);
  });
  Object.values(actions).forEach(a => a?.stop());
  actions.idle?.reset().fadeIn(0.05).play();
  return actions;
}

export function createCc0Actor(templateEntry, characterId, look) {
  const { gltf, foot, def } = templateEntry;
  const root = cloneSkinned(gltf.scene);
  const scl = def.scale * (look.scale || 1);
  root.scale.setScalar(scl);
  root.rotation.y = def.yRot;
  root.position.y = foot * scl;
  root.visible = false;
  applyPunkMaterials(root, look);
  attachMohawk(findHeadBone(root), look);
  const mixer = new THREE.AnimationMixer(root);
  const actions = buildActions(mixer, gltf.animations, def.clips);
  return { root, mixer, actions, templateKey: def.url };
}
