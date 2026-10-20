import * as THREE from "three";

function pushCollider(list, cx, cz, halfW, halfD, pad = 0.22) {
  list.push({
    minX: cx - halfW - pad,
    maxX: cx + halfW + pad,
    minZ: cz - halfD - pad,
    maxZ: cz + halfD + pad
  });
}

function wall(w, h, d, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function addSkyDome(root, theme) {
  const geo = new THREE.SphereGeometry(48, 24, 16);
  const mat = new THREE.MeshBasicMaterial({
    color: theme.bg ?? 0x0a0818,
    side: THREE.BackSide,
    fog: false
  });
  const sky = new THREE.Mesh(geo, mat);
  sky.position.y = 8;
  root.add(sky);
  const stars = new Float32Array(400 * 3);
  for (let i = 0; i < 400; i++) {
    const r = 40 + Math.random() * 6;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1) * 0.45 + 0.2;
    stars[i * 3] = Math.cos(t) * Math.sin(p) * r;
    stars[i * 3 + 1] = Math.cos(p) * r + 6;
    stars[i * 3 + 2] = Math.sin(t) * Math.sin(p) * r;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(stars, 3));
  root.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xaaccff, size: 0.12 })));
}

export function addRoomShell(root, w, d, h, wallMat, colliders) {
  root.add(wall(w, h, 0.35, wallMat).translateZ(-d / 2));
  root.add(wall(w, h, 0.35, wallMat).translateZ(d / 2));
  root.add(wall(0.35, h, d, wallMat).translateX(-w / 2));
  root.add(wall(0.35, h, d, wallMat).translateX(w / 2));
  pushCollider(colliders, 0, -d / 2, w / 2, 0.2);
  pushCollider(colliders, 0, d / 2, w / 2, 0.2);
  pushCollider(colliders, -w / 2, 0, 0.2, d / 2);
  pushCollider(colliders, w / 2, 0, 0.2, d / 2);
}

export function addPoster(texLoader, root, url, w, h, x, y, z, ry = 0) {
  const t = texLoader.load(url);
  t.colorSpace = THREE.SRGBColorSpace;
  const p = new THREE.Mesh(
    new THREE.PlaneGeometry(w, h),
    new THREE.MeshStandardMaterial({ map: t, emissive: 0x221133, emissiveIntensity: 0.4 })
  );
  p.position.set(x, y, z);
  p.rotation.y = ry;
  root.add(p);
  return p;
}

export function addNeonTube(root, x, y, z, len, color) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(len, 0.06, 0.06),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2 })
  );
  m.position.set(x, y, z);
  m.userData.pulse = 0.6 + Math.random() * 0.4;
  root.add(m);
}

export function addPumpkin(root, x, z, colliders) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xff7722, emissive: 0xff4400, emissiveIntensity: 0.45 })
  );
  body.position.y = 0.2;
  body.scale.set(1, 0.82, 1);
  body.userData.pulse = 1.2;
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.04, 0.12, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a6b2a })
  );
  stem.position.y = 0.38;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(0.14, 0.1),
    new THREE.MeshBasicMaterial({ color: 0xffcc00 })
  );
  face.position.set(0, 0.22, 0.19);
  g.add(body, stem, face);
  g.position.set(x, 0, z);
  root.add(g);
  pushCollider(colliders, x, z, 0.22, 0.22, 0.15);
}

export function addFloatingGhost(root) {
  const ghost = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 12, 12),
    new THREE.MeshStandardMaterial({
      color: 0xccffff, transparent: true, opacity: 0.55,
      emissive: 0x88ffff, emissiveIntensity: 0.8
    })
  );
  ghost.position.set(2.5, 1.8, -1);
  ghost.userData.float = true;
  root.add(ghost);
}

export function addSofa(root, x, z, colliders) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x4a2060 });
  const base = wall(2.2, 0.45, 0.9, mat);
  base.position.set(x, 0.22, z);
  const back = wall(2.2, 0.7, 0.15, mat);
  back.position.set(x, 0.55, z - 0.38);
  root.add(base, back);
  pushCollider(colliders, x, z, 1.1, 0.45);
}

