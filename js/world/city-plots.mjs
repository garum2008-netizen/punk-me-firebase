import * as THREE from "three";
import { CITY_PLOT_DEFS } from "../build/build-layer.mjs";

function mat(color, emi = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: emi || color,
    emissiveIntensity: emi ? 0.5 : 0,
    roughness: 0.75
  });
}

function box(w, h, d, m) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
}

function buildShop() {
  const g = new THREE.Group();
  const base = box(2.4, 1.75, 2.2, mat(0x3a2848));
  base.position.y = 0.88;
  const awning = box(2.6, 0.12, 1.1, mat(0xff3399, 0xff0066));
  awning.position.set(0, 1.95, 1.15);
  awning.rotation.x = -0.22;
  const sign = box(2.1, 0.42, 0.12, mat(0x00ffff, 0x00ffff));
  sign.position.set(0, 2.35, 1.08);
  const windowL = box(0.55, 0.65, 0.08, mat(0x88ccff, 0x4488ff));
  windowL.position.set(-0.65, 1.05, 1.12);
  const windowR = windowL.clone();
  windowR.position.x = 0.65;
  const door = box(0.75, 1.35, 0.1, mat(0xff00aa, 0xaa0066));
  door.position.set(0, 0.72, 1.12);
  g.add(base, awning, sign, windowL, windowR, door);
  return g;
}

function buildClub() {
  const g = new THREE.Group();
  const base = box(3, 2.2, 2.5, mat(0x222238));
  base.position.y = 1.1;
  const door = box(0.9, 1.4, 0.12, mat(0xff3399, 0xff0066));
  door.position.set(0, 0.7, 1.28);
  const amp = box(0.5, 0.9, 0.4, mat(0x111118));
  amp.position.set(-1.1, 0.45, 1.1);
  g.add(base, door, amp);
  return g;
}

function buildGarage() {
  const g = new THREE.Group();
  const base = box(2.8, 1.8, 3, mat(0x404050));
  base.position.y = 0.9;
  const door = box(2.2, 1.2, 0.08, mat(0x888899));
  door.position.set(0, 0.6, 1.52);
  g.add(base, door);
  return g;
}

function builtMesh(type) {
  if (type === "shop") return buildShop();
  if (type === "club") return buildClub();
  return buildGarage();
}

export function refreshCityPlots(root, me) {
  if (!root) return;
  const old = root.getObjectByName("cityPlots");
  if (old) old.removeFromParent();
  const group = new THREE.Group();
  group.name = "cityPlots";
  const plots = me?.cityPlots?.length ? me.cityPlots : CITY_PLOT_DEFS.map(d => ({ ...d, built: false }));
  plots.forEach(p => {
    const marker = new THREE.Group();
    marker.position.set(p.x ?? 0, 0, p.z ?? 0);
    if (p.built) {
      marker.add(builtMesh(p.type || "shop"));
    } else {
      const pad = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 2.2),
        new THREE.MeshStandardMaterial({ color: 0x334455, transparent: true, opacity: 0.55 })
      );
      pad.rotation.x = -Math.PI / 2;
      pad.position.y = 0.02;
      const post = box(0.08, 1.2, 0.08, mat(0xffcc00, 0xffaa00));
      post.position.y = 0.6;
      marker.add(pad, post);
      marker.userData.cityPlotId = p.id;
      marker.userData.plotCost = p.cost;
    }
    group.add(marker);
  });
  root.add(group);
}
