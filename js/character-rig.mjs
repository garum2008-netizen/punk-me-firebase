/** Visibility gate — never show skinned mesh until idle clip has weight. */
export function markActorVisibleWhenReady(actor) {
  const idle = actor.actions?.idle;
  if (!idle || actor._visibleReady) return;
  if (idle.getEffectiveWeight() > 0.35) {
    actor._visibleReady = true;
    actor.root.visible = true;
  }
}

export function updateProcedural() {}
