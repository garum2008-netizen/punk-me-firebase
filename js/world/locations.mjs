import * as THREE from "three";
import {
  addSkyDome,
  addRoomShell,
  addPoster,
  addNeonTube,
  addPumpkin,
  addFloatingGhost,
  addHangingChain,
  addDustParticles,
  addEmberParticles,
  addFireflyParticles,
  addSteamPuff,
  addSofa,
  addAmpStack,
  addBats,
  addTvFlicker,
  addTurntableOnDesk,
  addBeanbag,
  addRoofDressing,
  addParkourDressing,
  addCemeteryDressing,
  addCityDressing,
  addKitchenDressing,
  addElevatorDressing,
  addToiletDressing
} from "./location-enrich.mjs";
import { addV21Clutter } from "./location-clutter-v21.mjs";
import { addShowcaseProps } from "./location-showcase-props.mjs";
import { buildHangoutVisual } from "./construction-hangout.mjs";

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
  toilet: { minX: -5, maxX: 5, minZ: -4, maxZ: 4 },
  elevator: { minX: -1.45, maxX: 1.45, minZ: -1.45, maxZ: 1.45 },
  roof: { minX: -10, maxX: 10, minZ: -8, maxZ: 8 },
  street: { minX: -12, maxX: 12, minZ: -10, maxZ: 10 },
  cemetery: { minX: -11, maxX: 11, minZ: -9, maxZ: 9 },
  city: { minX: -10, maxX: 10, minZ: -9, maxZ: 9 },
  parkour: { minX: -8, maxX: 8, minZ: -10, maxZ: 10 },
  construction: { minX: -11, maxX: 11, minZ: -10, maxZ: 10 },
  default: { minX: -8, maxX: 8, minZ: -8, maxZ: 8 }
};

export const NPC_WORLD = {
  room: {
    vienna: { x: -2.2, z: 1.2 },
    mohawk: { x: 3.5, z: -1.5 },
    cobalt: { x: 0.5, z: -2.2 }
  },
  street: {
    razor: { x: -4.6, z: -3.4 },
    mohawk: { x: -2, z: 2.5 },
    vienna: { x: 2, z: 1.5 },
    cobalt: { x: -0.5, z: -1.5 },
    ghost: { x: 5, z: 3 }
  },
  roof: {
    mohawk: { x: -1.5, z: 2 }
  },
  cemetery: {
    gravedigger: { x: 0, z: 2 },
    cobalt: { x: -4, z: -1 }
  },
  kitchen: {
    zoya: { x: -2.5, z: 1.5 }
  },
  toilet: {
    plukh: { x: 0, z: -1.2 }
  },
  city: {
    tony: { x: -4.5, z: 3.2 },
    bolt: { x: 5.2, z: -2.8 }
  },
  construction: {
    foreman: { x: -3.5, z: 1.5 },
    vintik: { x: 3.8, z: 2.2 }
  }
};

/** Short in-place patrol loops (world XZ). */
/** Quest NPC holds at anchor and faces player when within range (world units). */
export const NPC_QUEST_GREET = {
  street: {
    razor: { anchor: { x: -4.6, z: -3.4 }, range: 6.5 }
  }
};