export function addAmpStack(root, x, z, colliders) {
  const mat = new THREE.MeshStandardMaterial({ color: 0x111118, emissive: 0xff00ff, emissiveIntensity: 0.15 });
  for (let i = 0; i < 2; i++) {
    const a = wall(0.5, 0.9, 0.35, mat);
    a.position.set(x, 0.45 + i * 0.95, z);
    root.add(a);
  }
  pushCollider(colliders, x, z, 0.28, 0.22);
}

export function addHangingChain(root, x, y, z, len = 1.4) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const linkMat = new THREE.MeshStandardMaterial({
    color: 0x888899, metalness: 0.85, roughness: 0.35,
    emissive: 0x4422aa, emissiveIntensity: 0.12
  });
  for (let i = 0; i < 4; i++) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 6, 10), linkMat);
    link.rotation.x = Math.PI / 2;
    link.position.y = -i * 0.22;
    g.add(link);
  }
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffaa44, emissiveIntensity: 1.1 })
  );
  lamp.position.y = -len;
  lamp.userData.pulse = 1.4;
  g.add(lamp);
  g.userData.swing = 0.35 + Math.random() * 0.2;
  g.userData.swingPhase = Math.random() * Math.PI * 2;
  root.add(g);
}

export function addDustParticles(root, count = 80) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 14;
    pos[i * 3 + 1] = 0.4 + Math.random() * 2.8;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xffccff, size: 0.06, transparent: true, opacity: 0.45 })
  );
  pts.userData.drift = true;
  root.add(pts);
}

export function addBats(root, count = 6) {
  const g = new THREE.Group();
  g.name = "bats";
  for (let i = 0; i < count; i++) {
    const bat = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 0.28, 4),
      new THREE.MeshStandardMaterial({ color: 0x221133, emissive: 0x440066, emissiveIntensity: 0.35 })
    );
    bat.rotation.x = Math.PI;
    bat.userData.bat = { phase: i * 1.1, r: 2.5 + i * 0.4, y: 2.2 + (i % 3) * 0.5 };
    g.add(bat);
  }
  root.add(g);
}

export function addTvFlicker(root, x, y, z) {
  const tv = new THREE.Group();
  tv.position.set(x, y, z);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.55, 0.12),
    new THREE.MeshStandardMaterial({ color: 0x222228 })
  );
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 0.44),
    new THREE.MeshStandardMaterial({ color: 0x88ccff, emissive: 0x66aaff, emissiveIntensity: 1.2 })
  );
  screen.position.z = 0.07;
  screen.userData.pulse = 1.8;
  tv.add(body, screen);
  root.add(tv);
}

export function addSpinningVinyl(root, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.22, 0.02, 24),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff00ff, emissiveIntensity: 0.25 })
  );
  disc.rotation.x = Math.PI / 2;
  disc.userData.spin = 1.4;
  g.add(disc);
  root.add(g);
}

