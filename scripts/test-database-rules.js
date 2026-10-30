#!/usr/bin/env node
/**
 * RTDB security rules tests against local Database + Auth emulators.
 * Implements the acceptance matrix required for TASK 02 (equivalent to
 * @firebase/rules-unit-testing scenarios; HTTP harness avoids SDK double-init).
 *
 * Requires emulators on 127.0.0.1:9000 (database) and :9099 (auth).
 */
const http = require("http");
const https = require("https");

const PROJECT_ID = process.env.FIREBASE_EMULATOR_PROJECT || "punk-me-40605";
const DB_HOST = "127.0.0.1";
const DB_PORT = 9000;
const AUTH_HOST = "127.0.0.1";
const AUTH_PORT = 9099;
const DB_NS = `${PROJECT_ID}-default-rtdb`;

const samplePlayer = {
  name: "TestPunk",
  coins: 100,
  xp: 0,
  level: 1,
  rep: 0,
  location: "room",
  x: 50,
  y: 55,
  avatar: "imagine_images/Oo040.jpg",
  owned: { "0": "jacket" },
  inventory: { materials: { brick: 0 } },
  quests: { progress: { onboarding: 1 } },
  story: { chapter: 0 },
  stats: { fights: 0 },
  jobCooldowns: { clean: 0 },
  energy: 100,
  mood: 100,
  lastSeen: Date.now(),
  characterId: "cobalt",
  gang_rank: "newbie",
  lang: "en"
};

