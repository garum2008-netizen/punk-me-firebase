/** Integration-only request env + test clock (aliased over runtime-env.js in vitest). */
export function applyIntegrationRequestEnv(request, env) {
  if (env.SAFE_CHAT_INTEGRATION !== "1") return;
  const ns = request.headers.get("X-Sc-Rtdb-Ns");
  const doName = request.headers.get("X-Sc-Lim-Do");
  if (ns) env.FIREBASE_EMULATOR_NS = ns;
  if (doName) env.SAFE_CHAT_LIMITS_DO_NAME = doName;
}

export function integrationNowMs(env) {
  if (env.SAFE_CHAT_INTEGRATION !== "1" || !env.SAFE_CHAT_TEST_NOW_MS) return null;
  const n = parseInt(env.SAFE_CHAT_TEST_NOW_MS, 10);
  return Number.isNaN(n) ? null : n;
}
