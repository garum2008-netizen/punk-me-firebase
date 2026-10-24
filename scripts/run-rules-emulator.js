#!/usr/bin/env node
/**
 * Start Auth + Database emulators, run rules tests, shut down.
 * Avoids firebase emulators:exec double useEmulator() issue with rules-unit-testing.
 */
const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const project = "punk-me-40605";

function spawnEmulators() {
  return spawn(
    "npx",
    ["firebase", "emulators:start", "--only", "auth,database", "--project", project],
    { cwd: root, stdio: "pipe", env: { ...process.env, FIREBASE_EMULATOR_HUB: "" } }
  );
}

function waitForLog(proc, needle, timeoutMs = 60000) {
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

(async () => {
  delete process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const emu = spawnEmulators();
  try {
    await waitForLog(emu, "All emulators ready");
    const test = spawn(process.execPath, [path.join(__dirname, "test-database-rules.js")], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, RULES_TEST_STANDALONE: "1" }
    });
    await new Promise((res, rej) => {
      test.on("exit", c => (c === 0 ? res() : rej(new Error(`rules test exit ${c}`))));
    });
  } finally {
    try {
      emu.kill("SIGKILL");
    } catch (_) {}
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
