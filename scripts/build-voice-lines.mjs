#!/usr/bin/env node
/**
 * Build data/audio/voice-lines.json from story dialogues + NPC banter + narrator (onboarding).
 * Does not alter canonical story JSON — only indexes existing strings for Piper generation.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(root, "data/audio/voice-lines.json");

const dialogues = JSON.parse(
  fs.readFileSync(path.join(root, "data/story/dialogues.json"), "utf8")
).dialogues;

const NPC_I18N = {
  razor: {
    ru: ["Цепи — наш гимн.", "Ночь принадлежит банде.", "Выполни квест."],
    en: ["Chains are our anthem.", "The night belongs to the gang.", "Finish the quest."],
    da: ["Kæder er vores hymne.", "Natten tilhører banden.", "Fuldfør opgaven."]
  },
  mohawk: {
    ru: ["Магия жжёт по-настоящему.", "Купи свиток в лавке.", "Паркур качает репутацию."],
    en: ["Magic really burns.", "Buy a scroll at the shop.", "Parkour builds rep."],
    da: ["Magien brænder ægte.", "Køb en rune i butikken.", "Parkour giver respekt."]
  },
  vienna: {
    ru: ["Кладбище платит честно.", "NOT DEAD YET — про нас.", "Построй три склепа."],
    en: ["The cemetery pays fair.", "NOT DEAD YET — that's us.", "Build three crypts."],
    da: ["Kirkegården betaler fair.", "NOT DEAD YET — det er os.", "Byg tre krypta."]
  },
  ghost: {
    ru: ["Бас дышит с нами.", "Полиция мелькает — не стой долго.", "Коты знают короткие пути."],
    en: ["The bass breathes with us.", "Cops flash by — don't linger.", "Cats know shortcuts."],
    da: ["Bassen ånder med os.", "Politiet blinker — bliv ikke.", "Katte kender genveje."]
  },
  gravedigger: {
    ru: ["Копай и чисти — получишь монеты.", "Не ломай памятники.", "Держи куртку — холодно."],
    en: ["Dig and clean — get paid.", "Don't break headstones.", "Keep your jacket — it's cold."],
    da: ["Grav og rens — få betaling.", "Bryd ikke gravsten.", "Hold jakken — det er koldt."]
  }
};

/** Extra NPC one-liners from game.js (linesI18n / story NPCs). */
const EXTRA_NPC = {
  zoya: {
    ru: ["Пирог стынет — не заставляй бабушку ждать!"],
    en: ["The pie is getting cold — don't keep grandma waiting!"],
    da: ["Tærte'n køler — lad ikke bedstemor vente!"]
  },
  plukh: {
    ru: ["Пс-с! Только не смывай!"],
    en: ["Psst! Don't flush!"],
    da: ["Psst! Ikke skyl!"]
  },
  tony: {
    ru: ["Пицца сама себя не довезёт!"],
    en: ["Pizza won't deliver itself!"],
    da: ["Pizzaen leverer ikke sig selv!"]
  }
};

const ONBOARD_STEPS = ["move", "go_street", "talk_razor", "visit_cemetery", "win_fight", "shop_buy"];

