#!/usr/bin/env node
/** t207u — wing skeleton attach + clip metrics during idle/walk/run/turn. */
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { assertFirebaseEmulatorTestEnv, installProdFirebaseRouteBlock } = require("./firebase-test-emulator-guard");
const { configureCyberPunkBlueStudio, QA_CYBER_PUNK_BLUE } = require("./confirm-character-studio");

assertFirebaseEmulatorTestEnv();

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist-preview");
const OUT = process.env.PUNK_QA_OUT || path.join("/opt/cursor/artifacts", "avatar-qa-t207");

function runBuild() {
  const r = spawnSync("node", [path.join(__dirname, "build-preview.js")], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
}

function serveDist(port) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".json": "application/json",
    ".css": "text/css",
    ".webp": "image/webp",
    ".glb": "model/gltf-binary"
  };
  return http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
    const file = path.join(DIST, rel);
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      return res.end("not found");
    }
    const ext = path.extname(file);
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  }).listen(port);
}

async function sampleClip(page, label) {
  return page.evaluate(async lbl => {
    const attach = window.World3D?.getPlayerWingAttach?.();
  const clip = await window.World3D?.measurePlayerWingClip?.();
    const anim = window.World3D?.getPlayerAnimSnapshot?.();
    return { label: lbl, attach, clip, anim };
  }, label);
}

async function main() {
  runBuild();
  const port = 3498;
  const server = serveDist(port);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("punkme_howto_seen", "1");
      localStorage.removeItem("punkme_avatar_v1");
      localStorage.removeItem("punkme_preview_player_v1");
    } catch (_) {}
  });
  const page = await ctx.newPage();
  await installProdFirebaseRouteBlock(page);
  const samples = [];

  try {
    await page.goto(`http://127.0.0.1:${port}/?lifeCh1E2e=1&v=t207-wings`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => window.__PUNK_PREVIEW__ === true, undefined, { timeout: 15000 });
    await page.waitForSelector("#charSelect.active", { timeout: 120000 });
    await configureCyberPunkBlueStudio(page, QA_CYBER_PUNK_BLUE.name);
    await page.evaluate(() => document.querySelector('[data-testid="character-studio-confirm"]')?.click());
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    await page.click("#touchStage3d").catch(() => {});
    await page.waitForFunction(
      () => {
        const s = window.World3D?.getPlayerActorSnapshot?.();
        return s?.visible === true;
      },
      undefined,
      { timeout: 90000 }
    );
    await page.waitForTimeout(800);

    const attach0 = await page.evaluate(async () => {
      const cfg = window.me?.avatarConfig;
      const look = window.getPlayerAvatarLook?.();
      let attach = window.World3D?.getPlayerWingAttach?.();
      if (!attach?.attachBone) {
        window.syncStage3D?.();
        await new Promise(r => setTimeout(r, 800));
        attach = window.World3D?.getPlayerWingAttach?.();
      }
      return { attach, cfgWings: cfg?.accessories, lookWings: look?.wings };
    });
    if (!attach0.attach?.attachBone) {
      const bones = await page.evaluate(() => window.World3D?.debugPlayerBoneNames?.());
      throw new Error(
        "wings not skeleton-attached: " + JSON.stringify({ ...attach0, boneSample: bones })
      );
    }
    if (attach0.attach.featherCount < 4) {
      throw new Error("wing feather count low: " + JSON.stringify(attach0));
    }

    samples.push(await sampleClip(page, "idle"));
    await page.keyboard.down("w");
    await page.waitForTimeout(1200);
    samples.push(await sampleClip(page, "walk"));
    await page.keyboard.up("w");
    await page.keyboard.down("Shift");
    await page.keyboard.down("w");
    await page.waitForTimeout(900);
    samples.push(await sampleClip(page, "run"));
    await page.keyboard.up("w");
    await page.keyboard.up("Shift");
    await page.keyboard.down("a");
    await page.waitForTimeout(700);
    samples.push(await sampleClip(page, "turn_left"));
    await page.keyboard.up("a");

    const penetrations = samples.filter(s => s.clip?.penetrating);
    const minGap = Math.min(...samples.map(s => s.clip?.minGap ?? 999));

    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, "wing-clip-samples-t207.json"), JSON.stringify({ samples, minGap, penetrations: penetrations.length }, null, 2));

    if (penetrations.length > 2) {
      throw new Error(`excessive wing penetration samples: ${penetrations.length} / ${samples.length}`);
    }
    if (minGap < -0.08) {
      throw new Error(`wing torso gap too negative: ${minGap}`);
    }
    console.log("test-wing-clip-t207: PASS", { minGap, samples: samples.length, attachBone: attach0.attachBone });
  } finally {
    await page.close();
    await ctx.close();
    await browser.close();
    server.close();
  }
}

main().catch(e => {
  console.error("test-wing-clip-t207: FAIL", e);
  process.exit(1);
});
