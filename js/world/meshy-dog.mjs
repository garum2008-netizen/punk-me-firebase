import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export const PUNK_DOG_GLB = "assets/models/pets/punk_dog.glb";
const TARGET_HEIGHT = 0.57;

let dogTemplate = null;

function footLift(scene, scale) {
  const box = new THREE.Box3().setFromObject(scene);
  return Math.max(0, -box.min.y * scale + 0.002);
}

export async function loadPunkDogTemplate() {
  if (dogTemplate) return dogTemplate;
  const gltf = await new GLTFLoader().loadAsync(PUNK_DOG_GLB);
  gltf.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const h = Math.max(box.max.y - box.min.y, 0.001);
  const scale = TARGET_HEIGHT / h;
  dogTemplate = { gltf, scale, foot: footLift(gltf.scene, scale) };
  return dogTemplate;
}

export function createMeshyDog(scene, tpl) {
  const root = tpl.gltf.scene.clone(true);
  root.scale.setScalar(tpl.scale);
  root.position.y = tpl.foot;
  root.traverse(o => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  const group = new THREE.Group();
  group.add(root);
  scene.add(group);
  return {
    group,
    root,
    legs: null,
    tail: null,
    mixer: null,
    actions: {},
    current: "idle",
    isDog: true,
    wx: 0,
    wz: 0,
    _sitUntil: 0,
    _anim: "idle",
    _legPhase: 0,
    _placed: false,
    _meshyDog: true,
    _baseY: tpl.foot,
    _baseScale: 1
  };
}

/** @param {"idle"|"hop"} mode */
export function updateMeshyDogAnim(dog, dt, mode, moveSpeed = 0) {
  if (!dog?._meshyDog || !dog.root) return;
  const t = (dog._legPhase += dt);
  if (mode === "hop" && moveSpeed > 0.08) {
    const freq = 7 + Math.min(moveSpeed, 2.5) * 2.5;
    const phase = t * freq;
    const hop = Math.abs(Math.sin(phase)) * 0.06;
    dog.root.position.y = dog._baseY + hop;
    dog.root.rotation.x = -0.07 - Math.sin(phase) * 0.04;
    dog.root.scale.setScalar(dog._baseScale);
  } else {
    const breath = 1 + Math.sin(t * 2.4) * 0.018;
    dog.root.scale.setScalar(dog._baseScale * breath);
    dog.root.position.y = dog._baseY;
    dog.root.rotation.x = Math.sin(t * 1.6) * 0.035;
    dog.root.rotation.z = Math.sin(t * 1.1) * 0.012;
  }
}
