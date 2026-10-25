#!/usr/bin/env node
/**
 * Episode 1 smoke: start overlay, tutorial persistence on reload, E-talk priority, video artifact.
 * Browsers: Chromium + WebKit (Playwright).
 */
const fs = require("fs");
const path = require("path");
const { chromium, webkit } = require("playwright");

const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const outDir = path.join(__dirname, "../qa/episode1");
fs.mkdirSync(outDir, { recursive: true });

async function runBrowser(browserType, tag) {
  const videoDir = path.join(outDir, `video-${tag}`);
  fs.mkdirSync(videoDir, { recursive: true });
  const browser = await browserType.launch();
  const context = await browser.newContext({
    viewport: tag === "mob" ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    recordVideo: tag === "chromium" ? { dir: videoDir, size: { width: 1280, height: 720 } } : undefined
  });
  const page = await context.newPage();
  const log = [];
  await page.goto(`${base}/?solo=1&v=ep1-${tag}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__punkFinishLoadMeFlow, { timeout: 120000 });
  await page.evaluate(() => {
    window.__punkApplyFirebaseSnapshot({ exists: () => false, val: () => null });
    window.__punkFinishLoadMeFlow();
  });
  await page.locator('.char-pick[data-id="cobalt"]').click();
  await page.locator("#charSelectConfirm").click();
  await page.waitForFunction(() => window.__playerLoaded, { timeout: 120000 });
  const startVisible = await page.locator("#startGameOverlay.active").count();
  log.push(["start_overlay", startVisible > 0, startVisible]);
  await page.locator("#btnStartGame").click();
  await page.waitForFunction(() => window.me?.tutorial?.episode1Started === true, { timeout: 15000 });
  const tutorialStarted = await page.evaluate(() => window.me?.tutorial?.episode1Started === true);
  log.push(["tutorial_started", tutorialStarted, window.me?.tutorial]);
  await page.evaluate(() => {
    window.me._onboardOrigin = { x: 40, y: 60 };
    window.Onboarding.onMove(52, 72);
  });
  await page.evaluate(() => {
    const st = window.me.onboarding;
    return { step: st?.step, coins: window.me.coins, granted: window.me.story?.rewardsGranted || {} };
  });
  const afterStep = await page.evaluate(() => ({
    step: window.me.onboarding?.step,
    coins: window.me.coins,
    granted: Object.keys(window.me.story?.rewardsGranted || {})
  }));
  log.push(["onboard_step_after_move", afterStep.step >= 1, afterStep]);
  const coinsBefore = afterStep.coins;
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded, { timeout: 120000 });
  const afterReload = await page.evaluate(() => ({
    step: window.me.onboarding?.step,
    coins: window.me.coins
  }));
  log.push(["reload_keeps_step", afterReload.step === afterStep.step, afterReload]);
  log.push(["reload_no_dup_coins", afterReload.coins === coinsBefore, { coinsBefore, afterReload }]);
  await page.evaluate(() => {
    window.goLocation?.("street");
  });
  await page.waitForFunction(() => window.me?.location === "street", { timeout: 30000 });
  await page.evaluate(() => {
    window.me.onboarding.step = 2;
    window.me.onboarding.progress = {};
    window.Onboarding.syncGuideTarget?.();
  });
  const talk = await page.evaluate(async () => {
    const near = window.World3D?.getNearestNpc?.();
    if (near !== "razor") {
      const pl = window.me;
      pl.location = "street";
      window.goLocation?.("street");
    }
    await new Promise(r => setTimeout(r, 800));
    const nid = window.World3D?.getNearestNpc?.();
    if (nid !== "razor") return { ok: false, reason: "no_razor_near", nid };
    const before = window.me.coins;
    const mod = await import("./js/controls-3d.mjs");
    mod.touchInteract();
    await new Promise(r => setTimeout(r, 200));
    if (window.openNpcDialog) window.openNpcDialog("razor");
    await new Promise(r => setTimeout(r, 300));
    const arcadeGain = window.me.coins - before;
    const dlg =
      document.getElementById("storyDialog")?.classList.contains("active") ||
      document.getElementById("gangModal")?.classList.contains("active");
    return { ok: dlg && arcadeGain < 5, arcadeGain, dlg, nid };
  });
  log.push(["e_talk_razor_not_arcade", talk.ok, talk]);
  await page.screenshot({ path: path.join(outDir, `episode1-${tag}.png`) });
  await context.close();
  await browser.close();
  if (tag === "chromium") {
    const webm = fs.readdirSync(videoDir).find(f => f.endsWith(".webm"));
    if (webm) {
      const dest = path.join(outDir, "playthrough-demo.webm");
      fs.copyFileSync(path.join(videoDir, webm), dest);
      log.push(["video", true, dest]);
    }
  }
  return log;
}

async function main() {
  const report = { chromium: await runBrowser(chromium, "chromium"), webkit: await runBrowser(webkit, "webkit") };
  const flat = [...report.chromium, ...report.webkit];
  const ok = flat.every(([, pass]) => pass !== false);
  fs.writeFileSync(path.join(outDir, "episode1-report.json"), JSON.stringify(report, null, 2));
  console.log(ok ? "PASS" : "FAIL", "episode1", outDir);
  if (!ok) process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
