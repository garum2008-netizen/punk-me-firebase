/** Guarded quest progress bump. Missing `progress` must not throw (mobile duel). */

export function bumpQuest(quests, questDefs, key, amt = 1) {
  if (!quests || typeof quests !== "object") return { changed: false, completed: false };
  const qid = quests.active;
  const def = questDefs?.[qid];
  if (!qid || !def?.need) return { changed: false, completed: false };
  if (!quests.progress || typeof quests.progress !== "object" || Array.isArray(quests.progress)) {
    quests.progress = {};
  }
  if (!(key in def.need)) return { changed: false, completed: false };
  quests.progress[key] = (quests.progress[key] || 0) + amt;
  const completed = Object.entries(def.need).every(([k, v]) => (quests.progress[k] || 0) >= v);
  return { changed: true, completed };
}
