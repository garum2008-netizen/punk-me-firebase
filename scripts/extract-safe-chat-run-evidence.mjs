#!/usr/bin/env node
/**
 * Parse a full test:safe-chat log into structured verification evidence (harness metadata only).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function headSha() {
  return execSync("git rev-parse HEAD", { cwd: root }).toString().trim();
}

function extractIntegration(log) {
  const m = log.match(/Tests\s+(\d+)\s+passed\s+\((\d+)\)/g);
  const last = m?.[m.length - 1];
  if (!last) return null;
  const n = last.match(/(\d+)\s+passed\s+\((\d+)\)/);
  return n ? { passed: Number(n[1]), total: Number(n[2]) } : null;
}

function extractMutations(log) {
  const out = {};
  for (const line of log.split("\n")) {
    const caught = line.match(/^(MUT-[A-Z0-9-]+|M\d+\w*):\s+expected failure\s+=>\s+(CAUGHT|NOT CAUGHT)/);
    if (caught) out[caught[1]] = caught[2];
    if (line.includes("review8-mutation-check: all reviewer mutations caught")) out.review8 = "all CAUGHT";
    if (line.includes("review8-mutation-check:") && line.includes("not caught")) out.review8 = "FAIL";
    if (line.includes("mutation-check: all protective mutations caught")) out.mutationCheck = "all CAUGHT";
    if (line.includes("mutation-check:") && line.includes("not caught")) out.mutationCheck = "FAIL";
  }
  return out;
}

function extractShuffle(log) {
  const seeds = { pass: [], fail: [] };
  for (const line of log.split("\n")) {
    const pass = line.match(/^shuffle seed (\d+): PASS$/);
    const fail = line.match(/^shuffle seed (\d+): FAIL$/);
    if (pass) seeds.pass.push(Number(pass[1]));
    if (fail) seeds.fail.push(Number(fail[1]));
  }
  const failFile = [...log.matchAll(/shuffle seed (\d+) file ([^:]+): FAIL/g)].map(m => ({
    seed: Number(m[1]),
    file: m[2].trim()
  }));
  return { ...seeds, failDetails: failFile, allPass: seeds.fail.length === 0 && seeds.pass.length > 0 };
}

function failureSignature(log) {
  const failDetails = extractShuffle(log).failDetails[0];
  if (failDetails) return `shuffle_seed_${failDetails.seed}_${failDetails.file}`;
  const notCaught = log.match(/^(M[\w-]+|MUT-[\w-]+):\s+expected failure\s+=>\s+NOT CAUGHT/m);
  if (notCaught) return `mutation_${notCaught[1]}_NOT_CAUGHT`;
  const vitest = log.includes('Timeout calling "snapshotSaved"')
    ? "vitest_worker_snapshotSaved_timeout"
    : null;
  if (vitest && failDetails) return vitest;
  if (vitest) return vitest;
  const failTest = log.match(/^ FAIL\s+[^\s]+\s+>[^\n]+/m);
  if (failTest) return failTest[0].slice(0, 120);
  return "unknown_exit_nonzero";
}

function main() {
  const logPath = process.argv[2];
  const runN = Number(process.argv[3] || "1");
  const exit = Number(process.argv[4] || "1");
  if (!logPath || !fs.existsSync(logPath)) {
    console.error("Usage: extract-safe-chat-run-evidence.mjs <logfile> <runN> <exit>");
    process.exit(1);
  }
  const log = fs.readFileSync(logPath, "utf8");
  const evidence = {
    run: runN,
    verificationSha: headSha(),
    frozenSecuritySha: "d31a624cdf407fac20c1560958dd426a6c174b39",
    exit,
    suitePass: log.includes("All safe-chat automated checks passed"),
    integration: extractIntegration(log),
    mutations: extractMutations(log),
    shuffle: extractShuffle(log),
    failureSignature: exit === 0 ? null : failureSignature(log),
    recordedAt: new Date().toISOString()
  };
  const outDir = path.join(root, ".cursor/ci-artifacts");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, `run-${runN}-evidence.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(evidence, null, 2)}\n`);
  console.log(outPath);
  return evidence;
}

main();