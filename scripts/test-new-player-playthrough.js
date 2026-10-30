#!/usr/bin/env node
/**
 * PR #17 playability: UI onboarding + reload grant check + initiation button + optional hangout.
 * Desktop 1280×800; mobile 390×844 when RUN_MOBILE≠0 (default on).
 */
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");
const H = require("./playthrough-ui-helpers");

const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const outDir = "/workspace/qa/playability";
fs.mkdirSync(outDir, { recursive: true });

const report = { startedAt: new Date().toISOString(), suites: [], pass: false };

async function runSuite(page, tag, touchOnly) {
  const log = [];
  await H.bootSolo(page, base, `p17-${tag}`);
  await H.pickCobaltUi(page);
  await H.snap(page, outDir, tag, "01-after-char");

  const questVisible = await page.evaluate(() => {
    const wrap = document.getElementById("hudQuestsWrap");
    return !wrap?.classList.contains("collapsed") && (document.getElementById("questBox")?.textContent?.length || 0) > 5;
  });
  log.push(["quest_panel_visible", questVisible]);

  const talkBtn = await page.evaluate(() => {
    const b = document.getElementById("btnTalk");
    const t = document.getElementById("touchTalk");
    return { desktop: b && getComputedStyle(b).display !== "none", touch: !!t };
  });
  log.push(["talk_button_present", talkBtn.desktop || talkBtn.touch, talkBtn]);

  if (touchOnly) await H.walkMobile(page, 1200);
  else await H.walkDesktop(page, 1200);
  await H.navGo(page, "street");
  await H.snap(page, outDir, tag, "03-street");

  await H.openGangNpc(page, "razor");
  await H.advanceStoryNext(page);
  await H.dismissStoryDialog(page);
  await H.closeGangModal(page);
  await H.snap(page, outDir, tag, "04-razor");
  const stepRazor = await page.evaluate(() => window.me?.onboarding?.step ?? 0);
  log.push(["talk_razor_step", stepRazor >= 3, stepRazor]);

  await H.dismissStoryDialog(page);
  await H.navGo(page, "cemetery");
  await H.snap(page, outDir, tag, "05-cemetery");

  await H.navGo(page, "street");
  await page.locator("#btnFight").click({ timeout: 15000, force: true });
  await H.winFightUi(page, 40000);
  await H.navGo(page, "room");
  await H.buyCheapestShop(page);
  const onboardingDone = await page.evaluate(() => !!window.me?.onboarding?.done);
  log.push(["onboarding_done", onboardingDone]);

  const coinsBefore = await page.evaluate(() => window.me?.coins ?? 0);
  const grantedBefore = await page.evaluate(() => ({ ...(window.me?.story?.rewardsGranted || {}) }));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded, { timeout: 120000 });
  await page.evaluate(() => {
    window.__force2dFight = true;
  });
  await H.sleep(2500);
  const afterReload = await page.evaluate(() => ({
    coins: window.me?.coins ?? 0,
    granted: window.me?.story?.rewardsGranted || {}
  }));
  await H.snap(page, outDir, tag, "05b-reload");
  const noDup =
    afterReload.coins === coinsBefore &&
    Object.keys(grantedBefore).every(k => afterReload.granted[k]);
  log.push(["reload_no_dup_grants", noDup, { coinsBefore, afterReload }]);

  const authPath = await H.completeAuthorityPathUi(page, touchOnly, log);
  log.push(["authority_stage4_ready", authPath.auth.stage >= 4 && authPath.auth.authority >= 80, authPath.auth]);
  log.push(["authority_ui_action_count", authPath.actions.length, authPath.actions]);

  await H.finishInitiationUi(page);
  await H.dismissStoryDialog(page);
  await H.clickFirstStoryChoice(page).catch(() => {});
  await H.dismissStoryDialog(page);

  const final = await page.evaluate(() => {
    const st = window.StoryEngine?.ensureStoryState?.(window.me);
    return { joined: !!st?.flags?.joined_gang, rank: st?.gang_rank };
  });
  log.push(["gang_member_ui", final.joined && final.rank === "gang_member", final]);
  await H.snap(page, outDir, tag, "final");

  let hangout = { hangoutStage: 0 };
  if (process.env.RUN_CH2 !== "0" && !touchOnly) {
    const hangoutLog = [];
    hangout = await H.buildAllHangoutStages(page, hangoutLog, { outDir, tag });
    const built = hangout.hangoutStage || 4;
    await H.snapHangoutBuild(page, outDir, tag, built);
    fs.copyFileSync(
      path.join(outDir, `${tag}-hangout-stage-${String(built).padStart(2, "0")}.png`),
      path.join(outDir, `${tag}-06-hangout-complete.png`)
    );
    log.push(["hangout_stage_4", hangout.hangoutStage >= 4, hangout]);
    log.push(...hangoutLog);
    if (tag === "desk-chromium") {
      const logPath = path.join(outDir, "hangout-ch2.log");
      fs.writeFileSync(
        logPath,
        JSON.stringify({ hangout, actions: hangout.actionLog, authActions: authPath.actions.length }, null, 2)
      );
      if (hangout.hangoutStage >= 4) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => window.dispatchEvent(new Event("resize")));
        await H.sleep(600);
        await H.snapHangoutBuild(page, outDir, "mob-chromium", 4);
      }
    }
  }

  const ok =
    questVisible &&
    stepRazor >= 3 &&
    onboardingDone &&
    noDup &&
    final.joined &&
    authPath.auth.stage >= 4 &&
    (touchOnly || process.env.RUN_CH2 === "0" || hangout.hangoutStage >= 4);

  return { log, ok, final, hangout };
}

async function main() {
  const plans = [[chromium, "desk-chromium", { width: 1280, height: 800 }, false]];
  const runMobile = process.env.RUN_MOBILE !== "0";
  if (runMobile) plans.push([chromium, "mob-chromium", { width: 390, height: 844 }, true]);
  if (process.env.RUN_WEBKIT === "1") {
    plans.push([webkit, "desk-webkit", { width: 1280, height: 800 }, false]);
  }

  let allOk = true;
  for (const [browserType, tag, viewport, touchOnly] of plans) {
    const browser = await browserType.launch();
    const page = await browser.newPage({
      viewport,
      isMobile: touchOnly,
      hasTouch: touchOnly
    });
    if (touchOnly) page.on("dialog", d => d.accept().catch(() => {}));
    let result;
    try {
      result = await runSuite(page, tag, touchOnly);
    } catch (e) {
      result = { ok: false, error: String(e.message || e), log: [] };
      await H.snap(page, outDir, tag, "error").catch(() => {});
      allOk = false;
    }
    await browser.close();
    report.suites.push({ tag, touchOnly, ...result });
    if (!result.ok) allOk = false;
  }
  report.pass = allOk;
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outDir, "playthrough-report.json"), JSON.stringify(report, null, 2));
  if (!allOk) {
    console.error("FAIL", JSON.stringify(report, null, 2));
    process.exit(1);
  }
  console.log("PASS playability", outDir);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
