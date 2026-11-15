/**
 * Build gameplay-time intervals where full-screen modals/sheets dim the canvas.
 * Used by video-luminance-scan to avoid false "near-black void" streaks.
 */
const fs = require("fs");
const path = require("path");

const MODAL_KINDS = ["gangModal", "shopModal", "mapModal", "lifeCh1Wardrobe", "storyDialogSheet"];

function mergeIntervals(intervals) {
  const sorted = intervals
    .filter(iv => iv.end > iv.start)
    .sort((a, b) => a.start - b.start);
  const out = [];
  for (const iv of sorted) {
    const last = out[out.length - 1];
    if (last && iv.start <= last.end + 0.5 && last.kind === iv.kind) {
      last.end = Math.max(last.end, iv.end);
    } else out.push({ ...iv });
  }
  return out;
}

function uiOverlayOpen(ui) {
  if (!ui || typeof ui !== "object") return null;
  if (ui.gangModal) return "gangModal";
  if (ui.shopModal) return "shopModal";
  if (ui.mapModal) return "mapModal";
  if (ui.lifeCh1Wardrobe) return "lifeCh1Wardrobe";
  if (ui.storyDialogSheet || ui.storyDialog) return "storyDialogSheet";
  if (ui.magicModal) return "shopModal";
  if (ui.invModal) return "shopModal";
  return null;
}

function buildIntervalsFromUiSamples(renderDiagSamples = []) {
  const intervals = [];
  let cur = null;
  for (const row of renderDiagSamples) {
    const t = Number(row.tSec);
    if (!Number.isFinite(t)) continue;
    const ui = row.ui || row.diag?.ui;
    const kind = uiOverlayOpen(ui);
    if (kind) {
      if (cur && cur.kind === kind) cur.end = t + 2.5;
      else {
        if (cur) intervals.push(cur);
        cur = { start: Math.max(0, t - 1), end: t + 2.5, kind };
      }
    } else if (cur) {
      intervals.push(cur);
      cur = null;
    }
  }
  if (cur) intervals.push(cur);
  return mergeIntervals(intervals);
}

function buildIntervalsFromInputLog(inputLog = [], scenes = []) {
  const intervals = [];
  const clicks = inputLog.map(e => ({
    tSec: Number(e.tMs) / 1000,
    detail: String(e.detail || ""),
    type: e.type
  }));

  let gangOpen = null;
  let mapOpen = null;
  let shopOpen = null;

  for (const c of clicks) {
    const d = c.detail;
    if (/openModal\(['"]gangModal['"]\)|gang → razor/i.test(d)) gangOpen = c.tSec;
    if (gangOpen != null && (/startNpcFight/i.test(d) || /closeModal\(['"]gangModal['"]\)/i.test(d))) {
      intervals.push({ start: gangOpen, end: c.tSec + 10, kind: "gangModal" });
      gangOpen = null;
    }
    if (/openModal\(['"]shopModal['"]\)|shop open/i.test(d)) shopOpen = c.tSec;
    if (shopOpen != null && (/shop buy|#shopModal .close|closeModal\(['"]shopModal/i.test(d))) {
      intervals.push({ start: shopOpen, end: c.tSec + 4, kind: "shopModal" });
      shopOpen = null;
    }
    if (/openModal\(['"]mapModal['"]\)|map open/i.test(d)) mapOpen = c.tSec;
    if (mapOpen != null && /map travel|goLocation\(/i.test(d)) {
      intervals.push({ start: mapOpen, end: c.tSec + 5, kind: "mapModal" });
      mapOpen = null;
    }
  }
  if (gangOpen != null) intervals.push({ start: gangOpen, end: gangOpen + 45, kind: "gangModal" });
  if (shopOpen != null) intervals.push({ start: shopOpen, end: shopOpen + 35, kind: "shopModal" });
  if (mapOpen != null) intervals.push({ start: mapOpen, end: mapOpen + 25, kind: "mapModal" });

  const ch1Move = Array.isArray(scenes) ? scenes.find(s => s.id === "ch1_move") : null;
  const mirror = Array.isArray(scenes) ? scenes.find(s => s.id === "ch1_mirror") : null;
  const wardrobeDone = Array.isArray(scenes)
    ? scenes.find(s => s.id === "ch1_complete" || s.id === "ch1_save")
    : null;
  const wardrobeStart = ch1Move?.tSec ?? mirror?.tSec;
  if (wardrobeStart != null) {
    intervals.push({
      start: wardrobeStart,
      end: (wardrobeDone?.tSec ?? wardrobeStart) + 8,
      kind: "lifeCh1Wardrobe"
    });
  }

  const step6 = scenes?.find(s => s.id === "onboarding_step_6");
  const step7 = scenes?.find(s => s.id === "onboarding_step_7");
  if (step6?.tSec != null && step7?.tSec != null) {
    for (const c of clicks) {
      if (c.tSec >= step6.tSec && c.tSec <= step7.tSec + 5 && /shop open|openModal\(['"]shopModal/i.test(c.detail)) {
        intervals.push({ start: c.tSec, end: Math.min(step7.tSec + 15, c.tSec + 40), kind: "shopModal" });
      }
    }
  }

  const ch1Save = scenes?.find(s => s.id === "ch1_save");
  const ch1Reentry = scenes?.find(s => s.id === "ch1_reentry");
  if (ch1Save?.tSec != null && ch1Reentry?.tSec != null) {
    intervals.push({
      start: ch1Save.tSec,
      end: ch1Reentry.tSec + 5,
      kind: "sessionReload"
    });
  }

  return mergeIntervals(intervals);
}

function loadInputLogFromTimeline(timeline, videoPath) {
  if (Array.isArray(timeline?.inputLog) && timeline.inputLog.length) return timeline.inputLog;
  const explicit = timeline?.inputLogPath;
  if (explicit && fs.existsSync(explicit)) {
    try {
      const raw = JSON.parse(fs.readFileSync(explicit, "utf8"));
      if (Array.isArray(raw)) return raw[0]?.inputLog || raw;
      return raw.inputLog || [];
    } catch (_) {}
  }
  if (!videoPath) return [];
  const base = path.basename(videoPath);
  const m = base.match(/desktop-([a-f0-9]{7,12})-/i);
  const pass = base.match(/pass-t209-ch1-full/i) ? "pass-t209-ch1-full" : "pass-t209-ch1-full";
  if (!m) return [];
  const ice = path.dirname(videoPath);
  const guess = path.join(ice, `ice-ordinary-input-log-${m[1]}-${pass}.json`);
  if (!fs.existsSync(guess)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(guess, "utf8"));
    return Array.isArray(raw) ? raw[0]?.inputLog || [] : raw.inputLog || [];
  } catch (_) {
    return [];
  }
}

function buildModalIntervals(timeline, videoPath) {
  const fromUi = buildIntervalsFromUiSamples(timeline?.renderDiagSamples || []);
  const inputLog = loadInputLogFromTimeline(timeline, videoPath);
  const fromLog = buildIntervalsFromInputLog(inputLog, timeline?.scenes || []);
  return mergeIntervals([...fromUi, ...fromLog]);
}

function modalAtTime(tSec, intervals, padSec = 0) {
  for (const iv of intervals) {
    if (tSec >= iv.start - padSec && tSec < iv.end + padSec) return iv.kind;
  }
  return null;
}

module.exports = {
  MODAL_KINDS,
  buildModalIntervals,
  modalAtTime,
  uiOverlayOpen,
  buildIntervalsFromInputLog,
  buildIntervalsFromUiSamples,
  loadInputLogFromTimeline
};