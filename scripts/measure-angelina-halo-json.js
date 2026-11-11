#!/usr/bin/env node
/** Print JSON halo counts for one shipped WebP (Lanczos + browser 3×). */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { serveStaticDir } = require("./serve-static-root");
const {
  prepareProdHostSimContext,
  installProdFirebaseRouteBlock
} = require("./firebase-test-emulator-guard");

const root = path.join(__dirname, "..");
const rel = process.argv[2];
if (!rel) {
  console.error("usage: measure-angelina-halo-json.js <path-relative-to-repo>");
  process.exit(2);
}

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error('{"error":"sharp required"}');
  process.exit(1);
}

async function loadRgba(abs, scale = 1) {
  let pipe = sharp(abs).ensureAlpha();
  if (scale !== 1) {
    const meta = await sharp(abs).metadata();
    pipe = pipe.resize(Math.round(meta.width * scale), Math.round(meta.height * scale), {
      kernel: sharp.kernel.lanczos3
    });
  }
  const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
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

function countBgOpaqueBand(data, w, h) {
  const distClear = alphaDistanceToClear(data, w, h);
  let bgOpaqueBand = 0;
  let bandCandidates = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const i = idx * 4;
      const a = data[i + 3];
      if (a !== 255) continue;
      if (distClear[idx] > 15) continue;
      bandCandidates++;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (r + g + b) / 3;
      const compChroma = Math.max(r, g, b) - Math.min(r, g, b);
      const distGrey = Math.abs(r - lum) + Math.abs(g - lum) + Math.abs(b - lum);
      const greyMatt = distGrey < 10 && lum > 55 && lum < 210 && compChroma < 13;
      if (greyMatt) bgOpaqueBand++;
    }
  }
  return { bgOpaqueBand, bandCandidates };
}

async function browserUpscale3x(page, baseUrl, relPath, cssW, cssH) {
  const imgUrl = `${baseUrl}/${relPath.replace(/^\//, "")}`;
  const out = await page.evaluate(
    async ({ imgUrl, cssW, cssH }) => {
      const img = new Image();
      img.decoding = "sync";
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

(async () => {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error(JSON.stringify({ error: "missing file", rel }));
    process.exit(1);
  }
  const meta = await sharp(abs).metadata();
  const shipped = await loadRgba(abs, 1);
  const lanczos3 = await loadRgba(abs, 3);
  const lanczos = countBgOpaqueBand(lanczos3.data, lanczos3.w, lanczos3.h);

  const port = 8877 + Math.floor(Math.random() * 200);
  const srv = await serveStaticDir(root, port);
  const baseUrl = `http://127.0.0.1:${port}`;
  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 3 });
  await prepareProdHostSimContext(context, { prodHostSim: false, firebaseStub: false });
  const page = await context.newPage();
  await installProdFirebaseRouteBlock(page);
  await page.goto(`${baseUrl}/scripts/fixtures/angelina-skin-halo-browser.html`);
  const browser3 = await browserUpscale3x(page, baseUrl, rel, meta.width, meta.height);
  const browserCounts = countBgOpaqueBand(browser3.data, browser3.w, browser3.h);
  await browser.close();
  srv.close();

  console.log(JSON.stringify({ lanczos, browser: browserCounts, width: meta.width, height: meta.height }));
})().catch(e => {
  console.error(JSON.stringify({ error: String(e.message || e) }));
  process.exit(1);
});
