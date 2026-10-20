import { ARM_REST_Z } from "./world/meshy-punk.mjs";

const PROC_STATES = new Set(["idle", "talk", "wave", "interact", "sit", "emote"]);

/** Meshy actors have no idle clip — show after first procedural frame. */
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

export function updateProcedural(actor, dt, _playerPos, talking) {
  if (!actor._meshy || !actor._proc) return;
  if (locomotionActive(actor)) return;

  const t = performance.now() * 0.001;
  const { bones, rest } = actor._proc;
  const breath = Math.sin(t * 2.1) * 0.018;
  const sway = Math.sin(t * 0.85) * 0.012;

  if (bones.spine) bones.spine.rotation.x = rest.spineX + breath;
  if (bones.spine1) bones.spine1.rotation.x = rest.spine1X + breath * 0.7;
  if (bones.head) bones.head.rotation.x = rest.headX + sway - 0.04;

  const wave =
    talking ||
    actor.current === "wave" ||
    actor.current === "interact" ||
    actor._holdAnim === "wave" ||
    actor._holdAnim === "interact";

  if (wave) {
    const w = Math.min(1, (Math.sin(t * 6) * 0.5 + 0.5) * 0.35 + 0.65);
    if (bones.rightArm) {
      bones.rightArm.rotation.x = rest.rightArmX - 1.35 * w;
      bones.rightArm.rotation.z = (rest.rightArmZ || 0) + ARM_REST_Z * 0.2;
    }
    if (bones.rightForeArm) {
      bones.rightForeArm.rotation.x = rest.rightForeArmX - 0.85 * w;
    }
    if (bones.leftArm) {
      bones.leftArm.rotation.z = (rest.leftArmZ || 0) + ARM_REST_Z;
    }
  } else if (PROC_STATES.has(actor.current)) {
    if (bones.leftArm) {
      bones.leftArm.rotation.z = (rest.leftArmZ || 0) + ARM_REST_Z;
      bones.leftArm.rotation.x = (rest.leftArmX || 0) - 0.06;
    }
    if (bones.rightArm) {
      bones.rightArm.rotation.z = (rest.rightArmZ || 0) - ARM_REST_Z;
      bones.rightArm.rotation.x = (rest.rightArmX || 0) - 0.06;
    }
    if (bones.rightForeArm) bones.rightForeArm.rotation.x = rest.rightForeArmX;
  }
}
