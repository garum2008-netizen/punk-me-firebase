#!/usr/bin/env node
/**
 * Read-only export of /players to a timestamped JSON file (owner runs locally).
 * Does not delete or modify live data.
 *
 * No service-account JSON files in the repo. Use Application Default Credentials:
 *   gcloud auth application-default login
 *   gcloud auth application-default set-quota-project punk-me-40605
 *
 * Usage:
 *   node scripts/backup-players-export.js
 *   node scripts/backup-players-export.js --out ./backups/players-2026-10-24.json
 *   node scripts/backup-players-export.js --out=./backups/players.json
 *   node scripts/backup-players-export.js --dry-run
 *   node scripts/backup-players-export.js --help
 *
 * Emulator (local test only):
 *   FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 node scripts/backup-players-export.js --dry-run
 */
const fs = require("fs");
const path = require("path");

const PROJECT_ID = "punk-me-40605";
const PROD_DATABASE_URL =
  "https://punk-me-40605-default-rtdb.europe-west1.firebasedatabase.app";

const HELP = `backup-players-export.js — read-only /players export (ADC, no key files)

Usage:
  node scripts/backup-players-export.js
  node scripts/backup-players-export.js --out <path>
  node scripts/backup-players-export.js --out=<path>
  node scripts/backup-players-export.js --dry-run  (read + print count; no file write)
  node scripts/backup-players-export.js --help

Auth (owner Mac or Cloud Shell):
  gcloud auth application-default login
  gcloud auth application-default set-quota-project ${PROJECT_ID}
`;

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    return { help: true };
  }
  const dryRun = args.includes("--dry-run");
  let out = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--out" && args[i + 1] && !args[i + 1].startsWith("--")) {
      out = args[++i];
      continue;
    }
    if (a.startsWith("--out=")) {
      out = a.slice("--out=".length);
    }
  }
  return { help: false, out, dryRun };
}

function databaseUrlForAdmin() {
  const emu = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  if (emu) {
    const [host, port] = emu.split(":");
    const ns = `${PROJECT_ID}-default-rtdb`;
    return `http://${host}:${port}/?ns=${ns}`;
  }
  return process.env.FIREBASE_DATABASE_URL || PROD_DATABASE_URL;
}

function initAdmin(admin) {
  if (admin.apps.length) return;
  const opts = {
    projectId: PROJECT_ID,
    databaseURL: databaseUrlForAdmin()
  };
  if (process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    admin.initializeApp(opts);
  } else {
    admin.initializeApp({
      ...opts,
      credential: admin.credential.applicationDefault()
    });
  }
}

async function main() {
  const parsed = parseArgs(process.argv);
  if (parsed.help) {
    console.log(HELP);
    process.exit(0);
  }
  const { out, dryRun } = parsed;
  let admin;
  try {
    admin = require("firebase-admin");
  } catch {
    console.error("Install firebase-admin locally: npm install firebase-admin");
    process.exit(1);
  }
  initAdmin(admin);
  const db = admin.database();
  const target = databaseUrlForAdmin();
  console.log(`Database: ${target}${dryRun ? " (dry-run)" : ""}`);
  console.log("Reading /players (read-only) — may take a minute…");
  const snap = await db.ref("players").once("value");
  const data = snap.val() || {};
  const count = Object.keys(data).length;
  if (dryRun) {
    console.log(`dry-run: would export ${count} player record(s); no file written.`);
    process.exit(0);
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const file = out || path.join(process.cwd(), "backups", `players-export-${stamp}.json`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(
    file,
    JSON.stringify({ exportedAt: new Date().toISOString(), count, players: data }, null, 2)
  );
  console.log(`Wrote ${count} player records to ${file}`);
  console.log("Keep this file private — contains player saves.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
