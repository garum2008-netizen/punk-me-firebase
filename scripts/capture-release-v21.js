const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outRoot = "/opt/cursor/artifacts";
const outDir = path.join(outRoot, "v21");
fs.mkdirSync(outDir, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const LOCS = ["room", "kitchen", "toilet", "elevator", "street", "city", "construction", "cemetery", "roof", "parkour"];
const PROP_AUDIT = new Set([
  "toilet",
  "elevator",
  "kitchen",
  "city",
  "cemetery",
  "roof",
  "room",
  "street",
  "construction",
  "parkour"
]);
const propReport = {};
const propReportDesktop = {};
const propReportMobile = {};
const MOBILE_PROP_AUDIT = new Set(["street", "room", "kitchen", "cemetery", "construction"]);
const DESKTOP = LOCS.map(l => [l, `qa-v21-desktop-${l}.png`]);
const MOBILE = [
  ["street", "qa-v21-mobile-street.png"],
  ["kitchen", "qa-v21-mobile-kitchen.png"],
  ["room", "qa-v21-mobile-room.png"],
  ["cemetery", "qa-v21-mobile-cemetery.png"],
  ["construction", "qa-v21-mobile-construction.png"]
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
    await page.evaluate(() => {
      document.querySelector('.char-pick[data-id="cobalt"]')?.click();
      document.getElementById("charSelectConfirm")?.click();
    });
  }
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 120000 });
  await page.evaluate(() => {
    typeof setLanguage === "function" && setLanguage("en", true);
    document.getElementById("charSelect")?.classList.remove("active");
    document.getElementById("loading")?.style.setProperty("display", "none");
    document.getElementById("howToOverlay")?.classList.remove("active");
    me.owned = ["pet_dog", "jacket_neon", "chain_neon", "hat_spike"];
    me.pet = "pet_dog";
    me.onboarding = { step: 6, progress: {}, done: true };
    saveMe?.();
    World3D?.resize?.();
    PlayV21?.syncCosmetics?.(me);
    PlayV21?.endAllActivities?.();
    StoryEngine?.dismissAllStoryUi?.();
    const qb = document.getElementById("questBox");
    if (qb) qb.style.display = "none";
  });
}

async function cleanCaptureState(page) {
  await page.evaluate(() => {
    PlayV21?.endAllActivities?.();
    StoryEngine?.dismissAllStoryUi?.();
    document.getElementById("storyDialog")?.classList.remove("active");
    const qb = document.getElementById("questBox");
    if (qb) qb.style.display = "none";
    const gh = document.getElementById("gameplayHud");
    if (gh) {
      gh.replaceChildren?.();
      gh.textContent = "";
    }
  });
}

