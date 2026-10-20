import * as THREE from "three";

/** @typedef {{ minX:number, maxX:number, minZ:number, maxZ:number }} Bounds */
/** @typedef {{ to:string, labelKey:string, x:number, z:number, r:number }} Portal */

export const LOCATION_BOUNDS = {
  room: { minX: -7, maxX: 7, minZ: -6, maxZ: 6 },
  street: { minX: -12, maxX: 12, minZ: -10, maxZ: 10 },
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

function wall(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

function poster(tex, w, h) {
  const m = new THREE.MeshStandardMaterial({
    map: tex,
    emissive: 0x220033,
    emissiveIntensity: 0.15,
    roughness: 0.85
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
}

function neonSign(text, color = 0xff00ff) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(0,0,0,0.65)";
  g.fillRect(0, 0, 512, 128);
  g.font = "bold 56px system-ui";
  g.fillStyle = "#0ff";
  g.shadowColor = "#f0f";
  g.shadowBlur = 18;
  g.textAlign = "center";
  g.fillText(text, 256, 78);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.8),
    new THREE.MeshBasicMaterial({ map: t, transparent: true, side: THREE.DoubleSide })
  );
  mesh.userData.neon = color;
  return mesh;
}

function portalMesh(label) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.08, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.8, metalness: 0.3 })
  );
  ring.rotation.x = Math.PI / 2;
  const sign = neonSign(label, 0x00ffff);
  sign.position.y = 1.6;
  sign.scale.set(0.55, 0.55, 1);
  const g = new THREE.Group();
  g.add(ring);
  g.add(sign);
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
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a1028, roughness: 0.92, metalness: 0.05 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x120a1c, roughness: 0.88, metalness: 0.08 });

  if (locId === "room") {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 12), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    root.add(floor);

    root.add(wall(14, 3.2, 0.25, wallMat).translateZ(-6));
    root.add(wall(0.25, 3.2, 12, wallMat).translateX(-7));
    root.add(wall(0.25, 3.2, 12, wallMat).translateX(7));

    const roomTex = texLoader.load("imagine_images/q4BXV.jpg");
    roomTex.colorSpace = THREE.SRGBColorSpace;
    const p1 = poster(roomTex, 3.5, 2.2);
    p1.position.set(0, 1.8, -5.88);
    root.add(p1);

    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 1.6), new THREE.MeshStandardMaterial({ color: 0x2a1840 }));
    bed.position.set(-3, 0.25, 2);
    root.add(bed);
    const amp = new THREE.PointLight(0xff66ff, 2.2, 8);
    amp.position.set(-2, 2.5, 1);
    root.add(amp);
    const sign = neonSign("PUNK ME");
    sign.position.set(3.5, 2.4, -5.7);
    root.add(sign);
  } else if (locId === "street") {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 22), new THREE.MeshStandardMaterial({ color: 0x0c0814, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    root.add(floor);

    for (let i = -2; i <= 2; i++) {
      const b = wall(4, 5 + Math.random() * 2, 3, wallMat);
      b.position.set(i * 5.5, 2.5, -8);
      root.add(b);
      const win = new THREE.PointLight(0xff00ff, 0.6, 6);
      win.position.set(i * 5.5, 3.5, -7);
      root.add(win);
    }

    const streetTex = texLoader.load("imagine_images/77Mdp.jpg");
    streetTex.colorSpace = THREE.SRGBColorSpace;
    const mural = poster(streetTex, 8, 4);
    mural.position.set(0, 3, -9.9);
    root.add(mural);

    const punkSign = neonSign("PUNK ME");
    punkSign.position.set(6, 4.2, -6);
    punkSign.rotation.y = -0.35;
    root.add(punkSign);

    const shopSign = neonSign("NEON SHOP");
    shopSign.position.set(-6, 3.8, -5.5);
    shopSign.rotation.y = 0.4;
    root.add(shopSign);

    const streetLamp = new THREE.PointLight(0x00ffff, 1.8, 14);
    streetLamp.position.set(0, 4, 0);
    root.add(streetLamp);
  } else {
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), floorMat);
    floor.rotation.x = -Math.PI / 2;
    root.add(floor);
    root.add(wall(16, 4, 0.3, wallMat).translateZ(-8));
    const sign = neonSign("PUNK ME — " + locId.toUpperCase());
    sign.position.set(0, 2.5, -7.5);
    root.add(sign);
  }

  const portals = new THREE.Group();
  (PORTALS[locId] || []).forEach(p => {
    const label = (typeof window !== "undefined" && window.doorT)
      ? window.doorT(p.labelKey)
      : p.labelKey;
    const g = portalMesh(label);
    g.position.set(p.x, 0.05, p.z);
    g.userData.portal = p;
    portals.add(g);
  });
  root.add(portals);

  return { root, bounds, floor: root.children.find(c => c.isMesh && c.geometry?.type === "PlaneGeometry"), portals };
}
