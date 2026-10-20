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

function markCameraOccluder(mesh) {
  mesh.userData.cameraOccluder = true;
  return mesh;
}

export function addRoomShell(root, w, d, h, wallMat, colliders) {
  root.add(markCameraOccluder(wall(w, h, 0.35, wallMat)).translateZ(-d / 2));
  root.add(markCameraOccluder(wall(w, h, 0.35, wallMat)).translateZ(d / 2));
  root.add(markCameraOccluder(wall(0.35, h, d, wallMat)).translateX(-w / 2));
  root.add(markCameraOccluder(wall(0.35, h, d, wallMat)).translateX(w / 2));
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

export function addEmberParticles(root, count = 70) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 18;
    pos[i * 3 + 1] = 0.25 + Math.random() * 2.2;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 14;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xff6622, size: 0.07, transparent: true, opacity: 0.55 })
  );
  pts.userData.drift = true;
  pts.userData.ember = true;
  root.add(pts);
}

export function addFireflyParticles(root, count = 55) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = 0.5 + Math.random() * 2.5;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(
    geo,
    new THREE.PointsMaterial({ color: 0xaaffcc, size: 0.08, transparent: true, opacity: 0.65 })
  );
  pts.userData.drift = true;
  pts.userData.firefly = true;
  root.add(pts);
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

export function addTurntableOnDesk(root, x, y, z) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const plinth = wall(0.55, 0.08, 0.42, new THREE.MeshStandardMaterial({ color: 0x222228 }));
  plinth.position.y = 0.04;
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.018, 24),
    new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0x331133, emissiveIntensity: 0.2 })
  );
  disc.position.y = 0.1;
  disc.userData.spin = 1.2;
  const arm = wall(0.04, 0.04, 0.22, new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.6 }));
  arm.position.set(0.18, 0.12, 0);
  g.add(plinth, disc, arm);
  root.add(g);
}

export function addBeanbag(root, x, z) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x6a28a8, roughness: 0.88 });
  const bag = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), mat);
  bag.scale.set(1.1, 0.72, 1);
  bag.position.y = 0.28;
  g.add(bag);
  g.position.set(x, 0, z);
  root.add(g);
}

function buildLowPolyCar(color, emissive = 0x000000) {
  const g = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color, metalness: 0.55, roughness: 0.32, emissive, emissiveIntensity: emissive ? 0.12 : 0 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x99bbdd, metalness: 0.15, roughness: 0.08, transparent: true, opacity: 0.72 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.92 });
  const body = wall(1.85, 0.44, 0.95, paint);
  body.position.y = 0.4;
  const cabin = wall(0.9, 0.4, 0.86, glass);
  cabin.position.set(-0.12, 0.76, 0);
  const bumper = wall(1.9, 0.12, 0.98, new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.7 }));
  bumper.position.y = 0.18;
  const wheelGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.15, 12);
  [[-0.58, 0.19, 0.4], [-0.58, 0.19, -0.4], [0.58, 0.19, 0.4], [0.58, 0.19, -0.4]].forEach(p => {
    const w = new THREE.Mesh(wheelGeo, tire);
    w.rotation.z = Math.PI / 2;
    w.position.set(...p);
    g.add(w);
  });
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 8, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffdd, emissive: 0xffffaa, emissiveIntensity: 1.3 })
  );
  head.position.set(0.95, 0.44, 0.3);
  const head2 = head.clone();
  head2.position.z = -0.3;
  g.add(body, cabin, bumper, head, head2);
  return g;
}

function addPedestrian(root, x, z, rotY, coatColor) {
  const g = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.75 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.8 });
  const legs = wall(0.14, 0.55, 0.14, new THREE.MeshStandardMaterial({ color: 0x222233 }));
  legs.position.set(0, 0.28, 0);
  const torso = wall(0.32, 0.5, 0.22, cloth);
  torso.position.y = 0.78;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), skin);
  head.position.y = 1.12;
  g.add(legs, torso, head);
  g.position.set(x, 0, z);
  g.rotation.y = rotY;
  g.userData.pedestrian = true;
  root.add(g);
}

