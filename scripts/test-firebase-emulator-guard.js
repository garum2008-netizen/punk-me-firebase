#!/usr/bin/env node
/** Firebase tests must never reach prod punk-me-40605 without emulators. */
const {
  assertFirebaseEmulatorTestEnv,
  firebaseEmulatorQueryString,
  assertAllPlaywrightTestsHaveFirebaseGuard,
  PROD_PROJECT_ID
} = require("./firebase-test-emulator-guard");
const { isProdFirebaseHostname } = require("./firebase-prod-guard");

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  }
}

const saved = { ...process.env };
const { applyFirebaseEmulatorEnv } = require("./firebase-emulator-env");
applyFirebaseEmulatorEnv();

try {
  delete process.env.FIREBASE_EMULATOR;
  delete process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  let threw = false;
  try {
    assertFirebaseEmulatorTestEnv();
  } catch (e) {
    threw = true;
  }
  assert(threw, "missing FIREBASE_EMULATOR + hosts must throw (no default ports)");

  applyFirebaseEmulatorEnv();
  assertFirebaseEmulatorTestEnv();
  assert(firebaseEmulatorQueryString().includes("firebaseEmulator=1"), "emulator query string");

  process.env.FIREBASE_DATABASE_EMULATOR_HOST = `${PROD_PROJECT_ID}-default-rtdb.firebaseio.com:443`;
  threw = false;
  try {
    assertFirebaseEmulatorTestEnv();
  } catch (e) {
    threw = true;
  }
  assert(threw, "prod-like db emulator host must throw");

  assert(
    isProdFirebaseHostname("punk-me-40605-default-rtdb.europe-west1.firebasedatabase.app"),
    "prod RTDB host detected"
  );
  assert(isProdFirebaseHostname("identitytoolkit.googleapis.com"), "identitytoolkit is prod");
  assert(!isProdFirebaseHostname("127.0.0.1"), "localhost not prod");
} finally {
  for (const k of Object.keys(process.env)) {
    if (!(k in saved)) delete process.env[k];
  }
  Object.assign(process.env, saved);
}

failed += assertAllPlaywrightTestsHaveFirebaseGuard();

if (failed) {
  console.error(`test-firebase-emulator-guard: ${failed} failed`);
  process.exit(1);
}
console.log("test-firebase-emulator-guard: PASS");
