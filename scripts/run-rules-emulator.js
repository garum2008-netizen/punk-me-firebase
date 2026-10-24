#!/usr/bin/env node
/**
 * Start Auth + Database emulators, run rules + save fixture + gameplay save tests.
 */
const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const project = "punk-me-40605";
const servePort = process.env.PUNK_PORT || "9876";

function spawnEmulators() {
  return spawn(
    "npx",
    ["firebase", "emulators:start", "--only", "auth,database", "--project", project],
    { cwd: root, stdio: "pipe", env: { ...process.env, FIREBASE_EMULATOR_HUB: "" } }
  );
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
      stdio: "pipe"
    });
    child.on("error", reject);
    setTimeout(() => resolve(child), 3000);
  });
}

(async () => {
  delete process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
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
    try {
      serve?.kill("SIGKILL");
    } catch (_) {}
    try {
      emu.kill("SIGKILL");
    } catch (_) {}
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
