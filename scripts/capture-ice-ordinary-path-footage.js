#!/usr/bin/env node
/**
 * Ordinary local-save entry: full UI onboarding + Life Ch1 — genuine inputs only.
 * No evaluate(goLocation), no onboarding.done injection, no lifeCh1Slice/lifeCh1E2e URL flags.
 * State reads via page.evaluate are allowed; progression via keyboard/mouse only.
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
const PORT = Number(process.env.PUNK_PORT || "3463");
const SHA = spawnSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).stdout.trim();

let t0 = 0;
const inputLog = [];
const scenes = [];

function logInput(type, detail) {
  const row = { tMs: Date.now() - t0, type, detail };
  inputLog.push(row);
  return row;
}

function logScene(id, note) {
  scenes.push({ tSec: +((Date.now() - t0) / 1000).toFixed(2), id, note });
  console.log(`[scene +${scenes[scenes.length - 1].tSec}s] ${id}: ${note || ""}`);
}

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
      hour12: false,
    }) + " Europe/Copenhagen (CET)"
  );
}

function ffprobeMeta(filePath) {
  try {
    const r = spawnSync(
      "ffprobe",
      ["-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", filePath],
      { encoding: "utf8" }
    );
    if (r.status !== 0) return { error: r.stderr || "ffprobe failed", path: filePath };
    const j = JSON.parse(r.stdout);
    const v = (j.streams || []).find(s => s.codec_type === "video");
    const a = (j.streams || []).find(s => s.codec_type === "audio");
    return {
      path: filePath,
      durationSec: j.format?.duration ? +j.format.duration : null,
      sizeBytes: fs.existsSync(filePath) ? fs.statSync(filePath).size : null,
      video: v ? { codec: v.codec_name, width: v.width, height: v.height, fps: v.avg_frame_rate } : null,
      audio: a ? { codec: a.codec_name, channels: a.channels } : null,
      audioStatus: a ? "HAS_AUDIO_TRACK" : "SILENT_NO_AUDIO_TRACK",
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
      detached: true,
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

async function readState(page) {
  return page.evaluate(() => ({
    onboardingStep: window.me?.onboarding?.step ?? -1,
    onboardingDone: !!window.me?.onboarding?.done,
    location: window.me?.location,
    lifeCh1: window.me?.lifeCh1
      ? {
          active: window.me.lifeCh1.active,
          stepIndex: window.me.lifeCh1.stepIndex,
          completed: window.me.lifeCh1.completed,
        }
      : null,
  }));
}

async function dismissHowTo(page) {
  logInput("keyboard", "howto_seen via close if visible");
  const close = page.locator(".howto-close");
  if (await close.isVisible({ timeout: 2500 }).catch(() => false)) {
    await close.click();
  }
}

async function waitReadableDialog(page, minMs = 2400) {
  const len = await page
    .locator(".life-ch1-dialog-text p, #storyDialog .story-dialog-body p")
    .first()
    .textContent()
    .then(t => (t || "").trim().length)
    .catch(() => 48);
  const ms = Math.min(9000, Math.max(minMs, Math.round(len * 42)));
  logInput("wait_read", `dialog ${ms}ms len=${len}`);
  await page.waitForTimeout(ms);
}

async function focusStage(page) {
  logInput("click", "#stage3d focus");
  const wardrobeOpen = await page.locator("#lifeCh1Wardrobe:not([hidden])").isVisible().catch(() => false);
  if (wardrobeOpen) {
    logInput("click", "lifeCh1WardrobeClose");
    await page.click("#lifeCh1WardrobeClose").catch(() => {});
  }
  await page.locator("#stage3d").click({ position: { x: 195, y: 300 }, force: true });
}

async function walkKeys(page, bursts = 6, keyMs = 380) {
  await page.waitForFunction(() => document.body.classList.contains("mode-world3d"), undefined, {
    timeout: 120000,
  });
  await focusStage(page);
  const keys = ["w", "w", "a", "w", "d", "w"];
  for (let i = 0; i < bursts; i++) {
    const k = keys[i % keys.length];
    logInput("keyboard", `Shift+${k.toUpperCase()} walk burst`);
    await page.keyboard.down("Shift");
    await page.keyboard.down(k);
    await page.waitForTimeout(keyMs);
    await page.keyboard.up(k);
    await page.keyboard.up("Shift");
    await page.waitForTimeout(100);
  }
}

async function uiOpenMapTravel(page, locId) {
  logInput("click", `mapModal travel → ${locId}`);
  await page.click('#panelBottom button[onclick*="mapModal"]', { force: true });
  await page.waitForSelector("#mapModal.active", { timeout: 15000 });
  const goBtn = page.locator(`#mapGrid button[onclick*="goLocation('${locId}')"]`).first();
  await goBtn.click({ force: true });
  await page.waitForFunction(id => window.me?.location === id, locId, { timeout: 45000 });
}

async function pickAngelina(page) {
  await page.waitForSelector("#charSelect.active", { timeout: 120000 });
  logInput("click", "char select Angelina");
  await page.waitForSelector('[data-testid="char-select-angelina"]', { timeout: 120000 });
  await page.waitForSelector("#charSelectPortraits .char-portrait-pick", { timeout: 120000 });
  await page.click("#charSelectPortraits .char-portrait-pick >> nth=0");
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
}

async function completeOnboarding(page) {
  await page.waitForFunction(
    () => window.me?.onboarding && typeof window.me.onboarding.step === "number",
    undefined,
    { timeout: 120000 }
  );
  await page.waitForFunction(() => document.body.classList.contains("mode-world3d"), undefined, { timeout: 120000 });
  await dismissHowTo(page);
  await focusStage(page);
  logScene("onboarding_start", "fresh local save, onboarding step 0");
  const deadline = Date.now() + 480000;
  let lastLoggedStep = -2;
  while (Date.now() < deadline) {
    const st = await readState(page);
    if (st.onboardingDone) {
      logScene("onboarding_done", "UI onboarding complete");
      return true;
    }
    let step = st.onboardingStep;
    if (step < 0) step = 0;
    if (step !== lastLoggedStep) {
      logScene(`onboarding_step_${step}`, `progress step ${step}`);
      lastLoggedStep = step;
    }
    const stepBefore = step;
    if (step === 0) {
      await walkKeys(page, 28, 420);
      await page.waitForFunction(() => (window.me?.onboarding?.step || 0) >= 1, undefined, { timeout: 30000 }).catch(
        () => {}
      );
    } else if (step === 1) {
      if (st.location !== "street") await uiOpenMapTravel(page, "street");
      await page.waitForFunction(() => (window.me?.onboarding?.step || 0) > 1 || window.me?.onboarding?.done, undefined, {
        timeout: 45000,
      });
    } else if (step === 2) {
      if (st.location !== "street") await uiOpenMapTravel(page, "street");
      logInput("click", "gang → razor talk");
      await page.click('#panelBottom button[onclick*="gangModal"]', { force: true });
      await page.waitForSelector("#gangModal.active");
      await page.click('.npc-row[data-npc="razor"]');
      await page.waitForTimeout(600);
      const storyDlg = page.locator("#storyDialog:not([hidden]), .story-dialog-overlay.active");
      if (await storyDlg.isVisible().catch(() => false)) {
        logInput("click", "dismiss story razor intro");
        for (let i = 0; i < 8; i++) {
          const ok = page.locator('#storyDialog button, .story-dialog-choices button, [data-testid="story-dialog-ok"]');
          if (await ok.first().isVisible().catch(() => false)) {
            await ok.first().click({ force: true });
            await page.waitForTimeout(500);
          } else break;
        }
        await page.keyboard.press("Escape").catch(() => {});
      } else {
        await page.keyboard.press("Escape").catch(() => {});
        await page.click("#gangModal .close").catch(() => {});
      }
    } else if (step === 3) {
      if (st.location !== "cemetery") await uiOpenMapTravel(page, "cemetery");
      await page.waitForFunction(() => (window.me?.onboarding?.step || 0) > 3 || window.me?.onboarding?.done, undefined, {
        timeout: 45000,
      });
    } else if (step === 4) {
      if (st.location !== "street") await uiOpenMapTravel(page, "street");
      logInput("click", "gang → razor fight");
      await page.click('#panelBottom button[onclick*="gangModal"]', { force: true });
      await page.waitForSelector("#gangModal.active");
      await page.click('.npc-row[data-npc="razor"]');
      await page.click('button[onclick*="startNpcFight"]');
      await page.waitForSelector("#fightOverlay.active", { timeout: 15000 });
      for (let i = 0; i < 24; i++) {
        logInput("click", "fightAttack chain");
        await page.click('button[onclick*="fightAttack"]', { force: true }).catch(() => {});
        await page.waitForTimeout(280);
        if (!(await page.locator("#fightOverlay.active").isVisible().catch(() => false))) break;
      }
    } else if (step === 5) {
      if (st.location !== "room") await uiOpenMapTravel(page, "room");
      logInput("click", "shop buy");
      await page.click('#panelBottom button[onclick*="shopModal"]', { force: true });
      await page.waitForSelector("#shopModal.active");
      const buy = page.locator('#shopModal button[onclick*="buyItem"]').first();
      await buy.click({ force: true });
      await page.waitForTimeout(600);
      await page.click("#shopModal .close").catch(() => {});
    }
    await page
      .waitForFunction(s => window.me?.onboarding?.done || (window.me?.onboarding?.step || 0) > s, stepBefore, {
        timeout: 120000,
      })
      .catch(() => {});
    const next = await readState(page);
    if (next.onboardingDone) return true;
    if ((next.onboardingStep ?? 0) === stepBefore && stepBefore >= 0) {
      await page.waitForTimeout(400);
    }
  }
  const failShot = path.join(OUT, "ice-ordinary-onboarding-timeout.png");
  await page.screenshot({ path: failShot, fullPage: true }).catch(() => {});
  const final = await readState(page);
  throw new Error(`onboarding timeout at step=${final.onboardingStep} shot=${failShot}`);
}

async function walkInteractCh1(page, tx, tz, radius = 2.85, maxMs = 150000) {
  await dismissHowTo(page);
  await focusStage(page);
  const start = Date.now();
  let stall = 0;
  let lastDist = Infinity;
  while (Date.now() - start < maxMs) {
    const snap = await page.evaluate(
      ({ tx, tz, radius }) => {
        const pos = window.World3D?.getPlayerWorldPosition?.();
        if (!pos) return { dist: 999, opened: false };
        const dist = Math.hypot(tx - pos.x, tz - pos.z);
        if (dist > radius + 0.2) return { dist, opened: false };
        return { dist, opened: !!window.LifeCh1Slice?.tryInteract?.() };
      },
      { tx, tz, radius }
    );
    const dist = snap.dist;
    if (snap.opened) {
      logInput("interact", `near ${tx},${tz}`);
      return true;
    }
    if (dist <= radius) {
      logInput("keyboard", "E interact");
      await page.keyboard.press("e");
      if (await page.locator("#lifeCh1Wardrobe:not([hidden])").isVisible().catch(() => false)) return true;
      if (await page.locator(".life-ch1-choice").first().isVisible().catch(() => false)) return true;
      if (await page.locator("#lifeCh1DlgOk").isVisible().catch(() => false)) return true;
    }
    if (dist >= lastDist - 0.02) stall += 1;
    else stall = 0;
    lastDist = dist;
    if (stall > 8) {
      logInput("keyboard", "unstall WASD");
      for (const key of ["s", "a", "d", "w"]) {
        await page.keyboard.down(key);
        await page.waitForTimeout(200);
        await page.keyboard.up(key);
      }
      stall = 0;
    }
    logInput("keyboard", "Shift+W toward marker");
    await page.keyboard.down("Shift");
    await page.keyboard.down("w");
    await page.waitForTimeout(400);
    await page.keyboard.up("w");
    await page.keyboard.up("Shift");
  }
  const last = await page.evaluate(() => window.World3D?.getPlayerWorldPosition?.());
  throw new Error(`walkInteractCh1 timeout ${tx},${tz} last=${JSON.stringify(last)}`);
}

async function playLifeCh1Ordinary(page) {
  await page.waitForSelector('[data-testid="life-ch1-quest-panel"]', { timeout: 120000 });
  logScene("ch1_start", "Life Ch1 panel after onboarding");
  await walkKeys(page, 12, 350);
  const st = await readState(page);
  if ((st.lifeCh1?.stepIndex || 0) < 1) throw new Error("move step did not advance via UI");
  logScene("ch1_move", `stepIndex=${st.lifeCh1.stepIndex}`);

  await walkInteractCh1(page, -3.2, 2.5);
  logScene("ch1_mirror", "wardrobe interact");
  await page.waitForSelector("#lifeCh1Wardrobe:not([hidden])", { timeout: 15000 });
  await waitReadableDialog(page, 1800);
  logInput("click", "skin B");
  await page.click('[data-testid="life-ch1-skin-B"]');
  logInput("click", "outfit calm");
  await page.click(".life-ch1-outfit-pick >> nth=0");
  await waitReadableDialog(page, 1600);
  logInput("click", "wardrobe confirm");
  await page.click("#lifeCh1WardrobeConfirm");
  await page.waitForFunction(() => (window.me?.lifeCh1?.stepIndex || 0) >= 2, undefined, { timeout: 20000 });

  await walkInteractCh1(page, 2.5, -1.8);
  await page.waitForSelector(".life-ch1-choice", { timeout: 20000 });
  await waitReadableDialog(page, 3200);
  logInput("click", "trust choice 2");
  await page.click(".life-ch1-choice >> nth=1");

  await walkInteractCh1(page, 2.5, -1.8);
  await page.waitForSelector("#lifeCh1DlgOk", { timeout: 20000 });
  await waitReadableDialog(page, 3500);
  logInput("click", "reflect OK");
  await page.click("#lifeCh1DlgOk");
  await page.waitForFunction(() => window.me?.lifeCh1?.completed === true, undefined, { timeout: 25000 });
  logScene("ch1_complete", "lifeCh1.completed=true");
  await page.waitForTimeout(1500);
  return true;
}

async function runOrdinarySession(browser, viewport, label) {
  const prodHits = { n: 0 };
  const qs = firebaseEmulatorQueryString();
  const baseUrl = `http://127.0.0.1:${PORT}`;
  const entryUrl = `${baseUrl}/?solo=1${qs}&v=ice-ordinary-${label}`;

  const ctx = await browser.newContext({
    viewport,
    recordVideo: viewport.width >= 1000 ? { dir: OUT, size: { width: 1280, height: 720 } } : { dir: OUT, size: { width: 390, height: 844 } },
  });
  await ctx.addInitScript(() => {
    try {
      localStorage.removeItem("punkme_lifech1_local_player_v1");
      localStorage.removeItem("punkme_lifech1_local_device_id");
      localStorage.removeItem("punkme_character_id");
    } catch (_) {}
  });
  const page = await ctx.newPage();
  await installProdFirebaseRouteBlock(page);
  await page.route("**/*", route => {
    if (isProdFirebaseRequest(route.request().url())) {
      prodHits.n += 1;
      return route.abort();
    }
    return route.continue();
  });

  t0 = Date.now();
  inputLog.length = 0;
  scenes.length = 0;
  const recordingStartUtc = new Date();
  const recordingStartCet = cetTimestamp(recordingStartUtc);

  logInput("navigation", entryUrl);
  await page.goto(entryUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  await dismissHowTo(page);
  await pickAngelina(page);
  await dismissHowTo(page);
  await page.waitForFunction(() => window.World3D?.isReady?.(), undefined, { timeout: 120000 }).catch(() => {});

  await completeOnboarding(page);
  const completed = await playLifeCh1Ordinary(page);
  const recordingEndUtc = new Date();
  const recordingEndCet = cetTimestamp(recordingEndUtc);

  const vidTmp = await page.video()?.path();
  await page.close();
  await ctx.close();

  const shaShort = SHA.slice(0, 12);
  const suffix = viewport.width >= 1000 ? "desktop1280x720" : "mobile390x844";
  const dest = path.join(OUT, `ice-ch1-ORDINARY-UNCUT-${label}-${shaShort}-${suffix}.webm`);
  if (vidTmp && fs.existsSync(vidTmp)) {
    fs.copyFileSync(vidTmp, dest);
    try {
      fs.unlinkSync(vidTmp);
    } catch (_) {}
  }

  return {
    label,
    ordinaryEntry: true,
    qaOnly: false,
    entryUrl,
    recordingStartCet,
    recordingEndCet,
    chapter1CompletedInSession: completed,
    prodFirebaseBlocks: prodHits.n,
    file: dest,
    inputLog,
    scenes,
    ...ffprobeMeta(dest),
  };
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const serveChild = await serveRoot();
  const browser = await chromium.launch();
  const results = [];
  let err = null;
  try {
    results.push(await runOrdinarySession(browser, { width: 390, height: 844 }, "portrait"));
    results.push(await runOrdinarySession(browser, { width: 1280, height: 720 }, "desktop"));
  } catch (e) {
    err = e;
    try {
      const page = await browser.newPage();
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: "domcontentloaded" }).catch(() => {});
      await page.close();
    } catch (_) {}
  } finally {
    await browser.close();
    try {
      process.kill(-serveChild.pid, "SIGTERM");
    } catch (_) {}
  }

  const report = {
    repoSha: SHA,
    branch: "cursor/vertical-slice-ch1-d81d",
    capturedAt: new Date().toISOString(),
    ordinaryPath: true,
    qaOnly: false,
    priorQaRetakePreserved: "/opt/cursor/artifacts/ice-ch1-footage/ice-ch1-ORIGINAL-UNCUT-retake-a9db10e7209b-390x844.webm",
    priorDebugPreserved: "/opt/cursor/artifacts/ice-ch1-footage/ice-ch1-ORIGINAL-UNCUT-session-390x844.webm",
    emulator: {
      FIREBASE_EMULATOR: process.env.FIREBASE_EMULATOR,
      FIREBASE_DATABASE_EMULATOR_HOST: process.env.FIREBASE_DATABASE_EMULATOR_HOST,
      FIREBASE_AUTH_EMULATOR_HOST: process.env.FIREBASE_AUTH_EMULATOR_HOST,
    },
    recordings: results,
    inputProvenanceNote: "Mutations logged as inputLog per session; no evaluate() progression APIs.",
    failure: err ? String(err.message || err) : null,
  };

  fs.writeFileSync(path.join(OUT, "ice-ordinary-footage-metadata.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(
    path.join(OUT, `ice-ordinary-input-log-${SHA.slice(0, 12)}.json`),
    JSON.stringify(
      results.map(r => ({ label: r.label, inputLog: r.inputLog, scenes: r.scenes })),
      null,
      2
    )
  );

  if (err) {
    console.error("ORDINARY capture failed:", err);
    process.exit(1);
  }
  console.log("ORDINARY capture done:", JSON.stringify(report, null, 2));
})();
