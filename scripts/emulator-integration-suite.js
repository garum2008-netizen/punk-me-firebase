#!/usr/bin/env node
/**
 * Runs inside: firebase emulators:exec --only auth,database ...
 * Starts static server, runs Playwright accounts + loading tests against emulators.
 */
const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const port = process.env.PUNK_PORT || "9876";
const base = `http://127.0.0.1:${port}`;

function runNode(script) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, script)], {
      cwd: root,
      env: {
        ...process.env,
        PUNK_BASE: base,
        FIREBASE_EMULATOR: "1"
      },
      stdio: "inherit"
    });
    child.on("exit", code => (code === 0 ? resolve() : reject(new Error(`${script} exit ${code}`))));
  });
}

function startServe() {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["--yes", "serve", "-l", port, "."], {
      cwd: root,
      stdio: "pipe"
    });
    child.on("error", reject);
    setTimeout(() => resolve(child), 2500);
  });
}

(async () => {
  console.log("emulator-integration: starting static server on", base);
  const serve = await startServe();
  try {
    if (!process.env.RULES_TEST_STANDALONE) {
      await runNode("test-database-rules.js");
    }
    await runNode("test-loading-recovery.js");
    await runNode("test-accounts-auth.js");
    console.log("emulator-integration: all suites finished OK");
  } finally {
    serve.kill("SIGTERM");
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
