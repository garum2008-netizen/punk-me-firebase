const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outRoot = "/opt/cursor/artifacts";
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const HEROES = ["vienna", "cobalt", "mohawk", "razor"];
const LOCS = ["street", "city", "cemetery"];
const FRAMES = 120;

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

function analyze(sample) {
  const deltas = (sample.frames || []).slice(8).map(f => f.d).filter(d => d >= 0 && d < 1.2);
  deltas.sort((a, b) => a - b);
  const med = deltas.length ? deltas[Math.floor(deltas.length / 2)] : 0;
  const spikes = deltas.filter(d => Math.abs(d - med) > 0.032).length;
  return { med, spikes, count: sample.frames?.length || 0, deltas };
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await prep(page);
  await page.goto(`${base}/?dev=1&solo=1&v=v21-jitter-b`, { waitUntil: "networkidle", timeout: 120000 });

  const reports = [];
  const stripFrames = [];

  for (const hero of HEROES) {
    await enter(page, hero);
    for (const loc of LOCS) {
      await page.evaluate(id => {
        goLocation(id);
        syncStage3D?.();
      }, loc);
      await page.waitForTimeout(1800);
      await page.keyboard.down("w");
      await page.keyboard.down("Shift");
      const sample = await page.evaluate(async frames => {
        World3D.startMotionProbe();
        let n = 0;
        return new Promise(resolve => {
          function step() {
            n++;
            if (n >= frames) resolve(World3D.stopMotionProbe());
            else requestAnimationFrame(step);
          }
          requestAnimationFrame(step);
        });
      }, FRAMES);
      await page.keyboard.up("w");
      await page.keyboard.up("Shift");
      const stats = analyze(sample);
      const f = path.join(outRoot, `qa-v21-jitter-${hero}-${loc}.json`);
      fs.writeFileSync(f, JSON.stringify({ ...sample, ...stats }, null, 2));
      reports.push({ hero, loc, ...stats, file: path.basename(f) });
      if (hero === "cobalt" && loc === "street") {
        for (let i = 0; i < 8; i++) {
          const shot = path.join(outRoot, `_jitter-frame-${i}.png`);
          await page.screenshot({ path: shot });
          stripFrames.push(shot);
          await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
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
    await sharp({
      create: { width: tw * 8, height: th, channels: 3, background: { r: 8, g: 4, b: 14 } }
    })
      .composite(tiles)
      .png()
      .toFile(path.join(outRoot, "qa-v21-run-contact-strip.png"));
    stripFrames.forEach(f => { try { fs.unlinkSync(f); } catch (e) {} });
  }

  const graphPath = path.join(outRoot, "qa-v21-run-delta-graph.txt");
  fs.writeFileSync(
    graphPath,
    reports.map(r => `${r.hero}/${r.loc} med=${r.med?.toFixed(4)} spikes=${r.spikes} frames=${r.count}`).join("\n")
  );

  await browser.close();
  const pass = reports.every(
    r => r.count >= FRAMES - 5 && r.spikes === 0 && r.med > 0.04 && r.med < 0.42
  );
  console.log(JSON.stringify({ pass, FRAMES, reports }, null, 2));
  if (!pass) process.exit(1);
})();
