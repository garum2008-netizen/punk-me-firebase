#!/usr/bin/env node
/**
 * READ-ONLY inventory of test accounts and RTDB rows (owner Cloud Shell + ADC).
 * Does NOT write or delete anything.
 *
 *   export GOOGLE_APPLICATION_CREDENTIALS=...  # same as set-admin-claim.mjs
 *   node scripts/list-test-artifacts.mjs --email punktest+1792953969532@contractbot.dk
 *   node scripts/list-test-artifacts.mjs --anon-window 2026-10-25T18:00:00Z/2026-10-25T20:00:00Z
 *
 * Emulator self-test: FIREBASE_AUTH_EMULATOR_HOST + FIREBASE_DATABASE_EMULATOR_HOST set.
 */
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const PROJECT_ID = "punk-me-40605";
const DATABASE_URL =
  process.env.FIREBASE_DATABASE_URL ||
  "https://punk-me-40605-default-rtdb.europe-west1.firebasedatabase.app";

function parseArgs() {
  const args = process.argv.slice(2);
  const email = (args.find(a => a.startsWith("--email=")) || "").split("=")[1];
  const anonWindow = (args.find(a => a.startsWith("--anon-window=")) || "").split("=")[1];
  return { email, anonWindow };
}

function useEmulator() {
  return !!(process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIREBASE_DATABASE_EMULATOR_HOST);
}

async function initAdmin() {
  const admin = require("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: useEmulator() ? `http://${process.env.FIREBASE_DATABASE_EMULATOR_HOST || "127.0.0.1:9000"}?ns=${PROJECT_ID}` : DATABASE_URL,
      projectId: PROJECT_ID
    });
  }
  return admin;
}

async function loadUserByEmail(admin, email) {
  try {
    return await admin.auth().getUserByEmail(email);
  } catch (e) {
    return { error: e.code || e.message };
  }
}

async function readPlayerBundle(db, uid) {
  const [players, profile, presenceHits] = await Promise.all([
    db.ref(`players/${uid}`).get(),
    db.ref(`publicProfiles/${uid}`).get(),
    scanPresenceForUid(db, uid)
  ]);
  return {
    players: players.exists() ? players.val() : null,
    publicProfiles: profile.exists() ? profile.val() : null,
    presence: presenceHits
  };
}

async function scanPresenceForUid(db, uid) {
  const snap = await db.ref("presence").get();
  const hits = [];
  if (!snap.exists()) return hits;
  const tree = snap.val();
  for (const [loc, users] of Object.entries(tree || {})) {
    if (users && typeof users === "object" && users[uid]) {
      hits.push({ location: loc, data: users[uid] });
    }
  }
  return hits;
}

async function listAnonInWindow(admin, fromIso, toIso) {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  const out = [];
  let pageToken;
  do {
    const res = await admin.auth().listUsers(1000, pageToken);
    for (const u of res.users) {
      const created = Date.parse(u.metadata.creationTime);
      const isAnon = !u.providerData?.length || u.providerData.every(p => p.providerId === "anonymous");
      if (!isAnon) continue;
      if (created >= from && created <= to) {
        out.push({
          uid: u.uid,
          creationTime: u.metadata.creationTime,
          lastSignIn: u.metadata.lastSignInTime
        });
      }
    }
    pageToken = res.pageToken;
  } while (pageToken);
  return out;
}

async function countPlayersTouchedInWindow(db, fromIso, toIso) {
  const from = new Date(fromIso).getTime();
  const to = new Date(toIso).getTime();
  const snap = await db.ref("players").get();
  if (!snap.exists()) return { note: "no players node", count: 0, uids: [] };
  let count = 0;
  const uids = [];
  snap.forEach(child => {
    const v = child.val();
    const ts = v?.lastSeen ?? v?.lastJob ?? null;
    if (typeof ts === "number" && ts >= from && ts <= to) {
      count += 1;
      uids.push({ uid: child.key, name: v?.name, lastSeen: ts });
    }
  });
  return {
    count,
    uids: uids.slice(0, 50),
    note:
      "Approximation by lastSeen/lastJob only; no createdAt/updatedAt on all rows — full window audit not provable from RTDB alone."
  };
}

async function main() {
  const { email, anonWindow } = parseArgs();
  const admin = await initAdmin();
  const db = admin.database();
  const report = {
    at: new Date().toISOString(),
    projectId: PROJECT_ID,
    emulator: useEmulator(),
    readOnly: true,
    emailLookup: null,
    anonWindow: null,
    playersWindow: null
  };

  if (email) {
    const user = await loadUserByEmail(admin, email);
    report.emailLookup = {
      email,
      user: user.error
        ? user
        : {
            uid: user.uid,
            providers: user.providerData?.map(p => p.providerId),
            creationTime: user.metadata.creationTime,
            lastSignIn: user.metadata.lastSignInTime,
            disabled: user.disabled
          },
      rtdb: user.uid ? await readPlayerBundle(db, user.uid) : null
    };
  }

  if (anonWindow) {
    const [from, to] = anonWindow.split("/");
    const anon = await listAnonInWindow(admin, from, to);
    const enriched = [];
    for (const row of anon) {
      const bundle = await readPlayerBundle(db, row.uid);
      enriched.push({ ...row, name: bundle.players?.name, ...bundle });
    }
    report.anonWindow = {
      from,
      to,
      count: enriched.length,
      accounts: enriched,
      nameHints: ["Вена17", "Вена41", "Вена57", "Панк746", "Панк913", "Панк956", "Панк268"]
    };
    report.playersWindow = await countPlayersTouchedInWindow(db, from, to);
  }

  if (!email && !anonWindow) {
    report.hint = "Pass --email=... or --anon-window=ISO/ISO";
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
