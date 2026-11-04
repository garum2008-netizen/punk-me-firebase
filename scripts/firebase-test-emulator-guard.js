#!/usr/bin/env node
/**
 * Playwright / integration tests must never hit production Firebase (punk-me-40605).
 * Emulator mode: require env + ?firebaseEmulator=1 on every navigation.
 * Prod-host sim: ?punkFirebaseStub=1 + route block (no real Firebase I/O).
 */
const fs = require("fs");
const path = require("path");
const { isProdFirebaseHostname } = require("./firebase-prod-guard");

const PROD_PROJECT_ID = "punk-me-40605";
const GUARD_MODULE = "firebase-test-emulator-guard";
const PROD_HOST_STUB_QS = "&punkFirebaseStub=1";

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
    throw new Error(`${label} must be set (e.g. 127.0.0.1:9000) — no default ports`);
  }
  if (p.host !== "127.0.0.1" && p.host !== "localhost") {
    throw new Error(`${label} must point at local emulator, got ${envVal}`);
  }
  if (p.host.includes("firebaseio") || p.host.includes("firebasedatabase") || p.host.includes("firebaseapp")) {
    throw new Error(`${label} must not use prod Firebase host: ${envVal}`);
  }
}

/** Require explicit emulator env before any Playwright launch (no silent defaults). */
function assertFirebaseEmulatorTestEnv() {
  const flag = process.env.FIREBASE_EMULATOR;
  if (flag !== "1" && flag !== "true") {
    throw new Error("FIREBASE_EMULATOR must be 1 (refusing to default prod or foreign emulator ports)");
  }
  if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    throw new Error("FIREBASE_DATABASE_EMULATOR_HOST must be set — no default 9000");
  }
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("FIREBASE_AUTH_EMULATOR_HOST must be set — no default 9099");
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

function exitIfMissingFirebaseEmulatorEnv() {
  try {
    assertFirebaseEmulatorTestEnv();
  } catch (e) {
    console.error(String(e.message || e));
    process.exit(1);
  }
}

function firebaseEmulatorQueryString() {
  assertFirebaseEmulatorTestEnv();
  return "&firebaseEmulator=1";
}

function prodHostFirebaseStubQueryString() {
  return PROD_HOST_STUB_QS;
}

function isBlockedProdFirebaseUrl(urlStr) {
  try {
    const host = new URL(urlStr).hostname.toLowerCase();
    return (
      isProdFirebaseHostname(host) ||
      host === "identitytoolkit.googleapis.com" ||
      host === "securetoken.googleapis.com"
    );
  } catch {
    return false;
  }
}

/**
 * Abort prod Firebase requests and fail the test (throws on first blocked request).
 */
async function installProdFirebaseRouteBlock(page) {
  const state = { hit: null };
  page.__punkProdFirebaseBlockState = state;
  const fail = url => {
    if (state.hit) return;
    state.hit = url;
    const err = new Error(`Production Firebase request blocked (test FAIL): ${url}`);
    queueMicrotask(() => {
      throw err;
    });
  };
  page.on("request", req => {
    const url = req.url();
    if (isBlockedProdFirebaseUrl(url)) fail(url);
  });
  await page.route("**/*", route => {
    const url = route.request().url();
    if (isBlockedProdFirebaseUrl(url)) {
      fail(url);
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
  return state;
}

async function assertNoProdFirebaseBlocked(page) {
  const url = page.__punkProdFirebaseBlockState?.hit;
  if (url) {
    throw new Error(`Production Firebase request was attempted: ${url}`);
  }
}

/** Prod-host static sim: stub Firebase in-page; block prod URLs on every page. */
async function prepareProdHostSimContext(context) {
  await context.addInitScript(() => {
    window.__PUNK_PROD_HOST_FIREBASE_STUB__ = true;
  });
}

function playwrightScriptGuardMarker() {
  return GUARD_MODULE;
}

/** Meta-test (d): every scripts/test-*.js that uses Playwright must wire the guard module. */
function assertAllPlaywrightTestsHaveFirebaseGuard() {
  const scriptsDir = path.join(__dirname);
  const files = fs.readdirSync(scriptsDir).filter(n => n.startsWith("test-") && n.endsWith(".js"));
  let failed = 0;
  for (const name of files) {
    const abs = path.join(scriptsDir, name);
    const src = fs.readFileSync(abs, "utf8");
    if (!src.includes('require("playwright")') && !src.includes("require('playwright')")) continue;
    if (!src.includes(GUARD_MODULE)) {
      console.error(`FAIL: ${name} uses Playwright but does not require ${GUARD_MODULE}`);
      failed++;
      continue;
    }
    const usesEmulator =
      src.includes("assertFirebaseEmulatorTestEnv") || src.includes("exitIfMissingFirebaseEmulatorEnv");
    const usesProdStub =
      src.includes("prepareProdHostSimContext") || src.includes("prodHostFirebaseStubQueryString");
    if (!usesEmulator && !usesProdStub) {
      console.error(
        `FAIL: ${name} must call assertFirebaseEmulatorTestEnv/exitIfMissing… or prepareProdHostSimContext/prodHost stub QS`
      );
      failed++;
    }
    if (!src.includes("installProdFirebaseRouteBlock")) {
      console.error(`FAIL: ${name} must install installProdFirebaseRouteBlock on pages`);
      failed++;
    }
  }
  return failed;
}

module.exports = {
  assertFirebaseEmulatorTestEnv,
  exitIfMissingFirebaseEmulatorEnv,
  firebaseEmulatorQueryString,
  prodHostFirebaseStubQueryString,
  installProdFirebaseRouteBlock,
  assertNoProdFirebaseBlocked,
  prepareProdHostSimContext,
  assertAllPlaywrightTestsHaveFirebaseGuard,
  PROD_PROJECT_ID,
  PROD_HOST_STUB_QS
};