export function addRoofDressing(root, helpers) {
  const { wall, neonSign, addNeonTube, texLoader, colliders, pushCollider, addPoster } = helpers;
  const skyline = new THREE.Group();
  for (let i = -8; i <= 8; i++) {
    const h = 6 + Math.abs(i % 4) * 2.2 + Math.random() * 2;
    const b = wall(2.4, h, 2.6, new THREE.MeshStandardMaterial({
      color: 0x121828, emissive: 0x330055, emissiveIntensity: 0.35
    }));
    b.position.set(i * 2.4, h / 2 - 1, -14);
    skyline.add(b);
    for (let w = 0; w < 3; w++) {
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(0.35, 0.5),
        new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffcc66, emissiveIntensity: 1.1 })
      );
      win.position.set(i * 2.4 + (w - 1) * 0.5, 1.2 + w * 1.4, -12.65);
      skyline.add(win);
    }
  }
  root.add(skyline);
  const tower = new THREE.Group();
  tower.position.set(-7, 0, -11);
  tower.add(wall(1.2, 4.5, 1.2, new THREE.MeshStandardMaterial({ color: 0x556677 })).translateY(2.25));
  const tank = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.1, 0.8, 12),
    new THREE.MeshStandardMaterial({ color: 0x667788 })
  );
  tank.position.y = 4.9;
  tower.add(tank);
  root.add(tower);
  for (let i = 0; i < 4; i++) {
    const ant = wall(0.04, 2.2, 0.04, new THREE.MeshStandardMaterial({ color: 0x888899 }));
    ant.position.set(5 + i * 1.2, 3.5, -10 - i * 0.3);
    root.add(ant);
  }
  const chimney = wall(0.7, 2.8, 0.7, new THREE.MeshStandardMaterial({ color: 0x443333 }));
  chimney.position.set(3, 1.4, -6);
  root.add(chimney);
  root.add(neonSign("NIGHT CITY", 0xff66ff).translateX(-4).translateY(3.8).translateZ(-7.5));
  addNeonTube(root, -5, 3.2, 4, 3.5, 0xff00ff);
  addNeonTube(root, 5, 3, -2, 2.8, 0x00ffff);
  for (let i = -3; i <= 3; i++) {
    addNeonTube(root, i * 2.2, 2.6, 6.5, 0.8, 0xffff88);
  }
  const vent = wall(1.4, 0.35, 0.8, new THREE.MeshStandardMaterial({ color: 0x333344 }));
  vent.position.set(-2, 0.18, 3);
  root.add(vent);
  pushCollider(colliders, -2, 3, 0.7, 0.4);
  for (let i = 0; i < 3; i++) {
    const crate = wall(0.9, 0.7, 0.9, new THREE.MeshStandardMaterial({ color: 0x5a4030 }));
    crate.position.set(4 + i * 0.95, 0.35, 2 - i * 0.4);
    root.add(crate);
    pushCollider(colliders, crate.position.x, crate.position.z, 0.45, 0.45);
  }
  addPoster(texLoader, root, "imagine_images/77Mdp.jpg", 4, 2.2, -8, 1.5, -7.2, 0.1);
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.35 });
  [-9, 9].forEach(x => {
    for (let z = -6; z <= 6; z += 2) {
      const post = wall(0.08, 1.2, 0.08, fenceMat);
      post.position.set(x, 0.6, z);
      root.add(post);
    }
  });
}

export function addParkourDressing(root, helpers) {
  const { wall, neonSign, colliders, pushCollider } = helpers;
  const colors = [0xff3366, 0x33ffcc, 0xffcc00, 0x9966ff, 0x00ff88, 0xff6633];
  for (let i = 0; i < 8; i++) {
    const col = colors[i % colors.length];
    const h = 0.25 + (i % 3) * 0.35;
    const plat = wall(2.8, h, 2.2, new THREE.MeshStandardMaterial({
      color: col, emissive: col, emissiveIntensity: 0.45, metalness: 0.2
    }));
    const px = (i % 2 ? 2.8 : -2.8) + (i % 4 === 0 ? 0.5 : 0);
    const pz = -9 + i * 2.4;
    plat.position.set(px, h / 2, pz);
    root.add(plat);
    pushCollider(colliders, px, pz, 1.4, 1.1, 0.15);
    const edge = new THREE.Mesh(
      new THREE.TorusGeometry(1.35, 0.04, 6, 4),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x00ffff, emissiveIntensity: 1.2 })
    );
    edge.rotation.x = Math.PI / 2;
    edge.position.set(px, h + 0.02, pz);
    edge.userData.pulse = 1;
    root.add(edge);
    if (i % 2 === 0) {
      const ramp = wall(2.2, 0.2, 1.8, new THREE.MeshStandardMaterial({ color: 0x445566, emissive: 0x224466, emissiveIntensity: 0.3 }));
      ramp.position.set(px * 0.5, 0.12, pz + 1.2);
      ramp.rotation.x = -0.35;
      root.add(ramp);
    }
  }
  for (let s = 0; s < 3; s++) {
    const scaf = wall(0.12, 4.5, 0.12, new THREE.MeshStandardMaterial({ color: 0x888899 }));
    scaf.position.set(-4 + s * 4, 2.25, -3);
    root.add(scaf);
    const bar = wall(3.5, 0.1, 0.1, new THREE.MeshStandardMaterial({ color: 0xaa3344, emissive: 0xff0044, emissiveIntensity: 0.4 }));
    bar.position.set(0, 3.8 - s * 0.5, -3);
    root.add(bar);
  }
  for (let c = 0; c < 4; c++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.08, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 1.3 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set((c % 2 ? 3 : -3), 1.2 + c * 0.6, -6 + c * 3);
    ring.userData.pulse = 1.1;
    root.add(ring);
  }
  root.add(neonSign("JUMP!", 0x00ffff).translateY(3.2).translateZ(-10));
}

