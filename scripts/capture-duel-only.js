require('./lib/require-local-capture.js');
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outRoot = process.env.QA_OUT || "/workspace/qa-out";
fs.mkdirSync(outRoot, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";

(async () => {
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await desk.addInitScript(() => {
    try { localStorage.setItem("punkme_howto_seen", "1"); } catch (e) {}
  });
  await desk.goto(`${base}/?dev=1&solo=1&v=duel-cap`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await desk.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  if (await desk.locator("#charSelectConfirm").isVisible({ timeout: 8000 }).catch(() => false)) {
    await desk.evaluate(() => {
      document.querySelector('.char-pick[data-id="cobalt"]')?.click();
      document.getElementById("charSelectConfirm")?.click();
    });
  }
  await desk.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 120000 });
  await desk.evaluate(() => {
    document.getElementById("charSelect")?.classList.remove("active");
    me.onboarding = { step: 6, progress: {}, done: true };
    saveMe?.();
    World3D?.resize?.();
    PlayV21?.endAllActivities?.();
    StoryEngine?.dismissAllStoryUi?.();
  });
  await desk.evaluate(() => {
    document.querySelectorAll(".toast").forEach(el => el.classList.remove("show"));
    World3D?.releaseCaptureFrame?.();
    me._teaseT = 999999;
    goLocation("street");
    syncStage3D?.();
    if (!World3D?.startDuel3D?.("razor", { training: true, firstTo: 3 })) throw new Error("startDuel3D failed");
  });
  await desk.waitForSelector("#duel3dHud:not(.hidden)", { timeout: 25000 });
  await desk.evaluate(() => {
    World3D?.prepareDuelCapturePose?.("razor");
  });
  await desk.waitForTimeout(150);
  for (let i = 0; i < 8; i++) {
    await desk.evaluate(() => World3D?.renderCaptureFrame?.());
    await desk.waitForTimeout(60);
  }
  const duelPng = path.join(outRoot, "qa-v21-chain-duel.png");
  await desk.screenshot({ path: duelPng });
  const torsoMeta = await desk.evaluate(() => window.__duelCaptureTorso || null);
  if (!torsoMeta) throw new Error("missing __duelCaptureTorso");
  const { data, info } = await sharp(duelPng).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const sx = Math.round((torsoMeta.px / torsoMeta.cw) * w);
  const sy = Math.round((torsoMeta.py / torsoMeta.ch) * h);
  let rSum = 0, gSum = 0, bSum = 0, n = 0;
  const rad = 5;
  for (let y = Math.max(0, sy - rad); y <= Math.min(h - 1, sy + rad); y++) {
    for (let x = Math.max(0, sx - rad); x <= Math.min(w - 1, sx + rad); x++) {
      const i = (y * w + x) * 3;
      rSum += data[i];
      gSum += data[i + 1];
      bSum += data[i + 2];
      n += 1;
    }
  }
  const rMean = rSum / n, gMean = gSum / n, bMean = bSum / n;
  if (rMean > 230 && gMean > 230 && bMean > 230) {
    throw new Error(`duel torso near-white rgb=${rMean},${gMean},${bMean}`);
  }
  console.log(`OK duel torso rgb=${rMean.toFixed(1)},${gMean.toFixed(1)},${bMean.toFixed(1)} -> ${duelPng}`);
  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
