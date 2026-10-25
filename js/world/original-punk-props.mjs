import * as THREE from "three";

/** Original neon punk wall art (no licensed / franchise photo posters). */
export function addOriginalBandPoster(root, x, y, z, rotY = 0, variant = 0) {
  const titles = ["RUSTY CHAINS", "HOUSE 13", "NEON RIOT", "PUNK ME"];
  const colors = [0xff3399, 0x00ffff, 0xffcc00, 0xaa66ff];
  const title = titles[variant % titles.length];
  const color = colors[variant % colors.length];
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 192;
  const g = c.getContext("2d");
  g.fillStyle = "#1a1020";
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "#" + color.toString(16).padStart(6, "0");
  g.lineWidth = 6;
  g.strokeRect(8, 8, c.width - 16, c.height - 16);
  g.font = "bold 28px system-ui,sans-serif";
  g.fillStyle = "#ffffff";
  g.fillText(title, 18, 72);
  g.font = "bold 52px system-ui,sans-serif";
  g.fillStyle = "#" + color.toString(16).padStart(6, "0");
  g.fillText("⚡", 180, 140);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.4, 1.8),
    new THREE.MeshStandardMaterial({
      map: tex,
      emissive: color,
      emissiveIntensity: 0.25,
      roughness: 0.85
    })
  );
  mesh.position.set(x, y, z);
  mesh.rotation.y = rotY;
  mesh.userData.decorOnly = true;
  root.add(mesh);
  return mesh;
}