function fetchJson(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(url, { method: opts.method || "GET", headers: opts.headers || {} }, res => {
      let body = "";
      res.on("data", c => (body += c));
      res.on("end", () => {
        let json = null;
        try {
          json = body ? JSON.parse(body) : null;
        } catch (_) {
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

async function authSignUp() {
  const url = `http://${AUTH_HOST}:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`;
  const body = JSON.stringify({});
  const res = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });
  if (res.status !== 200 || !res.json?.idToken) {
    throw new Error(`signUp failed: ${res.status} ${res.body}`);
  }
  return res.json;
}

async function authCustomToken(customToken) {
  const url = `http://${AUTH_HOST}:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`;
  const body = JSON.stringify({ token: customToken, returnSecureToken: true });
  const res = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });
  if (res.status !== 200 || !res.json?.idToken) {
    throw new Error(`custom token sign-in failed: ${res.status} ${res.body}`);
  }
  return res.json;
}

async function seedPlayers(admin, aliceUid, bobUid) {
  await admin.database().ref(`players/${aliceUid}`).set(samplePlayer);
  await admin.database().ref(`players/${bobUid}`).set({ ...samplePlayer, name: "Bob" });
  await admin.database().ref(`publicProfiles/${aliceUid}`).set({
    name: "TestPunk",
    avatar: "imagine_images/Oo040.jpg",
    coins: 100
  });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
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

  const aliceAuth = await authSignUp();
  const bobAuth = await authSignUp();
  await seedPlayers(admin, aliceAuth.localId, bobAuth.localId);
  const custom = await admin.auth().createCustomToken("admin-user", { admin: true });
  const adminAuth = await authCustomToken(custom);
  const aliceUid = aliceAuth.localId;
  const bobUid = bobAuth.localId;

  console.log("rules: unauth read /players → deny");
  let r = await fetchJson(dbUrl("players"));
  assert(r.status === 401 || (r.json && r.json.error), `expected deny, got ${r.status}`);

  console.log("rules: unauth read /players/{uid} → deny");
  r = await fetchJson(dbUrl(`players/${aliceUid}`));
  assert(r.status === 401 || r.json?.error, `expected deny, got ${r.status}`);

  console.log("rules: alice read own → allow");
  r = await fetchJson(dbUrl(`players/${aliceUid}`, aliceAuth.idToken));
  assert(r.status === 200, `alice own read: ${r.status}`);

  console.log("rules: alice read bob → deny");
  r = await fetchJson(dbUrl(`players/${bobUid}`, aliceAuth.idToken));
  assert(r.status === 401 || r.json?.error, `expected deny, got ${r.status}`);

  console.log("rules: alice write own coins");
  r = await fetchJson(dbUrl(`players/${aliceUid}/coins`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(101)
  });
  assert(r.status === 200, `alice write own: ${r.status} ${r.body}`);

  console.log("rules: guest (anon) write own settings + dialogueHeard");
  r = await fetchJson(dbUrl(`players/${aliceUid}/settings`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ audio: { music: 0.5, speech: 0.8 } })
  });
  assert(r.status === 200, `guest settings: ${r.status} ${r.body}`);
  r = await fetchJson(dbUrl(`players/${aliceUid}/dialogueHeard`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ npc_razor_0: true })
  });
  assert(r.status === 200, `guest dialogueHeard: ${r.status} ${r.body}`);

  console.log("rules: alice write pet string (pet_dog)");
  r = await fetchJson(dbUrl(`players/${aliceUid}/pet`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify("pet_dog")
  });
  assert(r.status === 200, `alice pet string: ${r.status} ${r.body}`);

  console.log("rules: bob write alice → deny");
  r = await fetchJson(dbUrl(`players/${aliceUid}/coins`, bobAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(1)
  });
  assert(r.status === 401 || r.json?.error, `expected deny, got ${r.status}`);

  console.log("rules: admin read /players root → allow");
  r = await fetchJson(dbUrl("players", adminAuth.idToken));
  assert(r.status === 200 && r.json && typeof r.json === "object", `admin root: ${r.status}`);

  console.log("rules: admin read bob → allow");
  r = await fetchJson(dbUrl(`players/${bobUid}`, adminAuth.idToken));
  assert(r.status === 200, `admin bob: ${r.status}`);

  console.log("rules: publicProfiles read without auth → allow");
  r = await fetchJson(dbUrl(`publicProfiles/${aliceUid}`));
  assert(r.status === 200 && r.json?.name, `public profile: ${r.status}`);

  console.log("rules: bob write alice publicProfile → deny");
  r = await fetchJson(dbUrl(`publicProfiles/${aliceUid}`, bobAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Hack", coins: 0 })
  });
  assert(r.status === 401 || r.json?.error, `expected deny, got ${r.status}`);

  const presencePayload = {
    name: "TestPunk",
    x: 50,
    y: 55,
    ts: Date.now(),
    level: 1,
    characterId: "cobalt",
    anim: "idle",
    avatar: "imagine_images/Oo040.jpg"
  };

  console.log("rules: unauth write presence → deny");
  r = await fetchJson(dbUrl(`presence/room/${aliceUid}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(presencePayload)
  });
  assert(r.status === 401 || r.json?.error, `expected deny, got ${r.status}`);

  console.log("rules: alice write own presence → allow");
  r = await fetchJson(dbUrl(`presence/room/${aliceUid}`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(presencePayload)
  });
  assert(r.status === 200, `alice presence: ${r.status} ${r.body}`);

  console.log("rules: bob write alice presence → deny");
  r = await fetchJson(dbUrl(`presence/room/${aliceUid}`, bobAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...presencePayload, name: "Intruder" })
  });
  assert(r.status === 401 || r.json?.error, `expected deny, got ${r.status}`);

  console.log("rules: presence read without auth → allow");
  r = await fetchJson(dbUrl("presence/room"));
  assert(r.status === 200, `presence read: ${r.status}`);

  console.log("rules: invalid presence (missing name) → deny");
  r = await fetchJson(dbUrl(`presence/room/${aliceUid}`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x: 1, y: 2, ts: Date.now() })
  });
  assert(r.status === 401 || r.json?.error, `expected deny invalid presence, got ${r.status}`);

  console.log("\nAll database rules tests passed.");
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
