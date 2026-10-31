#!/usr/bin/env node
/**
 * Life ch1 e2e: validate RTDB rules, run against Firebase emulators + static server.
 */
const { spawn, spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const project = "punk-me-40605";
const servePort = process.env.PUNK_PORT || "3456";

function killStaleEmulators() {
  spawnSync("pkill", ["-f", "firebase-database-emulator"], { stdio: "ignore" });
  spawnSync("pkill", ["-f", "firebase emulators:start"], { stdio: "ignore" });
}

function validateRules() {
  killStaleEmulators();
  const noop = path.join(root, "scripts", "validate-rtdb-rules.js");
  const cmd = `node ${noop}`;
  const r = spawnSync(
    path.join(root, "node_modules", ".bin", "firebase"),
    ["emulators:exec", "--only", "database", "--project", project, cmd],
    { cwd: root, stdio: "inherit", shell: false }
  );
  if (r.status !== 0) throw new Error("database.rules.json validation failed (emulator compile)");
}

function spawnEmulators() {
  return spawn(
    "npx",
    [
      "firebase",
      "emulators:start",
      "--only",
      "auth,database",
      "--project",
      project,
      "--config",
      "firebase.json"
    ],
    { cwd: root, stdio: "pipe", env: { ...process.env } }
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
      stdio: "pipe"
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

function runE2e(runIndex) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, "test-life-ch1-slice-e2e.js")], {
      cwd: root,
      stdio: "inherit",
      env: {
        ...process.env,
        PUNK_BASE: `http://127.0.0.1:${servePort}`,
        LIFE_CH1_E2E_RUN: String(runIndex)
      }
    });
    child.on("exit", code => (code === 0 ? resolve() : reject(new Error(`e2e run ${runIndex} exit ${code}`))));
  });
}

function restartEmulators(emu) {
  try {
    emu.kill("SIGKILL");
  } catch (_) {}
  killStaleEmulators();
  return spawnEmulators();
}

(async () => {
  validateRules();
  killStaleEmulators();
  let emu = spawnEmulators();
  let serve;
  try {
    await waitReady(emu);
    serve = await startServe();
    for (let i = 1; i <= 3; i++) {
      console.log(`\n=== life-ch1-e2e run ${i}/3 ===\n`);
      await runE2e(i);
      if (i < 3) {
        emu = restartEmulators(emu);
        await waitReady(emu);
      }
    }
    console.log("\nlife-ch1-e2e: 3/3 PASS");
    serve?.kill("SIGKILL");
    killStaleEmulators();
    process.exit(0);
  } catch (inner) {
    serve?.kill("SIGKILL");
    killStaleEmulators();
    throw inner;
  }
})().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
