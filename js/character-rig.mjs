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
  const breath = Math.sin(t * 1.6) * 0.006;
  const sway = Math.sin(t * 0.7) * 0.004;

  if (bones.spine && rest.spineX !== undefined) {
    bones.spine.rotation.x = rest.spineX + breath;
  }
  if (bones.spine1 && rest.spine1X !== undefined) {
    bones.spine1.rotation.x = rest.spine1X + breath * 0.65;
  }
  if (bones.head && rest.headX !== undefined) {
    bones.head.rotation.x = rest.headX + sway - 0.03;
  }
}
