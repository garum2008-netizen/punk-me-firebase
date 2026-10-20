import * as THREE from "three";

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
  scene.traverse(o => {
    if (o.isMesh && HIDE_MESH.test(o.name || "")) o.visible = false;
  });
  fixOpaqueMaterials(scene);
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  return Math.max(0, -box.min.y + 0.02);
}

export function applyCharacterLook(root, def) {
  const look = def.look || {};
  root.traverse(o => {
    if (o.isMesh && HIDE_MESH.test(o.name || "")) {
      o.visible = false;
      return;
    }
    if (!o.isMesh || !o.material) return;
    const m = o.material.clone();
    const n = (o.name || "").toLowerCase();
    const isHair = n.includes("hair");
    const isCloth = n.includes("cloth") || n.includes("superhero") || n.includes("mannequin");
    if (isHair) {
      m.color = new THREE.Color(look.hair || 0xff00ff);
      m.emissive = new THREE.Color(look.hair || 0xff00ff);
      m.emissiveIntensity = 0.2;
    } else if (isCloth) {
      m.color = new THREE.Color(look.jacket || 0x3a2848);
      m.emissive = new THREE.Color(look.emissive || 0x552266);
      m.emissiveIntensity = 0.32;
      m.metalness = 0.12;
      m.roughness = 0.62;
    } else if (look.tint && m.color) {
      m.color.lerp(new THREE.Color(look.tint), 0.15);
    }
    m.transparent = false;
    m.depthWrite = true;
    o.material = m;
    o.castShadow = true;
    o.receiveShadow = true;
  });

  if (look.hairStyle) {
    root.traverse(o => {
      if (o.isMesh && /^Hair_/i.test(o.name || "")) o.visible = false;
    });
  }
  const attach = root.getObjectByName("DEF-head") || root.getObjectByName("Head") || root.getObjectByName("spine_03");
  if (!attach) return;
  const hairCol = look.hair || 0xff00ff;
  const matHair = new THREE.MeshStandardMaterial({
    color: hairCol, emissive: hairCol, emissiveIntensity: 0.28,
    transparent: false, depthWrite: true
  });
  const matChain = new THREE.MeshStandardMaterial({
    color: 0xcccccc, metalness: 0.9, emissive: 0x00ffff, emissiveIntensity: 0.25,
    transparent: false, depthWrite: true
  });

  const acc = (def.look?.scale || 1) * 0.42;
  if (look.hairStyle === "mohawk") {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.11 * acc, 0.5 * acc, 6), matHair);
    mesh.position.set(0, 0.12, 0.02);
    mesh.rotation.x = -0.2;
    attach.add(mesh);
  } else if (look.hairStyle === "pigtails") {
    [-0.22, 0.22].forEach(sx => {
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.14 * acc, 8, 8), matHair);
      t.position.set(sx * acc, 0.08 * acc, -0.02 * acc);
      attach.add(t);
    });
  } else if (look.hairStyle === "spikes") {
    for (let i = -1; i <= 1; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.06 * acc, 0.28 * acc, 5), matHair);
      s.position.set(i * 0.1 * acc, 0.14 * acc, 0.02 * acc);
      attach.add(s);
    }
  }
  if (look.chain) {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.2 * acc, 0.03 * acc, 8, 16), matChain);
    chain.position.set(0, -0.35 * acc, 0.08 * acc);
    chain.rotation.x = Math.PI / 2;
    attach.add(chain);
  }
  if (look.choker) {
    const ch = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 12), matChain);
    ch.position.set(0, -0.12, 0.06);
    ch.rotation.x = Math.PI / 2;
    attach.add(ch);
  }
  if (look.spikes) {
    const wrist = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), matChain);
    wrist.position.set(0.35, -0.55, 0.06);
    attach.add(wrist);
  }
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
