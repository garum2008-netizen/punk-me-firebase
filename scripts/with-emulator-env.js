#!/usr/bin/env node
/** Run a child script with FIREBASE_* emulator env from firebase.json. */
const { spawnSync } = require("child_process");
const { applyFirebaseEmulatorEnv } = require("./firebase-emulator-env");

applyFirebaseEmulatorEnv();
const args = process.argv.slice(2);
if (!args.length) {
  console.error("usage: node scripts/with-emulator-env.js <command...>");
  process.exit(1);
}
const r = spawnSync(args[0], args.slice(1), { stdio: "inherit", env: process.env, shell: false });
process.exit(r.status ?? 1);
