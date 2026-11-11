/** Approved season frame from docs/PUNK_ME_TZ_locations.md §2. Not a new city or a third plot. */

const CHAPTERS = [
  {
    id: 0,
    title: {
      ru: "Глава 0. Новенький в доме 13",
      uk: "Розділ 0. Новачок у будинку 13",
      en: "Chapter 0. New in House 13",
      da: "Kapitel 0. Ny i hus 13"
    }
  },
  {
    id: 1,
    title: {
      ru: "Глава 1. Прописка",
      uk: "Розділ 1. Прописка",
      en: "Chapter 1. Joining the gang",
      da: "Kapitel 1. Optagelse"
    }
  },
  {
    id: 2,
    title: {
      ru: "Глава 2. Своя точка",
      uk: "Розділ 2. Своє місце",
      en: "Chapter 2. Our own spot",
      da: "Kapitel 2. Vores sted"
    }
  },
  {
    id: 3,
    title: {
      ru: "Глава 3. Ночь на кладбище",
      uk: "Розділ 3. Ніч на цвинтарі",
      en: "Chapter 3. Cemetery night",
      da: "Kapitel 3. Nat på kirkegården"
    }
  },
  {
    id: 4,
    title: {
      ru: "Глава 4. Тайна замка",
      uk: "Розділ 4. Таємниця замку",
      en: "Chapter 4. The castle secret",
      da: "Kapitel 4. Slottets hemmelighed"
    }
  }
];

