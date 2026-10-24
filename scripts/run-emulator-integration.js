#!/usr/bin/env node
/** Start emulators + integration suite (rules, loading, accounts). */
const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const project = "punk-me-40605";

function spawnEmulators() {
  return spawn("npx", ["firebase", "emulators:start", "--only", "auth,database", "--project", project], {
    cwd: root,
    stdio: "pipe"
  });
}

function waitReady(proc) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("emulator timeout")), 90000);
    const onData = buf => {
      const s = buf.toString();
      process.stdout.write(s);
      if (s.includes("All emulators ready")) {
        clearTimeout(t);
        proc.stdout.off("data", onData);
        resolve();
      }
    };
    proc.stdout.on("data", onData);
    proc.stderr.on("data", d => process.stderr.write(d));
    proc.on("exit", c => {
      clearTimeout(t);
      reject(new Error(`emulator exit ${c}`));
    });
  });
}

(async () => {
  delete process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const emu = spawnEmulators();
  try {
    await waitReady(emu);
    const rules = spawn(process.execPath, [path.join(__dirname, "test-database-rules.js")], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env }
    });
    await new Promise((res, rej) => {
      rules.on("exit", c => (c === 0 ? res() : rej(new Error(`rules exit ${c}`))));
    });
    const suite = spawn(process.execPath, [path.join(__dirname, "emulator-integration-suite.js")], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, RULES_TEST_STANDALONE: "1", FIREBASE_EMULATOR: "1" }
    });
    await new Promise((res, rej) => {
      suite.on("exit", c => (c === 0 ? res() : rej(new Error(`suite exit ${c}`))));
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
