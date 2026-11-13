#!/usr/bin/env node
/**
 * t206u — Mandatory QA avatar CYBER PUNK BLUE + diversity gate.
 * Emulator env required. Captures screenshots to PUNK_QA_OUT.
 */
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { pathToFileURL } = require("url");
const { assertFirebaseEmulatorTestEnv, installProdFirebaseRouteBlock } = require("./firebase-test-emulator-guard");
const { configureCyberPunkBlueStudio, QA_CYBER_PUNK_BLUE } = require("./confirm-character-studio");
const { DIVERSITY_QA_CONFIGS, assertDiversityDistinct } = require("./avatar-qa-presets");

assertFirebaseEmulatorTestEnv();

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist-preview");
const OUT =
  process.env.PUNK_QA_OUT ||
  path.join("/opt/cursor/artifacts", "avatar-qa-t206");
const HOWTO_SEEN_KEY = "punkme_howto_seen";

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
      res.end("not found");
      return;
    }
    const ext = path.extname(file);
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  }).listen(port);
}

async function assertCatalogAndDiversity() {
  const mod = await import(pathToFileURL(path.join(ROOT, "js/avatar/avatar-catalog.mjs")).href);
  const cat = JSON.parse(fs.readFileSync(path.join(ROOT, "data/story/avatar-catalog.json"), "utf8"));
  global.window = {};
  const v = mod.validateAvatarConfig(QA_CYBER_PUNK_BLUE, cat);
  if (!v.ok) throw new Error("QA_CYBER_PUNK_BLUE invalid: " + v.errors.join(","));
  for (const cfg of DIVERSITY_QA_CONFIGS) {
    const r = mod.validateAvatarConfig(cfg, cat);
    if (!r.ok) throw new Error(`diversity config ${cfg.name}: ${r.errors.join(",")}`);
  }
  assertDiversityDistinct(DIVERSITY_QA_CONFIGS);
  const look = mod.buildLookFromConfig(QA_CYBER_PUNK_BLUE, cat);
  if (look.hair !== 44607) throw new Error(`hair hex expected electric_blue 44607 got ${look.hair}`);
  if (look.tint !== 16755234) throw new Error(`skin tint expected tone_02 got ${look.tint}`);
  if (!look.wings) throw new Error("wings flag missing on QA look");
  if (look.jacket !== 2752872) throw new Error("cyber punk jacket color mismatch");
  console.log("t206u-catalog-diversity: PASS", { distinct: DIVERSITY_QA_CONFIGS.length });
}