const STEPS = {
  move: {
    why: {
      ru: "Зачем: это твоя комната в доме 13. Пока ты не пройдёшься, город тебя не узнает.",
      uk: "Навіщо: це твоя кімната в будинку 13. Поки не пройдешся, місто тебе не впізнає.",
      en: "Why: this is your room in House 13. The city does not know you until you walk it.",
      da: "Hvorfor: det er dit værelse i hus 13. Byen kender dig ikke, før du går rundt."
    },
    next: {
      ru: "Дальше: неоновое кольцо на улицу банды. Декор комнаты можно ставить когда хочешь — глава подождёт.",
      uk: "Далі: неонове кільце на вулицю банди. Декор кімнати можна ставити будь-коли — розділ зачекає.",
      en: "Next: the neon ring to Gang Street. Decorate the room whenever you like — the chapter waits.",
      da: "Næste: neonringen til Bandegaden. Pynt værelset når du vil — kapitlet venter."
    },
    control: {
      ru: "Кнопка: WASD или джойстик слева.",
      uk: "Кнопка: WASD або джойстик ліворуч.",
      en: "Control: WASD, or the joystick on the left.",
      da: "Knap: WASD eller joysticket til venstre."
    }
  },
  street: {
    why: {
      ru: "Зачем: на улице живёт банда «Ржавые Цепи». Им негде тусоваться — поэтому весь сезон про своё место.",
      uk: "Навіщо: на вулиці живе банда «Іржаві Ланцюги». Їм ніде тусуватися — тому весь сезон про своє місце.",
      en: "Why: the Rusty Chains live on this street. They have nowhere to hang out — that is the whole season.",
      da: "Hvorfor: Rusty Chains bor på gaden. De har ikke et sted — det er hele sæsonen."
    },
    next: {
      ru: "Дальше: найди Рейзора. Он капитан.",
      uk: "Далі: знайди Рейзора. Він капітан.",
      en: "Next: find Razor. He is the captain.",
      da: "Næste: find Razor. Han er kaptajnen."
    },
    control: {
      ru: "Кнопка: шаг в светящееся кольцо.",
      uk: "Кнопка: крок у кільце, що світиться.",
      en: "Control: step into the glowing ring.",
      da: "Knap: tråd ind i ringen, der lyser."
    }
  },
  razor: {
    why: {
      ru: "Зачем: Рейзор решает, кто в банде. Пока просто поговори. Настоящий выбор — в главе «Прописка».",
      uk: "Навіщо: Рейзор вирішує, хто в банді. Поки просто поговори. Справжній вибір — у розділі «Прописка».",
      en: "Why: Razor decides who is in the gang. For now, just talk. The real choice is the Joining chapter.",
      da: "Hvorfor: Razor bestemmer, hvem der er i banden. Tal bare. Det rigtige valg er optagelsen."
    },
    next: {
      ru: "Дальше: кладбище. Там теряются призраки — из-за треснувшего Колокола. Это намёк на главы 3 и 4.",
      uk: "Далі: цвинтар. Там губляться привиди — через тріснутий Дзвін. Це натяк на розділи 3 і 4.",
      en: "Next: the cemetery. Ghosts get lost there because the Bell cracked. That hints at chapters 3 and 4.",
      da: "Næste: kirkegården. Spøgelser farer vild, fordi Klokken slog revner. Det peger på kapitel 3 og 4."
    },
    control: {
      ru: "Кнопка: подойди и нажми E.",
      uk: "Кнопка: підійди і натисни E.",
      en: "Control: walk up and press E.",
      da: "Knap: gå hen og tryk E."
    }
  },
  cemetery: {
    why: {
      ru: "Зачем: призраки не могут уснуть, пока молчит Колокол замка. Запомни кладбище. Ночь на нём — глава 3. Склепа отдельной дверью ещё нет.",
      uk: "Навіщо: привиди не можуть заснути, поки мовчить Дзвін замку. Запам'ятай цвинтар. Ніч на ньому — розділ 3. Окремих дверей склепу ще немає.",
      en: "Why: the ghosts cannot rest while the castle Bell is silent. Remember this place. Cemetery night is chapter 3. There is no separate crypt door yet.",
      da: "Hvorfor: spøgelserne kan ikke hvile, mens slottets Klokke er stille. Husk stedet. Natten her er kapitel 3. Der er ingen separat krypt-dør endnu."
    },
    next: {
      ru: "Дальше: учебная дуэль с Рейзором. Это ещё не прописка.",
      uk: "Далі: навчальна дуель з Рейзором. Це ще не прописка.",
      en: "Next: a practice duel with Razor. This is not the joining fight yet.",
      da: "Næste: en øveduel med Razor. Det er ikke optagelseskampen endnu."
    },
    control: {
      ru: "Кнопка: кольцо «Кладбище» на улице.",
      uk: "Кнопка: кільце «Цвинтар» на вулиці.",
      en: "Control: the Cemetery ring on the street.",
      da: "Knap: ringen Kirkegård på gaden."
    }
  },
  duel: {
    why: {
      ru: "Зачем: цепи — приветствие банды. Проигрыш ничего не ломает. Нажми «Драка» ещё раз.",
      uk: "Навіщо: ланцюги — привітання банди. Програш нічого не ламає. Натисни «Бій» ще раз.",
      en: "Why: chains are how the gang says hello. Losing breaks nothing. Press Fight again.",
      da: "Hvorfor: kæder er bandens hej. Et nederlag ødelægger intet. Tryk Kamp igen."
    },
    next: {
      ru: "Дальше: лавка. Монеты потом пригодятся на взнос 150 или на стройку.",
      uk: "Далі: крамниця. Монети потім знадобляться на внесок 150 або на будівництво.",
      en: "Next: the shop. Coins later pay the 150 fee or the build.",
      da: "Næste: butikken. Mønter betaler senere gebyret på 150 eller byggeriet."
    },
    control: {
      ru: "Кнопка: «Драка» внизу, потом бей.",
      uk: "Кнопка: «Бій» внизу, потім бий.",
      en: "Control: Fight on the bottom bar, then strike.",
      da: "Knap: Kamp i bunden, så slå."
    }
  },
  shop: {
    why: {
      ru: "Зачем: покупка показывает, что монеты настоящие. Кирпич лачуги и материалы Тусовки лежат на вкладке «Материалы».",
      uk: "Навіщо: покупка показує, що монети справжні. Цегла халупи і матеріали тусовки — на вкладці «Матеріали».",
      en: "Why: a purchase shows the coins are real. The shack brick and hangout materials are on the Materials tab.",
      da: "Hvorfor: et køb viser, at mønterne er rigtige. Skurets mursten og hængets materialer ligger under Materialer."
    },
    next: {
      ru: "Дальше: глава «Прописка». Рейзор пустит в банду за 150 монет или за победу. После нашивки строим Тусовку.",
      uk: "Далі: розділ «Прописка». Рейзор пустить у банду за 150 монет або за перемогу. Після нашивки будуємо тусовку.",
      en: "Next: Joining. Razor lets you in for 150 coins or a win. After the patch we build the hangout.",
      da: "Næste: Optagelse. Razor lukker dig ind for 150 mønter eller en sejr. Så bygger vi hænget."
    },
    control: {
      ru: "Кнопка: «Лавка» внизу экрана.",
      uk: "Кнопка: «Крамниця» внизу екрана.",
      en: "Control: Shop on the bottom bar.",
      da: "Knap: Butik i bunden."
    }
  }
};

function lang() {
  const l = typeof window.getLanguage === "function" ? window.getLanguage() : "ru";
  return l === "uk" || l === "en" || l === "da" || l === "ru" ? l : "en";
}

function tx(bag) {
  if (!bag) return "";
  return bag[lang()] || bag.en || bag.ru || "";
}

export function chapterTitle(id) {
  return tx(CHAPTERS[id]?.title);
}

export function stepBlurb(stepId) {
  const row = STEPS[stepId];
  if (!row) return "";
  return [tx(row.why), tx(row.control), tx(row.next)].filter(Boolean).join(" ");
}

