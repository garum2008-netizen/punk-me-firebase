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

const REWARD_COPY = {
  ending_break_curse: {
    title: { ru: "Награда: Снять проклятие", en: "Reward: Break the curse", da: "Belønning" },
    body: {
      ru: "Скин «Звон Колокола», Зомбина в городе, рассвет над башней. Свободная игра открыта.",
      en: "Bell Chime skin, Zombina in the city, dawn over the tower. Free play unlocked.",
      da: "Klokkelyd-skin, fri leg."
    },
    world: {
      ru: "Мир: мягкий рассвет, призраки у Склепа, семья без грима.",
      en: "World: soft dawn, ghosts at the Crypt, family without makeup.",
      da: "Verden: daggry."
    }
  },
  ending_zombie_style: {
    title: { ru: "Награда: Зомби — стиль", en: "Reward: Zombie style", da: "Belønning" },
    body: {
      ru: "Замок-клуб, неоновая сцена, Огонёк ведёт призраков. Свободная игра открыта.",
      en: "Castle club, neon stage, Ember guides ghosts. Free play unlocked.",
      da: "Slot-klub, fri leg."
    },
    world: {
      ru: "Мир: бас с башни, танцпол у стен, вечная ночь в ритме.",
      en: "World: bass from the tower, dance floor by the walls, eternal night in rhythm.",
      da: "Verden: klub."
    }
  },
  ending_count_deal: {
    title: { ru: "Награда: Сделка с Графом", en: "Reward: Deal with the Count", da: "Belønning" },
    body: {
      ru: "Ночная лавка у ворот, защита семьи и призраков. Свободная игра открыта.",
      en: "Night shop at the gate, protection for family and ghosts. Free play unlocked.",
      da: "Natbutik, fri leg."
    },
    world: {
      ru: "Мир: лавка светится у ворот, Граф держит слово.",
      en: "World: shop glows at the gate; the Count keeps his word.",
      da: "Verden: natbutik."
    }
  }
};

function L(obj) {
  const lang = typeof window.getLanguage === "function" ? window.getLanguage() : "ru";
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] || obj.en || obj.ru || "";
}

export function showEndingRewards(endingId, player, hooks) {
  const root = document.getElementById("endingRewards");
  const copy = REWARD_COPY[endingId];
  if (!root || !copy) {
    finishPostgame(player, hooks);
    return;
  }
  root.querySelector(".ending-rewards-title").textContent = L(copy.title);
  root.querySelector(".ending-rewards-body").textContent = L(copy.body);
  root.querySelector(".ending-rewards-world").textContent = L(copy.world);
  root.classList.add("active");
  root.setAttribute("aria-hidden", "false");
  const btn = root.querySelector(".ending-rewards-next");
  btn.onclick = () => {
    window.AudioManager?.playSfx?.("ui_click");
    root.classList.remove("active");
    root.setAttribute("aria-hidden", "true");
    finishPostgame(player, hooks);
  };
}

function finishPostgame(player, hooks) {
  const st = ensureStoryProgressSave(player);
  st.chapter = 4;
  st.mainlineChapter = 4;
  st.flags.postgame = true;
  window.StoryEngine?.renderObjectivePanel?.();
  window.StoryGoalHud?.refresh?.();
  hooks?.toast?.(
    L({
      ru: "История Колокола завершена. Исследуй Тыквоград в свободной игре.",
      en: "The Bell story is complete. Explore Pumpkin City in free play.",
      da: "Historien er færdig. Fri leg."
    })
  );
  hooks?.save?.();
}

export function applyEnding(player, endingId, hooks) {
  const canonical = ENDINGS[endingId] ? endingId : null;
  if (!canonical) return false;
  const def = ENDINGS[canonical];
  const st = ensureStoryProgressSave(player);
  if (st.ending) {
    hooks?.toast?.(L({ ru: "Финал уже выбран", en: "Ending already chosen", da: "Afslutning valgt" }));
    return false;
  }
  const rec = recommendEnding(st);
  st.decisions.ending_pick = canonical;
  if (canonical !== rec) st.decisions.ending_override = true;
  st.ending = def.id;
  st.chapter = 4;
  st.mainlineChapter = 4;
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

window.StoryEndings = { ENDINGS, showEndingChoice, showEndingRewards, applyEnding };
