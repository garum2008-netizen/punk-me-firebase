#!/usr/bin/env node
/**
 * Seed emulator with synthetic save fixtures; each uid re-writes its own save (rules check).
 */
const http = require("http");
const { buildPlayerSaveFixtures } = require("./player-save-fixtures");

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
      res.on("end", () => resolve({ status: res.statusCode, body, json: tryParse(body) }));
    });
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function tryParse(body) {
  try {
    return body ? JSON.parse(body) : null;
  } catch {
    return body;
  }
}

function dbUrl(pathSuffix, idToken) {
  const q = `ns=${encodeURIComponent(DB_NS)}${idToken ? `&auth=${encodeURIComponent(idToken)}` : ""}`;
  return `http://${DB_HOST}:${DB_PORT}/${pathSuffix}.json?${q}`;
}

async function authCustomToken(customToken) {
  const url = `http://${AUTH_HOST}:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`;
  const res = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  });
  if (res.status !== 200 || !res.json?.idToken) {
    throw new Error(`custom token failed: ${res.status} ${res.body}`);
  }
  return res.json;
}

async function run() {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${AUTH_HOST}:${AUTH_PORT}`;
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = `${DB_HOST}:${DB_PORT}`;
  const admin = require("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: PROJECT_ID,
      databaseURL: `http://${DB_HOST}:${DB_PORT}/?ns=${DB_NS}`
    });
  }

  const fixtures = buildPlayerSaveFixtures();
  console.log(`save-fixtures: ${fixtures.length} shapes`);

  for (const { id, data } of fixtures) {
    const uid = `fixture-${id}`;
    try {
      await admin.auth().createUser({ uid });
    } catch (e) {
      if (e.code !== "auth/uid-already-exists") throw e;
    }
    await admin.database().ref(`players/${uid}`).set(data);
    const custom = await admin.auth().createCustomToken(uid);
    const auth = await authCustomToken(custom);

    const res = await fetchJson(dbUrl(`players/${uid}`, auth.idToken), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    if (res.status !== 200) {
      throw new Error(`fixture ${id} write denied: ${res.status} ${res.body}`);
    }

    const patch = { ...data, coins: (data.coins || 0) + 1, lastSeen: Date.now() };
    const res2 = await fetchJson(dbUrl(`players/${uid}`, auth.idToken), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    if (res2.status !== 200) {
      throw new Error(`fixture ${id} PATCH denied: ${res2.status} ${res2.body}`);
    }
    console.log(`  OK ${id} (pet=${JSON.stringify(data.pet)})`);
  }

  console.log("save-fixtures: all PASS");
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
