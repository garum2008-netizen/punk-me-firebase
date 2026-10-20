import * as THREE from "three";

const HIDE_MESH = /^(Mannequin|ClothBottom|ClothTop)$/i;

export function findClip(clips, names) {
  if (!clips?.length) return null;
  for (const n of names || []) {
    const c = clips.find(x => x.name === n);
    if (c) return c;
  }
  return clips[0];
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
    const isCloth = n.includes("cloth") || n.includes("superhero");
    if (isHair) {
      m.color = new THREE.Color(look.hair || 0xff00ff);
      m.emissive = new THREE.Color(look.hair || 0xff00ff);
      m.emissiveIntensity = 0.2;
    } else if (isCloth) {
      m.color = new THREE.Color(look.jacket || 0x1a1a22);
      m.emissive = new THREE.Color(look.emissive || 0x220033);
      m.emissiveIntensity = 0.14;
    } else if (look.tint && m.color) {
      m.color.lerp(new THREE.Color(look.tint), 0.15);
    }
    o.material = m;
    o.castShadow = true;
    o.receiveShadow = true;
  });

  const spine = root.getObjectByName("DEF-spine") || root.getObjectByName("mixamorigSpine");
  if (!spine) return;
  const hairCol = look.hair || 0xff00ff;
  const matHair = new THREE.MeshStandardMaterial({ color: hairCol, emissive: hairCol, emissiveIntensity: 0.28 });
  const matChain = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.9, emissive: 0x00ffff, emissiveIntensity: 0.25 });

  if (look.hairStyle === "mohawk") {
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.5, 6), matHair);
    m.position.set(0, 0.78, -0.04);
    m.rotation.x = -0.2;
    spine.add(m);
  } else if (look.hairStyle === "pigtails") {
    [-0.22, 0.22].forEach(sx => {
      const t = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), matHair);
      t.position.set(sx, 0.72, -0.12);
      spine.add(t);
    });
  } else if (look.hairStyle === "spikes") {
    for (let i = -1; i <= 1; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 5), matHair);
      s.position.set(i * 0.1, 0.8, -0.05);
      spine.add(s);
    }
  }
  if (look.chain) {
    const chain = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.03, 8, 16), matChain);
    chain.position.set(0, 0.32, 0.1);
    chain.rotation.x = Math.PI / 2;
    spine.add(chain);
  }
  if (look.choker) {
    const ch = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.02, 6, 12), matChain);
    ch.position.set(0, 0.55, 0.08);
    ch.rotation.x = Math.PI / 2;
    spine.add(ch);
  }
  if (look.spikes) {
    const wrist = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), matChain);
    wrist.position.set(0.35, 0.2, 0.1);
    spine.add(wrist);
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
    run: mk("run", ["Jog_Fwd_Loop"]),
    talk: mk("talk", ["Idle_Talking_Loop"]),
    emote: mk("emote", ["Idle_Talking_Loop"])
  };
  Object.values(actions).forEach(act => {
    if (!act) return;
    act.enabled = true;
    if (def.anim?.idleSpeed && act === actions.idle) act.setEffectiveTimeScale(def.anim.idleSpeed);
  });
  actions.idle?.play();
  return actions;
}

export function updateProcedural(actor, dt, playerPos, talking) {
  const root = actor.root;
  if (!root) return;
  const t = performance.now() * 0.001;
  actor._blink = actor._blink ?? 0;
  actor._blink -= dt;
  if (actor._blink <= 0) {
    actor._blink = 2.5 + Math.random() * 3;
    actor._blinkPhase = 0.12;
  }
  if (actor._blinkPhase > 0) actor._blinkPhase -= dt;

  root.traverse(o => {
    if (!o.isBone) return;
    const n = (o.name || "").toLowerCase();
    if (n.includes("spine") && !n.includes("spine.0")) {
      o.rotation.x = Math.sin(t * 2) * 0.02;
    }
    if (talking && (n.includes("jaw") || n.includes("head"))) {
      o.rotation.x = Math.sin(t * 14) * 0.06;
    }
    if (playerPos && n.includes("head") && actor.isNpc) {
      const dx = playerPos.x - actor.group.position.x;
      const dz = playerPos.z - actor.group.position.z;
      o.rotation.y = Math.atan2(dx, dz) * 0.35;
    }
  });

  const spd = actor._spd || 0;
  const amp = spd > 0.5 ? 0.35 : 0.07;
  const freq = spd > 0.2 ? 8 : 2;
  root.traverse(o => {
    if (!o.isBone) return;
    const n = (o.name || "").toLowerCase();
    if (n.includes("thigh")) {
      o.rotation.x = Math.sin(t * freq + (n.includes(".l") ? 0 : Math.PI)) * amp;
    }
  });
}
