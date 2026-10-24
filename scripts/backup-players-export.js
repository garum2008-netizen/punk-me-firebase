#!/usr/bin/env node
/**
 * Export entire /players tree to a timestamped JSON file (owner runs locally).
 * Does not delete or modify live data.
 *
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
 *   node scripts/backup-players-export.js
 *   node scripts/backup-players-export.js --out ./backups/players-2026-10-24.json
 */
const fs = require("fs");
const path = require("path");

function parseArgs() {
  const outArg = process.argv.find(a => a.startsWith("--out="));
  return { out: outArg ? outArg.split("=")[1] : null };
}

async function main() {
  const { out } = parseArgs();
  let admin;
  try {
    admin = require("firebase-admin");
  } catch {
    console.error("Install firebase-admin locally: npm install firebase-admin");
    process.exit(1);
  }
  if (!admin.apps.length) {
    const url =
      process.env.FIREBASE_DATABASE_URL ||
      "https://punk-me-40605-default-rtdb.europe-west1.firebasedatabase.app";
    admin.initializeApp({ databaseURL: url });
  }
  const db = admin.database();
  console.log("Reading /players (shallow=false) — may take a minute…");
  const snap = await db.ref("players").once("value");
  const data = snap.val() || {};
  const count = Object.keys(data).length;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file =
    out || path.join(process.cwd(), "backups", `players-export-${stamp}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ exportedAt: new Date().toISOString(), count, players: data }, null, 2));
  console.log(`Wrote ${count} player records to ${file}`);
  console.log("Keep this file private — contains player saves.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
