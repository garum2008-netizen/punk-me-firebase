#!/usr/bin/env node
/** Owner A contour PREVIEW comparisons + 8x crops (not shipped). */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");
const { serveStaticDir } = require("./serve-static-root");
const {
  prepareProdHostSimContext,
  installProdFirebaseRouteBlock,
} = require("./firebase-test-emulator-guard");

const root = path.join(__dirname, "..");
const STORE =
  process.env.HALO_OWNER_REVIEW_STORE ||
  "/cursor/stores/self/t179-halo-owner-review-f174622";
const OUT = path.join(STORE, "contour-comparison-17fc69d");

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("sharp required");
  process.exit(1);
}

const PORTRAIT = {
  source: path.join(root, "assets/ui/angelina-skins/source/angelina-teen-A.png"),
  shipped: path.join(root, "assets/ui/angelina-skins/shipped/angelina-teen-A-portrait.webp"),
  frozen: path.join(STORE, "frozen-candidate-f174622-webp/angelina-teen-A-portrait.webp"),
  oldPreview: path.join(STORE, "preview-only/angelina-teen-A-portrait-edge-preview-f174622.webp"),
  contour: path.join(STORE, "preview-contour-a-17fc69d/angelina-teen-A-portrait-contour-preview-17fc69d.webp"),
  serveRel: "assets/ui/angelina-skins/.owner-review-serve/contour_compare/angelina-teen-A-portrait-contour-preview-17fc69d.webp",
};

