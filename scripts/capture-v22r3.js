#!/usr/bin/env node
/** v22r3 targeted captures — 3 min cap, one retry per shot. */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join("/workspace/qa", "v22r3");
const BASE = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const CAP_MS = 180000;
fs.mkdirSync(OUT, { recursive: true });

async function withRetry(label, fn) {
  let err;
  for (let i = 0; i < 2; i++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout " + label)), CAP_MS))
      ]);
    } catch (e) {
      err = e;
      console.warn(`[retry] ${label}: ${e.message}`);
    }
  }
  throw err;
}

async function prep(page) {
  await page.addInitScript(() => {
    try { localStorage.setItem("punkme_howto_seen", "1"); } catch (e) {}
  });
}

async function enterGame(page) {
  await page.waitForSelector(".char-pick", { timeout: 60000 }).catch(() => {});
  await page.evaluate(() => {
    document.querySelector('.char-pick[data-id="cobalt"]')?.click();
    document.getElementById("charSelectConfirm")?.click();
  });
  await page.waitForFunction(() => window.World3D?.isReady?.() && me?.characterId, { timeout: 120000 });
  await page.evaluate(() => {
    me.onboarding = { step: 6, progress: {}, done: true };
    me.coins = 500;
    StoryEngine.ensureStoryState(me);
    StoryEngine.onOnboardingComplete?.();
    document.getElementById("howToOverlay")?.classList.remove("active");
    document.getElementById("charSelect")?.classList.remove("active");
    World3D?.resize?.();
  });
}

async function setupStage(page, stage) {
  await page.evaluate(s => {
    const st = StoryEngine.ensureStoryState(me);
    st.flags.joined_gang = false;
    st.auth.s1Done = s > 1;
    st.auth.stage = s;
    st.auth.tasks = {};
    st.auth.trials = {};
    if (s >= 2) {
      st.auth.s1Done = true;
      st.authority = 28;
    }
    if (s >= 3) {
      st.auth.tasks = { pizza: true, no_rat: true, cobalt_item: true, ghost_prank: true };
      st.authority = 52;
    }
    if (s >= 4) {
      st.auth.trials = { cemetery: true, roof_parkour: true, duel_mohawk: true };
      st.authority = 92;
    }
    if (s === 1) st.authority = 8;
    StoryEngine.Authority.syncGangRank(me);
    StoryEngine.Authority.renderAuthorityHud(me);
  }, stage);
}

async function openAuthorityDialog(page, stage) {
  await page.evaluate(() => {
    goLocation("street");
    syncStage3D?.();
    StoryEngine.dismissAllStoryUi?.();
  });
  await page.waitForTimeout(2200);
  if (stage === 1) {
    await page.evaluate(() => StoryEngine.Authority.openStage1Dialog({ force: true }));
  } else if (stage === 4) {
    await page.evaluate(() => {
      const st = StoryEngine.ensureStoryState(me);
      st.auth.stage = 4;
      st.auth.trials = { cemetery: true, roof_parkour: true, duel_mohawk: true };
      st.authority = 92;
      st.flags.joined_gang = false;
      StoryEngine.Authority.syncGangRank(me);
      StoryEngine.Authority.runInitiationCeremony({ force: true });
    });
  }
  await page.waitForTimeout(900);
  await page.waitForSelector("#storyDialog.active", { timeout: 15000 });
}

async function measureFrame(page, npcId) {
  return page.evaluate(id => {
    World3D.engageDialogueFraming(id, { live: true });
    for (let i = 0; i < 10; i++) World3D.renderCaptureFrame?.();
    return World3D.measureDialogueFraming(id);
  }, npcId);
}

