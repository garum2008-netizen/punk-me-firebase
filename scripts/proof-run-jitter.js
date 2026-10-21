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
const LOCO_STEP = 7.2 / 60;
const SPIKE_DELTA_FRAC = 0.4;
const SPIKE_DELTA_MIN = LOCO_STEP * SPIKE_DELTA_FRAC;
const STALL_D = 0.028;
const STALL_RUN = 6;
const STEADY_MIN = LOCO_STEP * 0.65;
const STEADY_SPIKE_EPS = 0.032;

function stallMask(deltas) {
  const mask = new Array(deltas.length).fill(false);
  let run = 0;
  for (let i = 0; i < deltas.length; i++) {
    if (deltas[i] < STALL_D) {
      run += 1;
      if (run > STALL_RUN) mask[i] = true;
    } else run = 0;
  }
  return mask;
}

function analyze(sample) {
  const frames = (sample.frames || []).slice(8);
  const deltas = frames.map(f => (typeof f.d === "number" ? f.d : 0));
  const stall = stallMask(deltas);
  let deltaSpikes = 0;
  for (let i = 2; i < deltas.length; i++) {
    if (stall[i] || stall[i - 1]) continue;
    const dd = Math.abs(deltas[i] - deltas[i - 1]);
    if (dd > SPIKE_DELTA_MIN) deltaSpikes += 1;
  }

  const camDeltas = [];
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i - 1];
    const b = frames[i];
    if (a.cx == null || b.cx == null) continue;
    camDeltas.push(Math.hypot(b.cx - a.cx, b.cy - a.cy, b.cz - a.cz));
  }
  camDeltas.sort((x, y) => x - y);
  const camJitterMed = camDeltas.length ? camDeltas[Math.floor(camDeltas.length / 2)] : 0;
  const camJitterMax = camDeltas.length ? Math.max(...camDeltas) : 0;

  const active = deltas.filter(d => d > 0.02);
  const steady = active.filter(d => d >= STEADY_MIN);
  const steadySorted = (steady.length ? steady : active).slice().sort((a, b) => a - b);
  const medSteady = steadySorted.length ? steadySorted[Math.floor(steadySorted.length / 2)] : 0;
  const steadySpikes = steady.filter(d => Math.abs(d - medSteady) > STEADY_SPIKE_EPS).length;
  const moving = deltas.filter(d => d > 0.001).slice().sort((a, b) => a - b);
  const medDelta = moving.length ? moving[Math.floor(moving.length / 2)] : 0;

  return {
    medSteady,
    medDelta,
    steadySpikes,
    deltaSpikes,
    camJitterMed,
    camJitterMax,
    count: sample.frames?.length || 0,
    activeFrames: active.length,
    deltas
  };
}

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

async function runMatrix(browser, viewport, label) {
  const page = await browser.newPage({ viewport });
  await page.bringToFront();
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
        const force =
          process.env.JITTER_NO_CACHE === "1" ||
          (hero === "razor" && loc === "parkour" && (scenario === "wall" || scenario === "slide"));
        if (!force && fs.existsSync(f)) {
          const cached = JSON.parse(fs.readFileSync(f, "utf8"));
          reports.push({
            viewport: label,
            hero,
            loc,
            scenario,
            medSteady: cached.medSteady,
            steadySpikes: cached.steadySpikes,
            deltaSpikes: cached.deltaSpikes,
            camJitterMed: cached.camJitterMed,
            camJitterMax: cached.camJitterMax,
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
        await page.bringToFront();
        await page.keyboard.down("w");
        await page.keyboard.down("Shift");
        await page.evaluate(
          ({ frames, scenario }) => {
            World3D.startMotionProbe(frames, scenario);
          },
          { frames: FRAMES, scenario }
        );
        const deadline = Date.now() + 90000;
        let sample = { frames: [], count: 0 };
        while (Date.now() < deadline) {
          await page.waitForTimeout(1000 / 60);
          const n = await page.evaluate(() => World3D.getMotionProbeCount());
          if (n >= FRAMES) {
            sample = await page.evaluate(() => World3D.stopMotionProbe());
            break;
          }
        }
        if ((sample.count ?? sample.frames?.length ?? 0) < FRAMES - 2) {
          sample = await page.evaluate(() => World3D.stopMotionProbe());
        }
        await page.keyboard.up("w");
        await page.keyboard.up("Shift");
        const stats = analyze(sample);
        const row = { ...sample, ...stats, viewport: label, scenario, hero, loc };
        fs.writeFileSync(f, JSON.stringify(row, null, 2));
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
    byKey[key].push(r);
  }
  const locSummary = Object.entries(byKey)
    .map(([k, rows]) => {
      const deltaMax = Math.max(...rows.map(r => r.deltaSpikes ?? 0));
      const deltaAvg = rows.reduce((a, r) => a + (r.deltaSpikes ?? 0), 0) / rows.length;
      const camMax = Math.max(...rows.map(r => r.camJitterMax ?? 0));
      return `${k} deltaSpikes max=${deltaMax} avg=${deltaAvg.toFixed(1)} camMax=${camMax.toFixed(5)}`;
    })
    .join("\n");

  const tablePath = path.join(outRoot, "qa-v21-jitter-matrix-table.txt");
  const table = reports
    .map(
      r =>
        `${r.viewport}\t${r.hero}\t${r.loc}\t${r.scenario}\tframes=${r.count}\tdeltaSpikes=${r.deltaSpikes}\tmedDelta=${(r.medDelta ?? 0).toFixed(4)}\tsteadySpikes=${r.steadySpikes}\tmedSteady=${(r.medSteady ?? 0).toFixed(4)}\tcamMax=${(r.camJitterMax ?? 0).toFixed(5)}${r.skipped ? "\t(cached)" : ""}`
    )
    .join("\n");
  fs.writeFileSync(tablePath, table + "\n\n--- aggregate ---\n" + locSummary + "\n");

  const graphPath = path.join(outRoot, "qa-v21-run-delta-graph.txt");
  fs.writeFileSync(
    graphPath,
    reports
      .map(
        r =>
          `${r.viewport} ${r.hero}/${r.loc}/${r.scenario} deltaSpikes=${r.deltaSpikes} steadySpikes=${r.steadySpikes} medSteady=${(r.medSteady ?? 0).toFixed(4)} camMed=${(r.camJitterMed ?? 0).toFixed(5)} camMax=${(r.camJitterMax ?? 0).toFixed(5)} frames=${r.count}`
      )
      .join("\n") +
      "\n\n--- per viewport/location/scenario (4 heroes) ---\n" +
      locSummary
  );

  await browser.close();
  const incomplete = reports.filter(r => (r.count ?? 0) < FRAMES - 2);
  const miss = incomplete.map(r => `${r.viewport}/${r.hero}/${r.loc}/${r.scenario}`);
  const stuckSlide = reports.filter(
    r => (r.scenario === "slide" || r.scenario === "wall") && (r.medDelta ?? 0) < 0.04
  );
  console.log(
    JSON.stringify(
      {
        FRAMES,
        LOCO_STEP,
        SPIKE_DELTA_MIN,
        incomplete: miss.length,
        miss,
        stuckSlide: stuckSlide.map(r => `${r.viewport}/${r.hero}/${r.loc}/${r.scenario}:medDelta=${r.medDelta}`),
        locSummary,
        deltaSpikeTotal: reports.reduce((s, r) => s + (r.deltaSpikes ?? 0), 0)
      },
      null,
      2
    )
  );
  if (miss.length || stuckSlide.length) process.exit(1);
})();
