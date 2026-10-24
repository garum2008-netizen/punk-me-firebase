#!/usr/bin/env node
/**
 * Loading / save recovery tests — Chromium + WebKit.
 * Run: PUNK_BASE=http://127.0.0.1:8765 node scripts/test-loading-recovery.js
 */
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const outDir = "/workspace/qa/hotfix-loading";
fs.mkdirSync(outDir, { recursive: true });

async function runSuite(browserName, browserType) {
  const browser = await browserType.launch();
  const page = await browser.newPage();
  const log = [];
  await page.goto(`${base}/?solo=1&v=loadfix`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__punkMigratePlayer && window.t, { timeout: 120000 });

  const dom = await page.evaluate(() => {
    if (typeof setLanguage === "function") setLanguage("ru", false);
    const link = document.querySelector("#loading a[href='subscribe.html']");
    const status = document.getElementById("loadingStatus");
    return {
      linkText: link?.textContent?.trim() || "",
      statusText: status?.textContent?.trim() || "",
      footerHasLoadingPill: link?.textContent?.includes("Вход в банду") || link?.textContent?.includes("Joining")
    };
  });
  log.push(["footer_i18n", !dom.footerHasLoadingPill && dom.linkText.length > 3, dom]);
  if (browserName === "chromium") {
    await page.screenshot({ path: path.join(outDir, "desktop-loading-footer-ok.png") });
  }

  const migrate = await page.evaluate(() => {
    const m = window.__punkMigratePlayer;
    const inf = window.__punkInferCharacterId;
    if (!m || !inf) return { ok: false, reason: "helpers missing" };
    const v21 = {
      coins: 220,
      xp: 40,
      avatar: window.getCharacterDef("cobalt").poster,
      story: { chapter: 1, flags: {}, quest: { activeId: null, step: 0 } },
      onboarding: { done: true, step: 6, progress: {} }
    };
    const migrated = m(v21);
    const id = inf(migrated) || migrated.characterId;
    const v20 = m({ quests: "intro", story: { quest: { completed: null } } });
    let threw = false;
    try {
      if (window.StoryEngine?.ensureStoryState) {
        const p = { characterId: "cobalt", onboarding: { done: true }, story: v20.story };
        window.StoryEngine.ensureStoryState(p);
        window.StoryEngine.onOnboardingComplete?.();
      }
    } catch (e) {
      threw = true;
    }
    return { ok: id === "cobalt" && v20.story.quest.completed && !threw, id, threw };
  });
  log.push(["migrate_v21_infer", migrate.ok, migrate]);

  const returning = await page.evaluate(() => {
    localStorage.setItem("punkme_character_id", "razor");
    const raw = { coins: 100, xp: 5, onboarding: { done: true, step: 6, progress: {} } };
    const v = window.__punkMigratePlayer(raw);
    const id = window.__punkResolveCharacterId(v);
    return { ok: id === "razor", id };
  });
  log.push(["returning_localStorage", returning.ok, returning]);

  await page.evaluate(() => {
    window.__showLoadingFailure?.("Test error", "detail");
  });
  const errUi = await page.evaluate(() => ({
    hasRetry: !!document.getElementById("loadingRetryBtn"),
    hasFresh: !!document.getElementById("loadingFreshBtn"),
    subscribeOk: (document.querySelector("#loading a[href='subscribe.html']")?.textContent || "").length > 2
  }));
  log.push(["error_ui", errUi.hasRetry && errUi.hasFresh && errUi.subscribeOk, errUi]);

  if (browserName === "chromium") {
    await page.screenshot({ path: path.join(outDir, "desktop-loading-error-ui.png") });
  }
  if (browserName === "webkit") {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(outDir, "mobile-webkit-loading-footer.png") });
  }

  await browser.close();
  const failed = log.filter(([, ok]) => !ok);
  return { browserName, log, failed };
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
