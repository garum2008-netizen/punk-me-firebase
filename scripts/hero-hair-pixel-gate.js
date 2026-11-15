/**
 * Sample stage/capture PNGs for blue-dominant hero hair (not green mohawk).
 */
const sharp = require("sharp");

async function scoreHairColorRegion(pngPath, region = null) {
  const meta = await sharp(pngPath).metadata();
  const w = meta.width || 0;
  const h = meta.height || 0;
  if (!w || !h) return { ok: false, reason: "bad_image" };
  const box =
    region ||
    {
      left: Math.floor(w * 0.32),
      top: Math.floor(h * 0.12),
      width: Math.floor(w * 0.36),
      height: Math.floor(h * 0.42)
    };
  const { data, info } = await sharp(pngPath).extract(box).raw().toBuffer({ resolveWithObject: true });
  let blue = 0;
  let green = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    if (max < 40) continue;
    const sat = max - Math.min(r, g, b);
    if (sat < 28) continue;
    n += 1;
    blue += b;
    green += g;
  }
  if (n < 80) return { ok: false, reason: "too_few_pixels", n, path: pngPath };
  const blueMean = blue / n;
  const greenMean = green / n;
  const ratio = blueMean / Math.max(1, greenMean);
  return {
    ok: ratio >= 1.08 && blueMean >= greenMean + 6,
    blueMean: +blueMean.toFixed(2),
    greenMean: +greenMean.toFixed(2),
    ratio: +ratio.toFixed(3),
    samples: n,
    path: pngPath
  };
}

async function validateHeroStillsWithHairPixels(stills, required = 6) {
  const passes = [];
  const failTags = [];
  for (const s of stills || []) {
    const pl = s.snap?.pl || s.snap?.player || s.snap || {};
    const meshId = s.snap?.meshId || pl.meshHeroId || pl.meshId;
    const accent = pl.accent;
    const metaOk =
      meshId === "mohawk" &&
      (accent === "blue" || accent === "teal") &&
      !!pl.hasWings &&
      pl.usesPinkFallback !== true &&
      pl.meshVisible !== false;
    let pixelOk = false;
    const pngPath = s.pngPath || s.fp;
    if (pngPath && metaOk) {
      try {
        const score = await scoreHairColorRegion(pngPath);
        pixelOk = score.ok;
        s.hairPixel = score;
      } catch (e) {
        s.hairPixel = { ok: false, reason: String(e.message || e) };
      }
    }
    if (metaOk && pixelOk) passes.push(s);
    else failTags.push(s.tag);
  }
  return {
    ok: passes.length >= required,
    required,
    passCount: passes.length,
    tags: passes.map(s => s.tag),
    failTags,
    hairSamples: passes.map(s => s.hairPixel).filter(Boolean)
  };
}

module.exports = {
  scoreHairColorRegion,
  validateHeroStillsWithHairPixels
};