export function currentChapterIndex(player) {
  const p = player || {};
  const st = p.story || {};
  if ((st.hangoutStage || 0) >= 4) return 3;
  if (st.flags?.joined_gang) return 2;
  if (p.onboarding?.done) return 1;
  return 0;
}

export function leadObjective(player, story) {
  const p = player || {};
  const st = story || p.story || {};
  if (!p.onboarding?.done || st.flags?.joined_gang) return null;
  return {
    title: chapterTitle(1),
    objective: tx({
      ru: "Поговори с Рейзором на улице. В банду «Ржавые Цепи» пускают за 150 монет или за победу в дуэли. Можно ещё разрисовать город граффити.",
      uk: "Поговори з Рейзором на вулиці. У банду «Іржаві Ланцюги» пускають за 150 монет або за перемогу в дуелі. Можна ще розмалювати місто графіті.",
      en: "Talk to Razor on the street. The Rusty Chains let you in for 150 coins or a duel win. Flyer graffiti is a third way.",
      da: "Tal med Razor på gaden. Rusty Chains lukker dig ind for 150 mønter eller en sejret duel. Graffiti er en tredje vej."
    }),
    sub: tx({
      ru: "Зачем: без нашивки Тусовку не построить. Что будет после: глава «Своя точка», четыре этапа стройки. Пицца, смотритель и крыша — дополнительные проверки, их можно не делать. Гуляй и украшай комнату свободно — сюжет подождёт.",
      uk: "Навіщо: без нашивки тусовку не побудувати. Що далі: розділ «Своє місце», чотири етапи будівництва. Піца, доглядач і дах — додаткові перевірки, їх можна не робити. Гуляй і прикрашай кімнату вільно — сюжет зачекає.",
      en: "Why: no patch, no hangout. After: chapter Our own spot, four build stages. Pizza, the Keeper and the roof are extra tests you can skip. Wander and decorate — the story waits.",
      da: "Hvorfor: uden mærket kan hænget ikke bygges. Efter: kapitlet Vores sted, fire byggeetaper. Pizza, Vogteren og taget er ekstra prøver, du kan springe over. Gå og pynt — historien venter."
    }),
    beacon: "npc_razor"
  };
}

export function hangoutWhy() {
  return tx({
    ru: "Зачем: банду гоняют отовсюду, пока нет своей точки. Четыре этапа тратят материалы из лавки. Когда Тусовка готова, дочь соседей Зомбина находит кусок Колокола — так начинается кладбище и замок. Комнату можно украшать параллельно.",
    uk: "Навіщо: банду ганяють звідусіль, поки немає свого місця. Чотири етапи витрачають матеріали з крамниці. Коли тусовка готова, донька сусідів Зомбіна знаходить шматок Дзвона — так починаються цвинтар і замок. Кімнату можна прикрашати паралельно.",
    en: "Why: the gang gets chased off every corner until they have a spot. Four stages spend shop materials. When the hangout is done, the neighbor girl Zombina finds a piece of the Bell — that opens the cemetery night and the castle. Decorate your room anytime.",
    da: "Hvorfor: banden jages væk, indtil de har et sted. Fire etaper bruger materialer fra butikken. Når hænget er klar, finder naboens datter Zombina et stykke af Klokken — så begynder kirkegårdsnatten og slottet. Pynt værelset når som helst."
  });
}

