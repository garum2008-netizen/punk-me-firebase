import { verifyFirebaseIdToken } from "./firebase-jwt.js";

/** Integration / vitest only — not imported from production entry when aliasing is off. */
async function verifyViaAuthEmulator(idToken, env) {
  const host = env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
  const [h, p] = host.includes(":") ? host.split(":") : [host, "9099"];
  const url = `http://${h}:${p}/identitytoolkit.googleapis.com/v1/accounts:lookup?key=fake-api-key`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.users?.[0]?.localId) {
    throw new Error("emulator lookup failed");
  }
  const user = json.users[0];
  let claims = {};
  try {
    if (user.customAttributes && typeof user.customAttributes === "string") {
      claims = JSON.parse(user.customAttributes);
    }
  } catch (_) {}
  return { uid: user.localId, claims };
}

export async function verifyRequestAuth(request, config, env = {}) {
  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error("missing bearer");
  const token = m[1].trim();
  if (env.SAFE_CHAT_INTEGRATION === "1") {
    return verifyViaAuthEmulator(token, env);
  }
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
