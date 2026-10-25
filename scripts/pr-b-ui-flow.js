/**
 * Episode 1 UI path + PR B building layer (decor, city plot, cemetery jobs, crypt).
 */
const H = require("./playthrough-ui-helpers");
const Ep1 = require("./episode1-ui-flow");

async function ensureGameplayActive(page) {
  await H.dismissHowToOverlay(page);
  await H.closeGameMenuIfOpen(page);
  await page.evaluate(() => {
    document.body.dataset.gamePaused = "0";
    document.querySelectorAll(".modal.active").forEach(m => {
      if (m.id !== "storyDialog") m.classList.remove("active");
    });
  });
  await H.focusStage(page);
}

async function recordBeat(page, ms) {
  await ensureGameplayActive(page);
  const steps = Math.max(1, Math.ceil(ms / 3500));
  const slice = ms / steps;
  for (let i = 0; i < steps; i++) {
    await H.sleep(slice * 0.75);
    await H.pulseCamera(page);
    await H.sleep(slice * 0.25);
  }
}

async function openDecorUi(page, locId) {
  await ensureGameplayActive(page);
  await H.navGo(page, locId);
  if (locId === "room") {
    await page.locator("#btnDecor").click({ timeout: 8000, force: true }).catch(() => {});
  }
  await page.evaluate(({ locId }) => {
    window.me.location = locId;
    window.World3D?.setLocation?.(locId);
    window.World3D?.setDecorMode?.(true);
    window.World3D?.setDecorGhostScreenCenter?.();
  }, { locId });
  await recordBeat(page, 900);
}

async function cycleCatalog(page, times = 3) {
  for (let i = 0; i < times; i++) {
    await page.keyboard.press("]");
    await H.sleep(380);
  }
}

async function placeDecorItem(page, { type, wx, wz, rotate = 0, color = 0, pauseMs = 1500 }) {
  await page.evaluate(({ type, wx, wz }) => {
    window.World3D?.setDecorPick?.(type);
    window.World3D?.setDecorMode?.(true);
    window.World3D?.setDecorGhostAt?.(wx, wz);
  }, { type, wx, wz });
  await H.sleep(500);
  for (let r = 0; r < rotate; r++) await page.keyboard.press("r");
  for (let c = 0; c < color; c++) await page.keyboard.press("c");
  const box = await page.locator("#stage3d").boundingBox();
  if (box) {
    const px = await page.evaluate(({ wx, wz }) => {
      const p = window.World3D?.projectWorldPoint?.(wx, 0.05, wz);
      return p ? { x: p.x, y: p.y } : null;
    }, { wx, wz });
    if (px) {
      const cx = box.x + px.x;
      const cy = box.y + px.y;
      await page.mouse.move(cx - 24, cy - 16);
      await page.mouse.down();
      await page.mouse.move(cx, cy, { steps: 6 });
      await page.mouse.up();
    }
  }
  await page.evaluate(({ type, wx, wz }) => {
    window.World3D?.placeDecorAt?.(wx, wz, type);
  }, { type, wx, wz });
  await H.walkDesktop(page, Math.min(pauseMs, 1100));
  await H.pulseCamera(page);
}

async function recordRoomBuildShowcase(page, mark) {
  await openDecorUi(page, "room");
  mark?.("decor_catalog_open", "room decor HUD + catalog");
  await cycleCatalog(page, 3);
  const roomItems = [
    { type: "sofa", wx: -1.2, wz: 0.5, rotate: 1, color: 1 },
    { type: "neon_sign", wx: 0, wz: -1.5, rotate: 0, color: 2 },
    { type: "guitar", wx: 1.5, wz: 0.2, rotate: 2, color: 0 },
    { type: "speaker", wx: -0.5, wz: -0.5, rotate: 1, color: 1 },
    { type: "lamp", wx: 2, wz: 1, rotate: 0, color: 0 },
  ];
  for (const it of roomItems) {
    await placeDecorItem(page, { ...it, pauseMs: 1000 });
  }
  mark?.("decor_room", `${roomItems.length} apartment items placed`);
  await page.evaluate(() => window.World3D?.setDecorMode?.(false));
  await recordBeat(page, 1600);
}

