#!/usr/bin/env node
/**
 * Records a real gameplay walkthrough video: Chapter 0 + Razor handoff.
 * Output: /opt/cursor/artifacts/punk-ch0-gameplay.webm
 */
import fs from "fs";
import path from "path";
import { chromium } from "playwright";

const base = process.env.PUNK_BASE || "http://127.0.0.1:3456";
const outDir = process.env.CH0_OUT || "/opt/cursor/artifacts";
fs.mkdirSync(outDir, { recursive: true });
const videoDir = path.join(outDir, "ch0-video-tmp");
fs.mkdirSync(videoDir, { recursive: true });

async function dismissHowTo(page) {
  const howto = page.locator("#howToOverlay.active .howto-close");
  try {
    await howto.waitFor({ state: "visible", timeout: 2500 });
    await howto.click({ force: true });
  } catch (_) {}
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } }
  });
  const page = await context.newPage();
  page.setDefaultTimeout(120000);

  await page.goto(`${base}/?solo=1&qaNav=1&v=ch0-capture`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded === true);
  if (await page.locator("#charSelectUi .char-pick").count()) {
    await page.click('.char-pick[data-id="cobalt"]');
    await page.click("#charSelectConfirm");
    await page.waitForFunction(() => window.me?.characterId === "cobalt");
  }
  await dismissHowTo(page);

  await page.keyboard.down("w");
  await page.keyboard.down("d");
  await page.waitForTimeout(2500);
  await page.keyboard.up("w");
  await page.keyboard.up("d");
  for (let i = 0; i < 8; i++) {
    if (await page.evaluate(() => (window.me?.onboarding?.step || 0) >= 1)) break;
    await page.keyboard.down("d");
    await page.waitForTimeout(400);
    await page.keyboard.up("d");
  }

  for (const loc of ["kitchen", "room"]) {
    await page.evaluate(id => goLocation(id), loc);
    await page.waitForTimeout(2200);
  }
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => typeof petDog === "function" && petDog(true));
    await page.waitForTimeout(400);
  }
  for (const loc of ["elevator", "street"]) {
    await page.evaluate(id => goLocation(id), loc);
    await page.waitForTimeout(2200);
  }

  await page.locator("#panelBottom button[onclick*=\"gangModal\"]").click();
  await page.click('#gangList .npc-row[data-npc="razor"]');
  await page.waitForTimeout(2500);
  await page.locator("#gangModal .close").click().catch(() => {});

  await page.waitForTimeout(2000);
  await context.close();
  await browser.close();

  const webms = fs.readdirSync(videoDir).filter(f => f.endsWith(".webm"));
  const src = webms[0] ? path.join(videoDir, webms[0]) : null;
  const dest = path.join(outDir, "punk-ch0-gameplay.webm");
  if (src) {
    fs.copyFileSync(src, dest);
    console.log("VIDEO", dest);
  } else {
    console.error("No video recorded");
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});