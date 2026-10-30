require("./lib/require-local-capture.js");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outDir = process.env.AUTHORITY_OUT || path.join("/workspace/qa", "authority-v22");
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.dirname(outDir), { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";

async function prep(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (e) {}
  });
}

async function dismissUi(page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (e) {}
    document.getElementById("howToOverlay")?.classList.remove("active");
    document.getElementById("loading")?.style.setProperty("display", "none");
    document.getElementById("charSelect")?.classList.remove("active");
    document.querySelectorAll(".modal.active").forEach(el => el.classList.remove("active"));
    document.getElementById("storyConstructionHud")?.classList.remove("active");
    document.querySelectorAll(".toast").forEach(el => el.classList.remove("show"));
    document.getElementById("storyBubbles")?.replaceChildren?.();
  });
}

async function enter(page) {
  await page.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  const c = page.locator("#charSelectConfirm");
  if (await c.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.evaluate(() => {
      document.querySelector('.char-pick[data-id="cobalt"]')?.click();
      document.getElementById("charSelectConfirm")?.click();
    });
  }
  await page.waitForFunction(() => window.World3D?.isReady?.() && window.StoryEngine?.Authority, { timeout: 120000 });
  await dismissUi(page);
  await page.evaluate(() => {
    typeof setLanguage === "function" && setLanguage("en", true);
    me.onboarding = { step: 6, progress: {}, done: true };
    me.coins = 200;
    me.energy = 100;
    StoryEngine.onOnboardingComplete?.();
    saveMe?.();
    World3D?.resize?.();
  });
  await dismissUi(page);
}

async function prepareScene(page, loc, opts = {}) {
  await dismissUi(page);
  await page.evaluate(id => {
    goLocation(id);
    syncStage3D?.();
  }, loc);
  await page.waitForTimeout(3000);
  await page.evaluate(async ({ skipShowcase }) => {
    document.querySelector(".vignette")?.style.setProperty("opacity", "0.15");
    document.querySelector(".night-fx")?.style.setProperty("opacity", "0.25");
    const storyDlg = document.getElementById("storyDialog");
    if (storyDlg) storyDlg.style.background = "rgba(4, 2, 12, 0.45)";
    World3D?.resize?.();
    syncStage3D?.();
    World3D?.releaseCaptureFrame?.();
    if (!skipShowcase) {
      World3D?.snapScreenshotView?.();
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      World3D?.snapScreenshotView?.();
    }
  }, { skipShowcase: !!opts.skipShowcase });
  await page.waitForTimeout(600);
  await dismissUi(page);
}

async function finishDialogueShot(page, npcId) {
  await page.waitForTimeout(500);
  const frame = await page.evaluate(id => {
    World3D?.releaseCaptureFrame?.();
    World3D?.resize?.();
    const ok = World3D?.engageDialogueFraming?.(id, { live: true });
    if (!ok) return { pass: false, reasons: ["framing_failed"] };
    for (let i = 0; i < 8; i++) World3D?.renderCaptureFrame?.();
    return World3D?.measureDialogueFraming?.(id);
  }, npcId);
  if (!frame?.pass) {
    throw new Error(
      `dialogue framing failed for ${npcId}: ${(frame?.reasons || []).join(",")} player=${JSON.stringify(frame?.player)} npc=${JSON.stringify(frame?.npc)}`
    );
  }
  return frame;
}

async function assertReady(page) {
  const ok = await page.evaluate(() => {
    const how = document.getElementById("howToOverlay");
    if (how?.classList.contains("active")) return "howto_active";
    const dlg = document.getElementById("storyDialog");
    if (!dlg?.classList.contains("active")) return "story_dialog_missing";
    const auth = document.getElementById("authorityStat");
    if (!auth || auth.textContent === "…") return "authority_hud_missing";
    return "ok";
  });
  if (ok !== "ok") throw new Error("pre-snap check failed: " + ok);
}

async function sampleMeanAt(buf, width, height, cx, cy, radius = 3) {
  let sum = 0;
  let n = 0;
  const x0 = Math.max(0, Math.floor(cx) - radius);
  const x1 = Math.min(width - 1, Math.floor(cx) + radius);
  const y0 = Math.max(0, Math.floor(cy) - radius);
  const y1 = Math.min(height - 1, Math.floor(cy) + radius);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * width + x) * 3;
      sum += (buf[i] + buf[i + 1] + buf[i + 2]) / 3;
      n += 1;
    }
  }
  return n ? sum / n : 0;
}