async function captureAuthority(page, stage, prefix, npcId) {
  const name = `${prefix}-authority-stage${stage}.png`;
  await withRetry(name, async () => {
    await setupStage(page, stage);
    await openAuthorityDialog(page, stage);
    const frame = await measureFrame(page, npcId);
    const minHead = prefix === "mobile" ? 60 : 52;
    if (!frame.pass || frame.headSpanP < minHead || frame.headSpanN < minHead) {
      throw new Error(
        `framing fail ${JSON.stringify({ pass: frame.pass, headSpanP: frame.headSpanP, headSpanN: frame.headSpanN, reasons: frame.reasons })}`
      );
    }
    const dlg = await page.evaluate(() => {
      const r = document.getElementById("storyDialog")?.getBoundingClientRect();
      return r ? { h: r.height, bottom: r.bottom } : null;
    });
    const vh = await page.evaluate(() => window.innerHeight);
    if (dlg && dlg.h < vh * 0.12) throw new Error("dialog panel too short");
    await page.locator("#game").screenshot({ path: path.join(OUT, name) });
    console.log("PASS", name, `heads P=${frame.headSpanP.toFixed(0)} N=${frame.headSpanN.toFixed(0)}`);
  });
}

async function captureDuel(page, prefix) {
  const name = `${prefix}-duel-10hits.png`;
  await withRetry(name, async () => {
    await page.evaluate(() => {
      goLocation("street");
      syncStage3D?.();
      StoryEngine.dismissAllStoryUi?.();
      World3D.startDuel3D("razor", { training: true, firstTo: 99 });
    });
    await page.waitForTimeout(800);
    for (let i = 0; i < 16; i++) {
      await page.evaluate(() => {
        World3D.armDuelCaptureSpam?.();
        window._duelAttack = true;
      });
      await page.waitForTimeout(480);
    }
    const vis = await page.evaluate(() => {
      const hud = document.getElementById("duel3dHud");
      const hidden = hud?.classList.contains("hidden");
      const dbg = World3D.getDuelDebug?.();
      let visibleNpcs = 0;
      document.querySelectorAll("#stage3d").length;
      return {
        hudOpen: !hidden,
        barCount: hud?.querySelectorAll(".bar").length || 0,
        plHits: dbg?.plHits ?? 0,
        duelActive: !!dbg?.active
      };
    });
    if (!vis.hudOpen || !vis.duelActive) throw new Error("duel HUD not active");
    if (vis.plHits < 10) throw new Error(`only ${vis.plHits} hits`);
    if (vis.barCount < 2) throw new Error("HP bars missing");
    await page.locator("#game").screenshot({ path: path.join(OUT, name) });
    console.log("PASS", name, vis);
  });
}

async function captureMobileHud(page) {
  const name = "mobile-hud-layout.png";
  await withRetry(name, async () => {
    await page.evaluate(() => {
      goLocation("street");
      syncStage3D?.();
    });
    await page.waitForTimeout(1500);
    const layout = await page.evaluate(() => {
      const chat = document.getElementById("chatToggle")?.getBoundingClientRect();
      const joy = document.getElementById("touchJoystick")?.getBoundingClientRect();
      const eBtn = document.getElementById("touchInteract")?.getBoundingClientRect();
      const col = document.querySelector(".hud-column")?.getBoundingClientRect();
      const overlap =
        chat && joy
          ? !(chat.right < joy.left || chat.left > joy.right || chat.bottom < joy.top || chat.top > joy.bottom)
          : false;
      return {
        overlap,
        colHeightPct: col ? (col.height / window.innerHeight) * 100 : 0,
        questsCollapsed: document.getElementById("hudQuestsWrap")?.classList.contains("collapsed")
      };
    });
    if (layout.overlap) throw new Error("chat overlaps joystick");
    if (!layout.questsCollapsed) throw new Error("quests not collapsed");
    if (layout.colHeightPct > 22) throw new Error(`hud column ${layout.colHeightPct.toFixed(1)}% > 22%`);
    await page.locator("#game").screenshot({ path: path.join(OUT, name) });
    console.log("PASS", name, layout);
  });
}

(async () => {
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await prep(desk);
  await desk.goto(`${BASE}/?solo=1&v=v22r3`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await enterGame(desk);
  await captureAuthority(desk, 1, "desktop", "mohawk");
  await captureAuthority(desk, 4, "desktop", "razor");
  await captureDuel(desk, "desktop");

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prep(mob);
  await mob.goto(`${BASE}/?solo=1&v=v22r3m`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await enterGame(mob);
  await captureAuthority(mob, 4, "mobile", "razor");
  await captureDuel(mob, "mobile");
  await captureMobileHud(mob);

  await browser.close();
  console.log("done", OUT);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
