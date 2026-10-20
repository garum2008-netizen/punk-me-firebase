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
      [4.5, 0, -2, 0.2, 0.55, 0.2, 0xccccdd],
      [1.5, 0, 3.2, 0.2, 0.3, 0.2, 0xff0000],
      [-2, 0, -2.5, 0.35, 0.25, 0.35, 0x88aa99],
      [3, 0, 0.5, 0.15, 0.4, 0.15, 0xcccccc],
      [-5, 0, -1, 0.4, 0.08, 0.6, 0x6a4030]
    ]);
    const juke = box(0.55, 1.05, 0.4, 0x331144, 0xff00ff);
    juke.position.set(4.2, 0.52, 2.8);
    juke.userData.interact = "jukebox";
    root.add(juke);
    const rug = box(2.2, 0.04, 1.6, 0x5a2040);
    rug.position.set(0, 0.02, 1.5);
    root.add(rug);
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
    for (let i = 0; i < 10; i++) {
      const stone = box(0.35, 0.55 + (i % 3) * 0.15, 0.12, 0x555566);
      stone.position.set(-7 + i * 1.5, stone.geometry.parameters.height / 2, -4 + (i % 3) * 2.8);
      root.add(stone);
    }
    for (let i = 0; i < 5; i++) {
      const lan = box(0.12, 1.1, 0.12, 0xffaa44, 0xffaa44);
      lan.position.set(-4 + i * 2, 0.55, 5.5 - (i % 2));
      root.add(lan);
    }
    const gate = box(3.2, 0.12, 0.15, 0x3a4a40);
    gate.position.set(0, 0.06, -7.8);
    root.add(gate);
    const deadTree = box(0.25, 2.8, 0.25, 0x2a1810);
    deadTree.position.set(-2, 1.4, 4);
    root.add(deadTree);
    const branch = box(1.6, 0.1, 0.1, 0x1a1010);
    branch.position.set(-2.5, 2.6, 4.2);
    branch.rotation.z = 0.4;
    root.add(branch);
    for (let g = 0; g < 4; g++) {
      const ghost = box(0.3, 0.45, 0.15, 0xaaccff, 0x88ddff);
      ghost.position.set(3 + g * 1.2, 0.9 + (g % 2) * 0.2, 2 + g * 0.5);
      ghost.material.transparent = true;
      ghost.material.opacity = 0.7;
      ghost.userData.rise = 1.2;
      ghost.userData.riseBase = ghost.position.y;
      root.add(ghost);
    }
    for (let c = 0; c < 6; c++) {
      const candle = box(0.06, 0.2, 0.06, 0xffcc66, 0xff6600);
      candle.position.set(-3 + c * 1.1, 0.1, -1.5);
      root.add(candle);
    }
    scatterProps(root, [
      [-8, 0, 0, 0.08, 0.75, 4, 0x333344],
      [7, 0, -3, 1.2, 0.9, 1.5, 0x2a3835],
      [0, 0, 6, 0.5, 0.35, 0.5, 0xff6600]
    ]);
  } else if (locId === "toilet") {
    scatterProps(root, [
      [-1, 0, 2.5, 0.25, 0.35, 0.25, 0x99aa88],
      [2.5, 0, -2, 0.3, 0.5, 0.3, 0x556677],
      [-4, 0, 0.5, 0.2, 0.55, 0.2, 0x8899aa],
      [3.5, 0, 1, 0.35, 0.4, 0.35, 0xff6600],
      [0, 0, -1, 0.45, 0.08, 0.7, 0x6a8090]
    ]);
    const trash = box(0.35, 0.55, 0.35, 0x3a4048);
    trash.position.set(3.8, 0.275, 2.2);
    root.add(trash);
    const plant = box(0.25, 0.55, 0.25, 0x228844);
    plant.position.set(-4.5, 0.275, 2.8);
    root.add(plant);
    for (let s = 0; s < 6; s++) {
      const sticker = box(0.12, 0.12, 0.01, s % 2 ? 0xff00ff : 0x00ffff, s % 2 ? 0xff00ff : 0x00ffff);
      sticker.position.set(-3.5 + s * 0.35, 1.2 + (s % 3) * 0.4, -3.84);
      root.add(sticker);
    }
    const graffiti = box(1.8, 0.6, 0.02, 0x442266);
    graffiti.position.set(4.2, 1.4, -3.85);
    root.add(graffiti);
  } else if (locId === "elevator") {
    scatterProps(root, [
      [-0.8, 0, 0.5, 0.15, 0.35, 0.15, 0x99aa88],
      [0.9, 0, -0.4, 0.2, 0.45, 0.2, 0xff6600],
      [0, 0, 0.8, 0.25, 0.12, 0.4, 0x443322],
      [-1.1, 0, -0.8, 0.35, 0.55, 0.35, 0x555566],
      [1.2, 0, 0.2, 0.08, 0.9, 0.08, 0x888899],
      [0.3, 0, -1.1, 0.2, 0.25, 0.2, 0xff00ff, 0xff00ff]
    ]);
    const panel = box(0.45, 0.55, 0.08, 0x222233, 0x00ffff);
    panel.position.set(1.15, 1.35, -1.25);
    root.add(panel);
  } else if (locId === "roof" || locId === "parkour") {
    scatterProps(root, [
      [-3, 0, 2, 0.45, 0.55, 0.45, 0x553344],
      [4, 0, -3, 0.35, 0.4, 0.35, 0x00ffaa, 0x00ffaa],
      [0, 0, 4, 0.6, 0.25, 0.6, 0x332244],
      [-5, 0, -4, 0.3, 0.5, 0.3, 0xff8844]
    ]);
  }
}
