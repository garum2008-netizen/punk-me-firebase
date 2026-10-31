/** Durable Object id name for chat limits (per-test name in integration). */
export function chatLimitsDoName(env) {
  if (env.SAFE_CHAT_INTEGRATION === "1" && env.SAFE_CHAT_TEST_DO_NAME) {
    return String(env.SAFE_CHAT_TEST_DO_NAME);
  }
  return "global";
}
