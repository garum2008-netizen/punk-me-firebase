import * as THREE from "three";
import { gameToWorldLoc } from "./locations.mjs";

const BUILD_COLORS = {
  crypt: 0x8b6cff,
  neon_sign: 0xff66ff,
  shack: 0xaa8866,
  poster: 0x44ffcc
};

export function createCityBuilds3DGroup() {
  const g = new THREE.Group();
  g.name = "city_builds_3d";
  return g;
}

function meshForType(type) {
  const col = BUILD_COLORS[type] || 0x7788aa;
  const mat = new THREE.MeshStandardMaterial({
    color: col,
    emissive: col,
    emissiveIntensity: 0.35,
    roughness: 0.55,
    metalness: 0.15
  });
  if (type === "crypt") {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.4, 0.9), mat);
    m.position.y = 0.7;
    return m;
  }
  if (type === "neon_sign") {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.9, 0.12), mat);
    m.position.y = 1.05;
    return m;
  }
  const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.85, 1), mat);
  m.position.y = 0.42;
  return m;
}

export function syncCityBuilds3D(group, bounds, builds) {
  if (!group) return;
  while (group.children.length) {
    const c = group.children[0];
    group.remove(c);
    c.traverse?.(o => {
      if (o.isMesh) {
        o.geometry?.dispose?.();
        o.material?.dispose?.();
      }
    });
  }
  if (!bounds || !Array.isArray(builds)) return;
  for (const b of builds) {
    if (b.x == null || b.y == null) continue;
    const w = gameToWorldLoc(b.x, b.y, bounds);
    const piece = new THREE.Group();
    piece.add(meshForType(b.type || "crypt"));
    piece.position.set(w.x, 0, w.z);
    piece.userData.buildType = b.type;
    group.add(piece);
  }
}

export function addDistrictBoundaryWalls(root, spanX = 18, spanZ = 16) {
  if (!root) return;
  const h = 5.5;
  const t = 0.55;
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a1428,
    emissive: 0x220044,
    emissiveIntensity: 0.08,
    roughness: 0.9
  });
  const halfX = spanX / 2;
  const halfZ = spanZ / 2;
  const walls = [
    [spanX + t, h, t, 0, h * 0.5, -halfZ - t / 2],
    [spanX + t, h, t, 0, h * 0.5, halfZ + t / 2],
    [t, h, spanZ + t, -halfX - t / 2, h * 0.5, 0],
    [t, h, spanZ + t, halfX + t / 2, h * 0.5, 0]
  ];
  const g = new THREE.Group();
  g.name = "district_boundary_walls";
  walls.forEach(([w, hh, d, x, y, z]) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat);
    m.position.set(x, y, z);
    m.userData.cameraOccluder = true;
    g.add(m);
  });
  root.add(g);
}

export function addDistrictGroundMarkers(root, spanX = 18, spanZ = 16) {
  if (!root) return;
  const prev = root.getObjectByName("district_ground_markers");
  if (prev) prev.removeFromParent();
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(spanX, spanZ),
    new THREE.MeshStandardMaterial({
      color: 0x2a3048,
      emissive: 0x223355,
      emissiveIntensity: 0.45,
      roughness: 0.72,
      metalness: 0.08,
      side: THREE.DoubleSide
    })
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.y = 0.02;
  plate.name = "district_ground_markers";
  plate.receiveShadow = true;
  root.add(plate);
  const grid = new THREE.GridHelper(spanX, 14, 0x00ffff, 0x442266);
  grid.position.y = 0.03;
  grid.name = "district_grid";
  root.add(grid);
  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.55, 2.8, 10),
    new THREE.MeshStandardMaterial({ color: 0xff66ff, emissive: 0xff00aa, emissiveIntensity: 1.1 })
  );
  beacon.position.set(0, 1.4, 0);
  beacon.name = "district_spawn_beacon";
  root.add(beacon);
  addDistrictBoundaryWalls(root, spanX, spanZ);
}