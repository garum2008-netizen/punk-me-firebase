import * as THREE from "three";

/** Stylized punk dog — Y-up, faces +Z, four paws on floor. CC0-style in-engine mesh. */
const SHOULDER_Y = 0.5;

export function createProceduralDog(scene) {
  const group = new THREE.Group();
  const fur = new THREE.MeshStandardMaterial({ color: 0x9a5c32, roughness: 0.72 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x3a2210, roughness: 0.8 });
  const nose = new THREE.MeshStandardMaterial({ color: 0x1a1010 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.26, 0.78), fur);
  body.position.set(0, 0.38, 0);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.28), fur);
  chest.position.set(0, 0.4, 0.32);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.3), fur);
  head.position.set(0, 0.48, 0.52);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.14), fur);
  snout.position.set(0, 0.44, 0.68);
  const sn = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), nose);
  sn.position.set(0, 0.46, 0.76);
  const earL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.06), dark);
  earL.position.set(-0.12, 0.58, 0.48);
  const earR = earL.clone();
  earR.position.x = 0.12;

  const legs = [];
  const legGeo = new THREE.BoxGeometry(0.1, 0.32, 0.1);
  [[-0.18, 0.28], [0.18, 0.28], [-0.18, -0.28], [0.18, -0.28]].forEach(([lx, lz], i) => {
    const leg = new THREE.Mesh(legGeo, dark);
    leg.position.set(lx, 0.16, lz);
    leg.userData.legIndex = i;
    legs.push(leg);
    group.add(leg);
  });

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.32), dark);
  tail.position.set(0, 0.42, -0.48);
  tail.rotation.x = -0.45;

  group.add(body, chest, head, snout, sn, earL, earR, tail);

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.32, 16),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  group.add(shadow);

  scene.add(group);

  return {
    group,
    root: group,
    legs,
    tail,
    mixer: null,
    actions: {},
    current: "idle",
    isDog: true,
    wx: 0,
    wz: 0,
    _sitUntil: 0,
    _wagPhase: 0,
    _anim: "idle",
    _legPhase: 0,
    _placed: false,
    _proceduralDog: true
  };
}

export function updateProceduralDogAnim(dog, dt, state) {
  if (!dog?._proceduralDog) return;
  const spd = state === "run" ? 14 : state === "walk" ? 9 : 5;
  dog._legPhase += dt * spd;
  const swing = state === "idle" ? 0.04 : state === "sit" ? 0 : 0.22;
  dog.legs?.forEach((leg, i) => {
    const phase = dog._legPhase + i * Math.PI * 0.5;
    leg.position.y = 0.16 + Math.sin(phase) * swing;
    if (state === "sit" && i >= 2) leg.position.y = 0.08;
  });
  if (dog.tail) {
    dog.tail.rotation.y = Math.sin(dog._legPhase * 2.2) * (state === "idle" ? 0.35 : 0.15);
  }
  if (state === "sit") {
    dog.root.position.y = -0.04;
    dog.root.rotation.x = 0.08;
  } else {
    dog.root.position.y = 0;
    dog.root.rotation.x = 0;
  }
}
