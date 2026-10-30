/**
 * Stricter limits for young accounts and low-level players.
 */
export function resolveSendLimits(config, { accountAgeMs, playerLevel }) {
  let cooldownMs = config.cooldownMs;
  let dailyLimit = config.dailyLimit;

  if (accountAgeMs < config.youngAccountMs) {
    cooldownMs = Math.max(cooldownMs, config.youngCooldownMs);
    dailyLimit = Math.min(dailyLimit, config.youngDailyLimit);
  }
  if (typeof playerLevel === "number" && playerLevel < config.lowLevelThreshold) {
    cooldownMs = Math.max(cooldownMs, config.lowLevelCooldownMs);
    dailyLimit = Math.min(dailyLimit, config.lowLevelDailyLimit);
  }
  return { cooldownMs, dailyLimit };
}
