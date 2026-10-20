const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outRoot = "/opt/cursor/artifacts";
const outDir = path.join(outRoot, "v21");
fs.mkdirSync(outDir, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const LOCS = ["room", "kitchen", "toilet", "elevator", "street", "city", "construction", "cemetery", "roof", "parkour"];
const PROP_AUDIT = new Set(["toilet", "elevator", "kitchen", "city", "cemetery", "roof"]);
const propReport = {};
const propReportDesktop = {};
const DESKTOP = LOCS.map(l => [l, `qa-v21-desktop-${l}.png`]);
const MOBILE = [
  ["street", "qa-v21-mobile-street.png"],
  ["kitchen", "qa-v21-mobile-kitchen.png"],
  ["room", "qa-v21-mobile-room.png"],
  ["cemetery", "qa-v21-mobile-cemetery.png"]
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
    me.owned = ["pet_dog", "jacket_neon", "chain_neon", "hat_spike"];
    me.pet = "pet_dog";
    me.onboarding = { step: 6, progress: {}, done: true };
    saveMe?.();
    World3D?.resize?.();
    PlayV21?.syncCosmetics?.(me);
  });
}

async function snapLoc(page, loc, storeDesktop = false) {
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
  const counts = await page.evaluate(() => World3D?.countVisibleProps?.() || { unique: 0, tags: [] });
  propReport[loc] = counts;
  if (storeDesktop) propReportDesktop[loc] = counts;
  const auditN = counts.frustumUnique ?? counts.unique;
  console.log(
    `props ${loc}: occluded=${counts.unique} frustum=${auditN} instances=${counts.instances ?? "?"}`
  );
  if (PROP_AUDIT.has(loc) && auditN < 20) {
    console.error(`PROP FAIL ${loc}: ${auditN} frustum-visible unique tags (need 20+)`);
  }
}

