const AUTH_HOST = "127.0.0.1";
const AUTH_PORT = 9099;
const DB_HOST = "127.0.0.1";
const DB_PORT = 9000;

export const PROJECT_ID = "punk-me-40605";
export const DB_NS = `${PROJECT_ID}-default-rtdb`;

export async function authSignUp() {
  const res = await fetch(
    `http://${AUTH_HOST}:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
  );
  const json = await res.json();
  if (!res.ok || !json.idToken) throw new Error(`signUp failed ${res.status}`);
  return { idToken: json.idToken, localId: json.localId };
}

export function rtdbUrl(path, token) {
  const q = new URLSearchParams({ ns: DB_NS });
  if (token) q.set("auth", token);
  return `http://${DB_HOST}:${DB_PORT}/${path.replace(/^\//, "")}.json?${q}`;
}

export async function rtdbOwner(path, method, body) {
  const url = `http://${DB_HOST}:${DB_PORT}/${path.replace(/^\//, "")}.json?ns=${encodeURIComponent(DB_NS)}&access_token=owner`;
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : {},
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }
  return { status: res.status, json, ok: res.ok };
}

export async function apiPost(SELF, path, idToken, body) {
  return SELF.fetch(`http://localhost${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body ?? {})
  });
}

export async function apiGet(SELF, path, idToken) {
  return SELF.fetch(`http://localhost${path}`, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
}

export function isBlocked(blocklist, uid) {
  return Boolean(blocklist?.[uid]);
}
