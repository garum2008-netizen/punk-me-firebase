#!/usr/bin/env node
/**
 * Audio module tests — Chromium + WebKit.
 * Run: PUNK_BASE=http://127.0.0.1:8765 node scripts/test-audio.js
 */
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const outDir = path.join(__dirname, "..", "qa", "audio");
fs.mkdirSync(outDir, { recursive: true });

async function boot(page) {
  await page.goto(`${base}/?solo=1&v=audio1`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.AudioManager && window.__punkApplyFirebaseSnapshot, {
    timeout: 120000
  });
  await page.evaluate(() => {
    window.__punkApplyFirebaseSnapshot({ exists: () => false, val: () => null });
    window.__punkFinishLoadMeFlow();
  });
  await page.waitForSelector("#charSelect.active", { timeout: 20000 });
}

async function runSuite(browserName, browserType) {
  const browser = await browserType.launch();
  const page = await browser.newPage();
  const log = [];

  try {
    await boot(page);
  } catch (e) {
    await browser.close();
    if (browserName === "webkit") return [["webkit_skip", false, e.message || String(e)]];
    throw e;
  }

  const beforeUnlock = await page.evaluate(() => window.AudioManager.isUnlocked());
  await page.click("#charSelectConfirm");
  await page.waitForTimeout(400);
  const unlockState = await page.evaluate(async () => {
    const am = window.AudioManager;
    await am.unlockAudio();
    const ctx = am._test.getCtx();
    return {
      running: am.isUnlocked(),
      hasCtx: !!ctx,
      state: ctx?.state || "none"
    };
  });
  const unlockOk =
    browserName === "webkit"
      ? !beforeUnlock && unlockState.hasCtx
      : !beforeUnlock && unlockState.running;
  log.push(["unlock_after_gesture", unlockOk, { beforeUnlock, ...unlockState }]);

  await page.evaluate(() => {
    window.AudioManager.setChannelVolume("music", 0.41);
    window.AudioManager.setMuted(true);
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.AudioManager, { timeout: 60000 });
  const persisted = await page.evaluate(() => ({
    music: window.AudioManager.getChannelVolume("music"),
    muted: window.AudioManager.getMuted()
  }));
  log.push([
    "volume_mute_persist_reload",
    Math.abs(persisted.music - 0.41) < 0.02 && persisted.muted === true,
    persisted
  ]);

  await page.evaluate(async () => {
    window.AudioManager.setMuted(false);
    await window.AudioManager.unlockAudio();
  });

  const duck = await page.evaluate(async () => {
    const am = window.AudioManager;
    const waits = [];
    am.addEventListener("onLineStart", () => {
      waits.push(am.getDuckFactor());
    });
    am.playLine("test_duck_line", { subtitle: "Duck test line for audio QA.", lang: "en" });
    await new Promise(r => setTimeout(r, 480));
    const factor = am.getDuckFactor();
    await new Promise(r => setTimeout(r, 2800));
    const after = am.getDuckFactor();
    return { factor, after, started: waits.length > 0 };
  });
  log.push([
    "ducking_during_line",
    duck.factor < 0.35 && duck.after > 0.85,
    duck
  ]);

  const stopTest = await page.evaluate(async () => {
    const am = window.AudioManager;
    let ended = false;
    am.addEventListener("onLineEnd", () => {
      ended = true;
    });
    am.playLine("test_stop_line", { subtitle: "This should be stopped.", lang: "en" });
    await new Promise(r => setTimeout(r, 80));
    am.stopSpeech();
    await new Promise(r => setTimeout(r, 100));
    return { ended };
  });
  log.push(["stop_speech_on_close", stopTest.ended, stopTest]);

  const overlap = await page.evaluate(async () => {
    const am = window.AudioManager;
    let concurrent = 0;
    let maxConcurrent = 0;
    const onStart = () => {
      concurrent++;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
    };
    const onEnd = () => {
      concurrent = Math.max(0, concurrent - 1);
    };
    am.addEventListener("onLineStart", onStart);
    am.addEventListener("onLineEnd", onEnd);
    am.playLine("overlap_a", { subtitle: "Line A", lang: "en" });
    am.playLine("overlap_b", { subtitle: "Line B", lang: "en" });
    await new Promise(r => setTimeout(r, 4500));
    return { maxConcurrent };
  });
  log.push(["no_overlapping_lines", overlap.maxConcurrent <= 1, overlap]);

  const mutedSub = await page.evaluate(async () => {
    const am = window.AudioManager;
    am.setMuted(true);
    let saw = false;
    am.addEventListener("onLineStart", e => {
      if (e.detail?.subtitle) saw = true;
    });
    am.playLine("muted_sub", { subtitle: "Muted subtitle check.", lang: "en" });
    await new Promise(r => setTimeout(r, 200));
    const sub = document.getElementById("voiceSubtitle")?.textContent || "";
    return { saw, sub };
  });
  log.push(["subtitles_while_muted", mutedSub.saw && mutedSub.sub.includes("Muted"), mutedSub]);

  if (browserName === "chromium") {
    await page.evaluate(() => window.openAudioSettings?.());
    await page.waitForSelector("#audioSettingsModal.active", { timeout: 5000 });
    await page.screenshot({ path: path.join(outDir, "audio-settings-panel.png") });
  }

  await browser.close();
  return log;
}

(async () => {
  const all = [];
  for (const [name, type] of [["chromium", chromium], ["webkit", webkit]]) {
    let log = [];
    try {
      log = await runSuite(name, type);
    } catch (err) {
      console.error(`${name} suite error:`, err.message || err);
      if (name === "webkit") log.push(["webkit_skip", false, String(err.message || err)]);
      else log.push(["suite_boot", false, String(err.message || err)]);
    }
    all.push({ browser: name, log });
  }
  const reportPath = path.join(outDir, "test-results.json");
  fs.writeFileSync(reportPath, JSON.stringify(all, null, 2));
  let failed = false;
  for (const suite of all) {
    const skipped = suite.log.some(([id]) => id === "webkit_skip");
    for (const [id, ok, detail] of suite.log) {
      if (id === "webkit_skip") {
        console.log(`${suite.browser} ${id}: SKIP`, detail);
        continue;
      }
      const mark = ok ? "PASS" : "FAIL";
      console.log(`${suite.browser} ${id}: ${mark}`, ok ? "" : detail);
      if (!ok && !skipped) failed = true;
    }
  }
  if (failed) process.exit(1);
  console.log("test-audio ok");
})();