(async () => {
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await prep(desk);
  await desk.goto(`${base}/?dev=1&solo=1&v=v21-release`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(desk);

  for (const [loc, name] of DESKTOP) {
    await snapLoc(desk, loc, true);
    const f = path.join(outRoot, name);
    await desk.screenshot({ path: f });
    fs.copyFileSync(f, path.join(outDir, `${loc}.png`));
    await desk.evaluate(() => World3D?.releaseCaptureFrame?.());
    console.log("desktop", loc);
  }

  await desk.evaluate(() => {
    goLocation("room");
    syncStage3D?.();
    World3D.snapHeroForShop?.(true);
  });
  await desk.waitForTimeout(600);
  const bareBuf = await desk.screenshot();
  await desk.evaluate(() => {
    World3D.snapHeroForShop?.(false);
    PlayV21?.syncCosmetics?.(me);
  });
  await desk.waitForTimeout(600);
  const outfitBuf = await desk.screenshot();
  const shopOutfit = path.join(outRoot, "qa-v21-shop-outfit.png");
  await sharp({
    create: { width: 2560, height: 720, channels: 3, background: { r: 8, g: 4, b: 14 } }
  })
    .composite([
      { input: bareBuf, left: 0, top: 0 },
      { input: outfitBuf, left: 1280, top: 0 }
    ])
    .png()
    .toFile(shopOutfit);

  await desk.evaluate(() => {
    localStorage.removeItem("punkme_room_decor_v21");
    goLocation("room");
    syncStage3D?.();
    World3D?.snapScreenshotView?.();
  });
  await desk.waitForTimeout(800);
  await desk.screenshot({ path: path.join(outRoot, "qa-v21-room-decor-before.png") });
  const decorTypes = ["sofa", "beanbag", "lamp", "rug", "plant", "bookshelf", "guitar", "tv", "bed", "neon_sign"];
  await desk.evaluate(types => {
    me._decorMode = true;
    World3D.setDecorMode?.(true);
    const pts = [[-2, 2], [1, 3], [2, 1], [-1, 4], [0, 2.5], [-2.5, 3.5], [2.5, 3], [0, 4], [-1, 2], [1.5, 2]];
    types.forEach((type, i) => {
      World3D.setDecorPick?.(type);
      const [x, z] = pts[i % pts.length];
      World3D.placeDecorAt?.(x, z, type);
    });
    me._decorMode = false;
    World3D.setDecorMode?.(false);
    syncStage3D?.();
    World3D?.snapScreenshotView?.();
  }, decorTypes);
  await desk.waitForTimeout(800);
  const decorAfter = path.join(outRoot, "qa-v21-room-decor.png");
  await desk.screenshot({ path: decorAfter });
  await sharp(path.join(outRoot, "qa-v21-room-decor-before.png"))
    .resize(640, 360)
    .toFile(path.join(outRoot, "qa-v21-room-decor-before-thumb.png"));
  await sharp(decorAfter).resize(640, 360).png().toBuffer().then(buf =>
    sharp({
      create: { width: 1280, height: 360, channels: 3, background: { r: 8, g: 4, b: 14 } }
    })
      .composite([
        { input: path.join(outRoot, "qa-v21-room-decor-before-thumb.png"), left: 0, top: 0 },
        { input: buf, left: 640, top: 0 }
      ])
      .png()
      .toFile(path.join(outRoot, "qa-v21-room-decor-compare.png"))
  );

  await desk.evaluate(() => {
    goLocation("cemetery");
    syncStage3D?.();
    runJobAction?.("cemetery_night");
  });
  await desk.waitForTimeout(3500);
  await desk.screenshot({ path: path.join(outRoot, "qa-v21-cemetery-job.png") });

  await desk.evaluate(() => {
    goLocation("street");
    syncStage3D?.();
    startNpcFight?.("razor");
  });
  await desk.waitForTimeout(1200);
  await desk.screenshot({ path: path.join(outRoot, "qa-v21-chain-duel.png") });

  const fetchFrames = [];
  await desk.evaluate(() => {
    goLocation("street");
    syncStage3D?.();
    throwDogBall?.();
  });
  for (let i = 0; i < 3; i++) {
    await desk.waitForTimeout(280);
    const p = path.join(outRoot, `_fetch-${i}.png`);
    await desk.screenshot({ path: p });
    fetchFrames.push(p);
  }
  const tw = 426;
  const tiles = await Promise.all(
    fetchFrames.map(async (f, i) => ({
      input: await sharp(f).resize(tw, 240).png().toBuffer(),
      left: i * tw,
      top: 0
    }))
  );
  await sharp({
    create: { width: tw * 3, height: 240, channels: 3, background: { r: 8, g: 4, b: 14 } }
  })
    .composite(tiles)
    .png()
    .toFile(path.join(outRoot, "qa-v21-dog-fetch.png"));
  fetchFrames.forEach(f => { try { fs.unlinkSync(f); } catch (e) {} });

  await desk.evaluate(() => {
    document.getElementById("shopModal")?.classList.add("active");
    renderShop?.();
    PlayV21?.ensureDailyQuests?.(me);
    renderDailyQuestHud?.();
  });
  await desk.waitForTimeout(400);
  await desk.screenshot({ path: path.join(outRoot, "qa-v21-shop-modal.png") });

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prep(mob);
  await mob.goto(`${base}/?dev=1&solo=1&v=v21-release-m`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(mob);
  for (const [loc, name] of MOBILE) {
    await snapLoc(mob, loc);
    await mob.screenshot({ path: path.join(outRoot, name) });
    await mob.evaluate(() => World3D?.releaseCaptureFrame?.());
    console.log("mobile", loc);
  }

  await browser.close();
  const propFail = [...PROP_AUDIT].some(
    loc => (propReportDesktop[loc]?.frustumUnique ?? propReportDesktop[loc]?.unique ?? 0) < 20
  );
  console.log(
    JSON.stringify(
      { version: "living3d-v21", propReportDesktop, propReport, desktop: DESKTOP.map(([, n]) => n), mobile: MOBILE.map(([, n]) => n) },
      null,
      2
    )
  );
  if (propFail) {
    console.error("Capture failed: one or more audit locations have < 20 unique visible prop tags.");
    process.exit(1);
  }
})();
