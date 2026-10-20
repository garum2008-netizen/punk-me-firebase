import * as THREE from "three";

/** Visible hangout build — 4 stages on construction site. */
export function buildHangoutVisual(stage, root) {
  let g = root.getObjectByName("hangout_build");
  if (!g) {
    g = new THREE.Group();
    g.name = "hangout_build";
    root.add(g);
  }
  while (g.children.length) g.children[0].removeFromParent();
  const s = Math.max(0, Math.min(4, stage || 0));
  const matConcrete = new THREE.MeshStandardMaterial({ color: 0x666677, roughness: 0.9 });
  const matWood = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.85 });
  const matBrick = new THREE.MeshStandardMaterial({ color: 0x994433, roughness: 0.88 });
  const matNeon = new THREE.MeshStandardMaterial({
    color: 0xff00ff,
    emissive: 0xff00ff,
    emissiveIntensity: 0.85
  });

  if (s >= 1) {
    const slab = new THREE.Mesh(new THREE.BoxGeometry(6, 0.35, 5), matConcrete);
    slab.position.set(0, 0.18, -2);
    g.add(slab);
  }
  if (s >= 2) {
    [-2.4, 2.4].forEach(x => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.25, 2.2, 0.25), matWood);
      post.position.set(x, 1.25, -2);
      g.add(post);
    });
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.2, 0.2), matWood);
    beam.position.set(0, 2.35, -2);
    g.add(beam);
  }
  if (s >= 3) {
    const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2, 4.5), matBrick);
    wallL.position.set(-2.85, 1.2, -2);
    const wallR = wallL.clone();
    wallR.position.x = 2.85;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.25, 5.2), matWood);
    roof.position.set(0, 2.55, -2);
    g.add(wallL, wallR, roof);
  }
  if (s >= 4) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.5, 0.15), matNeon);
    sign.position.set(0, 3.1, -4.2);
    g.add(sign);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.8, 8), matNeon);
    tube.rotation.z = Math.PI / 2;
    tube.position.set(-1.2, 2.8, -3.8);
    g.add(tube);
    const spray = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.1), new THREE.MeshStandardMaterial({ color: 0x22ff88 }));
    spray.position.set(2.5, 1.5, -1.2);
    g.add(spray);
  }
  return g;
}
