/** Passive life-ch1 cutout render checks (must NOT call syncPlayerLifeCh1Skin). */

function skinRenderOk(skinLetter) {
  if (window.me?.lifeCh1?.angelinaSkin !== skinLetter) return false;
  const rs = window.World3D?.getPlayerLifeCh1SkinRenderState?.();
  if (!rs) return false;
  const slug = `angelina-teen-${skinLetter}`;
  const hit = rs.url.includes(slug) || rs.mapSrc.includes(slug);
  return hit && rs.textureReady && rs.spriteVisible && rs.rootHidden;
}

async function waitUntilSkinRendered(page, skinLetter, timeoutMs = 60000) {
  await page.waitForFunction(
    letter => {
      if (window.me?.lifeCh1?.angelinaSkin !== letter) return false;
      const rs = window.World3D?.getPlayerLifeCh1SkinRenderState?.();
      if (!rs) return false;
      const slug = `angelina-teen-${letter}`;
      const hit = rs.url.includes(slug) || rs.mapSrc.includes(slug);
      return hit && rs.textureReady && rs.spriteVisible && rs.rootHidden;
    },
    skinLetter,
    { timeout: timeoutMs, polling: 250 }
  );
}

async function assertSkinRenderNow(page, skinLetter, label) {
  const rs = await page.evaluate(letter => {
    const state = window.World3D?.getPlayerLifeCh1SkinRenderState?.();
    return {
      skin: window.me?.lifeCh1?.angelinaSkin,
      state
    };
  }, skinLetter);
  const slug = `angelina-teen-${skinLetter}`;
  const st = rs.state;
  if (rs.skin !== skinLetter || !st) {
    throw new Error(`skin render [${label}]: bad skin/state ${JSON.stringify(rs)}`);
  }
  const hit = st.url.includes(slug) || st.mapSrc.includes(slug);
  if (!hit || !st.textureReady || !st.spriteVisible || !st.rootHidden) {
    throw new Error(`skin render [${label}]: ${JSON.stringify(st)}`);
  }
}

async function assertSkinAfterReloadSchedule(page, skinLetter) {
  for (const ms of [2000, 10000]) {
    await page.waitForTimeout(ms);
    await assertSkinRenderNow(page, skinLetter, `${ms}ms after reload`);
  }
}

module.exports = {
  waitUntilSkinRendered,
  assertSkinRenderNow,
  assertSkinAfterReloadSchedule
};
