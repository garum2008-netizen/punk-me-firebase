#!/usr/bin/env node
const path = require("path");
const { pathToFileURL } = require("url");

const root = path.join(__dirname, "..");

async function main() {
  const mod = await import(pathToFileURL(path.join(root, "functions/api/checkout-logic.mjs")).href);
  const { assertStripeTestSecretKey, parseCheckoutBody, CHECKOUT_TEST_UNAVAILABLE_RU } = mod;
  let failed = 0;
  function assert(c, msg) {
    if (!c) {
      console.error("FAIL:", msg);
      failed++;
    }
  }

  const missing = assertStripeTestSecretKey(undefined);
  assert(!missing.ok && missing.status === 503, "missing key 503");
  assert(missing.message === CHECKOUT_TEST_UNAVAILABLE_RU, "ru message missing key");

  const live = assertStripeTestSecretKey("sk_live_abc");
  assert(!live.ok && live.status === 403, "live forbidden");

  const ok = assertStripeTestSecretKey("sk_test_abc");
  assert(ok.ok, "test ok");

  assert(!parseCheckoutBody(null).ok, "bad body");
  assert(parseCheckoutBody({ itemId: "neon_halo" }).ok, "item ok");

  if (failed) process.exit(1);
  console.log("checkout-api-unit: PASS");
}

main().catch(e => {
  console.error("checkout-api-unit: FAIL", e);
  process.exit(1);
});
