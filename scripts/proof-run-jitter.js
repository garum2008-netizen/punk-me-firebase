require("./lib/require-local-capture.js");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const outRoot = process.env.QA_OUT || "/opt/cursor/artifacts";
fs.mkdirSync(outRoot, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const HEROES = process.env.JITTER_HERO
  ? [process.env.JITTER_HERO].flatMap(s => s.split(","))
  : ["vienna", "cobalt", "mohawk", "razor"];
const LOCS = ["street", "city", "cemetery", "room", "construction", "parkour"];
const SCENARIOS = ["free", "wall", "slide"];
const FRAMES = 120;
const CELL_TIMEOUT_MS = 3 * 60 * 1000;
const LOCO_STEP = 7.2 / 60;
const SPIKE_DELTA_FRAC = 0.4;
const SPIKE_DELTA_MIN = LOCO_STEP * SPIKE_DELTA_FRAC;
const STALL_D = 0.028;
const STALL_RUN = 6;
const STEADY_MIN = LOCO_STEP * 0.65;
const STEADY_SPIKE_EPS = 0.032;
const tablePath = path.join(outRoot, "qa-v21-jitter-matrix-table.txt");

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
    count: sample.frames?.length || sample.count || 0,
    activeFrames: active.length
  };
}

function cellJsonPath(viewport, hero, loc, scenario) {
  return path.join(outRoot, `qa-v21-jitter-${viewport}-${hero}-${loc}-${scenario}.json`);
}

function cellNeedsRun(viewport, hero, loc, scenario) {
  if (process.env.JITTER_NO_CACHE === "1") return true;
  const f = cellJsonPath(viewport, hero, loc, scenario);
  if (!fs.existsSync(f)) return true;
  try {
    const row = JSON.parse(fs.readFileSync(f, "utf8"));
    return !cellPasses(row, loc, scenario);
  } catch {
    return true;
  }
}

function cellPasses(row, loc, scenario) {
  const count = row.count ?? row.frames?.length ?? 0;
  if (count < FRAMES - 2) return false;
  if (loc === "street" && (scenario === "slide" || scenario === "wall")) {
    if ((row.medDelta ?? 0) <= 0) return false;
  }
  return true;
}

function allCells() {
  const viewports = [];
  if (!process.env.JITTER_MOBILE_ONLY) viewports.push({ label: "desktop", viewport: { width: 1280, height: 720 } });
  if (!process.env.JITTER_DESKTOP_ONLY) viewports.push({ label: "mobile", viewport: { width: 390, height: 844 } });
  const cells = [];
  for (const v of viewports) {
    for (const hero of HEROES) {
      for (const loc of LOCS) {
        for (const scenario of SCENARIOS) {
          cells.push({ ...v, hero, loc, scenario });
        }
      }
    }
  }
  return cells;
}

function loadRowFromDisk(cell) {
  const f = cellJsonPath(cell.label, cell.hero, cell.loc, cell.scenario);
  if (!fs.existsSync(f)) return null;
  try {
    const row = JSON.parse(fs.readFileSync(f, "utf8"));
    return {
      viewport: cell.label,
      hero: cell.hero,
      loc: cell.loc,
      scenario: cell.scenario,
      ...row,
      file: path.basename(f),
      passes: cellPasses(row, cell.loc, cell.scenario)
    };
  } catch {
    return null;
  }
}

function buildAggregateSummary(rows) {
  const byKey = {};
  for (const r of rows) {
    const key = `${r.viewport}/${r.loc}/${r.scenario}`;
    if (!byKey[key]) byKey[key] = [];
    byKey[key].push(r);
  }
  return Object.entries(byKey)
    .map(([k, group]) => {
      const deltaMax = Math.max(...group.map(r => r.deltaSpikes ?? 0));
      const camMax = Math.max(...group.map(r => r.camJitterMax ?? 0));
      const slides = group.filter(r => r.scenario === "slide" && r.loc === "street");
      const slideMed =
        slides.length
          ? slides.reduce((a, r) => a + (r.medDelta ?? 0), 0) / slides.length
          : null;
      const slideMedStr = slideMed != null ? ` slideMedAvg=${slideMed.toFixed(4)}` : "";
      return `${k} deltaSpikes max=${deltaMax} camJitterMax=${camMax.toFixed(5)}${slideMedStr}`;
    })
    .join("\n");
}

function writeTable(rows) {
  const sorted = [...rows].sort((a, b) =>
    `${a.viewport}\t${a.hero}\t${a.loc}\t${a.scenario}`.localeCompare(
      `${b.viewport}\t${b.hero}\t${b.loc}\t${b.scenario}`
    )
  );
  const body = sorted
    .map(
      r =>
        `${r.viewport}\t${r.hero}\t${r.loc}\t${r.scenario}\tframes=${r.count ?? 0}\tdeltaSpikes=${r.deltaSpikes ?? 0}\tmedDelta=${(r.medDelta ?? 0).toFixed(4)}\tcamJitterMax=${(r.camJitterMax ?? 0).toFixed(5)}${r.passes === false ? "\tFAIL" : ""}${r.skipped ? "\t(cached)" : ""}`
    )
    .join("\n");
  const summary = buildAggregateSummary(sorted);
  fs.writeFileSync(tablePath, body + "\n\n--- aggregate (deltaSpikes, camJitterMax, street slide medDelta avg) ---\n" + summary + "\n");
}

