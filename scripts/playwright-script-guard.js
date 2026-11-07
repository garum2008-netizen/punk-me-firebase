#!/usr/bin/env node
/** Required preamble for capture/verify/proof/qa/debug Playwright scripts. */
const {
  exitIfMissingFirebaseEmulatorEnv,
  installProdFirebaseRouteBlock
} = require("./firebase-test-emulator-guard");

exitIfMissingFirebaseEmulatorEnv();

module.exports = { installProdFirebaseRouteBlock };
