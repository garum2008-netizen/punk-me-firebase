/** Shared Playwright UI helpers (no game-state cheats). */
const path = require("path");

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function bootSolo(page, base, cacheBust = "playtest-ui") {
  await page.goto(`${base}/?solo=1&v=${cacheBust}`, { waitUntil: "domcontentloaded", timeout: 120000 });
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
    window.__force2dFight = true;
  });
}

async function pickCobaltUi(page) {
  await page.locator('.char-pick[data-id="cobalt"]').click();
  await page.locator("#charSelectConfirm").click();
  await page.waitForFunction(() => window.__playerLoaded && window.me?.characterId === "cobalt", {
    timeout: 120000
  });
  await page.locator("#howToOverlay .close, #howToOverlay button").first().click({ timeout: 3000 }).catch(() => {});
}

async function snap(page, outDir, tag, name) {
  await page.screenshot({ path: path.join(outDir, `${tag}-${name}.png`) });
}

async function focusStage(page) {
  await page.locator("#stage3d").click({ position: { x: 200, y: 200 } }).catch(() => {});
}

async function walkDesktop(page, ms = 2200) {
  await focusStage(page);
  await page.keyboard.down("w");
  await sleep(ms);
  await page.keyboard.up("w");
}

async function walkMobile(page, ms = 2200) {
  const joy = page.locator("#touchJoystick");
  await joy.waitFor({ state: "visible", timeout: 15000 });
  const box = await joy.boundingBox();
  if (!box) return;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.touchscreen.tap(cx, cy);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 38, { steps: 8 });
  await sleep(ms);
  await page.mouse.up();
}

async function navGo(page, locId) {
  const quick = page.locator(`#navQuick button[onclick="goLocation('${locId}')"]`);
  if (await quick.count()) {
    await quick.first().click({ timeout: 8000 });
  } else {
    await page.locator('button[onclick*="openModal(\'mapModal\')"]').click();
    await page.waitForSelector("#mapGrid");
    await page.locator(`#mapGrid button[onclick*="goLocation('${locId}')"]`).click();
    await page.locator("#mapModal .close").click().catch(() => {});
  }
  await page.waitForFunction(id => window.me?.location === id, locId, { timeout: 30000 });
  await sleep(400);
}

async function navGoMap(page, locId) {
  await page.locator('button[onclick*="openModal(\'mapModal\')"]').click();
  await page.waitForSelector("#mapGrid");
  await page.locator(`#mapGrid button[onclick*="goLocation('${locId}')"]`).click();
  await page.waitForFunction(id => window.me?.location === id, locId, { timeout: 30000 });
  await sleep(400);
}

async function pressTalk(page, touchOnly) {
  if (touchOnly) {
    const t = page.locator("#touchTalk");
    if (await t.isVisible()) await t.click();
    else await page.locator("#touchInteract").click();
  } else {
    const btn = page.locator("#btnTalk");
    if (await btn.isVisible()) await btn.click();
    else await page.keyboard.press("e");
  }
}

async function openGangNpc(page, nid) {
  await page.locator('button[onclick*="openModal(\'gangModal\')"]').click();
  await page.waitForSelector("#gangList");
  await page.locator(`#gangList .npc-row[data-npc="${nid}"]`).click();
  await sleep(300);
}

async function clickChainFight(page) {
  const fight = page.locator(
    '#dialogArea button[onclick*="startNpcFight"], #dialogArea button.btn.danger, #dialogArea button:has-text("Chain"), #dialogArea button:has-text("Цеп")'
  );
  await fight.first().click({ timeout: 15000 });
}

async function winFightUi(page, maxMs = 35000) {
  await page.waitForSelector("#duel3dHud:not(.hidden), #fightOverlay.active", { timeout: 20000 }).catch(() => {});
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (await page.locator("#duel3dHud:not(.hidden)").isVisible()) {
      await page.locator("#duel3dHud button.btn.danger").click({ timeout: 500, force: true }).catch(() => {});
    }
    if (await page.locator("#fightOverlay.active").isVisible()) {
      await page.locator("#fightOverlay .btn.danger").first().click({ timeout: 500, force: true }).catch(() => {});
      await page
        .evaluate(() => {
          if (window.__force2dFight && typeof fightAttack === "function") fightAttack("heavy");
        })
        .catch(() => {});
    }
    const state = await page.evaluate(() => ({
      win: (window.me?.onboarding?.progress?.win_fight || 0) >= 1 || !!window.me?.onboarding?.done,
      overlay: document.getElementById("fightOverlay")?.classList.contains("active"),
      duel: !document.getElementById("duel3dHud")?.classList.contains("hidden")
    }));
    if (state.win && !state.overlay && !state.duel) return true;
    await sleep(120);
  }
  await page.locator('#fightOverlay button[onclick="closeFight()"]').click({ timeout: 2000 }).catch(() => {});
  return false;
}

