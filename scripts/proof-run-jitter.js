const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outRoot = "/opt/cursor/artifacts";
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const HEROES = ["vienna", "cobalt", "mohawk", "razor"];
const LOCS = ["street", "city", "cemetery"];

async function prep(page) {
  await page.addInitScript(() => {
    try { localStorage.setItem("punkme_howto_seen", "1"); } catch (e) {}
  });
}

async function enter(page, hero) {
  await page.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  const c = page.locator("#charSelectConfirm");
  if (await c.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.click(`.char-pick[data-id="${hero}"]`);
    await c.click();
  }
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 120000 });
  await page.evaluate(() => {
    document.getElementById("howToOverlay")?.classList.remove("active");
    me.owned = ["pet_dog"];
    me.pet = "pet_dog";
    me.onboarding = { step: 6, progress: {}, done: true };
    saveMe?.();
    World3D?.resize?.();
  });
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await prep(page);
  await page.goto(`${base}/?dev=1&solo=1&v=v21-jitter`, { waitUntil: "networkidle", timeout: 120000 });

  const reports = [];
  const stripFrames = [];

  for (const hero of HEROES) {
    await enter(page, hero);
    for (const loc of LOCS) {
      await page.evaluate(id => {
        goLocation(id);
        syncStage3D?.();
      }, loc);
      await page.waitForTimeout(2200);
      await page.evaluate(() => World3D.startMotionProbe());
      await page.keyboard.down("w");
      await page.keyboard.down("Shift");
      await page.waitForTimeout(5000);
      await page.keyboard.up("w");
      await page.keyboard.up("Shift");
      const sample = await page.evaluate(() => {
        const raw = World3D.stopMotionProbe();
        const deltas = (raw.frames || []).slice(4).map(f => f.d).filter(d => d > 0 && d < 1.2);
        deltas.sort((a, b) => a - b);
        const med = deltas.length ? deltas[Math.floor(deltas.length / 2)] : 0;
        const spikes = deltas.filter(d => Math.abs(d - med) > 0.045).length;
        return { ...raw, med, spikes, deltas };
      });
      const f = path.join(outRoot, `qa-v21-jitter-${hero}-${loc}.json`);
      fs.writeFileSync(f, JSON.stringify(sample, null, 2));
      reports.push({ hero, loc, file: path.basename(f), maxD: sample.maxD, med: sample.med, spikes: sample.spikes, count: sample.count });
      if (hero === "cobalt" && loc === "street" && stripFrames.length < 8) {
        for (let i = 0; i < 8; i++) {
          const shot = path.join(outRoot, `_jitter-frame-${i}.png`);
          await page.screenshot({ path: shot });
          stripFrames.push(shot);
          await page.waitForTimeout(120);
          await page.keyboard.down("w");
          await page.keyboard.down("Shift");
          await page.waitForTimeout(80);
          await page.keyboard.up("w");
          await page.keyboard.up("Shift");
        }
      }
    }
  }

  if (stripFrames.length === 8) {
    const tw = 160;
    const th = 90;
    const tiles = await Promise.all(
      stripFrames.map(async (f, i) => ({
        input: await sharp(f).resize(tw, th).png().toBuffer(),
        left: i * tw,
        top: 0
      }))
    );
    const stripPath = path.join(outRoot, "qa-v21-run-contact-strip.png");
    await sharp({
      create: { width: tw * 8, height: th, channels: 3, background: { r: 8, g: 4, b: 14 } }
    })
      .composite(tiles)
      .png()
      .toFile(stripPath);
    stripFrames.forEach(f => { try { fs.unlinkSync(f); } catch (e) {} });
  }

  const graphPath = path.join(outRoot, "qa-v21-run-delta-graph.txt");
  const lines = reports.map(r => `${r.hero}/${r.loc} maxD=${r.maxD?.toFixed(4)} spikes=${r.spikes} frames=${r.count}`);
  fs.writeFileSync(graphPath, lines.join("\n"));

  await browser.close();
  const pass = reports.every(r => (r.spikes || 0) <= 8 && (r.med || 0) > 0.05 && (r.med || 0) < 0.42);
  console.log(JSON.stringify({ pass, reports, graph: "qa-v21-run-delta-graph.txt", strip: "qa-v21-run-contact-strip.png" }, null, 2));
  if (!pass) process.exit(1);
})();
