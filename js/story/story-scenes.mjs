/**
 * Full-screen story scenes (not toasts) — chapter beats and endings.
 */
import { recordChapterCheckpoint } from "./story-checkpoints.mjs";
import { grantRewardOnce } from "./story-save-schema.mjs";

function lang() {
  return typeof window.getLanguage === "function" ? window.getLanguage() : "ru";
}

function L(obj) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  const l = lang();
  return obj[l] || obj.en || obj.ru || "";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function resolveSpeakerName(panel) {
  const voice = panel.voice;
  if (voice && typeof window.tNpcName === "function") {
    const n = window.tNpcName(voice);
    if (n && !String(n).startsWith("npc_")) return n;
  }
  const raw = L(panel.speaker);
  if (!raw) return voice === "narrator" ? (typeof window.t === "function" ? window.t("narrator_name") : "Narrator") : "";
  if (raw.startsWith("npc_") && typeof window.tNpcName === "function") {
    return window.tNpcName(raw.replace(/^npc_/, "")) || raw;
  }
  return raw;
}

export function playStoryScene(panels, opts = {}) {
  const root = document.getElementById("storyScene");
  if (!root) {
    opts.onDone?.();
    return;
  }
  let idx = 0;
  const titleEl = root.querySelector(".story-scene-title");
  const bodyEl = root.querySelector(".story-scene-body");
  const speakerEl = root.querySelector(".story-scene-speaker");
  const btn = root.querySelector(".story-scene-next");

  const render = () => {
    const p = panels[idx];
    const speaker = resolveSpeakerName(p);
    const body = L(p.text);
    titleEl.textContent = L(opts.title || {});
    speakerEl.textContent = speaker;
    bodyEl.textContent = body;
    btn.textContent =
      idx >= panels.length - 1
        ? L(opts.doneLabel || { ru: "Дальше", en: "Continue", da: "Fortsæt" })
        : L({ ru: "Дальше", en: "Next", da: "Næste" });
    window.setSubtitle?.(body);
    if (opts.narrate !== false) {
      window.SpeechBridge?.play?.({
        lineId: `scene_${opts.id || "x"}_${idx}`,
        text: body,
        characterId: p.voice || "narrator",
        subtitle: body
      });
    }
    if (opts.cinematicNpc && window.StoryEngine?.applyDialogueCamera) {
      window.StoryEngine.applyDialogueCamera(opts.cinematicNpc);
    }
  };

  const close = () => {
    root.classList.remove("active");
    root.setAttribute("aria-hidden", "true");
    window.StoryEngine?.clearDialogueCamera?.();
    opts.onDone?.();
  };

  btn.onclick = () => {
    window.AudioManager?.stopSpeech?.();
    window.AudioManager?.playSfx?.("ui_click");
    if (idx >= panels.length - 1) close();
    else {
      idx += 1;
      render();
    }
  };

  document.getElementById("chapterIntro")?.classList.remove("active");
  document.getElementById("storyDialog")?.classList.remove("active");
  root.classList.add("active");
  root.setAttribute("aria-hidden", "false");
  render();
}

export function playInitiationCeremony(player, hooks) {
  if (player.story?.flags?.initiation_ceremony) return;
  player.story.flags.initiation_ceremony = true;
  playStoryScene(
    [
      {
        speaker: { ru: "Рейзор", en: "Razor", da: "Razor" },
        text: {
          ru: "Ты прошёл проверку. С сегодняшней ночи ты — «Ржавые Цепи». Не подведи банду и не стыдись своего характера.",
          en: "You passed the test. From tonight you're Rusty Chains. Don't let the gang down — and don't hide who you are.",
          da: "Du bestod prøven. Fra i aften er du Rusty Chains. Skuff ikke banden."
        },
        voice: "razor"
      },
      {
        speaker: { ru: "Вена", en: "Vienna", da: "Vienna" },
        text: {
          ru: "Держи нашивку. Следующий шаг — своя Тусовка. Место, где друзья не чужие.",
          en: "Here's your patch. Next — your own hangout. A place where friends aren't strangers.",
          da: "Her er dit mærke. Næste — jeres hangout."
        },
        voice: "vienna"
      }
    ],
    {
      id: "initiation_ceremony",
      title: { ru: "Глава 1 · Прописка", en: "Chapter 1 · Initiation", da: "Kapitel 1" },
      onDone: () => {
        recordChapterCheckpoint(player, 1, { beat: "initiation_ceremony" });
        window.ChapterIntro?.showChapterWrap?.(1);
        hooks?.save?.();
      }
    }
  );
}

