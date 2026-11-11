import * as THREE from "three";

let markerRoot = null;
let beacon = null;
let arrow = null;
let npcBadge = null;
let targetNpcId = null;

export function ensureMarkerRoot(scene) {
  if (markerRoot) return markerRoot;
  markerRoot = new THREE.Group();
  markerRoot.name = "quest_markers";
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.62, 24),
    new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.22, 2.2, 12),
    new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.55 })
  );
  pillar.position.y = 1.1;
  beacon = new THREE.Group();
  beacon.add(ring, pillar);
  arrow = new THREE.Mesh(
    new THREE.ConeGeometry(0.28, 0.55, 8),
    new THREE.MeshBasicMaterial({ color: 0xffff66 })
  );
  arrow.rotation.x = Math.PI;
  arrow.position.y = 2.6;
  beacon.add(arrow);
  markerRoot.add(beacon);

  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const g = c.getContext("2d");
  g.font = "bold 48px system-ui";
  g.fillStyle = "#ffcc00";
  g.strokeStyle = "#000";
  g.lineWidth = 4;
  g.strokeText("!", 22, 48);
  g.fillText("!", 22, 48);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  npcBadge = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
  npcBadge.scale.set(0.68, 0.68, 1);
  npcBadge.position.y = 2.1;
  markerRoot.add(npcBadge);
  scene.add(markerRoot);
  return markerRoot;
}

export function setQuestMarkersVisible(visible) {
  if (markerRoot) markerRoot.visible = visible;
}

export function clearQuestMarkers(scene) {
  if (markerRoot && scene) scene.remove(markerRoot);
  markerRoot = null;
  beacon = null;
  arrow = null;
  npcBadge = null;
}

/** @param {{ wx?:number, wz?:number, npcId?:string }} target */
export function setQuestMarkerTarget(target, actors, t) {
  if (!markerRoot || !beacon) return;
  const bob = Math.sin(t * 3.2) * 0.12;
  beacon.visible = false;
  npcBadge.visible = false;
  if (target?.npcId && actors) {
    const a = actors.get(`npc_${target.npcId}`);
    if (a) {
      npcBadge.visible = true;
      npcBadge.position.set(a.group.position.x, 2.42 + bob, a.group.position.z);
      beacon.visible = true;
      beacon.position.set(a.group.position.x, bob * 0.5, a.group.position.z);
      return;
    }
  }
  if (target?.wx != null && target?.wz != null) {
    let wx = target.wx;
    let wz = target.wz;
    const pl = actors?.get?.("player");
    if (pl && Math.hypot(pl.wx - wx, pl.wz - wz) < 2.4) {
      wx += 2.6;
      wz += 1.4;
    }
    beacon.visible = true;
    beacon.position.set(wx, bob * 0.5, wz);
  }
}
