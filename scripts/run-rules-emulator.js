#!/usr/bin/env node
/**
 * Start Auth + Database emulators, run rules + save fixture + gameplay save tests.
 */
const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const project = "punk-me-40605";
const servePort = process.env.PUNK_PORT || "9876";
const { applyFirebaseEmulatorEnv } = require("./firebase-emulator-env");
const { startTestStaticServe } = require("./start-test-static-serve");
const { dbPort, authPort } = applyFirebaseEmulatorEnv();

function spawnEmulators() {
  return spawn(
    "npx",
    ["firebase", "emulators:start", "--only", "auth,database", "--project", project],
    { cwd: root, stdio: "pipe", env: { ...process.env, FIREBASE_EMULATOR_HUB: "" }, detached: true }
  );
}

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

function waitForLog(proc, needle, timeoutMs = 90000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("emulator start timeout")), timeoutMs);
    const onData = buf => {
      const s = buf.toString();
      process.stdout.write(s);
      if (s.includes(needle)) {
        clearTimeout(t);
        proc.stdout.off("data", onData);
        resolve();
      }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", d => process.stderr.write(d));
    proc.on("exit", code => {
      clearTimeout(t);
      reject(new Error(`emulator exited ${code}`));
    });
  });
}

function runNode(script, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, script)], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, ...extraEnv }
    });
    child.on("exit", c => (c === 0 ? resolve() : reject(new Error(`${script} exit ${c}`))));
  });
}

function closeHttpServer(srv) {
  if (!srv) return Promise.resolve();
  return new Promise(resolve => {
    try {
      srv.close(() => resolve());
    } catch (_) {
      resolve();
    }
  });
}

function killEmulatorListenPorts() {
  const { execSync } = require("child_process");
  for (const port of [Number(dbPort), Number(authPort), 4400, 4500]) {
    try {
      execSync(`fuser -k ${port}/tcp 2>/dev/null || true`, { stdio: "ignore" });
    } catch (_) {}
  }
}

(async () => {
  const emu = spawnEmulators();
  let staticSrv;
  let base;
  try {
    await waitForLog(emu, "All emulators ready");
    await runNode("test-database-rules.js");
    await runNode("test-save-fixtures.js");
    ({ srv: staticSrv, base } = await startTestStaticServe(root, servePort));
    await runNode("test-save-gameplay-emulator.js", {
      PUNK_BASE: base
    });
    console.log("run-rules-emulator: all tests PASS");
  } finally {
    await closeHttpServer(staticSrv);
    killProcessGroup(emu);
    killEmulatorListenPorts();
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
