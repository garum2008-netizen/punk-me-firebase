import * as THREE from "three";

function box(w, h, d, color, emissive = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color,
      emissive: emissive || color,
      emissiveIntensity: emissive ? 0.45 : 0,
      roughness: 0.72
    })
  );
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function scatterProps(root, specs) {
  specs.forEach(([x, y, z, w, h, d, color, ry = 0]) => {
    const p = box(w, h, d, color);
    p.position.set(x, y + h / 2, z);
    p.rotation.y = ry;
    root.add(p);
  });
}

/** Extra low-poly clutter so default camera views feel full (v21). */
export function addV21Clutter(locId, root, texLoader, colliders, pushCollider) {
  if (locId === "room") {
    scatterProps(root, [
      [-4.5, 0, 1.2, 0.35, 0.5, 0.35, 0x553322],
      [2.2, 0, 3.5, 0.8, 0.35, 0.5, 0x2a1840],
      [0.5, 0, 4.8, 1.2, 0.08, 0.9, 0x6a3048],
      [5, 0, 2, 0.25, 0.55, 0.25, 0x888899],
      [-5.5, 0, -2, 0.4, 0.25, 0.4, 0xff6600],
      [1, 0, -3, 0.5, 0.9, 0.2, 0x1a1028],
      [-1.5, 0, -4, 0.35, 0.4, 0.35, 0x442266]
    ]);
    const guitar = box(0.12, 0.9, 0.35, 0x221111);
    guitar.position.set(4.2, 0.9, -4.2);
    guitar.rotation.z = -0.35;
    root.add(guitar);
    const amp = box(0.55, 0.7, 0.4, 0x111122, 0x00ffff);
    amp.position.set(4.8, 0.35, -3.8);
    root.add(amp);
    const shelf = box(2.2, 1.6, 0.25, 0x3a2848);
    shelf.position.set(-5.2, 0.8, -5.2);
    root.add(shelf);
    pushCollider(colliders, -1, 3.2, 1.2, 0.7);
  } else if (locId === "kitchen") {
    scatterProps(root, [
      [3.5, 0, 2.5, 0.25, 0.35, 0.25, 0x99aa88],
      [-3, 0, 1, 0.3, 0.4, 0.3, 0xff8844],
      [2, 0, -1, 0.5, 0.12, 0.7, 0x5a4030],
      [-4.5, 0, 3, 0.35, 0.5, 0.35, 0x664422],
      [4.5, 0, -2, 0.2, 0.55, 0.2, 0xccccdd]
    ]);
  } else if (locId === "street") {
    scatterProps(root, [
      [-4, 0, 3, 0.5, 0.9, 0.5, 0x333344],
      [5, 0, -2, 0.45, 0.7, 0.45, 0x443322],
      [-6, 0, -4, 0.35, 0.5, 0.35, 0xff6600],
      [3, 0, 5, 0.6, 1.1, 0.6, 0x222233],
      [0, 0, -5, 0.8, 0.4, 0.8, 0x553366],
      [7, 0, 2, 0.3, 0.55, 0.3, 0x00ffcc, 0x00ffcc]
    ]);
    const arcade = box(0.9, 1.5, 0.7, 0x220033, 0xff00ff);
    arcade.position.set(-2.5, 0.75, -4.5);
    arcade.userData.interact = "arcade";
    root.add(arcade);
    pushCollider(colliders, -2.5, -4.5, 0.5, 0.4);
  } else if (locId === "city") {
    scatterProps(root, [
      [-7, 0, 5, 0.5, 0.8, 0.5, 0x444455],
      [6, 0, 6, 0.4, 0.55, 0.4, 0xffaa00],
      [-3, 0, -6, 0.7, 0.35, 0.7, 0x332244],
      [2, 0, 3, 0.35, 0.9, 0.35, 0x00ffff, 0x00ffff],
      [8, 0, -3, 0.5, 1.2, 0.5, 0x553322]
    ]);
    const pizza = box(0.5, 0.08, 0.5, 0xffcc00);
    pizza.position.set(1.2, 0.9, 2);
    pizza.userData.interact = "pizza_pickup";
    root.add(pizza);
  } else if (locId === "cemetery") {
    for (let i = 0; i < 8; i++) {
      const stone = box(0.35, 0.55 + (i % 3) * 0.15, 0.12, 0x555566);
      stone.position.set(-6 + i * 1.6, stone.geometry.parameters.height / 2, -3 + (i % 2) * 4);
      root.add(stone);
    }
    const lantern = box(0.2, 0.9, 0.2, 0xffaa44, 0xffaa44);
    lantern.position.set(0, 0.45, 2);
    root.add(lantern);
    const fence = box(0.08, 0.7, 6, 0x333344);
    fence.position.set(-8, 0.35, 0);
    root.add(fence);
    pushCollider(colliders, 0, 2, 0.3, 0.3);
  } else if (locId === "elevator" || locId === "toilet") {
    scatterProps(root, [
      [-0.8, 0, 0.5, 0.15, 0.35, 0.15, 0x99aa88],
      [0.9, 0, -0.4, 0.2, 0.45, 0.2, 0xff6600],
      [0, 0, 0.8, 0.25, 0.12, 0.4, 0x443322]
    ]);
  } else if (locId === "roof" || locId === "parkour") {
    scatterProps(root, [
      [-3, 0, 2, 0.45, 0.55, 0.45, 0x553344],
      [4, 0, -3, 0.35, 0.4, 0.35, 0x00ffaa, 0x00ffaa],
      [0, 0, 4, 0.6, 0.25, 0.6, 0x332244],
      [-5, 0, -4, 0.3, 0.5, 0.3, 0xff8844]
    ]);
  }
}
