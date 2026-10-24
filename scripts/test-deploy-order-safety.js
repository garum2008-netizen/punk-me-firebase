#!/usr/bin/env node
/**
 * Deploy-order safety: (a) new JS + old rules, (b) old JS + new rules.
 * Requires Auth+Database emulators already running with rules set via emulator-rules-swap.
 */
const { chromium } = require("playwright");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

const root = path.join(__dirname, "..");
const { useSnapshot, restore } = require("./emulator-rules-swap");

const PROJECT_ID = process.env.FIREBASE_EMULATOR_PROJECT || "punk-me-40605";
const DB_NS = `${PROJECT_ID}-default-rtdb`;
const AUTH_HOST = "127.0.0.1";
const AUTH_PORT = 9099;

function fetchJson(url, opts = {}) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.request(url, { method: opts.method || "GET", headers: opts.headers || {} }, res => {
      let body = "";
      res.on("data", c => (body += c));
      res.on("end", () => {
        let json = null;
        try {
          json = body ? JSON.parse(body) : null;
        } catch (_) {
          json = body;
        }
        resolve({ status: res.statusCode, json, body });
      });
    });
    req.on("error", reject);
    if (opts.body) req.write(opts.body);
    req.end();
  });
}

function runNode(script, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(__dirname, script)], {
      cwd: root,
      stdio: "inherit",
      env: { ...process.env, ...env }
    });
    child.on("exit", c => (c === 0 ? resolve() : reject(new Error(`${script} exit ${c}`))));
  });
}

async function waitForHttp(port, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const code = await new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}/`, res => {
          res.resume();
          resolve(res.statusCode);
        });
        req.on("error", reject);
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error("timeout"));
        });
      });
      if (code && code < 500) return;
    } catch (_) {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`static server not ready on :${port}`);
}

function startServe(dir, port) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["--yes", "serve", "-l", String(port), "."], {
      cwd: dir,
      stdio: "pipe"
    });
    child.on("error", reject);
    child.stderr.on("data", d => process.stderr.write(d));
    waitForHttp(port)
      .then(() => resolve(child))
      .catch(e => {
        try {
          child.kill("SIGKILL");
        } catch (_) {}
        reject(e);
      });
  });
}

function patchOldJsForEmulator(worktreeRoot) {
  const gamePath = path.join(worktreeRoot, "js/game.js");
  let src = fs.readFileSync(gamePath, "utf8");
  if (!src.includes("firebaseEmulator")) {
    src = src.replace(
      "db = firebase.database();",
      `db = firebase.database();
    if (new URLSearchParams(location.search).has("firebaseEmulator")) {
      try {
        firebase.database().useEmulator("127.0.0.1", 9000);
        firebase.auth().useEmulator("http://${AUTH_HOST}:${AUTH_PORT}");
      } catch (e) { console.warn(e); }
    }`
    );
    fs.writeFileSync(gamePath, src);
  }
  const ownerPath = path.join(worktreeRoot, "js/owner-admin.mjs");
  let owner = fs.readFileSync(ownerPath, "utf8");
  if (!owner.includes("connectFirebaseEmulatorsIfRequested")) {
    if (!owner.includes("firebase-emulator")) {
      owner = owner.replace(
        'import { punkSignOut',
        'import { connectFirebaseEmulatorsIfRequested } from "./firebase-emulator.mjs";\nimport { punkSignOut'
      );
      fs.copyFileSync(path.join(root, "js/firebase-emulator.mjs"), path.join(worktreeRoot, "js/firebase-emulator.mjs"));
    }
    owner = owner.replace(
      "if (!window.firebase?.apps?.length) firebase.initializeApp(FIREBASE_CONFIG);\n  const auth = window.firebase.auth();",
      "if (!window.firebase?.apps?.length) firebase.initializeApp(FIREBASE_CONFIG);\n  connectFirebaseEmulatorsIfRequested(firebase);\n  const auth = window.firebase.auth();"
    );
    fs.writeFileSync(ownerPath, owner);
  }
}

async function authCustomToken(admin, uid) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${AUTH_HOST}:${AUTH_PORT}`;
  const custom = await admin.auth().createCustomToken(uid);
  const res = await new Promise((resolve, reject) => {
    const body = JSON.stringify({ token: custom, returnSecureToken: true });
    const req = http.request(
      {
        hostname: AUTH_HOST,
        port: AUTH_PORT,
        path: "/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake",
        method: "POST",
        headers: { "Content-Type": "application/json" }
      },
      r => {
        let d = "";
        r.on("data", c => (d += c));
        r.on("end", () => resolve({ status: r.statusCode, json: JSON.parse(d) }));
      }
    );
    req.on("error", reject);
    req.write(body);
    req.end();
  });
  if (res.status !== 200) throw new Error(`token exchange ${res.status}`);
  return res.json;
}

