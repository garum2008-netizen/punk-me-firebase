/** Life Ch1 companion skin + player render checks (must NOT call syncPlayerLifeCh1Skin). */

function companionHeroMode() {
  return window.me?.lifeCh1?.playerCutout === false;
}

function readCompanionSkinLetter() {
  const st = window.me?.lifeCh1;
  return st?.companionAngelinaSkin || st?.angelinaSkin;
}

function skinRenderOk(skinLetter) {
  if (readCompanionSkinLetter() !== skinLetter) return false;
  const rs = window.World3D?.getPlayerLifeCh1SkinRenderState?.();
  if (!rs) return false;
  if (companionHeroMode()) {
    return !rs.spriteVisible && rs.rootHidden === false;
  }
  const slug = `angelina-teen-${skinLetter}`;
  const hit = rs.url.includes(slug) || rs.mapSrc.includes(slug);
  return hit && rs.textureReady && rs.spriteVisible && rs.rootHidden && rs.sceneAttached !== false;
}

async function waitUntilSkinRendered(page, skinLetter, timeoutMs = 60000) {
  await page.waitForFunction(
    letter => {
      const st = window.me?.lifeCh1;
      const skin = st?.companionAngelinaSkin || st?.angelinaSkin;
      if (skin !== letter) return false;
      const rs = window.World3D?.getPlayerLifeCh1SkinRenderState?.();
      if (!rs) return false;
      if (st?.playerCutout === false) {
        return !rs.spriteVisible && rs.rootHidden === false;
      }
      const slug = `angelina-teen-${letter}`;
      const hit = rs.url.includes(slug) || rs.mapSrc.includes(slug);
      return hit && rs.textureReady && rs.spriteVisible && rs.rootHidden && rs.sceneAttached !== false;
    },
    skinLetter,
    { timeout: timeoutMs, polling: 250 }
  );
}

async function assertSkinRenderNow(page, skinLetter, label) {
  const rs = await page.evaluate(letter => {
    const st = window.me?.lifeCh1;
    const skin = st?.companionAngelinaSkin || st?.angelinaSkin;
    const state = window.World3D?.getPlayerLifeCh1SkinRenderState?.();
    return {
      skin,
      playerCutout: st?.playerCutout,
      state
    };
  }, skinLetter);
  const st = rs.state;
  if (rs.skin !== skinLetter || !st) {
    throw new Error(`skin render [${label}]: bad skin/state ${JSON.stringify(rs)}`);
  }
  if (rs.playerCutout === false) {
    if (st.spriteVisible || st.rootHidden) {
      throw new Error(`companion hero render [${label}]: ${JSON.stringify(st)}`);
    }
    return;
  }
  const slug = `angelina-teen-${skinLetter}`;
  const hit = st.url.includes(slug) || st.mapSrc.includes(slug);
  if (!hit || !st.textureReady || !st.spriteVisible || !st.rootHidden || st.sceneAttached === false) {
    throw new Error(`skin render [${label}]: ${JSON.stringify(st)}`);
  }
}

async function assertSkinAfterReloadSchedule(page, skinLetter, timeoutMs = 15000) {
  await page.waitForFunction(
    () =>
      typeof window.World3D?.getPlayerLifeCh1SkinRenderState === "function" &&
      window.__playerLoaded === true,
    undefined,
    { timeout: 60000 }
  );
  await waitUntilSkinRendered(page, skinLetter, timeoutMs);
  await assertSkinRenderNow(page, skinLetter, "after reload (texture ready)");
}

module.exports = {
  waitUntilSkinRendered,
  assertSkinRenderNow,
  assertSkinAfterReloadSchedule
};
