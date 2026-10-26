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
    titleEl.textContent = L(opts.title || {});
    speakerEl.textContent = L(p.speaker || {});
    bodyEl.textContent = L(p.text);
    btn.textContent =
      idx >= panels.length - 1
        ? L(opts.doneLabel || { ru: "Дальше", en: "Continue", da: "Fortsæt" })
        : L({ ru: "Дальше", en: "Next", da: "Næste" });
    const line = `${L(p.speaker)} ${L(p.text)}`.trim();
    window.setSubtitle?.(line);
    if (opts.narrate !== false) {
      window.SpeechBridge?.play?.({
        lineId: `scene_${opts.id || "x"}_${idx}`,
        text: line,
        characterId: p.voice || "narrator",
        subtitle: line
      });
    }
  };

  const close = () => {
    root.classList.remove("active");
    root.setAttribute("aria-hidden", "true");
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
        }
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
        }
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

const ENDING_SCENES = {
  ending_break_curse: [
    {
      speaker: { ru: "Колокол", en: "The Bell", da: "Klokken" },
      text: {
        ru: "Звон проходит через Тыквоград. Мёртвиновы снимают грим — остаются панками. Призраки находят Склеп. Утро не наступает, но город дышит иначе.",
        en: "The chime rolls through Pumpkin City. The Mörtvinovs wipe the makeup — still punk. Ghosts find the Crypt. Morning never comes, but the city breathes differently.",
        da: "Klangen ruller gennem Græskarbyen."
      }
    }
  ],
  ending_zombie_style: [
    {
      speaker: { ru: "Зомбина", en: "Zombina", da: "Zombina" },
      text: {
        ru: "Мы остаёмся зомби — это наш стиль. Замок становится клубом, а Огонёк ведёт потерявшихся призраков, пока бас бьёт в стены.",
        en: "We stay zombie — it's our style. The castle becomes a club, and the Ember guides lost ghosts while the bass hits the walls.",
        da: "Vi forbliver zombie — det er vores stil."
      }
    }
  ],
  ending_count_deal: [
    {
      speaker: { ru: "Граф", en: "The Count", da: "Greven" },
      text: {
        ru: "Сделка заключена. Ночной магазин у ворот открыт для своих. Семья и призраки под моей защитой — нарушишь слово, и Колокол замолчит навсегда.",
        en: "The deal is sealed. A night shop opens at the gate for our own. Family and ghosts under my protection — break your word and the Bell falls silent forever.",
        da: "Aftalen er lukket."
      },
      voice: "count"
    }
  ]
};

export function playEndingScene(endingId, player, hooks) {
  const panels = ENDING_SCENES[endingId];
  if (!panels) return;
  playStoryScene(panels, {
    id: `ending_${endingId}`,
    title: {
      ru: "Финал",
      en: "Finale",
      da: "Finale"
    },
    doneLabel: { ru: "В Тыквоград", en: "Back to Pumpkin City", da: "Tilbage" },
    onDone: () => {
      recordChapterCheckpoint(player, 4, { beat: "ending", ending: endingId });
      hooks?.save?.();
    }
  });
}

window.StoryScenes = {
  playStoryScene,
  playInitiationCeremony,
  playHangoutOpeningScene,
  playCemeteryBellScene,
  playCastlePrepScene,
  playEndingScene
};
