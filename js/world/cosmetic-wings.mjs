import * as THREE from "three";

function resolveSpineFromSkinnedMesh(root) {
  let best = null;
  root.traverse(o => {
    if (best || !o.isSkinnedMesh || !o.skeleton?.bones?.length) return;
    for (const b of o.skeleton.bones) {
      const n = b.name || "";
      if (/spine2/i.test(n)) {
        best = b;
        return;
      }
      if (/spine1/i.test(n) && !best) best = b;
      if (/spine/i.test(n) && !best) best = b;
    }
  });
  return best;
}

function findBone(root, shortName) {
  const variants = [shortName, `mixamorig${shortName}`, `mixamorig:${shortName}`];
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

/** Local offsets (model space) when parented to upper spine. */
const WING_ATTACH = { y: 0.04, z: -0.1, xSpread: 0.07 };

function wingMaterial(emissive) {
  const em = emissive ?? 0x95ff00;
  return new THREE.MeshStandardMaterial({
    color: em,
    emissive: em,
    emissiveIntensity: 0.65,
    metalness: 0.2,
    roughness: 0.4,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.94
  });
}

/** Two-panel wing per side (box geometry — reads as 3D, not billboards). */
function buildWingSide(side, mat) {
  const rig = new THREE.Group();
  rig.name = side < 0 ? "wing_L" : "wing_R";
  const rootFeather = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.055, 0.88), mat.clone());
  rootFeather.position.set(side * WING_ATTACH.xSpread, 0, -0.46);
  rootFeather.rotation.z = side * 0.38;
  const tipFeather = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.045, 0.52), mat.clone());
  tipFeather.position.set(side * (WING_ATTACH.xSpread + 0.22), 0.02, -0.78);
  tipFeather.rotation.z = side * 0.55;
  rig.add(rootFeather, tipFeather);
  rig.userData.feathers = [rootFeather, tipFeather];
  return rig;
}

/**
 * Parent wings to spine bone so walk/run/turn animations carry them.
 * @returns {{ group: THREE.Group, attachBone: string, feathers: THREE.Mesh[] } | null}
 */
export function attachSkeletonWings(root, look, attachBoneOverride = null) {
  if (!look?.wings) return null;
  const prev = root.getObjectByName("cosmetic_wings");
  if (prev) prev.removeFromParent();

  const bone =
    attachBoneOverride ||
    findBone(root, "Spine2") ||
    findBone(root, "Spine1") ||
    findBone(root, "Spine") ||
    findBone(root, "Chest") ||
    findBone(root, "spine") ||
    findBone(root, "Hips") ||
    resolveSpineFromSkinnedMesh(root);
  if (!bone) return null;

  const mat = wingMaterial(look.emissive);
  const wingRoot = new THREE.Group();
  wingRoot.name = "cosmetic_wings";
  wingRoot.position.set(0, WING_ATTACH.y, WING_ATTACH.z);
  wingRoot.rotation.x = -0.12;

  const left = buildWingSide(-1, mat);
  const right = buildWingSide(1, mat);
  wingRoot.add(left, right);
  bone.add(wingRoot);

  const feathers = [];
  wingRoot.traverse(o => {
    if (o.isMesh) feathers.push(o);
  });

  return {
    group: wingRoot,
    attachBone: bone.name,
    feathers,
    sides: [left, right]
  };
}

/** World-space min distance wing feather vs torso meshes (negative = interpenetration). */
export function measureWingTorsoGap(actorRoot, wingMeta) {
  if (!actorRoot || !wingMeta?.feathers?.length) {
    return { ok: false, reason: "no_wings" };
  }
  const torsoBox = new THREE.Box3();
  let torsoMeshes = 0;
  actorRoot.traverse(o => {
    if (!o.isMesh) return;
    let inWing = false;
    let p = o;
    while (p) {
      if (p.name === "cosmetic_wings") {
        inWing = true;
        break;
      }
      p = p.parent;
    }
    if (!inWing) {
      torsoBox.expandByObject(o);
      torsoMeshes++;
    }
  });
  if (torsoMeshes < 1) return { ok: false, reason: "no_torso" };

  let minGap = Infinity;
  wingMeta.feathers.forEach(mesh => {
    const wb = new THREE.Box3().setFromObject(mesh);
    const wingCenter = wb.getCenter(new THREE.Vector3());
    const clamped = wingCenter.clone().clamp(torsoBox.min, torsoBox.max);
    const gap = wingCenter.distanceTo(clamped);
    const inside = torsoBox.containsPoint(wingCenter);
    const signed = inside ? -gap : gap;
    minGap = Math.min(minGap, signed);
  });

  return {
    ok: true,
    minGap: +minGap.toFixed(4),
    penetrating: minGap < 0,
    torsoMeshes,
    attachBone: wingMeta.attachBone
  };
}
