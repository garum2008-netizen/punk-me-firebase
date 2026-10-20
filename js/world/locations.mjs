import * as THREE from "three";

/** Axis-aligned floor obstacles (world XZ), half-extents + padding. */
export function pushCollider(list, cx, cz, halfW, halfD, pad = 0.22) {
  list.push({
    minX: cx - halfW - pad,
    maxX: cx + halfW + pad,
    minZ: cz - halfD - pad,
    maxZ: cz + halfD + pad
  });
}

export const LOCATION_BOUNDS = {
  room: { minX: -7, maxX: 7, minZ: -6, maxZ: 6 },
  kitchen: { minX: -6, maxX: 6, minZ: -5, maxZ: 5 },
  roof: { minX: -10, maxX: 10, minZ: -8, maxZ: 8 },
  street: { minX: -12, maxX: 12, minZ: -10, maxZ: 10 },
  cemetery: { minX: -11, maxX: 11, minZ: -9, maxZ: 9 },
  default: { minX: -8, maxX: 8, minZ: -8, maxZ: 8 }
};

export const NPC_WORLD = {
  street: {
    razor: { x: -5.5, z: 1 },
    mohawk: { x: -2, z: 2.5 },
    vienna: { x: 2, z: 1.5 },
    ghost: { x: 5, z: 3 }
  },
  cemetery: { gravedigger: { x: 0, z: 2 } }
};

export const PORTALS = {
  room: [
    { to: "kitchen", labelKey: "door_kitchen", x: -6.2, z: 0, r: 1.2 },
    { to: "toilet", labelKey: "door_toilet", x: 6.2, z: 0, r: 1.2 },
    { to: "elevator", labelKey: "door_elevator", x: 0, z: -5.5, r: 1.3 },
    { to: "street", labelKey: "door_street", x: 0, z: 5.5, r: 1.3 }
  ],
  street: [
    { to: "elevator", labelKey: "door_home", x: -10, z: 0, r: 1.5 },
    { to: "cemetery", labelKey: "door_cemetery", x: 10, z: -2, r: 1.5 },
    { to: "city", labelKey: "door_city", x: 0, z: 8, r: 1.5 }
  ]
};

export const LOCATION_THEME = {
  room: { bg: 0x1a0e28, fog: 0x12081c, fogD: 0.012, hemi: 0xffaaff, ground: 0x2a1840 },
  kitchen: { bg: 0x281408, fog: 0x1a0c08, fogD: 0.01, hemi: 0xffcc88, ground: 0x3a2818 },
  roof: { bg: 0x0a1838, fog: 0x081428, fogD: 0.008, hemi: 0x88ccff, ground: 0x1a2030 },
  street: { bg: 0x100818, fog: 0x0c0610, fogD: 0.014, hemi: 0xff88ff, ground: 0x181420 },
  cemetery: { bg: 0x081208, fog: 0x060e06, fogD: 0.018, hemi: 0x88ffaa, ground: 0x142018 }
};

function wall(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function poster(tex, w, h) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({
      map: tex,
      emissive: 0x331144,
      emissiveIntensity: 0.35,
      roughness: 0.75,
      metalness: 0.05
    })
  );
}

function neonSign(text, color = 0xff00ff) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(0,0,0,0.55)";
  g.fillRect(0, 0, 512, 128);
  g.font = "bold 56px system-ui";
  g.fillStyle = "#0ff";
  g.shadowColor = "#f0f";
  g.shadowBlur = 22;
  g.textAlign = "center";
  g.fillText(text, 256, 78);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.8),
    new THREE.MeshStandardMaterial({
      map: t, emissive: color, emissiveIntensity: 1.2, transparent: true, side: THREE.DoubleSide
    })
  );
}

function portalMesh(label) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.85, 0.07, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.1, metalness: 0.35 })
  );
  ring.rotation.x = Math.PI / 2;
  const sign = neonSign(label, 0x00ffff);
  sign.position.y = 1.5;
  sign.scale.set(0.5, 0.5, 1);
  const g = new THREE.Group();
  g.add(ring);
  g.add(sign);
  return g;
}

