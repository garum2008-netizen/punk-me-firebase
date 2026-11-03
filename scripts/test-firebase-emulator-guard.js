#!/usr/bin/env node
/** Firebase tests must never reach prod punk-me-40605 without emulators. */
const {
  assertFirebaseEmulatorTestEnv,
  firebaseEmulatorQueryString,
  PROD_PROJECT_ID
} = require("./firebase-test-emulator-guard");
const { isProdFirebaseHostname } = require("./firebase-prod-guard");

const DEFAULT_DB_EMULATOR = "127.0.0.1:9000";
let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  }
}

const saved = { ...process.env };

try {
  delete process.env.FIREBASE_EMULATOR;
  delete process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  assertFirebaseEmulatorTestEnv();
  assert(process.env.FIREBASE_EMULATOR === "1", "defaults FIREBASE_EMULATOR=1");
  assert(
    process.env.FIREBASE_DATABASE_EMULATOR_HOST === DEFAULT_DB_EMULATOR,
    "defaults db emulator host"
  );

  process.env.FIREBASE_DATABASE_EMULATOR_HOST = `${PROD_PROJECT_ID}-default-rtdb.firebaseio.com:443`;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.FIREBASE_EMULATOR = "1";
  let threw = false;
  try {
    assertFirebaseEmulatorTestEnv();
  } catch (e) {
    threw = true;
  }
  assert(threw, "prod-like db emulator host must throw");

  process.env.FIREBASE_DATABASE_EMULATOR_HOST = DEFAULT_DB_EMULATOR;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.FIREBASE_EMULATOR = "1";
  assert(firebaseEmulatorQueryString().includes("firebaseEmulator=1"), "emulator query string");

  assert(
    isProdFirebaseHostname("punk-me-40605-default-rtdb.europe-west1.firebasedatabase.app"),
    "prod RTDB host detected"
  );
  assert(
    isProdFirebaseHostname("identitytoolkit.googleapis.com"),
    "identitytoolkit is prod"
  );
  assert(!isProdFirebaseHostname("127.0.0.1"), "localhost not prod");
} finally {
  for (const k of Object.keys(process.env)) {
    if (!(k in saved)) delete process.env[k];
  }
  Object.assign(process.env, saved);
}

if (failed) {
  console.error(`test-firebase-emulator-guard: ${failed} failed`);
  process.exit(1);
}
console.log("test-firebase-emulator-guard: PASS");
