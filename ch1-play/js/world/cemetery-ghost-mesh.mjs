import * as THREE from "three";

/** Decorative sheet ghost (cemetery job + showcase props). */
export function cemeteryGhostMesh() {
  const group = new THREE.Group();
  const sheetMat = new THREE.MeshBasicMaterial({
    color: 0xe8f4ff,
    transparent: true,
    opacity: 0.84,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 12), sheetMat.clone());
  head.material.opacity = 0.92;
  head.position.y = 0.44;
  group.add(head);
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.26, 0.52, 14, 1, true),
    sheetMat
  );
  body.position.y = 0.06;
  group.add(body);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.22, 12, 1, true), sheetMat);
  tail.position.y = -0.2;
  tail.rotation.x = Math.PI;
  group.add(tail);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a2233 });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), eyeMat);
  eyeL.position.set(-0.05, 0.46, 0.1);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.05;
  group.add(eyeL, eyeR);
  return group;
}
