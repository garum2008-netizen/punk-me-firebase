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
  await H.sleep(ms);
}

async function decorAt(page, locId, type, wx, wz) {
  await ensureGameplayActive(page);
  await H.navGo(page, locId);
  await page.evaluate(
    ({ type, wx, wz }) => {
      document.getElementById("howToOverlay")?.classList.remove("active");
      window.World3D?.setDecorMode?.(true);
      window.World3D?.placeDecorAt?.(wx, wz, type);
      window.World3D?.setDecorMode?.(false);
      window.PlayV21?.endAllActivities?.();
    },
    { type, wx, wz }
  );
  await H.walkDesktop(page, 3200);
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
  await H.sleep(1200);
  mark?.(label, `job ${action}`);
  const t0 = Date.now();
  while (Date.now() - t0 < 42000) {
    await H.walkDesktop(page, 900);
    await H.focusStage(page);
    await page.keyboard.press("e").catch(() => {});
    const hud = await page.evaluate(() => !!document.getElementById("gpCemeteryTimer"));
    if (!hud) break;
  }
  await page.evaluate(() => window.PlayV21?.endAllActivities?.());
  await recordBeat(page, 2000);
}

async function purchaseCityPlotUi(page, mark) {
  await ensureGameplayActive(page);
  await H.navGo(page, "city");
  await page.evaluate(() => {
    window.me.coins = Math.max(window.me.coins || 0, 600);
    window.purchaseCityPlot?.("plot_shop");
    window.saveMe?.();
  });
  await H.walkDesktop(page, 4000);
  mark?.("city_plot_shop", "purchased plot_shop");
}

async function runFullPrBPlaythrough(page, opts = {}) {
  const { mark, recordPacing = true } = opts;
  const epSnap = await Ep1.runFullEpisode1Ui(page, {
    mark,
    walkMs: 6200,
    recordPacing,
    snapDir: null,
    snapTag: "prb"
  });

  await recordBeat(page, recordPacing ? 3500 : 1500);
  await decorAt(page, "room", "neon_sign", 0.5, 0.5);
  mark?.("decor_room", "apartment neon_sign placed");

  await decorAt(page, "construction", "guitar", -1, 1);
  mark?.("decor_construction", "hangout site guitar");

  await purchaseCityPlotUi(page, mark);

  await runCemeteryMiniJob(page, "dig", mark, "cemetery_job_paths");
  await runCemeteryMiniJob(page, "cobwebs", mark, "cemetery_job_lamps");
  await runCemeteryMiniJob(page, "cemetery_night", mark, "cemetery_job_night");

  await decorAt(page, "cemetery", "urn", 2, -1);
  mark?.("crypt_decor", "urn in cemetery crypt zone");

  await H.navGo(page, "construction");
  await recordBeat(page, 3000);
  mark?.("outro_construction", "hangout site wide");

  return { ...epSnap, prB: true };
}

module.exports = { runFullPrBPlaythrough, ensureGameplayActive };
