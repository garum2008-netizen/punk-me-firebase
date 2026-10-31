#!/usr/bin/env node
/**
 * Playwright: life ch1 vertical slice — emulator-only, real keyboard movement.
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { isProdFirebaseRequest } = require("./firebase-prod-guard");
const {
  waitUntilSkinRendered,
  assertSkinRenderNow,
  assertSkinAfterReloadSchedule
} = require("./life-ch1-skin-render-assert");

const base = process.env.PUNK_BASE || "http://127.0.0.1:3456";
const qs =
  "?solo=1&firebaseEmulator=1&lifeCh1Slice=1&lifeCh1Local=1&lifeCh1E2e=1&v=life-ch1-slice-e2e";
const artifactsDir = process.env.PUNK_ARTIFACTS || "/opt/cursor/artifacts/life-ch1-e2e";

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

async function waitForSkinRendered(page, skinLetter = "B") {
  await waitUntilSkinRendered(page, skinLetter);
}

async function waitForLifeCh1Selector(page, selector, target = null) {
  await page.locator("#stage3d").click({ position: { x: 195, y: 300 } });
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    const done = await page.evaluate(
      ({ selector, target }) => {
        if (document.querySelector(selector)) return true;
        const pos = window.World3D?.getPlayerWorldPosition?.();
        if (target && pos) {
          const d = Math.hypot(target.tx - pos.x, target.tz - pos.z);
          if (d > (target.radius || 2.85) + 0.15) return false;
        }
        return window.LifeCh1Slice?.tryInteract?.() && !!document.querySelector(selector);
      },
      { selector, target }
    );
    if (done) return;
    if (target) {
      await page.evaluate(
        ({ tx, tz }) => window.World3D?.faceWorldTargetForE2e?.(tx, tz),
        target
      );
      await page.keyboard.down("Shift");
      await page.keyboard.down("w");
      await page.waitForTimeout(220);
      await page.keyboard.up("w");
      await page.keyboard.up("Shift");
    } else {
      await page.waitForTimeout(120);
    }
  }
  throw new Error(`timeout waiting for ${selector}`);
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
    const rt = route.request().resourceType();
    if (isProdFirebaseRequest(url) || (rt === "websocket" && isProdFirebaseRequest(url))) {
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
    await waitForLifeCh1Selector(page, '[data-testid="life-ch1-skin-B"]');
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
    await waitForSkinRendered(page, "B");

    await reloadAndWaitLoaded(page);
    await page.waitForFunction(() => window.me?.lifeCh1?.stepIndex >= 2, undefined, { timeout: 15000 });
    await assertReloadFlags(page, 2);
    await assertSkinAfterReloadSchedule(page, "B");
    await walkNear(page, -3.2, 2.5, 2.6);
    await assertSkinRenderNow(page, "B", "after walk reload 1");

    await walkNear(page, 2.5, -1.8, 2.75);
    await waitForLifeCh1Selector(page, "#lifeCh1DialogPortrait", { tx: 2.5, tz: -1.8, radius: 2.85 });
    await page.click(".life-ch1-choice >> nth=1");
    await page.waitForFunction(
      () => window.me?.lifeCh1?.flags?.mystery_open && window.me?.lifeCh1?.stepIndex >= 3,
      undefined,
      { timeout: 15000 }
    );

    await reloadAndWaitLoaded(page);
    await page.waitForFunction(() => window.me?.lifeCh1?.stepIndex >= 3, undefined, { timeout: 15000 });
    await assertReloadFlags(page, 3);
    await waitForSkinRendered(page, "B");

    await walkNear(page, 2.5, -1.8, 2.75);
    await waitForLifeCh1Selector(page, "#lifeCh1DlgOk", { tx: 2.5, tz: -1.8, radius: 2.85 });
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
    if ((snap1.lifeCh1.stepIndex || 0) > 3) throw new Error("stepIndex over max: " + snap1.lifeCh1.stepIndex);

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
      await assertSkinAfterReloadSchedule(page, "B");
      await walkNear(page, 2.5, -1.8, 2.75);
      await assertSkinRenderNow(page, "B", `after walk post-complete reload ${r + 1}`);
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
