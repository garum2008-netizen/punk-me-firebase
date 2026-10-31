/**
 * Angelina skin manifest (t569u) — single source for portrait/world asset paths + sha256.
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

export function portraitUrl(skinId, man = manifest) {
  const e = getSkinEntry(skinId, man);
  return e?.portrait || "assets/ui/angelina-skins/placeholder-a.svg";
}

export function worldUrl(skinId, man = manifest) {
  const e = getSkinEntry(skinId, man);
  return e?.world || e?.portrait || "assets/ui/angelina-skins/placeholder-a.svg";
}

/** Node + optional browser verify (hex sha256, lowercase). */
export async function verifySkinAssetSha256(skinId, man = manifest) {
  const entry = getSkinEntry(skinId, man);
  if (!entry?.sha256 || !entry.portrait) return { ok: false, reason: "missing manifest fields" };
  const path = entry.portrait.startsWith("/") ? entry.portrait.slice(1) : entry.portrait;
  let buf;
  if (typeof window === "undefined") {
    const fs = await import("node:fs");
    const p = new URL(`../../${path}`, import.meta.url);
    buf = fs.readFileSync(p);
  } else {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) return { ok: false, reason: `fetch ${res.status}` };
    buf = new Uint8Array(await res.arrayBuffer());
  }
  const hex = await sha256Hex(buf);
  const ok = hex === entry.sha256.toLowerCase();
  return { ok, hex, expected: entry.sha256, path: entry.portrait };
}

async function sha256Hex(data) {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    const hash = await crypto.subtle.digest("SHA-256", ab);
    return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  const crypto = await import("node:crypto");
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function readSelectedSkin(lifeCh1) {
  return normalizeSkinId(lifeCh1?.angelinaSkin);
}

export function writeSelectedSkin(lifeCh1, skinId) {
  if (!lifeCh1) return "A";
  lifeCh1.angelinaSkin = normalizeSkinId(skinId);
  return lifeCh1.angelinaSkin;
}
