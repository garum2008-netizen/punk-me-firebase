#!/usr/bin/env node
/**
 * Episode 1 smoke: start overlay, tutorial persistence on reload, E-talk priority, video artifact.
 * Browsers: Chromium + WebKit (Playwright).
 */
const fs = require("fs");
const path = require("path");
const { chromium, webkit } = require("playwright");

const { start, stop } = require("./local-static-server");
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
  const base = process.env.PUNK_BASE || global.__ep1Base || "http://127.0.0.1:8765";
  await page.goto(`${base}/?solo=1&v=ep1-${tag}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__punkFinishLoadMeFlow, { timeout: 120000 });
  await page.evaluate(() => {
    window.__punkApplyFirebaseSnapshot({ exists: () => false, val: () => null });
    window.__punkFinishLoadMeFlow();
  });
  await page.locator('.char-pick[data-id="cobalt"]').click();
  await page.locator("#charSelectConfirm").click();
  await page.waitForFunction(() => window.__playerLoaded, { timeout: 120000 });
  await page.locator("#howToOverlay .close, #howToOverlay button").first().click({ timeout: 3000 }).catch(() => {});
  const startVisible = await page.locator("#startGameOverlay.active").count();
  log.push(["start_overlay", startVisible > 0, startVisible]);
  await page.locator("#btnStartGame").click({ force: true, timeout: 15000 });
  await page.waitForFunction(() => window.me?.tutorial?.episode1Started === true, { timeout: 15000 });
  const tutorialStarted = await page.evaluate(() => window.me?.tutorial?.episode1Started === true);
  log.push(["tutorial_started", tutorialStarted]);
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
  const arcadeBlocked = await page.evaluate(() => {
    const snap = window.World3D?.getNearestNpc;
    window.World3D.getNearestNpc = () => null;
    const before = window.me.coins;
    const r = window.PlayV21?.tryInteract(window.me, { toast: () => {}, save: () => {} });
    if (snap) window.World3D.getNearestNpc = snap;
    return { blocked: r === false && window.me.coins === before, gain: window.me.coins - before };
  });
  log.push(["street_arcade_blocked_during_onboarding", arcadeBlocked.blocked, arcadeBlocked]);
  const talk = await page.evaluate(async () => {
    window.openNpcDialog?.("razor");
    await new Promise(r => setTimeout(r, 400));
    const dlg =
      document.getElementById("storyDialog")?.classList.contains("active") ||
      document.getElementById("gangModal")?.classList.contains("active");
    const step = window.me.onboarding?.step ?? 0;
    return { ok: dlg && step >= 3, dlg, step };
  });
  log.push(["razor_talk_opens_dialog", talk.ok, talk]);
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
  const base = process.env.PUNK_BASE || await start();
  global.__ep1Base = base;
  const report = {
    chromium: await runBrowser(chromium, "chromium"),
    webkit: await runBrowser(webkit, "webkit")
  };
  if (!process.env.PUNK_BASE) stop();
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
