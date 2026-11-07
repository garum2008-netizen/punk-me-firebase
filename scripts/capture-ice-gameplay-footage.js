#!/usr/bin/env node
/**
 * ICE gameplay source: real Life Ch1 playthrough + verification frames + scene log.
 * Emulator-only (FIREBASE_EMULATOR=1). No prod Firebase.
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawn, spawnSync } = require("child_process");
const { isProdFirebaseRequest } = require("./firebase-prod-guard");
const {
  assertFirebaseEmulatorTestEnv,
  firebaseEmulatorQueryString,
  installProdFirebaseRouteBlock,
} = require("./firebase-test-emulator-guard");

assertFirebaseEmulatorTestEnv();

const ROOT = path.join(__dirname, "..");
const OUT = process.env.PUNK_ICE_OUT || path.join("/opt/cursor/artifacts", "ice-ch1-footage");
const PORT = Number(process.env.PUNK_PORT || "3462");
const SHA = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();

const scenes = [];
let sceneT0 = 0;

function cetTimestamp(date = new Date()) {
  return (
    date.toLocaleString("en-GB", {
      timeZone: "Europe/Copenhagen",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }) + " Europe/Copenhagen (CET)"
  );
}

function logScene(id, goal, obstacle, action, result, note = "") {
  const t = Date.now() - sceneT0;
  scenes.push({ tMs: t, tSec: +(t / 1000).toFixed(2), id, goal, obstacle, action, result, note });
  console.log(`[scene +${(t / 1000).toFixed(1)}s] ${id}: ${result}`);
}

function ffprobeMeta(filePath) {
  try {
    const r = spawnSync(
      "ffprobe",
      [
        "-v",
        "quiet",
        "-print_format",
        "json",
        "-show_format",
        "-show_streams",
        filePath
      ],
      { encoding: "utf8" }
    );
    if (r.status !== 0) return { error: r.stderr || "ffprobe failed", path: filePath };
    const j = JSON.parse(r.stdout);
    const v = (j.streams || []).find(s => s.codec_type === "video");
    const a = (j.streams || []).find(s => s.codec_type === "audio");
    return {
      path: filePath,
      format: j.format?.format_name,
      durationSec: j.format?.duration ? +j.format.duration : null,
      sizeBytes: fs.existsSync(filePath) ? fs.statSync(filePath).size : null,
      video: v
        ? {
            codec: v.codec_name,
            width: v.width,
            height: v.height,
            fps: v.avg_frame_rate,
            pixFmt: v.pix_fmt
          }
        : null,
      audio: a
        ? {
            codec: a.codec_name,
            channels: a.channels,
            sampleRate: a.sample_rate
          }
        : null,
      audioStatus: a ? "HAS_AUDIO_TRACK" : "SILENT_NO_AUDIO_TRACK"
    };
  } catch (e) {
    return { path: filePath, error: String(e.message || e) };
  }
}

function serveRoot() {
  return new Promise(resolve => {
    const child = spawn("npx", ["--yes", "serve", "-l", String(PORT), "."], {
      cwd: ROOT,
      stdio: "ignore",
      detached: true
    });
    const deadline = Date.now() + 45000;
    const poll = () => {
      http.get(`http://127.0.0.1:${PORT}/`, res => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve(child);
        else if (Date.now() < deadline) setTimeout(poll, 400);
        else throw new Error("serve not ready");
      }).on("error", () => {
        if (Date.now() < deadline) setTimeout(poll, 400);
        else throw new Error("serve not ready");
      });
    };
    setTimeout(poll, 500);
  });
}

async function dismissHowTo(page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (_) {}
  });
  const close = page.locator(".howto-close");
  if (await close.isVisible({ timeout: 2000 }).catch(() => false)) await close.click();
}

async function walkNear(page, tx, tz, radius = 2.6, maxMs = 90000) {
  await dismissHowTo(page);
  await page.evaluate(
    ({ tx, tz, radius }) => {
      const p = window.World3D?.getPlayerWorldPosition?.();
      const d = p ? Math.hypot(tx - p.x, tz - p.z) : 999;
      if (d > radius + 1 && window.World3D?.setPlayerWorldPosition) {
        window.World3D.setPlayerWorldPosition(0, -1.2);
      }
    },
    { tx, tz, radius }
  );
  await page.waitForTimeout(400);
  const canvas = page.locator("#stage3d");
  await canvas.click({ position: { x: 195, y: 300 } });
  const start = Date.now();
  let stall = 0;
  let lastDist = Infinity;
  while (Date.now() - start < maxMs) {
    const pos = await page.evaluate(() => window.World3D?.getPlayerWorldPosition?.());
    if (!pos) throw new Error("getPlayerWorldPosition missing");
    const dist = Math.hypot(tx - pos.x, tz - pos.z);
    if (dist <= radius) return { ok: true };
    if (dist >= lastDist - 0.02) stall += 1;
    else stall = 0;
    lastDist = dist;
    await page.evaluate(({ tx, tz }) => window.World3D?.faceWorldTargetForE2e?.(tx, tz), { tx, tz });
    if (stall > 10) {
      for (const key of ["w", "a", "s", "d"]) {
        await page.keyboard.down(key);
        await page.waitForTimeout(180);
        await page.keyboard.up(key);
      }
      stall = 0;
    }
    await page.keyboard.down("Shift");
    await page.keyboard.down("w");
    await page.waitForTimeout(380);
    await page.keyboard.up("w");
    await page.keyboard.up("Shift");
    await page.waitForTimeout(50);
  }
  const last = await page.evaluate(() => window.World3D?.getPlayerWorldPosition?.());
  return { ok: false, last };
}

async function walkNearOrRetry(page, tx, tz, radius, label) {
  let r = await walkNear(page, tx, tz, radius);
  if (r && r.ok === false) {
    logScene(
      `${label}_retry`,
      `Reach (${tx},${tz})`,
      `Stuck at ${JSON.stringify(r.last)}`,
      "lifeCh1E2e setPlayerWorldPosition(0,-1.2) then WASD retry",
      "Recovery attempt (QA nav aid; not a story event)",
      "Blocker: room locomotion edge case"
    );
    await page.evaluate(() => window.World3D?.setPlayerWorldPosition?.(0, -1.2));
    await page.waitForTimeout(500);
    r = await walkNear(page, tx, tz, radius, 60000);
  }
  if (r && r.ok === false) {
    logScene(label + "_fail", "Reach interact", "walkNear timeout", "WASD", JSON.stringify(r.last), "BLOCKER");
    return false;
  }
  return true;
}

async function bootAngelinaSlice(page, baseUrl) {
  const qs = firebaseEmulatorQueryString();
  await page.goto(`${baseUrl}/?solo=1${qs}&lifeCh1Slice=1&lifeCh1Local=1&lifeCh1E2e=1&v=ice-footage`, {
    waitUntil: "domcontentloaded",
    timeout: 120000
  });
  await page.waitForSelector("#charSelect.active", { timeout: 120000 });
  await page.waitForSelector("#charSelectConfirm", { timeout: 120000 });
  const hasAngelina = await page.locator('[data-testid="char-select-angelina"]').isVisible().catch(() => false);
  if (!hasAngelina) throw new Error("Angelina char select not shown — not slice entry");
  await page.click(".char-portrait-pick >> nth=0");
  await page.click("#charSelectConfirm");
  await page.waitForFunction(
    () => window.__playerLoaded === true && window.me?.characterId === "life_ch1_proxy",
    undefined,
    { timeout: 120000 }
  );
  await dismissHowTo(page);
  await page.evaluate(async () => {
    window.me.onboarding = { step: 6, progress: {}, done: true };
    window.LifeCh1Slice?.ensureLifeCh1?.(window.me);
    await window.LifeCh1Slice?.tryStartAfterOnboarding?.();
    window.saveMe?.();
  });
  await page.waitForFunction(() => window.World3D?.isReady?.(), undefined, { timeout: 60000 });
  await page.evaluate(() => {
    if (typeof goLocation === "function") goLocation("room");
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => window.LifeCh1Slice?.renderObjectivePanel?.());
  await page.waitForSelector('[data-testid="life-ch1-quest-panel"]', { timeout: 15000 });
}

async function verifyGraveyardAndCv2(page, tag) {
  await page.evaluate(() => goLocation("cemetery"));
  await page.waitForFunction(() => window.me?.location === "cemetery", undefined, { timeout: 20000 });
  await page.waitForTimeout(2200);
  const snap = await page.evaluate(() => {
    const rs = window.World3D?.getNpcMeshVertexSnapshot?.();
    const pl = window.World3D?.getPlayerLifeCh1SkinRenderState?.();
    return {
      location: window.me?.location,
      skin: window.me?.lifeCh1?.angelinaSkin,
      playerCutout: pl,
      npcs: rs?.npcs || null,
      characterId: window.me?.characterId
    };
  });
  const gravePath = path.join(OUT, `verify-${tag}-cemetery-graveyard-frame.png`);
  await page.screenshot({ path: gravePath, fullPage: false });
  fs.writeFileSync(path.join(OUT, `verify-${tag}-cemetery-snapshot.json`), JSON.stringify(snap, null, 2));

  await page.evaluate(() => goLocation("room"));
  await page.waitForFunction(() => window.me?.location === "room", undefined, { timeout: 20000 });
  await page.evaluate(() => {
    const st = window.LifeCh1Slice?.ensureLifeCh1?.(window.me);
    if (st) st.stepIndex = Math.max(st.stepIndex || 0, 1);
    window.LifeCh1Slice?.openWardrobePanel?.();
  });
  const wardrobeOpen = await page
    .waitForSelector("#lifeCh1Wardrobe:not([hidden])", { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  await dismissHowTo(page);
  if (wardrobeOpen) {
    await page.click('[data-testid="life-ch1-skin-C"]');
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(OUT, `verify-${tag}-cv2-wardrobe-ui.png`) });
  }
  await page.evaluate(() => {
    window.LifeCh1Slice?.closeWardrobePanel?.();
    window.LifeCh1Slice?.setAngelinaSkin?.("C");
    window.LifeCh1Slice?.syncPlayerLifeCh1Skin?.();
  });
  await page.waitForTimeout(2000);
  const cv2State = await page.evaluate(() => window.World3D?.getPlayerLifeCh1SkinRenderState?.());
  fs.writeFileSync(path.join(OUT, `verify-${tag}-cv2-world-state.json`), JSON.stringify(cv2State, null, 2));
  await page.screenshot({ path: path.join(OUT, `verify-${tag}-cv2-world-room.png`), fullPage: false });
  return { gravePath, snap, cv2State };
}

async function playChapter1Desktop(page) {
  let completed = true;
  logScene(
    "intro",
    "Start Life Ch1 as Angelina",
    "Onboarding gate",
    "Confirm Angelina + start slice",
    "Quest panel visible in room",
    "Test-only onboarding.done shortcut"
  );

  for (let i = 0; i < 8; i++) {
    await page.keyboard.down("w");
    await page.waitForTimeout(280);
    await page.keyboard.up("w");
    if ((await page.evaluate(() => window.me?.lifeCh1?.stepIndex ?? 0)) >= 1) break;
  }
  logScene(
    "move",
    "Complete move step",
    "Need displacement in room",
    "WASD walk",
    `stepIndex=${await page.evaluate(() => window.me?.lifeCh1?.stepIndex)}`,
    ""
  );

  const postMove = await page.evaluate(() => {
    const p = window.World3D?.getPlayerWorldPosition?.();
    const ok = window.World3D?.setPlayerWorldPosition?.(0, -1.2);
    return { before: p, ok, after: window.World3D?.getPlayerWorldPosition?.() };
  });
  logScene(
    "post_move_nav_sync",
    "Stabilize room position before mirror",
    "Move step can wedge player at room edge",
    "lifeCh1E2e setPlayerWorldPosition(0,-1.2)",
    JSON.stringify(postMove),
    "Not story content; locomotion recovery"
  );

  if (!(await walkNearOrRetry(page, -3.2, 2.5, 2.6, "mirror"))) completed = false;
  if (!completed) return completed;
  logScene("mirror", "Reach wardrobe", "Distance to mirror", "Walk to interact", "At mirror beacon", "");

  await page.keyboard.press("e");
  await page.waitForSelector("#lifeCh1Wardrobe:not([hidden])", { timeout: 12000 });
  await page.click('[data-testid="life-ch1-skin-B"]');
  await page.click(".life-ch1-outfit-pick >> nth=0");
  await page.click("#lifeCh1WardrobeConfirm");
  await page.waitForTimeout(1200);
  logScene(
    "outfit",
    "Pick look B + calm outfit",
    "Wardrobe UI",
    "Select skin B, confirm",
    `skin=${await page.evaluate(() => window.me?.lifeCh1?.angelinaSkin)} step=${await page.evaluate(() => window.me?.lifeCh1?.stepIndex)}`,
    ""
  );

  if (!(await walkNearOrRetry(page, 2.5, -1.8, 2.75, "trust"))) completed = false;
  if (!completed) return completed;
  await page.keyboard.press("e");
  await page.waitForSelector(".life-ch1-choice", { timeout: 15000 });
  await page.click(".life-ch1-choice >> nth=1");
  await page.waitForTimeout(1000);
  logScene(
    "trust",
    "Decide on note",
    "Branching dialogue",
    "Choose 'tell Mira later'",
    `flag mystery_open step=${await page.evaluate(() => window.me?.lifeCh1?.stepIndex)}`,
    ""
  );

  if (!(await walkNearOrRetry(page, 2.5, -1.8, 2.75, "reflect"))) completed = false;
  if (!completed) return completed;
  await page.keyboard.press("e");
  await page.waitForSelector("#lifeCh1DlgOk", { timeout: 15000 });
  await page.click("#lifeCh1DlgOk");
  await page.waitForFunction(() => window.me?.lifeCh1?.completed === true, undefined, { timeout: 20000 });
  logScene(
    "reflect",
    "Close chapter slice",
    "Reflect dialogue",
    "OK to complete",
    "lifeCh1.completed=true",
    ""
  );

  await page.waitForTimeout(2500);
  for (const loc of ["room", "street", "cemetery", "room"]) {
    await page.evaluate(id => goLocation(id), loc);
    await page.waitForTimeout(3500);
    for (let k = 0; k < 4; k++) {
      await page.keyboard.down("w");
      await page.waitForTimeout(400);
      await page.keyboard.up("w");
    }
    logScene(
      `visit_${loc}`,
      `Visit ${loc} after chapter`,
      "Navigation",
      "goLocation + walk",
      `location=${loc}`,
      loc === "cemetery" ? "Check graveyard visuals for ICE" : ""
    );
  }
  return completed;
}

async function savePlaywrightVideo(page, outName) {
  const v = page.video();
  if (!v) return null;
  const dest = path.join(OUT, outName);
  await v.saveAs(dest);
  return dest;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let prodHits = 0;
  const serveChild = await serveRoot();
  const baseUrl = `http://127.0.0.1:${PORT}`;
  const browser = await chromium.launch();

  const recordings = [];

  try {
    // --- Verification screenshots (desktop) ---
    const vctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    await vctx.addInitScript(() => {
      window.__PUNK_LIFE_CH1_LOCAL__ = true;
    });
    const vpage = await vctx.newPage();
    await installProdFirebaseRouteBlock(vpage);
    await vpage.route("**/*", route => {
      if (isProdFirebaseRequest(route.request().url())) {
        prodHits++;
        return route.abort();
      }
      return route.continue();
    });
    await bootAngelinaSlice(vpage, baseUrl);
    await dismissHowTo(vpage);
    await vpage.evaluate(() => goLocation("room"));
    await vpage.waitForTimeout(2000);
    await vpage.screenshot({ path: path.join(OUT, "contact-sheet-room-cobalt-desktop.png") });
    let verify = null;
    try {
      await dismissHowTo(vpage);
      verify = await verifyGraveyardAndCv2(vpage, "desktop1280");
    } catch (e) {
      console.warn("visual verification pass failed (continuing uncut session):", e.message || e);
      verify = { gravePath: null, snap: null, cv2State: null, error: String(e.message || e) };
    }
    await vctx.close();

    const recordingStartUtc = new Date();
    const recordingStartCet = cetTimestamp(recordingStartUtc);

    // --- ONE original uncut gameplay session (390×844) ---
    const playCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      recordVideo: { dir: OUT, size: { width: 390, height: 844 } }
    });
    await playCtx.addInitScript(() => {
      window.__PUNK_LIFE_CH1_LOCAL__ = true;
    });
    const playPage = await playCtx.newPage();
    await installProdFirebaseRouteBlock(playPage);
    await playCtx.route("**/*", route => {
      if (isProdFirebaseRequest(route.request().url())) {
        prodHits++;
        return route.abort();
      }
      return route.continue();
    });
    sceneT0 = Date.now();
    scenes.length = 0;
    await bootAngelinaSlice(playPage, baseUrl);
    const ch1Complete = await playChapter1Desktop(playPage);
    const desktopSceneLog = [...scenes];
    const playVidTmp = await playPage.video()?.path();
    await playPage.close();
    await playCtx.close();
    const recordingEndUtc = new Date();
    const recordingEndCet = cetTimestamp(recordingEndUtc);
    const uncutFinal = path.join(OUT, "ice-ch1-ORIGINAL-UNCUT-session-390x844.webm");
    if (playVidTmp && fs.existsSync(playVidTmp)) {
      fs.copyFileSync(playVidTmp, uncutFinal);
      try {
        fs.unlinkSync(playVidTmp);
      } catch (_) {}
    }

    recordings.push({
      role: "original_uncut_session",
      note: "Single continuous Playwright session; excerpts for Shorts must be cut by ICE from this file only",
      recordingStartCet,
      recordingEndCet,
      recordingStartUtc: recordingStartUtc.toISOString(),
      recordingEndUtc: recordingEndUtc.toISOString(),
      chapter1CompletedInSession: ch1Complete,
      file: uncutFinal,
      ...ffprobeMeta(uncutFinal)
    });

    const audioNote =
      recordings.every(r => r.audioStatus === "SILENT_NO_AUDIO_TRACK")
        ? "Playwright/Chromium headless capture: NO_GAME_AUDIO_CAPTURED (SILENT). Game may use WebAudio/oscillators in-browser; not routed to video file. No synthetic soundtrack added."
        : "See per-file audioStatus";

    const report = {
      repoSha: SHA,
      branch: "cursor/vertical-slice-ch1-d81d",
      capturedAt: new Date().toISOString(),
      emulator: {
        FIREBASE_EMULATOR: process.env.FIREBASE_EMULATOR,
        FIREBASE_DATABASE_EMULATOR_HOST: process.env.FIREBASE_DATABASE_EMULATOR_HOST,
        FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST
      },
      prodFirebaseBlocks: prodHits,
      audioCapturePolicy: audioNote,
      recordings,
      sceneLogDesktopEpisode: desktopSceneLog,
      visualVerification: {
        cemeteryScreenshot: verify.gravePath,
        cemeteryRuntime: verify.snap,
        cv2WorldState: verify.cv2State,
        manualReviewRequired: [
          "Inspect verify-*-cemetery-graveyard-frame.png for white placeholder cube (NOT resolved by code inspection alone)",
          "Inspect verify-*-cv2-world-room.png for white/matte halo behind C-v2 cutout (compare to halo test artifacts)"
        ]
      },
      publishReadiness: "REVIEW_ONLY — not publish-ready; halo release gate may still fail",
      recordingWindowCet: { start: recordingStartCet, end: recordingEndCet },
      iceEditorialNote:
        "Deliverable is ORIGINAL UNCUT only; no pre-cut Shorts bundled. Usable editorial length = ffprobe duration; no idle padding added."
    };

    fs.writeFileSync(path.join(OUT, "ice-footage-metadata.json"), JSON.stringify(report, null, 2));
    fs.writeFileSync(
      path.join(OUT, "ice-scene-map.md"),
      [
        "# ICE scene map (desktop episode source)",
        "",
        `SHA: \`${SHA}\``,
        "",
        "| t (s) | Scene | Goal | Obstacle | Action | Result |",
        "|-------|-------|------|----------|--------|--------|",
        ...desktopSceneLog.map(
          s => `| ${s.tSec} | ${s.id} | ${s.goal} | ${s.obstacle} | ${s.action} | ${s.result} |`
        ),
        "",
        "## Audio",
        "",
        audioNote,
        "",
        "## Visual verification (screenshots)",
        "",
        "- Cemetery/graveyard frame: `" + verify.gravePath + "`",
        "- C-v2 world room: `verify-desktop1280-cv2-world-room.png`",
        ""
      ].join("\n")
    );

    console.log("ICE capture done:", OUT);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await browser.close();
    try {
      process.kill(-serveChild.pid, "SIGTERM");
    } catch (_) {}
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
