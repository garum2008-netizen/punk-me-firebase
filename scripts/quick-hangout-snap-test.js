#!/usr/bin/env node
/** Simulate Bolt cinematic lighting then capture hangout stages 1–4. */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const outDir = "/workspace/qa/playability/_quick";
fs.mkdirSync(outDir, { recursive: true });

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(`${base}/?solo=1&v=hangout-snap-quick`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__punkFinishLoadMeFlow, { timeout: 120000 });
  await page.evaluate(() => {
    window.__punkApplyFirebaseSnapshot({ exists: () => false, val: () => null });
    window.__punkFinishLoadMeFlow();
  });
  await page.locator('.char-pick[data-id="cobalt"]').click();
  await page.locator("#charSelectConfirm").click();
  await page.waitForFunction(() => window.__playerLoaded, { timeout: 120000 });
  await page.evaluate(() => {
    const st = window.StoryEngine.ensureStoryState(window.me);
    st.flags.joined_gang = true;
    window.me.location = "construction";
    window.goLocation?.("construction");
  });
  await page.waitForFunction(() => window.me?.location === "construction", { timeout: 30000 });
  for (let cycle = 0; cycle < 3; cycle++) {
    await page.evaluate(() => {
      window.World3D?.engageDialogueFraming?.("bolt", { live: false });
    });
    await page.waitForTimeout(120);
    await page.evaluate(() => window.StoryEngine?.dismissAllStoryUi?.());
    await page.waitForTimeout(80);
  }
  for (let stage = 1; stage <= 4; stage++) {
    await page.evaluate(async s => {
      window.StoryEngine?.dismissAllStoryUi?.();
      window.World3D?.snapHangoutBuildShot?.(s);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      window.World3D?.renderCaptureFrame?.();
    }, stage);
    await page.waitForTimeout(200);
    const pad = String(stage).padStart(2, "0");
    await page.screenshot({ path: path.join(outDir, `post-bolt-stage-${pad}.png`) });
    await page.evaluate(() => window.World3D?.releaseCaptureFrame?.());
  }
  await browser.close();
  console.log("wrote", outDir);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