function addTrafficLight(root, x, z) {
  const g = new THREE.Group();
  const pole = wall(0.1, 3.4, 0.1, new THREE.MeshStandardMaterial({ color: 0x333344, metalness: 0.6 }));
  pole.position.y = 1.7;
  const box = wall(0.28, 0.75, 0.22, new THREE.MeshStandardMaterial({ color: 0x1a1a22, metalness: 0.5 }));
  box.position.y = 3.15;
  const colors = [0xff2222, 0xffcc22, 0x22ff66];
  colors.forEach((c, i) => {
    const lens = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 8, 8),
      new THREE.MeshStandardMaterial({
        color: c, emissive: c, emissiveIntensity: i === 0 ? 1.4 : 0.25
      })
    );
    lens.position.set(0, 3.35 - i * 0.22, 0.12);
    g.add(lens);
  });
  g.add(pole, box);
  g.position.set(x, 0, z);
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
  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 16),
    new THREE.MeshStandardMaterial({ color: 0x2a2a32, roughness: 0.92 })
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set(0, 0.008, 1);
  root.add(asphalt);
  for (let i = -2; i <= 2; i++) {
    const h = 5 + Math.abs(i) * 1.2;
    const facade = wall(5, h, 0.4, new THREE.MeshStandardMaterial({
      color: 0x2a2838, emissive: 0x220044, emissiveIntensity: 0.25
    }));
    facade.position.set(i * 6, h / 2, -8.5);
    facade.userData.cameraOccluder = true;
    root.add(facade);
    const shop = wall(3.8, 1.35, 0.15, new THREE.MeshStandardMaterial({ color: 0x3a3548 }));
    shop.position.set(i * 6, 0.68, -8.2);
    root.add(shop);
    for (let w = 0; w < 3; w++) {
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(0.65, 0.85),
        new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffaa66, emissiveIntensity: 1.15 })
      );
      win.position.set(i * 6 + (w - 1) * 1.05, 0.95, -8.12);
      root.add(win);
    }
    for (let w = 0; w < 2; w++) {
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.55),
        new THREE.MeshStandardMaterial({ color: 0xaaccff, emissive: 0x6688ff, emissiveIntensity: 0.85 })
      );
      win.position.set(i * 6 + (w - 0.5) * 1.1, 2.2 + w * 0.9, -8.12);
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
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, emissive: 0xffffff, emissiveIntensity: 0.35 });
  for (let s = -4; s <= 4; s++) {
    const stripe = wall(0.35, 0.04, 0.12, stripeMat);
    stripe.position.set(s * 0.42, 0.025, 2.05);
    root.add(stripe);
  }
  const hydrant = wall(0.35, 0.55, 0.35, new THREE.MeshStandardMaterial({ color: 0xcc2222 }));
  hydrant.position.set(-3, 0.28, 1.5);
  root.add(hydrant);
  const benchSeat = wall(1.8, 0.08, 0.55, new THREE.MeshStandardMaterial({ color: 0x5a4030 }));
  benchSeat.position.set(4, 0.42, 2.2);
  const benchLegL = wall(0.08, 0.42, 0.5, benchSeat.material);
  benchLegL.position.set(3.2, 0.21, 2.2);
  const benchLegR = benchLegL.clone();
  benchLegR.position.x = 4.8;
  root.add(benchSeat, benchLegL, benchLegR);
  pushCollider(colliders, 4, 2.2, 0.9, 0.3);
  const can = wall(0.45, 0.75, 0.45, new THREE.MeshStandardMaterial({ color: 0x3a4a55, metalness: 0.55 }));
  can.position.set(-1.5, 0.38, 3.8);
  const canLid = wall(0.48, 0.06, 0.48, new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.65 }));
  canLid.position.set(-1.5, 0.78, 3.8);
  root.add(can, canLid);
  pushCollider(colliders, -1.5, 3.8, 0.28, 0.28);
  addTrafficLight(root, 2.2, 3.2);
  const carA = buildLowPolyCar(0x2244aa);
  carA.position.set(-5.5, 0, -0.8);
  carA.rotation.y = 0.35;
  root.add(carA);
  pushCollider(colliders, -5.5, -0.8, 1.1, 0.55);
  const carB = buildLowPolyCar(0xcc3333, 0x440000);
  carB.position.set(5, 0, 0.5);
  carB.rotation.y = -1.1;
  root.add(carB);
  pushCollider(colliders, 5, 0.5, 1.1, 0.55);
  addPedestrian(root, -2, -2.5, 0.6, 0x445588);
  addPedestrian(root, 1.2, -3.2, -0.4, 0x884455);
  addPedestrian(root, 6.5, 2, -1.2, 0x556644);
  addNeonTube(root, 0, 3.5, -6, 4, 0xff00ff);
}