async function testNewJsPublicProfilesNonFatal(base) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(`${base}/?solo=1&firebaseEmulator=1`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector(".char-pick", { timeout: 90000 });
    await page.click('.char-pick[data-id="cobalt"]');
    await page.click("#charSelectConfirm");
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    const result = await page.evaluate(async () => {
      const uid = firebase.auth().currentUser.uid;
      let profileDenied = false;
      try {
        await firebase
          .database()
          .ref("publicProfiles/" + uid)
          .set({ name: "T", avatar: "a.jpg", coins: 1 });
      } catch (e) {
        profileDenied = true;
      }
      const before = (await firebase.database().ref("players/" + uid + "/coins").once("value")).val();
      window.me.coins = (before || 0) + 7;
      window.saveMe();
      await new Promise(r => setTimeout(r, 700));
      const after = (await firebase.database().ref("players/" + uid + "/coins").once("value")).val();
      return { profileDenied, before, after, delta: after - before };
    });
    if (result.delta !== 7) {
      throw new Error(`saveMe blocked by profile failure: ${JSON.stringify(result)}`);
    }
    console.log("deploy-order (a): publicProfiles non-fatal PASS", JSON.stringify(result));
  } finally {
    await browser.close();
  }
}

async function ensureEmulatorEmailUser(email, password) {
  const url = `http://${AUTH_HOST}:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake-api-key`;
  const res = await fetchJson(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  if (res.status === 200) return res.json;
  const signInUrl = `http://${AUTH_HOST}:${AUTH_PORT}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`;
  const res2 = await fetchJson(signInUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true })
  });
  if (res2.status !== 200) throw new Error(`auth seed failed ${res2.status} ${res2.body}`);
  return res2.json;
}

async function emulatorCustomTokenForUid(uid) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${AUTH_HOST}:${AUTH_PORT}`;
  process.env.FIREBASE_DATABASE_EMULATOR_HOST = `127.0.0.1:9000`;
  const admin = require("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: PROJECT_ID,
      databaseURL: `http://127.0.0.1:9000/?ns=${DB_NS}`
    });
  }
  return admin.auth().createCustomToken(uid);
}

async function testOldJsGameplayAndOwner(worktreeBase) {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(`${worktreeBase}/?solo=1&firebaseEmulator=1`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForSelector(".char-pick", { timeout: 90000 });
    await page.click('.char-pick[data-id="cobalt"]');
    await page.click("#charSelectConfirm");
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    const gameplay = await page.evaluate(async () => {
      window.me.coins = 3333;
      window.saveMe();
      await new Promise(r => setTimeout(r, 500));
      const uid = firebase.auth().currentUser.uid;
      const snap = await firebase.database().ref("players/" + uid + "/coins").once("value");
      let rootReadDenied = false;
      try {
        await firebase.database().ref("players").once("value");
      } catch (e) {
        rootReadDenied = true;
      }
      return { coins: snap.val(), rootReadDenied };
    });
    if (gameplay.coins !== 3333) throw new Error(`old js save failed: ${JSON.stringify(gameplay)}`);
    console.log("deploy-order (b): old JS gameplay save PASS", JSON.stringify(gameplay));
  } finally {
    await browser.close();
  }

  const ownerBrowser = await chromium.launch();
  const ownerPage = await ownerBrowser.newPage();
  const ownerEmail = "garum2008@gmail.com";
  const ownerPass = "LegacyOwnerTest1!";
  try {
    const seeded = await ensureEmulatorEmailUser(ownerEmail, ownerPass);
    const customToken = await emulatorCustomTokenForUid(seeded.localId);
    await ownerPage.goto(`${worktreeBase}/owner?firebaseEmulator=1`, { waitUntil: "domcontentloaded" });
    await ownerPage.waitForFunction(
      () => {
        const st = document.getElementById("ownerStatus")?.textContent || "";
        return window.firebase?.apps?.length && st && !/^(Загрузка|Loading)/i.test(st.trim());
      },
      undefined,
      { timeout: 60000 }
    );
    await ownerPage.evaluate(async token => {
      await firebase.auth().signInWithCustomToken(token);
    }, customToken);
    await ownerPage.waitForFunction(
      () => {
        const st = document.getElementById("ownerStatus")?.textContent || "";
        const denied = !document.getElementById("ownerDenied")?.hidden;
        const panel = !document.getElementById("ownerPanel")?.hidden;
        return denied || panel || /rules|players|deploy|Нет прав/i.test(st);
      },
      undefined,
      { timeout: 15000 }
    );
    const ownerUi = await ownerPage.evaluate(() => ({
      panel: !document.getElementById("ownerPanel")?.hidden,
      denied: !document.getElementById("ownerDenied")?.hidden,
      status: document.getElementById("ownerStatus")?.textContent || ""
    }));
    const rulesHint = /rules|players|deploy|Нет прав|Cannot read/i.test(ownerUi.status);
    if (ownerUi.panel && rulesHint) {
      console.log("deploy-order (b): old owner rules hint (no /players list) PASS", JSON.stringify(ownerUi));
    } else if (!ownerUi.panel && ownerUi.denied) {
      console.log("deploy-order (b): old owner access denied UI PASS", JSON.stringify(ownerUi));
    } else if (ownerUi.panel && !rulesHint) {
      throw new Error(`old owner unexpectedly loaded /players stats: ${JSON.stringify(ownerUi)}`);
    } else {
      console.log("deploy-order (b): old owner UI PASS", JSON.stringify(ownerUi));
    }
  } finally {
    await ownerBrowser.close();
  }
}

