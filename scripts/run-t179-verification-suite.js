#!/usr/bin/env node
/**
 * t179 evidence runner: stamps repo SHA on every log; append explicit VERDICT lines.
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { assertFirebaseEmulatorTestEnv } = require("./firebase-test-emulator-guard");

assertFirebaseEmulatorTestEnv();

const ROOT = path.join(__dirname, "..");
const OUT = process.env.PUNK_ICE_OUT || path.join("/opt/cursor/artifacts", "ice-ch1-footage");
const SHA = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();
const sha7 = SHA.slice(0, 7);
const sha12 = SHA.slice(0, 12);

fs.mkdirSync(OUT, { recursive: true });

function run(name, args, logName, extraEnv = {}) {
  const logPath = path.join(OUT, `${logName}-${sha12}.log`);
  const header = `=== ${name} @ ${SHA} started ${new Date().toISOString()} ===\n`;
  fs.writeFileSync(logPath, header);
  const fd = fs.openSync(logPath, "a");
  const r = spawnSync(args[0], args.slice(1), {
    cwd: ROOT,
    env: { ...process.env, ...extraEnv },
    stdio: ["ignore", fd, fd],
  });
  fs.closeSync(fd);
  const verdict =
    r.status === 0
      ? `VERDICT: ${name} PASS exit=0 @ ${SHA}`
      : `VERDICT: ${name} FAIL exit=${r.status} @ ${SHA}`;
  fs.appendFileSync(logPath, `\n${verdict}\n`);
  return { name, logPath, exitCode: r.status, verdict };
}

const results = [];
results.push(run("unit-life-ch1", ["npm", "run", "test:life-ch1-unit"], "test-life-ch1-unit"));
results.push(run("halo", ["node", "scripts/test-angelina-skin-halo.js"], "test-angelina-halo"));
results.push(
  run("e2e-life-ch1", ["npm", "run", "test:life-ch1-e2e"], "life-ch1-e2e", {
    LIFE_CH1_E2E_USE_EXISTING_EMULATOR: "1",
    LIFE_CH1_E2E_RUNS: "3",
  })
);

const summary = {
  repoSha: SHA,
  ranAt: new Date().toISOString(),
  emulator: {
    FIREBASE_EMULATOR: process.env.FIREBASE_EMULATOR,
    FIREBASE_DATABASE_EMULATOR_HOST: process.env.FIREBASE_DATABASE_EMULATOR_HOST,
    FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
  },
  results,
  allPass: results.every(r => r.exitCode === 0),
};
const outJson = path.join(OUT, `t179-verification-suite-${sha12}.json`);
fs.writeFileSync(outJson, JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
process.exit(summary.allPass ? 0 : 1);
