#!/usr/bin/env node
/** PR B: build layer + licensed music + decor zones — Chromium, WebKit, mobile. */
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");
const { start, stop } = require("./local-static-server");

const outDir = path.join(__dirname, "../qa/pr-b");
const musicDir = path.join(__dirname, "../assets/audio/music");
fs.mkdirSync(outDir, { recursive: true });

async function boot(page, base) {
  await page.goto(`${base}/?solo=1&v=pr-b-test`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__punkFinishLoadMeFlow, { timeout: 120000 });
  await page.evaluate(() => {
    window.__punkApplyFirebaseSnapshot({ exists: () => false, val: () => null });
    window.__punkFinishLoadMeFlow();
  });
  await page.locator('.char-pick[data-id="cobalt"]').click();
  await page.locator("#charSelectConfirm").click();
  await page.waitForFunction(() => window.__playerLoaded, { timeout: 120000 });
  await page.locator("#howToOverlay .close, #howToOverlay button").first().click({ timeout: 3000 }).catch(() => {});
  await page.evaluate(() => {
    document.getElementById("chapterIntro")?.classList.remove("active");
    window.me.story = window.me.story || {};
    window.me.story.flags = window.me.story.flags || {};
    window.me.story.flags.intro_seen = true;
  });
}

async function runBrowser(name, launcher, viewport, base) {
  const browser = await launcher.launch();
  const page = await browser.newPage({ viewport });
  const errors = [];
  try {
    await boot(page, base);
    const build = await page.evaluate(() => {
      window.__migrateBuildSave?.(window.me);
      const hasHangout = Array.isArray(window.me.hangout?.placements);
      const hasPlots = Array.isArray(window.me.cityPlots) && window.me.cityPlots.length >= 3;
      const zoneRoom = typeof window.World3D?.setDecorMode === "function";
      return { hasHangout, hasPlots, zoneRoom };
    });
    if (!build.hasHangout) errors.push("hangout.placements missing");
    if (!build.hasPlots) errors.push("cityPlots missing");
    if (!build.zoneRoom) errors.push("World3D decor API missing");

    const purchase = await page.evaluate(() => {
      window.me.coins = 500;
      window.me.location = "city";
      const r = window.purchaseCityPlot?.("plot_shop");
      return r?.ok && window.me.cityPlots.find(p => p.id === "plot_shop")?.built;
    });
    if (!purchase) errors.push("city plot purchase failed");

    const decor = await page.evaluate(async () => {
      window.me.location = "construction";
      await window.World3D?.setLocation?.("construction");
      window.World3D?.setDecorMode?.(true);
      return window.World3D?.placeDecorAt?.(0, 0, "neon_sign");
    });
    if (!decor) errors.push("construction decor place failed");

    const job = await page.evaluate(async () => {
      window.me.location = "cemetery";
      await window.World3D?.setLocation?.("cemetery");
      return window.World3D?.startCemeteryJobVariant?.("paths");
    });
    if (!job) errors.push("cemetery paths job failed");

    await page.screenshot({ path: path.join(outDir, `${name}-${viewport.width}x${viewport.height}.png`) });
  } catch (e) {
    errors.push(String(e.message || e));
  }
  await browser.close();
  return { browser: name, viewport, ok: !errors.length, errors };
}

function musicOk() {
  const buckets = ["home", "street", "cemetery", "city", "roof", "construction", "castle"];
  const sizes = buckets.map(b => {
    const p = path.join(musicDir, `music_${b}.ogg`);
    return fs.existsSync(p) ? fs.statSync(p).size : 0;
  });
  const unique = new Set(sizes.filter(s => s > 1000));
  if (unique.size < 3) return { ok: false, reason: "music files missing or identical sizes" };
  const meta = path.join(__dirname, "../assets/audio/music-sources.json");
  if (!fs.existsSync(meta)) return { ok: false, reason: "music-sources.json missing" };
  return { ok: true, sizes: unique.size };
}

async function main() {
  const mus = musicOk();
  const base = process.env.PUNK_BASE || await start();
  const results = [];
  results.push(await runBrowser("chromium", chromium, { width: 1280, height: 720 }, base));
  results.push(await runBrowser("webkit", webkit, { width: 1280, height: 720 }, base));
  results.push(await runBrowser("chromium-mobile", chromium, { width: 390, height: 844 }, base));
  if (!process.env.PUNK_BASE) stop();
  const report = {
    at: new Date().toISOString(),
    music: mus,
    results,
    pass: mus.ok && results.every(r => r.ok)
  };
  fs.writeFileSync(path.join(outDir, "pr-b-build-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
