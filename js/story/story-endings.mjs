/**
 * Three canonical endings — ids match docs/release/QUEST_TABLE.md + Roblox QuestTable.lua.
 */
import { grantRewardOnce, ensureStoryProgressSave } from "./story-save-schema.mjs";
import { annotateEndingChoiceUi, recommendEnding } from "./ending-resolve.mjs";

export const ENDINGS = {
  ending_break_curse: {
    id: "ending_break_curse",
    titleKey: "ending_lift_curse_title",
    previewKey: "ending_lift_curse_preview",
    rewardId: "reward_ending_curse"
  },
  ending_zombie_style: {
    id: "ending_zombie_style",
    titleKey: "ending_zombie_style_title",
    previewKey: "ending_zombie_style_preview",
    rewardId: "reward_ending_zombie"
  },
  ending_count_deal: {
    id: "ending_count_deal",
    titleKey: "ending_deal_count_title",
    previewKey: "ending_deal_count_preview",
    rewardId: "reward_ending_deal"
  }
};

export function showEndingChoice(hooks) {
  const root = document.getElementById("endingChoice");
  if (!root) {
    hooks?.toast?.("Ending UI not mounted — PLANNED castle scene");
    return;
  }
  root.classList.add("active");
  root.setAttribute("aria-hidden", "false");
  const st = ensureStoryProgressSave(window.me);
  annotateEndingChoiceUi(st);
}

export function applyEnding(player, endingId, hooks) {
  const canonical = ENDINGS[endingId] ? endingId : null;
  if (!canonical) return false;
  const def = ENDINGS[canonical];
  const st = ensureStoryProgressSave(player);
  if (st.ending) {
    hooks?.toast?.(hooks.L?.({ ru: "Финал уже выбран", en: "Ending already chosen", da: "Afslutning valgt" }));
    return false;
  }
  const rec = recommendEnding(st);
  st.decisions.ending_pick = canonical;
  if (canonical !== rec) st.decisions.ending_override = true;
  st.ending = def.id;
  st.flags.postgame = true;
  st.flags.ending_chosen = true;
  grantRewardOnce(player, def.rewardId, () => {
    if (canonical === "ending_break_curse") st.flags.zombina_npc = true;
    if (canonical === "ending_zombie_style") st.flags.castle_club = true;
    if (canonical === "ending_count_deal") st.flags.night_shop = true;
  });
  document.getElementById("endingChoice")?.classList.remove("active");
  window.World3D?.applyCastleEndingVisualFromSave?.();
  window.StoryScenes?.playEndingScene?.(def.id, player, hooks);
  return true;
}

window.StoryEndings = { ENDINGS, showEndingChoice, applyEnding };
