/** Read-only state + UI navigation for honest Playwright runs (no force clicks). */

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function waitGameplayUnblocked(page, timeoutMs = 12000) {
  await page
    .waitForFunction(
      () => {
        if (document.body?.dataset?.gamePaused === "1") return false;
        if (document.querySelector("#startGameOverlay.active")) return false;
        if (document.querySelector("#gameMenuOverlay.active")) return false;
        if (document.querySelector("#howToOverlay.active")) return false;
        if (document.querySelector("#chapterIntro.active")) return false;
        return document.body.classList.contains("mode-world3d");
      },
      undefined,
      { timeout: timeoutMs }
    )
    .catch(() => {});
}

async function readGameState(page) {
  return page.evaluate(() => ({
    stepKey: window.Onboarding?.getCurrentStep?.()?.key || null,
    onboardingDone: !!window.me?.onboarding?.done,
    location: window.me?.location,
    coins: window.me?.coins,
    chapter: window.StoryEngine?.ensureStoryState?.(window.me)?.chapter,
    authStage: window.StoryEngine?.ensureStoryState?.(window.me)?.auth?.stage,
    s1Done: window.StoryEngine?.ensureStoryState?.(window.me)?.auth?.s1Done,
    razorBridge: window.StoryEngine?.ensureStoryState?.(window.me)?.flags?.razor_bridge_seen,
    joined: window.StoryEngine?.ensureStoryState?.(window.me)?.flags?.joined_gang,
    guide: window.Onboarding?.isActive?.()
      ? window.Onboarding.getGuideTarget?.()
      : window.StoryEngine?.resolveGuideTarget?.(),
    player: window.World3D?.getPlayerWorldPos?.(),
    loaded: window.__playerLoaded,
    ready3d: window.World3D?.isReady?.()
  }));
}

async function readDomText(page) {
  return page.evaluate(() => document.body.innerText || "");
}

function findRawKeys(text) {
  return [...new Set((text.match(/\b(ep1_[a-z0-9_]+|npc_[a-z]+:)\b/gi) || []))];
}

async function walkUntilRoomMomDoor(page, mobile) {
  await focusStage(page);
  for (let i = 0; i < 140; i++) {
    const ok = await page.evaluate(
      () => window.me?.location === "room" && window.me.x < 22 && window.me.y < 55
    );
    if (ok) return true;
    await walkTowardGuide(page, mobile, 2);
    await sleep(120);
  }
  return false;
}

async function pressInteract(page, mobile) {
  if (mobile) await page.locator("#touchInteract").click({ timeout: 8000 });
  else await page.keyboard.press("e");
}

async function nudgeKeys(page, dx, dz) {
  const keys = [];
  if (dz > 0.15) keys.push("w");
  if (dz < -0.15) keys.push("s");
  if (dx > 0.15) keys.push("d");
  if (dx < -0.15) keys.push("a");
  for (const k of keys) await page.keyboard.down(k);
  await sleep(220);
  for (const k of keys) await page.keyboard.up(k);
}

async function nudgeJoystick(page, dx, dz) {
  const joy = page.locator("#touchJoystick");
  const box = await joy.boundingBox();
  if (!box) return;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const len = Math.hypot(dx, dz) || 1;
  const ox = (dx / len) * 34;
  const oy = -(dz / len) * 34;
  await page.touchscreen.tap(cx, cy);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + ox, cy + oy, { steps: 6 });
  await sleep(220);
  await page.mouse.up();
}

async function focusStage(page) {
  await waitGameplayUnblocked(page);
  const canvas = page.locator("#stage3d");
  await canvas.click({ position: { x: 120, y: 160 }, timeout: 8000 }).catch(() => {});
}

async function orbitLook(page) {
  await focusStage(page);
  const canvas = page.locator("#stage3d");
  const box = await canvas.boundingBox();
  if (!box) return;
  const cx = box.x + box.width * 0.55;
  const cy = box.y + box.height * 0.45;
  await page.mouse.move(cx, cy);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(cx + 90, cy, { steps: 8 });
  await sleep(180);
  await page.mouse.up({ button: "right" });
}

async function wanderMove(page, mobile, ms = 4200) {
  await waitGameplayUnblocked(page);
  await focusStage(page);
  if (mobile) {
    const joy = page.locator("#touchJoystick");
    const box = await joy.boundingBox();
    if (!box) return;
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.touchscreen.tap(cx, cy);
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    await page.mouse.move(cx, cy - 40, { steps: 10 });
    await sleep(ms);
    await page.mouse.up();
    return;
  }
  await page.keyboard.down("w");
  await sleep(ms);
  await page.keyboard.up("w");
  await page.keyboard.down("a");
  await sleep(Math.round(ms / 2));
  await page.keyboard.up("a");
  await orbitLook(page);
}

