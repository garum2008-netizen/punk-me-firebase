#!/usr/bin/env node
/**
 * Assert prod-audit model: public /players read; presence/chat/publicProfiles/buildings deny (anon).
 * Run with emulators up and database.rules.json = prod model or hotfixed model.
 * MODE=baseline|hotfix (default baseline)
 */
const http = require("http");

const MODE = process.env.PROD_AUDIT_MODE || "baseline";
const PROJECT_ID = process.env.FIREBASE_EMULATOR_PROJECT || "punk-me-40605";
const DB_HOST = "127.0.0.1";
const DB_PORT = 9000;
const AUTH_HOST = "127.0.0.1";
const AUTH_PORT = 9099;
const DB_NS = `${PROJECT_ID}-default-rtdb`;

function fetchJson(url, opts = {}) {
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

function dbUrl(pathSuffix, idToken) {
  const q = `ns=${encodeURIComponent(DB_NS)}${idToken ? `&auth=${encodeURIComponent(idToken)}` : ""}`;
  return `http://${DB_HOST}:${DB_PORT}/${pathSuffix}.json?${q}`;
}

function denied(r) {
  return r.status === 401 || r.json?.error === "Permission denied" || String(r.body).includes("Permission denied");
}

function pass(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}: [audit/${MODE}] ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) process.exit(1);
}

async function authSignUp() {
  const url = `http://${AUTH_HOST}:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`;
  const res = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({})
  });
  if (res.status !== 200 || !res.json?.idToken) throw new Error(`signUp failed: ${res.status}`);
  return res.json;
}

async function run() {
  let r = await fetchJson(dbUrl("players"));
  if (MODE === "baseline") {
    pass("unauth read /players root → allow (prod leak)", r.status === 200, `status ${r.status}`);
  } else {
    pass("unauth read /players root → deny (hotfix)", denied(r), `status ${r.status}`);
  }

  for (const path of ["presence/room", "chat", "publicProfiles/x", "buildings/city"]) {
    r = await fetchJson(dbUrl(path));
    pass(`unauth read /${path} → deny (prod)`, denied(r), `status ${r.status}`);
  }

  if (MODE === "hotfix") {
    const alice = await authSignUp();
    const uid = alice.localId;
    await fetchJson(dbUrl(`players/${uid}/coins`, alice.idToken), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(100)
    });
    r = await fetchJson(dbUrl(`players/${uid}/premium`, alice.idToken), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(true)
    });
    pass("alice PUT premium → deny", denied(r), `status ${r.status}`);
  }

  console.log(`prod-audit model (${MODE}): all checks passed`);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
