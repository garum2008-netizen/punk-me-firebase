/** Loads data/story/quest-table.json — must match docs/release/QUEST_TABLE.md and Roblox QuestTable.lua. */
let catalog = null;

export async function loadQuestCatalog() {
  if (catalog) return catalog;
  const res = await fetch("data/story/quest-table.json");
  catalog = await res.json();
  return catalog;
}

export function getQuestDef(id) {
  return catalog?.quests?.find(q => q.id === id) || null;
}

export function listQuestsByChapter(ch) {
  return (catalog?.quests || []).filter(q => q.chapter === ch && q.type !== "ending");
}

export function listEndings() {
  return (catalog?.quests || []).filter(q => q.type === "ending");
}
