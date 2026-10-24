#!/usr/bin/env node
/**
 * Set Firebase Auth custom claim { admin: true } for the owner account.
 * Run ONLY on your machine with a service account — never in CI/cloud agents.
 *
 * Prerequisites:
 *   npm install firebase-admin
 *   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
 *
 * Usage:
 *   node scripts/set-admin-claim.mjs --email garum2008@gmail.com
 *   node scripts/set-admin-claim.mjs --uid FIREBASE_AUTH_UID
 *
 * After setting claims, the user must sign out and sign in again (refresh ID token).
 */
import { createRequire } from "module";

const require = createRequire(import.meta.url);

function parseArgs() {
  const args = process.argv.slice(2);
  const email = (args.find(a => a.startsWith("--email=")) || "").split("=")[1];
  const uid = (args.find(a => a.startsWith("--uid=")) || "").split("=")[1];
  const remove = args.includes("--remove");
  return { email, uid, remove };
}

async function main() {
  const { email, uid, remove } = parseArgs();
  if (!email && !uid) {
    console.error("Provide --email=... or --uid=...");
    process.exit(1);
  }
  let admin;
  try {
    admin = require("firebase-admin");
  } catch {
    console.error("Install firebase-admin: npm install firebase-admin");
    process.exit(1);
  }
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  }
  let targetUid = uid;
  if (!targetUid && email) {
    const user = await admin.auth().getUserByEmail(email);
    targetUid = user.uid;
  }
  const claims = remove ? { admin: false } : { admin: true };
  await admin.auth().setCustomUserClaims(targetUid, claims);
  console.log(`Custom claims for ${targetUid}:`, claims);
  console.log("Owner must sign out and sign in again for claims to apply.");
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