export function addCemeteryDressing(root, helpers) {
  const { wall, neonSign, addPumpkin, colliders, pushCollider, texLoader, addPoster } = helpers;
  for (let i = -5; i <= 5; i++) {
    const h = 0.9 + Math.abs(i % 4) * 0.25;
    const stone = wall(0.75 + (i % 2) * 0.2, h, 0.22, new THREE.MeshStandardMaterial({
      color: 0x4a5a58, roughness: 0.92, emissive: 0x112211, emissiveIntensity: 0.08
    }));
    const sz = -4 + (i % 3) * 2.5;
    stone.position.set(i * 1.9, h / 2, sz);
    root.add(stone);
    pushCollider(colliders, i * 1.9, sz, 0.38, 0.12);
  }
  const crypt = wall(3.5, 2.2, 2.8, new THREE.MeshStandardMaterial({ color: 0x2a3835, emissive: 0x113322, emissiveIntensity: 0.2 }));
  crypt.position.set(6, 1.1, -2);
  root.add(crypt);
  pushCollider(colliders, 6, -2, 1.75, 1.4);
  const treeSpots = [
    { x: -9, z: -7 }, { x: 9, z: -6.5 }, { x: -8, z: 6 }, { x: 8.5, z: 5.5 }
  ];
  treeSpots.forEach(({ x, z }) => {
    const trunk = wall(0.22, 2.4, 0.22, new THREE.MeshStandardMaterial({ color: 0x2a2018 }));
    trunk.position.set(x, 1.2, z);
    trunk.userData.cameraOccluder = true;
    root.add(trunk);
    const branches = wall(1.4, 0.12, 1.4, new THREE.MeshStandardMaterial({ color: 0x1a1818 }));
    branches.position.set(x, 2.55, z);
    branches.userData.cameraOccluder = true;
    root.add(branches);
  });
  const gateL = wall(0.15, 2.4, 0.15, new THREE.MeshStandardMaterial({ color: 0x3a4a40, emissive: 0x226644, emissiveIntensity: 0.3 }));
  gateL.position.set(-1.2, 1.2, -8.2);
  const gateR = gateL.clone();
  gateR.position.x = 1.2;
  root.add(gateL, gateR);
  root.add(neonSign("REST IN PUNK", 0x88ff88).translateY(3.4).translateZ(-8.5));
  addPumpkin(root, -5, 4, colliders);
  addPumpkin(root, 4, 5, colliders);
  addPumpkin(root, -8, -3, colliders);
  addPoster(texLoader, root, "imagine_images/RgdDh.jpg", 4, 2.5, -6, 1.6, -8.6);
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.45, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffffdd, emissive: 0xffffaa, emissiveIntensity: 1.4 })
  );
  moon.position.set(2, 11, -16);
  root.add(moon);
}

export function addCityDressing(root, helpers) {
  const { wall, neonSign, addNeonTube, colliders, pushCollider } = helpers;
  for (let i = -2; i <= 2; i++) {
    const h = 5 + Math.abs(i) * 1.2;
    const facade = wall(5, h, 0.4, new THREE.MeshStandardMaterial({
      color: 0x2a2838, emissive: 0x220044, emissiveIntensity: 0.25
    }));
    facade.position.set(i * 6, h / 2, -8.5);
    facade.userData.cameraOccluder = true;
    root.add(facade);
    for (let w = 0; w < 4; w++) {
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(0.55, 0.7),
        new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffaa66, emissiveIntensity: 1 })
      );
      win.position.set(i * 6 + (w - 1.5) * 0.9, 1.4 + w * 1.1, -8.25);
      root.add(win);
    }
  }
  root.add(neonSign("24H BODEGA", 0x00ffff).translateX(-5).translateY(3.2).translateZ(-7.8));
  root.add(neonSign("PIZZA", 0xff3366).translateX(5).translateY(2.8).translateZ(-7.5));
  for (let i = -3; i <= 3; i++) {
    const lamp = new THREE.Group();
    const pole = wall(0.1, 3.2, 0.1, new THREE.MeshStandardMaterial({ color: 0x444455 }));
    pole.position.y = 1.6;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffaa, emissive: 0xffcc66, emissiveIntensity: 1.3 })
    );
    bulb.position.y = 3.25;
    bulb.userData.pulse = 1.1;
    lamp.add(pole, bulb);
    lamp.position.set(i * 2.8, 0, 3.5);
    root.add(lamp);
  }
  const cross = wall(3.5, 0.06, 0.8, new THREE.MeshStandardMaterial({ color: 0xeeeeee, emissive: 0xffffff, emissiveIntensity: 0.5 }));
  cross.position.set(0, 0.03, 2);
  root.add(cross);
  const hydrant = wall(0.35, 0.55, 0.35, new THREE.MeshStandardMaterial({ color: 0xcc2222 }));
  hydrant.position.set(-3, 0.28, 1.5);
  root.add(hydrant);
  const bench = wall(1.8, 0.35, 0.55, new THREE.MeshStandardMaterial({ color: 0x5a4030 }));
  bench.position.set(4, 0.18, 2.2);
  root.add(bench);
  pushCollider(colliders, 4, 2.2, 0.9, 0.3);
  const car = wall(2.2, 0.65, 1, new THREE.MeshStandardMaterial({ color: 0x2244aa, metalness: 0.5 }));
  car.position.set(-5, 0.33, -1);
  root.add(car);
  pushCollider(colliders, -5, -1, 1.1, 0.5);
  addNeonTube(root, 0, 3.5, -6, 4, 0xff00ff);
}

