#!/usr/bin/env node
/**
 * Bounded autopilot recovery counter (max 3 attempts per failure signature).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const checkpointPath = path.join(root, ".cursor/autopilot-checkpoint.json");
const MAX = 3;

function read() {
  if (!fs.existsSync(checkpointPath)) return {};
  return JSON.parse(fs.readFileSync(checkpointPath, "utf8"));
}

function write(cp) {
  fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
  fs.writeFileSync(checkpointPath, `${JSON.stringify(cp, null, 2)}\n`);
}

const signature = process.argv[2];
const action = process.argv[3] || "record";

if (!signature) {
  console.error("Usage: safe-chat-autopilot-recovery.mjs <failureSignature> [record|check]");
  process.exit(1);
}

const cp = read();
const recovery = { ...(cp.recoveryBySignature || {}) };
const count = (recovery[signature] || 0) + (action === "record" ? 1 : 0);

if (action === "record") {
  recovery[signature] = (recovery[signature] || 0) + 1;
  write({
    ...cp,
    recoveryBySignature: recovery,
    lastFailureSignature: signature,
    updatedAt: new Date().toISOString()
  });
}

const attempts = recovery[signature] || 0;
console.log(JSON.stringify({ signature, attempts, max: MAX, escalate: attempts >= MAX }));

if (action === "check" && attempts >= MAX) process.exit(42);