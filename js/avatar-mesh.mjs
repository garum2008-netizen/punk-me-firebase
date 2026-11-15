import * as THREE from "three";
import { HAIR, JACKETS, SKINS, normalizeAvatarLook } from "./avatar-look.mjs";

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

function hairMesh(style, color) {
  const group = new THREE.Group();
  const mat = glow(color, 1.15);
  if (style === "mohawk") {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.42, 0.16), mat);
    fin.position.set(0, 0.46, -0.02);
    group.add(fin);
  } else if (style === "pigtails") {
    [-0.16, 0.16].forEach(x => {
      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 10), mat);
      tail.position.set(x, 0.28, -0.02);
      group.add(tail);
    });
  } else if (style === "spikes") {
    [-0.1, 0, 0.1].forEach(x => {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.28, 6), mat);
      spike.position.set(x, 0.48, -0.02);
      group.add(spike);
    });
  } else {
    const bob = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 12), mat);
    bob.position.set(0, 0.36, -0.02);
    group.add(bob);
  }
  return group;
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
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.018, 8, 18), glow(0xff44aa, 0.7));
    band.rotation.x = Math.PI / 2;
    group.add(band);
  } else if (kind === "wings") {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x33ddff,
      emissive: 0x1488ff,
      emissiveIntensity: 1.2,
      side: THREE.DoubleSide,
      roughness: 0.28,
      metalness: 0.45
    });
    [-1, 1].forEach(side => {
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.lineTo(side * 0.18, 0.08);
      shape.lineTo(side * 0.62, 0.28);
      shape.lineTo(side * 0.22, -0.02);
      shape.lineTo(0, -0.14);
      const wing = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
      wing.position.set(side * 0.12, 0.22, 0.08);
      group.add(wing);
    });
    group.name = "avatar-wings";
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

  const hair = hairMesh(spec.hairStyle, swatchColor(HAIR, spec.hair));
  hair.name = "avatar-hair";
  hair.userData.swatch = spec.hair;
  hair.userData.style = spec.hairStyle;

  const skin = new THREE.Mesh(
    new THREE.CircleGeometry(0.11, 16),
    glow(swatchColor(SKINS, spec.skin), 0.4)
  );
  skin.name = "avatar-skin";
  skin.position.set(0, 0.2, -0.18);
  skin.userData.swatch = spec.skin;

  const jacket = new THREE.Mesh(
    new THREE.BoxGeometry(0.52, 0.46, 0.14),
    glow(swatchColor(JACKETS, spec.jacket), 1.05)
  );
  jacket.name = "avatar-jacket";
  jacket.position.set(0, -0.04, -0.18);
  jacket.userData.swatch = spec.jacket;

  const accessory = accessoryMesh(spec.accessory);
  accessory.name = accessory.name || "avatar-accessory";
  accessory.userData.kind = spec.accessory;
  if (spec.accessory === "wings") accessory.position.set(0, 0.05, 0.02);
  else accessory.position.set(0, spec.accessory === "choker" ? 0.18 : -0.02, -0.2);

  group.add(hair, skin, jacket, accessory);
  root.add(group);
  return spec;
}

export function readAvatarLook(root) {
  return root?.getObjectByName("avatar-look")?.userData?.look || null;
}
