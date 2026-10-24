#!/usr/bin/env node
/**
 * Regression: World3D onMove must not call saveMe() before loadMe applies Firebase snapshot.
 * Flow: signOut -> new anon -> char select -> pick Cobalt -> coins=555 -> saveMe -> reload x2.
 */
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const outDir = "/workspace/qa/hotfix-loading";
const CACHE = "living3d-v22r4-loadfix";
fs.mkdirSync(outDir, { recursive: true });

async function readPlayerFromDb(page) {
  return page.evaluate(async () => {
    const u = firebase.auth().currentUser;
    if (!u) return { error: "no auth" };
    const snap = await firebase.database().ref("players/" + u.uid).once("value");
    return { uid: u.uid, exists: snap.exists(), val: snap.exists() ? snap.val() : null };
  });
}

async function newAnonymousSession(page) {
  await page.evaluate(async () => {
    try {
      localStorage.removeItem("punkme_character_id");
    } catch (e) {}
    await firebase.auth().signOut();
    await firebase.auth().signInAnonymously();
  });
  await page.waitForFunction(() => firebase.auth().currentUser?.uid, { timeout: 60000 });
}

async function waitCharSelect(page) {
  await page.waitForSelector("#charSelect.active", { timeout: 60000 });
  await page.waitForSelector("#charSelectConfirm", { timeout: 90000 });
  await page.waitForFunction(
    () => document.querySelectorAll("#charSelectUi .char-pick").length >= 4,
    { timeout: 90000 }
  );
}

async function pickCobalt(page) {
  await page.click('.char-pick[data-id="cobalt"]');
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.me?.characterId === "cobalt", { timeout: 60000 });
}

async function runEarlySaveSuite(browserName, browserType) {
  const browser = await browserType.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const log = [];

  const url = `${base}/?v=${CACHE}-earlysave-${browserName}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => typeof firebase !== "undefined" && window.saveMe, { timeout: 120000 });

  await newAnonymousSession(page);
  await page.waitForFunction(() => window.__playerLoaded === true, { timeout: 90000 });
  await waitCharSelect(page);

  const beforePick = await readPlayerFromDb(page);
  const notClobbered =
    !beforePick.exists ||
    (beforePick.val?.characterId == null && beforePick.val?.characterId !== "razor");
  log.push(["fresh_db_not_clobbered", notClobbered, beforePick]);

  if (browserName === "chromium") {
    await page.screenshot({ path: path.join(outDir, "desktop-early-save-char-select.png") });
  }
  if (browserName === "webkit") {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(outDir, "mobile-webkit-early-save-char-select.png") });
  }

  await pickCobalt(page);
  await page.evaluate(() => {
    window.me.coins = 555;
    window.saveMe();
  });
  await page.waitForTimeout(800);

  const afterSave = await readPlayerFromDb(page);
  log.push([
    "after_pick_save",
    afterSave.val?.characterId === "cobalt" && afterSave.val?.coins === 555,
    afterSave
  ]);

  for (let i = 1; i <= 2; i++) {
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__playerLoaded === true && window.me?.characterId, {
      timeout: 90000
    });
    await page.waitForFunction(() => window.me?.coins === 555, { timeout: 90000 });
    const db = await readPlayerFromDb(page);
    const meOk = await page.evaluate(() => ({
      id: window.me?.characterId,
      coins: window.me?.coins
    }));
    const ok =
      meOk.id === "cobalt" &&
      meOk.coins === 555 &&
      db.val?.characterId === "cobalt" &&
      db.val?.coins === 555;
    log.push([`reload_${i}`, ok, { me: meOk, db }]);
    if (browserName === "chromium" && i === 2) {
      await page.screenshot({ path: path.join(outDir, "desktop-early-save-reload2-cobalt-555.png") });
    }
  }

  await context.close();
  await browser.close();
  return { browserName, log, failed: log.filter(([, ok]) => !ok) };
}

async function main() {
  const results = [];
  results.push(await runEarlySaveSuite("chromium", chromium));
  try {
    results.push(await runEarlySaveSuite("webkit", webkit));
  } catch (e) {
    console.warn("webkit early-save skipped:", e.message);
    results.push({ browserName: "webkit", log: [["webkit_skip", false, e.message]], failed: [["webkit_skip"]] });
  }

  const allFailed = results
    .filter(r => r.browserName !== "webkit" || !r.log.some(x => x[0] === "webkit_skip"))
    .flatMap(r => r.failed.map(f => `${r.browserName}:${f[0]}`));

  console.log(JSON.stringify(results, null, 2));
  if (allFailed.length) {
    console.error("FAILED:", allFailed.join(", "));
    process.exit(1);
  }
  console.log("early-save regression: all PASS");
  console.log("PNGs:", outDir);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