function tiledFloor(w, d, color, checker = false) {
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 256;
  const g = c.getContext("2d");
  const a = "#" + new THREE.Color(color).getHexString();
  const b = checker ? "#" + new THREE.Color(color).multiplyScalar(0.72).getHexString() : a;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      g.fillStyle = checker && (x + y) % 2 ? b : a;
      g.fillRect(x * 32, y * 32, 32, 32);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(w / 2, d / 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  return floor;
}

function addLights(root, specs) {
  const g = new THREE.Group();
  g.name = "loc_lights";
  specs.forEach(s => {
    const L = s.type === "point"
      ? new THREE.PointLight(s.color, s.intensity, s.dist || 12)
      : new THREE.SpotLight(s.color, s.intensity, s.dist || 18, 0.6, 0.5);
    L.position.set(s.x, s.y, s.z);
    if (s.cast) L.castShadow = true;
    g.add(L);
  });
  root.add(g);
  return g;
}

function buildCat(x, z, color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.22, 0.55),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.15 })
  );
  body.position.y = 0.18;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.18), body.material);
  head.position.set(0, 0.32, 0.28);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.28), body.material);
  tail.position.set(0, 0.28, -0.32);
  tail.rotation.x = -0.5;
  g.add(body, head, tail);
  g.position.set(x, 0, z);
  return g;
}

export function gameToWorldLoc(gx, gy, bounds) {
  const bx = bounds.maxX - bounds.minX;
  const bz = bounds.maxZ - bounds.minZ;
  return {
    x: bounds.minX + (gx / 100) * bx,
    z: bounds.minZ + (gy / 100) * bz
  };
}

export function worldToGameLoc(x, z, bounds) {
  const bx = bounds.maxX - bounds.minX;
  const bz = bounds.maxZ - bounds.minZ;
  return {
    x: Math.max(2, Math.min(98, ((x - bounds.minX) / bx) * 100)),
    y: Math.max(2, Math.min(98, ((z - bounds.minZ) / bz) * 100))
  };
}