export function addKitchenDressing(root, helpers) {
  const { wall, colliders, pushCollider } = helpers;
  const stove = wall(1.1, 0.9, 0.65, new THREE.MeshStandardMaterial({ color: 0x333338, metalness: 0.5 }));
  stove.position.set(2.5, 0.45, -4);
  root.add(stove);
  pushCollider(colliders, 2.5, -4, 0.55, 0.35);
  const hood = wall(1.2, 0.15, 0.7, new THREE.MeshStandardMaterial({ color: 0x888899 }));
  hood.position.set(2.5, 1.35, -4);
  root.add(hood);
  const shelves = wall(3.5, 0.12, 0.35, new THREE.MeshStandardMaterial({ color: 0x6a5040 }));
  shelves.position.set(-4, 2.1, -4.6);
  root.add(shelves);
  for (let j = 0; j < 4; j++) {
    const jar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 0.18, 8),
      new THREE.MeshStandardMaterial({ color: 0x88aacc, transparent: true, opacity: 0.85 })
    );
    jar.position.set(-4.8 + j * 0.45, 2.35, -4.55);
    root.add(jar);
  }
  const sinkBasin = wall(0.9, 0.25, 0.55, new THREE.MeshStandardMaterial({ color: 0x99aabb, metalness: 0.4 }));
  sinkBasin.position.set(-2.5, 0.72, -4.1);
  root.add(sinkBasin);
  for (let c = 0; c < 3; c++) {
    const chair = wall(0.45, 0.55, 0.45, new THREE.MeshStandardMaterial({ color: 0x4a3020 }));
    chair.position.set(-0.8 + c * 0.9, 0.28, 2.2);
    root.add(chair);
    pushCollider(colliders, chair.position.x, 2.2, 0.22, 0.22);
  }
  const lamp = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 0.25, 8),
    new THREE.MeshStandardMaterial({ color: 0xffeecc, emissive: 0xffdd99, emissiveIntensity: 0.9 })
  );
  lamp.position.set(0, 2.85, 0.5);
  lamp.rotation.x = Math.PI;
  root.add(lamp);
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xcc4422 })
  );
  bowl.position.set(0.2, 0.82, 1.45);
  root.add(bowl);
  const pizza = wall(0.55, 0.06, 0.55, new THREE.MeshStandardMaterial({ color: 0xddaa44 }));
  pizza.position.set(-1.2, 0.8, 1.5);
  root.add(pizza);
  for (let m = 0; m < 2; m++) {
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.08, 0.14, 8),
      new THREE.MeshStandardMaterial({ color: m ? 0x3366aa : 0xaa3366 })
    );
    mug.position.set(0.6 + m * 0.2, 0.86, 1.35);
    root.add(mug);
  }
  const magnet = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.08, 0.02),
    new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.6 })
  );
  magnet.position.set(4.35, 1.6, -4.2);
  root.add(magnet);
}

