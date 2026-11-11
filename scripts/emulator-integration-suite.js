#!/usr/bin/env node
/**
 * Runs inside: firebase emulators:exec --only auth,database ...
 * Starts static server, runs Playwright accounts + loading tests against emulators.
 */
const { spawn } = require("child_process");
const path = require("path");
const { startTestStaticServe } = require("./start-test-static-serve");

const root = path.join(__dirname, "..");
const port = process.env.PUNK_PORT || "9876";

function killProcessGroup(child) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch (_) {
    try {
      child.kill("SIGKILL");
    } catch (_) {}
  }
}

function runNode(script, base) {
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

(async () => {
  const { srv, base } = await startTestStaticServe(root, port);
  console.log("emulator-integration: starting static server on", base);
  try {
    if (!process.env.RULES_TEST_STANDALONE) {
      await runNode("test-database-rules.js", base);
    }
    await runNode("test-loading-recovery.js", base);
    await runNode("test-accounts-auth.js", base);
    console.log("emulator-integration: all suites finished OK");
  } finally {
    await new Promise(resolve => {
      try {
        srv.close(() => resolve());
      } catch (_) {
        resolve();
      }
    });
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
