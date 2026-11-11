/**
 * Coin write policy mirrored by database.rules.json (players/$uid/coins).
 * Keep the three constants in sync with that validate expression.
 *
 * Without Cloud Functions, RTDB can reject a single write that jumps coins
 * and can require a server timestamp plus a minimum gap between gains.
 * A modified client can still claim the max legal gain once per interval.
 */

export const MAX_COIN_GAIN = 250;
export const MIN_GAIN_INTERVAL_MS = 1500;
export const STARTING_COIN_CAP = 100;
export const COIN_ABS_MAX = 999999999;

export function classifyCoinWrite({
  prev = null,
  next,
  isAdmin = false,
  gainAtIsServerNow = false,
  elapsedMs = null
} = {}) {
  if (isAdmin) return { ok: true, reason: "admin" };
  if (typeof next !== "number" || !Number.isFinite(next) || next < 0 || next > COIN_ABS_MAX) {
    return { ok: false, reason: "range" };
  }
  const creating = prev == null || !Number.isFinite(prev);
  if (creating) {
    return next <= STARTING_COIN_CAP
      ? { ok: true, reason: "create" }
      : { ok: false, reason: "create-cap" };
  }
  if (next <= prev) return { ok: true, reason: "spend-or-same" };
  if (next - prev > MAX_COIN_GAIN) return { ok: false, reason: "delta" };
  if (!gainAtIsServerNow) return { ok: false, reason: "stamp" };
  if (elapsedMs != null && elapsedMs < MIN_GAIN_INTERVAL_MS) return { ok: false, reason: "interval" };
  return { ok: true, reason: "gain" };
}
