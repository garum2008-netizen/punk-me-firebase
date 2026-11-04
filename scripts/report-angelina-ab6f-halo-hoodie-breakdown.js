#!/usr/bin/env node
/** Report-only: classify ab6f browser halo bad px as grey-plate vs light-garment edge (no gate changes). */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { serveStaticDir } = require("./serve-static-root");
const {
  prepareProdHostSimContext,
  installProdFirebaseRouteBlock
} = require("./firebase-test-emulator-guard");

const root = path.join(__dirname, "..");
const ARTIFACTS = "/opt/cursor/artifacts";
const useAb6fBaseline = process.argv.includes("--ab6f");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "data/story/angelina-skin-manifest.json"), "utf8")
);

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("sharp required");
  process.exit(1);
}

function alphaDistanceToClear(data, w, h) {
  const dist = new Int32Array(w * h);
  dist.fill(1e9);
  const q = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (data[i * 4 + 3] <= 0) {
        dist[i] = 0;
        q.push(i);
      }
    }
  }
  let qi = 0;
  while (qi < q.length) {
    const i = q[qi++];
    const x = i % w;
    const y = (i / w) | 0;
    const d = dist[i];
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (dist[ni] > d + 1) {
        dist[ni] = d + 1;
        q.push(ni);
      }
    }
  }
  return dist;
}

function isGreyMattBad(r, g, b) {
  const lum = (r + g + b) / 3;
  const compChroma = Math.max(r, g, b) - Math.min(r, g, b);
  const distGrey = Math.abs(r - lum) + Math.abs(g - lum) + Math.abs(b - lum);
  return distGrey < 10 && lum > 55 && lum < 210 && compChroma < 13;
}

function isLightGarmentSource(sr, sg, sb) {
  const lum = (sr + sg + sb) / 3;
  const compChroma = Math.max(sr, sg, sb) - Math.min(sr, sg, sb);
  if (lum < 168) return false;
  if (Math.min(sr, sg, sb) < 140) return false;
  if (compChroma < 6 || compChroma > 55) return false;
  return true;
}

async function browserUpscale3x(page, baseUrl, relPath, cssW, cssH) {
  const imgUrl = `${baseUrl}/${relPath.replace(/^\//, "")}`;
  const out = await page.evaluate(
    async ({ imgUrl, cssW, cssH }) => {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("image load failed"));
        img.src = imgUrl;
      });
      const scale = 3;
      const canvas = document.createElement("canvas");
      canvas.width = cssW * scale;
      canvas.height = cssH * scale;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
      return { data: Array.from(id.data), w: canvas.width, h: canvas.height };
    },
    { imgUrl, cssW, cssH }
  );
  return { data: Buffer.from(out.data), w: out.w, h: out.h };
}

async function loadSourceBrowser3x(sourceRel, cssW, cssH) {
  const p = path.join(root, sourceRel);
  const { data, info } = await sharp(p)
    .ensureAlpha()
    .resize(cssW * 3, cssH * 3, { kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function classifyBrowserBad(data, w, h, sourceData) {
  const distClear = alphaDistanceToClear(data, w, h);
  let totalBad = 0;
  let greyPlate = 0;
  let lightGarmentEdge = 0;
  const mask = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const i = idx * 4;
      if (data[i + 3] !== 255) continue;
      if (distClear[idx] > 15) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (!isGreyMattBad(r, g, b)) continue;
      totalBad++;
      const sr = sourceData[i];
      const sg = sourceData[i + 1];
      const sb = sourceData[i + 2];
      if (isLightGarmentSource(sr, sg, sb)) {
        lightGarmentEdge++;
        mask[idx] = 2;
      } else {
        greyPlate++;
        mask[idx] = 1;
      }
    }
  }
  return { totalBad, greyPlate, lightGarmentEdge, mask, distClear };
}

async function saveBreakdownCrop(data, w, h, mask, x0, y0, cw, ch, outPath) {
  const out = Buffer.alloc(cw * ch * 4);
  for (let dy = 0; dy < ch; dy++) {
    for (let dx = 0; dx < cw; dx++) {
      const x = x0 + dx;
      const y = y0 + dy;
      const oi = (dy * cw + dx) * 4;
      if (x < 0 || y < 0 || x >= w || y >= h) {
        out[oi + 3] = 255;
        continue;
      }
      const idx = y * w + x;
      const i = idx * 4;
      out[oi] = data[i];
      out[oi + 1] = data[i + 1];
      out[oi + 2] = data[i + 2];
      out[oi + 3] = 255;
      if (mask[idx] === 1) {
        out[oi] = 255;
        out[oi + 1] = 60;
        out[oi + 2] = 60;
      } else if (mask[idx] === 2) {
        out[oi] = 60;
        out[oi + 1] = 120;
        out[oi + 2] = 255;
      }
    }
  }
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(out, { raw: { width: cw, height: ch, channels: 4 } }).png().toFile(outPath);
}

(async () => {
  const port = 8899 + Math.floor(Math.random() * 200);
  const srv = await serveStaticDir(root, port);
  const baseUrl = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 3 });
  await prepareProdHostSimContext(context, { prodHostSim: false, firebaseStub: false });
  const page = await context.newPage();
  await installProdFirebaseRouteBlock(page);
  await page.goto(`${baseUrl}/scripts/fixtures/angelina-skin-halo-browser.html`);

  const report = { skins: {}, note: "red=grey-plate bad px, blue=light-garment-edge bad px on browser3x composite" };

  for (const id of ["A", "B", "C"]) {
    const slot = manifest.skins[id].portrait;
    const sourceRel = manifest.skins[id].source.path;
    const shippedRel = useAb6fBaseline
      ? path
          .join("assets/ui/angelina-skins/.baseline-ab6fa", path.basename(slot.path))
          .replace(/\\/g, "/")
      : slot.path;
    const meta = await sharp(path.join(root, shippedRel)).metadata();
    const browser3 = await browserUpscale3x(page, baseUrl, shippedRel, meta.width, meta.height);
    const source3 = await loadSourceBrowser3x(sourceRel, meta.width, meta.height);
    const cls = classifyBrowserBad(browser3.data, browser3.w, browser3.h, source3.data);
    report.skins[id] = {
      portraitPath: shippedRel,
      assetSet: useAb6fBaseline ? "ab6fa302-baseline-copy" : "shipped",
      browserBadPx: cls.totalBad,
      greyPlateBadPx: cls.greyPlate,
      lightGarmentEdgeBadPx: cls.lightGarmentEdge,
      lightGarmentShareOfBad:
        cls.totalBad > 0 ? Number((cls.lightGarmentEdge / cls.totalBad).toFixed(4)) : 0
    };
    if (id === "B") {
      const x0 = Math.max(0, Math.floor(browser3.w * 0.02));
      const y0 = Math.max(0, Math.floor(browser3.h * 0.55));
      const cw = Math.min(Math.floor(browser3.w * 0.45), browser3.w - x0);
      const ch = Math.min(Math.floor(browser3.h * 0.42), browser3.h - y0);
      const cropPath = path.join(ARTIFACTS, "ab6f-halo-B-portrait-hoodie-breakdown-crop.png");
      await saveBreakdownCrop(browser3.data, browser3.w, browser3.h, cls.mask, x0, y0, cw, ch, cropPath);
      report.skins.B.breakdownCrop = cropPath;
    }
  }

  await browser.close();
  srv.close();
  console.log(JSON.stringify(report, null, 2));
})().catch(e => {
  console.error(String(e.message || e));
  process.exit(1);
});
