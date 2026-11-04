#!/usr/bin/env node
/** List halo-gate bad pixel coordinates (greyMatt in 15px band, a=255). */
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
const mode = process.argv[3] || "lanczos3";
if (!rel) {
  console.error("usage: dump-angelina-halo-bad-px.js <rel-path> [lanczos3|browser3]");
  process.exit(2);
}

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error(JSON.stringify({ error: "sharp required" }));
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

function listBad(data, w, h) {
  const distClear = alphaDistanceToClear(data, w, h);
  const bad = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = y * w + x;
      const i = idx * 4;
      const a = data[i + 3];
      if (a !== 255) continue;
      if (distClear[idx] > 15) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = (r + g + b) / 3;
      const compChroma = Math.max(r, g, b) - Math.min(r, g, b);
      const distGrey = Math.abs(r - lum) + Math.abs(g - lum) + Math.abs(b - lum);
      const greyMatt = distGrey < 10 && lum > 55 && lum < 210 && compChroma < 13;
      if (greyMatt) bad.push({ x, y, r, g, b, a, lum: Math.round(lum), distClear: distClear[idx] });
    }
  }
  return bad;
}

async function loadLanczos3(abs) {
  const meta = await sharp(abs).metadata();
  const { data, info } = await sharp(abs)
    .ensureAlpha()
    .resize(Math.round(meta.width * 3), Math.round(meta.height * 3), { kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, cssW: meta.width, cssH: meta.height };
}

async function loadBrowser3(page, baseUrl, relPath, cssW, cssH) {
  const imgUrl = `${baseUrl}/${relPath.replace(/^\//, "")}`;
  const out = await page.evaluate(
    async ({ imgUrl, cssW, cssH }) => {
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("load"));
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
  let data;
  let w;
  let h;
  if (mode === "browser3") {
    const meta = await sharp(abs).metadata();
    const port = 8811 + Math.floor(Math.random() * 200);
    const srv = await serveStaticDir(root, port);
    const baseUrl = `http://127.0.0.1:${port}`;
    const browser = await chromium.launch();
    const context = await browser.newContext({ deviceScaleFactor: 3 });
    await prepareProdHostSimContext(context, { prodHostSim: false, firebaseStub: false });
    const page = await context.newPage();
    await installProdFirebaseRouteBlock(page);
    await page.goto(`${baseUrl}/scripts/fixtures/angelina-skin-halo-browser.html`);
    const b = await loadBrowser3(page, baseUrl, rel, meta.width, meta.height);
    await browser.close();
    srv.close();
    data = b.data;
    w = b.w;
    h = b.h;
  } else {
    const l = await loadLanczos3(abs);
    data = l.data;
    w = l.w;
    h = l.h;
  }
  const bad = listBad(data, w, h);
  console.log(JSON.stringify({ rel, mode, count: bad.length, pixels: bad.slice(0, 500) }, null, 2));
})().catch(e => {
  console.error(JSON.stringify({ error: String(e.message || e) }));
  process.exit(1);
});