export function playHangoutOpeningScene(player, hooks) {
  playStoryScene(
    [
      {
        speaker: { ru: "Зомбина", en: "Zombina", da: "Zombina" },
        text: {
          ru: "Слышишь тишину между нотами? Это Колокол… папа говорил, он когда-то звонил на балу. В альбоме есть фото — посмотри, когда будет время.",
          en: "Hear the silence between the notes? That's the Bell… Dad said it rang at the ball. Check the family album when you can.",
          da: "Hører du stilheden mellem noderne? Det er klokken…"
        },
        voice: "zombina"
      }
    ],
    {
      id: "hangout_open",
      title: { ru: "Глава 2 · Своя точка", en: "Chapter 2 · Your spot", da: "Kapitel 2" },
      onDone: () => {
        player.story.flags.mertwin_album = true;
        recordChapterCheckpoint(player, 2, { beat: "hangout_open" });
        window.ChapterIntro?.showChapterWrap?.(2);
        hooks?.save?.();
      }
    }
  );
}

export function playCemeteryBellScene(player, hooks) {
  grantRewardOnce(player, "reward_ch3_rim", () => {
    const s = player.story;
    s.unique.bell_rim = Date.now();
    s.flags.crypt_built = true;
    s.flags.ghost_escort = true;
  });
  playStoryScene(
    [
      {
        speaker: { ru: "Хранительница", en: "Keeper", da: "Vogterinde" },
        text: {
          ru: "Склеп готов. Призраки снова видят дорогу. Возьми Обод — он зовёт остальные части Колокола у замка.",
          en: "The crypt is ready. Ghosts can find the path again. Take the Bell rim — it calls the other pieces at the castle.",
          da: "Krypten er klar. Tag klokkeranden — den kalder på de andre dele ved slottet."
        },
        voice: "gravedigger"
      }
    ],
    {
      id: "bell_rim",
      title: { ru: "Глава 3 · Ночь на кладбище", en: "Chapter 3 · Cemetery night", da: "Kapitel 3" },
      onDone: () => {
        recordChapterCheckpoint(player, 3, { beat: "bell_rim", unique: "bell_rim" });
        window.StoryEngine?.startQuest?.("q_ch4_castle");
        hooks?.save?.();
      }
    }
  );
}

export function playCastlePrepScene(player, hooks) {
  const s = player.story;
  if (!s.unique.bell_tongue_zoya && !s.unique.bell_tongue_zombie) {
    s.unique.bell_tongue_zoya = Date.now();
  }
  if (!s.unique.bell_crown) s.unique.bell_crown = Date.now();
  s.flags.concert_ready = true;
  playStoryScene(
    [
      {
        speaker: { ru: "Граф", en: "The Count", da: "Greven" },
        text: {
          ru: "Части на месте. Банда ждёт на сцене у Тусовки — это наш двор замка, пока башня молчит. Готовь концерт.",
          en: "The pieces are here. The gang waits on the hangout stage — our castle yard while the tower sleeps. Prepare the concert.",
          da: "Delene er her. Banden venter på scenen ved hænget."
        },
        voice: "count"
      }
    ],
    {
      id: "castle_prep",
      title: { ru: "Глава 4 · Тайна замка", en: "Chapter 4 · Castle secret", da: "Kapitel 4" },
      onDone: () => {
        recordChapterCheckpoint(player, 4, { beat: "concert_ready" });
        window.StoryEngine?.fireStoryEvent?.("ch4_concert_ready");
        window.StoryEngine?.openDialogueById?.("dlg_count_confession");
        hooks?.save?.();
      }
    }
  );
}

