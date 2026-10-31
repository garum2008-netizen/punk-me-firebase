/** Firebase push keys and Auth uids (conservative allowlist). */
export const FIREBASE_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
export const REPORT_HASH_RE = /^[a-f0-9]{32}$/;

export function assertFirebaseId(id, label = "id") {
  const s = String(id ?? "");
  if (!FIREBASE_ID_RE.test(s)) {
    const err = new Error("invalid_id");
    err.label = label;
    throw err;
  }
  return s;
}

export function isValidFirebaseId(id) {
  return FIREBASE_ID_RE.test(String(id ?? ""));
}

export function assertReportHash(hash) {
  const s = String(hash ?? "");
  if (!REPORT_HASH_RE.test(s)) throw new Error("invalid_id");
  return s;
}