export function buildLocationScene(locId, texLoader) {
  const root = new THREE.Group();
  root.name = "loc_" + locId;
  const bounds = LOCATION_BOUNDS[locId] || LOCATION_BOUNDS.default;
  const theme = LOCATION_THEME[locId] || LOCATION_THEME.room;
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2a1838, roughness: 0.82, metalness: 0.1 });
  let floor = null;
  const props = { cats: [], showCar: false };
  const colliders = [];

  if (locId === "room") {
    floor = tiledFloor(14, 12, theme.ground, true);
    root.add(floor);
    root.add(wall(14, 3.4, 0.3, wallMat).translateZ(-6));
    root.add(wall(0.3, 3.4, 12, wallMat).translateX(-7));
    root.add(wall(0.3, 3.4, 12, wallMat).translateX(7));
    const roomTex = texLoader.load("imagine_images/q4BXV.jpg");
    roomTex.colorSpace = THREE.SRGBColorSpace;
    const p1 = poster(roomTex, 4, 2.4);
    p1.position.set(0, 2, -5.82);
    root.add(p1);
    const bed = wall(2.8, 0.45, 1.6, new THREE.MeshStandardMaterial({ color: 0x4a2060 }));
    bed.position.set(-3, 0.22, 2.2);
    root.add(bed);
    pushCollider(colliders, -3, 2.2, 1.4, 0.8);
    const desk = wall(1.6, 0.75, 0.8, new THREE.MeshStandardMaterial({ color: 0x1a1028 }));
    desk.position.set(3.2, 0.38, -1);
    root.add(desk);
    pushCollider(colliders, 3.2, -1, 0.8, 0.4);
    const sign = neonSign("PUNK ME", 0xff00ff);
    sign.position.set(3.8, 2.6, -5.65);
    root.add(sign);
    props.cats.push(buildCat(-2, -2, 0x5533aa));
    addLights(root, [
      { type: "point", color: 0xff66ff, intensity: 2.8, x: -2, y: 2.8, z: 1 },
      { type: "point", color: 0x00ffff, intensity: 2.2, x: 3, y: 2.5, z: -2 }
    ]);
  } else if (locId === "kitchen") {
    floor = tiledFloor(12, 10, theme.ground, true);
    root.add(floor);
    root.add(wall(12, 3.2, 0.3, wallMat).translateZ(-5));
    root.add(wall(0.3, 3.2, 10, wallMat).translateX(-6));
    root.add(wall(0.3, 3.2, 10, wallMat).translateX(6));
    const counter = wall(5, 0.9, 0.6, new THREE.MeshStandardMaterial({ color: 0x5a4030 }));
    counter.position.set(-2, 0.45, -4.2);
    root.add(counter);
    pushCollider(colliders, -2, -4.2, 2.5, 0.35);
    const fridge = wall(1.2, 2.2, 0.8, new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.5 }));
    fridge.position.set(4.5, 1.1, -4.3);
    root.add(fridge);
    pushCollider(colliders, 4.5, -4.3, 0.6, 0.45);
    const table = wall(2.4, 0.08, 1.4, new THREE.MeshStandardMaterial({ color: 0x3a2818 }));
    table.position.set(0, 0.75, 1.5);
    root.add(table);
    pushCollider(colliders, 0, 1.5, 1.25, 0.85, 0.35);
    const kt = texLoader.load("imagine_images/LTPb8.jpg");
    kt.colorSpace = THREE.SRGBColorSpace;
    const kp = poster(kt, 2.5, 1.8);
    kp.position.set(0, 2.1, -4.85);
    root.add(kp);
    const sign = neonSign("KITCHEN", 0xff8800);
    sign.position.set(-4, 2.4, -4.7);
    root.add(sign);
    props.cats.push(buildCat(3, 2, 0x222233));
    addLights(root, [
      { type: "point", color: 0xffaa66, intensity: 3.2, x: 0, y: 2.8, z: 0 },
      { type: "point", color: 0xff00ff, intensity: 1.6, x: -4, y: 2.2, z: -3 }
    ]);
  } else if (locId === "roof") {
    floor = tiledFloor(20, 16, theme.ground, false);
    root.add(floor);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.4 });
    [-9, 9].forEach(x => {
      root.add(wall(0.08, 1.1, 16, railMat).translateX(x).translateY(0.55));
    });
    [-7, 7].forEach(z => {
      root.add(wall(18, 1.1, 0.08, railMat).translateZ(z).translateY(0.55));
    });
    for (let i = -3; i <= 3; i++) {
      const h = 4 + Math.abs(i) * 0.8;
      const b = wall(2.2, h, 2.2, new THREE.MeshStandardMaterial({
        color: 0x0a1028, emissive: 0x220044, emissiveIntensity: 0.25
      }));
      b.position.set(i * 2.8, h / 2, -12);
      root.add(b);
      pushCollider(colliders, i * 2.8, -12, 1.1, 1.1);
      const win = new THREE.PointLight(0xff00ff, 0.9, 5);
      win.position.set(i * 2.8, h * 0.6, -11);
      root.add(win);
    }
    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 1.5 })
    );
    moon.position.set(6, 6, -10);
    root.add(moon);
    const sign = neonSign("ROOFTOP", 0x88ccff);
    sign.position.set(0, 2.2, -6);
    root.add(sign);
    addLights(root, [
      { type: "point", color: 0xaaccff, intensity: 2.5, x: 0, y: 4, z: 2 },
      { type: "point", color: 0xff00ff, intensity: 1.8, x: -5, y: 3, z: -4 }
    ]);
  } else if (locId === "street") {
    floor = tiledFloor(26, 22, theme.ground, false);
    root.add(floor);
    for (let i = -2; i <= 2; i++) {
      const h = 5 + (i % 2) * 1.5;
      const b = wall(4.2, h, 3.2, wallMat);
      b.position.set(i * 5.5, h / 2, -8.5);
      root.add(b);
      pushCollider(colliders, i * 5.5, -8.5, 2.1, 1.6);
      const lamp = new THREE.Group();
      const pole = wall(0.12, 3.5, 0.12, new THREE.MeshStandardMaterial({ color: 0x333344 }));
      pole.position.y = 1.75;
      const bulb = new THREE.PointLight(0x00ffff, 2.4, 10);
      bulb.position.set(0, 3.6, 0);
      lamp.add(pole, bulb);
      lamp.position.set(i * 5.5 + 2, 0, -4);
      root.add(lamp);
    }
    const streetTex = texLoader.load("imagine_images/77Mdp.jpg");
    streetTex.colorSpace = THREE.SRGBColorSpace;
    const mural = poster(streetTex, 9, 4.5);
    mural.position.set(0, 3.2, -10.5);
    root.add(mural);
    root.add(neonSign("PUNK ME", 0xff00ff).translateX(6).translateY(4.5).translateZ(-6));
    root.add(neonSign("NEON SHOP", 0x00ffff).translateX(-6).translateY(4).translateZ(-5.5));
    props.showCar = true;
    props.cats.push(buildCat(-3, 3, 0x111122), buildCat(4, -2, 0x442266));
    addLights(root, [
      { type: "point", color: 0xff66ff, intensity: 2.6, x: 0, y: 4.5, z: 0 },
      { type: "point", color: 0x00ffff, intensity: 2, x: -8, y: 3, z: 2 }
    ]);
  } else if (locId === "cemetery") {
    floor = tiledFloor(22, 18, theme.ground, false);
    root.add(floor);
    for (let i = -4; i <= 4; i++) {
      const stone = wall(0.9, 1.1 + (i % 3) * 0.3, 0.25, new THREE.MeshStandardMaterial({ color: 0x3a4a48, roughness: 0.9 }));
      const sz = -3 + (i % 2) * 2;
      stone.position.set(i * 2.2, 0.55, sz);
      root.add(stone);
      pushCollider(colliders, i * 2.2, sz, 0.45, 0.15);
    }
    const gate = neonSign("NOT DEAD YET", 0x88ff88);
    gate.position.set(0, 2.8, -8);
    root.add(gate);
    const ct = texLoader.load("imagine_images/Oo040.jpg");
    ct.colorSpace = THREE.SRGBColorSpace;
    const cp = poster(ct, 3, 2);
    cp.position.set(-5, 1.8, -8.5);
    root.add(cp);
    props.cats.push(buildCat(2, 4, 0x1a1a2a));
    addLights(root, [
      { type: "point", color: 0x66ff99, intensity: 2, x: 0, y: 3, z: 0 },
      { type: "point", color: 0xff00ff, intensity: 1.2, x: 6, y: 2.5, z: -5 }
    ]);
  } else {
    floor = tiledFloor(16, 16, theme.ground, true);
    root.add(floor);
    root.add(wall(16, 4, 0.3, wallMat).translateZ(-8));
    root.add(neonSign("PUNK — " + locId.toUpperCase(), 0xff00ff).translateY(2.5).translateZ(-7.5));
    addLights(root, [{ type: "point", color: 0xff00ff, intensity: 2.5, x: 0, y: 3, z: 0 }]);
  }

  const portals = new THREE.Group();
  (PORTALS[locId] || []).forEach(p => {
    const label = (typeof window !== "undefined" && window.doorT)
      ? window.doorT(p.labelKey)
      : p.labelKey;
    const g = portalMesh(label);
    g.position.set(p.x, 0.05, p.z);
    portals.add(g);
  });
  root.add(portals);

  return { root, bounds, floor, portals, theme, props, colliders };
}

