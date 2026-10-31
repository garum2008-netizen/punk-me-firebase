/**
 * Safe-chat test harness: Auth + Database emulators using repo database.rules.json.
 */
import { spawn } from "child_process";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const project = process.env.FIREBASE_EMULATOR_PROJECT || "punk-me-40605";

export function spawnEmulators() {
  const configPath = path.join(root, "firebase.json");
  return spawn(
    "npx",
    ["firebase", "emulators:start", "--only", "auth,database", "--project", project, "--config", configPath],
    {
      cwd: root,
      stdio: "pipe",
      env: { ...process.env, FIREBASE_EMULATOR_HUB: "" },
      detached: true
    }
  );
}

function waitForLog(proc, needle, timeoutMs = 120000) {
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

function portFree(port, host = "127.0.0.1") {
  return new Promise(resolve => {
    const srv = net.createServer();
    srv.once("error", () => resolve(false));
    srv.once("listening", () => {
      srv.close(() => resolve(true));
    });
    srv.listen(port, host);
  });
}

async function waitPortsFree(ports, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const free = await Promise.all(ports.map(p => portFree(p)));
    if (free.every(Boolean)) return;
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`ports not free after ${timeoutMs}ms: ${ports.join(",")}`);
}

function stopEmulatorChild(child) {
  if (!child || child.exitCode != null) return Promise.resolve();
  return new Promise(resolve => {
    const finish = () => resolve();
    child.once("exit", finish);
    try {
      if (child.pid) process.kill(-child.pid, "SIGTERM");
      else child.kill("SIGTERM");
    } catch (_) {
      try {
        child.kill("SIGTERM");
      } catch (_) {}
    }
    setTimeout(() => {
      try {
        if (child.exitCode == null && child.pid) process.kill(-child.pid, "SIGKILL");
      } catch (_) {}
      finish();
    }, 8000);
  });
}

/** @param {() => Promise<void>|void} fn */
export async function withSafeChatRulesEmulator(fn) {
  delete process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  await waitPortsFree([9000, 9099, 4400], 15000);
  const emu = spawnEmulators();
  try {
    await waitForLog(emu, "All emulators ready");
    await fn();
  } finally {
    await stopEmulatorChild(emu);
    await waitPortsFree([9000, 9099, 4400], 45000);
  }
}

/** @deprecated use withSafeChatRulesEmulator — rules are in repo database.rules.json */
export function writeOverlayRulesDir() {
  return null;
}
