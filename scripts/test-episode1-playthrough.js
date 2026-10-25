#!/usr/bin/env node
/**
 * Episode 1: full UI onboarding + propiska intro, KeyE / mobile talk, Chromium + WebKit.
 */
const fs = require("fs");
const path = require("path");
const { chromium, webkit } = require("playwright");
const { start, stop } = require("./local-static-server");
const H = require("./playthrough-ui-helpers");
const Flow = require("./episode1-ui-flow");

const outDir = path.join(__dirname, "../qa/episode1");
fs.mkdirSync(outDir, { recursive: true });

async function testKeyEAndMobileTalk(page, touchOnly) {
  await H.bootSolo(page, global.__ep1Base, `ep1-keye-${touchOnly ? "mob" : "desk"}`);
  await H.pickCobaltUi(page);
  await page.locator("#btnStartGame").click({ force: true, timeout: 15000 });
  await H.navGo(page, "street");
  await page.evaluate(() => {
    window.me.onboarding.step = 2;
    window.me.onboarding.progress = {};
    window.Onboarding.syncGuideTarget?.();
  });

  const inputBlocks = await page.evaluate(async () => {
    const inp = document.createElement("input");
    inp.id = "ep1-test-input";
    document.body.appendChild(inp);
    inp.focus();
    const before = document.getElementById("gangModal")?.classList.contains("active");
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyE", key: "e", bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    const duringInput =
      !document.getElementById("gangModal")?.classList.contains("active") &&
      !document.getElementById("storyDialog")?.classList.contains("active");
    inp.remove();
    return { duringInput, before };
  });

  await page.evaluate(() => {
    if (window.World3D) window.World3D.getNearestNpc = () => "razor";
  });
  await H.focusStage(page);
  await page.keyboard.press("e");
  await H.sleep(600);
  const talkOpens = await page.evaluate(() => {
    return (
      document.getElementById("gangModal")?.classList.contains("active") ||
      document.getElementById("storyDialog")?.classList.contains("active")
    );
  });

  let mobileSame = true;
  if (touchOnly) {
    await page.evaluate(() => {
      if (window.World3D) window.World3D.getNearestNpc = () => "razor";
    });
    const touch = page.locator("#touchTalk");
    if (await touch.isVisible()) await touch.click();
    else await page.locator("#touchInteract").click();
    await H.sleep(400);
    mobileSame = await page.evaluate(
      () =>
        document.getElementById("gangModal")?.classList.contains("active") ||
        document.getElementById("storyDialog")?.classList.contains("active")
    );
  }

  return {
    key_e_blocked_in_input: inputBlocks.duringInput,
    key_e_opens_npc: talkOpens,
    mobile_talk_same: touchOnly ? mobileSame : true
  };
}

async function runBrowser(browserType, tag, opts = {}) {
  const { touchOnly = false, recordVideo = false } = opts;
  const videoDir = path.join(outDir, `video-${tag}`);
  if (recordVideo) fs.mkdirSync(videoDir, { recursive: true });
  const browser = await browserType.launch();
  const context = await browser.newContext({
    viewport: touchOnly ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    isMobile: touchOnly,
    hasTouch: touchOnly,
    recordVideo: recordVideo ? { dir: videoDir, size: { width: 1280, height: 720 } } : undefined
  });
  const page = await context.newPage();
  const log = [];
  const base = process.env.PUNK_BASE || global.__ep1Base;

  await H.bootSolo(page, base, `ep1-${tag}`);
  await H.pickCobaltUi(page);
  const startVisible = await page.locator("#startGameOverlay.active").count();
  log.push(["start_overlay", startVisible > 0, startVisible]);
  await page.locator("#btnStartGame").click({ force: true, timeout: 15000 });
  await page.waitForFunction(() => window.me?.tutorial?.episode1Started === true, { timeout: 15000 });

  const final = await Flow.runFullEpisode1Ui(page, {
    touchOnly,
    walkMs: touchOnly ? 1400 : 1800,
    snapDir: outDir,
    snapTag: tag
  });
  log.push(["onboarding_done", final.onboardingDone, final]);
  log.push(["propiska_quest", final.quest === "q_initiation_pay", final.quest]);

  const reload = await Flow.reloadAndContinue(page);
  log.push([
    "reload_keeps_progress",
    reload.after.done && reload.after.coins === reload.coinsBefore,
    reload
  ]);

  await page.screenshot({ path: path.join(outDir, `episode1-${tag}.png`) });

  await context.close();
  await browser.close();

  if (recordVideo) {
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
    chromium: await runBrowser(chromium, "chromium", { recordVideo: true }),
    webkit: await runBrowser(webkit, "webkit"),
    mobile: []
  };

  const mobBrowser = await chromium.launch();
  const mobPage = await mobBrowser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  mobPage.on("dialog", d => d.accept().catch(() => {}));
  const keyTests = await testKeyEAndMobileTalk(mobPage, true);
  await mobBrowser.close();
  report.keye_mobile = keyTests;

  const deskBrowser = await chromium.launch();
  const deskPage = await deskBrowser.newPage({ viewport: { width: 1280, height: 800 } });
  report.keye_desktop = await testKeyEAndMobileTalk(deskPage, false);
  await deskBrowser.close();

  if (!process.env.PUNK_BASE) stop();

  const flat = [...report.chromium, ...report.webkit];
  const keyOk =
    report.keye_desktop.key_e_blocked_in_input &&
    report.keye_desktop.key_e_opens_npc &&
    report.keye_mobile.key_e_blocked_in_input &&
    report.keye_mobile.mobile_talk_same;
  const ok = flat.every(([, pass]) => pass !== false) && keyOk;
  report.pass = ok;
  fs.writeFileSync(path.join(outDir, "episode1-report.json"), JSON.stringify(report, null, 2));
  console.log(ok ? "PASS" : "FAIL", "episode1", outDir);
  if (!ok) process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
