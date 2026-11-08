#!/usr/bin/env node
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn, spawnSync } = require("child_process");
const {
  assertFirebaseEmulatorTestEnv,
  firebaseEmulatorQueryString,
  installProdFirebaseRouteBlock,
} = require("./firebase-test-emulator-guard");

assertFirebaseEmulatorTestEnv();

const ROOT = path.join(__dirname, "..");
const OUT = process.env.PUNK_ICE_OUT || path.join("/opt/cursor/artifacts", "ice-ch1-footage");
const PORT = Number(process.env.PUNK_PORT || "3490");
const SHA = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();

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

(async () => {
  const serveChild = await serveRoot();
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.removeItem("punkme_lifech1_local_player_v1");
      localStorage.removeItem("punkme_lifech1_local_device_id");
      localStorage.removeItem("punkme_character_id");
    } catch (_) {}
  });
  const page = await ctx.newPage();
  await installProdFirebaseRouteBlock(page);
  const qs = firebaseEmulatorQueryString();
  await page.goto(`http://127.0.0.1:${PORT}/?solo=1${qs}&v=collider-diag`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#charSelect.active", { timeout: 120000 });
  await page.click("#charSelectPortraits .char-portrait-pick >> nth=0");
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.__playerLoaded && window.World3D?.getRoomColliderDiag, undefined, {
    timeout: 120000,
  });
  const diag = await page.evaluate(() => window.World3D.getRoomColliderDiag());
  const outPath = path.join(OUT, `room-collider-diag-${SHA.slice(0, 12)}.json`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ repoSha: SHA, ...diag }, null, 2));
  await browser.close();
  try {
    process.kill(-serveChild.pid, "SIGTERM");
  } catch (_) {}
  console.log(outPath);
  console.log(JSON.stringify({ northSweepMaxZ: diag.northSweepMaxZ, colliderCount: diag.colliderCount }, null, 2));
})();