async function evalWithTimeout(page, fn, arg, ms = 20000) {
  return Promise.race([
    page.evaluate(fn, arg),
    new Promise((_, reject) => setTimeout(() => reject(new Error("page.evaluate timeout")), ms))
  ]);
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

async function runCellProbe(page, cell) {
  const { label, hero, loc, scenario } = cell;
  await enter(page, hero);
  await page.evaluate(id => {
    goLocation(id);
    syncStage3D?.();
    World3D?.releaseCaptureFrame?.();
  }, loc);
  await page.waitForTimeout(1200);
  await page.bringToFront();
  await page.keyboard.down("w");
  await page.keyboard.down("Shift");
  await evalWithTimeout(
    page,
    ({ frames, scenario: sc }) => {
      World3D.startMotionProbe(frames, sc);
    },
    { frames: FRAMES, scenario },
    15000
  );
  const deadline = Date.now() + 90000;
  let sample = { frames: [], count: 0 };
  while (Date.now() < deadline) {
    const n = await evalWithTimeout(
      page,
      () => {
        for (let i = 0; i < 4; i++) World3D.pumpMotionProbe?.();
        return World3D.getMotionProbeCount();
      },
      undefined,
      15000
    );
    if (n >= FRAMES) {
      sample = await evalWithTimeout(page, () => World3D.stopMotionProbe(), undefined, 15000);
      break;
    }
    await page.waitForTimeout(8);
  }
  if ((sample.count ?? sample.frames?.length ?? 0) < FRAMES - 2) {
    sample = await evalWithTimeout(page, () => World3D.stopMotionProbe(), undefined, 15000).catch(() => sample);
  }
  await page.keyboard.up("w").catch(() => {});
  await page.keyboard.up("Shift").catch(() => {});
  const stats = analyze(sample);
  const row = { ...sample, ...stats, viewport: label, scenario, hero, loc };
  const f = cellJsonPath(label, hero, loc, scenario);
  fs.writeFileSync(f, JSON.stringify(row, null, 2));
  return { ...row, file: path.basename(f), passes: cellPasses(row, loc, scenario) };
}

async function runCellWithTimeout(browser, cell, attempt) {
  const page = await browser.newPage({ viewport: cell.viewport });
  await prep(page);
  await page.goto(`${base}/?dev=1&solo=1&v=jitter-${cell.label}-${cell.hero}-${cell.loc}-${cell.scenario}-a${attempt}`, {
    waitUntil: "domcontentloaded",
    timeout: 120000
  });
  try {
    return await Promise.race([
      runCellProbe(page, cell),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("CELL_TIMEOUT_3MIN")), CELL_TIMEOUT_MS)
      )
    ]);
  } finally {
    await page.close().catch(() => {});
  }
}

(async () => {
  const cells = allCells();
  const reports = new Map();
  for (const cell of cells) {
    const existing = loadRowFromDisk(cell);
    if (existing && existing.passes && !cellNeedsRun(cell.label, cell.hero, cell.loc, cell.scenario)) {
      existing.skipped = true;
      reports.set(`${cell.label}/${cell.hero}/${cell.loc}/${cell.scenario}`, existing);
    }
  }
  writeTable([...reports.values()]);

  const browser = await chromium.launch({
    args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding"]
  });

  const failedAfterRetry = [];

  for (const cell of cells) {
    const key = `${cell.label}/${cell.hero}/${cell.loc}/${cell.scenario}`;
    if (reports.get(key)?.passes) continue;

    let passed = false;
    let lastRow = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      console.log(`jitter ${key} attempt ${attempt} start`);
      try {
        lastRow = await runCellWithTimeout(browser, cell, attempt);
        console.log(
          `jitter ${key} attempt ${attempt} frames=${lastRow.count} deltaSpikes=${lastRow.deltaSpikes} camMax=${lastRow.camJitterMax} medDelta=${lastRow.medDelta}`
        );
        if (lastRow.passes) {
          passed = true;
          reports.set(key, lastRow);
          writeTable([...reports.values()]);
          break;
        }
      } catch (e) {
        console.warn(`jitter ${key} attempt ${attempt} error: ${e.message}`);
        if (e.message === "CELL_TIMEOUT_3MIN") {
          console.warn(`jitter ${key} attempt ${attempt} killed after 3min`);
        }
      }
    }
    if (!passed) {
      const row = lastRow || loadRowFromDisk(cell) || {
        viewport: cell.label,
        hero: cell.hero,
        loc: cell.loc,
        scenario: cell.scenario,
        count: 0,
        deltaSpikes: 0,
        camJitterMax: 0,
        medDelta: 0,
        passes: false
      };
      row.passes = false;
      reports.set(key, row);
      failedAfterRetry.push(key);
      writeTable([...reports.values()]);
    }
  }

  await browser.close();

  const allRows = [...reports.values()];
  writeTable(allRows);

  const streetSlideRows = allRows.filter(r => r.loc === "street" && r.scenario === "slide");
  const slideMedianByViewport = {};
  for (const vp of ["desktop", "mobile"]) {
    const meds = streetSlideRows
      .filter(r => r.viewport === vp && r.passes)
      .map(r => r.medDelta ?? 0)
      .sort((a, b) => a - b);
    slideMedianByViewport[vp] = meds.length ? meds[Math.floor(meds.length / 2)] : 0;
  }

  const summary = {
    cells: cells.length,
    failedAfterRetry,
    slideMedianStreet: slideMedianByViewport,
    tablePath,
    deltaSpikeTotal: allRows.reduce((s, r) => s + (r.deltaSpikes ?? 0), 0),
    aggregate: buildAggregateSummary(allRows)
  };
  console.log(JSON.stringify(summary, null, 2));
  process.exit(failedAfterRetry.length ? 1 : 0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
