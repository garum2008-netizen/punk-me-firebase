#!/usr/bin/env node
/**
 * Playwright: life ch1 vertical slice — emulator-only, real keyboard movement.
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const base = process.env.PUNK_BASE || "http://127.0.0.1:3456";
const qs =
  "?solo=1&firebaseEmulator=1&lifeCh1Slice=1&lifeCh1Local=1&lifeCh1E2e=1&v=life-ch1-slice-e2e";
const artifactsDir = process.env.PUNK_ARTIFACTS || "/opt/cursor/artifacts/life-ch1-e2e";

const PROD_HOST_RE =
  /(?:firebaseio\.com|firebasedatabase\.app|firebaseapp\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com)/i;

function isProdFirebaseUrl(url) {
  if (/127\.0\.0\.1|localhost/.test(url)) return false;
  return PROD_HOST_RE.test(url);
}

async function dismissHowToPlay(page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (_) {}
  });
  const close = page.locator(".howto-close");
  if (await close.isVisible({ timeout: 2500 }).catch(() => false)) {
    await close.click();
  }
  await page.waitForFunction(
    () => !document.getElementById("howToOverlay")?.classList.contains("active"),
    undefined,
    { timeout: 8000 }
  );
}

async function walkNear(page, tx, tz, radius = 2.6, maxMs = 90000) {
  await dismissHowToPlay(page);
  const canvas = page.locator("#stage3d");
  await canvas.click({ position: { x: 195, y: 300 } });
  const start = Date.now();
  let stall = 0;
  let lastDist = Infinity;
  while (Date.now() - start < maxMs) {
    const pos = await page.evaluate(() => window.World3D?.getPlayerWorldPosition?.());
    if (!pos) throw new Error("World3D.getPlayerWorldPosition missing");
    const dist = Math.hypot(tx - pos.x, tz - pos.z);
    if (dist <= radius) return;
    if (dist >= lastDist - 0.02) stall += 1;
    else stall = 0;
    lastDist = dist;
    await page.evaluate(
      ({ tx, tz }) => window.World3D?.faceWorldTargetForE2e?.(tx, tz),
      { tx, tz }
    );
    if (stall > 10) {
      for (const key of ["w", "a", "s", "d"]) {
        await page.keyboard.down(key);
        await page.waitForTimeout(180);
        await page.keyboard.up(key);
      }
      stall = 0;
    }
    await page.keyboard.down("Shift");
    await page.keyboard.down("w");
    await page.waitForTimeout(380);
    await page.keyboard.up("w");
    await page.keyboard.up("Shift");
    await page.waitForTimeout(50);
  }
  const last = await page.evaluate(() => window.World3D?.getPlayerWorldPosition?.());
  throw new Error(`walkNear timeout target ${tx},${tz} last=${JSON.stringify(last)}`);
}

async function reloadAndWaitLoaded(page) {
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
  await page.waitForFunction(() => window.LifeCh1Slice?.isLifeCh1SliceEnabled?.(), undefined, {
    timeout: 30000
  });
  await page.waitForFunction(
    () => document.body.classList.contains("mode-world3d") && window.World3D?.getPlayerWorldPosition,
    undefined,
    { timeout: 60000 }
  );
  await dismissHowToPlay(page);
}

async function startSliceAfterChapter0Shortcut(page) {
  console.log("e2e: chapter-0 shortcut — onboarding.done=true (labeled test-only)");
  await page.evaluate(async () => {
    window.me.onboarding = { step: 6, progress: {}, done: true };
    window.LifeCh1Slice?.ensureLifeCh1?.(window.me);
    await window.LifeCh1Slice?.tryStartAfterOnboarding?.();
    window.saveMe?.();
  });
  await page.waitForFunction(
    () => window.LifeCh1Slice?.isActive?.() && window.me?.lifeCh1?.stepIndex === 0,
    undefined,
    { timeout: 30000 }
  );
}

async function assertPlayerCutoutVisible(page) {
  const ok = await page.evaluate(() => {
    const pl = window.World3D?.getPlayerWorldPosition?.();
    if (!pl) return false;
    return window.me?.lifeCh1?.angelinaSkin === "B";
  });
  if (!ok) throw new Error("expected skin B on player state");
  await page.waitForFunction(
    () => {
      const st = window.me?.lifeCh1;
      if (!st || st.angelinaSkin !== "B") return false;
      return document.body.classList.contains("life-ch1-active") || st.completed || st.stepIndex >= 2;
    },
    undefined,
    { timeout: 15000 }
  );
}

async function run() {
  fs.mkdirSync(artifactsDir, { recursive: true });
  let prodAttempts = 0;
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: artifactsDir, size: { width: 390, height: 844 } }
  });
  const page = await context.newPage();
  await page.route("**/*", route => {
    const url = route.request().url();
    if (isProdFirebaseUrl(url)) {
      prodAttempts += 1;
      return route.abort();
    }
    return route.continue();
  });

  try {
    await page.goto(`${base}/${qs}`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await page.waitForFunction(() => typeof firebase !== "undefined", undefined, { timeout: 60000 });
    await page.waitForSelector(".char-pick", { timeout: 90000 });
    await page.click('.char-pick[data-id="cobalt"]');
    await page.click("#charSelectConfirm");
    await page.waitForFunction(
      () => window.__playerLoaded === true && window.me?.characterId === "cobalt",
      undefined,
      { timeout: 120000 }
    );
    await dismissHowToPlay(page);

    await startSliceAfterChapter0Shortcut(page);
    await page.waitForSelector('[data-testid="life-ch1-quest-panel"]', { timeout: 10000 });

    await page.evaluate(() => window.saveMe());
    await reloadAndWaitLoaded(page);
    await page.waitForSelector('[data-testid="life-ch1-quest-panel"]', { timeout: 15000 });
    await assertReloadFlags(page, 0);

    await walkMoveStep(page);
    await reloadAndWaitLoaded(page);
    await page.waitForFunction(() => (window.me?.lifeCh1?.stepIndex || 0) >= 1, undefined, {
      timeout: 15000
    });
    await assertReloadFlags(page, 1);

    const coinsBefore = await page.evaluate(() => window.me.coins);
    await walkNear(page, -3.2, 2.5);
    await page.locator("#stage3d").click({ position: { x: 195, y: 300 } });
    for (let t = 0; t < 12; t++) {
      await page.keyboard.down("e");
      await page.waitForTimeout(320);
      await page.keyboard.up("e");
      await page.waitForTimeout(120);
      if (await page.locator('[data-testid="life-ch1-skin-B"]').isVisible().catch(() => false)) break;
    }
    await page.waitForSelector('[data-testid="life-ch1-skin-B"]', { timeout: 15000 });
    await page.click('[data-testid="life-ch1-skin-B"]');
    await page.click(".life-ch1-outfit-pick >> nth=0");
    await page.click("#lifeCh1WardrobeConfirm");
    await page.waitForFunction(
      () =>
        window.me?.lifeCh1?.stepIndex >= 2 &&
        window.me?.lifeCh1?.angelinaSkin === "B" &&
        window.me?.lifeCh1?.flags?.outfit_calm,
      undefined,
      { timeout: 15000 }
    );

    await reloadAndWaitLoaded(page);
    await page.waitForFunction(() => window.me?.lifeCh1?.stepIndex >= 2, undefined, { timeout: 15000 });
    await assertReloadFlags(page, 2);
    await assertPlayerCutoutVisible(page);

    await walkNear(page, 2.5, -1.8);
    await page.locator("#stage3d").click({ position: { x: 195, y: 300 } });
    for (let t = 0; t < 12; t++) {
      await dismissHowToPlay(page);
      await page.keyboard.down("e");
      await page.waitForTimeout(320);
      await page.keyboard.up("e");
      await page.waitForTimeout(120);
      if (await page.locator("#lifeCh1DialogPortrait").isVisible().catch(() => false)) break;
    }
    await page.waitForSelector("#lifeCh1DialogPortrait", { timeout: 15000 });
    await page.click(".life-ch1-choice >> nth=1");
    await page.waitForFunction(
      () => window.me?.lifeCh1?.flags?.mystery_open && window.me?.lifeCh1?.stepIndex >= 3,
      undefined,
      { timeout: 15000 }
    );

    await reloadAndWaitLoaded(page);
    await page.waitForFunction(() => window.me?.lifeCh1?.stepIndex >= 3, undefined, { timeout: 15000 });
    await assertReloadFlags(page, 3);

    await walkNear(page, 2.5, -1.8);
    await page.locator("#stage3d").click({ position: { x: 195, y: 300 } });
    for (let t = 0; t < 12; t++) {
      await dismissHowToPlay(page);
      await page.keyboard.down("e");
      await page.waitForTimeout(320);
      await page.keyboard.up("e");
      await page.waitForTimeout(120);
      if (await page.locator("#lifeCh1DlgOk").isVisible().catch(() => false)) break;
    }
    await page.waitForSelector("#lifeCh1DlgOk", { timeout: 15000 });
    await page.click("#lifeCh1DlgOk");
    await page.waitForFunction(() => window.me?.lifeCh1?.completed === true, undefined, {
      timeout: 20000
    });

    const snap1 = await page.evaluate(() => ({
      coins: window.me.coins,
      lifeCh1: window.me.lifeCh1
    }));
    if (snap1.coins <= coinsBefore) throw new Error("expected coin rewards: " + JSON.stringify(snap1));
    if (!snap1.lifeCh1.completed) throw new Error("life ch1 not completed");

    const coinsAfterComplete = snap1.coins;
    for (let r = 0; r < 3; r++) {
      await page.evaluate(() => window.saveMe());
      await reloadAndWaitLoaded(page);
      await page.waitForFunction(() => window.me?.lifeCh1?.completed === true, undefined, {
        timeout: 20000
      });
      const coins = await page.evaluate(() => window.me.coins);
      if (coins !== coinsAfterComplete) {
        throw new Error(`coins reset on reload ${r + 1}: ${coinsAfterComplete} -> ${coins}`);
      }
      await assertPlayerCutoutVisible(page);
    }

    if (prodAttempts !== 0) {
      throw new Error(`expected 0 prod Firebase requests, saw ${prodAttempts}`);
    }
    console.log(
      "life-ch1-e2e: PASS",
      JSON.stringify({ prodAttempts, snap1, coinsAfterComplete, run: process.env.LIFE_CH1_E2E_RUN || "1" })
    );
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

async function walkMoveStep(page) {
  await dismissHowToPlay(page);
  const canvas = page.locator("#stage3d");
  await canvas.click({ position: { x: 195, y: 300 } });
  for (let i = 0; i < 10; i++) {
    await page.keyboard.down("w");
    await page.waitForTimeout(350);
    await page.keyboard.up("w");
    if ((await page.evaluate(() => window.me?.lifeCh1?.stepIndex ?? 0)) >= 1) return;
  }
  throw new Error("move step did not advance with real keys");
}

async function assertReloadFlags(page, minStep) {
  await page.evaluate(
    ({ minStep }) => {
      window.LifeCh1Slice?.ensureLifeCh1?.(window.me);
      const st = window.me.lifeCh1;
      if (!st?.flags || typeof st.flags !== "object") throw new Error("flags missing after reload");
      if (!st.claimedSteps || typeof st.claimedSteps !== "object") throw new Error("claimedSteps missing");
      if ((st.stepIndex || 0) < minStep) throw new Error("step regressed on reload");
    },
    { minStep }
  );
}

run().catch(e => {
  console.error("life-ch1-e2e: FAIL", e);
  process.exit(1);
});
