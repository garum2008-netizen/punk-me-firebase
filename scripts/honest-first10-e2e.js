#!/usr/bin/env node
/**
 * AUTOMATED smoke only — NOT full ch0→ch1. See test:honest-ch01-emulator-e2e.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { start, stop } = require("./local-static-server");
const H = require("./playthrough-ui-helpers");
const { assertNoProductionBase } = require("./lib/guard-no-prod-firebase");

assertNoProductionBase();

const ART =
  process.env.HONEST_FIRST10_ART ||
  (fs.existsSync("/opt/cursor/artifacts")
    ? "/opt/cursor/artifacts/honest-first10-e2e"
    : path.join(__dirname, "../artifacts/honest-first10-e2e"));

const errors = [];

async function assertNoRawKeys(page, tag) {
  const bad = await page.evaluate(() => {
    const text = document.body.innerText || "";
    const keys = text.match(/\bep1_[a-z0-9_]+\b/gi) || [];
    const domKeys = [...document.querySelectorAll("#voiceSubtitle, .angelina-help-body, .quest-step-text")]
      .map(el => el.textContent || "")
      .join(" ");
    const domBad = domKeys.match(/\bep1_[a-z0-9_]+\b/gi) || [];
    return [...new Set([...keys, ...domBad])];
  });
  if (bad.length) errors.push(`${tag}: raw i18n keys in DOM: ${bad.join(", ")}`);
}

async function assertMenuTapMobile(page, tag) {
  await page.locator("#btnGameMenu").click({ timeout: 8000, force: true });
  const open = await page.locator("#gameMenuOverlay.active").count();
  if (!open) errors.push(`${tag}: menu did not open on mobile`);
  await page.locator("#gameMenuClose").click();
}

async function runViewport(tag, viewport, lang) {
  const outDir = path.join(ART, tag);
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    hasTouch: viewport.width < 500
  });
  const page = await context.newPage();
  page.on("pageerror", e => errors.push(`${tag}: pageerror ${e.message}`));

  const base = await start();
  try {
    await page.goto(`${base}/?solo=1&v=honest-first10-${tag}`, {
      waitUntil: "domcontentloaded",
      timeout: 120000
    });
    await page.evaluate(l => {
      try {
        localStorage.setItem("punkme_howto_seen", "1");
        if (typeof setLanguage === "function") setLanguage(l, true);
      } catch (e) {}
    }, lang);
    await page.waitForFunction(() => window.__punkFinishLoadMeFlow, { timeout: 120000 });
    await page.evaluate(() => {
      window.__punkApplyFirebaseSnapshot({ exists: () => false, val: () => null });
      window.__punkFinishLoadMeFlow();
      window.__punkHideLoading?.();
    });
    await page.waitForFunction(
      () => {
        const l = document.getElementById("loading");
        return !l || getComputedStyle(l).display === "none" || l.offsetParent === null;
      },
      undefined,
      { timeout: 120000 }
    );
    await H.waitForCharSelectReady(page);
    await page.locator('.char-pick[data-id="cobalt"]').click({ force: true });
    await page.locator("#charSelectConfirm").click({ force: true });
    if (await page.locator("#startGameOverlay.active").count()) {
      await page.locator("#btnStartGame").click();
    }
    await page.waitForFunction(() => window.__playerLoaded && window.World3D?.isReady?.(), {
      timeout: 120000
    });
    await H.dismissHowToOverlay(page);
    await page.evaluate(() => document.getElementById("chapterIntro")?.classList.remove("active"));
    await page.screenshot({ path: path.join(outDir, "01-ingame.png") });

    if (viewport.width < 500) await assertMenuTapMobile(page, tag);

    await H.walkDesktop(page).catch(() => H.walkMobile(page));
    const mobile = viewport.width < 500;
    for (let i = 0; i < 3; i++) {
      if (mobile) await page.locator("#touchInteract").click({ noWaitAfter: true });
      else await page.keyboard.press("e");
      await page.waitForTimeout(400);
    }
    await assertNoRawKeys(page, tag);

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__playerLoaded && window.World3D?.isReady?.(), {
      timeout: 120000
    });
    if (await page.locator("#startGameOverlay.active").count()) {
      await page.locator("#btnStartGame").click();
      await page.waitForTimeout(600);
    }
    await assertNoRawKeys(page, `${tag}-f5`);
    await page.screenshot({ path: path.join(outDir, "02-after-f5.png") });
  } catch (e) {
    errors.push(`${tag}: ${e.message}`);
  } finally {
    await context.close();
    await browser.close();
    await stop();
  }
}

async function main() {
  fs.mkdirSync(ART, { recursive: true });
  await runViewport("en1440", { width: 1440, height: 900 }, "en");
  await runViewport("ru390", { width: 390, height: 844 }, "ru");
  const summary = { artifacts: ART, errors, automated: true, note: "Not a human playthrough." };
  fs.writeFileSync(path.join(ART, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
  process.exit(errors.length ? 1 : 0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
