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
    new THREE.SphereGeometry(0.22, 10, 10),
    new THREE.MeshStandardMaterial({ color: 0xff7722, emissive: 0xff4400, emissiveIntensity: 0.35 })
  );
  body.position.y = 0.22;
  body.userData.pulse = 1.2;
  g.add(body);
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
