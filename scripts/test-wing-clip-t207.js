#!/usr/bin/env node
/** t207u — wing skeleton attach + clip metrics (idle/walk/run/turn + Angelina/build). */
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
const GIT_SHA = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();

/** Automated fail gate (documented in output thresholds). */
const FAIL_MIN_GAP = -0.08;
const MAX_PENETRATION_SAMPLES = 2;

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

async function releaseKeys(page) {
  for (const k of ["w", "a", "s", "d", "Shift"]) {
    await page.keyboard.up(k).catch(() => {});
  }
  await page.waitForTimeout(120);
}

async function waitForAnim(page, name, timeoutMs = 20000) {
  await page.waitForFunction(
    n => window.World3D?.getPlayerAnimSnapshot?.()?.current === n,
    name,
    { timeout: timeoutMs, polling: 80 }
  );
  await page.waitForTimeout(200);
}

async function forceLocomotion(page, name, { move = false } = {}) {
  await releaseKeys(page);
  const ok = await page.evaluate(
    n => window.World3D?.setPlayerAnimForE2e?.(n, 12000),
    name
  );
  if (!ok) throw new Error(`setPlayerAnimForE2e failed for ${name}`);
  await waitForAnim(page, name, 12000);
  if (move) {
    await page.keyboard.down("w");
    if (name === "run") await page.keyboard.down("Shift");
    await page.waitForTimeout(400);
  }
}

async function sampleClip(page, label, context = {}) {
  return page.evaluate(
    async ({ lbl, ctx }) => {
      const attach = window.World3D?.getPlayerWingAttach?.();
      const clip = await window.World3D?.measurePlayerWingClip?.();
      const anim = window.World3D?.getPlayerAnimSnapshot?.();
      return {
        label: lbl,
        context: ctx,
        attach,
        clip,
        anim,
        guideVisible: document.getElementById("angelinaGuideBanner")?.classList.contains("visible"),
        guideText: (document.getElementById("angelinaGuideBanner")?.textContent || "").slice(0, 80),
        buildMode: typeof window.isBuildMode === "function" ? window.isBuildMode() : false,
        wardrobeOpen: !document.getElementById("lifeCh1Wardrobe")?.hidden
      };
    },
    { lbl: label, ctx: context }
  );
}

function validateSample(sample, expectedAnim) {
  if (expectedAnim && sample.anim?.current !== expectedAnim) {
    throw new Error(
      `sample "${sample.label}" expected anim=${expectedAnim} got ${sample.anim?.current} ` +
        JSON.stringify(sample.anim)
    );
  }
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
      () => window.World3D?.getPlayerActorSnapshot?.()?.visible === true,
      undefined,
      { timeout: 90000 }
    );
    await page.waitForTimeout(600);

    const attach0 = await page.evaluate(() => window.World3D?.getPlayerWingAttach?.());
    if (!attach0?.attachBone || attach0.featherCount < 4) {
      throw new Error("wings not ready: " + JSON.stringify(attach0));
    }

    samples.push(await sampleClip(page, "idle", { phase: "locomotion" }));
    validateSample(samples[0], "idle");

    await forceLocomotion(page, "walk", { move: false });
    samples.push(await sampleClip(page, "walk", { phase: "locomotion", locomotionMethod: "e2e_hold_clip" }));
    validateSample(samples[1], "walk");
    await releaseKeys(page);

    await forceLocomotion(page, "run", { move: true });
    await page.waitForTimeout(350);
    samples.push(await sampleClip(page, "run", { phase: "locomotion", locomotionMethod: "e2e_hold_clip+Shift+W" }));
    validateSample(samples[2], "run");
    await releaseKeys(page);

    await page.evaluate(() => window.World3D?.setPlayerAnimForE2e?.("walk"));
    await page.keyboard.down("w");
    await page.keyboard.down("a");
    await page.waitForTimeout(500);
    samples.push(await sampleClip(page, "turn_left", { phase: "locomotion", locomotionMethod: "walk+strafe" }));
    await releaseKeys(page);

    await page.evaluate(() => {
      window.me.onboarding = { step: 1, progress: {}, done: false };
      window.AngelinaGuide?.refresh?.();
    });
    await page.waitForTimeout(400);
    const guideSample = await sampleClip(page, "angelina_guide", { phase: "companion_ui" });
    if (!guideSample.guideVisible || !guideSample.guideText) {
      throw new Error("angelina guide not visible: " + JSON.stringify(guideSample));
    }
    samples.push(guideSample);

    await page.evaluate(() => {
      window.LifeCh1Slice?.ensureLifeCh1?.(window.me);
      const st = window.me.lifeCh1;
      if (st) {
        st.active = true;
        st.stepIndex = 1;
        st.playerCutout = false;
      }
      window.LifeCh1Slice?.openWardrobePanel?.();
    });
    await page.waitForSelector("#lifeCh1Wardrobe:not([hidden])", { timeout: 15000 });
    await page.waitForTimeout(500);
    samples.push(await sampleClip(page, "angelina_wardrobe", { phase: "companion_interaction" }));
    await page.evaluate(() => window.LifeCh1Slice?.closeWardrobePanel?.());

    await page.evaluate(() => {
      window.me.onboarding = { step: 6, progress: { shop: true }, done: false };
      window.me.location = "city";
      window.goLocation?.("city");
      window.syncStage3D?.();
      if (typeof window.toggleBuildMode === "function" && !window.isBuildMode?.()) {
        window.toggleBuildMode();
      }
    });
    await page.waitForFunction(() => window.me?.location === "city", undefined, { timeout: 20000 });
    await page.waitForFunction(() => window.isBuildMode?.() === true, undefined, { timeout: 15000 });
    await page.waitForTimeout(600);
    await page.keyboard.down("w");
    await page.waitForTimeout(300);
    samples.push(await sampleClip(page, "city_build_mode", { phase: "build_interaction" }));
    await releaseKeys(page);

    const penetrations = samples.filter(s => s.clip?.penetrating);
    const touching = samples.filter(s => s.clip?.touching);
    const minGap = Math.min(...samples.map(s => s.clip?.minGap ?? 999));

    const report = {
      gitSha: GIT_SHA,
      hero: "CYBER_PUNK_BLUE",
      generatedAt: new Date().toISOString(),
      thresholds: {
        penetrating: "minGap < 0 (clip.penetrating === true)",
        touching: "0 <= minGap < touchEpsilon (default 0.02 world units)",
        clear: "minGap >= touchEpsilon",
        automatedFailGate: `minGap < ${FAIL_MIN_GAP} OR more than ${MAX_PENETRATION_SAMPLES} penetrating samples`
      },
      summary: {
        sampleCount: samples.length,
        minGap,
        penetratingCount: penetrations.length,
        touchingCount: touching.length,
        attachBone: attach0.attachBone
      },
      samples
    };

    fs.mkdirSync(OUT, { recursive: true });
    const outPath = path.join(OUT, "wing-clip-samples-t207.json");
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

    if (penetrations.length > MAX_PENETRATION_SAMPLES) {
      throw new Error(`excessive wing penetration: ${penetrations.length}`);
    }
    if (minGap < FAIL_MIN_GAP) {
      throw new Error(`wing torso gap too negative: ${minGap}`);
    }
    console.log("test-wing-clip-t207: PASS", report.summary, outPath);
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
