#!/usr/bin/env node
/**
 * Inna voice/narrator/onboarding/lang/save checks — Chromium + WebKit.
 */
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = process.env.PUNK_BASE || "http://127.0.0.1:3456";
const CACHE = "voice-narrator-1";
const outDir = path.join("/workspace/qa/voice-narrator");
fs.mkdirSync(outDir, { recursive: true });

const matrix = [];

function row(feature, browser, device, status, detail) {
  matrix.push({ feature, browser, device, status, detail });
  console.log(status.padEnd(12), feature, browser, device, detail || "");
}

async function enterFresh(page) {
  await page.goto(`${base}/?solo=1&v=${CACHE}&test=1`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => typeof firebase !== "undefined", undefined, { timeout: 120000 });
  await page.evaluate(async () => {
    const u = firebase.auth().currentUser;
    if (u) await firebase.database().ref("players/" + u.uid).remove();
    localStorage.removeItem("punkme_lang");
    localStorage.removeItem("punkme_audio_v1");
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForSelector(".char-pick", { timeout: 90000 });
  await page.click('.char-pick[data-id="cobalt"]');
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.me?.characterId === "cobalt", undefined, { timeout: 120000 });
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
  await page.evaluate(() => {
    window.me.onboarding = { step: 0, progress: {}, done: false };
    window.me.dialogueHeard = {};
    window.saveMe?.();
  });
  await page.click("body", { position: { x: 200, y: 200 } });
  await page.waitForTimeout(400);
}

async function runOne(browserName, browserType, mobile) {
  const device = mobile ? "mobile" : "desktop";
  const browser = await browserType.launch();
  const context = await browser.newContext(
    mobile ? { viewport: { width: 390, height: 844 }, hasTouch: true } : {}
  );
  const page = await context.newPage();
  try {
    await enterFresh(page);

    const corner = await page.locator("#langCorner .lang-btn").count();
    row("lang_corner_visible", browserName, device, corner === 3 ? "works" : "broken", `buttons=${corner}`);

    await page.evaluate(() => window.AudioManager?.unlockAudio?.());
    await page.waitForTimeout(600);
    const narr = await page.evaluate(() => ({
      bar: document.getElementById("storyGoalBar")?.classList.contains("visible"),
      onboarding: !window.me?.onboarding?.done,
      narrator: window.AudioManager?.getNarratorEnabled?.()
    }));
    row(
      "narrator_onboarding",
      browserName,
      device,
      narr.bar && narr.onboarding && narr.narrator ? "works" : "broken",
      JSON.stringify(narr)
    );

    await page.evaluate(() => window.setLanguage("en", true));
    await page.waitForTimeout(300);
    const en = await page.evaluate(() => window.getLanguage());
    row("lang_switch_en", browserName, device, en === "en" ? "works" : "broken", en);

    await page.evaluate(() => window.setLanguage("da", true));
    row("lang_switch_da", browserName, device, (await page.evaluate(() => getLanguage())) === "da" ? "works" : "broken", "");

    const manifest = await page.evaluate(async () => {
      const r = await fetch("assets/audio/voice/manifest.json");
      const j = await r.json();
      return Object.keys(j.lines || {}).length;
    });
    row("voice_manifest", browserName, device, manifest > 10 ? "works" : "broken", `lines=${manifest}`);

    await page.evaluate(() => {
      window.me.coins = 5555;
      window.me.lang = "da";
      window.me.onboarding = { step: 2, progress: {}, done: false };
      window.me.dialogueHeard = { npc_razor_0: true };
      window.saveMe?.();
    });
    await page.waitForTimeout(800);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__playerLoaded, undefined, { timeout: 120000 });
    const persisted = await page.evaluate(() => ({
      coins: window.me?.coins,
      lang: window.me?.lang,
      step: window.me?.onboarding?.step,
      heard: window.me?.dialogueHeard?.npc_razor_0
    }));
    row(
      "save_reload",
      browserName,
      device,
      persisted.coins === 5555 && persisted.lang === "da" && persisted.step === 2 && persisted.heard
        ? "works"
        : "broken",
      JSON.stringify(persisted)
    );

    await page.screenshot({ path: path.join(outDir, `${browserName}-${device}-hud.png`), fullPage: false });
  } finally {
    await browser.close();
  }
}

(async () => {
  await runOne("chromium", chromium, false);
  await runOne("chromium", chromium, true);
  await runOne("webkit", webkit, false);
  await runOne("webkit", webkit, true);
  fs.writeFileSync(path.join(outDir, "matrix.json"), JSON.stringify(matrix, null, 2));
  const md = [
    "| Feature | Browser | Device | Status | Detail |",
    "|---------|---------|--------|--------|--------|",
    ...matrix.map(m => `| ${m.feature} | ${m.browser} | ${m.device} | ${m.status} | ${m.detail || ""} |`)
  ].join("\n");
  fs.writeFileSync(path.join(outDir, "REPORT.md"), md + "\n");
  const bad = matrix.filter(m => m.status !== "works");
  process.exit(bad.length ? 1 : 0);
})();
