/**
 * Block Playwright/capture scripts from hitting production Firebase or live site DB.
 * Requires FIREBASE_EMULATOR=1 and PUNK_BASE on localhost (or 127.0.0.1).
 */
const { URL } = require("url");

const PROD_HOST_SUFFIXES = [
  "halloween.punk.contractbot.dk",
  "punk.contractbot.dk",
  "punk-me-40605.firebaseapp.com",
  "punk-me-40605.web.app",
  "punk-me-40605-default-rtdb.europe-west1.firebasedatabase.app"
];

function hostLooksLikeProd(hostname) {
  const h = String(hostname || "").toLowerCase();
  if (!h) return true;
  if (h === "localhost" || h === "127.0.0.1") return false;
  return PROD_HOST_SUFFIXES.some(s => h === s || h.endsWith("." + s));
}

function assertNoProductionBase() {
  if (process.env.PUNK_ALLOW_PROD_TESTS === "1") {
    console.error("BLOCKED: production test runs are not allowed.");
    process.exit(2);
  }
  const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
  let host;
  try {
    host = new URL(base).hostname;
  } catch (e) {
    console.error("BLOCKED: invalid PUNK_BASE", base);
    process.exit(2);
  }
  if (hostLooksLikeProd(host)) {
    console.error("BLOCKED: PUNK_BASE must be localhost — got", base);
    process.exit(2);
  }
}

function assertSafeTestFirebaseTarget() {
  assertNoProductionBase();
  if (process.env.FIREBASE_EMULATOR !== "1") {
    console.error(
      "BLOCKED: Set FIREBASE_EMULATOR=1 and start emulators before RTDB/auth tests."
    );
    process.exit(2);
  }
}

module.exports = { assertSafeTestFirebaseTarget, assertNoProductionBase, hostLooksLikeProd };
