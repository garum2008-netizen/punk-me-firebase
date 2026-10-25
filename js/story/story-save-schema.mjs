/** Story progress fields required by STORY_ENDINGS_TZ §6 — merge-safe on load/save. */

const QUEST_ID_ALIASES = {
  q_hangout_build: "q_ch2_hangout",
  q4_graph_confession: "q_ch4_castle"
};

const ENDING_ALIASES = {
  lift_curse: "ending_break_curse",
  break_curse: "ending_break_curse",
  zombie_style: "ending_zombie_style",
  deal_count: "ending_count_deal",
  count_deal: "ending_count_deal"
};

function migrateQuestAndEndingIds(s) {
  const q = s.quest;
  if (q?.completed && typeof q.completed === "object") {
    for (const [oldId, newId] of Object.entries(QUEST_ID_ALIASES)) {
      if (q.completed[oldId]) {
        q.completed[newId] = true;
        delete q.completed[oldId];
      }
    }
  }
  if (q?.activeId && QUEST_ID_ALIASES[q.activeId]) {
    q.activeId = QUEST_ID_ALIASES[q.activeId];
  }
  if (s.ending && ENDING_ALIASES[s.ending]) {
    s.ending = ENDING_ALIASES[s.ending];
  }
}

export function ensureStoryProgressSave(player) {
  if (!player.story || typeof player.story !== "object") {
    player.story = {};
  }
  const s = player.story;
  if (typeof s.chapter !== "number") s.chapter = 0;
  if (!s.quest || typeof s.quest !== "object") {
    s.quest = { activeId: null, step: 0, completed: {} };
  }
  if (!s.quest.completed || typeof s.quest.completed !== "object") s.quest.completed = {};
  if (!s.rewardsGiven || typeof s.rewardsGiven !== "object") s.rewardsGiven = {};
  if (!s.rewardsGranted || typeof s.rewardsGranted !== "object") s.rewardsGranted = {};
  Object.assign(s.rewardsGranted, s.rewardsGiven);
  if (!s.decisions || typeof s.decisions !== "object") s.decisions = {};
  if (!s.rel || typeof s.rel !== "object") s.rel = { gang_rust: 0, zombie: 0, count: 0 };
  if (!s.unique || typeof s.unique !== "object") s.unique = {};
  if (!s.flags || typeof s.flags !== "object") s.flags = {};
  if (s.ending != null && typeof s.ending !== "string") delete s.ending;
  migrateQuestAndEndingIds(s);
  return s;
}

/** Grant reward once; returns true if newly granted. */
export function grantRewardOnce(player, rewardId, applyFn) {
  const s = ensureStoryProgressSave(player);
  if (s.rewardsGiven[rewardId]) return false;
  s.rewardsGiven[rewardId] = Date.now();
  applyFn?.(player, s);
  return true;
}
