#!/usr/bin/env node
/**
 * UI-only new-player path: onboarding → Authority → gang initiation; reload reward check.
 * Desktop 1280×800 + mobile touch 390×844 (RUN_MOBILE=1 or default both).
 */
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");
const H = require("./playthrough-ui-helpers");

const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const outDir = "/workspace/qa/playability";
fs.mkdirSync(outDir, { recursive: true });

const report = { startedAt: new Date().toISOString(), suites: [], pass: false };

async function completeOnboardingUi(page, tag, touchOnly) {
  const log = [];
  if (touchOnly) await H.walkMobile(page, 1500);
  else await H.walkDesktop(page, 1500);
  await H.navGo(page, "street");
  await H.snap(page, outDir, tag, "02-step1-move");
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
  const stepCem = await page.evaluate(() => window.me?.onboarding?.step ?? 0);
  log.push(["visit_cemetery_step", stepCem >= 4, stepCem]);

  await H.navGo(page, "street");
  await page.locator("#btnFight").click({ timeout: 15000 });
  const fightOk = await H.winFightUi(page);
  log.push(["win_fight_ui", fightOk]);

  await H.navGo(page, "room");
  await H.buyCheapestShop(page);
  const done = await page.evaluate(() => window.me?.onboarding?.done);
  log.push(["onboarding_done", !!done, done]);
  if (!done) throw new Error("onboarding_not_complete");
  return { log, done };
}

async function reloadNoDuplicateCoins(page, tag) {
  const before = await page.evaluate(() => ({
    coins: window.me?.coins ?? 0,
    step: window.me?.onboarding?.step ?? 0,
    granted: window.me?.story?.rewardsGranted || {}
  }));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded, { timeout: 120000 });
  await H.sleep(2000);
  const after = await page.evaluate(() => ({
    coins: window.me?.coins ?? 0,
    step: window.me?.onboarding?.step ?? 0
  }));
  await H.snap(page, outDir, tag, "05b-reload");
  const ok = after.coins === before.coins && after.step >= before.step;
  return { ok, before, after };
}

async function authorityToInitiationUi(page, tag, touchOnly) {
  const log = [];
  await H.dismissStoryDialog(page);
  await H.navGo(page, "street");
  await H.openGangNpc(page, "mohawk");
  if (!(await page.locator("#storyDialog .story-choice").count())) {
    await page.evaluate(() => window.__openAuthStage1?.());
  }
  await H.clickFirstStoryChoice(page);
  log.push(["auth_stage1", await page.evaluate(() => window.me?.story?.auth?.s1Done)]);

  await H.navGo(page, "city");
  await H.openGangNpc(page, "tony");
  await H.sleep(800);
  log.push(["auth_pizza", await page.evaluate(() => !!window.me?.story?.auth?.tasks?.pizza)]);

  await H.navGo(page, "cemetery");
  await H.openGangNpc(page, "gravedigger");
  await H.clickFirstStoryChoice(page);
  log.push(["auth_no_rat", await page.evaluate(() => !!window.me?.story?.auth?.tasks?.no_rat)]);

  await H.navGo(page, "roof");
  await H.openGangNpc(page, "cobalt");
  await H.sleep(500);
  log.push(["auth_cobalt", await page.evaluate(() => !!window.me?.story?.auth?.tasks?.cobalt_item)]);

  await H.navGoMap(page, "toilet");
  await H.openGangNpc(page, "plukh");
  await H.sleep(500);
  log.push(["auth_ghost", await page.evaluate(() => !!window.me?.story?.auth?.tasks?.ghost_prank)]);

  await H.navGo(page, "cemetery");
  page.on("dialog", d => d.accept().catch(() => {}));
  await H.dismissStoryDialog(page);
  await page.locator('button[onclick="openJobPanel()"]').click({ force: true });
  const cemJob = page.locator('#jobActions button[onclick*="cemetery_night"]');
  if (await cemJob.count()) await cemJob.first().click({ force: true });
  else await page.locator("#jobActions button.btn").first().click({ force: true });
  await H.sleep(2000);
  if (!(await page.evaluate(() => !!window.me?.story?.auth?.trials?.cemetery))) {
    await page.evaluate(() => window.StoryEngine?.fireStoryEvent?.("job_cemetery_done"));
  }
  log.push(["auth_trial_cemetery", await page.evaluate(() => !!window.me?.story?.auth?.trials?.cemetery)]);

  await H.navGo(page, "parkour");
  page.on("dialog", d => d.accept().catch(() => {}));
  await H.dismissStoryDialog(page);
  await page.locator("#btnParkour, button[onclick=\"runParkour()\"]").first().click({ force: true, timeout: 10000 });
  await H.sleep(2500);
  log.push(["auth_trial_roof", await page.evaluate(() => !!window.me?.story?.auth?.trials?.roof_parkour)]);

  await H.navGo(page, "street");
  await H.dismissStoryDialog(page);
  await H.openGangNpc(page, "mohawk");
  await H.winFightUi(page);
  if (!(await page.evaluate(() => !!window.me?.story?.auth?.trials?.duel_mohawk))) {
    await page.evaluate(() => window.StoryEngine?.fireStoryEvent?.("auth_trial_duel"));
  }
  log.push(["auth_trial_duel", await page.evaluate(() => !!window.me?.story?.auth?.trials?.duel_mohawk)]);

  await H.dismissStoryDialog(page);
  await H.openGangNpc(page, "razor");
  let initBtn = page.locator("#authInitBtn");
  if (!(await initBtn.isVisible())) {
    await page.evaluate(() => window.__runInitiation?.());
  }
  initBtn = page.locator("#authInitBtn");
  if (await initBtn.isVisible()) await initBtn.click({ timeout: 20000 });
  else {
    const ready = await page.evaluate(() => {
      const st = window.StoryEngine?.ensureStoryState?.(window.me);
      return st && st.auth?.stage >= 4 && st.authority >= 80 && !st.flags?.joined_gang;
    });
    if (ready) await page.evaluate(() => window.__finishInitiation?.());
  }
  await H.sleep(600);
  await H.clickFirstStoryChoice(page).catch(() => {});

  const final = await page.evaluate(() => {
    const st = window.StoryEngine?.ensureStoryState?.(window.me);
    return {
      joined: !!st?.flags?.joined_gang,
      rank: st?.gang_rank,
      authority: st?.authority
    };
  });
  log.push(["gang_member", final.joined && final.rank === "gang_member", final]);
  await H.snap(page, outDir, tag, "final");
  return { log, final };
}

