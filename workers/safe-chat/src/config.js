export function loadConfig(env) {
  const corsRaw = env.SAFE_CHAT_CORS_ORIGINS || "https://halloween.punk.contractbot.dk";
  const corsOrigins = corsRaw
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  return {
    projectId: env.FIREBASE_PROJECT_ID || "punk-me-40605",
    databaseUrl: (env.FIREBASE_DATABASE_URL || "").replace(/\/$/, ""),
    freeTextEnabled: env.SAFE_CHAT_FREE_TEXT === "true",
    dailyLimit: parseInt(env.SAFE_CHAT_DAILY_LIMIT || "80", 10),
    reportAutoHide: parseInt(env.SAFE_CHAT_REPORT_AUTO_HIDE || "3", 10),
    reportDailyLimit: parseInt(env.SAFE_CHAT_REPORT_DAILY_LIMIT || "30", 10),
    msgMaxLen: 200,
    cooldownMs: 3000,
    newbieMs: 10 * 60 * 1000,
    youngAccountMs: parseInt(env.SAFE_CHAT_YOUNG_ACCOUNT_MS || String(7 * 24 * 60 * 60 * 1000), 10),
    youngDailyLimit: parseInt(env.SAFE_CHAT_YOUNG_DAILY_LIMIT || "15", 10),
    youngCooldownMs: parseInt(env.SAFE_CHAT_YOUNG_COOLDOWN_MS || "5000", 10),
    lowLevelThreshold: parseInt(env.SAFE_CHAT_LOW_LEVEL_THRESHOLD || "3", 10),
    lowLevelDailyLimit: parseInt(env.SAFE_CHAT_LOW_LEVEL_DAILY_LIMIT || "25", 10),
    lowLevelCooldownMs: parseInt(env.SAFE_CHAT_LOW_LEVEL_COOLDOWN_MS || "4000", 10),
    childSafetyReporterMinMs: parseInt(
      env.SAFE_CHAT_CHILD_SAFETY_REPORTER_MIN_MS || String(24 * 60 * 60 * 1000),
      10
    ),
    childSafetyReporterMinSends: parseInt(env.SAFE_CHAT_CHILD_SAFETY_REPORTER_MIN_SENDS || "5", 10),
    childSafetyHideQuotaLow: parseInt(env.SAFE_CHAT_CHILD_SAFETY_HIDE_QUOTA_LOW || "1", 10),
    childSafetyHideQuotaTrusted: parseInt(env.SAFE_CHAT_CHILD_SAFETY_HIDE_QUOTA_TRUSTED || "3", 10),
    childSafetyBrigadingLowTrustDistinct: parseInt(env.SAFE_CHAT_CHILD_SAFETY_BRIGADE_DISTINCT || "3", 10),
    childSafetyBrigadingWindowMs: parseInt(
      env.SAFE_CHAT_CHILD_SAFETY_BRIGADE_WINDOW_MS || String(60 * 60 * 1000),
      10
    ),
    childSafetyHideDeniedMs: parseInt(
      env.SAFE_CHAT_CHILD_SAFETY_HIDE_DENIED_MS || String(30 * 24 * 60 * 60 * 1000),
      10
    ),
    childSafetyFalseReportAutoMuteThreshold: parseInt(env.SAFE_CHAT_CHILD_SAFETY_FALSE_MUTE_AT || "3", 10),
    childSafetyClusterHideCap: parseInt(env.SAFE_CHAT_CHILD_SAFETY_CLUSTER_HIDE_CAP || "5", 10),
    childSafetyRiskHideHighTier: parseInt(env.SAFE_CHAT_CHILD_SAFETY_RISK_HIGH || "45", 10),
    childSafetyRiskHideOther: parseInt(env.SAFE_CHAT_CHILD_SAFETY_RISK_OTHER || "50", 10),
    childSafetyRiskHideImmediate: parseInt(env.SAFE_CHAT_CHILD_SAFETY_RISK_IMMEDIATE || "40", 10),
    childSafetyImmediateDangerSlaMs: parseInt(
      env.SAFE_CHAT_IMMEDIATE_DANGER_SLA_MS || String(4 * 60 * 60 * 1000),
      10
    ),
    childSafetyMergeWindowMs: parseInt(env.SAFE_CHAT_CHILD_SAFETY_MERGE_MS || String(120 * 1000), 10),
    childSafetyCoordinationWindowMs: parseInt(
      env.SAFE_CHAT_CHILD_SAFETY_COORD_MS || String(30 * 1000),
      10
    ),
    safetyQueueEscalateMs: parseInt(env.SAFE_CHAT_SAFETY_ESCALATE_MS || String(48 * 60 * 60 * 1000), 10),
    safetyEvidenceMaxHoldMs: parseInt(
      env.SAFE_CHAT_SAFETY_EVIDENCE_MAX_MS || String(365 * 24 * 60 * 60 * 1000),
      10
    ),
    safetyEvidenceLegalBasis:
      env.SAFE_CHAT_SAFETY_LEGAL_BASIS ||
      "GDPR Art. 17(3)(f) child protection + DSA Art. 9 illegal content (DRAFT — legal review)",
    globalMsgReportsPerDay: parseInt(env.SAFE_CHAT_GLOBAL_MSG_REPORTS_PER_DAY || "100", 10),
    erasureMaxSubrequests: parseInt(env.SAFE_CHAT_ERASURE_MAX_SUBREQUESTS || "40", 10),
    erasureBatchSize: parseInt(env.SAFE_CHAT_ERASURE_BATCH || "15", 10),
    erasureMinIntervalMs: parseInt(env.SAFE_CHAT_ERASURE_MIN_INTERVAL_MS || String(60 * 60 * 1000), 10),
    erasureDeferredTtlMs: parseInt(
      env.SAFE_CHAT_ERASURE_DEFERRED_TTL_MS || String(90 * 24 * 60 * 60 * 1000),
      10
    ),
    erasureCursorMaxLen: parseInt(env.SAFE_CHAT_ERASURE_CURSOR_MAX_LEN || "128", 10),
    msgRetentionMs: 7 * 24 * 60 * 60 * 1000,
    reportRetentionMs: 90 * 24 * 60 * 60 * 1000,
    modStateRetentionMs: 90 * 24 * 60 * 60 * 1000,
    limitsRetentionMs: 30 * 24 * 60 * 60 * 1000,
    corsOrigins,
    retentionBatchSize: parseInt(env.SAFE_CHAT_RETENTION_BATCH || "45", 10)
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
