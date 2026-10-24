#!/usr/bin/env node
/**
 * Playability regression + UI smoke (onboarding path, reload, initiation UI).
 * Chromium desktop 1280×800; optional RUN_MOBILE=1 / RUN_WEBKIT=1.
 */
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const outDir = "/workspace/qa/playability";
fs.mkdirSync(outDir, { recursive: true });

const report = { startedAt: new Date().toISOString(), suites: [], pass: false };

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function bootFreshPlayer(page) {
  await page.goto(`${base}/?solo=1&v=playtest`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__punkFinishLoadMeFlow, { timeout: 120000 });
  await page.evaluate(() => {
    try {
      localStorage.removeItem("punkme_character_id");
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (e) {}
    window.__punkApplyFirebaseSnapshot({ exists: () => false, val: () => null });
    window.__punkFinishLoadMeFlow();
  });
  await page.waitForSelector("#charSelectConfirm:not([disabled])", { timeout: 120000 });
  await page.evaluate(() => {
    window.pickCharacterAndContinue?.("cobalt");
    document.getElementById("charSelect")?.classList.remove("active");
    document.getElementById("howToOverlay")?.classList.remove("active");
  });
  await page.waitForFunction(() => window.__playerLoaded && window.me?.characterId, { timeout: 120000 });
}

async function runSuite(page, tag) {
  const log = [];
  await bootFreshPlayer(page);

  const questVisible = await page.evaluate(() => {
    const wrap = document.getElementById("hudQuestsWrap");
    return !wrap?.classList.contains("collapsed") && (document.getElementById("questBox")?.textContent?.length || 0) > 5;
  });
  log.push(["quest_panel_visible", questVisible]);

  const bumpOk = await page.evaluate(() => {
    try {
      window.me.quests = { active: "intro", progress: {} };
      window.questBump("win_fight");
      window.Onboarding?.onWinFight?.();
      return true;
    } catch (e) {
      return String(e.message);
    }
  });
  log.push(["questBump_no_throw", bumpOk === true], bumpOk);

  await page.evaluate(() => {
    for (let i = 0; i < 10; i++) window.Onboarding?.onMove?.(40 + i * 2, 58 + i * 2);
    window.goLocation?.("street");
    window.openNpcDialog?.("razor");
  });
  const stepAfterRazor = await page.evaluate(() => window.me?.onboarding?.step ?? 0);
  log.push(["razor_step_gte_3", stepAfterRazor >= 3]);

  await page.evaluate(
    () =>
      new Promise(resolve => {
        window.me.onboarding.step = 4;
        window.me.onboarding.progress = {};
        window.saveMe?.();
        setTimeout(resolve, 3000);
      })
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded, { timeout: 120000 });
  const afterReload = await page.evaluate(() => ({
    step: window.me?.onboarding?.step ?? 0,
    done: window.me?.onboarding?.done
  }));
  log.push(["onboarding_persisted_reload", afterReload.step >= 4 && !afterReload.done]);

  await page.evaluate(() => {
    window.me.onboarding = { step: 6, progress: {}, done: true };
    window.StoryEngine?.onOnboardingComplete?.();
    const st = window.StoryEngine.ensureStoryState(window.me);
    st.auth.stage = 4;
    st.auth.s1Done = true;
    st.auth.tasks = { pizza: true, no_rat: true, cobalt_item: true, ghost_prank: true };
    st.auth.trials = { cemetery: true, roof_parkour: true, duel_mohawk: true };
    st.authority = 80;
    window.me.location = "street";
    window.openModal?.("gangModal");
    document.querySelector('#gangList [data-npc="razor"]')?.click();
  });
  await sleep(500);
  await page.evaluate(() => document.querySelector("#authInitBtn")?.click());
  await sleep(600);

  const final = await page.evaluate(() => {
    const st = window.StoryEngine?.ensureStoryState(window.me);
    return {
      joined: !!st?.flags?.joined_gang,
      rank: st?.gang_rank,
      initiationDone: !!st?.quest?.completed?.q_initiation_pay || st?.flags?.joined_gang
    };
  });
  log.push(["gang_member_ui", final.joined && final.rank === "gang_member"]);

  await page.screenshot({ path: path.join(outDir, `${tag}-final.png`) });

  const ok =
    questVisible &&
    bumpOk === true &&
    stepAfterRazor >= 3 &&
    afterReload.step >= 4 &&
    final.joined;
  return { log, final, ok };
}

async function main() {
  const plans = [[chromium, "desk-chromium", { width: 1280, height: 800 }]];
  if (process.env.RUN_MOBILE === "1") plans.push([chromium, "mob-chromium", { width: 390, height: 844 }]);
  if (process.env.RUN_WEBKIT === "1") plans.push([webkit, "desk-webkit", { width: 1280, height: 800 }]);

  let allOk = true;
  for (const [browserType, tag, viewport] of plans) {
    const browser = await browserType.launch();
    const page = await browser.newPage({ viewport, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
    let result;
    try {
      result = await runSuite(page, tag);
    } catch (e) {
      result = { ok: false, error: e.message, log: [] };
      allOk = false;
    }
    await browser.close();
    report.suites.push({ tag, ...result });
    if (!result.ok) allOk = false;
  }
  report.pass = allOk;
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outDir, "playthrough-report.json"), JSON.stringify(report, null, 2));
  if (!report.pass) {
    console.error("FAIL", JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log("PASS playability smoke", outDir);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
