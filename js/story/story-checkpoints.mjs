import { ensureStoryProgressSave } from "./story-save-schema.mjs";

/** Persist chapter checkpoint for t104u save verification (F5 / reload). */
export function recordChapterCheckpoint(player, chapter, detail = {}) {
  const s = ensureStoryProgressSave(player);
  if (!s.checkpoints || typeof s.checkpoints !== "object") s.checkpoints = {};
  const key = String(chapter);
  s.checkpoints[key] = {
    at: Date.now(),
    questId: s.quest?.activeId || null,
    step: s.quest?.step ?? 0,
    ...detail
  };
  s.chapter = Math.max(Number(s.chapter) || 0, Number(chapter) || 0);
  s.mainlineChapter = s.chapter;
}

export function getChapterCheckpoint(player, chapter) {
  const s = ensureStoryProgressSave(player);
  return s.checkpoints?.[String(chapter)] || null;
}
