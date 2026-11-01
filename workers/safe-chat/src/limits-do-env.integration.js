/** Integration harness: per-test limits DO id (not used in production bundle). */
export function chatLimitsDoName(env) {
  if (env.SAFE_CHAT_INTEGRATION === "1" && env.SAFE_CHAT_TEST_DO_NAME) {
    return String(env.SAFE_CHAT_TEST_DO_NAME);
  }
  return "global";
}