async function walkTowardGuide(page, mobile, steps = 90) {
  await focusStage(page);
  for (let i = 0; i < steps; i++) {
    const nav = await page.evaluate(() => {
      const guide = window.Onboarding?.isActive?.()
        ? window.Onboarding.getGuideTarget?.()
        : window.StoryEngine?.resolveGuideTarget?.();
      const pos = window.World3D?.getPlayerWorldPos?.();
      if (!guide) return { done: true, dx: 0, dz: 0 };
      if (guide.npcId) {
        const nid = window.World3D?.getNearestNpc?.();
        if (nid === guide.npcId) return { done: true, dx: 0, dz: 0 };
      }
      if (guide.wx == null || guide.wz == null || !pos) {
        return { done: false, dx: 0, dz: -1 };
      }
      const dx = guide.wx - pos.x;
      const dz = guide.wz - pos.z;
      const dist = Math.hypot(dx, dz);
      return { done: dist < 1.4, dx, dz, dist };
    });
    if (nav.done) return true;
    if (mobile) await nudgeJoystick(page, nav.dx, nav.dz);
    else await nudgeKeys(page, nav.dx, nav.dz);
    await sleep(160);
  }
  return false;
}

async function dismissChapterIntroUi(page) {
  for (let i = 0; i < 10; i++) {
    const intro = page.locator("#chapterIntro.active");
    if (!(await intro.count())) break;
    const skip = page.locator("#chapterIntro.active .chapter-intro-skip");
    const next = page.locator("#chapterIntro.active .chapter-intro-next");
    if (await skip.count()) {
      await skip.click({ timeout: 15000 });
    } else if (await next.count()) {
      await next.click({ timeout: 15000 });
    } else break;
    await sleep(350);
  }
}

async function dismissHowToUi(page) {
  const ov = page.locator("#howToOverlay.active");
  if (await ov.count()) {
    await page.locator("#howToOverlay .howto-close").click({ timeout: 5000 });
  }
}

async function ensureOverlaysClear(page) {
  for (let i = 0; i < 28; i++) {
    const start = page.locator("#startGameOverlay.active #btnStartGame");
    if (await start.count()) {
      await start.click({ timeout: 12000 });
      await page
        .waitForFunction(() => window.me?.tutorial?.episode1Started === true, undefined, { timeout: 20000 })
        .catch(() => {});
    }
    await dismissChapterIntroUi(page);
    await dismissHowToUi(page);
    const blocked = await page.evaluate(() => ({
      intro: !!document.getElementById("chapterIntro")?.classList.contains("active"),
      howto: !!document.getElementById("howToOverlay")?.classList.contains("active"),
      start: !!document.getElementById("startGameOverlay")?.classList.contains("active"),
      menu: !!document.getElementById("gameMenuOverlay")?.classList.contains("active")
    }));
    if (!blocked.intro && !blocked.howto && !blocked.start && !blocked.menu) return;
    await sleep(700);
  }
}

async function advanceStoryDialog(page) {
  for (let i = 0; i < 12; i++) {
    const next = page.locator("#storyDialog.active #storyDlgNext, #storyDialog.active .story-choice");
    if (!(await next.count())) break;
    await next.first().click({ timeout: 8000 });
    await sleep(400);
  }
}

async function clickNavLocation(page, locId) {
  await waitGameplayUnblocked(page);
  const here = await page.evaluate(() => window.me?.location);
  if (here === locId) return;
  const quick = page.locator(`#navQuick button[onclick="goLocation('${locId}')"]`);
  if (await quick.count()) {
    await quick.first().click({ timeout: 15000 });
  } else {
    await page.locator('button[onclick*="openModal(\'mapModal\')"]').click({ timeout: 15000 });
    await page.waitForSelector("#mapGrid", { timeout: 15000 });
    await page.locator(`#mapGrid button[onclick*="goLocation('${locId}')"]`).click({ timeout: 15000 });
    await page.locator("#mapModal .close").click({ timeout: 5000 }).catch(() => {});
  }
  await page.waitForFunction(id => window.me?.location === id, locId, { timeout: 90000 });
}

module.exports = {
  sleep,
  readGameState,
  readDomText,
  findRawKeys,
  pressInteract,
  wanderMove,
  walkTowardGuide,
  dismissChapterIntroUi,
  dismissHowToUi,
  advanceStoryDialog,
  clickNavLocation,
  waitGameplayUnblocked,
  orbitLook,
  ensureOverlaysClear,
  walkUntilRoomMomDoor
};
