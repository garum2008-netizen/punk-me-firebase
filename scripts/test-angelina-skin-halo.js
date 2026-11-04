#!/usr/bin/env node
/** Shipped skins vs approved source (committed assets only — no rembg at test runtime). */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { chromium } = require("playwright");
const { serveStaticDir } = require("./serve-static-root");
const {
  prepareProdHostSimContext,
  installProdFirebaseRouteBlock
} = require("./firebase-test-emulator-guard");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "data/story/angelina-skin-manifest.json"), "utf8")
);
const ARTIFACTS = "/opt/cursor/artifacts";

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("FAIL: sharp required");
  process.exit(1);
}

async function loadRgba(rel, scale = 1) {
  const p = path.join(root, rel);
  let pipe = sharp(p).ensureAlpha();
  if (scale !== 1) {
    const meta = await sharp(p).metadata();
    pipe = pipe.resize(Math.round(meta.width * scale), Math.round(meta.height * scale), {
      kernel: sharp.kernel.lanczos3
    });
  }
  const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

async function loadSourceAtSize(sourceRel, w, h) {
  const p = path.join(root, sourceRel);
  const { data, info } = await sharp(p)
    .ensureAlpha()
    .resize(w, h, { kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function laplacianVariance(data, w, h) {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 200) continue;
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const li = ((y - 1) * w + x) * 4;
      const ri = ((y + 1) * w + x) * 4;
      const ti = (y * w + (x - 1)) * 4;
      const bi = (y * w + (x + 1)) * 4;
      const lap =
        4 * lum -
        (0.299 * data[li] + 0.587 * data[li + 1] + 0.114 * data[li + 2]) -
        (0.299 * data[ri] + 0.587 * data[ri + 1] + 0.114 * data[ri + 2]) -
        (0.299 * data[ti] + 0.587 * data[ti + 1] + 0.114 * data[ti + 2]) -
        (0.299 * data[bi] + 0.587 * data[bi + 1] + 0.114 * data[bi + 2]);
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (n < 10) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

function isEdge(data, w, h, x, y, clear = 20) {
  const a = data[(y * w + x) * 4 + 3];
  if (a <= 0) return false;
  if (a < 255) return true;
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return true;
    if (data[(ny * w + nx) * 4 + 3] < clear) return true;
  }
  return false;
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

function interiorRgbSha256(data, w, h) {
  const hsh = crypto.createHash("sha256");
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] !== 255) continue;
      hsh.update(Buffer.from([data[i], data[i + 1], data[i + 2]]));
    }
  }
  return hsh.digest("hex");
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
  let failed = 0;
  const port = 8765 + Math.floor(Math.random() * 500);
  const srv = await serveStaticDir(root, port);
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 3 });
  await prepareProdHostSimContext(context, { prodHostSim: false, firebaseStub: false });
  const page = await context.newPage();
  await installProdFirebaseRouteBlock(page);
  await page.goto(`${baseUrl}/scripts/fixtures/angelina-skin-halo-browser.html`);

  const haloReport = [];
  for (const id of ["A", "B", "C"]) {
    const model = manifest.skins[id].rembgModel || "(unset)";
    console.log(`SKIN ${id} rembgModel=${model}`);
  }

  for (const id of ["A", "B", "C"]) {
    const sourceRel = manifest.skins[id].source.path;
    for (const kind of ["portrait", "world"]) {
      const slot = manifest.skins[id][kind];
      const shipped = await loadRgba(slot.path);
      const sourceAt = await loadSourceAtSize(sourceRel, shipped.w, shipped.h);

      let fg = 0;
      let interior255 = 0;
      for (let y = 0; y < shipped.h; y++) {
        for (let x = 0; x < shipped.w; x++) {
          const i = (y * shipped.w + x) * 4;
          const a = shipped.data[i + 3];
          if (a < 128) continue;
          fg++;
          if (a === 255) interior255++;
        }
      }
      if (fg && interior255 / fg < 0.9) {
        console.error(`FAIL: ${id} ${kind} interior alpha255 share ${((100 * interior255) / fg).toFixed(1)}% < 90%`);
        failed++;
      }
      const shippedSha = interiorRgbSha256(shipped.data, shipped.w, shipped.h);
      if (slot.interiorRgbSha256 && shippedSha !== slot.interiorRgbSha256) {
        console.error(`FAIL: ${id} ${kind} interiorRgbSha256 drift`);
        failed++;
      }
      const refVar = laplacianVariance(sourceAt.data, sourceAt.w, sourceAt.h);
      const shipVar = laplacianVariance(shipped.data, shipped.w, shipped.h);
      if (refVar > 1 && shipVar / refVar < 0.9) {
        console.error(`FAIL: ${id} ${kind} Laplacian sharpness ratio ${(shipVar / refVar).toFixed(3)} < 0.9`);
        failed++;
      }

      let softInterior = 0;
      for (let y = 0; y < shipped.h; y++) {
        for (let x = 0; x < shipped.w; x++) {
          const i = (y * shipped.w + x) * 4;
          const a = shipped.data[i + 3];
          if (a < 128) continue;
          if (isEdge(shipped.data, shipped.w, shipped.h, x, y, 8)) continue;
          if (a !== 255) softInterior++;
        }
      }
      if (softInterior > 0) {
        console.error(`FAIL: ${id} ${kind} interior alpha not 255 (${softInterior} px)`);
        failed++;
      }

      const shipped3 = await loadRgba(slot.path, 3);
      const lanczos = countBgOpaqueBand(shipped3.data, shipped3.w, shipped3.h);
      const browser3 = await browserUpscale3x(page, baseUrl, slot.path, shipped.w, shipped.h);
      const browser = countBgOpaqueBand(browser3.data, browser3.w, browser3.h);

      console.log(
        `HALO ${id} ${kind}: lanczos3x badPx=${lanczos.bgOpaqueBand} (band ${lanczos.bandCandidates}); browser3x badPx=${browser.bgOpaqueBand} (band ${browser.bandCandidates})`
      );
      haloReport.push({ id, kind, lanczos, browser });

      if (browser.bgOpaqueBand > 0) {
        console.error(
          `FAIL: ${id} ${kind} opaque source-bg band within 15px of edge @browser3x (${browser.bgOpaqueBand} px, band ${browser.bandCandidates})`
        );
        failed++;
      }
      if (kind === "portrait") {
        fs.mkdirSync(ARTIFACTS, { recursive: true });
        await saveCompositeCrop(
          page,
          baseUrl,
          slot.path,
          shipped.w,
          shipped.h,
          "#111111",
          path.join(ARTIFACTS, `halo-${id}-portrait-browser-111.png`)
        );
        await saveCompositeCrop(
          page,
          baseUrl,
          slot.path,
          shipped.w,
          shipped.h,
          "#ffffff",
          path.join(ARTIFACTS, `halo-${id}-portrait-browser-white.png`)
        );
      }
    }
  }

  await browser.close();
  srv.close();

  if (failed) process.exit(1);
  console.log("test-angelina-skin-halo: PASS");
})().catch(e => {
  console.error("test-angelina-skin-halo: FAIL", e);
  process.exit(1);
});
