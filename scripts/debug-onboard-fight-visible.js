#!/usr/bin/env node
const { chromium } = require("playwright");
const { assertFirebaseEmulatorTestEnv, firebaseEmulatorQueryString } = require("./firebase-test-emulator-guard");
assertFirebaseEmulatorTestEnv();
const qs = firebaseEmulatorQueryString();

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`http://127.0.0.1:3456/?solo=1${qs}&v=dbg`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.removeItem("punkme_lifech1_local_player_v1");
    localStorage.removeItem("punkme_lifech1_local_device_id");
    localStorage.removeItem("punkme_character_id");
  });
  await page.reload();
  await page.waitForSelector("[data-testid=char-select-angelina]");
  await page.click("#charSelectPortraits .char-portrait-pick >> nth=0");
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.__playerLoaded);
  await page.locator(".howto-close").click().catch(() => {});
  await page.waitForFunction(() => document.body.classList.contains("mode-world3d"));
  await page.evaluate(() => {
    window.me.onboarding = { step: 4, done: false, progress: {} };
    window.me.location = "street";
  });
  await page.click('#panelBottom button[onclick*="gangModal"]');
  await page.waitForSelector("#gangModal.active");
  await page.click('.npc-row[data-npc="razor"]');
  await page.waitForSelector('button[onclick*="startNpcFight"]', { timeout: 15000 });
  await page.click('button[onclick*="startNpcFight"]');
  await page.waitForTimeout(1200);
  for (let i = 0; i < 30; i++) {
    const snap = await page.evaluate(() => {
      const atk = document.querySelector('[data-testid="duel3d-attack"]');
      const atkB = atk?.getBoundingClientRect();
      const fbtn = document.querySelector('#fightOverlay button[onclick*="fightAttack"]');
      const fB = fbtn?.getBoundingClientRect();
      return {
        step: window.me?.onboarding?.step,
        hudHidden: document.getElementById("duel3dHud")?.classList.contains("hidden"),
        fo: document.getElementById("fightOverlay")?.classList.contains("active"),
        atk: atkB ? { w: atkB.width, h: atkB.height } : null,
        f: fB ? { w: fB.width, h: fB.height } : null
      };
    });
    if (snap.fo && snap.f?.w > 2) {
      await page.click('#fightOverlay button[onclick*="fightAttack"]');
    } else if (!snap.hudHidden && snap.atk?.w > 2) {
      await page.click('[data-testid="duel3d-attack"]');
    }
    await page.waitForTimeout(400);
    if (snap.step > 4) {
      console.log("PASS fight", i, snap);
      await browser.close();
      process.exit(0);
    }
    if (i % 5 === 0) console.log(i, snap);
  }
  console.log("FAIL still step 4");
  await page.screenshot({ path: "/opt/cursor/artifacts/ice-ch1-footage/fight-debug-onboard.png", fullPage: true });
  await browser.close();
  process.exit(1);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
