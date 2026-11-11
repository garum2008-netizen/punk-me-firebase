/** Visibility gate for skinned actors. */
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

/** Subtle breathing on idle clip (does not touch arms). */
export function updateProcedural(actor, dt, _playerPos, _talking) {
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
  if (!actor.isGuide || !actor._mood) return;
  const mood = actor._mood;
  if (bones.head && rest.headX !== undefined) {
    if (mood === "eyeroll") {
      bones.head.rotation.z = Math.sin(t * 1.4) * 0.35;
      bones.head.rotation.x = rest.headX - 0.28;
    } else if (mood === "cheer") {
      bones.head.rotation.x = rest.headX - 0.22;
      bones.head.rotation.z = Math.sin(t * 3) * 0.06;
    } else if (mood === "talk" || mood === "point") {
      bones.head.rotation.x = rest.headX + Math.sin(t * 4) * 0.06;
      bones.head.rotation.z = 0;
    } else if (mood === "smirk") {
      bones.head.rotation.z = 0.18;
      bones.head.rotation.x = rest.headX - 0.06;
    }
  }
  if (bones.rightArm && rest.rightArmX !== undefined && (mood === "point" || mood === "cheer")) {
    bones.rightArm.rotation.x = rest.rightArmX - (mood === "cheer" ? 0.9 : 1.15);
  } else if (bones.rightArm && rest.rightArmX !== undefined) {
    bones.rightArm.rotation.x = rest.rightArmX;
  }
}