export function addKitchenDressing(root, helpers) {
  const { wall, colliders, pushCollider } = helpers;
  const fridge = new THREE.Group();
  const fridgeBody = wall(0.85, 2.05, 0.72, new THREE.MeshStandardMaterial({ color: 0xe8ecef, metalness: 0.35, roughness: 0.4 }));
  fridgeBody.position.y = 1.02;
  const fridgeDoor = wall(0.82, 0.95, 0.04, new THREE.MeshStandardMaterial({ color: 0xd8dde2, metalness: 0.4 }));
  fridgeDoor.position.set(0, 1.55, 0.38);
  const freezer = wall(0.82, 0.55, 0.04, fridgeDoor.material);
  freezer.position.set(0, 0.72, 0.38);
  const handle = wall(0.06, 0.35, 0.05, new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.75 }));
  handle.position.set(0.32, 1.45, 0.42);
  const handle2 = handle.clone();
  handle2.position.y = 0.72;
  handle2.scale.y = 0.65;
  fridge.add(fridgeBody, fridgeDoor, freezer, handle, handle2);
  fridge.position.set(-5.2, 0, -3.8);
  root.add(fridge);
  pushCollider(colliders, -5.2, -3.8, 0.45, 0.38);
  const stove = wall(1.1, 0.9, 0.65, new THREE.MeshStandardMaterial({ color: 0x333338, metalness: 0.5 }));
  stove.position.set(2.5, 0.45, -4);
  root.add(stove);
  pushCollider(colliders, 2.5, -4, 0.55, 0.35);
  for (let b = 0; b < 4; b++) {
    const burner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.03, 12),
      new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.7 })
    );
    burner.position.set(2.15 + (b % 2) * 0.45, 0.92, -4.15 + Math.floor(b / 2) * 0.35);
    root.add(burner);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.012, 6, 16),
      new THREE.MeshStandardMaterial({ color: 0xff4422, emissive: 0xff2200, emissiveIntensity: b === 1 ? 0.9 : 0.35 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(burner.position);
    ring.position.y += 0.02;
    root.add(ring);
  }
  const hood = wall(1.2, 0.15, 0.7, new THREE.MeshStandardMaterial({ color: 0x888899 }));
  hood.position.set(2.5, 1.35, -4);
  root.add(hood);
  for (let c = 0; c < 3; c++) {
    const cab = wall(0.95, 0.55, 0.32, new THREE.MeshStandardMaterial({ color: 0x6a5040 }));
    cab.position.set(-5.5 + c * 1.05, 2.35, -4.55);
    root.add(cab);
    const cabDoor = wall(0.88, 0.48, 0.03, new THREE.MeshStandardMaterial({ color: 0x5a4030 }));
    cabDoor.position.set(cab.position.x, 2.32, -4.38);
    root.add(cabDoor);
  }
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
  const sinkUnit = new THREE.Group();
  const sinkCab = wall(1.2, 0.85, 0.55, new THREE.MeshStandardMaterial({ color: 0x5a4030 }));
  sinkCab.position.y = 0.42;
  const sinkBasin = wall(0.75, 0.22, 0.45, new THREE.MeshStandardMaterial({ color: 0x99aabb, metalness: 0.55 }));
  sinkBasin.position.set(0, 0.88, 0.05);
  const faucet = wall(0.06, 0.22, 0.06, new THREE.MeshStandardMaterial({ color: 0xbbbbcc, metalness: 0.85 }));
  faucet.position.set(0, 1.02, -0.12);
  const spout = wall(0.18, 0.04, 0.04, faucet.material);
  spout.position.set(0, 1.08, -0.02);
  sinkUnit.add(sinkCab, sinkBasin, faucet, spout);
  sinkUnit.position.set(-2.5, 0, -4.1);
  root.add(sinkUnit);
  const table = wall(2.2, 0.08, 1.2, new THREE.MeshStandardMaterial({ color: 0x3a2818 }));
  table.position.set(4.2, 0.75, 2.8);
  root.add(table);
  pushCollider(colliders, 4.2, 2.8, 1.1, 0.65, 0.35);
  for (let c = 0; c < 2; c++) {
    const chair = wall(0.45, 0.55, 0.45, new THREE.MeshStandardMaterial({ color: 0x4a3020 }));
    chair.position.set(3.5 + c * 0.85, 0.28, 3.5);
    root.add(chair);
    pushCollider(colliders, chair.position.x, 3.5, 0.22, 0.22);
  }
  const lamp = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.22, 8),
    new THREE.MeshStandardMaterial({ color: 0xffeecc, emissive: 0xffdd99, emissiveIntensity: 0.65 })
  );
  lamp.position.set(0, 2.85, -1.2);
  lamp.rotation.x = Math.PI;
  root.add(lamp);
  const kettle = new THREE.Group();
  const kettleBody = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xcc3333, metalness: 0.35, roughness: 0.4 })
  );
  kettleBody.scale.set(1, 0.85, 1);
  kettleBody.position.y = 0.14;
  const kettleSpout = wall(0.12, 0.04, 0.04, kettleBody.material);
  kettleSpout.position.set(0.12, 0.16, 0);
  kettle.add(kettleBody, kettleSpout);
  kettle.position.set(4.35, 0.8, 2.65);
  root.add(kettle);
  const pizza = wall(0.45, 0.05, 0.45, new THREE.MeshStandardMaterial({ color: 0xddaa44 }));
  pizza.position.set(3.85, 0.8, 2.95);
  root.add(pizza);
  for (let m = 0; m < 2; m++) {
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 0.12, 8),
      new THREE.MeshStandardMaterial({ color: m ? 0x3366aa : 0xaa3366 })
    );
    mug.position.set(4.55 + m * 0.18, 0.86, 2.75);
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
  const doorMat = new THREE.MeshStandardMaterial({
    color: 0x99aabb, metalness: 0.82, roughness: 0.28
  });
  const doorL = wall(1.15, 2.5, 0.06, doorMat);
  doorL.position.set(-0.58, 1.25, 4.12);
  doorL.userData.cameraOccluder = true;
  const doorR = doorL.clone();
  doorR.position.x = 0.58;
  doorR.userData.cameraOccluder = true;
  const seam = wall(0.04, 2.45, 0.02, new THREE.MeshStandardMaterial({ color: 0x222228 }));
  seam.position.set(0, 1.25, 4.14);
  seam.userData.cameraOccluder = true;
  const frame = wall(2.55, 2.65, 0.12, new THREE.MeshStandardMaterial({ color: 0x666677, metalness: 0.7 }));
  frame.position.set(0, 1.32, 4.08);
  frame.userData.cameraOccluder = true;
  root.add(doorL, doorR, seam, frame);
  pushCollider(colliders, 0, 4.15, 1.2, 0.06);
  const panel = wall(0.35, 0.9, 0.08, new THREE.MeshStandardMaterial({ color: 0x222228, metalness: 0.4 }));
  panel.position.set(3.8, 1.4, 3.5);
  root.add(panel);
  const panelGlow = wall(0.32, 0.82, 0.02, new THREE.MeshStandardMaterial({
    color: 0x112233, emissive: 0x003344, emissiveIntensity: 0.5
  }));
  panelGlow.position.set(3.8, 1.4, 3.46);
  root.add(panelGlow);
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
  const railPostL = wall(0.06, 0.9, 0.06, rail.material);
  railPostL.position.set(-1.35, 0.55, -3.8);
  const railPostR = railPostL.clone();
  railPostR.position.x = 1.35;
  root.add(rail, railPostL, railPostR);
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

