import * as THREE from "three";

function tagged(tag, mesh) {
  const g = new THREE.Group();
  g.userData.propTag = tag;
  g.add(mesh);
  return g;
}

function box(w, h, d, color, emissive = 0) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({
      color,
      emissive: emissive || color,
      emissiveIntensity: emissive ? 0.35 : 0,
      roughness: 0.72
    })
  );
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function placeProp(root, tag, mesh, x, y, z, ry = 0) {
  mesh.position.set(x, y, z);
  mesh.rotation.y = ry;
  root.add(tagged(tag, mesh));
}

/** Back/side clutter — never in the camera–player foreground arc (center z > 1). */
export function addV21Clutter(locId, root, texLoader, colliders, pushCollider) {
  if (locId === "room") {
    placeProp(root, "room_clutter_guitar", box(0.12, 0.9, 0.35, 0x221111), 4.2, 0.45, -4.2, -0.35);
    placeProp(root, "room_clutter_amp", box(0.55, 0.7, 0.4, 0x111122), 4.8, 0.35, -3.8);
    placeProp(root, "room_clutter_shelf", box(2.2, 1.6, 0.25, 0x3a2848), -5.2, 0.8, -5.2);
    placeProp(root, "room_clutter_crate", box(0.35, 0.5, 0.35, 0x553322), -4.5, 0.25, -3.5);
    placeProp(root, "room_clutter_bin", box(0.25, 0.55, 0.25, 0x888899), 5, 0.275, -2);
  } else if (locId === "kitchen") {
    placeProp(root, "kitchen_clutter_spice", box(0.3, 0.4, 0.3, 0xff8844), -3, 0.2, -3.5);
    placeProp(root, "kitchen_clutter_mug", box(0.12, 0.14, 0.12, 0xccccdd), 2, 0.07, -3.2);
    const juke = box(0.55, 1.05, 0.4, 0x331144, 0xff00ff);
    juke.position.set(4.2, 0.52, -3.2);
    juke.userData.interact = "jukebox";
    root.add(juke);
    pushCollider(colliders, 4.2, -3.2, 0.3, 0.25);
    placeProp(root, "kitchen_clutter_rug", box(2.2, 0.04, 1.6, 0x5a2040), 0, 0.02, -1.2);
  } else if (locId === "street") {
    placeProp(root, "street_clutter_hydrant", box(0.35, 0.55, 0.35, 0xcc2222), -5.5, 0.28, -2.5);
    placeProp(root, "street_clutter_trash", box(0.45, 0.7, 0.45, 0x333344), 5.2, 0.35, -3.2);
    placeProp(root, "street_clutter_crate", box(0.6, 0.55, 0.6, 0x6a5030), -4, 0.28, -4.5);
    const arcade = box(0.9, 1.5, 0.7, 0x220033, 0x331144);
    arcade.position.set(-5.2, 0.75, -5.6);
    arcade.userData.interact = "arcade";
    root.add(arcade);
    pushCollider(colliders, -5.2, -5.6, 0.5, 0.4);
    placeProp(root, "street_clutter_barrel", box(0.35, 0.5, 0.35, 0xff6600), 4.5, 0.25, -4.8);
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.4 });
    placeProp(
      root,
      "street_clutter_pumpkin",
      new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), pumpMat),
      -3.2,
      0.22,
      -3.8
    );
  } else if (locId === "city") {
    placeProp(root, "city_clutter_can", box(0.4, 0.55, 0.4, 0x444455), -7, 0.28, -4);
    placeProp(root, "city_clutter_pizza", box(0.5, 0.08, 0.5, 0xffcc00), 1.2, 0.9, -2);
    placeProp(root, "city_clutter_crate", box(0.5, 0.8, 0.5, 0x553322), 6, 0.4, -5);
  } else if (locId === "cemetery") {
    for (let i = 0; i < 10; i++) {
      const stone = box(0.35, 0.55 + (i % 3) * 0.15, 0.12, 0x555566);
      placeProp(root, `cem_clutter_stone_${i}`, stone, -7 + i * 1.5, stone.geometry.parameters.height / 2, -4 + (i % 3) * 2.8);
    }
    for (let i = 0; i < 5; i++) {
      const lan = box(0.12, 1.1, 0.12, 0xffaa44, 0xffaa44);
      placeProp(root, `cem_clutter_lantern_${i}`, lan, -4 + i * 2, 0.55, -4.5 - (i % 2));
    }
    placeProp(root, "cem_clutter_gate", box(3.2, 0.12, 0.15, 0x3a4a40), 0, 0.06, -7.8);
    placeProp(root, "cem_clutter_tree", box(0.25, 2.8, 0.25, 0x2a1810), -2, 1.4, -3.5);
  } else if (locId === "toilet") {
    placeProp(root, "toilet_clutter_trash", box(0.35, 0.55, 0.35, 0x3a4048), 3.8, 0.275, -2.2);
    placeProp(root, "toilet_clutter_plant", box(0.25, 0.55, 0.25, 0x228844), -4.5, 0.275, -2.8);
    placeProp(root, "toilet_clutter_graffiti", box(1.8, 0.6, 0.02, 0x442266), 4.2, 1.4, -3.85);
  } else if (locId === "elevator") {
    placeProp(root, "elev_clutter_panel", box(0.45, 0.55, 0.08, 0x222233, 0x00ffff), 1.15, 1.35, -1.25);
  } else if (locId === "roof" || locId === "parkour") {
    placeProp(root, `${locId}_clutter_crate`, box(0.45, 0.55, 0.45, 0x553344), -3, 0.28, -4);
    placeProp(root, `${locId}_clutter_barrel`, box(0.3, 0.5, 0.3, 0xff8844), 4, 0.25, -3);
  }
}