export function journalHtml(player) {
  const p = player || {};
  const who = p.characterId || "—";
  const now = chapterTitle(currentChapterIndex(p));
  return `
    <p><b>${tx({ ru: "Кто я?", uk: "Хто я?", en: "Who am I?", da: "Hvem er jeg?" })}</b> ${who}. ${tx({
      ru: "Ты новенький панк в доме 13, город Тыквоград. Ангелина — ведущая, не твой скин. Банда — «Ржавые Цепи». Соседи-зомби — семья Мёртвиновых, их дочь Зомбина. В замке скучает Граф Нетопырёв.",
      uk: "Ти новий панк у будинку 13, місто Гарбузоград. Ангеліна — ведуча, не твій скін. Банда — «Іржаві Ланцюги». Сусіди-зомбі — родина Мертвінових, їхня донька Зомбіна. У замку сумує Граф Нетопирів.",
      en: "You are the new punk in House 13, Pumpkin City. Angelina is the host, not your skin. The gang is the Rusty Chains. The zombie neighbors are the Mertvinovs, and their daughter is Zombina. Count Batwing mopes in the castle.",
      da: "Du er den nye punker i hus 13, Græskarby. Angelina er værten, ikke dit skin. Banden er Rusty Chains. Zombie-naboerne er Mertvinov-familien, deres datter er Zombina. Grev Flagermus keder sig på slottet."
    })}</p>
    <p><b>${tx({ ru: "Большая цель", uk: "Велика ціль", en: "The big goal", da: "Det store mål" })}</b> ${tx({
      ru: "Пятьдесят лет назад группа «Мёртвый Сезон» (это Мёртвиновы) сыграла на балу так громко, что треснул Колокол. Призраки с тех пор теряются. Нужно собрать три части Колокола и устроить новый концерт. Концовки все добрые: снять проклятие, оставить зомби-стиль или договориться с Графом.",
      uk: "П'ятдесят років тому гурт «Мертвий Сезон» (це Мертвінови) зіграв на балу так голосно, що тріснув Дзвін. Відтоді привиди губляться. Треба зібрати три частини Дзвона і влаштувати новий концерт. Усі кінцівки добрі: зняти прокляття, лишити стиль зомбі або домовитися з Графом.",
      en: "Fifty years ago the band Dead Season (the Mertvinovs) played the ball so loud the Bell cracked. Ghosts have been getting lost ever since. Collect the Bell's three pieces and play a new concert. Every ending is kind: lift the curse, keep the zombie style, or make a deal with the Count.",
      da: "For halvtreds år siden spillede bandet Død Sæson (Mertvinov-familien) så højt, at Klokken slog revner. Spøgelser er faret vild siden. Saml Klokkens tre dele og hold en ny koncert. Alle slutninger er rare: løft forbandelsen, behold zombie-stilen, eller lav en aftale med Greven."
    })}</p>
    <p><b>${tx({ ru: "Где я в истории", uk: "Де я в історії", en: "Where I am in the story", da: "Hvor jeg er i historien" })}</b> ${now}.</p>
    <p><b>${tx({ ru: "Свободная игра", uk: "Вільна гра", en: "Free play", da: "Fri leg" })}</b> ${tx({
      ru: "Как в мире-песочнице: комнату, одежду и прогулки можно делать в любой момент. Главы только подсказывают, зачем идти дальше. Они не запирают город.",
      uk: "Як у світі-пісочниці: кімнату, одяг і прогулянки можна робити будь-коли. Розділи лише підказують, навіщо йти далі. Вони не замикають місто.",
      en: "Like a sandbox world: the room, clothes and walks are always yours. Chapters only say why the next step matters. They do not lock the city.",
      da: "Som en sandkasse: værelset, tøjet og turene er altid dine. Kapitler siger kun, hvorfor næste skridt betyder noget. De låser ikke byen."
    })}</p>
    <p><b>${tx({ ru: "Что строится сейчас", uk: "Що будується зараз", en: "What you can build now", da: "Hvad du kan bygge nu" })}</b> ${tx({
      ru: "Комната — кнопка «Декор», сохраняется. Город — «Стройка»: камень склепа, неоновая панель, кирпич лачуги. После нашивки — Тусовка на стройке, 4 этапа, материалы в лавке.",
      uk: "Кімната — кнопка «Декор», зберігається. Місто — «Будівництво»: камінь склепу, неонова панель, цегла халупи. Після нашивки — тусовка на будівництві, 4 етапи, матеріали в крамниці.",
      en: "Room — Decor, and it saves. City — Build: crypt stone, neon panel, shack brick. After the patch — the hangout on the construction site, 4 stages, materials in the shop.",
      da: "Værelse — Dekor, og det gemmes. By — Byg: krypt-sten, neonpanel, skur-mursten. Efter mærket — hænget på byggepladsen, 4 etaper, materialer i butikken."
    })}</p>
    <p><b>${tx({ ru: "Что ещё в сценарии, но не отдельной дверью", uk: "Що ще в сценарії, але не окремими дверима", en: "Still in the script, not a separate door", da: "Stadig i manus, ikke en separat dør" })}</b> ${tx({
      ru: "Дом Мёртвиновых, склеп как комната, замок Графа и свободные участки Тыквограда. Ангелина говорит о них заранее, но не притворяется, что дверь уже есть.",
      uk: "Будинок Мертвінових, склеп як кімната, замок Графа і вільні ділянки Гарбузограда. Ангеліна каже про них заздалегідь, але не вдає, що двері вже є.",
      en: "The Mertvinov house, the crypt as its own room, the Count's castle, and free Pumpkin City plots. Angelina mentions them early and does not pretend the door is already there.",
      da: "Mertvinovs hus, krypten som sit eget rum, Grevens slot og frie grunde i Græskarby. Angelina nævner dem tidligt og lader ikke, som om døren allerede er der."
    })}</p>`;
}

export function installStoryChapters() {
  window.StoryChapters = {
    chapterTitle,
    stepBlurb,
    currentChapterIndex,
    leadObjective,
    hangoutWhy,
    journalHtml
  };
}
