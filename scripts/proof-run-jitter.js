const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const outRoot = "/opt/cursor/artifacts";
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const HEROES = process.env.JITTER_HERO
  ? [process.env.JITTER_HERO]
  : ["vienna", "cobalt", "mohawk", "razor"];
const LOCS = ["street", "city", "cemetery", "room", "construction", "parkour"];
const SCENARIOS = ["free", "wall", "slide"];
const FRAMES = 120;
const SPIKE_EPS = 0.032;
const LOCO_STEP = 7.2 / 60;
const STEADY_MIN = LOCO_STEP * 0.65;

async function prep(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (e) {}
  });
}

async function enter(page, hero) {
  await page.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  const c = page.locator("#charSelectConfirm");
  if (await c.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.evaluate(id => {
      document.querySelector(`.char-pick[data-id="${id}"]`)?.click();
      document.getElementById("charSelectConfirm")?.click();
    }, hero);
  }
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 120000 });
  await page.evaluate(() => {
    document.getElementById("charSelect")?.classList.remove("active");
    document.getElementById("howToOverlay")?.classList.remove("active");
    me.owned = ["pet_dog"];
    me.pet = "pet_dog";
    me.onboarding = { step: 6, progress: {}, done: true };
    PlayV21?.endAllActivities?.();
    StoryEngine?.dismissAllStoryUi?.();
    saveMe?.();
    World3D?.resize?.();
  });
}

function analyze(sample) {
  const raw = (sample.frames || []).slice(8).map(f => f.d).filter(d => d >= 0 && d < 1.2);
  const active = raw.filter(d => d > 0.02);
  const steady = active.filter(d => d >= STEADY_MIN);
  const deltas = (steady.length ? steady : active).slice();
  deltas.sort((a, b) => a - b);
  const med = deltas.length ? deltas[Math.floor(deltas.length / 2)] : 0;
  const spikes = steady.filter(d => Math.abs(d - med) > SPIKE_EPS).length;
  return { med, spikes, count: sample.frames?.length || 0, activeFrames: active.length, deltas };
}

async function runMatrix(browser, viewport, label) {
  const page = await browser.newPage({ viewport });
  await prep(page);
  await page.goto(`${base}/?dev=1&solo=1&v=v21-jitter-${label}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000
  });
  const reports = [];
  for (const hero of HEROES) {
    await enter(page, hero);
    for (const loc of LOCS) {
      for (const scenario of SCENARIOS) {
        const f = path.join(outRoot, `qa-v21-jitter-${label}-${hero}-${loc}-${scenario}.json`);
        if (fs.existsSync(f)) {
          const cached = JSON.parse(fs.readFileSync(f, "utf8"));
          reports.push({
            viewport: label,
            hero,
            loc,
            scenario,
            med: cached.med,
            spikes: cached.spikes,
            count: cached.count,
            file: path.basename(f),
            skipped: true
          });
          continue;
        }
        await page.evaluate(id => {
          goLocation(id);
          syncStage3D?.();
          World3D?.releaseCaptureFrame?.();
        }, loc);
        await page.waitForTimeout(1200);
        await page.keyboard.down("w");
        await page.keyboard.down("Shift");
        const sample = await page.evaluate(
          async ({ frames, scenario }) => {
            World3D.startMotionProbe(frames, scenario);
            const deadline = performance.now() + 45000;
            return new Promise(resolve => {
              function step() {
                if (World3D.getMotionProbeCount() >= frames) resolve(World3D.stopMotionProbe());
                else if (performance.now() > deadline) resolve(World3D.stopMotionProbe());
                else requestAnimationFrame(step);
              }
              requestAnimationFrame(step);
            });
          },
          { frames: FRAMES, scenario },
          { timeout: 60000 }
        );
        await page.keyboard.up("w");
        await page.keyboard.up("Shift");
        const stats = analyze(sample);
        fs.writeFileSync(f, JSON.stringify({ ...sample, ...stats, viewport: label, scenario }, null, 2));
        reports.push({ viewport: label, hero, loc, scenario, ...stats, file: path.basename(f) });
      }
    }
  }
  await page.close();
  return reports;
}

(async () => {
  const browser = await chromium.launch();
  const reports = [];
  if (!process.env.JITTER_MOBILE_ONLY) {
    reports.push(...(await runMatrix(browser, { width: 1280, height: 720 }, "desktop")));
  }
  if (!process.env.JITTER_DESKTOP_ONLY) {
    reports.push(...(await runMatrix(browser, { width: 390, height: 844 }, "mobile")));
  }

  const byKey = {};
  for (const r of reports) {
    const key = `${r.viewport}/${r.loc}/${r.scenario}`;
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push(r.spikes);
  }
  const locSummary = Object.entries(byKey)
    .map(
      ([k, spikes]) =>
        `${k} maxSpikes=${Math.max(...spikes)} avg=${(spikes.reduce((a, b) => a + b, 0) / spikes.length).toFixed(1)}`
    )
    .join("\n");

  const graphPath = path.join(outRoot, "qa-v21-run-delta-graph.txt");
  fs.writeFileSync(
    graphPath,
    reports
      .map(
        r =>
          `${r.viewport} ${r.hero}/${r.loc}/${r.scenario} med=${r.med?.toFixed(4)} spikes=${r.spikes} frames=${r.count}`
      )
      .join("\n") +
      "\n\n--- per viewport/location/scenario (4 heroes) ---\n" +
      locSummary
  );

  await browser.close();
  const pass = reports.every(
    r => r.count >= FRAMES - 5 && r.spikes === 0 && (r.scenario !== "free" || (r.med > 0.04 && r.med < 0.42))
  );
  console.log(JSON.stringify({ pass, FRAMES, SCENARIOS, locSummary, failCount: reports.filter(r => r.spikes > 0).length }, null, 2));
  if (!pass) process.exit(1);
})();
