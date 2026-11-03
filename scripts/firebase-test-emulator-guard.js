#!/usr/bin/env node
/**
 * Tests that touch Firebase must run against emulators only — never punk-me-40605 prod.
 * Call assertFirebaseEmulatorTestEnv() at the top of Playwright/integration tests.
 */
const fs = require("fs");
const path = require("path");
const { isProdFirebaseHostname } = require("./firebase-prod-guard");

const PROD_PROJECT_ID = "punk-me-40605";
const DEFAULT_DB_EMULATOR = "127.0.0.1:9000";
const DEFAULT_AUTH_EMULATOR = "127.0.0.1:9099";

function parseHostPort(envVal) {
  if (!envVal || typeof envVal !== "string") return null;
  const s = envVal.trim();
  if (!s) return null;
  const [host, port] = s.includes(":") ? s.split(":") : [s, ""];
  return { host: host.toLowerCase(), port: port || "" };
}

function assertLocalEmulatorHost(label, envVal) {
  const p = parseHostPort(envVal);
  if (!p) {
    throw new Error(`${label} must be set (e.g. 127.0.0.1:9000)`);
  }
  if (p.host !== "127.0.0.1" && p.host !== "localhost") {
    throw new Error(`${label} must point at local emulator, got ${envVal}`);
  }
  if (p.host.includes("firebaseio") || p.host.includes("firebasedatabase") || p.host.includes("firebaseapp")) {
    throw new Error(`${label} must not use prod Firebase host: ${envVal}`);
  }
}

/** Ensure process env defaults to emulator before any Firebase network I/O in tests. */
function assertFirebaseEmulatorTestEnv() {
  if (process.env.FIREBASE_EMULATOR !== "1" && process.env.FIREBASE_EMULATOR !== "true") {
    process.env.FIREBASE_EMULATOR = "1";
  }

  if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    process.env.FIREBASE_DATABASE_EMULATOR_HOST = DEFAULT_DB_EMULATOR;
  }
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    process.env.FIREBASE_AUTH_EMULATOR_HOST = DEFAULT_AUTH_EMULATOR;
  }

  assertLocalEmulatorHost("FIREBASE_DATABASE_EMULATOR_HOST", process.env.FIREBASE_DATABASE_EMULATOR_HOST);
  assertLocalEmulatorHost("FIREBASE_AUTH_EMULATOR_HOST", process.env.FIREBASE_AUTH_EMULATOR_HOST);

  const dbUrl = process.env.FIREBASE_DATABASE_URL || "";
  if (dbUrl) {
    try {
      if (dbUrl.includes(PROD_PROJECT_ID) || isProdFirebaseHostname(new URL(dbUrl).hostname)) {
        throw new Error(`FIREBASE_DATABASE_URL must not point at prod: ${dbUrl}`);
      }
    } catch (e) {
      if (String(e.message).includes("must not point")) throw e;
    }
  }
}

function firebaseEmulatorQueryString() {
  assertFirebaseEmulatorTestEnv();
  return "&firebaseEmulator=1";
}

/** Playwright: abort prod Firebase hosts before request leaves the browser. */
async function installProdFirebaseRouteBlock(page) {
  await page.route("**/*", route => {
    const url = route.request().url();
    try {
      const host = new URL(url).hostname.toLowerCase();
      if (
        isProdFirebaseHostname(host) ||
        host === "identitytoolkit.googleapis.com" ||
        host === "securetoken.googleapis.com"
      ) {
        return route.abort("blockedbyclient");
      }
    } catch (_) {}
    return route.continue();
  });
}

module.exports = {
  assertFirebaseEmulatorTestEnv,
  firebaseEmulatorQueryString,
  installProdFirebaseRouteBlock,
  PROD_PROJECT_ID
};
