/**
 * Castle: organ puzzle (candles + notes), concert prep, Count interactions.
 */
import { grantRewardOnce, ensureStoryProgressSave } from "./story-save-schema.mjs";

const ORGAN_SEQUENCE = ["C", "E", "G", "C2", "E2"];

function L(obj) {
  const lang = typeof window.getLanguage === "function" ? window.getLanguage() : "ru";
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[lang] || obj.en || obj.ru || "";
}

function story() {
  return window.StoryEngine?.ensureStoryState?.(window.me) || {};
}

export function getCastleInteractPoint(playerX, playerZ) {
  if (window.me?.location !== "castle") return null;
  const slots = [
    { id: "organ", wx: -6, wz: -9.5, r: 2.2 },
    { id: "stage", wx: 4, wz: 2, r: 2.8 },
    { id: "count", wx: -2, wz: 0, r: 2.5 }
  ];
  for (const s of slots) {
    if (Math.hypot(playerX - s.wx, playerZ - s.wz) < s.r) return s.id;
  }
  const candles = window.World3D?.getCastleCandleSlots?.() || [];
  for (const c of candles) {
    if (Math.hypot(playerX - c.x, playerZ - c.z) < 1.1) return { id: "candle", slot: c.slot, note: c.note };
  }
  return null;
}

export function tryCastleInteract(hooks) {
  const p = window.me;
  if (!p || p.location !== "castle") return false;
  const pl = window.World3D?.getPlayerWorldPos?.();
  if (!pl) return false;
  const hit = getCastleInteractPoint(pl.x, pl.z);
  if (!hit) return false;

  const st = story();

  if (hit.id === "candle" || (hit.slot != null)) {
    return playOrganNote(hit.slot ?? hit, hooks);
  }
  if (hit === "organ" || hit.id === "organ") {
    if (advanceOrganPuzzle(hooks)) return true;
    hooks?.toast?.(
      L({
        ru: "Орган: зажги свечи в порядке нот (подсказка у пола). Нажми E у органа снова для следующей ноты.",
        en: "Organ: light candles in note order. Press E at the organ again for the next note.",
        da: "Orgel: tænd lys i rækkefølge."
      })
    );
    return true;
  }
  if (hit === "stage" || hit.id === "stage") {
    openConcertPrep(hooks);
    return true;
  }
  if (hit === "count" || hit.id === "count") {
    if (st.flags.concert_ready) {
      window.StoryEngine?.openDialogueById?.("dlg_count_confession");
    } else {
      hooks?.toast?.(
        L({
          ru: "Сначала подготовь концерт на сцене.",
          en: "Prepare the concert on stage first.",
          da: "Forbered koncerten først."
        })
      );
    }
    return true;
  }
  return false;
}

/** Lights the next correct organ candle (same rules as candle interact). */
export function advanceOrganPuzzle(hooks) {
  const st = story();
  if (st.unique?.bell_crown) return false;
  const slot = st.organProgress?.length ?? 0;
  if (slot >= ORGAN_SEQUENCE.length) return false;
  playOrganNote({ slot, note: ORGAN_SEQUENCE[slot] }, hooks);
  return true;
}

