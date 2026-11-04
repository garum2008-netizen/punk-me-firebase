#!/usr/bin/env node
/**
 * Playwright / integration tests must never hit production Firebase (punk-me-40605).
 * Emulator mode: require env from firebase.json + ?firebaseEmulator=1 on navigations.
 * Prod-host static sim: Playwright init flag __PUNK_PLAYWRIGHT_FIREBASE_STUB__ (never a URL param on prod hosts).
 */
const fs = require("fs");
const path = require("path");
const { isProdFirebaseHostname } = require("./firebase-prod-guard");

const PROD_PROJECT_ID = "punk-me-40605";
const GUARD_MODULE = "firebase-test-emulator-guard";

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

function assertFirebaseEmulatorTestEnv() {
  const flag = process.env.FIREBASE_EMULATOR;
  if (flag !== "1" && flag !== "true") {
    throw new Error("FIREBASE_EMULATOR must be 1 (refusing to default prod or foreign emulator ports)");
  }
  if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST) {
    throw new Error("FIREBASE_DATABASE_EMULATOR_HOST must be set — use scripts/firebase-emulator-env.js");
  }
  if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error("FIREBASE_AUTH_EMULATOR_HOST must be set — use scripts/firebase-emulator-env.js");
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
  const { applyFirebaseEmulatorEnv } = require("./firebase-emulator-env");
  const { dbPort, authPort } = applyFirebaseEmulatorEnv();
  const dbHost = process.env.FIREBASE_DATABASE_EMULATOR_HOST.split(":")[0] || "127.0.0.1";
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST.split(":")[0] || "127.0.0.1";
  return `&firebaseEmulator=1&firebaseEmulatorHost=${encodeURIComponent(dbHost)}&firebaseEmulatorDbPort=${dbPort}&firebaseEmulatorAuthPort=${authPort}`;
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

/** Playwright-only: stub Firebase boot on localhost QA (inert on isProductionGameHost()). */
async function prepareProdHostSimContext(context, opts = {}) {
  const { prodHostSim = false, firebaseStub = true } = opts;
  await context.addInitScript(
    ({ stub, prodSim }) => {
      if (stub) window.__PUNK_PLAYWRIGHT_FIREBASE_STUB__ = true;
      if (prodSim) window.__PUNK_PLAYWRIGHT_PROD_HOST_SIM__ = true;
    },
    { stub: firebaseStub, prodSim: prodHostSim }
  );
}

const GUARD_EXEMPT = new Set([
  "firebase-emulator-env.js",
  "firebase-prod-guard.js",
  "with-emulator-env.js",
  "playwright-script-guard.js",
  "build-preview.js",
  "build-angelina-skin-assets.py",
  "smoke-check.js",
  "validate-rtdb-rules.js",
  "emulator-rules-swap.js",
  "emulator-integration-suite.js",
  "run-emulator-integration.js",
  "run-rules-emulator.js",
  "run-life-ch1-e2e.js",
  "test-deploy-order-phase.js",
  "serve-static-root.js",
  "backup-players-export.js",
  "firebase-cleanup-test-data.js"
]);

const EXPLICIT_GUARDED_TESTS = new Set([
  "test-database-rules.js",
  "test-save-fixtures.js",
  "test-life-ch1-claimed-rtdb-roundtrip.js",
  "test-life-ch1-claimed-rtdb-roundtrip-inner.js"
]);

function scriptNeedsFirebaseGuard(name, src) {
  if (!name.endsWith(".js")) return false;
  if (GUARD_EXEMPT.has(name)) return false;
  if (name.startsWith("test-")) {
    if (EXPLICIT_GUARDED_TESTS.has(name)) return true;
    if (/require\s*\(\s*["']playwright["']\s*\)/.test(src) || /chromium\.launch/.test(src)) return true;
    if (/identitytoolkit\.googleapis\.com|firebasedatabase\.app|firebaseio\.com/.test(src)) return true;
    if (/firebase-admin|@firebase\/rules-unit-testing/.test(src)) return true;
    return false;
  }
  if (/^(capture|verify|proof|qa|debug)-/.test(name)) return true;
  if (/require\s*\(\s*["']playwright["']\s*\)/.test(src)) return true;
  if (/chromium\.launch|webkit\.launch|firefox\.launch/.test(src)) return true;
  if (/identitytoolkit\.googleapis\.com|firebasedatabase\.app|firebaseio\.com/.test(src)) return true;
  if (/firebase-admin|@firebase\/rules-unit-testing/.test(src)) return true;
  return false;
}

function assertAllFirebaseGuardedScripts() {
  const scriptsDir = path.join(__dirname);
  let failed = 0;
  for (const name of fs.readdirSync(scriptsDir)) {
    if (!name.endsWith(".js")) continue;
    const abs = path.join(scriptsDir, name);
    const src = fs.readFileSync(abs, "utf8");
    if (!scriptNeedsFirebaseGuard(name, src)) continue;
    const hasModule =
      src.includes(GUARD_MODULE) ||
      src.includes("playwright-script-guard") ||
      src.includes("firebase-emulator-env");
    if (!hasModule) {
      console.error(`FAIL: scripts/${name} touches Firebase/browser but lacks ${GUARD_MODULE}`);
      failed++;
      continue;
    }
    const isPlaywright =
      src.includes('require("playwright")') ||
      src.includes("require('playwright')") ||
      /chromium\.launch/.test(src);
    if (isPlaywright && !src.includes("installProdFirebaseRouteBlock")) {
      console.error(`FAIL: scripts/${name} must call installProdFirebaseRouteBlock on pages`);
      failed++;
    }
    if (name.startsWith("test-") && isPlaywright) {
      const usesEmulator =
        src.includes("assertFirebaseEmulatorTestEnv") ||
        src.includes("exitIfMissingFirebaseEmulatorEnv") ||
        src.includes("playwright-script-guard");
      const usesProdSim = src.includes("prepareProdHostSimContext");
      if (!usesEmulator && !usesProdSim) {
        console.error(`FAIL: ${name} must use emulator env or prepareProdHostSimContext`);
        failed++;
      }
    }
  }
  return failed;
}

module.exports = {
  assertFirebaseEmulatorTestEnv,
  exitIfMissingFirebaseEmulatorEnv,
  firebaseEmulatorQueryString,
  installProdFirebaseRouteBlock,
  prepareProdHostSimContext,
  assertAllFirebaseGuardedScripts,
  assertAllPlaywrightTestsHaveFirebaseGuard: assertAllFirebaseGuardedScripts,
  PROD_PROJECT_ID
};
