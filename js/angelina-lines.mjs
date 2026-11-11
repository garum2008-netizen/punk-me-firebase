/** Contextual lines for Angelina. One beat per gameplay state, not a random pool. */

const LINES = {
  hello: {
    mood: "talk",
    ru: "Добро пожаловать в PUNK ME ANGEL! Я Ангелина и буду объяснять, что происходит. Ты новенький в доме 13, это Тыквоград: Хэллоуин тут не кончается. Большая цель — помочь банде «Ржавые Цепи» найти своё место и узнать, почему треснул Колокол в замке. Сначала твоя комната. Кладбище рядом со спальней? Ну… почему бы и нет.",
    uk: "Ласкаво просимо до PUNK ME ANGEL! Я Ангеліна і пояснюватиму, що відбувається. Ти новачок у будинку 13, це Гарбузоград: Геловін тут не закінчується. Велика ціль — допомогти банді «Іржаві Ланцюги» знайти своє місце і дізнатися, чому тріснув Дзвін у замку. Спочатку твоя кімната. Цвинтар біля спальні? Ну… чому б і ні.",
    en: "Welcome to PUNK ME ANGEL! I'm Angelina, and I'll explain what is going on. You are new in House 13, Pumpkin City, where Halloween never ends. The big goal is to help the Rusty Chains find a home and learn why the castle Bell cracked. First, your room. Cemetery next to the bedroom? Well… why not.",
    da: "Velkommen til PUNK ME ANGEL! Jeg er Angelina, og jeg forklarer, hvad der sker. Du er ny i hus 13, Græskarby, hvor halloween aldrig slutter. Det store mål er at hjælpe Rusty Chains med at finde et sted og lære, hvorfor slottets Klokke slog revner. Først dit værelse. Kirkegård ved siden af soveværelset? Tja… hvorfor ikke."
  },
  move: {
    mood: "point",
    ru: "Пройдись по комнате. Компьютер — WASD. Телефон — джойстик слева. Это нужно, чтобы ты понял, что тело твоё, а я только рядом. Потом выйдем к банде.",
    uk: "Пройдися кімнатою. Комп'ютер — WASD. Телефон — джойстик ліворуч. Так ти зрозумієш, що тіло твоє, а я лише поруч. Потім вийдемо до банди.",
    en: "Walk the room. Computer — WASD. Phone — joystick on the left. You need to feel that the body is yours. I only walk beside you. Then we meet the gang.",
    da: "Gå rundt i værelset. Computer — WASD. Telefon — joystick til venstre. Du skal mærke, at kroppen er din. Jeg går bare ved siden af. Så møder vi banden."
  },
  ch1: {
    mood: "talk",
    ru: "Глава «Прописка». Рейзор пустит тебя в «Ржавые Цепи», если заплатишь 150 монет или победишь его в дуэли. Есть и третий путь — граффити в городе. Пиццу, смотрителя и крышу можно не делать. После нашивки строим Тусовку. Это уже влияет на историю: без места банду прогоняют.",
    uk: "Розділ «Прописка». Рейзор пустить тебе в «Іржаві Ланцюги», якщо заплатиш 150 монет або переможеш його в дуелі. Є і третій шлях — графіті в місті. Піцу, доглядача і дах можна не робити. Після нашивки будуємо тусовку. Це вже впливає на історію: без місця банду проганяють.",
    en: "Chapter Joining. Razor lets you into the Rusty Chains if you pay 150 coins or beat him in a duel. Graffiti in the city is a third way. You can skip pizza, the Keeper and the roof. After the patch we build the hangout. It matters: without a place, the gang gets chased off.",
    da: "Kapitel Optagelse. Razor lukker dig ind i Rusty Chains, hvis du betaler 150 mønter eller slår ham i en duel. Graffiti i byen er en tredje vej. Du kan springe pizza, Vogteren og taget over. Efter mærket bygger vi hænget. Det betyder noget: uden et sted jages banden væk."
  },
  street: {
    mood: "point",
    ru: "Видишь неоновое кольцо? Шагни внутрь. Там улица «Ржавых Цепей». Без этой улицы история не начинается.",
    uk: "Бачиш неонове кільце? Ступи всередину. Там вулиця «Іржавих Ланцюгів». Без цієї вулиці історія не починається.",
    en: "See the neon ring? Step in. That is the Rusty Chains' street. Without it, the story does not start.",
    da: "Ser du neonringen? Træd ind. Det er Rusty Chains' gade. Uden den starter historien ikke."
  },
  razor: {
    mood: "talk",
    ru: "Рейзор — капитан «Ржавых Цепей». Подойди и нажми E. Он спросит, хочешь ли ты в банду. Пока просто поздоровайся, не геройствуй.",
    en: "Razor captains the Rusty Chains. Walk up and press E. He'll ask if you want in. For now, just say hi. Save the heroics.",
    da: "Razor er kaptajn for Rusty Chains. Gå hen og tryk E. Han spørger, om du vil med. Sig bare hej. Gem heltegerningen."
  },
  cemetery: {
    mood: "smirk",
    ru: "Кладбище — не декорация. Там работа, смотритель и кусок тайны города. С улицы зайди в кольцо. И нет, это всё ещё не моя спальня.",
    en: "The cemetery isn't wallpaper. Work, the Keeper, and a piece of the city's mystery live there. From the street, take the ring. And no, it is still not my bedroom.",
    da: "Kirkegården er ikke tapet. Arbejde, Vogteren og et stykke af byens gåde bor der. Fra gaden, tag ringen. Og nej, det er stadig ikke mit soveværelse."
  },
  duel: {
    mood: "point",
    ru: "Дуэль цепями: кнопка боя, потом бей, пока чужая полоска не сядет. Проиграл — закатываю глаза и говорю «ещё раз». Это не конец истории.",
    en: "Chain duel: hit the fight button, then strike until their bar drops. Lose, and I roll my eyes and say again. It is not the end of the story.",
    da: "Kædeduel: tryk kamp, så slå til deres bjælke dør. Taber du, himler jeg med øjnene og siger igen. Det er ikke slutningen."
  },
  duel_on: {
    mood: "point",
    ru: "Бей. Ещё. Не стой в ударе, суперзвезда.",
    en: "Hit. Again. Don't just stand in the swing, superstar.",
    da: "Slå. Igen. Stå ikke bare i slaget, superstjerne."
  },
  duel_win: {
    mood: "cheer",
    ru: "Ого, первая победа! Теперь главное — не потратить все монеты на кирпичи. Хотя…",
    en: "Whoa, first win! Now don't spend every coin on bricks. Although…",
    da: "Wow, første sejr! Nu skal du ikke bruge alle mønter på mursten. Selvom…"
  },
  duel_lose: {
    mood: "eyeroll",
    ru: "Я только что закатила глаза так сильно, что увидела прошлый сезон. Вставай и бей ещё раз.",
    en: "I just rolled my eyes so hard I saw last season. Get up and hit them again.",
    da: "Jeg himlede så hårdt, at jeg så sidste sæson. Op og slå igen."
  },
  shop: {
    mood: "point",
    ru: "Лавка внизу экрана. Купи хоть кирпич — монеты для этого и нужны. Комнату украшаешь кнопкой «Декор», городские штуки — режимом стройки.",
    en: "Shop is on the bottom bar. Buy at least a brick — that's what coins are for. Dress the room with Decor. City pieces use Build mode.",
    da: "Butikken er i bunden. Køb mindst en mursten — mønter er til det. Pynt værelset med Dekor. By-ting bruger Byg-tilstand."
  },
  brick: {
    mood: "smirk",
    ru: "Кирпич в инвентаре. На стройке он станет фундаментом Тусовки — после нашивки, не вместо неё.",
    en: "Brick's in the inventory. On the construction site it becomes the hangout foundation — after the patch, not instead of it.",
    da: "Murstenen er i inventaret. På byggepladsen bliver den fundament til hænget — efter mærket, ikke i stedet for."
  },
  coins: {
    mood: "talk",
    ru: "Монеты капают за шаги, дуэли и работу. Тратятся в лавке и на стройку. Я не банкомат. Я просто честная.",
    en: "Coins drip in from steps, duels and jobs. They leave through the shop and building. I'm not an ATM. I'm just honest.",
    da: "Mønter drypper ind fra trin, dueller og job. De ryger ud i butikken og byggeriet. Jeg er ikke en hæveautomat. Jeg er bare ærlig."
  },
  broke: {
    mood: "point",
    ru: "Монет не хватает. Не стыдно. Стыдно стоять. Пицца у Тони в городе или смена на кладбище.",
    en: "Short on coins. Not shameful. Standing still is. Pizza with Tony in the City, or a cemetery shift.",
    da: "For få mønter. Ikke pinligt. At stå stille er. Pizza hos Tony i Byen, eller et vagtskifte på kirkegården."
  },
  gang: {
    mood: "cheer",
    ru: "Нашивка твоя. Глава «Прописка» закрыта. Дальше глава «Своя точка»: на стройке четыре этапа Тусовки. Когда достроим, Зомбина — дочь соседей Мёртвиновых — найдёт кусок Колокола. Это уже дверь в ночь на кладбище.",
    uk: "Нашивка твоя. Розділ «Прописка» закрито. Далі розділ «Своє місце»: на будівництві чотири етапи тусовки. Коли добудуємо, Зомбіна — донька сусідів Мертвінових — знайде шматок Дзвона. Це вже двері в ніч на цвинтарі.",
    en: "The patch is yours. Joining is done. Next is Our own spot: four hangout stages on the construction site. When it is finished, Zombina — the Mertvinovs' daughter — finds a piece of the Bell. That opens cemetery night.",
    da: "Mærket er dit. Optagelsen er slut. Næste er Vores sted: fire hængetaper på byggepladsen. Når det er færdigt, finder Zombina — Mertvinovs datter — et stykke af Klokken. Så åbner kirkegårdsnatten."
  },
  build: {
    mood: "point",
    ru: "Стройка. Кнопка «Строить» кладёт материалы в этап. «Где взять?» ведёт в лавку или к подсобнику. Чего не хватает — написано на панели, не в моей голове.",
    en: "Construction site. Build spends the materials for this stage. Where? points at the shop or the helper. The panel lists what you're missing. Not my head.",
    da: "Byggeplads. Byg bruger materialerne til etapen. Hvor? peger på butikken eller hjælperen. Panelet siger, hvad der mangler. Ikke mit hoved."
  },
  decor: {
    mood: "cheer",
    ru: "Комната запомнила эту вещь. Сюжет из-за этого не останавливается. Строй, когда хочешь, и возвращайся к главе.",
    uk: "Кімната запам'ятала цю річ. Сюжет через це не зупиняється. Будуй, коли хочеш, і повертайся до розділу.",
    en: "The room remembered that piece. The story does not stop for it. Build when you want, then come back to the chapter.",
    da: "Værelset huskede den ting. Historien stopper ikke af den grund. Byg når du vil, og vend tilbage til kapitlet."
  },
  hangout_done: {
    mood: "cheer",
    ru: "Тусовка стоит. Глава «Своя точка» сделана. Дальше по сценарию ночь на кладбище и три части Колокола в замке Графа. Отдельной двери замка ещё нет — я скажу, когда появится. А комнату и город можно строить уже сейчас.",
    uk: "Тусовка стоїть. Розділ «Своє місце» зроблено. Далі за сценарієм ніч на цвинтарі і три частини Дзвона в замку Графа. Окремих дверей замку ще немає — я скажу, коли з'являться. А кімнату і місто можна будувати вже зараз.",
    en: "The hangout is up. Our own spot is done. Next in the script: cemetery night and the Bell's three pieces in the Count's castle. There is no castle door yet — I will say when it appears. The room and the city can be built now.",
    da: "Hænget står. Vores sted er færdigt. Næste i manus: nat på kirkegården og Klokkens tre dele i Grevens slot. Der er ingen slotdør endnu — jeg siger til, når den kommer. Værelset og byen kan bygges nu."
  },
  idle: {
    mood: "eyeroll",
    ru: "Эй. Тыквоград не крутится, пока ты выбираешь обои в голове. Кнопка «Куда идти?» — если потерялся. Я всё ещё здесь.",
    uk: "Гей. Гарбузоград не крутиться, поки ти обираєш шпалери в голові. Кнопка «Куди йти?» — якщо загубився. Я все ще тут.",
    en: "Hey. Pumpkin City does not spin while you redecorate your thoughts. Hit Where? if you're lost. I'm still here.",
    da: "Hey. Græskarby drejer ikke, mens du tapetserer i hovedet. Tryk Hvor? hvis du er faret vild. Jeg er her stadig."
  }
};