async function validateAuthorityPng(filePath, frame, npcId = "") {
  const meta = await sharp(filePath).metadata();
  const { data, info } = await sharp(filePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const topH = Math.floor(h * 0.55);
  let topSum = 0;
  for (let y = 0; y < topH; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      topSum += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }
  }
  const topMean = topSum / (w * topH);
  const fullHud = h >= 780 || w >= 1200;
  if (topMean < 18) {
    throw new Error(`${path.basename(filePath)} top55% too dark (mean ${topMean.toFixed(1)} < 18)`);
  }
  if (topMean > 195) {
    throw new Error(`${path.basename(filePath)} top55% overexposed (mean ${topMean.toFixed(1)} > 195)`);
  }
  const heads = [frame?.player, frame?.npc].filter(Boolean);
  if (heads.length < 2) throw new Error(`${path.basename(filePath)} missing head projections`);
  if (frame?.pass === false) {
    throw new Error(`${path.basename(filePath)} measureDialogueFraming failed: ${(frame.reasons || []).join(",")}`);
  }
  const minHeadPx = h * 0.06;
  if ((frame.headSpanP ?? 0) < minHeadPx || (frame.headSpanN ?? 0) < minHeadPx) {
    throw new Error(
      `${path.basename(filePath)} head too small (P=${(frame.headSpanP ?? 0).toFixed(0)} N=${(frame.headSpanN ?? 0).toFixed(0)} need ${minHeadPx.toFixed(0)})`
    );
  }
  const headPxSep = Math.abs((frame.player?.px ?? 0) - (frame.npc?.px ?? 0));
  const isMobileShot = /mobile-/i.test(path.basename(filePath));
  if (!isMobileShot && !fullHud) {
    const minSep = npcId === "razor" ? 52 : 72;
    if (headPxSep < minSep) {
      throw new Error(`${path.basename(filePath)} heads not separated in frame (px sep ${headPxSep.toFixed(0)})`);
    }
  }
  if (!fullHud) {
    const bgRef = await sampleMeanAt(data, w, h, 24, Math.floor(h * 0.12), 5);
    for (const [tag, pt] of [["player", frame.player], ["npc", frame.npc]]) {
      const m = await sampleMeanAt(data, w, h, pt.px, pt.py, 4);
      if (m < 22) {
        throw new Error(`${path.basename(filePath)} ${tag} head too dark (mean ${m.toFixed(1)} at ${pt.px?.toFixed(0)},${pt.py?.toFixed(0)})`);
      }
      if (bgRef > 35 && Math.abs(m - bgRef) < 6) {
        throw new Error(
          `${path.basename(filePath)} ${tag} head sample matches flat background (${m.toFixed(1)} vs ref ${bgRef.toFixed(1)})`
        );
      }
    }
  }
  console.log(
    `verified ${path.basename(filePath)} ${w}x${h} top55=${topMean.toFixed(1)} headP=${(await sampleMeanAt(data, w, h, frame.player.px, frame.player.py, 4)).toFixed(1)} headN=${(await sampleMeanAt(data, w, h, frame.npc.px, frame.npc.py, 4)).toFixed(1)}`
  );
}

async function snapDialoguePng(page, name, npcId, frame) {
  await assertReady(page);
  await dismissUi(page);
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => World3D?.renderCaptureFrame?.());
    await page.waitForTimeout(40);
  }
  if (!frame) {
    frame = await page.evaluate(id => {
      for (let i = 0; i < 4; i++) World3D?.renderCaptureFrame?.();
      return World3D?.measureDialogueFraming?.(id);
    }, npcId);
  }
  const p = path.join(outDir, name);
  const game = page.locator("#game");
  await game.screenshot({ path: p, type: "png" });
  await validateAuthorityPng(p, frame, npcId);
  await validateDialogPanelPng(p);
  return p;
}

async function validateDialogPanelPng(filePath) {
  const { data, info } = await sharp(filePath).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const y0 = Math.floor(h * 0.58);
  let sum = 0;
  let n = 0;
  for (let y = y0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
      n++;
    }
  }
  const mean = sum / n;
  if (mean < 35) {
    throw new Error(`${path.basename(filePath)} dialog panel region too dark (bottom42 mean ${mean.toFixed(1)})`);
  }
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
      st.authority = 88;
    }
    if (s === 1) st.authority = 8;
    StoryEngine.Authority.syncGangRank(me);
    StoryEngine.Authority.renderAuthorityHud(me);
    StoryEngine.renderObjectivePanel?.();
  }, stage);
}

