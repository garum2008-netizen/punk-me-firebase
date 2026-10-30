export function loadConfig(env) {
  return {
    projectId: env.FIREBASE_PROJECT_ID || "punk-me-40605",
    databaseUrl: (env.FIREBASE_DATABASE_URL || "").replace(/\/$/, ""),
    testMode: env.SAFE_CHAT_TEST_MODE === "true",
    skipAuth: env.SAFE_CHAT_SKIP_AUTH === "true",
    freeTextEnabled: env.SAFE_CHAT_FREE_TEXT === "true",
    dailyLimit: parseInt(env.SAFE_CHAT_DAILY_LIMIT || "80", 10),
    reportAutoHide: parseInt(env.SAFE_CHAT_REPORT_AUTO_HIDE || "3", 10),
    msgMaxLen: 200,
    cooldownMs: 3000,
    newbieMs: 10 * 60 * 1000,
    youngAccountMs: parseInt(env.SAFE_CHAT_YOUNG_ACCOUNT_MS || String(7 * 24 * 60 * 60 * 1000), 10),
    youngDailyLimit: parseInt(env.SAFE_CHAT_YOUNG_DAILY_LIMIT || "15", 10),
    youngCooldownMs: parseInt(env.SAFE_CHAT_YOUNG_COOLDOWN_MS || "5000", 10),
    lowLevelThreshold: parseInt(env.SAFE_CHAT_LOW_LEVEL_THRESHOLD || "3", 10),
    lowLevelDailyLimit: parseInt(env.SAFE_CHAT_LOW_LEVEL_DAILY_LIMIT || "25", 10),
    lowLevelCooldownMs: parseInt(env.SAFE_CHAT_LOW_LEVEL_COOLDOWN_MS || "4000", 10),
    msgRetentionMs: 7 * 24 * 60 * 60 * 1000,
    reportRetentionMs: 90 * 24 * 60 * 60 * 1000
  };
}

export const REPORT_CATEGORY_CHILD_SAFETY = "child_safety";

export function parseModeratorUids(env) {
  const raw = env.MODERATOR_UIDS || "";
  return raw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}
