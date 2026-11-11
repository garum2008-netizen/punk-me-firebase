import * as THREE from "three";

/** Hue targets for accent pixels (pink/magenta in albedo). */
export const ACCENT_HUES = {
  pink: 0.92,
  teal: 0.52,
  green: 0.35,
  orange: 0.08
};

const accentTexCache = new Map();

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      default: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  ];
}

function isAccentPixel(r, g, b) {
  const { h, s, l } = rgbToHsl(r, g, b);
  if (s < 0.38 || l < 0.12 || l > 0.92) return false;
  const isMagenta = h > 0.72 && h < 0.98;
  const hotPink = r > 140 && b > 100 && g < r * 0.72;
  return isMagenta || hotPink;
}

export function hueShiftAccentTexture(sourceTex, accentKey) {
  const hue = ACCENT_HUES[accentKey] ?? ACCENT_HUES.pink;
  const cacheKey = `${sourceTex.uuid}:${accentKey}`;
  if (accentTexCache.has(cacheKey)) return accentTexCache.get(cacheKey);

  const img = sourceTex.image;
  if (!img?.width) return sourceTex;

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.data.length; i += 4) {
    const r = data.data[i];
    const g = data.data[i + 1];
    const b = data.data[i + 2];
    if (!isAccentPixel(r, g, b)) continue;
    const { s, l } = rgbToHsl(r, g, b);
    const [nr, ng, nb] = hslToRgb(hue, s, l);
    data.data[i] = nr;
    data.data[i + 1] = ng;
    data.data[i + 2] = nb;
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = sourceTex.flipY ?? false;
  tex.needsUpdate = true;
  if (sourceTex.wrapS) tex.wrapS = sourceTex.wrapS;
  if (sourceTex.wrapT) tex.wrapT = sourceTex.wrapT;
  accentTexCache.set(cacheKey, tex);
  return tex;
}

export function accentForActor(characterId, actorId) {
  if (actorId === "player") return null;
  const byChar = {
    mohawk: "teal",
    cobalt: "green",
    ghost: "orange",
    vienna: "pink",
    razor: "orange",
    gravedigger: "orange"
  };
  if (byChar[characterId]) return byChar[characterId];
  if (actorId.startsWith("demo_")) {
    return actorId.includes("mohawk") ? "green" : "orange";
  }
  const keys = ["teal", "green", "orange", "pink"];
  let h = 0;
  const s = `${characterId}:${actorId}`;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return keys[h % keys.length];
}