function playOrganNote(slotInfo, hooks) {
  const st = story();
  if (st.unique?.bell_crown) {
    hooks?.toast?.(L({ ru: "Корона уже у тебя.", en: "You already have the crown.", da: "Du har kronen." }));
    return true;
  }
  const slot = typeof slotInfo === "object" ? slotInfo.slot : slotInfo;
  const note = typeof slotInfo === "object" ? slotInfo.note : ORGAN_SEQUENCE[slot];
  if (!st.organProgress) st.organProgress = [];
  const expected = ORGAN_SEQUENCE[st.organProgress.length];
  if (note !== expected) {
    st.organFails = (st.organFails || 0) + 1;
    st.organProgress = [];
    window.World3D?.resetCastleCandles?.();
    const tier = st.organFails >= 3 ? 3 : st.organFails >= 2 ? 2 : 1;
    const hints = {
      1: { ru: "Неверная нота — начни снова. Первая свеча слева.", en: "Wrong note — start again. First candle on the left.", da: "Forkert note." },
      2: { ru: "Порядок: До — Ми — Соль — До — Ми (C E G C E).", en: "Order: C E G C E.", da: "C E G C E." },
      3: { ru: "Точный порядок: 1→2→3→4→5 слева направо.", en: "Exact: candles 1→5 left to right.", da: "1→5." }
    };
    hooks?.toast?.(L(hints[tier] || hints[1]));
    window.AngelinaGuide?.pickAngelinaHint?.(
      { hint_exact: hints[3], hint_60s: hints[2], hint_nudge: hints[1] },
      tier,
      false
    );
    hooks?.save?.();
    return true;
  }
  st.organProgress.push(note);
  window.World3D?.lightCastleCandle?.(slot, true);
  if (st.organProgress.length >= ORGAN_SEQUENCE.length) {
    grantRewardOnce(window.me, "reward_bell_crown", () => {
      st.unique.bell_crown = Date.now();
      st.flags.organ_solved = true;
    });
    hooks?.toast?.(
      L({
        ru: "Корона Колокола спустилась с башни!",
        en: "The Bell crown descends from the tower!",
        da: "Klokkens krone!"
      })
    );
    window.World3D?.spawnCastleCrownPickup?.();
  }
  hooks?.save?.();
  return true;
}

export function openConcertPrep(hooks) {
  const st = story();
  if (!st.unique?.bell_crown) {
    hooks?.toast?.(
      L({
        ru: "Сначала реши головоломку органа в башне.",
        en: "Solve the organ puzzle in the tower first.",
        da: "Løs orgelgåden først."
      })
    );
    return;
  }
  const el = document.getElementById("concertPrep");
  if (!el) return;
  el.style.display = "";
  el.classList.add("active");
  el.setAttribute("aria-hidden", "false");
}

export function confirmConcertPrep(headlinerId, hooks) {
  const st = story();
  st.flags.concert_ready = true;
  st.flags.concert_headliner = headlinerId;
  st.decisions.headliner = headlinerId;
  grantRewardOnce(window.me, "reward_concert_prep", () => {});
  const prep = document.getElementById("concertPrep");
  if (prep) {
    prep.classList.remove("active");
    prep.style.display = "none";
  }
  hooks?.toast?.(
    L({
      ru: "Сцена готова. Граф ждёт у ворот двора.",
      en: "Stage ready. The Count waits by the courtyard gate.",
      da: "Scenen er klar."
    })
  );
  window.StoryEngine?.setBeacon?.("npc_count");
  hooks?.save?.();
}

export function tryTongueQuest(hooks) {
  const st = story();
  if (st.unique?.bell_tongue_zoya || st.unique?.bell_tongue_zombie) return false;
  if (window.me?.location === "kitchen") {
    openTongueChoice("zoya", hooks);
    return true;
  }
  if (window.me?.location === "city" && st.flags.hangout_open_scene_played) {
    openTongueChoice("zombie", hooks);
    return true;
  }
  return false;
}

function openTongueChoice(branch, hooks) {
  const st = story();
  if (branch === "zoya") {
    grantRewardOnce(window.me, "reward_bell_tongue", () => {
      st.unique.bell_tongue_zoya = Date.now();
      st.decisions.bell_tongue = "zoya";
    });
    hooks?.toast?.(L({ ru: "Бабуля Зоя отдала Язык Колокола.", en: "Grandma Zoya gave you the Bell clapper.", da: "Zoya gav klokkens klokke." }));
  } else {
    grantRewardOnce(window.me, "reward_bell_tongue", () => {
      st.unique.bell_tongue_zombie = Date.now();
      st.decisions.bell_tongue = "zombie";
    });
    hooks?.toast?.(L({ ru: "Мёртвиновы доверили Язык.", en: "The Mörtvinovs trust you with the clapper.", da: "Mörtvinovs gav klokke." }));
  }
  hooks?.save?.();
}

window.CastleGameplay = {
  tryCastleInteract,
  advanceOrganPuzzle,
  openConcertPrep,
  confirmConcertPrep,
  tryTongueQuest,
  ORGAN_SEQUENCE
};
