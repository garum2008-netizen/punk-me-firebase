#!/usr/bin/env node
/**
 * Life ch1 e2e: validate PR database.rules.json, demo-project emulators, static server, N consecutive runs.
 */
const { spawn, spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const project = process.env.FIREBASE_DEMO_PROJECT || "demo-punk-life-ch1";
const servePort = process.env.PUNK_PORT || "3456";
const runCount = Math.max(1, parseInt(process.env.LIFE_CH1_E2E_RUNS || "10", 10));
const firebaseBin = path.join(root, "node_modules", ".bin", "firebase");
const rulesPath = path.join(root, "database.rules.json");

function validateRules() {
  const noop = path.join(root, "scripts", "validate-rtdb-rules.js");
  const cmd = `node ${noop}`;
  const r = spawnSync(
    firebaseBin,
    ["emulators:exec", "--only", "database", "--project", project, cmd],
    { cwd: root, stdio: "inherit", env: { ...process.env, FIREBASE_DATABASE_EMULATOR_HOST: undefined } }
  );
  if (r.status !== 0) throw new Error(`${rulesPath} validation failed (emulator compile)`);
}

function spawnEmulators() {
  return spawn(
    firebaseBin,
    [
      "emulators:start",
      "--only",
      "auth,database",
      "--project",
      project,
      "--config",
      "firebase.json"
    ],
    { cwd: root, stdio: "pipe", env: { ...process.env }, detached: true }
  );
}

function waitReady(proc) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("emulator start timeout")), 120000);
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
    proc.on("exit", code => {
      clearTimeout(t);
      reject(new Error(`emulator exited ${code}`));
    });
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
    child.stderr.on("data", d => process.stderr.write(d));
    const deadline = Date.now() + 30000;
    const poll = () => {
      const http = require("http");
      const req = http.get(`http://127.0.0.1:${servePort}/`, res => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve(child);
        else if (Date.now() < deadline) setTimeout(poll, 400);
        else reject(new Error("serve did not become ready"));
      });
      req.on("error", () => {
        if (Date.now() < deadline) setTimeout(poll, 400);
        else reject(new Error("serve did not become ready"));
      });
    };
    setTimeout(poll, 500);
  });
}

function stopChild(child) {
  if (!child?.pid) return;
  try {
    process.kill(-child.pid, "SIGTERM");
  } catch (_) {
    try {
      child.kill("SIGTERM");
    } catch (_e) {}
  }
  setTimeout(() => {
    try {
      process.kill(-child.pid, "SIGKILL");
    } catch (_) {
      try {
        if (!child.killed) child.kill("SIGKILL");
      } catch (_e) {}
    }
  }, 1500);
}

function runE2e(runIndex) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [path.join(__dirname, "test-life-ch1-slice-e2e.js")], {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        PUNK_BASE: `http://127.0.0.1:${servePort}`,
        LIFE_CH1_E2E_RUN: String(runIndex),
        FIREBASE_DEMO_PROJECT: project
      }
    });
    child.on("exit", code => resolve(code === 0 ? 0 : code || 1));
  });
}

function restartEmulators(emu) {
  stopChild(emu);
  return spawnEmulators();
}

(async () => {
  validateRules();
  let emu = spawnEmulators();
  let serve;
  const exitCodes = [];
  try {
    await waitReady(emu);
    serve = await startServe();
    for (let i = 1; i <= runCount; i++) {
      console.log(`\n=== life-ch1-e2e run ${i}/${runCount} ===\n`);
      const code = await runE2e(i);
      exitCodes.push(code);
      console.log(`life-ch1-e2e run ${i} exit ${code}`);
      if (code !== 0) {
        throw new Error(`run ${i} failed with exit ${code}`);
      }
      if (i < runCount) {
        emu = restartEmulators(emu);
        await waitReady(emu);
      }
    }
    console.log(`\nlife-ch1-e2e: ${runCount}/${runCount} PASS`);
    console.log("life-ch1-e2e exit codes:", exitCodes.join(", "));
    stopChild(serve);
    stopChild(emu);
    process.exit(0);
  } catch (e) {
    console.error(e.message || e);
    console.log("life-ch1-e2e exit codes:", exitCodes.join(", ") || "(none completed)");
    stopChild(serve);
    stopChild(emu);
    process.exit(1);
  }
})();
