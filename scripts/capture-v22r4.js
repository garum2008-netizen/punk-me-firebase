require('./lib/require-local-capture.js');
#!/usr/bin/env node
/** v22r4 polish captures — 3 min cap, one retry per shot. */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join("/workspace/qa", "v22r4");
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
  await page.waitForTimeout(200);
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
  if (stage === 4) {
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

async function measureFrame(page, npcId, forceMobile = false) {
  return page.evaluate(({ id, forceMobile }) => {
    World3D.releaseCaptureFrame?.();
    World3D.resize?.();
    World3D.engageDialogueFraming(id, { live: true, forceMobile });
    for (let i = 0; i < 10; i++) World3D.renderCaptureFrame?.();
    return World3D.measureDialogueFraming(id);
  }, { id: npcId, forceMobile });
}

function rectsOverlap(a, b) {
  if (!a || !b) return false;
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

async function captureAuthority(page, stage, prefix, npcId) {
  const name = `${prefix}-authority-stage${stage}.png`;
  await withRetry(name, async () => {
    await setupStage(page, stage);
    await openAuthorityDialog(page, stage);
    const frame = await measureFrame(page, npcId, prefix === "mobile");
    const minHead = prefix === "mobile" ? 60 : 52;
    if (!frame.pass || frame.headSpanP < minHead || frame.headSpanN < minHead) {
      throw new Error(`framing fail ${JSON.stringify(frame)}`);
    }
    if (prefix === "desktop" && stage === 4) {
      const y = Math.max(frame.player?.y ?? 0, frame.npc?.y ?? 0);
      if (y < 0.38 || y > 0.52) throw new Error(`desktop stage4 head y ${y} not in 40-50% band`);
    }
    await page.locator("#game").screenshot({ path: path.join(OUT, name) });
    console.log("PASS", name, frame.headSpanP, frame.headSpanN);
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
      World3D.frameDuelCamera?.();
      for (let i = 0; i < 4; i++) World3D.renderCaptureFrame?.();
      const hud = document.getElementById("duel3dHud");
      const dbg = World3D.getDuelDebug?.();
      const duelFrame = World3D.measureDuelFraming?.();
      return {
        hudOpen: !hud?.classList.contains("hidden"),
        barCount: hud?.querySelectorAll(".bar").length || 0,
        plHits: dbg?.plHits ?? 0,
        duelActive: !!dbg?.active,
        duelFrame
      };
    });
    if (!vis.hudOpen || !vis.duelActive) throw new Error("duel HUD not active");
    if (vis.plHits < 10) throw new Error(`only ${vis.plHits} hits`);
    if (!vis.duelFrame?.pass) throw new Error(`opponent framing ${JSON.stringify(vis.duelFrame)}`);
    await page.locator("#game").screenshot({ path: path.join(OUT, name) });
    console.log("PASS", name, vis.plHits, vis.duelFrame);
  });
}

async function captureMobileHud(page) {
  const name = "mobile-hud-chat-pill.png";
  await withRetry(name, async () => {
    await page.evaluate(() => {
      goLocation("street");
      syncStage3D?.();
    });
    await page.waitForTimeout(1500);
    const layout = await page.evaluate(() => {
      const chat = document.getElementById("chatToggle")?.getBoundingClientRect();
      const players = document.getElementById("playersToggle")?.getBoundingClientRect();
      const joy = document.getElementById("touchJoystick")?.getBoundingClientRect();
      const chatW = chat ? chat.width / window.innerWidth : 0;
      return {
        chatJoyOverlap: chat && joy ? !(chat.right < joy.left || chat.left > joy.right || chat.bottom < joy.top || chat.top > joy.bottom) : false,
        chatPlayersOverlap: chat && players ? !(chat.right < players.left || chat.left > players.right || chat.bottom < players.top || chat.top > players.bottom) : false,
        chatWidthPct: chatW * 100,
        questsCollapsed: document.getElementById("hudQuestsWrap")?.classList.contains("collapsed")
      };
    });
    if (layout.chatJoyOverlap) throw new Error("chat overlaps joystick");
    if (layout.chatPlayersOverlap) throw new Error("chat overlaps Here counter");
    if (layout.chatWidthPct > 28) throw new Error(`chat too wide ${layout.chatWidthPct}%`);
    await page.locator("#game").screenshot({ path: path.join(OUT, name) });
    console.log("PASS", name, layout);
  });
}

(async () => {
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await prep(desk);
  await desk.goto(`${BASE}/?solo=1&v=v22r4`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await enterGame(desk);
  await captureAuthority(desk, 4, "desktop", "razor");
  await captureDuel(desk, "desktop");

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prep(mob);
  await mob.goto(`${BASE}/?solo=1&v=v22r4m`, { waitUntil: "domcontentloaded", timeout: 120000 });
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