export const NPC_PATROL = {
  room: {
    vienna: [
      { x: -2.2, z: 1.2 },
      { x: -0.5, z: 2.5 },
      { x: 1, z: 0.8 },
      { x: -2.2, z: 1.2 }
    ],
    mohawk: [
      { x: 3.5, z: -1.5 },
      { x: 1.2, z: 2.8 },
      { x: -1.5, z: 0.5 },
      { x: 3.5, z: -1.5 }
    ],
    cobalt: [
      { x: 0.5, z: -2.2 },
      { x: 2.2, z: 0.5 },
      { x: -1, z: 1.5 },
      { x: 0.5, z: -2.2 }
    ]
  },
  street: {
    razor: [
      { x: -4.6, z: -3.4 },
      { x: -3.9, z: -2.6 },
      { x: -5.3, z: -2.4 },
      { x: -4.6, z: -3.4 }
    ],
    cobalt: [
      { x: -0.5, z: -1.5 },
      { x: 2.5, z: 0 },
      { x: 1, z: 2.5 },
      { x: -2, z: 1 },
      { x: -0.5, z: -1.5 }
    ],
    mohawk: [
      { x: -2, z: 2.5 },
      { x: 1.5, z: 0.5 },
      { x: 4, z: 3 },
      { x: 0, z: -1.5 },
      { x: -2, z: 2.5 }
    ]
  },
  cemetery: {
    cobalt: [
      { x: -4, z: -1 },
      { x: -1, z: 2 },
      { x: 3, z: 0 },
      { x: 0, z: -3 },
      { x: -4, z: -1 }
    ]
  },
  roof: {
    mohawk: [
      { x: -1.5, z: 2 },
      { x: 4, z: 1 },
      { x: 2, z: -3 },
      { x: -3, z: -1 },
      { x: -1.5, z: 2 }
    ]
  }
};

export const PORTALS = {
  elevator: [
    { to: "room", labelKey: "door_room", x: 0, z: 1.15, r: 1.1 },
    { to: "roof", labelKey: "door_roof", x: -0.85, z: -0.45, r: 1.05 },
    { to: "street", labelKey: "door_street", x: 0.85, z: -0.45, r: 1.05 }
  ],
  roof: [{ to: "elevator", labelKey: "door_elevator", x: 0, z: 6.5, r: 1.4 }],
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
  ],
  city: [
    { to: "street", labelKey: "door_street", x: -8, z: 7, r: 1.5 },
    { to: "construction", labelKey: "door_construction", x: 8, z: -6, r: 1.5 }
  ],
  construction: [{ to: "city", labelKey: "door_city", x: 0, z: 8.5, r: 1.5 }]
};

export const LOCATION_THEME = {
  room: { bg: 0x2a1838, fog: 0x221530, fogD: 0.0055, hemi: 0xffaaff, ground: 0x3a2850 },
  kitchen: { bg: 0x382018, fog: 0x2a140c, fogD: 0.005, hemi: 0xffcc88, ground: 0x4a3420 },
  roof: { bg: 0x1a2848, fog: 0x142038, fogD: 0.0045, hemi: 0xaaccff, ground: 0x2a3448 },
  street: { bg: 0x1a1028, fog: 0x140c20, fogD: 0.0082, hemi: 0xff88ff, ground: 0x282038 },
  cemetery: { bg: 0x142018, fog: 0x101818, fogD: 0.0105, hemi: 0x99ffbb, ground: 0x243028 },
  toilet: { bg: 0x182838, fog: 0x121828, fogD: 0.0055, hemi: 0x99ccff, ground: 0x2a3040 },
  elevator: { bg: 0x2a2a38, fog: 0x2a2a38, fogD: 0.11, hemi: 0xccccff, ground: 0x3a3a48 },
  city: { bg: 0x221028, fog: 0x1a0c18, fogD: 0.0055, hemi: 0xff99cc, ground: 0x2a2030 },
  parkour: { bg: 0x182040, fog: 0x121830, fogD: 0.0045, hemi: 0x99ddff, ground: 0x2a3850 },
  construction: { bg: 0x281818, fog: 0x201010, fogD: 0.006, hemi: 0xffaa88, ground: 0x3a3028 }
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

function neonSign(text, color = 0xff00ff, opts = {}) {
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
  const side = opts.frontSide ? THREE.FrontSide : THREE.DoubleSide;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(3.2, 0.8),
    new THREE.MeshStandardMaterial({
      map: t, emissive: color, emissiveIntensity: 1.2, transparent: true, side
    })
  );
}

