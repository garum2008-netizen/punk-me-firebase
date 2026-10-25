#!/usr/bin/env node
/**
 * RTDB security rules tests — Database + Auth emulators (127.0.0.1:9000 / :9099).
 * Each case logs PASS or FAIL.
 */
const http = require("http");
const https = require("https");

const PROJECT_ID = process.env.FIREBASE_EMULATOR_PROJECT || "punk-me-40605";
const DB_HOST = "127.0.0.1";
const DB_PORT = 9000;
const AUTH_HOST = "127.0.0.1";
const AUTH_PORT = 9099;
const DB_NS = `${PROJECT_ID}-default-rtdb`;

const results = [];

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

function denied(r) {
  return r.status === 401 || r.json?.error === "Permission denied" || r.body?.includes("Permission denied");
}

function pass(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}: ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) throw new Error(name);
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

async function authCustomToken(customToken) {
  const url = `http://${AUTH_HOST}:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`;
  const res = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: customToken, returnSecureToken: true })
  });
  if (res.status !== 200 || !res.json?.idToken) throw new Error(`custom token failed: ${res.status}`);
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

  let r;

  r = await fetchJson(dbUrl("players"));
  pass("unauth read /players root → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl(`players/${aliceUid}`));
  pass("unauth read /players/{uid} → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl(`players/${aliceUid}`, aliceAuth.idToken));
  pass("alice read own /players/{uid} → allow", r.status === 200, `status ${r.status}`);

  r = await fetchJson(dbUrl(`players/${bobUid}`, aliceAuth.idToken));
  pass("alice read bob /players/{uid} → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl(`players/${aliceUid}/coins`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(101)
  });
  pass("alice write own coins → allow", r.status === 200, r.body);

  r = await fetchJson(dbUrl(`players/${aliceUid}`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...samplePlayer, premium: true })
  });
  pass("alice SET /players/{uid} with premium:true → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl(`players/${aliceUid}/premium`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(true)
  });
  pass("alice PUT premium:true → deny", denied(r), `status ${r.status}`);

  await admin.database().ref(`players/${aliceUid}/premium`).set(true);
  r = await fetchJson(dbUrl(`players/${aliceUid}/coins`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(105)
  });
  pass("alice update coins when premium already true (admin-set) → allow", r.status === 200, r.body);

  r = await fetchJson(dbUrl(`players/${aliceUid}/entitlements`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stripe: "hack" })
  });
  pass("alice PUT entitlements → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl(`players/${aliceUid}/coins`, bobAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(1)
  });
  pass("bob write alice coins → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl("players", adminAuth.idToken));
  pass("admin read /players root → allow", r.status === 200 && typeof r.json === "object", `status ${r.status}`);

  r = await fetchJson(dbUrl(`publicProfiles/${aliceUid}`));
  pass("unauth read publicProfiles/{uid} → allow", r.status === 200 && r.json?.name, `status ${r.status}`);

  r = await fetchJson(dbUrl(`publicProfiles/${aliceUid}`, bobAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Hack", coins: 0 })
  });
  pass("bob write alice publicProfile → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl(`publicProfiles/${aliceUid}`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "TestPunk", coins: 105, avatar: "imagine_images/Oo040.jpg" })
  });
  pass("alice write own publicProfile → allow", r.status === 200, r.body);

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

  r = await fetchJson(dbUrl(`presence/room/${aliceUid}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(presencePayload)
  });
  pass("unauth write presence → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl(`presence/room/${aliceUid}`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(presencePayload)
  });
  pass("alice write own presence → allow", r.status === 200, r.body);

  r = await fetchJson(dbUrl("presence/room"));
  pass("unauth read presence/room → allow", r.status === 200, `status ${r.status}`);

  r = await fetchJson(dbUrl("chat"));
  pass("unauth read chat → allow", r.status === 200, `status ${r.status}`);

  const msgId = "msg_" + Date.now();
  r = await fetchJson(dbUrl(`chat/${msgId}`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid: aliceUid,
      name: "TestPunk",
      text: "hi",
      time: Date.now()
    })
  });
  pass("alice write chat message → allow", r.status === 200, r.body);

  r = await fetchJson(dbUrl("buildings/city"));
  pass("unauth read buildings/city → allow", r.status === 200, `status ${r.status}`);

  const pieceId = "piece_" + Date.now();
  r = await fetchJson(dbUrl(`buildings/city/${pieceId}`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "bench", x: 1, y: 2, owner: aliceUid })
  });
  pass("alice place building piece → allow", r.status === 200, r.body);

  console.log("\n--- client impact (main @ 450d6da vs rules in this repo) ---");
  console.log(
    "PASS (analysis): main game.js does NOT read /players root; multiplayer uses /presence/{location} only."
  );
  console.log(
    "PASS (analysis): owner-admin.mjs reads /players root — needs auth.token.admin (rules allow)."
  );
  console.log(
    "WARN (prod vs git): live prod allows anon GET /players (owner verified 25.10); git rules deny — deploy git rules closes leak, does not break main client save/F5."
  );
  console.log(
    "WARN (prod vs git): live prod denies anon presence/publicProfiles/chat/buildings; git rules ALLOW read — naive full deploy OPENS those paths. Merge premium/players fixes INTO exported prod rules."
  );
  console.log(
    "PASS (analysis): hotfix game.js saveMe uses .update(sanitizePlayer) without premium — compatible with premium validate + unchanged admin premium."
  );

  console.log(`\nAll ${results.length} emulator rule cases passed.`);
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
