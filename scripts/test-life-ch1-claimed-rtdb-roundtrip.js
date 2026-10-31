#!/usr/bin/env node
/** Emulator round-trip: RTDB array-shaped claimedSteps → ensureLifeCh1 s* keys. */
const { spawn } = require("child_process");
const path = require("path");
const { pathToFileURL } = require("url");

const root = path.join(__dirname, "..");
const project = process.env.FIREBASE_DEMO_PROJECT || "demo-punk-life-ch1";
const firebaseBin = path.join(root, "node_modules", ".bin", "firebase");

async function loadModule() {
  return import(pathToFileURL(path.join(root, "js/story/life-ch1-slice.mjs")).href);
}

function runInEmulator(scriptPath) {
  return new Promise((resolve, reject) => {
    const cmd = `node ${scriptPath}`;
    const child = spawn(
      firebaseBin,
      ["emulators:exec", "--only", "database", "--project", project, cmd],
      { cwd: root, stdio: "inherit" }
    );
    child.on("exit", c => (c === 0 ? resolve() : reject(new Error(`emulator exec exit ${c}`))));
  });
}

(async () => {
  const inner = path.join(root, "scripts", "test-life-ch1-claimed-rtdb-roundtrip-inner.js");
  await runInEmulator(inner);
  console.log("life-ch1-claimed-rtdb-roundtrip: PASS");
})().catch(e => {
  console.error("life-ch1-claimed-rtdb-roundtrip: FAIL", e.message || e);
  process.exit(1);
});
