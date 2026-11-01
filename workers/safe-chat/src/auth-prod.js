import { verifyFirebaseIdToken } from "./firebase-jwt.js";

/** Production auth: Firebase ID token only (no skip-auth / emulator branches). */
export async function verifyRequestAuth(request, config) {
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error("missing bearer");
  const token = m[1].trim();
  return verifyFirebaseIdToken(token, config.projectId);
}

export function isModerator(uid, env, claims) {
  if (claims?.admin === true || claims?.moderator === true) return true;
  const list = (env.MODERATOR_UIDS || "")
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);
  return list.includes(uid);
}