async function snapLoc(page, loc, storeDesktop = false) {
  await cleanCaptureState(page);
  await page.evaluate(id => {
    World3D?.releaseCaptureFrame?.();
    goLocation(id);
    syncStage3D?.();
  }, loc);
  await page.waitForFunction(
    l => window.World3D?.getLocation?.() === l && window.me?.location === l,
    loc,
    { timeout: 35000 }
  );
  await page.waitForTimeout(3200);
  await page.evaluate(async l => {
    World3D?.resize?.();
    syncStage3D?.();
    if (l === "elevator") {
      World3D?.releaseCaptureFrame?.();
    }
    World3D?.snapScreenshotView?.();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    World3D?.snapScreenshotView?.();
  }, loc);
  await page.waitForTimeout(400);
  if (loc === "elevator") {
    const ok = await page.evaluate(() => {
      const tags = World3D?.countVisibleProps?.()?.tags || [];
      return World3D?.getLocation?.() === "elevator" && tags.some(t => String(t).includes("elev"));
    });
    if (!ok) throw new Error("elevator capture precheck failed (wrong location or props)");
  }
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
    if (loc === "elevator") {
      const meta = await desk.evaluate(() => {
        const title = document.getElementById("locTitle")?.textContent || "";
        const tags = World3D?.countVisibleProps?.()?.tags || [];
        return { title, hasElev: tags.some(t => String(t).includes("elev")) };
      });
      if (/roof/i.test(meta.title) || !meta.hasElev) {
        throw new Error(`elevator capture bad scene title=${meta.title} elevTags=${meta.hasElev}`);
      }
      const dataUrl = await desk.evaluate(() => {
        World3D?.renderCaptureFrame?.();
        return document.getElementById("stage3d")?.toDataURL?.("image/png");
      });
      if (!dataUrl?.startsWith("data:image/png")) throw new Error("elevator canvas capture failed");
      fs.writeFileSync(f, Buffer.from(dataUrl.split(",")[1], "base64"));
    } else {
      await desk.screenshot({ path: f });
    }
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
  try {
    await sharp({
      create: { width: 2560, height: 720, channels: 3, background: { r: 8, g: 4, b: 14 } }
    })
      .composite([
        { input: bareBuf, left: 0, top: 0 },
        { input: outfitBuf, left: 1280, top: 0 }
      ])
      .png()
      .toFile(shopOutfit);
  } catch (e) {
    console.warn("shop outfit composite skipped:", e.message);
    fs.writeFileSync(path.join(outRoot, "qa-v21-shop-bare.png"), bareBuf);
    fs.writeFileSync(path.join(outRoot, "qa-v21-shop-outfit-panel.png"), outfitBuf);
  }

  await cleanCaptureState(desk);
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
    StoryEngine?.dismissAllStoryUi?.();
    const pts = [[-2, 2], [1, 3], [2, 1], [-1, 4], [0, 2.5], [-2.5, 3.5], [2.5, 3], [0, 4], [-1, 2], [1.5, 2]];
    types.forEach((type, i) => {
      World3D.setDecorPick?.(type);
      const [x, z] = pts[i % pts.length];
      World3D.placeDecorAt?.(x, z, type);
    });
    me._decorMode = true;
    World3D.setDecorMode?.(true);
    World3D.setDecorPick?.("beanbag");
    PlayV21?.setDecorGhostScreenCenter?.();
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

  await cleanCaptureState(desk);
  await desk.evaluate(() => {
    document.querySelectorAll(".toast").forEach(el => el.classList.remove("show"));
    document.getElementById("storyBubbles")?.replaceChildren?.();
    document.querySelectorAll(".story-bubble").forEach(el => el.remove());
    StoryEngine?.dismissAllStoryUi?.();
    PlayV21?.endAllActivities?.();
    World3D?.releaseCaptureFrame?.();
    me._teaseT = 999999;
    goLocation("street");
    syncStage3D?.();
    const ok = World3D?.startDuel3D?.("razor", { training: true, firstTo: 3 });
    if (!ok) throw new Error("startDuel3D failed");
  });
  await desk.waitForSelector("#duel3dHud:not(.hidden)", { timeout: 25000 });
  await desk.waitForSelector("#duel3dHud .duel-3d-actions .btn.danger", { timeout: 15000 });
  await desk.waitForFunction(
    () => {
      const hud = document.getElementById("duel3dHud");
      if (!hud || hud.classList.contains("hidden")) return false;
      const btns = hud.querySelectorAll(".duel-3d-actions .btn");
      return btns.length >= 3 && !document.querySelector(".toast.show");
    },
    { timeout: 15000 }
  );
  await desk.evaluate(() => {
    document.querySelectorAll(".toast").forEach(el => el.classList.remove("show"));
    document.getElementById("storyBubbles")?.replaceChildren?.();
    PlayV21?.prepareDuelCapturePose?.("razor");
  });
  for (let i = 0; i < 8; i++) {
    await desk.evaluate(() => World3D?.renderCaptureFrame?.());
    await desk.waitForTimeout(60);
  }
  const duelHudOk = await desk.evaluate(() => {
    const hud = document.getElementById("duel3dHud");
    const btns = hud?.querySelectorAll(".duel-3d-actions .btn") || [];
    const toast = document.querySelector(".toast.show");
    const bubble = document.querySelector(".story-bubble");
    return !hud?.classList.contains("hidden") && btns.length >= 3 && !toast && !bubble;
  });
  if (!duelHudOk) throw new Error("duel capture precheck failed (HUD/toast/bubble)");
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
    const counts = await mob.evaluate(() => World3D?.countVisibleProps?.() || { unique: 0 });
    propReportMobile[loc] = counts;
    const auditN = counts.frustumUnique ?? counts.unique;
    if (MOBILE_PROP_AUDIT.has(loc) && auditN < 20) {
      console.error(`MOBILE PROP FAIL ${loc}: ${auditN} frustum-visible unique tags (need 20+)`);
    }
    await mob.screenshot({ path: path.join(outRoot, name) });
    await mob.evaluate(() => World3D?.releaseCaptureFrame?.());
    console.log("mobile", loc);
  }

  await browser.close();
  const propFail =
    [...PROP_AUDIT].some(
      loc => (propReportDesktop[loc]?.frustumUnique ?? propReportDesktop[loc]?.unique ?? 0) < 20
    ) ||
    [...MOBILE_PROP_AUDIT].some(
      loc => (propReportMobile[loc]?.frustumUnique ?? propReportMobile[loc]?.unique ?? 0) < 20
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