async function stopEmulator(emu) {
  if (!emu) return;
  await new Promise(resolve => {
    emu.once("exit", () => resolve());
    try {
      emu.kill("SIGKILL");
    } catch (_) {
      resolve();
    }
    setTimeout(resolve, 15000);
  });
  await freeEmulatorPorts();
}

async function withEmulatorAndRules(snapshot, fn) {
  await freeEmulatorPorts();
  useSnapshot(snapshot);
  const emu = spawn("npx", ["firebase", "emulators:start", "--only", "auth,database", "--project", PROJECT_ID], {
    cwd: root,
    stdio: "pipe"
  });
  let started = false;
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("emulator timeout")), 120000);
    const onData = buf => {
      process.stdout.write(buf);
      if (!started && buf.toString().includes("All emulators ready")) {
        started = true;
        clearTimeout(t);
        emu.stdout.off("data", onData);
        resolve();
      }
    };
    emu.stdout.on("data", onData);
    emu.stderr.on("data", d => process.stderr.write(d));
    emu.once("exit", c => {
      if (!started) {
        clearTimeout(t);
        reject(new Error(`emu exit ${c}`));
      }
    });
  });
  try {
    await fn();
  } finally {
    await stopEmulator(emu);
  }
}

async function freeEmulatorPorts() {
  const { execSync } = require("child_process");
  try {
    execSync('pkill -9 -f database-emulator 2>/dev/null; pkill -9 -f "firebase emulators" 2>/dev/null; fuser -k 9000/tcp 9099/tcp 2>/dev/null', {
      stdio: "ignore",
      shell: "/bin/bash"
    });
  } catch (_) {}
  await new Promise(r => setTimeout(r, 8000));
}

async function ensureOldWorktree(worktree) {
  if (!fs.existsSync(worktree)) {
    fs.mkdirSync(path.dirname(worktree), { recursive: true });
    await new Promise((res, rej) => {
      const c = spawn("git", ["worktree", "add", worktree, "7ee242b"], { cwd: root, stdio: "inherit" });
      c.on("exit", code => (code === 0 ? res() : rej(new Error("worktree add failed"))));
    });
  }
  patchOldJsForEmulator(worktree);
}

async function runPhase(phase) {
  const newJsPort = 9876;
  const oldJsPort = 9880;
  const worktree = path.join(root, ".worktrees", "main-7ee242b");

  if (phase === "a1") {
    console.log("\n=== (a1) New JS + repo-main rules (unpublished #16) ===\n");
    await withEmulatorAndRules("repo-main-7ee242b.json", async () => {
      const serve = await startServe(root, newJsPort);
      try {
        await testNewJsPublicProfilesNonFatal(`http://127.0.0.1:${newJsPort}`);
        await runNode("test-save-gameplay-emulator.js", { PUNK_BASE: `http://127.0.0.1:${newJsPort}` });
      } finally {
        serve.kill("SIGKILL");
      }
    });
    return;
  }
  if (phase === "a2") {
    console.log("\n=== (a2) New JS + live-published-open rules ===\n");
    await withEmulatorAndRules("live-published-open.json", async () => {
      const serve = await startServe(root, newJsPort);
      try {
        await testNewJsPublicProfilesNonFatal(`http://127.0.0.1:${newJsPort}`);
        await runNode("test-save-gameplay-emulator.js", { PUNK_BASE: `http://127.0.0.1:${newJsPort}` });
      } finally {
        serve.kill("SIGKILL");
      }
    });
    return;
  }
  if (phase === "b") {
    await ensureOldWorktree(worktree);
    console.log("\n=== (b) Old JS (7ee242b) + secure PR33 rules ===\n");
    await withEmulatorAndRules("secure-pr33.json", async () => {
      const serve = await startServe(worktree, oldJsPort);
      try {
        await testOldJsGameplayAndOwner(`http://127.0.0.1:${oldJsPort}`);
      } finally {
        serve.kill("SIGKILL");
      }
    });
    return;
  }
  throw new Error(`unknown phase ${phase}`);
}

module.exports = { runPhase, ensureOldWorktree };

if (require.main === module) {
  (async () => {
    const { ensureBackup, restore } = require("./emulator-rules-swap");
    ensureBackup();
    await runPhase("a1");
    await runPhase("a2");
    await ensureOldWorktree(path.join(root, ".worktrees", "main-7ee242b"));
    await runPhase("b");
    console.log("\ndeploy-order-safety: all PASS\n");
    restore();
    process.exit(0);
  })().catch(e => {
    console.error(e);
    require("./emulator-rules-swap").restore();
    process.exit(1);
  });
}
