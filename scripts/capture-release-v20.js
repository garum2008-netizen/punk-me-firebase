require("./lib/require-local-capture.js");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outRoot = "/opt/cursor/artifacts";
const outDir = path.join(outRoot, "v20");
fs.mkdirSync(outDir, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const LOCS = ["room", "kitchen", "toilet", "elevator", "street", "city", "cemetery", "roof", "parkour"];
const DESKTOP = LOCS.map(l => [l, `qa-v20-desktop-${l}.png`]);
const MOBILE = [
  ["street", "qa-v20-mobile-street.png"],
  ["kitchen", "qa-v20-mobile-kitchen.png"],
  ["elevator", "qa-v20-mobile-elevator.png"]
];

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
    World3D?.resize?.();
  });
}

async function snapLoc(page, loc) {
  await page.evaluate(id => {
    goLocation(id);
    syncStage3D?.();
  }, loc);
  await page.waitForTimeout(3200);
  await page.evaluate(async () => {
    World3D?.resize?.();
    syncStage3D?.();
    World3D?.snapScreenshotView?.();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    World3D?.snapScreenshotView?.();
  });
  await page.waitForTimeout(400);
}

(async () => {
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await prep(desk);
  await desk.goto(`${base}/?dev=1&solo=1&v=v20-release`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(desk);

  const desktopPaths = [];
  for (const [loc, name] of DESKTOP) {
    await snapLoc(desk, loc);
    const f = path.join(outRoot, name);
    const tile = path.join(outDir, `${loc}.png`);
    await desk.screenshot({ path: f });
    fs.copyFileSync(f, tile);
    desktopPaths.push(f);
    await desk.evaluate(() => World3D?.releaseCaptureFrame?.());
    console.log("desktop", loc);
  }

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prep(mob);
  await mob.goto(`${base}/?dev=1&solo=1&v=v20-release-m`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(mob);
  const mobilePaths = [];
  for (const [loc, name] of MOBILE) {
    await snapLoc(mob, loc);
    if (loc === "kitchen") {
      const frame = await mob.evaluate(() => World3D?.getShowcaseScreenProjection?.());
      const fail = (msg) => {
        throw new Error(`mobile kitchen frame assert failed: ${msg} — ${JSON.stringify(frame)}`);
      };
      if (!frame?.ok || frame.location !== "kitchen") fail("missing projection");
      if (frame.hero.x < 150 || frame.hero.x > 240) fail(`hero x=${frame.hero.x}`);
      if (frame.hero.y < 460 || frame.hero.y > 540) fail(`hero foot y=${frame.hero.y}`);
      if (frame.heroScreenH == null || frame.heroScreenH < 240 || frame.heroScreenH > 340) {
        fail(`hero height px=${frame.heroScreenH}`);
      }
      if (!frame.dog || frame.dog.y > 540) fail(`dog y=${frame.dog?.y}`);
      const minFloorY = frame.viewport.h * 0.68;
      if (frame.floorMaxY == null || frame.floorMaxY < minFloorY) {
        fail(`floor void floorMaxY=${frame.floorMaxY} need>=${minFloorY}`);
      }
      console.log("mobile kitchen frame", frame);
    }
    const f = path.join(outRoot, name);
    await mob.screenshot({ path: f });
    mobilePaths.push(f);
    await mob.evaluate(() => World3D?.releaseCaptureFrame?.());
    console.log("mobile", loc);
  }

  const tw = 420;
  const th = 236;
  const tiles = desktopPaths.map((f, i) => path.join(outDir, LOCS[i] + ".png"));
  const resized = await Promise.all(
    tiles.map(async (f, i) => {
      const buf = await sharp(f).resize(tw, th).png().toBuffer();
      return { input: buf, left: (i % 3) * tw, top: Math.floor(i / 3) * th };
    })
  );
  const gridPath = path.join(outRoot, "qa-v20-dog-9loc-grid.png");
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
    version: "living3d-v20",
    desktop: DESKTOP.map(([, n]) => n),
    mobile: MOBILE.map(([, n]) => n),
    grid: "qa-v20-dog-9loc-grid.png"
  }, null, 2));
})();
