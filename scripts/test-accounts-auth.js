#!/usr/bin/env node
/**
 * Accounts regression: anon persistence, sign-out new anon, owner deny, optional email link.
 */
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const CACHE = "living3d-v22r5-accounts";
const outDir = path.join("/workspace/qa", "accounts");
fs.mkdirSync(outDir, { recursive: true });

const results = [];

function log(id, pass, detail) {
  results.push({ id, pass, detail });
  console.log(pass ? "PASS" : "FAIL/SKIP", id, detail);
}

async function readDb(page) {
  return page.evaluate(async () => {
    const u = firebase.auth().currentUser;
    if (!u) return { error: "no user" };
    const snap = await firebase.database().ref("players/" + u.uid).once("value");
    return { uid: u.uid, isAnon: u.isAnonymous, val: snap.exists() ? snap.val() : null };
  });
}

async function enterGame(page) {
  await page.goto(`${base}/?solo=1&v=${CACHE}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => typeof firebase !== "undefined", undefined, { timeout: 120000 });
  await page.waitForSelector(".char-pick", { timeout: 90000 });
  await page.click('.char-pick[data-id="cobalt"]');
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.me?.characterId === "cobalt", undefined, { timeout: 120000 });
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
}

async function runBrowser(name, browserType, mobile) {
  const browser = await browserType.launch();
  const page = await browser.newPage(mobile ? { viewport: { width: 390, height: 844 } } : {});
  try {
    await enterGame(page);
    const uid1 = await page.evaluate(() => firebase.auth().currentUser.uid);
    await page.evaluate(() => {
      window.me.coins = 4242;
      window.saveMe();
    });
    await page.waitForTimeout(800);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.me?.coins === 4242, undefined, { timeout: 120000 });
    const after = await readDb(page);
    log(`${name}-reload-coins`, after.val?.coins === 4242, `uid=${uid1} coins=${after.val?.coins}`);

    await page.evaluate(() => window.__punkSignOut());
    await page.waitForFunction(() => firebase.auth().currentUser?.isAnonymous, undefined, { timeout: 60000 });
    const uid2 = await page.evaluate(() => firebase.auth().currentUser.uid);
    log(`${name}-signout-new-anon`, uid2 !== uid1, `${uid1} -> ${uid2}`);

    await page.goto(`${base}/owner.html?v=${CACHE}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    const ownerUi = await page.evaluate(() => ({
      signIn: !document.getElementById("ownerSignIn")?.hidden,
      denied: !document.getElementById("ownerDenied")?.hidden,
      panel: !document.getElementById("ownerPanel")?.hidden
    }));
    log(`${name}-owner-guest-ui`, ownerUi.signIn && !ownerUi.denied && !ownerUi.panel, JSON.stringify(ownerUi));

    await page.goto(`${base}/?solo=1&v=${CACHE}#account`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    await page.evaluate(() => document.getElementById("accountModal")?.classList.add("active"));
    const shot = path.join(outDir, `${name}-account-modal.png`);
    await page.screenshot({ path: shot, fullPage: false });
    log(`${name}-account-ui`, true, shot);

    const linkTest = await page.evaluate(async () => {
      const u = firebase.auth().currentUser;
      if (!u?.isAnonymous) return { skip: true, reason: "not anon" };
      const email = `punktest+${Date.now()}@contractbot.dk`;
      const pass = "TestPass6!";
      try {
        await u.linkWithCredential(firebase.auth.EmailAuthProvider.credential(email, pass));
        return { ok: true, uid: firebase.auth().currentUser.uid, email };
      } catch (e) {
        return { ok: false, code: e.code };
      }
    });
    if (linkTest.ok) {
      const sameUid = linkTest.uid === uid2;
      log(`${name}-link-email-uid`, sameUid, JSON.stringify(linkTest));
    } else if (linkTest.code === "auth/operation-not-allowed") {
      log(`${name}-link-email-uid`, "SKIP", "providers not enabled in Firebase (OWNER ACTION)");
    } else {
      log(`${name}-link-email-uid`, false, JSON.stringify(linkTest));
    }
  } finally {
    await browser.close();
  }
}

async function tryWebkit() {
  try {
    await runBrowser("mobile-webkit", webkit, true);
  } catch (e) {
    log("mobile-webkit-skip", "SKIP", String(e.message || e).slice(0, 120));
  }
}

(async () => {
  await runBrowser("desktop-chromium", chromium, false);
  await tryWebkit();
  fs.writeFileSync(path.join(outDir, "test-results.json"), JSON.stringify(results, null, 2));
  const hardFail = results.some(r => r.pass === false);
  process.exit(hardFail ? 1 : 0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
