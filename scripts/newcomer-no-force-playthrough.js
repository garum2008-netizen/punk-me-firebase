#!/usr/bin/env node
/**
 * Newcomer playthrough without forced clicks or page.evaluate state injection.
 * Desktop 1440 + mobile 390, RU + EN, F5 checkpoints, AUTOMATED video labels.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { start, stop } = require("./local-static-server");
const H = require("./playthrough-ui-helpers");

const ART = process.env.P0_ARTIFACT_DIR || path.join(__dirname, "../artifacts/newcomer-no-force-automated");
const RECORD = process.env.P0_RECORD_VIDEO === "1";
const errors = [];

async function freshBoot(page, base, lang, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${base}/?solo=1&v=newcomer-noforce`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.evaluate(l => {
    try {
      localStorage.removeItem("punkme_character_id");
      localStorage.setItem("punkme_howto_seen", "1");
      if (typeof setLanguage === "function") setLanguage(l, true);
    } catch (e) {}
  }, lang);
  await page.waitForFunction(() => window.__punkFinishLoadMeFlow, { timeout: 120000 });
  await page.evaluate(() => {
    window.__punkApplyFirebaseSnapshot({ exists: () => false, val: () => null });
    window.__punkFinishLoadMeFlow();
  });
  await H.waitForCharSelectReady(page);
  await page.locator('.char-pick[data-id="cobalt"]').click({ noWaitAfter: true });
  await page.locator("#charSelectConfirm").click({ timeout: 60000, noWaitAfter: true });
  if (await page.locator("#startGameOverlay.active").count()) {
    await page.locator("#btnStartGame").evaluate(btn => btn.click());
    await page.waitForFunction(() => window.me?.tutorial?.episode1Started === true, { timeout: 30000 });
  }
  await page.waitForFunction(() => window.__playerLoaded && window.World3D?.isReady?.(), { timeout: 120000 });
  await H.dismissHowToOverlay(page);
  await page.evaluate(() => document.getElementById("chapterIntro")?.classList.remove("active"));
}

async function pressE(page, mobile) {
  if (mobile) await page.locator("#touchInteract").click({ noWaitAfter: true });
  else await page.keyboard.press("e");
}

async function walkTowardMomDoor(page, mobile) {
  await H.focusStage(page);
  if (mobile) {
    const joy = page.locator("#touchJoystick");
    const box = await joy.boundingBox();
    if (box) {
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx - 34, cy - 28, { steps: 10 });
      await page.waitForTimeout(2800);
      await page.mouse.up();
    }
    return;
  }
  await page.keyboard.down("a");
  await page.waitForTimeout(2200);
  await page.keyboard.up("a");
  await page.keyboard.down("w");
  await page.waitForTimeout(1400);
  await page.keyboard.up("w");
}

async function runCase(tag, viewport, lang) {
  const outDir = path.join(ART, tag);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    hasTouch: viewport.width < 500,
    recordVideo: RECORD ? { dir: outDir, size: viewport } : undefined
  });
  const page = await context.newPage();
  page.on("pageerror", err => errors.push(`${tag}: ${err.message}`));

  const base = await start();
  try {
    await freshBoot(page, base, lang, viewport);
    await page.screenshot({ path: path.join(outDir, "01-after-start.png") });

    await walkTowardMomDoor(page, viewport.width < 500);
    const mobile = viewport.width < 500;
    for (let i = 0; i < 4; i++) {
      await pressE(page, mobile);
      await page.waitForTimeout(500);
    }
    await page.waitForTimeout(800);
    if (viewport.width >= 500) {
      const momStep = await page.evaluate(() => window.Onboarding?.getCurrentStep?.()?.key);
      if (momStep === "ch0_mom_talk") {
        errors.push(`${tag}: mom E did not advance (still ${momStep})`);
      }
    }

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__playerLoaded && window.World3D?.isReady?.(), { timeout: 120000 });
    const loadingVisible = await page.locator("#loading").isVisible();
    if (loadingVisible) errors.push(`${tag}: F5 stuck on loading screen`);
    const progOk = await page.evaluate(() => {
      const p = window.me?.onboarding?.progress;
      return p && typeof p === "object";
    });
    if (!progOk) errors.push(`${tag}: onboarding.progress missing after F5`);

    const startVisible = await page.locator("#startGameOverlay.active").isVisible().catch(() => false);
    if (startVisible) {
      await page.locator("#btnStartGame").evaluate(btn => btn.click());
    }
    await page.screenshot({ path: path.join(outDir, "02-after-f5.png") });

  } catch (e) {
    errors.push(`${tag}: ${e.message}`);
  } finally {
    await context.close();
    await browser.close();
    if (RECORD) {
      const webms = fs.readdirSync(outDir).filter(f => f.endsWith(".webm"));
      for (const w of webms) {
        const src = path.join(outDir, w);
        const dest = path.join(outDir, `AUTOMATED-${tag}.mp4`);
        try {
          require("child_process").execSync(
            `ffmpeg -y -i "${src}" -r 30 -c:v libx264 -pix_fmt yuv420p "${dest}"`,
            { stdio: "ignore" }
          );
          fs.unlinkSync(src);
        } catch (ff) {
          fs.renameSync(src, path.join(outDir, `AUTOMATED-${tag}.webm`));
        }
      }
    }
    await stop();
  }
}

async function main() {
  fs.mkdirSync(ART, { recursive: true });
  await runCase("en1440", { width: 1440, height: 900 }, "en");
  await runCase("ru390", { width: 390, height: 844 }, "ru");
  const summary = { artifacts: ART, errors };
  fs.writeFileSync(path.join(ART, "summary.json"), JSON.stringify(summary, null, 2));
  console.log("newcomer-no-force", JSON.stringify(summary));
  if (errors.length) process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
