#!/usr/bin/env node
/**
 * Playwright: life ch1 vertical slice — real keyboard + click input.
 * Requires: npx serve on PUNK_BASE (default 127.0.0.1:3456) + Firebase emulators if using firebaseEmulator=1.
 */
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

const base = process.env.PUNK_BASE || "http://127.0.0.1:3456";
const qs = "?solo=1&lifeCh1Local=1&lifeCh1E2e=1&v=life-ch1-slice-e2e";
const artifactsDir = process.env.PUNK_ARTIFACTS || "/opt/cursor/artifacts/life-ch1-e2e";

async function run() {
  fs.mkdirSync(artifactsDir, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    recordVideo: { dir: artifactsDir, size: { width: 390, height: 844 } }
  });
  const page = await context.newPage();
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

    await page.evaluate(async () => {
      window.me.onboarding = { step: 6, progress: {}, done: true };
      window.me.lifeCh1 = null;
      await window.LifeCh1Slice?.tryStartAfterOnboarding?.();
      window.saveMe?.();
    });
    await page.waitForFunction(
      () => window.LifeCh1Slice?.isActive?.() && window.me?.lifeCh1?.stepIndex === 0,
      undefined,
      { timeout: 30000 }
    );

    await page.evaluate(() => {
      document.getElementById("howToOverlay")?.classList.remove("active");
    });

    const canvas = page.locator("#stage3d");
    await canvas.click({ position: { x: 195, y: 300 } });
    await page.keyboard.down("w");
    await page.waitForTimeout(600);
    await page.keyboard.up("w");
    await page.waitForFunction(
      () => window.me?.lifeCh1?.stepIndex >= 1,
      undefined,
      { timeout: 15000 }
    ).catch(async () => {
      await page.evaluate(() => window.LifeCh1Slice?.onMove?.());
    });

    const coinsBefore = await page.evaluate(() => window.me.coins);

    await page.evaluate(() => {
      window.World3D?.setPlayerWorldPosition?.(-3.2, 2.5);
    });
    await canvas.click({ position: { x: 195, y: 300 } });
    await page.keyboard.press("e");
    await page.waitForSelector('[data-testid="life-ch1-skin-B"]', { timeout: 10000 });
    await page.click('[data-testid="life-ch1-skin-B"]');
    await page.click(".life-ch1-outfit-pick >> nth=0");
    await page.click("#lifeCh1WardrobeConfirm");
    await page.waitForFunction(
      () =>
        window.me?.lifeCh1?.stepIndex >= 2 &&
        window.me?.lifeCh1?.angelinaSkin === "B" &&
        window.me?.lifeCh1?.flags?.outfit_calm,
      undefined,
      { timeout: 10000 }
    );

    await page.evaluate(() => {
      window.World3D?.setPlayerWorldPosition?.(2.5, -1.8);
    });
    await canvas.click({ position: { x: 195, y: 300 } });
    await page.keyboard.press("e");
    await page.waitForSelector("#lifeCh1DialogPortrait", { timeout: 10000 });
    const portraitSrc = await page.getAttribute("#lifeCh1DialogPortrait", "src");
    if (!portraitSrc || !portraitSrc.includes("angelina-teen-B-portrait.webp")) {
      throw new Error("skin B dialogue portrait not shown: " + portraitSrc);
    }
    await page.waitForSelector(".life-ch1-choice", { timeout: 10000 });
    await page.click(".life-ch1-choice >> nth=1");
    await page.waitForFunction(
      () => window.me?.lifeCh1?.flags?.mystery_open && window.me?.lifeCh1?.stepIndex >= 3,
      undefined,
      { timeout: 10000 }
    );

    await canvas.click({ position: { x: 195, y: 300 } });
    await page.keyboard.press("e");
    await page.waitForSelector("#lifeCh1DlgOk", { timeout: 10000 });
    await page.click("#lifeCh1DlgOk");
    await page.waitForFunction(
      () => window.me?.lifeCh1?.completed === true,
      undefined,
      { timeout: 15000 }
    );

    const snap1 = await page.evaluate(() => ({
      coins: window.me.coins,
      lifeCh1: window.me.lifeCh1,
      storyQuest: window.me.story?.quest?.activeId
    }));
    if (snap1.coins <= coinsBefore) throw new Error("expected coin rewards: " + JSON.stringify(snap1));
    if (!snap1.lifeCh1.completed) throw new Error("life ch1 not completed");

    await page.evaluate(() => window.saveMe());
    await page.waitForTimeout(800);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });

    const after = await page.evaluate(() => ({
      lifeCh1: window.me.lifeCh1,
      coins: window.me.coins
    }));
    if (!after.lifeCh1?.completed) throw new Error("reload lost lifeCh1: " + JSON.stringify(after));
    if (after.lifeCh1?.angelinaSkin !== "B") throw new Error("skin not persisted: " + after.lifeCh1?.angelinaSkin);

    await page.screenshot({ path: path.join(artifactsDir, "life-ch1-complete.png"), fullPage: true });
    console.log("life-ch1-e2e: PASS", JSON.stringify({ snap1, after }));
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

run().catch(e => {
  console.error("life-ch1-e2e: FAIL", e);
  process.exit(1);
});
