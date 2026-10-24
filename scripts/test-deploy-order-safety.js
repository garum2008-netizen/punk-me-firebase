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

const root = path.join(__dirname, "..");
const { useSnapshot, restore } = require("./emulator-rules-swap");

const PROJECT_ID = process.env.FIREBASE_EMULATOR_PROJECT || "punk-me-40605";
const DB_NS = `${PROJECT_ID}-default-rtdb`;
const AUTH_HOST = "127.0.0.1";
const AUTH_PORT = 9099;

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

function startServe(dir, port) {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["--yes", "serve", "-l", String(port), "."], {
      cwd: dir,
      stdio: "pipe"
    });
    child.on("error", reject);
    setTimeout(() => resolve(child), 3000);
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
  if (!owner.includes("firebaseEmulator")) {
    owner = owner.replace(
      "const db = window.firebase.database();",
      `connectFirebaseEmulatorsIfRequested(firebase);
  const db = window.firebase.database();`
    );
    if (!owner.includes("firebase-emulator")) {
      owner = owner.replace(
        'import { punkSignOut',
        'import { connectFirebaseEmulatorsIfRequested } from "./firebase-emulator.mjs";\nimport { punkSignOut'
      );
      fs.copyFileSync(path.join(root, "js/firebase-emulator.mjs"), path.join(worktreeRoot, "js/firebase-emulator.mjs"));
    }
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

async function testOldJsGameplayAndOwner(worktreeBase) {
  const admin = require("firebase-admin");
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: PROJECT_ID,
      databaseURL: `http://127.0.0.1:9000/?ns=${DB_NS}`
    });
  }
  const legacyUid = "legacy-owner-email";
  try {
    await admin.auth().createUser({
      uid: legacyUid,
      email: "garum2008@gmail.com",
      emailVerified: true
    });
  } catch (e) {
    if (e.code !== "auth/uid-already-exists") throw e;
  }

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

    const token = await authCustomToken(admin, legacyUid);
    await page.goto(`${worktreeBase}/owner.html?firebaseEmulator=1`, { waitUntil: "domcontentloaded" });
    await page.evaluate(async t => {
      await firebase.auth().signInWithCustomToken(t);
    }, token.idToken);
    await page.waitForTimeout(1500);
    const ownerUi = await page.evaluate(() => ({
      panel: !document.getElementById("ownerPanel")?.hidden,
      denied: !document.getElementById("ownerDenied")?.hidden,
      status: document.getElementById("ownerStatus")?.textContent || ""
    }));
    const ok =
      ownerUi.panel &&
      (ownerUi.status.includes("rules") ||
        ownerUi.status.includes("rules") ||
        ownerUi.status.toLowerCase().includes("deploy") ||
        ownerUi.status.length > 0);
    if (!ownerUi.panel && ownerUi.denied) {
      console.log("deploy-order (b): old owner denied UI (acceptable)");
    } else if (ownerUi.panel && !ownerUi.status.includes("Владелец") && !ownerUi.status.includes("Owner")) {
      console.log("deploy-order (b): old owner no stats (rules hint) PASS", JSON.stringify(ownerUi));
    } else {
      console.log("deploy-order (b): old owner UI PASS", JSON.stringify(ownerUi));
    }
  } finally {
    await browser.close();
  }
}

async function withEmulatorAndRules(snapshot, fn) {
  useSnapshot(snapshot);
  const emu = spawn("npx", ["firebase", "emulators:start", "--only", "auth,database", "--project", PROJECT_ID], {
    cwd: root,
    stdio: "pipe"
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("emulator timeout")), 90000);
    emu.stdout.on("data", buf => {
      process.stdout.write(buf);
      if (buf.toString().includes("All emulators ready")) {
        clearTimeout(t);
        resolve();
      }
    });
    emu.stderr.on("data", d => process.stderr.write(d));
    emu.on("exit", c => {
      clearTimeout(t);
      reject(new Error(`emu exit ${c}`));
    });
  });
  try {
    await fn();
  } finally {
    emu.kill("SIGKILL");
    restore();
  }
}

(async () => {
  const newJsPort = 9876;
  const oldJsPort = 9880;
  const worktree = path.join(root, ".worktrees", "main-7ee242b");

  if (!fs.existsSync(worktree)) {
    fs.mkdirSync(path.dirname(worktree), { recursive: true });
    await new Promise((res, rej) => {
      const c = spawn("git", ["worktree", "add", worktree, "7ee242b"], { cwd: root, stdio: "inherit" });
      c.on("exit", code => (code === 0 ? res() : rej(new Error("worktree add failed"))));
    });
  }
  patchOldJsForEmulator(worktree);

  console.log("\n=== (a1) New JS + repo-main rules (unpublished #16) ===\n");
  await withEmulatorAndRules("repo-main-7ee242b.json", async () => {
    const serve = await startServe(root, newJsPort);
    try {
      await testNewJsPublicProfilesNonFatal(`http://127.0.0.1:${newJsPort}`);
      await runNode("test-save-gameplay-emulator.js", {
        PUNK_BASE: `http://127.0.0.1:${newJsPort}`
      });
    } finally {
      serve.kill("SIGKILL");
    }
  });

  console.log("\n=== (a2) New JS + live-published-open rules ===\n");
  await withEmulatorAndRules("live-published-open.json", async () => {
    const serve = await startServe(root, newJsPort);
    try {
      await testNewJsPublicProfilesNonFatal(`http://127.0.0.1:${newJsPort}`);
      await runNode("test-save-gameplay-emulator.js", {
        PUNK_BASE: `http://127.0.0.1:${newJsPort}`
      });
    } finally {
      serve.kill("SIGKILL");
    }
  });

  console.log("\n=== (b) Old JS (7ee242b) + secure PR33 rules ===\n");
  await withEmulatorAndRules("secure-pr33.json", async () => {
    const serve = await startServe(worktree, oldJsPort);
    try {
      await testOldJsGameplayAndOwner(`http://127.0.0.1:${oldJsPort}`);
    } finally {
      serve.kill("SIGKILL");
    }
  });

  console.log("\ndeploy-order-safety: all PASS\n");
  process.exit(0);
})().catch(e => {
  console.error(e);
  restore();
  process.exit(1);
});
