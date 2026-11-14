import * as THREE from "three";
import { HAIR, JACKETS, normalizeAvatarLook } from "./avatar-look.mjs";

function swatchColor(list, id) {
  return list.find(item => item.id === id)?.color ?? 0xffffff;
}

function glow(color, intensity) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0.15
  });
}

function accessoryMesh(kind) {
  const group = new THREE.Group();
  if (kind === "chain") {
    const mat = new THREE.MeshStandardMaterial({ color: 0xf2d48a, emissive: 0xc9a227, emissiveIntensity: 0.45, metalness: 0.8, roughness: 0.25 });
    for (let i = 0; i < 3; i++) {
      const link = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 8, 14), mat);
      link.position.set(0, -0.05 * i, 0);
      link.rotation.y = Math.PI / 2;
      group.add(link);
    }
  } else if (kind === "choker") {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.018, 8, 18),
      glow(0xff44aa, 0.7)
    );
    band.rotation.x = Math.PI / 2;
    group.add(band);
  } else {
    const mat = glow(0xdddddd, 0.25);
    [-0.1, 0, 0.1].forEach(x => {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 6), mat);
      spike.position.set(x, 0.08, 0);
      group.add(spike);
    });
  }
  return group;
}

/** Visible marks on the player body. Model forward is -Z; origin is at the feet. */
export function attachAvatarLook(root, look) {
  if (!root) return null;
  const prev = root.getObjectByName("avatar-look");
  if (prev) prev.removeFromParent();
  const spec = normalizeAvatarLook(look);
  if (!spec) return null;

  const group = new THREE.Group();
  group.name = "avatar-look";
  group.position.set(0, 1.28, 0);
  group.userData.look = spec;

  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), glow(swatchColor(HAIR, spec.hair), 1.15));
  hair.name = "avatar-hair";
  hair.position.set(0, 0.5, -0.02);
  hair.userData.swatch = spec.hair;

  const jacket = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.1), glow(swatchColor(JACKETS, spec.jacket), 1.05));
  jacket.name = "avatar-jacket";
  jacket.position.set(0, 0.05, -0.2);
  jacket.userData.swatch = spec.jacket;

  const accessory = accessoryMesh(spec.accessory);
  accessory.name = "avatar-accessory";
  accessory.userData.kind = spec.accessory;
  accessory.position.set(0, spec.accessory === "choker" ? 0.18 : -0.02, -0.2);

  group.add(hair, jacket, accessory);
  root.add(group);
  return spec;
}

export function readAvatarLook(root) {
  return root?.getObjectByName("avatar-look")?.userData?.look || null;
}
