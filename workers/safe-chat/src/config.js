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
    msgRetentionMs: 7 * 24 * 60 * 60 * 1000,
    reportRetentionMs: 90 * 24 * 60 * 60 * 1000
  };
}

export function parseModeratorUids(env) {
  const raw = env.MODERATOR_UIDS || "";
  return raw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
}
