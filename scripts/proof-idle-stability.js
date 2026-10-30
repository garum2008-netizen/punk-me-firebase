#!/usr/bin/env node
/** Standing player: frame delta median should be ~0 (Chromium). */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { start, stop } = require("./local-static-server");

const outDir = process.env.QA_OUT || path.join(__dirname, "../qa/pr-a");
const FRAMES = Number(process.env.IDLE_FRAMES || 90);

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const base = process.env.PUNK_BASE || await start();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`${base}/?solo=1&v=idle-proof`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__punkFinishLoadMeFlow, { timeout: 120000 });
  await page.evaluate(() => {
    window.__punkApplyFirebaseSnapshot({ exists: () => false, val: () => null });
    window.__punkFinishLoadMeFlow();
  });
  await page.locator('.char-pick[data-id="cobalt"]').click();
  await page.locator("#charSelectConfirm").click();
  await page.waitForFunction(() => window.__playerLoaded, { timeout: 120000 });
  await page.locator("#howToOverlay .close, #howToOverlay button").first().click({ timeout: 3000 }).catch(() => {});
  await page.evaluate(() => document.getElementById("chapterIntro")?.classList.remove("active"));
  await page.waitForFunction(
    () => {
      const pl = window.World3D?.getDebugCamera?.()?.player;
      return pl && Number.isFinite(pl[0]) && Number.isFinite(pl[1]);
    },
    { timeout: 90000 }
  );
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(outDir, "idle-before.png") });
  const positions = [];
  for (let i = 0; i < FRAMES; i++) {
    await page.waitForTimeout(33);
    const p = await page.evaluate(() => {
      const pl = window.World3D?.getDebugCamera?.()?.player;
      return pl ? { x: pl[0], z: pl[1] } : null;
    });
    if (p) positions.push(p);
  }
  await page.screenshot({ path: path.join(outDir, "idle-after.png") });
  await browser.close();
  if (!process.env.PUNK_BASE) stop();

  const deltas = [];
  for (let i = 1; i < positions.length; i++) {
    deltas.push(Math.hypot(positions[i].x - positions[i - 1].x, positions[i].z - positions[i - 1].z));
  }
  deltas.sort((a, b) => a - b);
  const med = deltas.length ? deltas[Math.floor(deltas.length / 2)] : 999;
  const max = deltas.length ? Math.max(...deltas) : 999;
  const report = { medDelta: med, maxDelta: max, framePairs: deltas.length, pass: med < 0.015 && max < 0.045 };
  fs.writeFileSync(path.join(outDir, "idle-stability.json"), JSON.stringify(report, null, 2));
  const clipBefore = path.join(outDir, "idle-before.png");
  const clipAfter = path.join(outDir, "idle-after.png");
  console.log(JSON.stringify(report));
  if (!report.pass) process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
