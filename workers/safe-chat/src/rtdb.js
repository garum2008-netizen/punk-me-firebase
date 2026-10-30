import { assertFirebaseId } from "./ids.js";

function base64urlBytes(bytes) {
  let bin = "";
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlString(s) {
  return base64urlBytes(new TextEncoder().encode(s));
}

function pemToArrayBuffer(pem) {
  const b64 = pem.replace(/-----[^-]+-----/g, "").replace(/\s/g, "");
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export async function getServiceAccountAccessToken(saJson, scope = "https://www.googleapis.com/auth/firebase.database") {
  const sa = typeof saJson === "string" ? JSON.parse(saJson) : saJson;
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope
  };
  const unsigned = `${base64urlString(JSON.stringify(header))}.${base64urlString(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const jwt = `${unsigned}.${base64urlBytes(sig)}`;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error(`token exchange failed: ${res.status}`);
  return json.access_token;
}

export function rtdbBaseUrl(config, emulatorHost) {
  if (emulatorHost) {
    const host = emulatorHost.includes(":") ? emulatorHost : `${emulatorHost}:9000`;
    return `http://${host}`;
  }
  return config.databaseUrl.replace(/\/$/, "");
}

/** Build path with validated, encoded segments (prevents path traversal). */
export function rtdbPath(...segments) {
  return segments.map(seg => {
    assertFirebaseId(seg);
    return encodeURIComponent(seg);
  }).join("/");
}

export async function rtdbRequest(config, path, method, body, accessToken, emulatorHost, ns) {
  const base = rtdbBaseUrl(config, emulatorHost);
  const cleanPath = path.replace(/^\//, "");
  const parts = cleanPath.split("/");
  for (const part of parts) {
    if (part === "" || part === "." || part === "..") {
      throw new Error("invalid_rtdb_path");
    }
    if (decodeURIComponent(part) !== part && !/%[0-9A-Fa-f]{2}/.test(part)) {
      /* already encoded segment from rtdbPath */
    }
  }
  let url = `${base}/${cleanPath.split("/").map(p => encodeURIComponent(decodeURIComponent(p))).join("/")}.json`;
  const params = new URLSearchParams();
  if (accessToken) params.set("access_token", accessToken);
  if (emulatorHost && ns) params.set("ns", ns);
  const qs = params.toString();
  if (qs) url += `?${qs}`;
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  let json = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, ok: res.ok };
}

export async function anonymizeUid(uid, salt) {
  const s = String(uid || "");
  if (!salt) {
    throw new Error("missing SAFE_CHAT_HASH_SALT");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(salt),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(s));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/** Public chat pseudonym for a Firebase uid (distinct from report-only hashes). */
export async function chatPublicSid(uid, salt) {
  return anonymizeUid(`chat:${uid}`, salt);
}
