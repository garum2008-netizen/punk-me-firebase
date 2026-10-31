#!/usr/bin/env node
/**
 * Playwright: life ch1 vertical slice — emulator-only, real keyboard movement.
 * Requires: static server on PUNK_BASE + Firebase emulators (auth 9099, db 9000).
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const base = process.env.PUNK_BASE || "http://127.0.0.1:3456";
const qs =
  "?solo=1&firebaseEmulator=1&lifeCh1Slice=1&lifeCh1Local=1&lifeCh1E2e=1&v=life-ch1-slice-e2e";
const artifactsDir = process.env.PUNK_ARTIFACTS || "/opt/cursor/artifacts/life-ch1-e2e";

const PROD_HOST_RE = /firebaseio\.com|googleapis\.com\/.*firebase|firebaseapp\.com/i;

async function dismissOverlays(page) {
  await page.evaluate(() => {
    document.getElementById("howToOverlay")?.classList.remove("active");
  });
}

async function walkNear(page, tx, tz, radius = 2.3, maxMs = 90000) {
  await dismissOverlays(page);
  const canvas = page.locator("#stage3d");
  await canvas.click({ position: { x: 195, y: 300 } });
  const start = Date.now();
  let lastDist = Infinity;
  let stall = 0;
  while (Date.now() - start < maxMs) {
    const pos = await page.evaluate(() => window.World3D?.getPlayerWorldPosition?.());
    if (!pos) throw new Error("World3D.getPlayerWorldPosition missing");
    const dx = tx - pos.x;
    const dz = tz - pos.z;
    const dist = Math.hypot(dx, dz);
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
  await dismissOverlays(page);
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
  let blockedProdRequests = 0;
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: { dir: artifactsDir, size: { width: 390, height: 844 } }
  });
  const page = await context.newPage();
  page.on("request", req => {
    const url = req.url();
    if (PROD_HOST_RE.test(url) && !url.includes("127.0.0.1") && !url.includes("localhost")) {
      blockedProdRequests += 1;
      req.abort("blockedbyclient").catch(() => {});
    }
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

    await page.evaluate(() => {
      document.getElementById("howToOverlay")?.classList.remove("active");
    });

    await startSliceAfterChapter0Shortcut(page);
    await page.waitForSelector('[data-testid="life-ch1-quest-panel"]', { timeout: 10000 });

    // Reload before wardrobe (step 0) — wardrobe flags must survive normalization
    await page.evaluate(() => window.saveMe());
    await reloadAndWaitLoaded(page);
    await page.waitForSelector('[data-testid="life-ch1-quest-panel"]', { timeout: 15000 });
    assertReloadFlags(page, 0);

    await walkMoveStep(page);
    await reloadAndWaitLoaded(page);
    await page.waitForFunction(() => (window.me?.lifeCh1?.stepIndex || 0) >= 1, undefined, {
      timeout: 15000
    });
    assertReloadFlags(page, 1);

    const coinsBefore = await page.evaluate(() => window.me.coins);
    await walkNear(page, -3.2, 2.5);
    await page.locator("#stage3d").click({ position: { x: 195, y: 300 } });
    for (let t = 0; t < 8; t++) {
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
    assertReloadFlags(page, 2);

    await walkNear(page, 2.5, -1.8);
    await page.locator("#stage3d").click({ position: { x: 195, y: 300 } });
    await page.keyboard.press("e");
    await page.waitForSelector("#lifeCh1DialogPortrait", { timeout: 15000 });
    const portraitSrc = await page.getAttribute("#lifeCh1DialogPortrait", "src");
    if (!portraitSrc || !portraitSrc.includes("angelina-teen-B-portrait.webp")) {
      throw new Error("skin B dialogue portrait not shown: " + portraitSrc);
    }
    await page.click(".life-ch1-choice >> nth=1");
    await page.waitForFunction(
      () => window.me?.lifeCh1?.flags?.mystery_open && window.me?.lifeCh1?.stepIndex >= 3,
      undefined,
      { timeout: 15000 }
    );

    await reloadAndWaitLoaded(page);
    await page.waitForFunction(() => window.me?.lifeCh1?.stepIndex >= 3, undefined, { timeout: 15000 });
    assertReloadFlags(page, 3);

    await walkNear(page, 2.5, -1.8);
    await page.locator("#stage3d").click({ position: { x: 195, y: 300 } });
    await page.keyboard.press("e");
    await page.waitForSelector("#lifeCh1DlgOk", { timeout: 15000 });
    await page.click("#lifeCh1DlgOk");
    await page.waitForFunction(() => window.me?.lifeCh1?.completed === true, undefined, {
      timeout: 20000
    });

    const snap1 = await page.evaluate(() => ({
      coins: window.me.coins,
      lifeCh1: window.me.lifeCh1,
      claimed: window.me.lifeCh1?.claimedSteps
    }));
    if (snap1.coins <= coinsBefore) throw new Error("expected coin rewards: " + JSON.stringify(snap1));
    if (!snap1.lifeCh1.completed) throw new Error("life ch1 not completed");

    await page.evaluate(() => window.saveMe());
    await reloadAndWaitLoaded(page);
    const after = await page.evaluate(() => ({
      lifeCh1: window.me.lifeCh1,
      coins: window.me.coins
    }));
    if (!after.lifeCh1?.completed) throw new Error("reload lost lifeCh1 completed: " + JSON.stringify(after));
    if (after.lifeCh1?.angelinaSkin !== "B") throw new Error("skin not persisted: " + after.lifeCh1?.angelinaSkin);

    await page.screenshot({ path: path.join(artifactsDir, "life-ch1-complete.png"), fullPage: true });

    if (blockedProdRequests !== 0) {
      throw new Error(`expected 0 prod Firebase requests, blocked ${blockedProdRequests}`);
    }
    console.log(
      "life-ch1-e2e: PASS",
      JSON.stringify({ blockedProdRequests, snap1, after, mobileQuest: true })
    );
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

async function walkMoveStep(page) {
  await dismissOverlays(page);
  const canvas = page.locator("#stage3d");
  await canvas.click({ position: { x: 195, y: 300 } });
  for (let i = 0; i < 8; i++) {
    await page.keyboard.down("w");
    await page.waitForTimeout(350);
    await page.keyboard.up("w");
    const idx = await page.evaluate(() => window.me?.lifeCh1?.stepIndex ?? 0);
    if (idx >= 1) return;
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
      st.flags.__reload_probe = true;
      delete st.flags.__reload_probe;
    },
    { minStep }
  );
}

run().catch(e => {
  console.error("life-ch1-e2e: FAIL", e);
  process.exit(1);
});
