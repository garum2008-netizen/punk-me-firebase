#!/usr/bin/env node
/**
 * Targeted portal regression: keyboard only room→street, read-only position trace.
 * No map, no setGuideTarget, no goLocation injection.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn, spawnSync } = require("child_process");
const {
  assertFirebaseEmulatorTestEnv,
  firebaseEmulatorQueryString,
} = require("./firebase-test-emulator-guard");

assertFirebaseEmulatorTestEnv();

const ROOT = path.join(__dirname, "..");
const OUT = process.env.PUNK_ICE_OUT || path.join("/opt/cursor/artifacts", "ice-ch1-footage");
const PORT = Number(process.env.PUNK_PORT || "3464");
const SHA = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();
const MAX_MS = Number(process.env.PORTAL_REGRESS_MS || "50000");

fs.mkdirSync(OUT, { recursive: true });

function serveRoot() {
  return new Promise(resolve => {
    const child = spawn("npx", ["--yes", "serve", "-l", String(PORT), "."], {
      cwd: ROOT,
      stdio: "ignore",
      detached: true,
    });
    const deadline = Date.now() + 45000;
    const poll = () => {
      http
        .get(`http://127.0.0.1:${PORT}/`, res => {
          res.resume();
          if (res.statusCode && res.statusCode < 500) resolve(child);
          else if (Date.now() < deadline) setTimeout(poll, 400);
          else throw new Error("serve not ready");
        })
        .on("error", () => {
          if (Date.now() < deadline) setTimeout(poll, 400);
          else throw new Error("serve not ready");
        });
    };
    setTimeout(poll, 500);
  });
}

async function focusStage(page) {
  const stage = page.locator("#stage3d");
  const vp = page.viewportSize() || { width: 1280, height: 720 };
  const fx = Math.min(vp.width - 24, Math.round(vp.width * 0.56));
  const fy = Math.min(vp.height - 120, Math.round(vp.height * 0.42));
  await stage.click({ position: { x: fx, y: fy }, timeout: 15000 });
}

async function walkBurst(page, keyMs = 420) {
  await focusStage(page);
  await page.keyboard.down("Shift");
  await page.keyboard.down("w");
  await page.waitForTimeout(keyMs);
  await page.keyboard.up("w");
  await page.keyboard.up("Shift");
  await page.waitForTimeout(90);
}

async function samplePortalDiag(page) {
  return page.evaluate(() => window.World3D?.getPortalReadOnlyDiag?.() || {});
}

(async () => {
  const serveChild = await serveRoot();
  const browser = await chromium.launch();
  const videoDir = path.join(OUT, `playwright-video-portal-regress-${SHA.slice(0, 12)}`);
  fs.mkdirSync(videoDir, { recursive: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } },
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.removeItem("punkme_lifech1_local_player_v1");
      localStorage.removeItem("punkme_lifech1_local_device_id");
      localStorage.removeItem("punkme_character_id");
    } catch (_) {}
  });
  const page = await ctx.newPage();
  const qs = firebaseEmulatorQueryString();
  const entryUrl = `http://127.0.0.1:${PORT}/?solo=1${qs}&v=portal-regress`;
  await page.goto(entryUrl, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#charSelect.active", { timeout: 120000 });
  await page.waitForSelector('[data-testid="char-select-angelina"]', { timeout: 120000 });
  await page.click("#charSelectPortraits .char-portrait-pick >> nth=0");
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
  await page.waitForFunction(() => document.body.classList.contains("mode-world3d"), undefined, {
    timeout: 120000,
  });
  for (const sel of ["#howToPlay .how-to-close", "#howToPlay button.close", "#howToPlay"]) {
    const el = page.locator(sel).first();
    if (await el.isVisible().catch(() => false)) await el.click().catch(() => {});
  }

  const trace = [];
  const start = Date.now();
  while (Date.now() - start < MAX_MS) {
    const st = await page.evaluate(() => ({
      step: window.me?.onboarding?.step,
      loc: window.me?.location,
    }));
    if (st.step >= 1 && st.loc === "street") break;
    if (st.step >= 2 && st.loc === "street") break;
    if (st.step === 1 || (st.step === 0 && Date.now() - start > 8000)) {
      if (st.step === 0) {
        await walkBurst(page, 380);
      }
      if (st.step === 1 && st.loc === "room") {
        await walkBurst(page, 420);
        trace.push({ t: Date.now() - start, phase: "portal_walk_post", ...(await samplePortalDiag(page)) });
      }
    }
    await page.waitForTimeout(80);
  }

  const endLoc = await page.evaluate(() => window.me?.location);
  const passed = endLoc === "street";
  trace.push({ t: Date.now() - start, phase: "final", ...(await samplePortalDiag(page)), passed });

  const vidDest = path.join(OUT, `portal-regress-${SHA.slice(0, 12)}.webm`);
  const video = page.video();
  await ctx.close();
  try {
    await video.saveAs(vidDest);
  } catch (e) {
    const p = await video.path();
    if (p && fs.existsSync(p)) fs.copyFileSync(p, vidDest);
  }

  const report = {
    repoSha: SHA,
    entryUrl,
    maxMs: MAX_MS,
    passed,
    endLoc,
    video: vidDest,
    videoExists: fs.existsSync(vidDest),
    trace,
    minDist:
      trace.filter(t => t.distToStreetPortal != null).sort((a, b) => a.distToStreetPortal - b.distToStreetPortal)[0]
        ?.distToStreetPortal ?? null,
  };
  const outJson = path.join(OUT, `portal-keyboard-regression-${SHA.slice(0, 12)}.json`);
  fs.writeFileSync(outJson, JSON.stringify(report, null, 2));
  await browser.close();
  try {
    process.kill(-serveChild.pid, "SIGTERM");
  } catch (_) {}
  console.log(JSON.stringify(report, null, 2));
  process.exit(passed ? 0 : 1);
})();
