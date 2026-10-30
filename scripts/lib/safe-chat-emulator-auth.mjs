/**
 * Firebase Auth emulator helpers (local tests only).
 */
import http from "http";

const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST?.split(":")[0] || "127.0.0.1";
const AUTH_PORT = parseInt(process.env.FIREBASE_AUTH_EMULATOR_HOST?.split(":")[1] || "9099", 10);

export function fetchJson(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: opts.method || "GET", headers: opts.headers || {} }, res => {
      let body = "";
      res.on("data", c => (body += c));
      res.on("end", () => {
        let json = null;
        try {
          json = body ? JSON.parse(body) : null;
        } catch {
          json = body;
        }
        resolve({ status: res.statusCode, json, body });
      });
    });
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

export async function authSignUp() {
  const url = `http://${AUTH_HOST}:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`;
  const res = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  });
  if (res.status !== 200 || !res.json?.idToken) {
    throw new Error(`auth signUp failed: ${res.status} ${res.body}`);
  }
  return { idToken: res.json.idToken, localId: res.json.localId };
}