const ONBOARD_I18N = {
  move: {
    ru: { title: "Шаг 1: Осмотрись", text: "Пройдись по комнате (WASD или джойстик)." },
    en: { title: "Step 1: Look around", text: "Walk around your room (WASD or joystick)." },
    da: { title: "Trin 1: Kig rundt", text: "Gå rundt i værelset (WASD eller joystick)." }
  },
  go_street: {
    ru: { title: "Шаг 2: Улица", text: "Из дома войди в портал «Улица»." },
    en: { title: "Step 2: Street", text: "From home, use the Street portal." },
    da: { title: "Trin 2: Gade", text: "Fra hjem, brug Gade-portalen." }
  },
  talk_razor: {
    ru: { title: "Шаг 3: Рейзор", text: "На улице найди Рейзора и нажми E." },
    en: { title: "Step 3: Razor", text: "On the street, find Razor and press E." },
    da: { title: "Trin 3: Razor", text: "På gaden, find Razor og tryk E." }
  },
  visit_cemetery: {
    ru: { title: "Шаг 4: Кладбище", text: "С улицы зайди на кладбище." },
    en: { title: "Step 4: Cemetery", text: "From the street, enter the cemetery." },
    da: { title: "Trin 4: Kirkegård", text: "Fra gaden, gå til kirkegården." }
  },
  win_fight: {
    ru: { title: "Шаг 5: Дуэль", text: "Победи в цепной драке с NPC." },
    en: { title: "Step 5: Duel", text: "Win a chain duel against an NPC." },
    da: { title: "Trin 5: Duel", text: "Vind en kæde-duel mod en NPC." }
  },
  shop_buy: {
    ru: { title: "Шаг 6: Лавка", text: "Купи что-нибудь в лавке (кнопка Shop)." },
    en: { title: "Step 6: Shop", text: "Buy something in the Shop." },
    da: { title: "Trin 6: Butik", text: "Køb noget i butikken (Shop)." }
  }
};

const CTRL_HINT = {
  move: {
    ru: { desktop: "Клавиши WASD или стрелки.", touch: "Джойстик слева внизу." },
    en: { desktop: "Use WASD or arrow keys.", touch: "Use the joystick at bottom left." },
    da: { desktop: "Brug WASD eller piletaster.", touch: "Brug joysticket nederst til venstre." }
  },
  go_street: {
    ru: { desktop: "Подойди к порталу и нажми E.", touch: "Подойди к порталу и нажми кнопку E." },
    en: { desktop: "Walk to the portal and press E.", touch: "Walk to the portal and tap E." },
    da: { desktop: "Gå til portalen og tryk E.", touch: "Gå til portalen og tryk E-knappen." }
  },
  talk_razor: {
    ru: { desktop: "Подойди к NPC и нажми E.", touch: "Подойди к NPC и нажми E." },
    en: { desktop: "Walk to the NPC and press E.", touch: "Walk to the NPC and tap E." },
    da: { desktop: "Gå til NPC og tryk E.", touch: "Gå til NPC og tryk E." }
  },
  visit_cemetery: {
    ru: { desktop: "Иди к порталу кладбища и нажми E.", touch: "Иди к порталу и нажми E." },
    en: { desktop: "Go to the cemetery portal and press E.", touch: "Go to the portal and tap E." },
    da: { desktop: "Gå til kirkegårdsportalen og tryk E.", touch: "Gå til portalen og tryk E." }
  },
  win_fight: {
    ru: { desktop: "Открой банду и начни дуэль цепями.", touch: "Кнопка Gang, затем дуэль." },
    en: { desktop: "Open Gang and start a chain duel.", touch: "Tap Gang, then start a duel." },
    da: { desktop: "Åbn Bande og start en kædeduel.", touch: "Tryk Bande, start duel." }
  },
  shop_buy: {
    ru: { desktop: "Кнопка Shop внизу экрана.", touch: "Кнопка Shop в доке внизу." },
    en: { desktop: "Press Shop on the bottom bar.", touch: "Tap Shop on the bottom dock." },
    da: { desktop: "Tryk Shop i bunden.", touch: "Tryk Shop i docken." }
  }
};

function speakerToCharacter(speaker) {
  const s = (speaker || "").replace(/^npc_/, "");
  if (!s) return "npc";
  if (s === "razor") return "razor";
  if (s === "mohawk") return "mohawk";
  if (s === "ghost") return "ghost";
  if (s === "gravedigger") return "gravedigger";
  if (s.includes("cobalt")) return "cobalt";
  if (s.includes("vienna") || s === "zoya") return "vienna";
  if (s === "tony") return "mohawk";
  if (s === "plukh") return "cobalt";
  return s;
}

const lines = [];

for (const dlg of dialogues) {
  for (const node of dlg.nodes || []) {
    if (!node.text || !node.speaker) continue;
    const id = `dlg_${dlg.id}_${node.id}`;
    const characterId = speakerToCharacter(node.speaker);
    lines.push({
      id,
      characterId,
      role: "character",
      ru: node.text.ru,
      en: node.text.en,
      da: node.text.da
    });
  }
}

