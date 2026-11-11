#!/usr/bin/env node
/**
 * Set Firebase Auth custom claim { admin: true } for the owner account.
 * Run ONLY on the owner's machine or Google Cloud Shell — never in CI/cloud agents.
 *
 * No service-account JSON files in the repo. Use Application Default Credentials:
 *   gcloud auth application-default login
 *   gcloud auth application-default set-quota-project punk-me-40605
 *
 * Usage:
 *   node scripts/set-admin-claim.mjs --email garum2008@gmail.com
 *   node scripts/set-admin-claim.mjs --email=garum2008@gmail.com
 *   node scripts/set-admin-claim.mjs --uid FIREBASE_AUTH_UID
 *   node scripts/set-admin-claim.mjs --email you@example.com --remove
 *   node scripts/set-admin-claim.mjs --help
 *   node scripts/set-admin-claim.mjs --dry-run --email test@example.com
 *
 * Emulator (local test only): FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
 *
 * After setting claims, the user must sign out and sign in again (refresh ID token).
 */
import { createRequire } from "module";

const require = createRequire(import.meta.url);

const PROJECT_ID = "punk-me-40605";

const HELP = `set-admin-claim.mjs — owner admin Custom Claim (ADC, no key files)

Usage:
  node scripts/set-admin-claim.mjs --email <address>
  node scripts/set-admin-claim.mjs --email=<address>
  node scripts/set-admin-claim.mjs --uid <firebase-auth-uid>
  node scripts/set-admin-claim.mjs --remove   (with --email or --uid → admin: false)
  node scripts/set-admin-claim.mjs --dry-run  (print only; no claim write)
  node scripts/set-admin-claim.mjs --help

Auth (owner Mac or Cloud Shell):
  gcloud auth application-default login
  gcloud auth application-default set-quota-project ${PROJECT_ID}
`;

function parseArgs(argv) {
  const args = argv.slice(2);
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    return { help: true };
  }
  const remove = args.includes("--remove");
  const dryRun = args.includes("--dry-run");
  let email;
  let uid;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--email" && args[i + 1] && !args[i + 1].startsWith("--")) {
      email = args[++i];
      continue;
    }
    if (a.startsWith("--email=")) {
      email = a.slice("--email=".length);
      continue;
    }
    if (a === "--uid" && args[i + 1] && !args[i + 1].startsWith("--")) {
      uid = args[++i];
      continue;
    }
    if (a.startsWith("--uid=")) {
      uid = a.slice("--uid=".length);
      continue;
    }
  }
  return { help: false, email, uid, remove, dryRun };
}

function initAdmin(admin) {
  if (admin.apps.length) return;
  const opts = { projectId: PROJECT_ID };
  if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
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
  const { email, uid, remove, dryRun } = parsed;
  if (!email && !uid) {
    console.error("Provide --email or --uid (see --help).");
    process.exit(1);
  }
  let admin;
  try {
    admin = require("firebase-admin");
  } catch {
    console.error("Install firebase-admin: npm install firebase-admin");
    process.exit(1);
  }
  initAdmin(admin);
  const emulator = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  if (emulator) {
    console.log(`Auth emulator: ${emulator}`);
  }
  let targetUid = uid;
  if (!targetUid && email) {
    try {
      const user = await admin.auth().getUserByEmail(email);
      targetUid = user.uid;
    } catch (e) {
      if (dryRun && emulator) {
        console.log(`dry-run: would look up email ${email} (user not in emulator: ${e.message})`);
        process.exit(0);
      }
      throw e;
    }
  }
  const claims = remove ? { admin: false } : { admin: true };
  if (dryRun) {
    console.log("dry-run: would set custom claims", { uid: targetUid, email: email || "(uid only)", claims });
    process.exit(0);
  }
  await admin.auth().setCustomUserClaims(targetUid, claims);
  console.log(`Custom claims for ${targetUid}:`, claims);
  console.log("Owner must sign out and sign in again for claims to apply.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
