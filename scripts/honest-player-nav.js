/** Read-only state + UI navigation for honest Playwright runs (no force clicks). */

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
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

async function walkTowardGuide(page, mobile, steps = 90) {
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
  for (let i = 0; i < 8; i++) {
    const intro = page.locator("#chapterIntro.active .chapter-intro-next, #chapterIntro.active .chapter-intro-skip");
    if (!(await intro.count())) break;
    await intro.first().click({ timeout: 5000 });
    await sleep(350);
  }
}

async function dismissHowToUi(page) {
  const ov = page.locator("#howToOverlay.active");
  if (await ov.count()) {
    await page.locator("#howToOverlay .howto-close").click({ timeout: 5000 });
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
  const btn = page.locator(`#navQuick button[onclick="goLocation('${locId}')"]`);
  await btn.click({ timeout: 15000 });
  await page.waitForFunction(id => window.me?.location === id, locId, { timeout: 60000 });
}

module.exports = {
  sleep,
  readGameState,
  readDomText,
  findRawKeys,
  pressInteract,
  walkTowardGuide,
  dismissChapterIntroUi,
  dismissHowToUi,
  advanceStoryDialog,
  clickNavLocation
};
