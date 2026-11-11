#!/usr/bin/env node
/**
 * Append/update PR #53 autopilot checkpoint without mutating frozen worker sources.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const checkpointPath = path.join(root, ".cursor/autopilot-checkpoint.json");

const frozenDefault = "d31a624cdf407fac20c1560958dd426a6c174b39";

function readCheckpoint() {
  if (!fs.existsSync(checkpointPath)) return {};
  return JSON.parse(fs.readFileSync(checkpointPath, "utf8"));
}

function headSha() {
  return execSync("git rev-parse HEAD", { cwd: root }).toString().trim();
}

function shortSha(sha) {
  return sha.slice(0, 7);
}

export function writeCheckpoint(patch) {
  const prev = readCheckpoint();
  const next = {
    project: "safe-chat PR #53",
    repository: "garum2008-netizen/punk-me-firebase",
    branch: "cursor/safe-chat-verifier-fixes-3dff",
    frozenSecuritySha: prev.frozenSecuritySha || frozenDefault,
    verificationHeadSha: headSha(),
    pr: 53,
    prState: "draft",
    updatedAt: new Date().toISOString(),
    ...prev,
    ...patch
  };
  fs.mkdirSync(path.dirname(checkpointPath), { recursive: true });
  fs.writeFileSync(checkpointPath, `${JSON.stringify(next, null, 2)}\n`);
  return next;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const cmd = process.argv[2] || "status";
  if (cmd === "run-start") {
    const run = Number(process.argv[3] || "1");
    writeCheckpoint({
      status: "verification_in_progress",
      currentRun: run,
      lastEvent: `run_${run}_started`
    });
  } else if (cmd === "run-end") {
    const run = Number(process.argv[3] || "1");
    const exit = Number(process.argv[4] || "1");
    const prev = readCheckpoint();
    const verificationRuns = [...(prev.verificationRuns || [])];
    verificationRuns.push({
      run,
      exit,
      verificationHead: shortSha(headSha()),
      at: new Date().toISOString()
    });
    writeCheckpoint({
      verificationRuns,
      status: exit === 0 ? "verification_run_pass" : "verification_blocked",
      lastEvent: `run_${run}_exit_${exit}`
    });
  } else {
    console.log(JSON.stringify(readCheckpoint(), null, 2));
  }
}
