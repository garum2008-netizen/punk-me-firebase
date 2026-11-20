import * as THREE from "three";

let sprite = null;

function makeSprite() {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "rgba(40,20,50,0.85)";
  g.beginPath();
  g.arc(64, 64, 52, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "#ffb8f0";
  g.lineWidth = 4;
  g.stroke();
  g.font = "bold 72px system-ui";
  g.fillStyle = "#ffe8ff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("A", 64, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const s = new THREE.Sprite(mat);
  s.scale.set(0.55, 0.55, 1);
  s.renderOrder = 999;
  s.name = "angelina_companion";
  return s;
}

export function ensureAngelinaSprite(scene) {
  if (sprite?.parent === scene) return sprite;
  if (sprite?.parent) sprite.parent.remove(sprite);
  sprite = makeSprite();
  scene.add(sprite);
  return sprite;
}

export function updateAngelinaCompanion(visible, playerActor, sceneTime = 0) {
  if (!sprite?.parent) return;
  if (!visible || !playerActor?.group) {
    sprite.visible = false;
    return;
  }
  sprite.visible = true;
  const bob = Math.sin(sceneTime * 2.4) * 0.15;
  const yaw = playerActor.group.rotation.y;
  const ox = Math.sin(yaw) * 0.9 + Math.cos(yaw) * 0.35;
  const oz = Math.cos(yaw) * 0.9 - Math.sin(yaw) * 0.35;
  sprite.position.set(playerActor.group.position.x + ox, 1.65 + bob, playerActor.group.position.z + oz);
}

export function disposeAngelinaCompanion(scene) {
  if (sprite && scene) scene.remove(sprite);
  sprite = null;
}