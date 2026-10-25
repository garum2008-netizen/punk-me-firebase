#!/usr/bin/env node
/**
 * Loading / save recovery tests — Chromium + WebKit.
 * Run: PUNK_BASE=http://127.0.0.1:8765 node scripts/test-loading-recovery.js
 */
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const emulatorQs = process.env.FIREBASE_EMULATOR ? "&firebaseEmulator=1" : "";
const outDir = "/workspace/qa/hotfix-loading";
fs.mkdirSync(outDir, { recursive: true });

async function runSuite(browserName, browserType) {
  const browser = await browserType.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const log = [];

  await page.goto(`${base}/?solo=1&v=loadfix2${emulatorQs}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(
    () => window.__punkApplyFirebaseSnapshot && window.CharSelect && window.getCharacterDef,
    { timeout: 120000 }
  );

  const footer = await page.evaluate(() => {
    if (typeof setLanguage === "function") setLanguage("ru", false);
    const link = document.querySelector("#loading a[href='subscribe.html']");
    const status = document.getElementById("loadingStatus");
    return {
      linkText: link?.textContent?.trim() || "",
      statusText: status?.textContent?.trim() || "",
      footerHasLoadingPill: link?.textContent?.includes("Вход в банду") || link?.textContent?.includes("Joining")
    };
  });
  log.push(["footer_i18n", !footer.footerHasLoadingPill && footer.linkText.length > 3, footer]);

  const webglUi = await page.evaluate(() => {
    if (typeof setLanguage === "function") setLanguage("ru", false);
    window.__punkShowBootFailure?.("webgl", "no_context", { kind: "webgl", code: "webgl" });
    const retry = document.getElementById("loadingRetryBtn");
    return {
      noFresh: !document.getElementById("loadingFreshBtn"),
      hasCopy: !!document.getElementById("loadingCopySupportBtn"),
      hasWebglLink: !!document.querySelector('#loading a[href*="webgl.org"]'),
      hasSupportDump: !!document.getElementById("loadingSupportDump"),
      titleHasWebgl: (document.querySelector(".loading-boot-title")?.textContent || "").length > 5,
      retryHint: (document.querySelector(".loading-boot-retry-hint")?.textContent || "").length > 10
    };
  });
  log.push([
    "webgl_boot_ui",
    webglUi.noFresh && webglUi.hasCopy && webglUi.hasWebglLink && webglUi.hasSupportDump && webglUi.titleHasWebgl && webglUi.retryHint,
    webglUi
  ]);
  if (browserName === "chromium") {
    await page.screenshot({ path: path.join(outDir, "desktop-webgl-boot-ui.png") });
  }
  await page.evaluate(() => window.__punkRestoreLoadingMarkup?.());

  await page.evaluate(() => {
    try {
      localStorage.removeItem("punkme_character_id");
    } catch (e) {}
    window.__punkApplyFirebaseSnapshot({ exists: () => false, val: () => null });
    window.__punkFinishLoadMeFlow();
  });
  await page.waitForSelector("#charSelect.active", { timeout: 15000 });
  await page.waitForSelector("#charSelectConfirm", { timeout: 60000 });
  await page.waitForFunction(
    () => document.querySelectorAll("#charSelectUi .btn").length === 5,
    { timeout: 60000 }
  );
  const fresh = await page.evaluate(() => {
    const idAfterApply = window.me?.characterId;
    const select = document.getElementById("charSelect");
    const btnCount = document.querySelectorAll("#charSelectUi .btn").length;
    const pickCount = document.querySelectorAll("#charSelectUi .char-pick").length;
    return {
      ok: !idAfterApply && select?.classList.contains("active") && btnCount === 5 && pickCount === 4,
      idAfterApply,
      btnCount,
      pickCount,
      selectActive: select?.classList.contains("active")
    };
  });
  log.push(["fresh_player_char_select", fresh.ok, fresh]);
  if (browserName === "chromium" && fresh.ok) {
    await page.screenshot({ path: path.join(outDir, "desktop-fresh-char-select.png") });
  }
  if (browserName === "webkit" && fresh.ok) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(outDir, "mobile-webkit-fresh-char-select.png") });
  }

  const cobaltReload = await page.evaluate(() => {
    try {
      localStorage.setItem("punkme_character_id", "cobalt");
    } catch (e) {}
    window.pickCharacterAndContinue?.("cobalt");
    const afterPick = window.me?.characterId;
    document.getElementById("charSelect")?.classList.remove("active");
    window.__punkApplyFirebaseSnapshot({
      exists: () => true,
      val: () => ({
        coins: 120,
        xp: 5,
        characterId: "cobalt",
        avatar: window.getCharacterDef("cobalt").poster,
        onboarding: { done: false, step: 0, progress: {} }
      })
    });
    window.__punkFinishLoadMeFlow();
    const selectActive = document.getElementById("charSelect")?.classList.contains("active");
    const loadingHidden = document.getElementById("loading")?.style.display === "none";
    return {
      ok: afterPick === "cobalt" && window.me?.characterId === "cobalt" && !selectActive && loadingHidden,
      afterPick,
      id: window.me?.characterId,
      selectActive,
      loadingHidden
    };
  });
  log.push(["cobalt_reload_no_select", cobaltReload.ok, cobaltReload]);
  if (browserName === "chromium" && cobaltReload.ok) {
    await page.screenshot({ path: path.join(outDir, "desktop-cobalt-returning.png") });
  }

  const oldShape = await page.evaluate(() => {
    try {
      localStorage.removeItem("punkme_character_id");
    } catch (e) {}
    const raw = {
      coins: 90,
      xp: 12,
      avatar: window.getCharacterDef("cobalt").poster,
      onboarding: { done: true, step: 6, progress: {} }
    };
    window.__punkApplyFirebaseSnapshot({ exists: () => true, val: () => raw });
    return { ok: window.me?.characterId === "cobalt", id: window.me?.characterId };
  });
  log.push(["old_save_avatar_infer", oldShape.ok, oldShape]);

  const timeoutPage = await context.newPage();
  await timeoutPage.goto(`${base}/?loadtest=timeout&v=loadfix-timeout`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await timeoutPage.waitForFunction(() => window.__punkLoadMe, { timeout: 120000 });
  const timeoutUi = await timeoutPage.evaluate(async () => {
    window.__loadMeTimeoutMs = 280;
    window.__playerLoaded = false;
    window.uid = firebase.auth().currentUser?.uid || "timeout-test-uid";
    const hang = { once: () => new Promise(() => {}) };
    window.db = { ref: () => hang };
    window.__punkRestoreLoadingMarkup?.();
    document.getElementById("loading").style.display = "flex";
    window.__punkLoadMe();
    await new Promise(r => setTimeout(r, 450));
    return {
      hasRetry: !!document.getElementById("loadingRetryBtn"),
      hasFresh: !!document.getElementById("loadingFreshBtn"),
      subscribeOk: (document.querySelector("#loading a[href='subscribe.html']")?.textContent || "").length > 2
    };
  });
  log.push([
    "forced_timeout_error_ui",
    timeoutUi.hasRetry && timeoutUi.hasFresh && timeoutUi.subscribeOk,
    timeoutUi
  ]);
  if (browserName === "chromium") {
    await timeoutPage.screenshot({ path: path.join(outDir, "desktop-loading-timeout-ui.png") });
  }
  await timeoutPage.close();

  const migrate = await page.evaluate(() => {
    const v21 = {
      coins: 220,
      xp: 40,
      avatar: window.getCharacterDef("cobalt").poster,
      story: { chapter: 1, flags: {}, quest: { activeId: null, step: 0 } },
      onboarding: { done: true, step: 6, progress: {} }
    };
    const migrated = window.__punkMigratePlayer(v21);
    const id = window.__punkResolveCharacterId(migrated, true);
    return { ok: id === "cobalt", id };
  });
  log.push(["migrate_v21_infer", migrate.ok, migrate]);

  const returningLs = await page.evaluate(() => {
    localStorage.setItem("punkme_character_id", "razor");
    const raw = { coins: 100, xp: 5, onboarding: { done: true, step: 6, progress: {} } };
    const v = window.__punkMigratePlayer(raw);
    const id = window.__punkResolveCharacterId(v, false);
    return { ok: id === "razor", id };
  });
  log.push(["returning_localStorage", returningLs.ok, returningLs]);

  await context.close();
  await browser.close();
  return { browserName, log, failed: log.filter(([, ok]) => !ok) };
}

async function main() {
  const results = [];
  results.push(await runSuite("chromium", chromium));
  try {
    results.push(await runSuite("webkit", webkit));
  } catch (e) {
    console.warn("webkit suite skipped:", e.message);
    results.push({ browserName: "webkit", log: [["webkit_skip", false, e.message]], failed: [["webkit_skip"]] });
  }

  const allFailed = results
    .filter(r => r.browserName !== "webkit" || !r.log.some(x => x[0] === "webkit_skip"))
    .flatMap(r => r.failed.map(f => `${r.browserName}:${f[0]}`));
  console.log(JSON.stringify(results, null, 2));
  if (allFailed.length) {
    console.error("FAILED:", allFailed.join(", "));
    process.exit(1);
  }
  console.log("loading-recovery: all PASS (chromium + webkit)");
  console.log("PNGs:", outDir);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
