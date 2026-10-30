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
  { id: "skull_lamp", label: "Skull lamp" },
  { id: "urn", label: "Urn" },
  { id: "crypt_bench", label: "Crypt bench" },
  { id: "speaker", label: "Speaker stack" },
  { id: "candles", label: "Candles" },
  { id: "tombstone", label: "Tombstone" }
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
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.1, 16), mat(0x8b1a1a));
      body.rotation.z = Math.PI / 2;
      body.position.set(0, 0.38, 0);
      const waist = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.08), mat(0x6a1010));
      waist.position.set(0, 0.38, 0);
      const neck = box(0.05, 0.62, 0.035, mat(0x5a4030));
      neck.position.set(0.2, 0.72, 0);
      neck.rotation.z = -0.42;
      const head = box(0.09, 0.14, 0.03, mat(0x3a3028));
      head.position.set(0.38, 1.02, 0);
      head.rotation.z = -0.42;
      const stand = box(0.04, 0.42, 0.04, mat(0x222228));
      stand.position.set(-0.05, 0.21, 0);
      g.add(body, waist, neck, head, stand);
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
      const back = box(1.15, 0.55, 0.04, mat(0x1a1a22));
      back.position.y = 0.72;
      const p = mat(0xff00ff, 0xff00ff);
      const p2 = mat(0x00ffff, 0x00ffff);
      const letterP = box(0.12, 0.32, 0.03, p);
      letterP.position.set(-0.38, 0.72, 0.05);
      const letterU = box(0.28, 0.12, 0.03, p2);
      letterU.position.set(-0.05, 0.6, 0.05);
      const letterN = box(0.12, 0.32, 0.03, p);
      letterN.position.set(0.32, 0.72, 0.05);
      const letterK = box(0.12, 0.32, 0.03, p2);
      letterK.position.set(0.48, 0.72, 0.05);
      g.add(back, letterP, letterU, letterN, letterK);
      break;
    }
    case "urn": {
      const base = box(0.28, 0.45, 0.28, mat(0x5a5a68));
      base.position.y = 0.22;
      const lid = box(0.3, 0.08, 0.3, mat(0x6a6a78));
      lid.position.y = 0.48;
      g.add(base, lid);
      break;
    }
    case "crypt_bench": {
      const seat = box(1.2, 0.12, 0.45, mat(0x4a4a55));
      seat.position.y = 0.35;
      const legL = box(0.1, 0.35, 0.4, mat(0x3a3a44));
      legL.position.set(-0.5, 0.18, 0);
      const legR = legL.clone();
      legR.position.x = 0.5;
      g.add(seat, legL, legR);
      break;
    }
    case "speaker": {
      const cab = box(0.42, 0.75, 0.38, mat(0x1a1a20));
      cab.position.y = 0.38;
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.04, 12), mat(0x333340));
      cone.position.set(0, 0.52, 0.2);
      cone.rotation.x = Math.PI / 2;
      const tweeter = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 10), mat(0x555566));
      tweeter.position.set(0, 0.68, 0.2);
      tweeter.rotation.x = Math.PI / 2;
      const led = box(0.08, 0.04, 0.02, mat(0x00ffcc, 0x00ffcc));
      led.position.set(0.15, 0.78, 0.2);
      g.add(cab, cone, tweeter, led);
      break;
    }
    case "candles": {
      const tray = box(0.55, 0.04, 0.22, mat(0x3a3028));
      tray.position.y = 0.02;
      for (let i = 0; i < 3; i++) {
        const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.22, 8), mat(0xfff0dd));
        wax.position.set(-0.14 + i * 0.14, 0.13, 0);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.08, 6), mat(0xffaa44, 0xff6600));
        flame.position.set(-0.14 + i * 0.14, 0.28, 0);
        g.add(wax, flame);
      }
      g.add(tray);
      break;
    }
    case "tombstone": {
      const stone = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.72, 0.12), mat(0x5a5a62));
      stone.position.y = 0.36;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.12, 16, 1, false, 0, Math.PI), mat(0x5a5a62));
      top.rotation.z = Math.PI;
      top.position.set(0, 0.72, 0);
      const cross = box(0.06, 0.22, 0.02, mat(0x888890));
      cross.position.set(0, 0.55, 0.07);
      const crossH = box(0.18, 0.05, 0.02, mat(0x888890));
      crossH.position.set(0, 0.62, 0.07);
      g.add(stone, top, cross, crossH);
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
