/* Локализация: ru / en / da */
const I18N = {
  ru: {
    coins: "Монеты", xp: "XP", level: "Уровень", rep: "Репутация", chain: "Цепь", online: "Здесь", onlineGlobal: "Всего в игре",
    loading: "Вход в банду...", chatPh: "Чат банды...", onlineSide: "В этой локации", alone: "Пока одни…",
    map: "Карта", gang: "Банда", shop: "Лавка", magic: "Магия", inv: "Инвентарь", job: "Работа", build: "Стройка",
    decor: "Декор", fight: "Драка", parkour: "Паркур", you: "(ты)", buy: "Купить", owned: "Есть", free: "FREE",
    mapTitle: "Карта ночи", mapDesc: "Выбери локацию — телепорт откроет сцену.",
    go: "Идти", here: "Ты здесь", gangTitle: "Живая банда", shopTitle: "Неоновая лавка",
    jobTitle: "Подработки банды", jobDesc: "Выбери смену — тебя отвезут на локацию.",
    fightTitle: "Цепная дуэль", flee: "Сбежать", chainBtn: "Цепь", kick: "Пинок", heavy: "Тяжёлый", scroll: "Свиток",
    tab_clothes: "Одежда", tab_chains: "Цепи", tab_magic: "Магия", tab_pets: "Питомцы", tab_materials: "Материалы",
    quest_done: "Все задания выполнены!", notEnough: "Не хватает монет", bought: "Куплено",
    dogBark: "Гав!", petHappy: "Пёс рад! +6 монет", chatDown: "Чат временно недоступен",
    ownerCoinsHint: "владелец"
  },
  en: {
    coins: "Coins", xp: "XP", level: "Level", rep: "Rep", chain: "Chain", online: "Here", onlineGlobal: "Total online",
    loading: "Joining the gang...", chatPh: "Gang chat...", onlineSide: "In this location", alone: "Just you for now…",
    map: "Map", gang: "Gang", shop: "Shop", magic: "Magic", inv: "Bag", job: "Jobs", build: "Build",
    decor: "Decor", fight: "Fight", parkour: "Parkour", you: "(you)", buy: "Buy", owned: "Owned", free: "FREE",
    mapTitle: "Night map", mapDesc: "Pick a location to jump there.",
    go: "Go", here: "You are here", gangTitle: "Living gang", shopTitle: "Neon shop",
    jobTitle: "Gang side jobs", jobDesc: "Pick a shift — you will be taken to the spot.",
    fightTitle: "Chain duel", flee: "Run", chainBtn: "Chain", kick: "Kick", heavy: "Heavy", scroll: "Scroll",
    tab_clothes: "Clothes", tab_chains: "Chains", tab_magic: "Magic", tab_pets: "Pets", tab_materials: "Materials",
    quest_done: "All quests done!", notEnough: "Not enough coins", bought: "Purchased",
    dogBark: "Woof!", petHappy: "Dog is happy! +6 coins", chatDown: "Chat unavailable",
    ownerCoinsHint: "owner"
  },
  da: {
    coins: "Mønter", xp: "XP", level: "Niveau", rep: "Respekt", chain: "Kæde", online: "Her", onlineGlobal: "Online i alt",
    loading: "Går ind i banden...", chatPh: "Bandechat...", onlineSide: "På denne lokation", alone: "Kun dig lige nu…",
    map: "Kort", gang: "Bande", shop: "Butik", magic: "Magie", inv: "Taske", job: "Job", build: "Byg",
    decor: "Dekor", fight: "Slåskamp", parkour: "Parkour", you: "(dig)", buy: "Køb", owned: "Ejet", free: "GRATIS",
    mapTitle: "Natkort", mapDesc: "Vælg et sted for at hoppe dertil.",
    go: "Gå", here: "Du er her", gangTitle: "Levende bande", shopTitle: "Neon-butik",
    jobTitle: "Bande-jobs", jobDesc: "Vælg et skift — du bliver taget til stedet.",
    fightTitle: "Kæde-duel", flee: "Flygt", chainBtn: "Kæde", kick: "Spark", heavy: "Tung", scroll: "Rune",
    tab_clothes: "Tøj", tab_chains: "Kæder", tab_magic: "Magie", tab_pets: "Kæledyr", tab_materials: "Materialer",
    quest_done: "Alle opgaver klaret!", notEnough: "Ikke nok mønter", bought: "Købt",
    dogBark: "Vov!", petHappy: "Hunden er glad! +6 mønter", chatDown: "Chat utilgængelig",
    ownerCoinsHint: "ejer"
  }
};

const LOC_TITLES = {
  room: { ru: "Комната панка", en: "Punk room", da: "Punk-værelse" },
  kitchen: { ru: "Кухня", en: "Kitchen", da: "Køkken" },
  toilet: { ru: "Туалет", en: "Toilet", da: "Toilet" },
  elevator: { ru: "Лифт", en: "Elevator", da: "Elevator" },
  roof: { ru: "Крыша", en: "Rooftop", da: "Tag" },
  street: { ru: "Улица банды", en: "Gang street", da: "Bandegade" },
  cemetery: { ru: "Кладбище у Вены", en: "Vienna cemetery", da: "Wien-kirkegård" },
  city: { ru: "Стройка кварталов", en: "District build", da: "Byggekvarter" },
  parkour: { ru: "Крышный паркур", en: "Rooftop parkour", da: "Tag-parkour" }
};

let currentLang = "en";

function detectBrowserLang() {
  const l = (navigator.language || "en").slice(0, 2).toLowerCase();
  if (l === "ru" || l === "da") return l;
  return "en";
}

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || key;
}

function locTitle(id) {
  const o = LOC_TITLES[id];
  return o ? (o[currentLang] || o.en) : id;
}

function setLanguage(lang, persist) {
  if (!I18N[lang]) lang = "en";
  currentLang = lang;
  document.documentElement.lang = lang;
  if (persist) {
    try { localStorage.setItem("punkme_lang", lang); } catch (e) {}
    if (window.me && window.uid) {
      window.me.lang = lang;
      if (typeof window.saveMe === "function") window.saveMe();
    }
  }
  applyI18nDom();
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });
  if (typeof window.onLanguageChanged === "function") window.onLanguageChanged();
}

function initLanguage(saved) {
  const stored = saved || (() => { try { return localStorage.getItem("punkme_lang"); } catch (e) { return null; } })();
  setLanguage(stored || detectBrowserLang(), false);
}

function applyI18nDom() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.getAttribute("data-i18n");
    if (k) el.textContent = t(k);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    el.placeholder = t(el.getAttribute("data-i18n-ph"));
  });
  const side = document.querySelector("#playersSide b");
  if (side) side.textContent = t("onlineSide");
}

window.t = t;
window.locTitle = locTitle;
window.setLanguage = setLanguage;
window.initLanguage = initLanguage;
window.getLanguage = () => currentLang;
window.applyI18nDom = applyI18nDom;