async function captureStage(page, stage, prefix) {
  let npcId = null;
  let frame = null;
  await setupStage(page, stage);
  if (stage === 1) {
    await prepareScene(page, "street", { skipShowcase: true });
    await page.evaluate(() => {
      const st = StoryEngine.ensureStoryState(me);
      st.auth.s1Done = false;
      StoryEngine.dismissAllStoryUi?.();
      StoryEngine.Authority.openStage1Dialog({ force: true });
    });
    frame = await finishDialogueShot(page, "mohawk");
    npcId = "mohawk";
  } else if (stage === 2) {
    await prepareScene(page, "cemetery", { skipShowcase: true });
    await page.evaluate(() => {
      StoryEngine.dismissAllStoryUi?.();
      StoryEngine.openNoRatChoice?.();
    });
    frame = await finishDialogueShot(page, "gravedigger");
    npcId = "gravedigger";
  } else if (stage === 3) {
    await prepareScene(page, "street", { skipShowcase: true });
    await page.evaluate(() => {
      StoryEngine.dismissAllStoryUi?.();
      StoryEngine.openTrialsChooserDialog?.();
    });
    frame = await finishDialogueShot(page, "mohawk");
    npcId = "mohawk";
  } else if (stage === 4) {
    await prepareScene(page, "street", { skipShowcase: true });
    await page.evaluate(() => {
      const st = StoryEngine.ensureStoryState(me);
      st.auth.stage = 4;
      st.auth.trials = { cemetery: true, roof_parkour: true, duel_mohawk: true };
      st.authority = 88;
      StoryEngine.Authority.syncGangRank(me);
      StoryEngine.dismissAllStoryUi?.();
      StoryEngine.Authority.runInitiationCeremony({ force: true });
    });
    frame = await finishDialogueShot(page, "razor");
    npcId = "razor";
  }
  await page.waitForTimeout(150);
  await snapDialoguePng(page, `${prefix}-stage${stage}.png`, npcId, frame);
  await page.evaluate(() => {
    document.getElementById("storyDialog")?.classList.remove("active");
    document.getElementById("storyDialog")?.classList.remove("story-dialog-cinematic");
    World3D?.releaseCaptureFrame?.();
  });
}

(async () => {
  const bust = `auth-cap-${Date.now()}`;
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await prep(desk);
  await desk.goto(`${base}/?dev=1&solo=1&v=${bust}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await enter(desk);

  if (!process.env.AUTH_MOBILE_ONLY && !process.env.AUTH_SKIP_DESKTOP) {
    for (let s = 1; s <= 4; s++) await captureStage(desk, s, "desktop");

    await prepareScene(desk, "street");
  await desk.evaluate(() => {
    const st = StoryEngine.ensureStoryState(me);
    st.flags.joined_gang = true;
    st.gang_rank = "gang_member";
    st.authority = 100;
    st.chapter = 2;
    st.auth.ch2Done = false;
    me.authority = 100;
    StoryEngine.Authority.renderAuthorityHud(me);
    StoryEngine.Authority.maybeChapter2Bullying();
  });
  await desk.waitForTimeout(700);
  const ch2 = path.join(outDir, "desktop-ch2-antibullying.png");
  await desk.screenshot({ path: ch2 });

  await prepareScene(desk, "street", { skipShowcase: true });
  await desk.evaluate(() => {
    const st = StoryEngine.ensureStoryState(me);
    st.auth.stage = 4;
    st.auth.trials = { cemetery: true, roof_parkour: true, duel_mohawk: true };
    st.authority = 92;
    st.flags.joined_gang = false;
    StoryEngine.Authority.syncGangRank(me);
    StoryEngine.dismissAllStoryUi?.();
    StoryEngine.Authority.runInitiationCeremony({ force: true });
  });
  const razorFrame = await finishDialogueShot(desk, "razor");
  await snapDialoguePng(desk, "desktop-razor-initiation-patch.png", "razor", razorFrame);
  }

  if (process.env.AUTH_DESKTOP_ONLY) {
    await browser.close();
    process.exit(0);
  }

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prep(mob);
  await mob.goto(`${base}/?dev=1&solo=1&v=${bust}-m`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await enter(mob);
  if (!process.env.AUTH_DESKTOP_ONLY) {
    for (let s = 1; s <= 4; s++) await captureStage(mob, s, "mobile");
  }

  await browser.close();
  const files = fs.readdirSync(outDir).filter(f => f.endsWith(".png"));
  console.log("total PNGs", files.length, files.sort().join(", "));
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