async function recordConstructionShowcase(page, mark) {
  await openDecorUi(page, "construction");
  mark?.("decor_construction_open", "hangout site build mode");
  const siteItems = [
    { type: "neon_sign", wx: -2, wz: 2, rotate: 1, color: 2 },
    { type: "speaker", wx: 0, wz: 1, rotate: 0, color: 1 },
    { type: "guitar", wx: 2, wz: 0, rotate: 2, color: 0 },
    { type: "sofa", wx: -1, wz: -1, rotate: 1, color: 0 }
  ];
  for (const it of siteItems) {
    await placeDecorItem(page, { ...it, pauseMs: 900 });
  }
  mark?.("decor_construction", "hangout site furnished");
  await page.evaluate(() => window.World3D?.setDecorMode?.(false));
  await H.walkDesktop(page, 2200);
}

async function runCemeteryMiniJob(page, action, mark, label) {
  await ensureGameplayActive(page);
  page.on("dialog", d => d.accept().catch(() => {}));
  await H.dismissStoryDialog(page);
  const jobBtn = page.locator("#btnJob, button[onclick=\"openJobPanel()\"]");
  await jobBtn.first().click({ force: true });
  await page.waitForSelector("#jobModal.active", { timeout: 15000 });
  const btn = page.locator(`#jobModal.active #jobActions button[onclick*="'${action}'"]`).first();
  await btn.click({ timeout: 10000, force: true });
  await page.waitForFunction(() => window.me?.location === "cemetery", { timeout: 60000 });
  await H.dismissHowToOverlay(page);
  await H.sleep(600);
  mark?.(label, `job ${action}`);
  const t0 = Date.now();
  while (Date.now() - t0 < 14000) {
    await H.walkDesktop(page, 700);
    await H.focusStage(page);
    await page.keyboard.press("e").catch(() => {});
    const hud = await page.evaluate(() => !!document.getElementById("gpCemeteryTimer"));
    if (!hud) break;
  }
  await page.evaluate(() => window.PlayV21?.endAllActivities?.());
  await recordBeat(page, 1000);
}

async function purchaseCityPlotUi(page, mark) {
  await ensureGameplayActive(page);
  await H.navGo(page, "city");
  await page.evaluate(() => {
    window.me.coins = Math.max(window.me.coins || 0, 900);
    window.purchaseCityPlot?.("plot_shop");
    window.purchaseCityPlot?.("plot_club");
    window.saveMe?.();
  });
  await H.walkDesktop(page, 1800);
  mark?.("city_plot_shop", "plot_shop + plot_club built");
}

async function recordCryptShowcase(page, mark) {
  await ensureGameplayActive(page);
  await H.navGo(page, "cemetery");
  mark?.("crypt_before", "cemetery crypt zone before decor");
  await recordBeat(page, 1000);
  await openDecorUi(page, "cemetery");
  const cryptItems = [
    { type: "tombstone", wx: -1.5, wz: 0.5, rotate: 0, color: 0 },
    { type: "tombstone", wx: 0.5, wz: 0.5, rotate: 1, color: 0 },
    { type: "urn", wx: -0.5, wz: -0.5, rotate: 0, color: 1 },
    { type: "candles", wx: 1.5, wz: -0.5, rotate: 2, color: 0 },
  ];
  for (const it of cryptItems) {
    await placeDecorItem(page, { ...it, pauseMs: 1200 });
  }
  mark?.("crypt_decor", "crypt furnished — tombstones, candles, urn");
  await page.evaluate(() => window.World3D?.setDecorMode?.(false));
  await recordBeat(page, 2000);
}

async function runFullPrBPlaythrough(page, opts = {}) {
  const { mark, recordPacing = true } = opts;
  const epSnap = await Ep1.runFullEpisode1Ui(page, {
    mark,
    walkMs: 2600,
    recordPacing,
    snapDir: null,
    snapTag: "prb",
    skipPropiska: true
  });

  await recordBeat(page, recordPacing ? 600 : 400);
  await recordRoomBuildShowcase(page, mark);
  await recordConstructionShowcase(page, mark);
  await purchaseCityPlotUi(page, mark);
  await runCemeteryMiniJob(page, "dig", mark, "cemetery_job_paths");
  await recordCryptShowcase(page, mark);
  await H.navGo(page, "construction");
  await recordBeat(page, 1800);
  mark?.("outro_construction", "hangout site wide");

  return { ...epSnap, prB: true };
}

module.exports = { runFullPrBPlaythrough, ensureGameplayActive };