async function runVisualQa(base) {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(key => {
    try {
      localStorage.setItem(key, "1");
      localStorage.removeItem("punkme_avatar_v1");
    } catch (_) {}
  }, HOWTO_SEEN_KEY);
  const page = await context.newPage();
  await installProdFirebaseRouteBlock(page);

  try {
    await page.goto(`${base}/?lifeCh1E2e=1&v=t206-qa`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => window.__PUNK_PREVIEW__ === true, undefined, { timeout: 15000 });

    await configureCyberPunkBlueStudio(page, QA_CYBER_PUNK_BLUE.name);
    const summary = await page.textContent('[data-testid="studio-summary"]');
    if (!summary.includes("Cyber Punk") && !summary.includes("Cyber")) {
      throw new Error("studio summary missing cyber style: " + summary);
    }

    const yawA = await page.evaluate(() => window.__charSelectPreviewYaw);
    await page.waitForTimeout(900);
    const yawB = await page.evaluate(() => window.__charSelectPreviewYaw);
    if (yawA == null || yawB == null || Math.abs(yawB - yawA) < 0.004) {
      throw new Error(`preview rotation stale yawA=${yawA} yawB=${yawB}`);
    }

    await page.screenshot({ path: path.join(OUT, "t206-character-studio-cyber-punk-blue.png"), fullPage: true });

    for (const lang of ["ru", "en", "da"]) {
      await page.evaluate(l => window.setLanguage?.(l), lang);
      await page.waitForTimeout(200);
      const title = await page.locator(".studio-title").textContent();
      const confirmTxt = await page.evaluate(() =>
        document.querySelector('[data-testid="character-studio-confirm"]')?.textContent?.trim()
      );
      if (!title || !confirmTxt) throw new Error(`studio i18n incomplete for ${lang}`);
    }

    await page.locator('[data-testid="character-studio-confirm"]').scrollIntoViewIfNeeded();
    await page.evaluate(() => document.querySelector('[data-testid="character-studio-confirm"]')?.click());
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });

    const cfg = await page.evaluate(qa => {
      const c = window.me?.avatarConfig || {};
      const st = window.me?.lifeCh1 || {};
      return {
        cfg: c,
        playerCutout: st.playerCutout,
        heroName: window.me?.heroName,
        characterId: window.me?.characterId,
        match:
          c.skinTone === qa.skinTone &&
          c.hairStyle === qa.hairStyle &&
          c.hairColor === qa.hairColor &&
          c.outfitStyle === qa.outfitStyle &&
          (c.accessories || []).includes("wings_01")
      };
    }, QA_CYBER_PUNK_BLUE);
    if (!cfg.match) throw new Error("avatarConfig mismatch after confirm: " + JSON.stringify(cfg));
    if (cfg.playerCutout !== false) throw new Error("playerCutout must be false (companion Angelina)");
    if (cfg.characterId !== "life_ch1_proxy") throw new Error("expected life_ch1_proxy player id");

    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, "t206-gameplay-room-cyber-punk-blue.png") });

    const wings = await page.evaluate(() => {
      const pl = window.World3D?.getPlayerActorSnapshot?.();
      return pl;
    });
    if (!wings?.hasWings) {
      const fallback = await page.evaluate(() => {
        const look = window.getPlayerAvatarLook?.();
        return { lookWings: !!look?.wings };
      });
      if (!fallback.lookWings) throw new Error("wings not on player look");
    }

    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    const after = await page.evaluate(qa => {
      const c = window.me?.avatarConfig || {};
      return (
        c.skinTone === qa.skinTone &&
        c.hairStyle === qa.hairStyle &&
        c.hairColor === qa.hairColor &&
        c.outfitStyle === qa.outfitStyle &&
        (c.accessories || []).includes("wings_01")
      );
    }, QA_CYBER_PUNK_BLUE);
    if (!after) throw new Error("avatarConfig lost after reload");

    await page.keyboard.down("w");
    await page.waitForTimeout(800);
    await page.keyboard.up("w");
    const anim = await page.evaluate(() => {
      const snap = window.World3D?.getPlayerAnimSnapshot?.();
      return snap;
    });
    if (anim && anim.current !== "walk" && anim.current !== "run" && anim.current !== "idle") {
      throw new Error("unexpected anim state: " + JSON.stringify(anim));
    }

    const report = {
      qaPreset: "cyber_punk_blue",
      config: QA_CYBER_PUNK_BLUE,
      screenshots: [
        path.join(OUT, "t206-character-studio-cyber-punk-blue.png"),
        path.join(OUT, "t206-gameplay-room-cyber-punk-blue.png")
      ],
      diversityCount: DIVERSITY_QA_CONFIGS.length,
      at: new Date().toISOString()
    };
    fs.writeFileSync(path.join(OUT, "t206-qa-report.json"), JSON.stringify(report, null, 2));
    console.log("t206u-visual-qa: PASS", report.screenshots);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

async function main() {
  assertDiversityDistinct(DIVERSITY_QA_CONFIGS);
  await assertCatalogAndDiversity();
  runBuild();
  const port = 3499;
  const server = serveDist(port);
  try {
    await runVisualQa(`http://127.0.0.1:${port}`);
  } finally {
    server.close();
  }
  console.log("test-avatar-qa-t206: PASS");
}

main().catch(err => {
  console.error("test-avatar-qa-t206: FAIL", err);
  process.exit(1);
});
