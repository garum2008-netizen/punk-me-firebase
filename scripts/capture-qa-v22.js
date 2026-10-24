#!/usr/bin/env node
/** QA v22 captures — 3 min hard cap per shot, one retry. */
const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = process.env.QA_OUT || path.join("/workspace/qa");
const BASE = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const CAP_MS = 180000;
const LOCS = ["room", "kitchen", "toilet", "elevator", "roof", "street", "city", "construction", "cemetery", "parkour"];

fs.mkdirSync(OUT, { recursive: true });

async function withTimeout(label, fn) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${label}`)), CAP_MS))
      ]);
    } catch (e) {
      lastErr = e;
      console.warn(`[retry] ${label} attempt ${attempt + 1}: ${e.message}`);
    }
  }
  throw lastErr;
}

async function prep(page) {
  await page.addInitScript(() => {
    try { localStorage.setItem("punkme_howto_seen", "1"); } catch (e) {}
  });
}

async function enterGame(page) {
  await page.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  await page.evaluate(() => {
    document.querySelector('.char-pick[data-id="cobalt"]')?.click();
    document.getElementById("charSelectConfirm")?.click();
  });
  await page.waitForFunction(() => window.World3D?.isReady?.() && window.me?.characterId, { timeout: 120000 });
  await page.evaluate(() => {
    me.onboarding = { step: 6, progress: {}, done: true };
    me.coins = 500;
    StoryEngine.ensureStoryState(me);
    StoryEngine.onOnboardingComplete?.();
    saveMe?.();
    document.getElementById("howToOverlay")?.classList.remove("active");
    document.getElementById("charSelect")?.classList.remove("active");
    document.querySelector(".modal.active")?.classList.remove("active");
    World3D?.resize?.();
  });
}

async function shotLoc(page, loc, prefix) {
  await withTimeout(`loc-${prefix}-${loc}`, async () => {
    await page.evaluate(id => {
      const st = StoryEngine.ensureStoryState(me);
      st.calloutAt = {};
      goLocation(id);
      syncStage3D?.();
    }, loc);
    await page.waitForTimeout(2200);
    await page.waitForSelector("#storyDirection.visible", { timeout: 10000 }).catch(() => {});
    const file = path.join(OUT, `qa-v22-${prefix}-${loc}.png`);
    await page.locator("#game").screenshot({ path: file, type: "png" });
    console.log("saved", file);
  });
}

async function shotDuel(page, prefix) {
  await withTimeout(`duel-${prefix}`, async () => {
    await page.evaluate(() => {
      goLocation("street");
      syncStage3D?.();
    });
    await page.waitForTimeout(2000);
    await page.evaluate(() => {
      StoryEngine.dismissAllStoryUi?.();
      startNpcFight("mohawk");
    });
    await page.waitForTimeout(800);
    for (let i = 0; i < 12; i++) {
      await page.evaluate(() => {
        duel3dAttack?.();
        window._duelAttack = true;
      });
      await page.waitForTimeout(450);
    }
    const torso = await page.evaluate(() => {
      const pl = window.World3D?.getDebugCamera?.()?.player;
      if (!pl) return null;
      const wx = pl.wx ?? pl.group?.position?.x;
      const wz = pl.wz ?? pl.group?.position?.z;
      const p = World3D.projectWorldPoint?.(wx, 1.05, wz);
      if (!p) return null;
      const c = document.getElementById("stage3d");
      const ctx = c?.getContext("2d");
      if (!ctx) return { ok: true, skip: true };
      const x = Math.floor(p.x);
      const y = Math.floor(p.y);
      const d = ctx.getImageData(x, y, 1, 1).data;
      const rgb = [d[0], d[1], d[2]];
      const white = rgb[0] > 240 && rgb[1] > 240 && rgb[2] > 240;
      return { ok: !white, rgb };
    });
    if (torso && !torso.skip && !torso.ok) {
      throw new Error(`player torso too white rgb=${JSON.stringify(torso.rgb)}`);
    }
    const file = path.join(OUT, `qa-v22-${prefix}-duel.png`);
    await page.locator("#game").screenshot({ path: file, type: "png" });
    console.log("saved", file, torso);
    await page.evaluate(() => PlayV21?.endAllActivities?.());
  });
}

async function main() {
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await prep(desk);
  await desk.goto(`${BASE}/?solo=1&v=v22qa`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await enterGame(desk);
  for (const loc of LOCS) await shotLoc(desk, loc, "desktop");
  await shotDuel(desk, "desktop");

  const mob = await browser.newPage({ ...devices["iPhone 12"], viewport: { width: 390, height: 844 } });
  await prep(mob);
  await mob.goto(`${BASE}/?solo=1&v=v22qa`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await enterGame(mob);
  for (const loc of LOCS) await shotLoc(mob, loc, "mobile");
  await shotDuel(mob, "mobile");

  await browser.close();
  console.log("qa-v22 captures done in", OUT);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
