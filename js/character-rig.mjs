const PROC_IDLE = new Set(["idle", "talk", "sit", "emote"]);

export function markActorVisibleWhenReady(actor) {
  if (actor._visibleReady) return;
  if (actor._meshy) {
    actor._visibleReady = true;
    if (actor.root) actor.root.visible = true;
    return;
  }
  const idle = actor.actions?.idle;
  if (!idle) {
    actor._visibleReady = true;
    if (actor.root) actor.root.visible = true;
    return;
  }
  if (idle.getEffectiveWeight() > 0.35) {
    actor._visibleReady = true;
    actor.root.visible = true;
  }
}

function locomotionActive(actor) {
  if (actor.current !== "walk" && actor.current !== "run") return false;
  const act = actor.actions?.[actor.current];
  return (act?.getEffectiveWeight?.() ?? 0) > 0.28;
}

/** Breathing on idle clip; wave overlay only while dialogue (talking=true). */
export function updateProcedural(actor, dt, _playerPos, talking) {
  if (!actor._meshy || !actor._proc) return;
  if (locomotionActive(actor)) return;

  const t = performance.now() * 0.001;
  const { bones, rest } = actor._proc;
  const breath = Math.sin(t * 2.1) * 0.014;
  const sway = Math.sin(t * 0.85) * 0.01;

  if (bones.spine && rest.spineX !== undefined) {
    bones.spine.rotation.x = rest.spineX + breath;
  }
  if (bones.spine1 && rest.spine1X !== undefined) {
    bones.spine1.rotation.x = rest.spine1X + breath * 0.65;
  }
  if (bones.head && rest.headX !== undefined) {
    bones.head.rotation.x = rest.headX + sway - 0.03;
  }

  if (!talking) return;

  const wave = (Math.sin(t * 7.5) * 0.5 + 0.5);
  if (bones.rightArm) {
    bones.rightArm.rotation.x = (rest.rightArmX ?? bones.rightArm.rotation.x) - 1.55 * wave;
    bones.rightArm.rotation.z = (rest.rightArmZ ?? bones.rightArm.rotation.z) + 0.12;
  }
  if (bones.rightForeArm) {
    bones.rightForeArm.rotation.x = (rest.rightForeArmX ?? bones.rightForeArm.rotation.x) - 0.95 * wave;
  }
}
