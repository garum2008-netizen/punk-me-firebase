const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const out = "/opt/cursor/artifacts/run22";
const outRoot = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const LOCS = ["room", "kitchen", "toilet", "elevator", "street", "city", "cemetery", "roof", "parkour"];

async function prep(page) {
  await page.addInitScript(() => {
    try { localStorage.setItem("punkme_howto_seen", "1"); } catch (e) {}
  });
}

async function enter(page) {
  await page.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  const c = page.locator("#charSelectConfirm");
  if (await c.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.click('.char-pick[data-id="cobalt"]');
    await c.click();
  }
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 120000 });
  await page.evaluate(() => {
    typeof setLanguage === "function" && setLanguage("en", true);
    document.getElementById("howToOverlay")?.classList.remove("active");
    me.owned = ["pet_dog"];
    me.pet = "pet_dog";
    me.onboarding = { step: 6, progress: {}, done: true };
    saveMe?.();
    World3D?.setGuideTarget?.(null);
  });
}

async function snapLoc(page, loc) {
  await page.evaluate(id => {
    goLocation(id);
    syncStage3D?.();
  }, loc);
  await page.waitForTimeout(3200);
  await page.evaluate(async () => {
    syncStage3D?.();
    World3D?.snapScreenshotView?.();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    World3D?.snapScreenshotView?.();
  });
  await page.waitForTimeout(400);
  const file = path.join(out, `${loc}.png`);
  await page.screenshot({ path: file });
  await page.evaluate(() => World3D?.releaseCaptureFrame?.());
  return file;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await prep(page);
  await page.goto(`${base}/?dev=1&solo=1&v=run22-v17`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(page);

  const tiles = [];
  for (const loc of LOCS) {
    tiles.push(await snapLoc(page, loc));
    console.log("captured", loc);
  }

  fs.copyFileSync(path.join(out, "elevator.png"), path.join(outRoot, "qa-run22-elevator.png"));
  fs.copyFileSync(path.join(out, "kitchen.png"), path.join(outRoot, "qa-run22-kitchen.png"));

  const tw = 420;
  const th = 236;
  const resized = await Promise.all(
    tiles.map(async (f, i) => {
      const buf = await sharp(f).resize(tw, th).png().toBuffer();
      return { input: buf, left: (i % 3) * tw, top: Math.floor(i / 3) * th };
    })
  );
  const gridPath = path.join(outRoot, "qa-run22-dog-9loc-grid.png");
  await sharp({
    create: {
      width: tw * 3,
      height: th * 3,
      channels: 3,
      background: { r: 10, g: 6, b: 18 }
    }
  })
    .composite(resized)
    .png()
    .toFile(gridPath);

  await browser.close();
  console.log(JSON.stringify({
    elevator: "qa-run22-elevator.png",
    kitchen: "qa-run22-kitchen.png",
    grid: "qa-run22-dog-9loc-grid.png",
    tiles: LOCS.map(l => `run22/${l}.png`)
  }, null, 2));
})();