/** Consequences briefing before ending choice UI. */
export function playFinaleBriefingBeforeChoice(hooks) {
  playStoryScene(
    [
      {
        voice: "narrator",
        speaker: { ru: "Рассказчик", en: "Narrator", da: "Fortæller" },
        text: {
          ru: "Колокол собран. Три пути изменят Тыквоград навсегда — прочитай последствия и выбери осознанно.",
          en: "The Bell is whole. Three paths will change Pumpkin City forever — read each outcome, then choose.",
          da: "Klokken er hel. Tre veje ændrer Græskarby for altid."
        }
      },
      {
        voice: "count",
        speaker: { ru: "Граф", en: "The Count", da: "Greven" },
        text: {
          ru: "Снять проклятие — рассвет в сердце города, семья снова живёт без грима. Зомби-стиль — замок станет клубом, Огонёк поведёт призраков. Сделка — ночная лавка у ворот и моя защита.",
          en: "Break the curse — dawn in the city's heart, the family lives without makeup. Zombie style — the castle becomes a club, the Ember guides ghosts. The deal — a night shop at the gate and my protection.",
          da: "Bryd forbandelsen — daggry. Zombie-stil — klub. Aftale — natbutik."
        }
      },
      {
        voice: "zombina",
        speaker: { ru: "Зомбина", en: "Zombina", da: "Zombina" },
        text: {
          ru: "Какой бы путь ты не выбрал — мы останемся бандой. Ангелина запишет итог в твоём альбоме.",
          en: "Whichever path you pick — we stay a gang. Angelina will write the ending in your album.",
          da: "Uanset vej — vi er stadig en bande."
        }
      }
    ],
    {
      id: "finale_briefing",
      title: { ru: "Глава 4 · Колокол", en: "Chapter 4 · The Bell", da: "Kapitel 4" },
      cinematicNpc: "count",
      doneLabel: { ru: "К выбору судьбы", en: "To the choice", da: "Til valget" },
      onDone: () => {
        window.StoryEndings?.showEndingChoice?.(hooks);
      }
    }
  );
}