const STEP_BEAT = ["move", "street", "razor", "cemetery", "duel", "shop"];

function pack(id, memoryKey) {
  const row = LINES[id];
  return { id, memoryKey: memoryKey || id, mood: row.mood, text: row };
}

export function lineText(row, lang) {
  if (!row) return "";
  const bag = row.text || row;
  return bag[lang] || bag.en || bag.ru || "";
}

/** Pick the one line this state should say. `said` maps memoryKey -> timestamp. */
export function selectBeat(state, memory = {}) {
  const said = memory.said || {};
  const now = state.now || 0;
  const once = key => said[key] == null;
  const fresh = (key, ms) => said[key] == null || now - said[key] > ms;

  if (state.justLost && fresh("duel_lose", 12000)) return pack("duel_lose");
  if (state.justWon && once("duel_win")) return pack("duel_win");
  if (state.justJoined && once("gang")) return pack("gang");
  if (state.justBrick && once("brick")) return pack("brick");
  if (state.justBroke && fresh("broke", 18000)) return pack("broke");
  if (state.fight && once("duel_on")) return pack("duel_on");
  if (state.justHangout && once("hangout_done")) return pack("hangout_done");
  if (state.justDecor && once("decor")) return pack("decor");
  if (said.hello && now - said.hello < 12000 && !state.done && (state.step || 0) === 0) return null;
  if (once("hello")) return pack("hello");
  if (state.done && !state.joined && once("ch1")) return pack("ch1");
  if (!state.done) {
    const id = STEP_BEAT[state.step] || "move";
    if (once(id)) return pack(id);
  }
  if (state.joined && state.location === "construction" && (state.hangoutStage || 0) < 4) {
    const key = "build_" + (state.hangoutStage || 0);
    if (once(key)) return pack("build", key);
  }
  if ((state.coins || 0) > 100 && once("coins")) return pack("coins");
  if ((state.idleSec || 0) > 16 && fresh("idle", 40000)) return pack("idle");
  return null;
}

export function objectiveBeatId(step) {
  return STEP_BEAT[step] || "move";
}

export function getLine(id) {
  return LINES[id] || null;
}
