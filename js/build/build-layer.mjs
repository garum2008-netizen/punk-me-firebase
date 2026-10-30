/** PR B — hangout / city plots / crypt placements + save migration. */

const LS_DECOR = "punkme_room_decor_v21";
const MAX_UNDO = 28;

export const CITY_PLOT_DEFS = [
  { id: "plot_shop", label: "Neon shop", type: "shop", x: -4, z: 3, cost: 120 },
  { id: "plot_club", label: "Punk club", type: "club", x: 3, z: -2, cost: 220 },
  { id: "plot_garage", label: "Garage", type: "garage", x: 6, z: 4, cost: 180 }
];

const LIMITS = { room: 16, construction: 24, cemetery: 18 };

export function zoneForLocation(locId) {
  if (locId === "room") return "room";
  if (locId === "construction") return "construction";
  if (locId === "cemetery") return "cemetery";
  return null;
}

export function decorLimit(locId) {
  return LIMITS[zoneForLocation(locId)] ?? 0;
}

function ensureHangout(me) {
  if (!me.hangout || typeof me.hangout !== "object") me.hangout = { placements: [], sitePlacements: [] };
  if (!Array.isArray(me.hangout.placements)) me.hangout.placements = [];
  if (!Array.isArray(me.hangout.sitePlacements)) me.hangout.sitePlacements = [];
}

function ensureCrypt(me) {
  if (!me.crypt || typeof me.crypt !== "object") me.crypt = { placements: [] };
  if (!Array.isArray(me.crypt.placements)) me.crypt.placements = [];
}

function ensureCityPlots(me) {
  if (!Array.isArray(me.cityPlots)) me.cityPlots = [];
  if (me.cityPlots.length === 0) {
    me.cityPlots = CITY_PLOT_DEFS.map(d => ({
      id: d.id,
      type: d.type,
      x: d.x,
      z: d.z,
      cost: d.cost,
      built: false
    }));
  }
}

function ensureUndo(me) {
  if (!me.buildUndo || typeof me.buildUndo !== "object") {
    me.buildUndo = { room: [], construction: [], cemetery: [] };
  }
  ["room", "construction", "cemetery"].forEach(k => {
    if (!Array.isArray(me.buildUndo[k])) me.buildUndo[k] = [];
  });
}

function listRef(me, zone) {
  ensureHangout(me);
  ensureCrypt(me);
  if (zone === "room") return me.hangout.placements;
  if (zone === "construction") return me.hangout.sitePlacements;
  if (zone === "cemetery") return me.crypt.placements;
  return null;
}

export function migrateBuildSave(me) {
  if (!me || typeof me !== "object") return;
  ensureHangout(me);
  ensureCrypt(me);
  ensureCityPlots(me);
  ensureUndo(me);

  if (me.hangout.placements.length === 0) {
    try {
      const ls = JSON.parse(localStorage.getItem(LS_DECOR) || "[]");
      if (Array.isArray(ls) && ls.length) {
        me.hangout.placements = ls.map(it => ({
          type: it.type || "sofa",
          x: Number(it.x) || 0,
          z: Number(it.z ?? it.y) || 0,
          rot: Number(it.rot) || 0,
          color: it.color || null
        }));
      }
    } catch {
      /* ignore */
    }
  }

  if (me.hangout.placements.length === 0 && Array.isArray(me.decor) && me.decor.length) {
    me.hangout.placements = me.decor.map((it, i) => ({
      type: it.type || "poster",
      x: ((it.x ?? 42) - 42) * 0.08,
      z: ((it.y ?? 62) - 62) * 0.08,
      rot: it.rot || 0,
      color: it.color || null
    }));
  }

  const stage = me.story?.hangoutStage;
  if (typeof stage === "number" && stage > 0 && me.hangout.sitePlacements.length === 0) {
    const seed = [
      { type: "neon_sign", x: 0, z: 1, rot: 0 },
      { type: "sofa", x: -2, z: 2, rot: 0 },
      { type: "guitar", x: 2, z: -1, rot: 0.4 }
    ];
    me.hangout.sitePlacements = seed.slice(0, Math.min(stage + 1, seed.length));
  }

  me.cityPlots.forEach(p => {
    const def = CITY_PLOT_DEFS.find(d => d.id === p.id);
    if (def && p.cost == null) p.cost = def.cost;
    if (def && !p.type) p.type = def.type;
  });
}

export function getPlacementList(me, locId) {
  const zone = zoneForLocation(locId);
  if (!zone) return [];
  migrateBuildSave(me);
  const list = listRef(me, zone);
  return list ? [...list] : [];
}

export function pushUndo(me, zone) {
  ensureUndo(me);
  const list = listRef(me, zone);
  if (!list) return;
  const stack = me.buildUndo[zone];
  stack.push(JSON.stringify(list));
  while (stack.length > MAX_UNDO) stack.shift();
}

export function undoPlacement(me, locId) {
  const zone = zoneForLocation(locId);
  if (!zone) return false;
  ensureUndo(me);
  const stack = me.buildUndo[zone];
  if (!stack.length) return false;
  const snap = stack.pop();
  const list = listRef(me, zone);
  if (!list) return false;
  list.length = 0;
  JSON.parse(snap).forEach(it => list.push(it));
  return true;
}

export function setPlacementList(me, locId, items, { recordUndo = true } = {}) {
  const zone = zoneForLocation(locId);
  if (!zone) return false;
  migrateBuildSave(me);
  const list = listRef(me, zone);
  if (!list) return false;
  if (recordUndo) pushUndo(me, zone);
  list.length = 0;
  items.forEach(it => list.push({ ...it }));
  try {
    if (zone === "room") {
      localStorage.setItem(LS_DECOR, JSON.stringify(list));
    }
  } catch {
    /* ignore */
  }
  if (zone === "room") me.decor = list.map((it, i) => ({ type: it.type, x: 42 + it.x * 12, y: 62 + it.z * 12, rot: it.rot }));
  return true;
}

export function purchaseCityPlot(me, plotId) {
  migrateBuildSave(me);
  const plot = me.cityPlots.find(p => p.id === plotId);
  if (!plot || plot.built) return { ok: false, reason: "already" };
  const cost = plot.cost ?? CITY_PLOT_DEFS.find(d => d.id === plotId)?.cost ?? 999;
  if ((me.coins ?? 0) < cost) return { ok: false, reason: "coins" };
  me.coins -= cost;
  plot.built = true;
  return { ok: true, cost };
}

export function snapCoord(v, step = 0.5) {
  return Math.round(v / step) * step;
}

export const SWATCHES = [0xff3399, 0x00ffff, 0xffcc00, 0x88ff44, 0xaa66ff, 0xff6622];

export function cycleSwatch(current) {
  const idx = SWATCHES.indexOf(current);
  const next = idx < 0 ? 0 : (idx + 1) % SWATCHES.length;
  return SWATCHES[next];
}
