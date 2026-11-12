/** One-shot claims. A second call with the same key does not grant the reward again. */

export function claimOnce(record, key, value = true) {
  if (!record || typeof key !== "string" || !key) return false;
  if (Object.prototype.hasOwnProperty.call(record, key)) return false;
  record[key] = value;
  return true;
}
