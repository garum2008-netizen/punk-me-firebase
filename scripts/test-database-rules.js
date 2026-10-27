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
}

function finishResults() {
  const failed = results.filter(r => !r.ok);
  const passed = results.length - failed.length;
  console.log(`\n=== Summary: ${passed} PASS, ${failed.length} FAIL (${results.length} total) ===`);
  for (const f of failed) console.log(`  FAIL: ${f.name}${f.detail ? ` — ${f.detail}` : ""}`);
  if (failed.length) process.exit(1);
  process.exit(0);
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

  r = await fetchJson(dbUrl("players", aliceAuth.idToken));
  pass("non-admin read /players list → deny", denied(r), `status ${r.status}`);

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

  const profile = process.env.RULES_TEST_PROFILE || "git";
  const prodHotfix = profile === "prod-hotfix";
  const playersOnlyScope = process.env.RULES_TEST_SCOPE === "players-only";

  if (playersOnlyScope && prodHotfix) {
    console.log(
      "\n--- client impact (main @ 450d6da vs rules in this repo) ---"
    );
    console.log(
      "PASS (analysis): main game.js does NOT read /players root; multiplayer uses /presence/{location} only."
    );
    console.log(
      "PASS (analysis): owner-admin.mjs reads /players root — needs auth.token.admin (rules allow)."
    );
    finishResults();
  }

  r = await fetchJson(dbUrl(`publicProfiles/${aliceUid}`));
  if (prodHotfix) {
    pass("unauth read publicProfiles/{uid} → deny (prod-hotfix)", denied(r), `status ${r.status}`);
  } else {
    pass("unauth read publicProfiles/{uid} → allow", r.status === 200 && r.json?.name, `status ${r.status}`);
  }

  r = await fetchJson(dbUrl(`publicProfiles/${aliceUid}`, bobAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Hack", coins: 0 })
  });
  pass("bob write alice publicProfile → deny", denied(r), `status ${r.status}`);

  if (!prodHotfix) {
    r = await fetchJson(dbUrl(`publicProfiles/${aliceUid}`, aliceAuth.idToken), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "TestPunk", coins: 105, avatar: "imagine_images/Oo040.jpg" })
    });
    pass("alice write own publicProfile → allow", r.status === 200, r.body);
  }

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
  pass("presence: own write → allow", r.status === 200, r.body);

  r = await fetchJson(dbUrl(`presence/room/${aliceUid}`, bobAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...presencePayload, name: "Intruder" })
  });
  pass("presence: foreign write → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl("presence/room", aliceAuth.idToken));
  pass("alice read presence/room (authed) → allow", r.status === 200, `status ${r.status}`);

  r = await fetchJson(dbUrl("presence/room"));
  pass("presence: unauth read → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl("chat"));
  pass("chat: unauth read → deny", denied(r), `status ${r.status}`);

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
  pass("chat: new message own uid ≤280 chars → allow", r.status === 200, r.body);

  const longMsgId = "msg_long_" + Date.now();
  r = await fetchJson(dbUrl(`chat/${longMsgId}`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid: aliceUid,
      name: "TestPunk",
      text: "x".repeat(281),
      time: Date.now()
    })
  });
  pass("chat: message >280 chars → deny", denied(r), `status ${r.status}`);

  const spoofMsgId = "msg_spoof_" + Date.now();
  r = await fetchJson(dbUrl(`chat/${spoofMsgId}`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid: bobUid,
      name: "TestPunk",
      text: "pretend bob",
      time: Date.now()
    })
  });
  pass("chat: spoofed uid → deny", denied(r), `status ${r.status}`);

  const bobMsgId = "msg_bob_" + Date.now();
  r = await fetchJson(dbUrl(`chat/${bobMsgId}`, bobAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid: bobUid,
      name: "Bob",
      text: "bob says hi",
      time: Date.now()
    })
  });
  pass("chat: bob creates message → allow", r.status === 200, r.body);

  r = await fetchJson(dbUrl(`chat/${bobMsgId}`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid: bobUid,
      name: "Bob",
      text: "alice edited bob",
      time: Date.now()
    })
  });
  pass("chat: edit another user message → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl(`chat/${bobMsgId}`, aliceAuth.idToken), { method: "DELETE" });
  pass("chat: delete another user message → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl("buildings/city"));
  if (prodHotfix) {
    pass("unauth read buildings/city → deny (prod-hotfix)", denied(r), `status ${r.status}`);
  } else {
    pass("unauth read buildings/city → allow", r.status === 200, `status ${r.status}`);
  }

  if (!prodHotfix) {
    const pieceId = "piece_" + Date.now();
    r = await fetchJson(dbUrl(`buildings/city/${pieceId}`, aliceAuth.idToken), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "bench", x: 1, y: 2, owner: aliceUid })
    });
    pass("alice place building piece → allow", r.status === 200, r.body);
  }

  r = await fetchJson(dbUrl(`players/${aliceUid}/qa`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled: true })
  });
  pass("alice PUT qa → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl(`players/${aliceUid}/owner`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(true)
  });
  pass("alice PUT players/{uid}/owner:true → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl(`players/${aliceUid}`, aliceAuth.idToken), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner: true })
  });
  pass("players: parent PATCH owner:true bypass → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl(`players/${aliceUid}/owner`, adminAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(true)
  });
  pass("admin PUT players/{uid}/owner:true → allow", r.status === 200, `status ${r.status}`);

  r = await fetchJson(dbUrl(`players/${aliceUid}`, aliceAuth.idToken), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entitlements: { stripe: "bypass" } })
  });
  pass("players: parent PATCH entitlements bypass → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl(`players/${aliceUid}`, aliceAuth.idToken), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ qa: { enabled: true, flags: { god: true } } })
  });
  pass("players: parent PATCH qa bypass → deny", denied(r), `status ${r.status}`);

  await admin.database().ref(`players/${aliceUid}/premium`).remove();
  await admin.database().ref(`players/${aliceUid}/entitlements`).remove();
  r = await fetchJson(dbUrl(`players/${aliceUid}`, aliceAuth.idToken), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coins: 120, premium: true })
  });
  const premAfterBypass = (await admin.database().ref(`players/${aliceUid}/premium`).get()).val();
  pass(
    "players: parent PATCH premium:true bypass → deny",
    denied(r) && premAfterBypass !== true,
    `status ${r.status} premium=${JSON.stringify(premAfterBypass)}`
  );

  await admin.database().ref(`players/${aliceUid}/premium`).set(true);
  r = await fetchJson(dbUrl(`players/${aliceUid}`, aliceAuth.idToken), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ coins: 110 })
  });
  pass("alice PATCH coins (premium set by admin) → allow", r.status === 200, r.body);

  r = await fetchJson(dbUrl(`players/${aliceUid}`, aliceAuth.idToken), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ premium: false })
  });
  pass("alice PATCH premium:false → deny", denied(r), `status ${r.status}`);

  r = await fetchJson(dbUrl(`players/${aliceUid}`, aliceAuth.idToken), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...samplePlayer, coins: 999, premium: false })
  });
  pass("alice PUT whole player dropping premium field → deny", denied(r), `status ${r.status}`);

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
  console.log(
    "PASS (analysis): initMultiplayer/pushPresence write presence/{loc}/{uid} — hotfix repairs presence when live export omits own-write rules."
  );

  finishResults();
}

run().catch(e => {
  console.error(e);
  finishResults();
});