function portalMesh(label, portalX = 0, portalZ = 0) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0x556677, metalness: 0.72, roughness: 0.38 });
  const neon = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 1.15 });
  const mat = new THREE.Mesh(
    new THREE.BoxGeometry(1.35, 0.04, 0.85),
    new THREE.MeshStandardMaterial({ color: 0x1a2030, emissive: 0x003344, emissiveIntensity: 0.35 })
  );
  mat.position.y = 0.02;
  const trim = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.06, 0.92), neon);
  trim.position.y = 0.05;
  const frameL = wall(0.1, 2.15, 0.12, metal);
  frameL.position.set(-0.62, 1.08, 0);
  const frameR = frameL.clone();
  frameR.position.x = 0.62;
  const lintel = wall(1.34, 0.1, 0.12, metal);
  lintel.position.set(0, 2.18, 0);
  const lamp = new THREE.Group();
  lamp.position.set(0.95, 0, 0.35);
  const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.05, 12), metal);
  lampBase.position.y = 0.025;
  const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.05, 8), metal);
  lampPole.position.y = 0.55;
  const lampRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.18, 0.025, 8, 20),
    new THREE.MeshStandardMaterial({ color: 0xff66ff, emissive: 0xff66ff, emissiveIntensity: 1.25 })
  );
  lampRing.rotation.x = Math.PI / 2;
  lampRing.position.y = 1.08;
  lamp.add(lampBase, lampPole, lampRing);
  const sign = neonSign(label, 0x00ffff, { frontSide: true });
  sign.position.y = 1.65;
  sign.scale.set(0.45, 0.45, 1);
  sign.rotation.y = Math.atan2(-portalX, -portalZ);
  g.add(mat, trim, frameL, frameR, lintel, lamp, sign);
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
    new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.78, metalness: 0.04,
      emissive: new THREE.Color(color).multiplyScalar(0.08), emissiveIntensity: 0.85
    })
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
  tail.userData.wag = 0.6 + Math.random() * 0.3;
  g.add(body, head, tail);
  g.position.set(x, 0, z);
  g.userData.cat = true;
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
  const interiorCab = locId === "elevator" || locId === "toilet" || locId === "kitchen";
  if (!interiorCab) addSkyDome(root, theme);

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
    p1.userData.flap = true;
    p1.userData.flapBase = 0;
    root.add(p1);
    addDustParticles(root, 60);
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
    addSofa(root, -1, 3.2, colliders);
    addBeanbag(root, -2.8, 4.2);
    addNeonTube(root, -4, 2.8, -5.5, 2.5, 0xff00ff);
    addNeonTube(root, 4, 2.5, -5.5, 2, 0x00ffff);
    addPumpkin(root, 4.5, 2.5, colliders);
    addFloatingGhost(root);
    addTvFlicker(root, -3.8, 1.1, -5.5);
    addTurntableOnDesk(root, 3.2, 0.76, -1);
    props.cats.push(buildCat(-2, -2, 0x5533aa));
    addLights(root, [
      { type: "point", color: 0xff66ff, intensity: 4.2, x: -2, y: 2.8, z: 1 },
      { type: "point", color: 0x00ffff, intensity: 3.4, x: 3, y: 2.5, z: -2 },
      { type: "point", color: 0xffeeff, intensity: 3.8, x: 0, y: 3.2, z: 0 }
    ]);
  } else if (locId === "kitchen") {
    floor = tiledFloor(12, 10, theme.ground, true);
    root.add(floor);
    root.add(wall(12, 3.2, 0.3, wallMat).translateZ(-5));
    root.add(wall(0.3, 3.2, 10, wallMat).translateX(-6));
    root.add(wall(0.3, 3.2, 10, wallMat).translateX(6));
    const kp = neonSign("PUNK ME", 0xff3399);
    kp.scale.set(0.85, 1.1, 1);
    kp.position.set(0, 2.15, -4.85);
    root.add(kp);
    const sign = neonSign("KITCHEN", 0xff8800);
    sign.position.set(-4, 2.4, -4.7);
    root.add(sign);
    const counter = wall(8, 0.9, 0.55, new THREE.MeshStandardMaterial({ color: 0x5a4030 }));
    counter.position.set(0, 0.45, -4.15);
    root.add(counter);
    pushCollider(colliders, 0, -4.15, 4, 0.32);
    props.cats.push(buildCat(3, 2, 0x222233));
    addKitchenDressing(root, { wall, colliders, pushCollider });
    addPoster(texLoader, root, "imagine_images/kwt1b.jpg", 2.8, 1.6, 0, 1.55, -4.88);
    addPoster(texLoader, root, "imagine_images/77Mdp.jpg", 2.2, 1.4, -3.2, 1.35, -4.88);
    addPoster(texLoader, root, "imagine_images/q4BXV.jpg", 2.0, 1.45, 5.88, 1.42, 0.35, -Math.PI / 2);
    addPoster(texLoader, root, "imagine_images/kwt1b.jpg", 1.8, 1.35, -5.88, 1.38, -0.85, Math.PI / 2);
    addNeonTube(root, -3.5, 2.5, -4.55, 2.2, 0xff00ff);
    addNeonTube(root, 5.72, 2.25, 0.2, 2.4, 0xff8844);
    addNeonTube(root, -5.72, 2.15, 1.4, 1.6, 0x00ffff);
    addSteamPuff(root, 0, -4.05);
    addLights(root, [
      { type: "point", color: 0xffcc88, intensity: 5.2, x: 0, y: 2.65, z: -2.2 },
      { type: "point", color: 0xffaa66, intensity: 4.4, x: 1.2, y: 2.35, z: 0.6 },
      { type: "point", color: 0xff8866, intensity: 3.6, x: -2.5, y: 2.2, z: -3.5 },
      { type: "point", color: 0xffeecc, intensity: 2.8, x: 3.5, y: 2.4, z: 1.5 },
      { type: "point", color: 0xff6622, intensity: 2.2, x: 0, y: 1.35, z: -4.0 }
    ]);
  } else if (locId === "roof") {
    floor = tiledFloor(20, 16, theme.ground, false);
    root.add(floor);
    const railMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.55 });
    [-9, 9].forEach(x => {
      root.add(wall(0.08, 1.1, 16, railMat).translateX(x).translateY(0.55));
    });
    [-7, 7].forEach(z => {
      root.add(wall(18, 1.1, 0.08, railMat).translateZ(z).translateY(0.55));
    });
    addRoofDressing(root, { wall, neonSign, addNeonTube, texLoader, colliders, pushCollider, addPoster });
    addBats(root, 5);
    const sign = neonSign("ROOFTOP", 0x88ccff);
    sign.position.set(0, 2.2, -2);
    root.add(sign);
    addLights(root, [
      { type: "point", color: 0xaaccff, intensity: 4.5, x: 0, y: 4.5, z: 2 },
      { type: "point", color: 0xff00ff, intensity: 3.2, x: -5, y: 3.5, z: -4 },
      { type: "point", color: 0xffffcc, intensity: 2.8, x: 6, y: 5, z: -8, dist: 18 }
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
    const punkSign = neonSign("PUNK ME", 0xff00ff);
    punkSign.position.set(6, 4.5, -6);
    punkSign.userData.neonFlicker = true;
    punkSign.userData.pulse = 1.9;
    root.add(punkSign);
    const shopSign = neonSign("NEON SHOP", 0x00ffff);
    shopSign.position.set(-5.8, 4, -5.2);
    shopSign.userData.neonFlicker = true;
    shopSign.userData.pulse = 2.1;
    root.add(shopSign);
    addHangingChain(root, -5.6, 3.85, -4.2);
    addHangingChain(root, -6.8, 3.7, -3.2);
    addHangingChain(root, 7, 3.4, 1.5);
    addDustParticles(root, 120);
    addEmberParticles(root, 90);
    props.showCar = true;
    props.cats.push(buildCat(-3, 3, 0x111122), buildCat(4, -2, 0x442266));
    addLights(root, [
      { type: "point", color: 0xff66ff, intensity: 4.2, x: 0, y: 4.5, z: 0 },
      { type: "point", color: 0x00ffff, intensity: 3.4, x: -8, y: 3.5, z: 2 },
      { type: "point", color: 0xffaaff, intensity: 3, x: 5, y: 3, z: -3 }
    ]);
  } else if (locId === "cemetery") {
    floor = tiledFloor(22, 18, theme.ground, false);
    root.add(floor);
    addCemeteryDressing(root, { wall, neonSign, addPumpkin, colliders, pushCollider, texLoader, addPoster });
    addBats(root, 10);
    addFireflyParticles(root, 75);
    props.cats.push(buildCat(2, 4, 0x1a1a2a));
    addLights(root, [
      { type: "point", color: 0x66ff99, intensity: 3.8, x: 0, y: 3.5, z: 0 },
      { type: "point", color: 0xff00ff, intensity: 2.4, x: 6, y: 3, z: -5 },
      { type: "point", color: 0x88ffcc, intensity: 2.6, x: -5, y: 2.8, z: 3 }
    ]);
  } else if (locId === "toilet") {
    floor = tiledFloor(10, 8, theme.ground, true);
    root.add(floor);
    addRoomShell(root, 10, 8, 3, wallMat, colliders);
    addToiletDressing(root, {
      wall, neonSign, texLoader, colliders, pushCollider, addPoster
    });
    addLights(root, [
      { type: "point", color: 0x88ccff, intensity: 2.8, x: 0, y: 2.5, z: 0 },
      { type: "point", color: 0xff66cc, intensity: 1.6, x: 2.5, y: 2.2, z: 1.5 }
    ]);
  } else if (locId === "elevator") {
    const cabMat = new THREE.MeshStandardMaterial({ color: 0x3a3a48, metalness: 0.35, roughness: 0.55 });
    floor = tiledFloor(3, 3, 0x52525f, true);
    root.add(floor);
    const cabH = 2.5;
    const half = 1.5;
    root.add(wall(3, cabH, 0.12, cabMat).translateZ(-half));
    const sideL = wall(0.12, cabH, 3, cabMat);
    sideL.position.set(-half, cabH / 2, 0);
    root.add(sideL);
    const sideR = sideL.clone();
    sideR.position.x = half;
    root.add(sideR);
    const ceil = wall(3, 0.12, 3, cabMat);
    ceil.position.y = cabH;
    root.add(ceil);
    pushCollider(colliders, 0, -half, 1.45, 0.08);
    pushCollider(colliders, -half, 0, 0.08, 1.45);
    pushCollider(colliders, half, 0, 0.08, 1.45);
    addElevatorDressing(root, { wall, neonSign, colliders, pushCollider });
    addLights(root, [
      { type: "point", color: 0xffccaa, intensity: 2.6, x: 0, y: 2.15, z: 0.4 },
      { type: "point", color: 0xffffff, intensity: 1.8, x: 0, y: 2.28, z: -0.55 },
      { type: "point", color: 0xff66ff, intensity: 1.5, x: -1.05, y: 1.85, z: 0.1 },
      { type: "point", color: 0x00ffff, intensity: 1.35, x: 1.05, y: 1.65, z: 0.35 }
    ]);
  } else if (locId === "city") {
    floor = tiledFloor(20, 18, theme.ground, false);
    root.add(floor);
    addRoomShell(root, 20, 18, 4, wallMat, colliders);
    addCityDressing(root, { wall, neonSign, addNeonTube, colliders, pushCollider });
    addPoster(texLoader, root, "imagine_images/77Mdp.jpg", 8, 4, 0, 3, -8.9);
    addAmpStack(root, -5, 2, colliders);
    addAmpStack(root, 5, -1, colliders);
    const trash = wall(0.6, 0.9, 0.6, new THREE.MeshStandardMaterial({ color: 0x333344 }));
    trash.position.set(3, 0.45, 4);
    root.add(trash);
    pushCollider(colliders, 3, 4, 0.35, 0.35);
    root.add(neonSign("CITY", 0xff00ff).translateY(3).translateZ(-8.5));
    addLights(root, [
      { type: "point", color: 0xff66ff, intensity: 2.8, x: 0, y: 3.5, z: 0 },
      { type: "point", color: 0x00ffff, intensity: 2, x: -6, y: 2.5, z: 4 }
    ]);
  } else if (locId === "construction") {
    floor = tiledFloor(22, 20, theme.ground, false);
    root.add(floor);
    addRoomShell(root, 22, 20, 5, wallMat, colliders);
    root.add(neonSign("СТРОЙКА", 0xff8800).translateY(3.8).translateZ(-9.2));
    const crane = wall(0.5, 6, 0.5, new THREE.MeshStandardMaterial({ color: 0xffcc00 }));
    crane.position.set(-7, 3, -4);
    root.add(crane);
    pushCollider(colliders, -7, -4, 0.3, 0.3);
    const truck = wall(3.5, 1.4, 2, new THREE.MeshStandardMaterial({ color: 0x445566 }));
    truck.position.set(6, 0.7, 3);
    root.add(truck);
    pushCollider(colliders, 6, 3, 1.8, 1);
    const blueprint = wall(1.8, 0.05, 1.2, new THREE.MeshStandardMaterial({ color: 0xaaccff, emissive: 0x4488ff, emissiveIntensity: 0.3 }));
    blueprint.position.set(-1, 0.9, 2.5);
    blueprint.rotation.y = 0.4;
    root.add(blueprint);
    root.userData.hangoutStage = 0;
    buildHangoutVisual(0, root);
    addLights(root, [
      { type: "point", color: 0xffaa66, intensity: 4.5, x: 0, y: 4, z: 0 },
      { type: "point", color: 0xffffcc, intensity: 3.2, x: -6, y: 3, z: -3 }
    ]);
  } else if (locId === "parkour") {
    floor = tiledFloor(16, 22, theme.ground, false);
    root.add(floor);
    addParkourDressing(root, { wall, neonSign, colliders, pushCollider });
    addPoster(texLoader, root, "imagine_images/tvSdj.jpg", 6, 3, 0, 3.5, -10.5);
    addLights(root, [
      { type: "point", color: 0x88ccff, intensity: 4.5, x: 0, y: 4.5, z: -2 },
      { type: "point", color: 0xff66ff, intensity: 3.2, x: -4, y: 3, z: 2 },
      { type: "point", color: 0x00ffcc, intensity: 3, x: 4, y: 3.5, z: -6 }
    ]);
  } else {
    floor = tiledFloor(16, 16, theme.ground, true);
    root.add(floor);
    addRoomShell(root, 16, 16, 4, wallMat, colliders);
    root.add(neonSign("PUNK — " + locId.toUpperCase(), 0xff00ff).translateY(2.5).translateZ(-7.5));
    addLights(root, [{ type: "point", color: 0xff00ff, intensity: 2.5, x: 0, y: 3, z: 0 }]);
  }

  addV21Clutter(locId, root, texLoader, colliders, pushCollider);
  addShowcaseProps(locId, root);

  const portals = new THREE.Group();
  (PORTALS[locId] || []).forEach(p => {
    const label = (typeof window !== "undefined" && window.doorT)
      ? window.doorT(p.labelKey)
      : p.labelKey;
    const g = portalMesh(label, p.x, p.z);
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
          const push = (radius - d) * 0.82;
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
