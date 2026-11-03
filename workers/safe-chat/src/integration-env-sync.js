/** Apply per-test RTDB ns / limits DO from integration request headers (harness ↔ worker sync). */
export function bindIntegrationIsolationFromRequest(request, env) {
  if (env.SAFE_CHAT_INTEGRATION !== "1") return;
  const ns = request.headers.get("X-Safe-Chat-Integration-Ns");
  const doName = request.headers.get("X-Safe-Chat-Integration-Do");
  if (ns) env.FIREBASE_EMULATOR_NS = ns;
  if (doName) env.SAFE_CHAT_TEST_DO_NAME = doName;
}

export function integrationIsolationHeaders(ns, doName) {
  return {
    "X-Safe-Chat-Integration-Ns": ns,
    "X-Safe-Chat-Integration-Do": doName
  };
}