async function buyCheapestShop(page) {
  await page.locator('button[onclick*="openModal(\'shopModal\')"]').click();
  await page.waitForSelector("#shopGrid, .shop-grid, #shopModal");
  const buy = page.locator("#shopGrid button.btn").first();
  if (await buy.count()) await buy.click();
  await page.locator("#shopModal .close").click().catch(() => {});
  await sleep(300);
}

async function clickFirstStoryChoice(page) {
  const c = page.locator(".story-choice");
  await c.first().click({ timeout: 15000 });
  await sleep(400);
}

async function dismissStoryDialog(page) {
  for (let i = 0; i < 12; i++) {
    const dlg = page.locator("#storyDialog.active");
    if (!(await dlg.count())) break;
    const next = page.locator("#storyDlgNext");
    if (await next.isVisible()) {
      await next.click().catch(() => {});
    } else {
      const choice = page.locator("#storyDialog .story-choice").first();
      if (await choice.isVisible()) await choice.click().catch(() => {});
      else await page.locator("#storyDialog .close").click({ timeout: 1000 }).catch(() => {});
    }
    await sleep(250);
  }
  await page.keyboard.press("Escape").catch(() => {});
}

async function advanceStoryNext(page) {
  for (let i = 0; i < 10; i++) {
    const next = page.locator("#storyDlgNext");
    if (!(await next.isVisible())) break;
    await next.click();
    await sleep(220);
  }
}

async function closeGangModal(page) {
  await page.locator("#gangModal .close").click({ timeout: 2000 }).catch(() => {});
}

async function runJobOnce(page) {
  page.once("dialog", d => d.accept().catch(() => {}));
  await dismissStoryDialog(page);
  await page.locator('button[onclick="openJobPanel()"]').click({ force: true });
  await page.locator("#jobActions button.btn").first().click({ timeout: 10000, force: true });
  await sleep(600);
}

async function buyHangoutMaterials(page) {
  await dismissStoryDialog(page);
  await navGo(page, "city");
  await openGangNpc(page, "bolt");
  if (!(await page.locator(".story-choice[data-mat]").count())) {
    await page.evaluate(() => window.StoryEngine?.openBoltMaterialShop?.());
  }
  await page.waitForSelector(".story-choice[data-mat]", { timeout: 15000 });
  const mats = ["brick", "nails", "board", "chain", "spray", "neon_tube"];
  for (const m of mats) {
    for (let i = 0; i < 12; i++) {
      const btn = page.locator(`.story-choice[data-mat="${m}"]`);
      if (!(await btn.count())) break;
      await btn.click().catch(() => {});
      await sleep(80);
    }
  }
  await dismissStoryDialog(page);
}

async function buildAllHangoutStages(page) {
  await navGo(page, "construction");
  for (let stage = 0; stage < 4; stage++) {
    await page.locator('button[onclick*="buildHangoutStage"]').click();
    await sleep(500);
  }
  return await page.evaluate(() => ({
    hangoutStage: window.StoryEngine?.ensureStoryState?.(window.me)?.hangoutStage ?? 0,
    joined: !!window.StoryEngine?.ensureStoryState?.(window.me)?.flags?.joined_gang
  }));
}

module.exports = {
  sleep,
  bootSolo,
  pickCobaltUi,
  snap,
  walkDesktop,
  walkMobile,
  navGo,
  navGoMap,
  pressTalk,
  openGangNpc,
  clickChainFight,
  winFightUi,
  buyCheapestShop,
  clickFirstStoryChoice,
  dismissStoryDialog,
  advanceStoryNext,
  closeGangModal,
  runJobOnce,
  buyHangoutMaterials,
  buildAllHangoutStages
};