function pushNpcPack(npcId, pack) {
  const langs = ["ru", "en", "da"];
  langs.forEach(lang => {
    const arr = pack[lang] || [];
    arr.forEach((text, idx) => {
      lines.push({
        id: `npc_${npcId}_${idx}`,
        characterId: npcId,
        role: "character",
        ru: lang === "ru" ? text : pack.ru?.[idx] || "",
        en: lang === "en" ? text : pack.en?.[idx] || "",
        da: lang === "da" ? text : pack.da?.[idx] || ""
      });
    });
  });
}

const seenNpc = new Set();
for (const [npcId, pack] of Object.entries({ ...NPC_I18N, ...EXTRA_NPC })) {
  if (seenNpc.has(npcId)) continue;
  seenNpc.add(npcId);
  const max = Math.max(pack.ru?.length || 0, pack.en?.length || 0, pack.da?.length || 0);
  for (let idx = 0; idx < max; idx++) {
    lines.push({
      id: `npc_${npcId}_${idx}`,
      characterId: npcId,
      role: "character",
      ru: pack.ru?.[idx] || pack.en?.[idx] || "",
      en: pack.en?.[idx] || pack.ru?.[idx] || "",
      da: pack.da?.[idx] || pack.en?.[idx] || ""
    });
  }
}

for (const stepId of ONBOARD_STEPS) {
  for (const variant of ["desktop", "touch"]) {
    for (const lang of ["ru", "en", "da"]) {
      const block = ONBOARD_I18N[stepId][lang];
      const hint = CTRL_HINT[stepId][lang][variant];
      const spoken = `${block.title}. ${block.text} ${hint}`;
      lines.push({
        id: `narr_onboard_${stepId}_${variant}`,
        characterId: "narrator",
        role: "narrator",
        variant,
        ru: lang === "ru" ? spoken : `${ONBOARD_I18N[stepId].ru.title}. ${ONBOARD_I18N[stepId].ru.text} ${CTRL_HINT[stepId].ru[variant]}`,
        en: lang === "en" ? spoken : `${ONBOARD_I18N[stepId].en.title}. ${ONBOARD_I18N[stepId].en.text} ${CTRL_HINT[stepId].en[variant]}`,
        da: lang === "da" ? spoken : `${ONBOARD_I18N[stepId].da.title}. ${ONBOARD_I18N[stepId].da.text} ${CTRL_HINT[stepId].da[variant]}`
      });
    }
  }
}

/** Deduplicate by id (onboarding loop created duplicates — fix structure) */
const byId = new Map();
for (const row of lines) {
  if (!byId.has(row.id)) byId.set(row.id, row);
}
const unique = [...byId.values()];

// Fix narrator lines: one entry per id with all langs
const narrIds = ONBOARD_STEPS.flatMap(s => [`narr_onboard_${s}_desktop`, `narr_onboard_${s}_touch`]);
for (const id of narrIds) {
  const stepId = id.replace(/^narr_onboard_/, "").replace(/_(desktop|touch)$/, "");
  const variant = id.endsWith("_touch") ? "touch" : "desktop";
  byId.set(id, {
    id,
    characterId: "narrator",
    role: "narrator",
    variant,
    ru: `${ONBOARD_I18N[stepId].ru.title}. ${ONBOARD_I18N[stepId].ru.text} ${CTRL_HINT[stepId].ru[variant]}`,
    en: `${ONBOARD_I18N[stepId].en.title}. ${ONBOARD_I18N[stepId].en.text} ${CTRL_HINT[stepId].en[variant]}`,
    da: `${ONBOARD_I18N[stepId].da.title}. ${ONBOARD_I18N[stepId].da.text} ${CTRL_HINT[stepId].da[variant]}`
  });
}

const finalLines = [...byId.values()].filter(l => l.ru || l.en || l.da);

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(
  outPath,
  JSON.stringify({ version: 1, generatedAt: new Date().toISOString(), lines: finalLines }, null, 2)
);
console.log("Wrote", outPath, "lines:", finalLines.length);