export function pointInsideCollider(x, z, colliders, radius = 0.4) {
  for (const b of colliders || []) {
    const nx = Math.max(b.minX, Math.min(b.maxX, x));
    const nz = Math.max(b.minZ, Math.min(b.maxZ, z));
    const dx = x - nx;
    const dz = z - nz;
    if (dx * dx + dz * dz < radius * radius) {
      const inside = x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
      if (inside || dx * dx + dz * dz < radius * radius) return true;
    }
    if (x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ) return true;
  }
  return false;
}

export function resolveWorldPosition(x, z, bounds, colliders, radius = 0.42) {
  let px = x;
  let pz = z;
  if (bounds) {
    px = Math.max(bounds.minX + 0.5, Math.min(bounds.maxX - 0.5, px));
    pz = Math.max(bounds.minZ + 0.5, Math.min(bounds.maxZ - 0.5, pz));
  }
  for (let iter = 0; iter < 10; iter++) {
    let moved = false;
    for (const b of colliders || []) {
      if (px > b.minX && px < b.maxX && pz > b.minZ && pz < b.maxZ) {
        const dL = px - b.minX;
        const dR = b.maxX - px;
        const dB = pz - b.minZ;
        const dF = b.maxZ - pz;
        const m = Math.min(dL, dR, dB, dF);
        if (m === dL) px = b.minX - radius * 0.15;
        else if (m === dR) px = b.maxX + radius * 0.15;
        else if (m === dB) pz = b.minZ - radius * 0.15;
        else pz = b.maxZ + radius * 0.15;
        moved = true;
      } else {
        const nx = Math.max(b.minX, Math.min(b.maxX, px));
        const nz = Math.max(b.minZ, Math.min(b.maxZ, pz));
        const dx = px - nx;
        const dz = pz - nz;
        const d2 = dx * dx + dz * dz;
        const r2 = radius * radius;
        if (d2 < r2 && d2 > 1e-6) {
          const d = Math.sqrt(d2);
          const push = (radius - d) * 1.05;
          px += (dx / d) * push;
          pz += (dz / d) * push;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  if (bounds) {
    px = Math.max(bounds.minX + 0.5, Math.min(bounds.maxX - 0.5, px));
    pz = Math.max(bounds.minZ + 0.5, Math.min(bounds.maxZ - 0.5, pz));
  }
  return { x: px, z: pz };
}

export function findClearSpawn(bounds, colliders, preferred = { x: 0, z: -1.5 }) {
  const offsets = [
    [0, 0], [2, 0], [-2, 0], [0, 2], [0, -2], [2.5, 2.5], [-2.5, 2.5], [3, -2], [-3, -2]
  ];
  for (const [ox, oz] of offsets) {
    const p = resolveWorldPosition(preferred.x + ox, preferred.z + oz, bounds, colliders, 0.42);
    if (!pointInsideCollider(p.x, p.z, colliders, 0.38)) return p;
  }
  return resolveWorldPosition(preferred.x, preferred.z, bounds, colliders, 0.42);
}