export function addElevatorDressing(root, helpers) {
  const { wall, neonSign, colliders, pushCollider } = helpers;
  const doors = wall(2.4, 2.5, 0.08, new THREE.MeshStandardMaterial({
    color: 0x99aabb, metalness: 0.75, roughness: 0.35
  }));
  doors.position.set(0, 1.25, 4.15);
  root.add(doors);
  pushCollider(colliders, 0, 4.15, 1.2, 0.06);
  const panel = wall(0.35, 0.9, 0.08, new THREE.MeshStandardMaterial({ color: 0x222228 }));
  panel.position.set(3.8, 1.4, 3.5);
  root.add(panel);
  ["3", "2", "1"].forEach((n, i) => {
    const btn = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.12, 0.03),
      new THREE.MeshStandardMaterial({
        color: i === 1 ? 0x00ffcc : 0x333344,
        emissive: i === 1 ? 0x00ffcc : 0x000000,
        emissiveIntensity: i === 1 ? 1.2 : 0
      })
    );
    btn.position.set(3.8, 1.65 - i * 0.22, 3.46);
    root.add(btn);
  });
  const mirror = new THREE.Mesh(
    new THREE.PlaneGeometry(2.2, 2.4),
    new THREE.MeshStandardMaterial({ color: 0xaaccdd, metalness: 0.9, roughness: 0.1 })
  );
  mirror.position.set(-3.9, 1.35, 0);
  mirror.rotation.y = Math.PI / 2;
  root.add(mirror);
  const rail = wall(2.8, 0.06, 0.06, new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.7 }));
  rail.position.set(0, 1, -3.8);
  root.add(rail);
  const ceil = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 0.35 })
  );
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = 3.45;
  ceil.userData.pulse = 0.9;
  root.add(ceil);
  for (let s = 0; s < 5; s++) {
    const sticker = new THREE.Mesh(
      new THREE.PlaneGeometry(0.25, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.4 })
    );
    sticker.position.set(-3.5 + s * 0.4, 1.2 + (s % 2) * 0.5, -4.88);
    root.add(sticker);
  }
  root.add(neonSign("PUNK LIFT", 0x00ffff).translateY(2.5).translateZ(-4.7));
}

export function addSteamPuff(root, x, z) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xccccdd, transparent: true, opacity: 0.35 })
  );
  m.position.set(x, 0.2, z);
  m.userData.rise = 0.35 + Math.random() * 0.15;
  m.userData.riseBase = 0.2;
  root.add(m);
}

export function pulseScene(root, t) {
  root.traverse(o => {
    if (o.userData?.bat) {
      const b = o.userData.bat;
      o.position.x = Math.cos(t * 1.6 + b.phase) * b.r;
      o.position.z = Math.sin(t * 1.6 + b.phase) * b.r * 0.6 - 4;
      o.position.y = b.y + Math.sin(t * 8 + b.phase) * 0.15;
    }
    if (o.userData?.spin) {
      o.rotation.z += o.userData.spin * 0.02;
    }
    if (o.userData?.wag) {
      o.rotation.x = -0.5 + Math.sin(t * 6) * o.userData.wag * 0.12;
    }
    if (o.userData?.swing) {
      o.rotation.z = Math.sin(t * 1.8 + (o.userData.swingPhase || 0)) * o.userData.swing;
    }
    if (o.userData?.drift && o.isPoints) {
      const attr = o.geometry.attributes.position;
      for (let i = 0; i < attr.count; i++) {
        let y = attr.getY(i) + Math.sin(t + i) * 0.0008;
        if (y > 3.2) y = 0.35;
        attr.setY(i, y);
      }
      attr.needsUpdate = true;
    }
    if (o.userData?.rise) {
      o.position.y = o.userData.riseBase + (Math.sin(t * o.userData.rise) + 1) * 0.55;
      if (o.material?.opacity !== undefined) {
        o.material.opacity = 0.22 + 0.18 * (0.5 + 0.5 * Math.sin(t * 2.1));
      }
    }
    if (!o.isMesh) return;
    if (o.userData.flap) {
      o.rotation.y = (o.userData.flapBase || 0) + Math.sin(t * 3.5) * 0.08;
    }
    if (!o.userData.pulse) return;
    const e = o.material?.emissiveIntensity;
    if (e !== undefined) {
      o.material.emissiveIntensity = o.userData.pulse * (0.65 + 0.35 * Math.sin(t * 4.5));
    }
    if (o.userData.float) {
      o.position.y = 1.8 + Math.sin(t * 1.2) * 0.25;
      o.position.x = 2.5 + Math.sin(t * 0.7) * 0.4;
    }
  });
}
