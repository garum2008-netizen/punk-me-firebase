/**
 * Angelina skin manifest (t569u) — source + shipped paths and sha256.
 */

const MANIFEST_URL = "data/story/angelina-skin-manifest.json";
const SKIN_IDS = ["A", "B", "C"];

let manifest = null;

export async function loadAngelinaSkinManifest() {
  if (manifest) return manifest;
  const r = await fetch(MANIFEST_URL, { cache: "no-store" });
  manifest = await r.json();
  return manifest;
}

export function getSkinIds() {
  return SKIN_IDS.slice();
}

export function normalizeSkinId(id) {
  const s = String(id || "A").toUpperCase();
  return SKIN_IDS.includes(s) ? s : "A";
}

export function getSkinEntry(skinId, man = manifest) {
  if (!man?.skins) return null;
  return man.skins[normalizeSkinId(skinId)] || man.skins.A;
}

function assetPath(slot) {
  if (!slot) return null;
  return typeof slot === "string" ? slot : slot.path;
}

export function portraitUrl(skinId, man = manifest) {
  const e = getSkinEntry(skinId, man);
  return assetPath(e?.portrait) || assetPath(e?.source);
}

export function worldUrl(skinId, man = manifest) {
  const e = getSkinEntry(skinId, man);
  return assetPath(e?.world) || portraitUrl(skinId, man);
}

export function readSelectedSkin(lifeCh1) {
  return normalizeSkinId(lifeCh1?.angelinaSkin);
}

export function writeSelectedSkin(lifeCh1, skinId) {
  if (!lifeCh1) return "A";
  lifeCh1.angelinaSkin = normalizeSkinId(skinId);
  return lifeCh1.angelinaSkin;
}
