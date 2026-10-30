require("./lib/require-local-capture.js");
const { chromium } = require("playwright");
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(`${base}/?dev=1&solo=1&v=dbg-framing`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  if (await page.locator("#charSelectConfirm").isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.evaluate(() => {
      document.querySelector('.char-pick[data-id="cobalt"]')?.click();
      document.getElementById("charSelectConfirm")?.click();
    });
  }
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 120000 });
  await page.evaluate(() => {
    document.getElementById("charSelect")?.classList.remove("active");
    goLocation("street");
    syncStage3D?.();
    World3D.resize?.();
  });
  await page.waitForTimeout(3000);
  const info = await page.evaluate(() => {
    World3D.releaseCaptureFrame?.();
    const ok = World3D.snapDialogueNpcShot("mohawk");
    for (let i = 0; i < 6; i++) World3D.renderCaptureFrame?.();
    const m = World3D.measureDialogueFraming("mohawk");
    const c = document.getElementById("stage3d");
    const box = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity], meshes: 0 };
    const visit = root => {
      if (!root) return;
      root.traverse?.(o => {
        if (!o.isMesh || !o.geometry) return;
        o.geometry.computeBoundingBox?.();
        const b = o.geometry.boundingBox;
        if (!b) return;
        const v = new THREE.Vector3();
        const corners = [
          [b.min.x, b.min.y, b.min.z],
          [b.max.x, b.max.y, b.max.z]
        ];
        corners.forEach(([x, y, z]) => {
          v.set(x, y, z).applyMatrix4(o.matrixWorld);
          box.min[0] = Math.min(box.min[0], v.x);
          box.min[1] = Math.min(box.min[1], v.y);
          box.min[2] = Math.min(box.min[2], v.z);
          box.max[0] = Math.max(box.max[0], v.x);
          box.max[1] = Math.max(box.max[1], v.y);
          box.max[2] = Math.max(box.max[2], v.z);
          box.meshes += 0.5;
        });
        box.meshes += 0.5;
      });
    };
    visit(document.__THREE_SCENE__);
    return { ok, m, cw: c?.clientWidth, ch: c?.clientHeight };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