async function findHandCenter(rgbaPath) {
  const { data, info } = await sharp(rgbaPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  let best = { x: Math.floor(w * 0.65), y: Math.floor(h * 0.28), score: -1 };
  const half = 36;
  for (let cy = Math.floor(h * 0.12); cy < Math.floor(h * 0.55); cy += 8) {
    for (let cx = Math.floor(w * 0.35); cx < Math.floor(w * 0.92); cx += 8) {
      let score = 0;
      for (let dy = -half; dy < half; dy += 2) {
        for (let dx = -half; dx < half; dx += 2) {
          const x = cx + dx;
          const y = cy + dy;
          if (x < 0 || y < 0 || x >= w || y >= h) continue;
          const a = data[(y * w + x) * 4 + 3];
          if (a >= 24 && a < 245) score += 2;
          if (a >= 245) score += 1;
        }
      }
      if (score > best.score) best = { x: cx, y: cy, score };
    }
  }
  return best;
}

const CROP_SPOTS = {
  hair: (w, h) => ({ x: Math.floor(w * 0.48), y: Math.floor(h * 0.1) }),
  jacket: (w, h) => ({ x: Math.floor(w * 0.42), y: Math.floor(h * 0.52) }),
  shoe: (w, h) => ({ x: Math.floor(w * 0.5), y: Math.floor(h * 0.88) }),
};

async function crop8x(srcPath, outPath, cx, cy, half = 40) {
  const meta = await sharp(srcPath).metadata();
  const w = meta.width;
  const h = meta.height;
  const left = Math.max(0, Math.min(w - 1, cx - half));
  const top = Math.max(0, Math.min(h - 1, cy - half));
  const width = Math.min(half * 2, w - left);
  const height = Math.min(half * 2, h - top);
  const crop = await sharp(srcPath).extract({ left, top, width, height }).toBuffer();
  await sharp(crop)
    .resize(width * 8, height * 8, { kernel: sharp.kernel.nearest })
    .png()
    .toFile(outPath);
}

async function flatOnBg(srcPath, outPath, bg) {
  const meta = await sharp(srcPath).metadata();
  await sharp({
    create: {
      width: meta.width,
      height: meta.height,
      channels: 3,
      background: bg === "white" ? "#ffffff" : "#111111",
    },
  })
    .composite([{ input: await sharp(srcPath).toBuffer() }])
    .png()
    .toFile(outPath);
}

async function rowComposite(paths, labels, outPath, tileW) {
  const maxH = 0;
  const parts = [];
  for (const p of paths) {
    const { data, info } = await sharp(p).resize(tileW).toBuffer({ resolveWithObject: true });
    parts.push({ data, info });
  }
  const H = Math.max(...parts.map(p => p.info.height));
  const W = tileW * parts.length;
  const layers = parts.map((p, i) => ({
    input: p.data,
    left: i * tileW,
    top: Math.floor((H - p.info.height) / 2),
  }));
  await sharp({
    create: { width: W, height: H, channels: 3, background: { r: 32, g: 32, b: 40 } },
  })
    .composite(layers)
    .png()
    .toFile(outPath);
  fs.writeFileSync(`${outPath}.labels.txt`, labels.join(" | "));
}

async function browserComposite(relPath, cssW, cssH, bgHex, outPath) {
  const port = 8790 + Math.floor(Math.random() * 100);
  const srv = await serveStaticDir(root, port);
  const baseUrl = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 3 });
  await prepareProdHostSimContext(context, { prodHostSim: false, firebaseStub: false });
  const page = await context.newPage();
  await installProdFirebaseRouteBlock(page);
  await page.goto(`${baseUrl}/scripts/fixtures/angelina-skin-halo-browser.html`);
  const imgUrl = `${baseUrl}/${relPath.replace(/^\//, "")}`;
  const png = await page.evaluate(
    async ({ imgUrl, cssW, cssH, bgHex }) => {
      const img = new Image();
      await new Promise((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("load"));
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
  await browser.close();
  srv.close();
  const b64 = png.replace(/^data:image\/png;base64,/, "");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const serveDir = path.join(root, "assets/ui/angelina-skins/.owner-review-serve/contour_compare");
  fs.mkdirSync(serveDir, { recursive: true });
  const contourSrc = PORTRAIT.contour;
  if (!fs.existsSync(contourSrc)) {
    console.error("missing contour preview — run preview-angelina-a-contour-owner.py first");
    process.exit(1);
  }
  fs.copyFileSync(contourSrc, path.join(serveDir, path.basename(contourSrc)));

  const metaP = await sharp(PORTRAIT.shipped).metadata();
  const fullRow = [
    [PORTRAIT.source, "approved-source"],
    [PORTRAIT.shipped, "shipped-ab6fa"],
    [PORTRAIT.frozen, "frozen-candidate-f174622"],
    [PORTRAIT.contour, "contour-preview-17fc69d"],
  ].filter(([p]) => fs.existsSync(p));

  await rowComposite(
    fullRow.map(x => x[0]),
    fullRow.map(x => x[1]),
    path.join(OUT, "A-portrait-full-scale-4way.png"),
    280
  );

  const hand = await findHandCenter(PORTRAIT.contour);
  const spots = {
    hand,
    hair: CROP_SPOTS.hair(metaP.width, metaP.height),
    jacket: CROP_SPOTS.jacket(metaP.width, metaP.height),
    shoe: CROP_SPOTS.shoe(metaP.width, metaP.height),
  };

  for (const [spot, center] of Object.entries(spots)) {
    const cx = center.x;
    const cy = center.y;
    const cropDir = path.join(OUT, `8x-${spot}`);
    fs.mkdirSync(cropDir, { recursive: true });
    for (const [p, label] of [
      [PORTRAIT.frozen, "frozen"],
      [PORTRAIT.oldPreview, "edge-preview-f174622"],
      [PORTRAIT.contour, "contour-preview"],
    ]) {
      if (!fs.existsSync(p)) continue;
      for (const bg of ["white", "111"]) {
        const flat = path.join(cropDir, `${label}-flat-${bg}.png`);
        const flatSrc = path.join(cropDir, `_flat_src_${label}.png`);
        await crop8x(p, flatSrc, cx, cy, spot === "hand" ? 48 : 40);
        await flatOnBg(flatSrc, flat, bg);
        await sharp(flatSrc).resize((await sharp(flatSrc).metadata()).width * 8, (await sharp(flatSrc).metadata()).height * 8, { kernel: "nearest" }).png().toFile(path.join(cropDir, `${label}-8x-${bg}.png`));
      }
    }
    await rowComposite(
      [PORTRAIT.frozen, PORTRAIT.contour].filter(fs.existsSync).concat(
        fs.existsSync(PORTRAIT.oldPreview) ? [PORTRAIT.oldPreview] : []
      ),
      ["frozen", "contour", "old-edge-preview"].slice(0, fullRow.length),
      path.join(cropDir, `${spot}-frozen-vs-contour-row.png`),
      160
    );
  }

  const cmeta = await sharp(contourSrc).metadata();
  for (const bg of [
    ["#ffffff", "white"],
    ["#111111", "111"],
  ]) {
    await browserComposite(
      PORTRAIT.serveRel,
      cmeta.width,
      cmeta.height,
      bg[0],
      path.join(OUT, `browser3x-contour-${bg[1]}.png`)
    );
    await browserComposite(
      "assets/ui/angelina-skins/.owner-review-serve/frozen_candidate_f174622/angelina-teen-A-portrait.webp",
      cmeta.width,
      cmeta.height,
      bg[0],
      path.join(OUT, `browser3x-frozen-${bg[1]}.png`)
    );
  }

  const dump = spawnSync(
    "node",
    [
      path.join(root, "scripts/dump-angelina-halo-bad-px.js"),
      PORTRAIT.serveRel,
      "both",
    ],
    { cwd: root, encoding: "utf8", env: { ...process.env, FIREBASE_EMULATOR: "1" } }
  );
  if (dump.status === 0) {
    fs.writeFileSync(path.join(OUT, "contour-portrait-bad-pixels.json"), dump.stdout);
  }

  console.log("CONTOUR_COMPARISON_OK", OUT);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
