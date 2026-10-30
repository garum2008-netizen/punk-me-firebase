/**
 * Safe-chat test harness: Auth + Database emulators with RTDB rules overlay
 * (main database.rules.json + applySafeChatPatch), without modifying repo rules file.
 */
import { spawn, spawnSync } from "child_process";
import fs from "fs";
import net from "net";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import { applySafeChatPatch } from "./rtdb-safe-chat-patch.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const project = process.env.FIREBASE_EMULATOR_PROJECT || "punk-me-40605";

export function writeOverlayRulesDir() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "punk-safe-chat-rules-"));
  const base = JSON.parse(fs.readFileSync(path.join(root, "database.rules.json"), "utf8"));
  const patched = { rules: applySafeChatPatch(base.rules) };
  fs.writeFileSync(path.join(tmpDir, "database.rules.json"), JSON.stringify(patched, null, 2) + "\n");
  fs.writeFileSync(
    path.join(tmpDir, "firebase.json"),
    JSON.stringify(
      {
        database: { rules: "database.rules.json" },
        emulators: {
          auth: { port: 9099 },
          database: { port: 9000 },
          ui: { enabled: false }
        }
      },
      null,
      2
    ) + "\n"
  );
  return tmpDir;
}

export function spawnEmulators(configDir) {
  const configPath = path.join(configDir, "firebase.json");
  return spawn(
    "npx",
    ["firebase", "emulators:start", "--only", "auth,database", "--project", project, "--config", configPath],
    { cwd: root, stdio: "pipe", env: { ...process.env, FIREBASE_EMULATOR_HUB: "" } }
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

function stopFirebaseEmulators(child) {
  try {
    child.kill("SIGTERM");
  } catch (_) {}
  spawnSync("pkill", ["-TERM", "-f", "java.*firebase"], { stdio: "ignore" });
  spawnSync("pkill", ["-TERM", "-f", "firebase emulators:start"], { stdio: "ignore" });
}

function rmDir(dir) {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (_) {}
}

/** @param {() => Promise<void>|void} fn */
export async function withSafeChatRulesEmulator(fn) {
  delete process.env.FIREBASE_DATABASE_EMULATOR_HOST;
  delete process.env.FIREBASE_AUTH_EMULATOR_HOST;
  await waitPortsFree([9000, 9099, 4400], 15000);
  const configDir = writeOverlayRulesDir();
  const emu = spawnEmulators(configDir);
  try {
    await waitForLog(emu, "All emulators ready");
    await fn();
  } finally {
    stopFirebaseEmulators(emu);
    rmDir(configDir);
    await waitPortsFree([9000, 9099], 30000);
  }
}
