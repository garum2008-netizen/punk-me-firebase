/**
 * Three canonical endings — ids match docs/release/QUEST_TABLE.md + Roblox QuestTable.lua.
 */
import { grantRewardOnce, ensureStoryProgressSave } from "./story-save-schema.mjs";

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
  st.ending = def.id;
  st.flags.postgame = true;
  st.flags.ending_chosen = true;
  grantRewardOnce(player, def.rewardId, () => {
    if (canonical === "ending_break_curse") st.flags.zombina_npc = true;
    if (canonical === "ending_zombie_style") st.flags.castle_club = true;
    if (canonical === "ending_count_deal") st.flags.night_shop = true;
  });
  hooks?.save?.();
  const title = typeof hooks?.t === "function" ? hooks.t(def.titleKey) : def.id;
  hooks?.toast?.(hooks.L?.({ ru: "Финал: ", en: "Ending: ", da: "Afslutning: " }) + title);
  document.getElementById("endingChoice")?.classList.remove("active");
  return true;
}

window.StoryEndings = { ENDINGS, showEndingChoice, applyEnding };
