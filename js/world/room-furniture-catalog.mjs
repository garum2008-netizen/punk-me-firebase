import * as THREE from "three";

function mat(color, emi = 0, rough = 0.72) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: emi || color,
    emissiveIntensity: emi ? 0.55 : 0,
    roughness: rough,
    metalness: emi ? 0.15 : 0.08
  });
}

function box(w, h, d, m) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.castShadow = true;
  return mesh;
}

export const FURNITURE_CATALOG = [
  { id: "sofa", label: "Sofa" },
  { id: "beanbag", label: "Beanbag" },
  { id: "lamp", label: "Lamp" },
  { id: "poster", label: "Poster" },
  { id: "rug", label: "Rug" },
  { id: "plant", label: "Plant" },
  { id: "bookshelf", label: "Bookshelf" },
  { id: "guitar", label: "Guitar" },
  { id: "tv", label: "TV" },
  { id: "bed", label: "Bed" },
  { id: "neon_sign", label: "Neon sign" },
  { id: "skull_lamp", label: "Skull lamp" }
];

export function buildFurnitureMesh(type) {
  const g = new THREE.Group();
  g.userData.furnitureType = type;
  g.userData.decorItem = true;
  switch (type) {
    case "sofa": {
      const seat = box(1.35, 0.32, 0.62, mat(0x5a3048));
      seat.position.y = 0.28;
      const back = box(1.35, 0.42, 0.14, mat(0x4a2840));
      back.position.set(0, 0.58, -0.24);
      const armL = box(0.14, 0.38, 0.62, mat(0x4a2840));
      armL.position.set(-0.6, 0.42, 0);
      const armR = armL.clone();
      armR.position.x = 0.6;
      g.add(seat, back, armL, armR);
      break;
    }
    case "beanbag": {
      const bag = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(0xff00aa));
      bag.position.y = 0.22;
      bag.scale.set(1.1, 0.85, 1);
      g.add(bag);
      break;
    }
    case "lamp": {
      const base = box(0.22, 0.06, 0.22, mat(0x333344));
      base.position.y = 0.03;
      const pole = box(0.05, 0.9, 0.05, mat(0x888899));
      pole.position.y = 0.48;
      const shade = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.28, 10), mat(0xffffcc, 0xffcc88));
      shade.position.y = 0.98;
      g.add(base, pole, shade);
      break;
    }
    case "poster": {
      const frame = box(0.9, 1.15, 0.04, mat(0x222228));
      frame.position.y = 0.58;
      const art = box(0.82, 1.05, 0.02, mat(0xff3399, 0xff0066));
      art.position.set(0, 0.58, 0.03);
      g.add(frame, art);
      break;
    }
    case "rug": {
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1), mat(0x5a2040));
      rug.rotation.x = -Math.PI / 2;
      rug.position.y = 0.02;
      g.add(rug);
      break;
    }
    case "plant": {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.28, 10), mat(0x5a4030));
      pot.position.y = 0.14;
      for (let i = 0; i < 5; i++) {
        const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 6), mat(0x228844));
        leaf.position.set(Math.sin(i) * 0.08, 0.42 + i * 0.04, Math.cos(i) * 0.08);
        g.add(leaf);
      }
      g.add(pot);
      break;
    }
    case "bookshelf": {
      const shelf = box(0.9, 1.35, 0.32, mat(0x5a4030));
      shelf.position.y = 0.68;
      for (let i = 0; i < 3; i++) {
        const row = box(0.82, 0.06, 0.28, mat(0x4a3028));
        row.position.set(0, 0.35 + i * 0.42, 0);
        g.add(row);
      }
      g.add(shelf);
      break;
    }
    case "guitar": {
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.1), mat(0xcc2222));
      body.position.set(0, 0.35, 0);
      body.rotation.z = 0.35;
      const neck = box(0.06, 0.55, 0.04, mat(0x5a4030));
      neck.position.set(0.12, 0.62, 0);
      neck.rotation.z = -0.5;
      g.add(body, neck);
      break;
    }
    case "tv": {
      const stand = box(0.7, 0.08, 0.22, mat(0x2a2a30));
      stand.position.y = 0.04;
      const screen = box(0.75, 0.45, 0.06, mat(0x111118));
      screen.position.y = 0.38;
      const glow = box(0.68, 0.38, 0.02, mat(0x4488ff, 0x2266ff));
      glow.position.set(0, 0.38, 0.04);
      g.add(stand, screen, glow);
      break;
    }
    case "bed": {
      const frame = box(1.5, 0.22, 2, mat(0x3a2848));
      frame.position.y = 0.11;
      const mattress = box(1.42, 0.18, 1.9, mat(0x8899aa));
      mattress.position.y = 0.28;
      const pillow = box(0.5, 0.12, 0.35, mat(0xeeeeff));
      pillow.position.set(0, 0.42, -0.72);
      g.add(frame, mattress, pillow);
      break;
    }
    case "neon_sign": {
      const sign = box(1.1, 0.32, 0.05, mat(0x00ffff, 0x00ffff));
      sign.position.y = 0.55;
      const tube = box(0.9, 0.12, 0.03, mat(0xff00ff, 0xff00ff));
      tube.position.set(0, 0.55, 0.06);
      g.add(sign, tube);
      break;
    }
    case "skull_lamp": {
      const skull = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 10), mat(0xddddcc, 0xaaccaa));
      skull.position.y = 0.55;
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), mat(0x00ffaa, 0x00ffaa));
      eyeL.position.set(-0.06, 0.58, 0.14);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.06;
      const chain = box(0.03, 0.35, 0.03, mat(0x888888));
      chain.position.y = 0.85;
      g.add(skull, eyeL, eyeR, chain);
      break;
    }
    default: {
      g.add(box(0.4, 0.4, 0.4, mat(0x3a4858)));
    }
  }
  g.traverse(o => {
    if (o.isMesh) o.userData.decorItem = true;
  });
  return g;
}
