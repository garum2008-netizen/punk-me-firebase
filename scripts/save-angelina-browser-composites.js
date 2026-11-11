#!/usr/bin/env node
/** Save 3× browser portrait+world composites on #111 and white. */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { serveStaticDir } = require("./serve-static-root");
const {
  prepareProdHostSimContext,
  installProdFirebaseRouteBlock
} = require("./firebase-test-emulator-guard");

const root = path.join(__dirname, "..");
const ARTIFACTS = process.env.ANGELINA_COMPOSITE_OUT || "/opt/cursor/artifacts";
const manifestPath =
  process.env.ANGELINA_COMPOSITE_MANIFEST ||
  path.join(root, "data/story/angelina-skin-manifest.json");
const namePrefix = process.env.ANGELINA_COMPOSITE_NAME_PREFIX || "halo";
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("sharp required");
  process.exit(1);
}

async function saveCompositeCrop(page, baseUrl, relPath, cssW, cssH, bgHex, outPath) {
  const imgUrl = `${baseUrl}/${relPath.replace(/^\//, "")}`;
  const png = await page.evaluate(
    async ({ imgUrl, cssW, cssH, bgHex }) => {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("load"));
        img.src = imgUrl;
      });
      const scale = 3;
      const cw = cssW * scale;
      const ch = cssH * scale;
      const canvas = document.createElement("canvas");
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = bgHex;
      ctx.fillRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, cw, ch);
      return canvas.toDataURL("image/png");
    },
    { imgUrl, cssW, cssH, bgHex }
  );
  const b64 = png.replace(/^data:image\/png;base64,/, "");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
}

(async () => {
  const port = 8788 + Math.floor(Math.random() * 200);
  const srv = await serveStaticDir(root, port);
  const baseUrl = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 3 });
  await prepareProdHostSimContext(context, { prodHostSim: false, firebaseStub: false });
  const page = await context.newPage();
  await installProdFirebaseRouteBlock(page);
  await page.goto(`${baseUrl}/scripts/fixtures/angelina-skin-halo-browser.html`);

  for (const id of ["A", "B", "C"]) {
    for (const kind of ["portrait", "world"]) {
      const slot = manifest.skins[id][kind];
      const meta = await sharp(path.join(root, slot.path)).metadata();
      for (const [bg, suffix] of [
        ["#111111", "111"],
        ["#ffffff", "white"]
      ]) {
        await saveCompositeCrop(
          page,
          baseUrl,
          slot.path,
          meta.width,
          meta.height,
          bg,
          path.join(ARTIFACTS, `${namePrefix}-${id}-${kind}-browser-${suffix}.png`)
        );
      }
    }
  }

  await browser.close();
  srv.close();
  console.log("save-angelina-browser-composites: ok");
})().catch(e => {
  console.error(e);
  process.exit(1);
});
