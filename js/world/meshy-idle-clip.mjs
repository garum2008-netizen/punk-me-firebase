import * as THREE from "three";

const LEG_RE = /UpLeg|LeftLeg|RightLeg|Foot|ToeBase|Toe_|_Toe/i;

function isLegBone(name) {
  const tail = name.split(/[:]/).pop();
  return LEG_RE.test(tail) || LEG_RE.test(name);
}

/** Standing idle: upper body from mid walk cycle, legs from bind pose. */
export function buildIdleStandClip(gltf) {
  const walk = gltf.animations?.find(c => c.name === "Walking");
  if (!walk) return null;

  const probe = gltf.scene.clone(true);
  probe.updateMatrixWorld(true);

  const bindRot = new Map();
  probe.traverse(o => {
    if (!o.isBone) return;
    bindRot.set(o.name, o.quaternion.clone());
  });

  const mixer = new THREE.AnimationMixer(probe);
  const act = mixer.clipAction(walk);
  act.play();
  const sampleT = walk.duration * 0.52;
  mixer.update(sampleT);
  probe.updateMatrixWorld(true);

  const sampleRot = new Map();
  probe.traverse(o => {
    if (!o.isBone) return;
    sampleRot.set(o.name, o.quaternion.clone());
  });

  const tracks = [];
  bindRot.forEach((qBind, boneName) => {
    const useWalk = !isLegBone(boneName);
    const q = useWalk && sampleRot.has(boneName) ? sampleRot.get(boneName) : qBind;
    tracks.push(new THREE.QuaternionKeyframeTrack(`${boneName}.quaternion`, [0], [q.x, q.y, q.z, q.w]));
  });

  return new THREE.AnimationClip("IdleStand", 1, tracks);
}
