/** Visibility gate for skinned actors. */
let playerRootVisibilityGuard = null;

/** World3D registers a callback to re-hide the player mesh when life-ch1 cutout is active. */
export function setPlayerRootVisibilityGuard(fn) {
  playerRootVisibilityGuard = typeof fn === "function" ? fn : null;
}

function revealActorRoot(actor) {
  if (actor.root) actor.root.visible = true;
  if (actor.isPlayer && playerRootVisibilityGuard) playerRootVisibilityGuard(actor);
}

export function markActorVisibleWhenReady(actor) {
  if (actor._visibleReady) {
    if (actor.isPlayer && playerRootVisibilityGuard) playerRootVisibilityGuard(actor);
    return;
  }
  if (actor._meshy) {
    actor._visibleReady = true;
    revealActorRoot(actor);
    return;
  }
  const idle = actor.actions?.idle;
  if (!idle) {
    actor._visibleReady = true;
    revealActorRoot(actor);
    return;
  }
  if (idle.getEffectiveWeight() > 0.35) {
    actor._visibleReady = true;
    revealActorRoot(actor);
  } else if (actor.isPlayer && playerRootVisibilityGuard) {
    playerRootVisibilityGuard(actor);
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
}