export function addToiletDressing(root, helpers) {
  const { wall, neonSign, texLoader, colliders, pushCollider, addPoster } = helpers;
  const tileMat = new THREE.MeshStandardMaterial({ color: 0x8899aa, roughness: 0.35, metalness: 0.08 });
  const groutMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.5 });
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 5; col++) {
      const tile = wall(0.38, 0.38, 0.02, row % 2 === col % 2 ? tileMat : groutMat);
      tile.position.set(-4 + col * 0.82, 1.15 + row * 0.4, -3.88);
      root.add(tile);
    }
  }
  const stallMat = new THREE.MeshStandardMaterial({ color: 0x3a4858, roughness: 0.75 });
  const stallDoorMat = new THREE.MeshStandardMaterial({ color: 0x4a5868, roughness: 0.65 });
  [-2.8, 0.8].forEach((sx, i) => {
    const partition = wall(0.08, 2.1, 1.35, stallMat);
    partition.position.set(sx, 1.05, 1.2);
    root.add(partition);
    const door = wall(0.06, 1.85, 0.65, stallDoorMat);
    door.position.set(sx + 0.55, 0.92, 1.85);
    door.rotation.y = i ? -0.35 : 0.35;
    root.add(door);
    pushCollider(colliders, sx + 0.2, 1.35, 0.55, 0.75);
  });
  const bowl = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.26, 0.38, 16),
    new THREE.MeshStandardMaterial({ color: 0xe8ecef, metalness: 0.15, roughness: 0.35 })
  );
  base.position.y = 0.19;
  const seat = new THREE.Mesh(
    new THREE.TorusGeometry(0.2, 0.045, 10, 20),
    new THREE.MeshStandardMaterial({ color: 0xdde2e8 })
  );
  seat.rotation.x = Math.PI / 2;
  seat.position.y = 0.38;
  const lid = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.04, 0.48),
    new THREE.MeshStandardMaterial({ color: 0xccd4dc })
  );
  lid.position.set(0, 0.52, -0.08);
  lid.rotation.x = -0.55;
  const tank = wall(0.42, 0.55, 0.16, new THREE.MeshStandardMaterial({ color: 0xc8d0d8 }));
  tank.position.set(0, 0.72, -0.42);
  const flush = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.08, 0.03),
    new THREE.MeshStandardMaterial({ color: 0x99aabb, metalness: 0.5 })
  );
  flush.position.set(0, 0.95, -0.48);
  bowl.add(base, seat, lid, tank, flush);
  bowl.position.set(2.4, 0, 1.6);
  root.add(bowl);
  pushCollider(colliders, 2.4, 1.6, 0.35, 0.45);
  const sinkGroup = new THREE.Group();
  const sinkBasin = wall(0.85, 0.18, 0.5, new THREE.MeshStandardMaterial({ color: 0x99aabb, metalness: 0.55 }));
  sinkBasin.position.y = 0.92;
  const sinkPed = wall(0.7, 0.82, 0.45, new THREE.MeshStandardMaterial({ color: 0x5a6878 }));
  sinkPed.position.y = 0.41;
  const tap = wall(0.05, 0.2, 0.05, new THREE.MeshStandardMaterial({ color: 0xbbbbcc, metalness: 0.85 }));
  tap.position.set(0, 1.05, -0.15);
  sinkGroup.add(sinkPed, sinkBasin, tap);
  sinkGroup.position.set(-3.2, 0, -2.8);
  root.add(sinkGroup);
  pushCollider(colliders, -3.2, -2.8, 0.45, 0.32);
  const mirror = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 1.35),
    new THREE.MeshStandardMaterial({ color: 0xaaccdd, metalness: 0.92, roughness: 0.08 })
  );
  mirror.position.set(-3.2, 1.75, -3.82);
  root.add(mirror);
  const mirrorFrame = wall(1.2, 1.45, 0.05, new THREE.MeshStandardMaterial({ color: 0x334455 }));
  mirrorFrame.position.set(-3.2, 1.75, -3.86);
  root.add(mirrorFrame);
  const dryer = new THREE.Group();
  const dryerBody = wall(0.35, 0.55, 0.22, new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.4 }));
  dryerBody.position.y = 1.35;
  const nozzle = wall(0.28, 0.08, 0.14, dryerBody.material);
  nozzle.position.set(0, 1.05, 0.08);
  dryer.add(dryerBody, nozzle);
  dryer.position.set(3.6, 0, -2.5);
  root.add(dryer);
  const tp = new THREE.Group();
  const roll = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.22, 12),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f0 })
  );
  roll.rotation.z = Math.PI / 2;
  roll.position.y = 0.85;
  const holder = wall(0.12, 0.04, 0.28, new THREE.MeshStandardMaterial({ color: 0x888899, metalness: 0.7 }));
  holder.position.y = 0.85;
  tp.add(roll, holder);
  tp.position.set(1.8, 0, -3.5);
  root.add(tp);
  const ceilPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 5),
    new THREE.MeshStandardMaterial({ color: 0xffffee, emissive: 0xffffcc, emissiveIntensity: 0.45 })
  );
  ceilPanel.rotation.x = Math.PI / 2;
  ceilPanel.position.y = 2.92;
  ceilPanel.userData.neonFlicker = true;
  ceilPanel.userData.pulse = 1.1;
  root.add(ceilPanel);
  const graffitiColors = [0xff00ff, 0x00ffff, 0xffcc00, 0xff4466];
  ["SKULL", "13", "PUNK"].forEach((txt, i) => {
    const c = document.createElement("canvas");
    c.width = 128;
    c.height = 64;
    const g = c.getContext("2d");
    g.font = "bold 36px system-ui";
    g.fillStyle = "#" + graffitiColors[i].toString(16).padStart(6, "0");
    g.fillText(txt, 8, 44);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const graff = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.45),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, emissive: graffitiColors[i], emissiveIntensity: 0.35 })
    );
    graff.position.set(-1.2 + i * 1.1, 1.35 + (i % 2) * 0.4, 3.88);
    graff.rotation.y = Math.PI;
    root.add(graff);
  });
  addPoster(texLoader, root, "imagine_images/ocVdL.jpg", 2.2, 1.6, 4.85, 1.5, 0.2, -Math.PI / 2);
  const spooky = neonSign("SPOOKY WC", 0xff66cc);
  spooky.position.set(0, 2.35, -3.75);
  root.add(spooky);
  addNeonTube(root, 3.8, 2.1, 2.5, 1.2, 0x00ffcc);
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
    if (o.userData?.neonFlicker && o.material?.emissiveIntensity !== undefined) {
      const flick = 0.55 + 0.45 * Math.sin(t * 11 + Math.sin(t * 2.7) * 1.8);
      o.material.emissiveIntensity = (o.userData.pulse || 1.8) * flick;
      return;
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
