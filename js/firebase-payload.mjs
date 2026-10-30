/** Remove `undefined` so Firebase RTDB .update() does not reject the whole payload. */
export function stripUndefinedDeep(value) {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return value.map(stripUndefinedDeep).filter(v => v !== undefined);
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue;
    const next = stripUndefinedDeep(v);
    if (next !== undefined) out[k] = next;
  }
  return out;
}
