#!/usr/bin/env node
/** Compare construction hangout exposure across Chromium GL backends + WebKit. */
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const outDir = "/workspace/qa/playability/gl-diag";
fs.mkdirSync(outDir, { recursive: true });

async function shotConstruction(page, label) {
  await page.goto(`${base}/?solo=1&v=gl-diag-${label}`, { waitUntil: "domcontentloaded", timeout: 120000 });
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
    st.hangoutStage = 4;
    window.me.location = "construction";
    window.StoryEngine?.dismissAllStoryUi?.();
    window.StoryEngine?.clearDialogueCamera?.();
    window.World3D?.refreshHangoutStage?.(4);
    window.goLocation?.("construction");
  });
  await page.waitForFunction(() => window.me?.location === "construction", { timeout: 30000 });
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 120000 }).catch(() => {});
  await page.evaluate(() => {
    window.StoryEngine?.clearDialogueCamera?.();
    window.World3D?.refreshHangoutStage?.(4);
    window.World3D?.snapScreenshotView?.();
  });
  await new Promise(r => setTimeout(r, 900));
  const meta = await page.evaluate(() => ({
    exposure: window.World3D?.getRendererExposure?.() ?? null,
    loc: window.me?.location,
    stage: window.StoryEngine?.ensureStoryState?.(window.me)?.hangoutStage
  }));
  await page.screenshot({ path: path.join(outDir, `construction-${label}.png`) });
  return meta;
}

async function main() {
  const plans = [
    [chromium, "chromium-default", {}],
    [chromium, "chromium-angle-swiftshader", { args: ["--use-gl=angle", "--enable-unsafe-swiftshader"] }],
    [webkit, "webkit", {}]
  ];
  const report = [];
  for (const [browserType, label, launchOpts] of plans) {
    const browser = await browserType.launch(launchOpts);
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      const meta = await shotConstruction(page, label);
      report.push({ label, meta, ok: true });
    } catch (e) {
      report.push({ label, ok: false, error: String(e.message || e) });
    }
    await browser.close();
  }
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
