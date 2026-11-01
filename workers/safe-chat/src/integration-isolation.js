const PROJECT_ID = "punk-me-40605";
let seq = 0;
let activeNs = `${PROJECT_ID}-default-rtdb`;
let activeDoName = "global";

/** Unique RTDB emulator namespace + limits DO name for one vitest task. */
export function assignIntegrationIsolation(task) {
  seq += 1;
  const slug = String(seq);
  activeNs = `${PROJECT_ID}-t-${slug}`;
  activeDoName = `lim-${slug}`;
  return { ns: activeNs, doName: activeDoName };
}

export function getActiveIntegrationRtdbNs() {
  return activeNs;
}

export function getActiveIntegrationDoName() {
  return activeDoName;
}

/** Keep worker env aligned with harness module state (direct job calls from tests). */
export function syncIntegrationEnvBindings(env) {
  if (env.SAFE_CHAT_INTEGRATION !== "1") return;
  env.FIREBASE_EMULATOR_NS = activeNs;
  env.SAFE_CHAT_LIMITS_DO_NAME = activeDoName;
}
