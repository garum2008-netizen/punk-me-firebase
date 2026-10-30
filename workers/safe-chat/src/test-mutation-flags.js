/**
 * Test-only mutation disable flags. Honored only when SAFE_CHAT_INTEGRATION === "1".
 * Must never appear in production wrangler.toml (see prod-config tests).
 */
export const TEST_MUTATION_DISABLE_ENV_KEYS = [
  "SAFE_CHAT_TEST_DISABLE_HIDE_QUOTA",
  "SAFE_CHAT_TEST_DISABLE_CLUSTER_CAP",
  "SAFE_CHAT_TEST_DISABLE_BRIGADING",
  "SAFE_CHAT_TEST_DISABLE_FALSE_REPORT_PENALTY",
  "SAFE_CHAT_TEST_DISABLE_REPORTER_PRIVACY",
  "SAFE_CHAT_TEST_DISABLE_GLOBAL_HIDE_GATE",
  "SAFE_CHAT_TEST_DISABLE_MAX_HOLD_ESCALATION",
  "SAFE_CHAT_TEST_DISABLE_P04_REDACTION",
  "SAFE_CHAT_TEST_DISABLE_ERASURE_BUDGET"
];

/** When true, the protective mechanism is disabled (integration mutation runs only). */
export function testMutationDisables(env, key) {
  if (!env || env[key] !== "1") return false;
  return env.SAFE_CHAT_INTEGRATION === "1";
}

export function productionEnvMustNotEnableTestMutationFlags(env) {
  if (env.SAFE_CHAT_INTEGRATION === "1") return;
  for (const key of TEST_MUTATION_DISABLE_ENV_KEYS) {
    if (env[key] === "1") {
      throw new Error(`${key} is test-only and ignored outside integration`);
    }
  }
}
