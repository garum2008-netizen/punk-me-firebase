const JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let jwksCache = { keys: null, fetchedAt: 0 };
const JWKS_TTL_MS = 60 * 60 * 1000;

async function fetchJwks() {
  const now = Date.now();
  if (jwksCache.keys && now - jwksCache.fetchedAt < JWKS_TTL_MS) return jwksCache.keys;
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const json = await res.json();
  jwksCache = { keys: json.keys, fetchedAt: now };
  return json.keys;
}

function b64urlToBytes(s) {
  const pad = "=".repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function importJwkKey(jwk) {
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
}

async function verifyFirebaseIdToken(idToken, projectId) {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("invalid token shape");
  const header = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
  const keys = await fetchJwks();
  const jwk = keys.find(k => k.kid === header.kid);
  if (!jwk) throw new Error("unknown kid");
  const key = await importJwkKey(jwk);
  const data = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const sig = b64urlToBytes(parts[2]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, data);
  if (!ok) throw new Error("bad signature");
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error("expired");
  if (payload.iat && payload.iat > now + 60) throw new Error("future iat");
  const iss = `https://securetoken.google.com/${projectId}`;
  if (payload.iss !== iss) throw new Error("iss mismatch");
  if (payload.aud !== projectId) throw new Error("aud mismatch");
  if (!payload.sub) throw new Error("no sub");
  return { uid: payload.sub, claims: payload };
}

async function verifyViaAuthEmulator(idToken, env, projectId) {
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
  if (config.testMode) {
    return verifyViaAuthEmulator(token, env, config.projectId);
  }
  if (config.skipAuth) {
    return { uid: token === "test" ? "test-uid" : token, claims: {} };
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
