/**
 * Idle / walk / run with hysteresis + minimum dwell (reduces anim flicker).
 */
const MIN_DWELL_MS = 320;

export function createLocomotionState() {
  return { mode: "idle", since: 0 };
}

/**
 * @param {{ mode: string, since: number }} state
 * @returns {"idle"|"walk"|"run"}
 */
export function stepLocomotion(state, { speed, intentRun, talking, meshy, now = performance.now() }) {
  const walkEnter = meshy ? 0.2 : 0.12;
  const walkExit = meshy ? 0.08 : 0.05;
  const runEnter = 1.48;
  const runExit = 0.95;

  if (talking && speed < walkExit) {
    return commit(state, "idle", now);
  }
  if (speed < walkExit) {
    return commit(state, "idle", now);
  }
  if (intentRun && speed > walkEnter * 0.85) {
    if (state.mode !== "run" && now - state.since < MIN_DWELL_MS && state.mode === "walk") {
      return "walk";
    }
    return commit(state, "run", now);
  }
  if (state.mode === "run") {
    if (speed > runExit) return commit(state, "run", now);
    if (speed > walkExit) return commit(state, "walk", now);
    return commit(state, "idle", now);
  }
  if (state.mode === "walk") {
    if (speed > runEnter) return commit(state, "run", now);
    if (speed > walkExit * 0.9) return commit(state, "walk", now);
    return commit(state, "idle", now);
  }
  if (speed > runEnter) return commit(state, "run", now);
  if (speed > walkEnter) return commit(state, "walk", now);
  return commit(state, "idle", now);
}

function commit(state, mode, now) {
  if (state.mode !== mode) {
    state.mode = mode;
    state.since = now;
  }
  return mode;
}
