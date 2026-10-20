import * as THREE from "three";

/** Kenney-style blocky punk teen rigged to DEF bones (CC0 animations on Rig). */
function findBone(root, names) {
  for (const n of names) {
    const b = root.getObjectByName(n);
    if (b) return b;
  }
  let found = null;
  root.traverse(o => {
    if (!found && o.isBone && names.some(n => o.name === n || o.name.replace(/\./g, "") === n.replace(/\./g, ""))) {
      found = o;
    }
  });
  return found;
}

function box(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function attach(parent, mesh, px, py, pz, rx = 0, ry = 0, rz = 0) {
  mesh.position.set(px, py, pz);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}

export function hideTemplateMeshes(root) {
  root.traverse(o => {
    if (o.isSkinnedMesh || /Mannequin|Superhero|Cloth|Hair_|Eyebrow|Eyes/i.test(o.name || "")) {
      o.visible = false;
    }
  });
}

const S = 0.52;

export function buildBlockyPunkAvatar(root, look = {}) {
  hideTemplateMeshes(root);

  const skin = new THREE.Color(look.tint || 0xffccaa);
  const jacket = new THREE.Color(look.jacket || 0x1a1030);
  const emissive = new THREE.Color(look.emissive || 0xff00ff);
  const pants = new THREE.Color(look.pants || 0x0a0a14);
  const boots = new THREE.Color(look.boots || 0x111118);
  const hairCol = new THREE.Color(look.hair || 0xff00ff);

  const matSkin = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.55, metalness: 0.05 });
  const matJacket = new THREE.MeshStandardMaterial({
    color: jacket, emissive, emissiveIntensity: 0.42, roughness: 0.4, metalness: 0.12
  });
  const matPants = new THREE.MeshStandardMaterial({ color: pants, roughness: 0.7, metalness: 0.08 });
  const matBoots = new THREE.MeshStandardMaterial({ color: boots, roughness: 0.4, metalness: 0.35 });
  const matHair = new THREE.MeshStandardMaterial({
    color: hairCol, emissive: hairCol, emissiveIntensity: 0.35, roughness: 0.35
  });
  const matChain = new THREE.MeshStandardMaterial({
    color: 0xdddddd, emissive: 0x00ffff, emissiveIntensity: 0.45, metalness: 0.95, roughness: 0.2
  });
  const matNeon = new THREE.MeshStandardMaterial({
    color: 0x00ffff, emissive: 0xff00ff, emissiveIntensity: 0.55, roughness: 0.3
  });

  const hips = findBone(root, ["DEF-hips"]);
  const spine = findBone(root, ["DEF-spine.002", "DEF-spine002", "DEF-spine.003", "DEF-spine003"]);
  const chest = findBone(root, ["DEF-spine.003", "DEF-spine003", "DEF-spine.002", "DEF-spine002"]);
  const neck = findBone(root, ["DEF-neck"]);
  const head = findBone(root, ["DEF-head"]);
  const uaL = findBone(root, ["DEF-upper_arm.L", "DEF-upper_armL"]);
  const faL = findBone(root, ["DEF-forearm.L", "DEF-forearmL"]);
  const uaR = findBone(root, ["DEF-upper_arm.R", "DEF-upper_armR"]);
  const faR = findBone(root, ["DEF-forearm.R", "DEF-forearmR"]);
  const thL = findBone(root, ["DEF-thigh.L", "DEF-thighL"]);
  const shL = findBone(root, ["DEF-shin.L", "DEF-shinL"]);
  const ftL = findBone(root, ["DEF-foot.L", "DEF-footL"]);
  const thR = findBone(root, ["DEF-thigh.R", "DEF-thighR"]);
  const shR = findBone(root, ["DEF-shin.R", "DEF-shinR"]);
  const ftR = findBone(root, ["DEF-foot.R", "DEF-footR"]);

  if (chest) {
    attach(chest, box(0.42 * S, 0.38 * S, 0.22 * S, matJacket), 0, 0.05 * S, 0);
    attach(chest, box(0.46 * S, 0.08 * S, 0.24 * S, matNeon), 0, 0.22 * S, 0.02 * S);
  }
  if (spine && spine !== chest) {
    attach(spine, box(0.36 * S, 0.2 * S, 0.2 * S, matJacket), 0, 0, 0);
  }
  if (hips) {
    attach(hips, box(0.38 * S, 0.22 * S, 0.2 * S, matPants), 0, -0.08 * S, 0);
  }
  if (head) {
    attach(head, box(0.22 * S, 0.24 * S, 0.2 * S, matSkin), 0, 0.08 * S, 0.02 * S);
    const style = look.hairStyle || "spikes";
    if (style === "mohawk") {
      attach(head, new THREE.Mesh(new THREE.ConeGeometry(0.08 * S, 0.32 * S, 6), matHair), 0, 0.28 * S, -0.02 * S, -0.15, 0, 0);
    } else if (style === "pigtails") {
      [-0.14, 0.14].forEach(sx => {
        attach(head, new THREE.Mesh(new THREE.SphereGeometry(0.1 * S, 8, 8), matHair), sx * S, 0.12 * S, -0.06 * S);
      });
    } else {
      for (let i = -1; i <= 1; i++) {
        attach(head, new THREE.Mesh(new THREE.ConeGeometry(0.05 * S, 0.2 * S, 5), matHair), i * 0.07 * S, 0.26 * S, 0, -0.1, 0, 0);
      }
    }
  }
  if (neck && look.choker) {
    attach(neck, new THREE.Mesh(new THREE.TorusGeometry(0.09 * S, 0.018 * S, 6, 14), matChain), 0, 0, 0, Math.PI / 2, 0, 0);
  }
  if (neck && look.chain) {
    const ch = new THREE.Mesh(new THREE.TorusGeometry(0.14 * S, 0.022 * S, 8, 18), matChain);
    attach(neck, ch, 0, -0.12 * S, 0.04 * S, Math.PI / 2, 0, 0);
  }
  const arm = (ua, fa, side) => {
    if (ua) attach(ua, box(0.12 * S, 0.28 * S, 0.12 * S, matJacket), 0, -0.12 * S, 0);
    if (fa) attach(fa, box(0.1 * S, 0.24 * S, 0.1 * S, matSkin), 0, -0.1 * S, 0);
    if (fa && look.spikes) {
      attach(fa, new THREE.Mesh(new THREE.ConeGeometry(0.03 * S, 0.1 * S, 4), matChain), side * 0.06 * S, -0.2 * S, 0.04 * S, 0, 0, side * 0.4);
    }
  };
  arm(uaL, faL, -1);
  arm(uaR, faR, 1);
  const leg = (th, sh, ft) => {
    if (th) attach(th, box(0.14 * S, 0.34 * S, 0.14 * S, matPants), 0, -0.16 * S, 0);
    if (sh) attach(sh, box(0.12 * S, 0.3 * S, 0.12 * S, matPants), 0, -0.14 * S, 0);
    if (ft) attach(ft, box(0.14 * S, 0.08 * S, 0.22 * S, matBoots), 0, -0.04 * S, 0.06 * S);
  };
  leg(thL, shL, ftL);
  leg(thR, shR, ftR);
}