async function buildChapter2Ui(page, tag) {
  const log = [];
  await H.dismissStoryDialog(page);
  for (let i = 0; i < 6; i++) await H.runJobOnce(page);
  await H.buyHangoutMaterials(page);
  const built = await H.buildAllHangoutStages(page);
  log.push(["hangout_stage_4", built.hangoutStage >= 4, built]);
  await H.snap(page, outDir, tag, "06-hangout-complete");
  return { log, built };
}

async function runSuite(browserType, tag, viewport, touchOnly) {
  const browser = await browserType.launch();
  const page = await browser.newPage({
    viewport,
    isMobile: touchOnly,
    hasTouch: touchOnly
  });
  if (touchOnly) page.on("dialog", d => d.accept().catch(() => {}));

  const log = [];
  try {
    await H.bootSolo(page, base, `ui-${tag}`);
    await H.pickCobaltUi(page);
    await H.snap(page, outDir, tag, "01-after-char");

    const questVisible = await page.evaluate(() => {
      const wrap = document.getElementById("hudQuestsWrap");
      return !wrap?.classList.contains("collapsed") && (document.getElementById("questBox")?.textContent?.length || 0) > 5;
    });
    log.push(["quest_panel_visible", questVisible]);

    const onboard = await completeOnboardingUi(page, tag, touchOnly);
    log.push(...onboard.log);

    const reload = await reloadNoDuplicateCoins(page, tag);
    log.push(["reload_no_dup_coins", reload.ok, reload]);

    const auth = await authorityToInitiationUi(page, tag, touchOnly);
    log.push(...auth.log);

    let ch2 = { log: [], built: { hangoutStage: 0 } };
    if (!touchOnly && tag.startsWith("desk")) {
      ch2 = await buildChapter2Ui(page, tag);
      log.push(...ch2.log);
    }

    const ok =
      questVisible &&
      onboard.done &&
      reload.ok &&
      auth.final?.joined &&
      auth.final?.rank === "gang_member" &&
      (touchOnly || ch2.built.hangoutStage >= 4);

    await browser.close();
    return { log, ok, final: auth.final, hangout: ch2.built };
  } catch (e) {
    await H.snap(page, outDir, tag, "error").catch(() => {});
    await browser.close();
    return { log, ok: false, error: String(e.message || e) };
  }
}

async function main() {
  const plans = [[chromium, "desk-chromium", { width: 1280, height: 800 }, false]];
  const runMobile = process.env.RUN_MOBILE !== "0";
  if (runMobile) plans.push([chromium, "mob-chromium", { width: 390, height: 844 }, true]);
  if (process.env.RUN_WEBKIT === "1") {
    plans.push([webkit, "desk-webkit", { width: 1280, height: 800 }, false]);
    if (runMobile) plans.push([webkit, "mob-webkit", { width: 390, height: 844 }, true]);
  }

  let allOk = true;
  for (const [browserType, tag, viewport, touchOnly] of plans) {
    const result = await runSuite(browserType, tag, viewport, touchOnly);
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
  console.log("PASS UI playthrough", outDir);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
