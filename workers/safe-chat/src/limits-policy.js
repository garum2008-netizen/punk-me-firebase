/**
 * Stricter limits from server-recorded chat account age only (chatMeta.chatRegisteredAt).
 */
export function resolveSendLimits(config, { accountAgeMs }) {
  let cooldownMs = config.cooldownMs;
  let dailyLimit = config.dailyLimit;

  if (accountAgeMs < config.youngAccountMs) {
    cooldownMs = Math.max(cooldownMs, config.youngCooldownMs);
    dailyLimit = Math.min(dailyLimit, config.youngDailyLimit);
  }
  return { cooldownMs, dailyLimit };
}
