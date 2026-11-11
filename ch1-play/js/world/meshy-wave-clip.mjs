import * as THREE from "three";

function findBone(root, shortName) {
  const variants = [shortName, `mixamorig${shortName}`, `mixamorig:${shortName}`];
  for (const n of variants) {
    const b = root.getObjectByName(n);
    if (b) return b;
  }
  let found = null;
  root.traverse(o => {
    if (found || !o.isBone) return;
    if (o.name.split(/[:]/).pop() === shortName) found = o;
  });
  return found;
}

function applyIdlePose(probe, mixer, idleClip) {
  const act = mixer.clipAction(idleClip);
  act.play();
  act.time = 0;
  act.setEffectiveWeight(1);
  mixer.update(0);
  probe.updateMatrixWorld(true);
}

/** Wave: idle base + local raised right arm; forearm wiggle on elbow axis. */
export function buildWaveClip(gltf, idleClip) {
  if (!idleClip) return null;
  const duration = 1.85;
  const keyTimes = [0, 0.16, 0.28, 0.42, 0.56, 0.7, 0.84, 0.98, 1.12, 1.32, 1.85];
  const foreSwing = [0, 0, 0, 0.35, -0.35, 0.35, -0.35, 0.35, -0.35, 0.1, 0];

  const probe = gltf.scene.clone(true);
  const mixer = new THREE.AnimationMixer(probe);
  applyIdlePose(probe, mixer, idleClip);

  const boneNames = [];
  probe.traverse(o => {
    if (o.isBone) boneNames.push(o.name);
  });

  const idleQ = new Map();
  boneNames.forEach(n => {
    const b = probe.getObjectByName(n);
    idleQ.set(n, b.quaternion.clone());
  });

  const rArm = findBone(probe, "RightArm");
  const rFore = findBone(probe, "RightForeArm");
  const armRaise = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.15, 0.12, -1.42));
  const raisedArmQ = rArm
    ? idleQ.get(rArm.name).clone().multiply(armRaise)
    : null;

  const trackTimes = new Map();
  const trackValues = new Map();
  boneNames.forEach(n => {
    trackTimes.set(n, []);
    trackValues.set(n, []);
  });

  for (let ki = 0; ki < keyTimes.length; ki++) {
    const t = keyTimes[ki];
    const raiseIn = t < 0.14 ? 0 : Math.min(1, (t - 0.14) / 0.18);
    const raiseOut = t > 1.28 ? Math.min(1, (t - 1.28) / 0.45) : 0;
    const raised = raiseIn * (1 - raiseOut);

    boneNames.forEach(name => {
      const base = idleQ.get(name).clone();
      let q = base;
      if (raised > 0.001 && rArm && name === rArm.name && raisedArmQ) {
        q = idleQ.get(name).clone().slerp(raisedArmQ, raised);
      }
      if (raised > 0.02 && rFore && name === rFore.name) {
        const swing = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(foreSwing[ki] * raised, 0, -0.95 * raised)
        );
        q = idleQ.get(name).clone().multiply(swing);
      }
      trackTimes.get(name).push(t);
      const v = trackValues.get(name);
      v.push(q.x, q.y, q.z, q.w);
    });
  }

  const tracks = boneNames.map(name => new THREE.QuaternionKeyframeTrack(
    `${name}.quaternion`,
    trackTimes.get(name),
    trackValues.get(name)
  ));

  return new THREE.AnimationClip("PlayerWave", duration, tracks);
}
