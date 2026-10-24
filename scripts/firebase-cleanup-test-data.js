#!/usr/bin/env node
/**
 * Dry-run / optional cleanup for PUNK ME Firebase RTDB test accounts.
 * NEVER run --apply without explicit owner approval.
 *
 * Usage:
 *   node scripts/firebase-cleanup-test-data.js --dry-run
 *   node scripts/firebase-cleanup-test-data.js --apply --confirm OWNER_YES
 *
 * Set GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_DATABASE_URL + service account JSON path.
 */
const TEST_NAME_RE = /^(Cobalt\d+|Панк\d+|Player\d+|Vienna\d+|audit|qa-)/i;

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run") || !args.includes("--apply"),
    apply: args.includes("--apply"),
    confirm: (args.find(a => a.startsWith("--confirm=")) || "").split("=")[1]
  };
}

async function main() {
  const { dryRun, apply, confirm } = parseArgs();
  if (apply && confirm !== "OWNER_YES") {
    console.error("Refusing --apply without --confirm=OWNER_YES");
    process.exit(1);
  }
  let admin;
  try {
    admin = require("firebase-admin");
  } catch (e) {
    console.error("Install firebase-admin locally to use this script: npm i firebase-admin");
    process.exit(1);
  }
  if (!admin.apps.length) {
    const url = process.env.FIREBASE_DATABASE_URL || "https://punk-me-40605-default-rtdb.europe-west1.firebasedatabase.app";
    admin.initializeApp({ databaseURL: url });
  }
  const db = admin.database();
  const playersSnap = await db.ref("players").once("value");
  const players = playersSnap.val() || {};
  const toDelete = Object.entries(players).filter(([, p]) => p && TEST_NAME_RE.test(String(p.name || "")));
  console.log(`Players total: ${Object.keys(players).length}`);
  console.log(`Test-like players: ${toDelete.length}`);
  toDelete.slice(0, 20).forEach(([id, p]) => console.log(`  - ${id} ${p.name}`));
  if (toDelete.length > 20) console.log(`  … and ${toDelete.length - 20} more`);

  const chatSnap = await db.ref("chat").limitToLast(500).once("value");
  const chat = chatSnap.val() || {};
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const oldChat = Object.entries(chat).filter(([, m]) => m && (m.time || 0) < weekAgo);
  console.log(`Chat sample old (>7d): ${oldChat.length}`);

  if (dryRun) {
    console.log("\nDry-run only. Re-run with --apply --confirm=OWNER_YES after owner approval.");
    return;
  }
  for (const [id] of toDelete) {
    await db.ref(`players/${id}`).remove();
    await db.ref("presence").once("value").then(s => {
      const v = s.val() || {};
      return Promise.all(
        Object.keys(v).map(loc =>
          db.ref(`presence/${loc}/${id}`).remove().catch(() => {})
        )
      );
    });
  }
  console.log(`Deleted ${toDelete.length} test players (and presence nodes).`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
