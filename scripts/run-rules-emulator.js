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
applyFirebaseEmulatorEnv();

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

function startServe() {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["--yes", "serve", "-l", servePort, "."], {
      cwd: root,
      stdio: "pipe",
      detached: true
    });
    child.on("error", reject);
    setTimeout(() => resolve(child), 3000);
  });
}

(async () => {
  const emu = spawnEmulators();
  let serve;
  try {
    await waitForLog(emu, "All emulators ready");
    await runNode("test-database-rules.js");
    await runNode("test-save-fixtures.js");
    serve = await startServe();
    await runNode("test-save-gameplay-emulator.js", {
      PUNK_BASE: `http://127.0.0.1:${servePort}`
    });
    console.log("run-rules-emulator: all tests PASS");
  } finally {
    killProcessGroup(serve);
    killProcessGroup(emu);
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
