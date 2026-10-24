#!/usr/bin/env node
/**
 * Playwright: real saveMe path through game.js against Firebase emulators.
 */
const { chromium } = require("playwright");

const base = process.env.PUNK_BASE || "http://127.0.0.1:9876";
const qs = "?solo=1&firebaseEmulator=1&v=rules-save-test";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto(`${base}/${qs}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction(() => typeof firebase !== "undefined", undefined, { timeout: 60000 });
    await page.waitForSelector(".char-pick", { timeout: 90000 });
    await page.click('.char-pick[data-id="cobalt"]');
    await page.click("#charSelectConfirm");
    await page.waitForFunction(() => window.__playerLoaded === true && window.me?.characterId === "cobalt", undefined, {
      timeout: 120000
    });

    const snapshot = await page.evaluate(async () => {
      window.me.coins = 5000;
      window.buyItem("pet_dog");
      window.buyItem("mat_brick");
      location.hash = "#cemetery";
      await new Promise(r => setTimeout(r, 600));
      window.doJob("dig");
      await new Promise(r => setTimeout(r, 400));
      location.hash = "#street";
      await new Promise(r => setTimeout(r, 300));
      window.saveMe();
      await new Promise(r => setTimeout(r, 800));
      const uid = firebase.auth().currentUser.uid;
      const snap = await firebase.database().ref("players/" + uid).once("value");
      return {
        uid,
        pet: window.me.pet,
        coins: window.me.coins,
        location: window.me.location,
        shack: window.me.inventory?.materials?.shack || 0,
        lastJob: window.me.lastJob,
        dbPet: snap.val()?.pet,
        dbLocation: snap.val()?.location,
        dbShack: snap.val()?.inventory?.materials?.shack
      };
    });

    if (!snapshot.dbPet || snapshot.dbPet !== "pet_dog") {
      throw new Error(`save failed pet: ${JSON.stringify(snapshot)}`);
    }
    if (snapshot.dbLocation !== "street") {
      throw new Error(`location not saved: ${JSON.stringify(snapshot)}`);
    }
    if (!snapshot.dbShack || snapshot.dbShack < 1) {
      throw new Error(`material not saved: ${JSON.stringify(snapshot)}`);
    }
    if (!snapshot.lastJob) {
      throw new Error(`job not recorded: ${JSON.stringify(snapshot)}`);
    }

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });

    const after = await page.evaluate(() => ({
      pet: window.me.pet,
      location: window.me.location,
      shack: window.me.inventory?.materials?.shack || 0,
      coins: window.me.coins
    }));

    if (after.pet !== "pet_dog" || after.location !== "street" || after.shack < 1) {
      throw new Error(`reload restore failed: ${JSON.stringify(after)}`);
    }

    console.log("save-gameplay: PASS", JSON.stringify({ snapshot, after }));
  } finally {
    await browser.close();
  }
}

run().catch(e => {
  console.error("save-gameplay: FAIL", e);
  process.exit(1);
});