const ENDING_SCENES = {
  ending_break_curse: [
    {
      voice: "narrator",
      speaker: { ru: "Рассказчик", en: "Narrator", da: "Fortæller" },
      text: {
        ru: "Над башней вспыхивает бледный рассвет — не утро, но свет, которого не было пятьдесят лет.",
        en: "A pale dawn flares above the tower — not morning, but light the city hasn't seen in fifty years.",
        da: "En bleg daggry over tårnet."
      }
    },
    {
      voice: "zoya",
      speaker: { ru: "Бабуля Зоя", en: "Grandma Zoya", da: "Bedstemor Zoya" },
      text: {
        ru: "Мёртвиновы снимают грим — под ним всё те же панки. Мы не прячемся от Колокола.",
        en: "The Mörtvinovs wipe the makeup — still punks underneath. We don't hide from the Bell.",
        da: "Mörtvinovs tager makeup af."
      }
    },
    {
      voice: "vienna",
      speaker: { ru: "Вена", en: "Vienna", da: "Vienna" },
      text: {
        ru: "Призраки находят дорогу в Склеп. Слышишь? Колокол звонит мягко, как в детстве у папы.",
        en: "Ghosts find the path to the Crypt. Hear that? The Bell rings soft, like when Dad was young.",
        da: "Spøgelser finder vej til krypten."
      }
    },
    {
      voice: "razor",
      speaker: { ru: "Рейзор", en: "Razor", da: "Razor" },
      text: {
        ru: "Банда стоит у стен — без страха. Тыквоград дышит иначе, и это наша победа.",
        en: "The gang stands by the walls — unafraid. Pumpkin City breathes differently; that's our win.",
        da: "Banden står ved murene."
      }
    }
  ],
  ending_zombie_style: [
    {
      voice: "zombina",
      speaker: { ru: "Зомбина", en: "Zombina", da: "Zombina" },
      text: {
        ru: "Мы остаёмся зомби — это наш стиль. Не стыдно быть собой, даже когда ночь вечная.",
        en: "We stay zombie — it's our style. No shame in who we are, even when the night never ends.",
        da: "Vi forbliver zombie — det er vores stil."
      }
    },
    {
      voice: "mohawk",
      speaker: { ru: "Ирокез", en: "Mohawk", da: "Mohawk" },
      text: {
        ru: "Замок гудит басом — клуб открыт. Танцпол для живых и мёртвых.",
        en: "The castle hums with bass — club's open. A dance floor for the living and the dead.",
        da: "Slottet summer af bas."
      }
    },
    {
      voice: "plukh",
      speaker: { ru: "Огонёк", en: "Ember", da: "Ember" },
      text: {
        ru: "Я веду потерявшихся призраков между колоннами — никто не заблудится в ритме.",
        en: "I guide lost ghosts between the columns — no one gets lost in the beat.",
        da: "Jeg leder spøgelser i rytmen."
      }
    },
    {
      voice: "razor",
      speaker: { ru: "Рейзор", en: "Razor", da: "Razor" },
      text: {
        ru: "Ржавые Цепи на сцене. Колокол бьёт в такт — и город не засыпает, он танцует.",
        en: "Rusty Chains on stage. The Bell hits the beat — the city doesn't sleep, it dances.",
        da: "Rusty Chains på scenen."
      }
    }
  ],
  ending_count_deal: [
    {
      voice: "count",
      speaker: { ru: "Граф", en: "The Count", da: "Greven" },
      text: {
        ru: "Сделка заключена. Ночной магазин у ворот открыт для своих — по моим правилам.",
        en: "The deal is sealed. A night shop opens at the gate for our own — on my terms.",
        da: "Aftalen er lukket."
      }
    },
    {
      voice: "zoya",
      speaker: { ru: "Бабуля Зоя", en: "Grandma Zoya", da: "Bedstemor Zoya" },
      text: {
        ru: "Семья под защитой Графа. Мы не любим долги — но Колокол снова слушает.",
        en: "The family under the Count's protection. We don't love debts — but the Bell listens again.",
        da: "Familien under greven."
      }
    },
    {
      voice: "vienna",
      speaker: { ru: "Вена", en: "Vienna", da: "Vienna" },
      text: {
        ru: "Призраки торгуют шёпотом у прилавка. Ночь остаётся, но теперь в ней есть уголок для всех.",
        en: "Ghosts trade whispers at the counter. The night remains — but now there's room for everyone.",
        da: "Spøgelser ved disken."
      }
    },
    {
      voice: "count",
      speaker: { ru: "Граф", en: "The Count", da: "Greven" },
      text: {
        ru: "Нарушишь слово — Колокол замолчит навсегда. Я верю, что ты выдержишь.",
        en: "Break your word and the Bell falls silent forever. I believe you'll hold the line.",
        da: "Bryd ordet — klokken tier."
      }
    }
  ]
};

export function playEndingScene(endingId, player, hooks) {
  const panels = ENDING_SCENES[endingId];
  if (!panels) return;
  const st = player.story || {};
  st.chapter = 4;
  st.mainlineChapter = 4;
  window.World3D?.applyCastleEndingVisualFromSave?.();
  playStoryScene(panels, {
    id: `ending_${endingId}`,
    title: {
      ru: "Финал · История Колокола",
      en: "Finale · The Bell's story",
      da: "Finale"
    },
    cinematicNpc: endingId === "ending_count_deal" ? "count" : "zombina",
    doneLabel: { ru: "Награды", en: "Rewards", da: "Belønning" },
    onDone: () => {
      recordChapterCheckpoint(player, 4, { beat: "ending", ending: endingId });
      window.StoryEndings?.showEndingRewards?.(endingId, player, hooks);
    }
  });
}

window.StoryScenes = {
  playStoryScene,
  playInitiationCeremony,
  playHangoutOpeningScene,
  playCemeteryBellScene,
  playCastlePrepScene,
  playFinaleBriefingBeforeChoice,
  playEndingScene
};
