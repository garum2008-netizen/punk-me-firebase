/** Preview/local city build pieces — validated before save (max 200). */

export const CITY_BUILDS_MAX = 200;

const BUILD_TYPES = new Set(["crypt", "neon_sign", "shack", "poster"]);

export const CITY_BUILD_COORD = Object.freeze({
  xMin: 0,
  xMax: 100,
  yMin: 0,
  yMax: 100
});

const ID_MAX_LEN = 48;

export function isAllowedBuildType(type) {
  return typeof type === "string" && BUILD_TYPES.has(type);
}

export function clampBuildPlacement(x, y) {
  const nx = Number(x);
  const ny = Number(y);
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) {
    return null;
  }
  return {
    x: Math.max(CITY_BUILD_COORD.xMin, Math.min(CITY_BUILD_COORD.xMax, nx)),
    y: Math.max(CITY_BUILD_COORD.yMin, Math.min(CITY_BUILD_COORD.yMax, ny))
  };
}

function normalizeId(raw) {
  if (raw == null) return null;
  const id = String(raw).trim();
  if (!id || id.length > ID_MAX_LEN) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) return null;
  return id;
}

function normalizeTs(raw) {
  const ts = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(ts) || ts < 0) return null;
  return Math.floor(ts);
}

/** @returns {{ type, x, y, id, ts } | null} */
export function normalizeCityBuildEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  const type = raw.type;
  if (!isAllowedBuildType(type)) return null;
  const coords = clampBuildPlacement(raw.x, raw.y);
  if (!coords) return null;
  const id = normalizeId(raw.id);
  if (!id) return null;
  const ts = normalizeTs(raw.ts);
  if (ts == null) return null;
  return { type, x: coords.x, y: coords.y, id, ts };
}

export function sanitizeCityBuildsList(raw, max = CITY_BUILDS_MAX) {
  const cap = Math.max(0, Math.min(CITY_BUILDS_MAX, Number(max) || CITY_BUILDS_MAX));
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (let i = 0; i < raw.length && out.length < cap; i++) {
    const row = normalizeCityBuildEntry(raw[i]);
    if (row) out.push(row);
  }
  return out;
}
