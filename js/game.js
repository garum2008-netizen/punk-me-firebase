/* PUNK ME — оригинальная неоновая игра про панк-банду подростков */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyACAXPV9H4vfWNUoRYEWzXi6CSX0kpCaho",
  authDomain: "punk-me-40605.firebaseapp.com",
  databaseURL: "https://punk-me-40605-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "punk-me-40605",
  messagingSenderId: "761070335468",
  appId: "1:761070335468:web:4bffd5120ef98e79f47cc9",
  storageBucket: "punk-me-40605.firebasestorage.app"
};
const OWNER_EMAIL = "garum2008@gmail.com";
const GAME_VERSION = "living3d-v22r5-accounts-r1";
window.GAME_VERSION = GAME_VERSION;
window.__punkFirebaseReady =
  window.__punkFirebaseReady ||
  new Promise(resolve => {
    window.__punkResolveFirebaseReady = resolve;
  });
const PRESENCE_STALE_MS = 120000;

function connectFirebaseEmulatorsIfRequested() {
  try {
    const q = new URLSearchParams(location.search);
    if (!q.has("firebaseEmulator")) return;
    const host = q.get("firebaseEmulatorHost") || "127.0.0.1";
    const dbPort = parseInt(q.get("firebaseEmulatorDbPort") || "9000", 10);
    const authPort = parseInt(q.get("firebaseEmulatorAuthPort") || "9099", 10);
    firebase.database().useEmulator(host, dbPort);
    firebase.auth().useEmulator(`http://${host}:${authPort}`);
  } catch (e) {
    console.warn("Firebase emulator connect failed", e);
  }
}
const PRIVATE_ROOM_ID = "room";
let moveSaveTimer = null;
let portalCooldown = 0;
let lastPresenceAnimPush = 0;

function soloMode() {
  try {
    if (window.__PUNK_PREVIEW__ === true) return true;
    return new URLSearchParams(location.search).has("solo");
  } catch (e) {
    return false;
  }
}

function isPreviewBuild() {
  return window.__PUNK_PREVIEW__ === true;
}

function installPreviewBanner() {
  if (document.getElementById("previewBuildBanner")) return;
  const el = document.createElement("div");
  el.id = "previewBuildBanner";
  el.className = "preview-build-banner";
  el.setAttribute("role", "status");
  el.textContent = "PREVIEW — test build, progress saved only on this device";
  document.body.prepend(el);
}

function disablePreviewChatUi() {
  document.body.classList.add("preview-no-chat");
  const panel = document.getElementById("chatPanel");
  if (panel) panel.hidden = true;
}

function bootPreviewSession() {
  installPreviewBanner();
  disablePreviewChatUi();
  uid = window.PunkPreviewSave?.getDeviceId?.() || "preview_local";
  window.uid = uid;
  isOwner = false;
  window.isOwner = false;
  window.__punkFirebaseReady = Promise.resolve();
  window.dispatchEvent(new Event("punkme-firebase-ready"));
  const saved = window.PunkPreviewSave?.load?.();
  if (saved) {
    applyFirebasePlayerSnapshot({
      exists: () => true,
      val: () => saved
    });
    finishLoadMeFlow();
    return;
  }
  window.__playerLoaded = false;
  hideLoading();
  const openSelect = () => {
    if (window.CharSelect) CharSelect.open(pickCharacterAndContinue);
    else setTimeout(openSelect, 120);
  };
  openSelect();
}

function demoPartyMode() {
  try {
    return new URLSearchParams(location.search).has("demo3");
  } catch (e) {
    return false;
  }
}

function othersForStage3D() {
  if (demoPartyMode()) {
    return {
      demo_mohawk: { name: "Mohawk", x: 56, y: 58, characterId: "mohawk", anim: "idle" },
      demo_vienna: { name: "Vienna", x: 40, y: 64, characterId: "vienna", anim: "idle" }
    };
  }
  if (soloMode()) return {};
  return others;
}

function devCoinsEnabled() {
  try {
    return new URLSearchParams(location.search).has("dev") || localStorage.getItem("punkme_dev") === "1";
  } catch (e) { return false; }
}

const LOCATIONS = {
  room: {
    id: "room", title: "Комната панка", bg: "imagine_images/q4BXV.jpg",
    doors: [
      { x: 8, y: 42, w: 10, h: 18, to: "kitchen", labelKey: "door_kitchen" },
      { x: 82, y: 38, w: 10, h: 20, to: "toilet", labelKey: "door_toilet" },
      { x: 44, y: 72, w: 14, h: 14, to: "elevator", labelKey: "door_elevator" },
      { x: 68, y: 18, w: 12, h: 14, to: "roof", labelKey: "door_roof" }
    ],
    npcs: ["vienna", "mohawk", "cobalt"],
    job: false, buildZone: "room_private"
  },
  kitchen: {
    id: "kitchen", title: "Кухня", bg: "imagine_images/kwt1b.jpg",
    doors: [{ x: 4, y: 50, w: 8, h: 16, to: "room", labelKey: "door_room" }],
    npcs: ["zoya"],
    job: true
  },
  toilet: {
    id: "toilet", title: "Туалет", bg: "imagine_images/ocVdL.jpg",
    doors: [{ x: 6, y: 48, w: 8, h: 16, to: "room", labelKey: "door_room" }],
    npcs: ["plukh"]
  },
  elevator: {
    id: "elevator", title: "Лифт", bg: "imagine_images/VmOQt.jpg",
    doors: [
      { x: 20, y: 55, w: 18, h: 20, to: "room", labelKey: "door_room" },
      { x: 42, y: 30, w: 16, h: 18, to: "roof", labelKey: "door_roof" },
      { x: 62, y: 30, w: 16, h: 18, to: "street", labelKey: "door_street" }
    ]
  },
  roof: {
    id: "roof", title: "Крыша", bg: "imagine_images/SXE19.jpg",
    doors: [
      { x: 10, y: 60, w: 12, h: 16, to: "elevator", labelKey: "door_elevator" },
      { x: 78, y: 35, w: 12, h: 18, to: "parkour", labelKey: "door_parkour" }
    ],
    npcs: ["mohawk", "cobalt"],
    night: true
  },
  street: {
    id: "street", title: "Улица банды", bg: "imagine_images/77Mdp.jpg",
    doors: [
      { x: 6, y: 55, w: 10, h: 16, to: "elevator", labelKey: "door_home" },
      { x: 85, y: 45, w: 10, h: 18, to: "cemetery", labelKey: "door_cemetery" },
      { x: 45, y: 70, w: 14, h: 14, to: "city", labelKey: "door_city" }
    ],
    npcs: ["razor", "mohawk", "vienna", "cobalt", "ghost"],
    night: true
  },
  cemetery: {
    id: "cemetery", title: "Кладбище у Вены", bg: "imagine_images/RgdDh.jpg",
    doors: [{ x: 4, y: 52, w: 10, h: 16, to: "street", labelKey: "door_street" }],
    job: true, night: true,
    npcs: ["gravedigger", "cobalt"]
  },
  city: {
    id: "city", title: "Город", bg: "imagine_images/Z7wM3.jpg",
    doors: [
      { x: 5, y: 58, w: 10, h: 14, to: "street", labelKey: "door_street" },
      { x: 88, y: 42, w: 10, h: 14, to: "construction", labelKey: "door_construction" }
    ],
    buildZone: "city",
    npcs: ["tony", "bolt"],
    job: true,
    night: true
  },
  construction: {
    id: "construction", title: "Стройка", bg: "imagine_images/Z7wM3.jpg",
    doors: [{ x: 5, y: 58, w: 10, h: 14, to: "city", labelKey: "door_city" }],
    npcs: ["foreman", "vintik"],
    job: true,
    night: true
  },
  parkour: {
    id: "parkour", title: "Крышный паркур", bg: "imagine_images/tvSdj.jpg",
    doors: [{ x: 8, y: 62, w: 12, h: 14, to: "roof", labelKey: "door_roof" }],
    parkour: true, night: true
  }
};

const NPCS = {
  razor: {
    id: "razor", name: "Рейзор", img: "imagine_images/LTPb8.jpg",
    linesI18n: {
      ru: ["Цепи звенят — это наш гимн. Покажи, что не слабак.", "На улице ночью только свои.", "Выполни квест — банда запомнит."],
      en: ["Chains are our anthem. Prove you are not soft.", "At night the street is for the gang.", "Finish the quest — we will remember."],
      da: ["Kæder er vores hymne. Vis du ikke er blød.", "Om natten er gaden for banden.", "Fuldfør opgaven — vi husker dig."]
    },
    quest: "chain_duel"
  },
  cobalt: {
    id: "cobalt", name: "Кобальт", img: "imagine_images/KY3Sa.jpg",
    lines: [
      "Прыгай выше неона — я прикрою с крыши.",
      "Короткий путь через кладбище? Только если не боишься тумана.",
      "Паркур — наш язык. Слушай ритм шагов."
    ],
    quest: "parkour_rep"
  },
  mohawk: {
    id: "mohawk", name: "Ирокез", img: "imagine_images/Lix06.jpg",
    lines: [
      "Магия — не сказки. Неоновый всплеск реально жжёт.",
      "Купи свиток в лавке, если руки чешутся колдовать.",
      "Крышный паркур — лучший способ прокачать репутацию."
    ],
    quest: "parkour_rep"
  },
  vienna: {
    id: "vienna", name: "Вена", img: "imagine_images/Oo040.jpg",
    lines: [
      "Кладбище рядом с Веной платит честно — копай и убирай.",
      "NOT DEAD YET — наша табличка. Живём громко.",
      "Построй три склепа в городе — откроется новый район."
    ],
    quest: "build_crypts"
  },
  ghost: {
    id: "ghost", name: "Призрак Сцены", img: "imagine_images/ilRF3.jpg",
    lines: [
      "Слышишь бас? Это ночь дышит вместе с нами.",
      "Полиция мелькает фарами — не стой на виду слишком долго.",
      "Коты знают короткие пути между локациями."
    ]
  },
  zoya: {
    id: "zoya", name: "Бабуля Зоя", visualId: "vienna", img: "imagine_images/kwt1b.jpg",
    linesI18n: {
      ru: ["Пирог стынет — не заставляй бабушку ждать!"],
      en: ["The pie is getting cold — don't keep grandma waiting!"],
      da: ["Tærte'n køler — lad ikke bedstemor vente!"]
    }
  },
  plukh: {
    id: "plukh", name: "Плюх", visualId: "cobalt", img: "imagine_images/ilRF3.jpg",
    linesI18n: {
      ru: ["Пс-с! Только не смывай!"],
      en: ["Psst! Don't flush!"],
      da: ["Psst! Ikke skyl!"]
    }
  },
  tony: {
    id: "tony", name: "Тони", visualId: "mohawk", img: "imagine_images/77Mdp.jpg",
    linesI18n: {
      ru: ["Пицца сама себя не довезёт!"],
      en: ["Pizza won't deliver itself!"],
      da: ["Pizzaen leverer ikke sig selv!"]
    }
  },
  bolt: {
    id: "bolt", name: "Дядя Болт", visualId: "mohawk", img: "imagine_images/BtmE4.jpg",
    linesI18n: {
      ru: ["Доска — 10 монет, гвозди — 5. Лом скупаю по 3."],
      en: ["Board — 10 coins, nails — 5. Scrap pays 3 each."],
      da: ["Bræt — 10 mønter, søm — 5. Skrot 3 stykket."]
    }
  },
  foreman: {
    id: "foreman", name: "Михална", visualId: "vienna", img: "imagine_images/Lix06.jpg",
    linesI18n: {
      ru: ["Каску надень! Ой, нет каски…"],
      en: ["Helmet on! Oh, no helmet…"],
      da: ["Hjelm på! Åh, ingen hjelm…"]
    }
  },
  vintik: {
    id: "vintik", name: "Винтик", visualId: "mohawk", img: "imagine_images/9iBXD.jpg",
    linesI18n: {
      ru: ["Три минуты смены — и доски твои!"],
      en: ["Three-minute shift — boards are yours!"],
      da: ["Tre minutter — så er brædderne dine!"]
    }
  },
  gravedigger: {
    id: "gravedigger", name: "Смотритель", img: "imagine_images/HePl7.jpg",
    lines: [
      "Работа простая: копать, чистить, поливать. Платишь потом — монетами.",
      "Не ломай памятники. Банда и так достаточно шумная.",
      "Ночью здесь холоднее. Держи куртку."
    ]
  }
};

const SHOP = {
  clothes: [
    { id: "jacket_neon", cat: "clothes", name: "Неоновая куртка", price: 220, img: "imagine_images/LTPb8.jpg", stat: { def: 3 } },
    { id: "mohawk_dye", cat: "clothes", name: "Краситель ирокеза", price: 180, img: "imagine_images/KY3Sa.jpg", stat: { rep: 5 } },
    { id: "boots_spike", cat: "clothes", name: "Шипованные ботинки", price: 200, img: "imagine_images/9iBXD.jpg", stat: { chain: 2 } },
    { id: "hat_spike", cat: "clothes", name: "Шипастая шляпа", price: 160, img: "imagine_images/KY3Sa.jpg", stat: { rep: 3 } }
  ],
  chains: [
    { id: "chain_rust", cat: "chains", name: "Ржавая цепь", price: 120, img: "imagine_images/C34xz.jpg", stat: { chain: 8 } },
    { id: "chain_neon", cat: "chains", name: "Неоновая цепь", price: 280, img: "imagine_images/Lix06.jpg", stat: { chain: 15 } },
    { id: "chain_vienna", cat: "chains", name: "Венская цепь", price: 400, img: "imagine_images/QTaiE.jpg", stat: { chain: 22 } }
  ],
  magic: [
    { id: "spell_neon_flash", cat: "magic", name: "Свиток: Неоновый всплеск", price: 150, img: "imagine_images/VlJGD.jpg", spell: "neon_flash" },
    { id: "spell_graffiti", cat: "magic", name: "Свиток: Граффити-щит", price: 130, img: "imagine_images/aWXpu.jpg", spell: "graffiti_shield" },
    { id: "spell_shadow", cat: "magic", name: "Свиток: Теневой рывок", price: 170, img: "imagine_images/iVbon.jpg", spell: "shadow_dash" },
    { id: "spell_spark", cat: "magic", name: "Свиток: Искра цепи", price: 190, img: "imagine_images/ercEN.jpg", spell: "chain_spark" }
  ],
  pets: [
    { id: "pet_dog", cat: "pets", name: "Панковый пёс", price: 280, img: "imagine_images/sgz0l.jpg", bonus: { follow: true } },
    { id: "pet_cat", cat: "pets", name: "Ночной кот", price: 300, img: "imagine_images/q4BXV.jpg", bonus: { job: 1.15 } },
    { id: "pet_rat", cat: "pets", name: "Канализационная крыса", price: 250, img: "imagine_images/p5uQj.jpg", bonus: { coins: 1.1 } },
    { id: "pet_crow", cat: "pets", name: "Кладбищенская ворона", price: 320, img: "imagine_images/R5cVh.jpg", bonus: { magic: 1.2 } }
  ],
  materials: [
    { id: "mat_crypt", cat: "materials", name: "Камень склепа", price: 80, img: "imagine_images/DBvDX.jpg", build: "crypt" },
    { id: "mat_neon", cat: "materials", name: "Неоновая панель", price: 60, img: "imagine_images/cV5Em.jpg", build: "neon_sign" },
    { id: "mat_brick", cat: "materials", name: "Кирпич из мусора", price: 45, img: "imagine_images/BtmE4.jpg", build: "shack" }
  ]
};

const SPELLS = {
  neon_flash: { name: "Неоновый всплеск", dmg: 18, cd: 8000 },
  graffiti_shield: { name: "Граффити-щит", shield: 20, cd: 12000 },
  shadow_dash: { name: "Теневой рывок", skip: true, cd: 10000 },
  chain_spark: { name: "Искра цепи", dmg: 24, cd: 9000 }
};

const QUESTS = {
  intro: {
    title: "Ночь начинается",
    text: "Поговори с Рейзором на улице и выиграй цепную дуэль.",
    need: { talk_razor: 1, win_fight: 1 },
    reward: { coins: 100, xp: 40 }
  },
  chain_duel: {
    title: "Цепной вызов",
    text: "Победи соперника в цепной драке (NPC на улице).",
    need: { win_fight: 1 },
    reward: { coins: 80, xp: 35 }
  },
  parkour_rep: {
    title: "Прыжок репутации",
    text: "Пройди крышный паркур без падения.",
    need: { parkour_win: 1 },
    reward: { coins: 60, xp: 50, rep: 10 }
  },
  build_crypts: {
    title: "Три склепа",
    text: "Поставь 3 объекта в городе (склеп или дом).",
    need: { built: 3 },
    reward: { coins: 150, xp: 60, rep: 15 }
  }
};

const ALL_SHOP = [...SHOP.clothes, ...SHOP.chains, ...SHOP.magic, ...SHOP.pets, ...SHOP.materials];

let auth, db, uid, isOwner = false;
let presenceRef = null;
let presenceListenRef = null;
let me = null;
let others = {};
let buildings = [];
let buildMode = false;
let selectedBuild = "crypt";
let fight = null;
let spellCooldowns = {};
let ambients = [];
let shopTab = "clothes";
let presenceOk = true;
let playersListenRef = null;
let dogPos = { x: 38, y: 65 };
let dogWag = false;
let pendingJobAction = null;

const JOB_BOARD = [
  { id: "dig", titleKey: "job_dig", loc: "cemetery", action: "dig", descKey: "job_cemetery_spot" },
  { id: "cobwebs", titleKey: "job_cobwebs", loc: "cemetery", action: "cobwebs", descKey: "job_corners" },
  { id: "parkour_run", titleKey: "job_parkour", loc: "parkour", action: "parkour", descKey: "job_roof_route" },
  { id: "cemetery_night", titleKey: "job_cemetery_night", loc: "cemetery", action: "cemetery_night", descKey: "job_cemetery_night_desc" },
  { id: "pizza_delivery", titleKey: "job_pizza", loc: "city", action: "pizza_delivery", descKey: "job_pizza_desc" },
  { id: "flyer_post", titleKey: "job_flyers", loc: "street", action: "flyer_post", descKey: "job_flyers_desc" },
  { id: "construction_helper", titleKey: "job_helper", loc: "construction", action: "construction_helper", descKey: "job_helper_desc" },
  { id: "dishes_zoya", titleKey: "job_dishes", loc: "kitchen", action: "dishes_zoya", descKey: "job_dishes_desc" }
];

function defaultPlayer() {
  const n = Math.floor(Math.random() * 900) + 100;
  return {
    name: "Панк" + n,
    coins: devCoinsEnabled() ? 9999 : 100,
    energy: 100,
    mood: 100,
    xp: 0,
    level: 1,
    rep: 0,
    location: "room",
    x: 42,
    y: 62,
    avatar: "imagine_images/LTPb8.jpg",
    owned: [],
    inventory: { materials: {}, spells: [] },
    equipment: { chains: null, jacket: null },
    pet: null,
    stats: { chain: 10, magic: 8, hp: 100, maxHp: 100 },
    quests: { active: "intro", progress: {} },
    onboarding: { step: 0, progress: {}, done: false },
    lifeCh1: null,
    jobCooldowns: { dig: 0, clean: 0, water: 0, cobwebs: 0 },
    lastJob: 0,
    built: 0,
    decor: [],
    dog: { x: 38, y: 65 },
    characterId: null,
    lastSeen: Date.now(),
    story: null,
    authority: 0,
    gang_rank: "newbie"
  };
}

const CHAR_ID_STORAGE_KEY = "punkme_character_id";
const LOAD_ME_TIMEOUT_MS = 10000;
let loadMeGeneration = 0;
let loadMeTimeoutId = null;

function readStoredCharacterId() {
  try {
    const id = localStorage.getItem(CHAR_ID_STORAGE_KEY);
    if (id && typeof isCharacterJoinable === "function" && isCharacterJoinable(id)) return id;
  } catch (e) {}
  return null;
}

function writeStoredCharacterId(id) {
  if (!id) return;
  try {
    localStorage.setItem(CHAR_ID_STORAGE_KEY, id);
  } catch (e) {}
}

function inferCharacterIdFromSave(v) {
  if (!v || typeof v !== "object") return null;
  const direct = v.characterId || v.character || v.heroId || v.hero;
  if (direct && typeof direct === "string" && typeof isCharacterJoinable === "function" && isCharacterJoinable(direct)) {
    return direct;
  }
  const av = v.avatar;
  if (av && typeof av === "string" && typeof PLAYABLE_CHARACTER_IDS !== "undefined") {
    for (const id of PLAYABLE_CHARACTER_IDS) {
      if (getCharacterDef(id).poster === av) return id;
    }
  }
  return null;
}

function migratePlayerFromSave(raw) {
  if (!raw || typeof raw !== "object") return {};
  const v = { ...raw };
  if (!v.characterId) {
    const inferred = inferCharacterIdFromSave(v);
    if (inferred) v.characterId = inferred;
  }
  if (typeof v.characterId === "string" && !v.characterId.trim()) delete v.characterId;
  if (v.story && typeof v.story === "object") {
    if (v.story.quest != null && typeof v.story.quest !== "object") {
      v.story.quest = { activeId: null, step: 0, completed: {} };
    } else if (v.story.quest) {
      const qc = v.story.quest.completed;
      if (qc == null || typeof qc !== "object" || Array.isArray(qc)) v.story.quest.completed = {};
    }
    if (v.story.materials != null && typeof v.story.materials !== "object") v.story.materials = {};
  }
  if (v.quests != null && typeof v.quests !== "object") v.quests = { active: "intro", progress: {} };
  if (v.onboarding != null && typeof v.onboarding !== "object") v.onboarding = { step: 0, progress: {}, done: false };
  if (v.inventory != null && typeof v.inventory !== "object") v.inventory = { materials: {}, spells: [] };
  if (v.lifeCh1 != null && typeof v.lifeCh1 !== "object") v.lifeCh1 = null;
  return v;
}

function clearLoadMeTimeout() {
  if (loadMeTimeoutId) {
    clearTimeout(loadMeTimeoutId);
    loadMeTimeoutId = null;
  }
}

function restoreLoadingMarkup() {
  const el = document.getElementById("loading");
  if (!el) return;
  el.style.display = "flex";
  el.innerHTML = `<div style="font-size:22px;font-weight:800;color:#ff00ff">PUNK ME</div>
  <div id="loadingStatus" style="opacity:.8" data-i18n="loading"></div>
  <div class="legal-footer legal-footer-start">
    <span class="age-badge-inline" data-i18n="age_13">13+</span>
    <a href="subscribe.html" data-i18n="footer_subscribe"></a>
  </div>`;
  if (typeof applyI18nDom === "function") applyI18nDom();
}

function showLoadingFailure(message, detail) {
  clearLoadMeTimeout();
  const el = document.getElementById("loading");
  if (!el) return;
  el.style.display = "flex";
  el.innerHTML = `<div style="font-size:22px;font-weight:800;color:#ff00ff">PUNK ME</div>
    <p class="loading-error">${escapeHtml(message || t("loading_boot_error"))}</p>
    ${detail ? `<p class="loading-error-detail">${escapeHtml(detail)}</p>` : ""}
    <div class="loading-actions">
      <button type="button" class="btn" id="loadingRetryBtn">${escapeHtml(t("loading_retry"))}</button>
      <button type="button" class="btn secondary" id="loadingFreshBtn">${escapeHtml(t("loading_fresh"))}</button>
    </div>
    <div class="legal-footer legal-footer-start">
      <span class="age-badge-inline" data-i18n="age_13">13+</span>
      <a href="subscribe.html" data-i18n="footer_subscribe">${escapeHtml(t("footer_subscribe"))}</a>
    </div>`;
  document.getElementById("loadingRetryBtn")?.addEventListener("click", () => {
    restoreLoadingMarkup();
    loadMe();
  });
  document.getElementById("loadingFreshBtn")?.addEventListener("click", () => startFreshPlayerKeepAccount());
}

function applyFirebasePlayerSnapshot(snap) {
  if (snap.exists()) {
    const v = migratePlayerFromSave(snap.val());
    me = { ...defaultPlayer(), ...v };
    if (devCoinsEnabled()) me.coins = 9999;
    me.inventory = { materials: {}, spells: [], ...(v.inventory || {}) };
    me.inventory.materials = v.inventory?.materials || {};
    me.inventory.spells = Array.isArray(v.inventory?.spells) ? v.inventory.spells : [];
    me.quests = v.quests && typeof v.quests === "object" ? v.quests : me.quests;
    me.onboarding = v.onboarding || me.onboarding || { step: 0, progress: {}, done: false };
    me.story = v.story || me.story;
    me.energy = v.energy ?? me.energy ?? 100;
    me.mood = v.mood ?? me.mood ?? 100;
    me.stats = { ...defaultPlayer().stats, ...(v.stats || {}) };
    if (v.lang) initLanguage(v.lang);
  } else {
    me = me || defaultPlayer();
  }
  window.me = me;
  window.__playerLoaded = true;
  if (!me.characterId) {
    me.characterId = resolveCharacterIdForPlayer(me, { allowAvatarInfer: snap.exists() });
  }
  me.level = levelFromXp(me.xp || 0);
  me.lastSeen = Date.now();
  if (window.StoryEngine?.ensureStoryState) window.StoryEngine.ensureStoryState(me);
  if (me.characterId) writeStoredCharacterId(me.characterId);
}

function finishLoadMeFlow() {
  if (me.characterId) {
    try {
      saveMe();
    } catch (saveErr) {
      console.warn("saveMe after load (non-fatal):", saveErr);
    }
  }
  if (!me.characterId) {
    hideLoading();
    const openSelect = () => {
      if (window.CharSelect) CharSelect.open(pickCharacterAndContinue);
      else setTimeout(openSelect, 120);
    };
    openSelect();
    return;
  }
  continueGameBoot();
}

function startFreshPlayerKeepAccount() {
  const gen = ++loadMeGeneration;
  clearLoadMeTimeout();
  if (!uid || !db) {
    location.reload();
    return;
  }
  restoreLoadingMarkup();
  loadMeTimeoutId = setTimeout(() => {
    if (gen !== loadMeGeneration) return;
    showLoadingFailure(t("loading_timeout"));
  }, LOAD_ME_TIMEOUT_MS);
  db.ref("players/" + uid)
    .once("value")
    .then(snap => {
      if (gen !== loadMeGeneration) return;
      clearLoadMeTimeout();
      try {
        const v = snap.exists() ? migratePlayerFromSave(snap.val()) : {};
        me = defaultPlayer();
        me.name = v.name || me.name;
        me.coins = v.coins ?? me.coins;
        me.xp = v.xp ?? 0;
        me.rep = v.rep ?? 0;
        me.level = levelFromXp(me.xp);
        me.location = v.location || me.location;
        me.characterId =
          readStoredCharacterId() || (snap.exists() ? inferCharacterIdFromSave(v) : null) || null;
        me.onboarding =
          v.onboarding && typeof v.onboarding === "object" ? v.onboarding : { step: 0, progress: {}, done: false };
        window.me = me;
        window.__playerLoaded = true;
        window.StoryEngine?.ensureStoryState?.(me);
        saveMe();
        finishLoadMeFlow();
      } catch (err) {
        console.error("startFreshPlayerKeepAccount", err);
        showLoadingFailure(t("loading_boot_error"), err.message || String(err));
      }
    })
    .catch(err => {
      if (gen !== loadMeGeneration) return;
      clearLoadMeTimeout();
      showLoadingFailure(t("login_error"), err.message || String(err));
    });
}

function hasDog() {
  return me.pet === "pet_dog" || (me.owned || []).includes("pet_dog");
}

function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2200);
}

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function levelFromXp(xp) {
  return Math.floor(Math.sqrt(xp / 50)) + 1;
}

function applyItemStats(item) {
  if (!item.stat) return;
  if (item.stat.chain) me.stats.chain += item.stat.chain;
  if (item.stat.def) me.stats.maxHp += item.stat.def * 5;
  if (item.stat.rep) me.rep += item.stat.rep;
}

function npcLines(npc) {
  const rankLines = window.StoryEngine?.Authority?.getNpcLinesForRank?.(npc.id);
  if (rankLines?.length) return rankLines;
  const i18n = npcLinesI18n(npc.id);
  if (i18n.length) return i18n;
  const lang = getLanguage();
  if (npc.linesI18n) return npc.linesI18n[lang] || npc.linesI18n.en || npc.linesI18n.ru;
  return npc.lines || [];
}

function formatCoinsDisplay() {
  if (isOwner) return me.coins + " · " + t("ownerCoinsHint");
  if (devCoinsEnabled()) return me.coins + " · " + t("devCoins");
  return String(me.coins);
}

function updatePlayersToggleCount() {
  const el = document.getElementById("playersToggleCount");
  if (!el) return;
  const inLoc = Object.keys(others).length + 1;
  el.textContent = String(inLoc);
}

function updateOnlineUI(allPlayers) {
  const inLoc = Object.keys(others).length + 1;
  document.getElementById("onlineCount").textContent = String(inLoc);
  updatePlayersToggleCount();
  const global = allPlayers ? countLivePlayers(allPlayers) : inLoc;
  const gEl = document.getElementById("onlineGlobal");
  if (gEl) gEl.textContent = String(global);
}

function initResponsiveHud() {
  if (window._responsiveHudInit) return;
  window._responsiveHudInit = true;
  const pt = document.getElementById("playersToggle");
  const pd = document.getElementById("playersDrawer");
  pt?.addEventListener("click", e => {
    e.stopPropagation();
    const open = !pd?.classList.contains("open");
    pd?.classList.toggle("open", open);
    pt.setAttribute("aria-expanded", open ? "true" : "false");
  });
  document.addEventListener("click", e => {
    if (!pd?.classList.contains("open")) return;
    if (!document.getElementById("playersSide")?.contains(e.target)) {
      pd.classList.remove("open");
      pt?.setAttribute("aria-expanded", "false");
    }
  });
  const ct = document.getElementById("chatToggle");
  const chat = document.getElementById("chatPanel");
  ct?.addEventListener("click", e => {
    e.stopPropagation();
    const open = !chat?.classList.contains("chat-open");
    chat?.classList.toggle("chat-open", open);
    ct.setAttribute("aria-expanded", open ? "true" : "false");
  });
  const qt = document.getElementById("hudQuestsToggle");
  const qw = document.getElementById("hudQuestsWrap");
  qt?.addEventListener("click", e => {
    e.stopPropagation();
    const collapsed = qw?.classList.toggle("collapsed");
    qt.setAttribute("aria-expanded", collapsed ? "false" : "true");
    qt.textContent = collapsed ? "▸" : "▾";
  });
  if (window.matchMedia("(max-width: 900px)").matches) {
    qw?.classList.add("collapsed");
    qt?.setAttribute("aria-expanded", "false");
    if (qt) qt.textContent = "▸";
  }
}

function syncStage3D() {
  if (!window.Scene3D) return;
  if (window.World3D?.isMotionProbeActive?.()) return;
  const loc = LOCATIONS[me.location];
  const heroId = me.characterId || "vienna";
  const npcData = (loc.npcs || []).filter(nid => nid !== heroId).map((nid, i) => ({
    id: nid,
    characterId: NPCS[nid]?.visualId || nid,
    img: NPCS[nid]?.img || "imagine_images/77Mdp.jpg",
    x: 18 + i * 18,
    y: 58 + (i % 2) * 6
  }));
  Scene3D.sync({
    player: {
      x: me.x, y: me.y, avatar: me.avatar,
      characterId: me.characterId || "vienna",
      anim: me._animState || "idle"
    },
    others: othersForStage3D(),
    npcs: npcData,
    location: me.location,
    hasDog: hasDog(),
    carVisible: false
  });
}

function init() {
  me = defaultPlayer();
  window.me = me;
  window.__playerLoaded = false;
  window.saveMe = saveMe;
  window.onLanguageChanged = () => { renderAll(); applyI18nDom(); };
  initLanguage();
  document.querySelectorAll(".lang-btn").forEach(btn => {
    btn.onclick = () => setLanguage(btn.dataset.lang, true);
    btn.classList.toggle("active", btn.dataset.lang === getLanguage());
  });
  if (isPreviewBuild()) {
    bootPreviewSession();
    bindGameShell();
    const ver = document.getElementById("gameVersion");
    if (ver) ver.textContent = GAME_VERSION + "-preview";
    return;
  }
  try {
    firebase.initializeApp(FIREBASE_CONFIG);
    auth = firebase.auth();
    db = firebase.database();
    connectFirebaseEmulatorsIfRequested();
    window.__punkFirebaseReady = Promise.resolve();
    window.dispatchEvent(new Event("punkme-firebase-ready"));
  } catch (bootErr) {
    console.error("Firebase init failed", bootErr);
    showLoadingFailure(t("loading_boot_error"), bootErr.message || String(bootErr));
    return;
  }
  auth.onAuthStateChanged(async u => {
    if (u) {
      uid = u.uid;
      window.uid = uid;
      isOwner = false;
      try {
        const token = await u.getIdTokenResult();
        isOwner = token.claims.admin === true;
      } catch (_) {}
      window.isOwner = isOwner;
      window.__punkUpdateAccountUi?.(u);
      try {
        if (new URLSearchParams(location.search).get("loadtest") !== "timeout") loadMe();
      } catch (e) {
        console.error("loadMe", e);
        showLoadingFailure(t("loading_boot_error"), e.message || String(e));
      }
    } else {
      auth.signInAnonymously().catch(e => {
        console.error("signInAnonymously", e);
        showLoadingFailure(t("login_error"), e.message || String(e));
      });
    }
  });
  bindGameShell();
  const ver = document.getElementById("gameVersion");
  if (ver) ver.textContent = GAME_VERSION;
}

function bindGameShell() {
  document.getElementById("roomLayer").addEventListener("click", onRoomClick);
  window.addEventListener("keydown", onKey);
  window.addEventListener("hashchange", applyHashRoute);
  setInterval(tickPresence, 2500);
  setInterval(tickNight, 4000);
  function bootScene3D() {
    if (!window.Scene3D) return;
    Scene3D.init({
      onMove: (x, y, opts = {}) => {
        me.x = x; me.y = y;
        window.Onboarding?.onMove?.(x, y);
        window.LifeCh1Slice?.onMove?.();
        if (opts.sync3d === false) {
          clearTimeout(moveSaveTimer);
          moveSaveTimer = setTimeout(() => saveMe(), 450);
          return;
        }
        saveMe();
        syncStage3D();
      },
      onNpcClick: (nid) => openNpcDialog(nid),
      onInteract: () => {
        const playCtx = { toast, save: saveMe, hasDog };
        if (window.LifeCh1Slice?.tryInteract?.()) return;
        if (window.PlayV21?.tryInteract(me, playCtx)) return;
        if (window.World3D?.getNearestDog?.()) {
          petDog(true);
          return;
        }
        const nid = window.World3D?.getNearestNpc?.();
        if (nid) openNpcDialog(nid);
      },
      onHints: h => window.updateContextHints?.(h),
      onPortal: (to) => {
        if (Date.now() < portalCooldown) return;
        portalCooldown = Date.now() + 1500;
        if (LOCATIONS[to]) goLocation(to);
      },
      onReady: () => {
        syncStage3D();
        window.PlayV21?.syncCosmetics?.(me);
        window.Onboarding?.syncGuideTarget?.();
      },
      onAnimState: (st) => {
        me._animState = st;
        const now = Date.now();
        if (now - lastPresenceAnimPush > 280) {
          lastPresenceAnimPush = now;
          pushPresence();
        }
      }
    });
  }
  window.addEventListener("scene3d-ready", bootScene3D);
  if (window.Scene3D) bootScene3D();
  LifeEngine.init({
    getMe: () => me,
    hasDog,
    onPetDog: () => petDog(true),
    onTrashKick: () => {
      if (!isOwner) me.coins += 5;
      me.xp += 2;
      saveMe();
      toast(t("trash_coins"));
      document.getElementById("coins").textContent = formatCoinsDisplay();
    },
    onCatPet: () => toast(t("cat_hiss"))
  });
}

function loadMe() {
  if (!uid || !db) {
    showLoadingFailure(t("loading_boot_error"), "no session");
    return;
  }
  window.__playerLoaded = false;
  const gen = ++loadMeGeneration;
  clearLoadMeTimeout();
  const timeoutMs =
    typeof window.__loadMeTimeoutMs === "number" && window.__loadMeTimeoutMs > 0
      ? window.__loadMeTimeoutMs
      : LOAD_ME_TIMEOUT_MS;
  loadMeTimeoutId = setTimeout(() => {
    if (gen !== loadMeGeneration) return;
    showLoadingFailure(t("loading_timeout"));
  }, timeoutMs);
  db.ref("players/" + uid)
    .once("value")
    .then(snap => {
      if (gen !== loadMeGeneration) return;
      clearLoadMeTimeout();
      try {
        applyFirebasePlayerSnapshot(snap);
        finishLoadMeFlow();
      } catch (err) {
        console.error("loadMe apply", err);
        showLoadingFailure(t("loading_boot_error"), err.message || String(err));
      }
    })
    .catch(err => {
      if (gen !== loadMeGeneration) return;
      clearLoadMeTimeout();
      console.error("loadMe firebase", err);
      showLoadingFailure(t("login_error"), err.message || String(err));
    });
}

function pickCharacterAndContinue(id) {
  if (typeof isCharacterJoinable === "function" && !isCharacterJoinable(id)) return;
  me.characterId = id;
  writeStoredCharacterId(id);
  const def = getCharacterDef(id);
  me.avatar = def.poster;
  me.name = (typeof tNpcName === "function" ? tNpcName(id) : id) + Math.floor(Math.random() * 90 + 10);
  window.__playerLoaded = true;
  saveMe();
  continueGameBoot();
}

function continueGameBoot() {
  try {
    hideLoading();
    initResponsiveHud();
    if (window.Onboarding) Onboarding.init();
    window.Onboarding?.adaptSpawnLocation?.();
    if (me.onboarding?.done) {
      window.StoryEngine?.onOnboardingComplete?.();
      window.LifeCh1Slice?.onBoot?.();
      window.StoryEngine?.onLocationChange?.(me.location);
      window.StoryEngine?.syncBeacon?.();
    }
    if (window.initHowToPlay) initHowToPlay();
    if (window.initContextHints) initContextHints();
    renderAll();
    if (!isPreviewBuild()) {
      initMultiplayer();
      listenChat();
    }
    listenBuildings();
    refreshLifeScene();
    if (me.dog) dogPos = { ...me.dog };
    else dogPos = { x: me.x - 4, y: me.y + 2 };
    applyHashRoute();
    syncStage3D();
    window.LifeCh1Slice?.syncPlayerLifeCh1Skin?.();
    window.__punkUpdateAccountUi?.(auth?.currentUser);
  } catch (err) {
    console.error("continueGameBoot", err);
    showLoadingFailure(t("loading_boot_error"), err.message || String(err));
  }
}

function resolveCharacterIdForPlayer(v, opts = {}) {
  const allowAvatarInfer = !!opts.allowAvatarInfer;
  if (v.characterId) return v.characterId;
  const stored = readStoredCharacterId();
  if (stored) return stored;
  if (allowAvatarInfer) return inferCharacterIdFromSave(v) || null;
  return null;
}

window.__punkMigratePlayer = migratePlayerFromSave;
window.__punkInferCharacterId = inferCharacterIdFromSave;
window.__punkResolveCharacterId = (v, allowAvatarInfer) =>
  resolveCharacterIdForPlayer(v, { allowAvatarInfer: !!allowAvatarInfer });
window.__punkApplyFirebaseSnapshot = applyFirebasePlayerSnapshot;
window.__punkFinishLoadMeFlow = finishLoadMeFlow;
window.__punkLoadMe = loadMe;
window.__punkRestoreLoadingMarkup = restoreLoadingMarkup;
window.pickCharacterAndContinue = pickCharacterAndContinue;
window.__showLoadingFailure = showLoadingFailure;

function applyHashRoute() {
  const raw = (location.hash || "").replace(/^#/, "").trim();
  const id = raw.split(/[?&]/)[0];
  if (!id || !LOCATIONS[id] || !me) return;
  if (me.location !== id) goLocation(id, true);
}

function renderMapModal() {
  const grid = document.getElementById("mapGrid");
  if (!grid) return;
  grid.innerHTML = Object.values(LOCATIONS).map(loc => `
    <div class="card">
      <img src="${loc.bg}" alt="">
      <div><b>${escapeHtml(locTitle(loc.id))}</b></div>
      <button class="btn" style="margin-top:6px;width:100%" ${me.location === loc.id ? "disabled" : ""}
        onclick="goLocation('${loc.id}'); closeModal('mapModal');">
        ${me.location === loc.id ? t("here") : t("go")}
      </button>
    </div>`).join("");
}

function renderQuickNav() {
  const el = document.getElementById("navQuick");
  if (!el) return;
  const picks = ["room", "street", "cemetery", "city", "construction", "roof", "parkour"].filter(id => id !== me.location);
  const navKey = {
    room: "nav_room", street: "nav_street", cemetery: "nav_cemetery", city: "nav_city",
    construction: "nav_construction", roof: "nav_roof", parkour: "nav_parkour"
  };
  el.innerHTML = picks.map(id =>
    `<button type="button" class="btn secondary" onclick="goLocation('${id}')">${t(navKey[id])}</button>`
  ).join("");
}

function hideLoading() {
  const el = document.getElementById("loading");
  if (el) el.style.display = "none";
}

function saveMe() {
  if (isPreviewBuild()) {
    if (!window.__playerLoaded) return;
    const prevLvl = me.level || 1;
    me.level = levelFromXp(me.xp || 0);
    if (me.level > prevLvl) showLevelUpPopup(t("level_unlock"));
    me.lastSeen = Date.now();
    window.PunkPreviewSave?.save?.(sanitizePlayer(me));
    return;
  }
  if (!uid) return;
  if (!window.__playerLoaded) return;
  const prevLvl = me.level || 1;
  me.level = levelFromXp(me.xp || 0);
  if (me.level > prevLvl) showLevelUpPopup(t("level_unlock"));
  me.lastSeen = Date.now();
  const payload = sanitizePlayer(me);
  // players/{uid} must succeed even when publicProfiles is denied (pre-rules-publish).
  db.ref("players/" + uid).update(payload);
  db.ref("publicProfiles/" + uid)
    .set({
      name: payload.name || me.name || "Player",
      avatar: payload.avatar || me.avatar || "",
      coins: payload.coins ?? 0
    })
    .catch(() => {});
  pushPresence();
}

function sanitizePlayer(p) {
  const out = {
    name: p.name,
    coins: p.coins,
    xp: p.xp,
    level: p.level,
    rep: p.rep,
    location: p.location,
    x: p.x,
    y: p.y,
    avatar: p.avatar,
    owned: p.owned || [],
    inventory: p.inventory,
    equipment: p.equipment,
    pet: p.pet,
    stats: p.stats,
    quests: p.quests,
    jobCooldowns: p.jobCooldowns,
    lastJob: p.lastJob,
    built: p.built,
    decor: p.decor,
    dog: dogPos,
    lang: getLanguage(),
    characterId: p.characterId || null,
    story: p.story,
    authority: p.authority ?? p.story?.authority,
    gang_rank: p.gang_rank ?? p.story?.gang_rank,
    energy: p.energy,
    mood: p.mood,
    onboarding: p.onboarding || { step: 0, progress: {}, done: false },
    owner: isOwner,
    lastSeen: p.lastSeen,
    linkedAuth: p.linkedAuth || null
  };
  const lifePayload = window.LifeCh1Slice?.lifeCh1PayloadForSave?.(p);
  if (lifePayload !== undefined) out.lifeCh1 = lifePayload;
  else if (isPreviewBuild() && p.lifeCh1 != null) out.lifeCh1 = p.lifeCh1;
  return out;
}

function initMultiplayer() {
  if (isPreviewBuild() || !uid || !db) return;
  const probe = db.ref("presence/" + me.location + "/" + uid);
  const probePayload = {
    name: me.name || "Player",
    x: me.x ?? 50,
    y: me.y ?? 55,
    ts: Date.now()
  };
  probe.set(probePayload).then(() => {
    presenceOk = true;
    probe.remove().catch(() => {});
    listenPresence();
    pushPresence();
  }).catch(() => {
    presenceOk = false;
    listenPlayersInLocation();
  });
}

function pushPresence() {
  if (isPreviewBuild() || !db || !uid) return;
  if (!window.__playerLoaded) return;
  if (!presenceOk) return;
  const loc = me.location;
  const data = {
    name: me.name,
    x: me.x,
    y: me.y,
    avatar: me.avatar,
    level: me.level,
    characterId: me.characterId || "vienna",
    anim: me._animState || "idle",
    ts: Date.now()
  };
  const ref = db.ref("presence/" + loc + "/" + uid);
  ref.set(data).catch(() => disablePresence("write"));
  if (presenceRef && presenceRef.key !== loc) {
    presenceRef.child(uid).remove().catch(() => {});
  }
  presenceRef = db.ref("presence/" + loc);
  ref.onDisconnect().remove().catch(() => {});
}

function disablePresence(reason) {
  if (!presenceOk) return;
  presenceOk = false;
  console.warn("Presence disabled:", reason);
  if (presenceListenRef) presenceListenRef.off();
  listenPlayersInLocation();
}

function isPrivateRoomLoc(locId) {
  return locId === PRIVATE_ROOM_ID && LOCATIONS[locId]?.buildZone === "room_private";
}

function playerPresenceFresh(p) {
  const ts = p?.ts || p?.lastSeen;
  return ts && Date.now() - ts < PRESENCE_STALE_MS;
}

function listenPresence() {
  if (!presenceOk) {
    listenPlayersInLocation();
    return;
  }
  if (presenceListenRef) presenceListenRef.off();
  const loc = me.location;
  if (isPrivateRoomLoc(loc)) {
    others = {};
    renderPlayers();
    renderPlayersList();
    updateOnlineCount();
    return;
  }
  presenceListenRef = db.ref("presence/" + loc);
  presenceListenRef.on("value", snap => {
    const raw = snap.val() || {};
    others = {};
    Object.entries(raw).forEach(([id, p]) => {
      if (id === uid || !p || p.probe || !playerPresenceFresh(p)) return;
      others[id] = {
        name: p.name,
        x: p.x || 50,
        y: p.y || 55,
        avatar: p.avatar,
        level: p.level || 1,
        characterId: p.characterId || "cobalt",
        anim: p.anim || "idle"
      };
    });
    renderPlayers();
    renderPlayersList();
    updateOnlineCount();
  }, err => {
    disablePresence(err?.message || "read");
  });
}

function listenPlayersInLocation() {
  if (playersListenRef) playersListenRef.off();
  if (isPrivateRoomLoc(me.location)) {
    others = {};
    renderPlayers();
    renderPlayersList();
    updateOnlineUI({});
    return;
  }
  playersListenRef = db.ref("presence/" + me.location);
  playersListenRef.on("value", snap => {
    const locMap = snap.val() || {};
    others = {};
    Object.entries(locMap).forEach(([id, p]) => {
      if (id === uid || !p || p.probe || !playerPresenceFresh(p)) return;
      others[id] = {
        name: p.name,
        x: p.x || 50,
        y: p.y || 55,
        avatar: p.avatar,
        level: p.level || 1,
        characterId: p.characterId || "cobalt",
        anim: p.anim || "idle"
      };
    });
    renderPlayers();
    renderPlayersList();
    updateOnlineUI({});
  });
}

function renderPlayersList() {
  const el = document.getElementById("playersList");
  if (!el) return;
  const rows = Object.entries(others).filter(([id]) => id !== uid).map(([, p]) => `● ${escapeHtml(p.name)}`);
  el.innerHTML = rows.length ? rows.join("<br>") : `<span style='opacity:.6'>${t("alone")}</span>`;
  updatePlayersToggleCount();
}

function localizeChatText(text) {
  if (!text || getLanguage() === "ru") return text;
  let out = String(text);
  const pairs = [
    [/Система:/gi, "System:"],
    [/Игрок/g, getLanguage() === "da" ? "Spiller" : "Player"],
    [/заработал\(а\)/g, getLanguage() === "da" ? "tjente" : "earned"],
    [/купил\(а\):/g, getLanguage() === "da" ? "købte:" : "bought:"],
    [/Неоновая куртка/g, tShop("jacket_neon")],
    [/Панковый пёс/g, tShop("pet_dog")],
    [/Неоновая цепь/g, tShop("chain_neon")],
    [/и что делать надо/g, getLanguage() === "da" ? "hvad skal jeg gøre?" : "what do I do?"]
  ];
  pairs.forEach(([re, rep]) => { out = out.replace(re, rep); });
  return out;
}

function listenChat() {
  if (isPreviewBuild() || !db) return;
  db.ref("chat").limitToLast(25).on("child_added", s => {
    const m = s.val();
    if (!m) return;
    const box = document.getElementById("chatMessages");
    const line = document.createElement("div");
    line.innerHTML = "<b>" + escapeHtml(m.name) + ":</b> " + escapeHtml(localizeChatText(m.text));
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  });
}

function listenBuildings() {
  if (isPreviewBuild()) {
    loadPrivateDecor();
    return;
  }
  const zone = LOCATIONS[me.location]?.buildZone;
  if (!zone || zone === "room_private") {
    loadPrivateDecor();
    return;
  }
  db.ref("buildings/" + zone).on("value", s => {
    const v = s.val() || {};
    buildings = Object.entries(v).map(([id, b]) => ({ id, ...b }));
    renderBuildings();
  });
}

function loadPrivateDecor() {
  buildings = (me.decor || []).map((d, i) => ({ id: "d" + i, ...d }));
  renderBuildings();
}

function countLivePresenceTree(v) {
  let n = 0;
  const now = Date.now();
  Object.values(v || {}).forEach(locMap => {
    Object.values(locMap || {}).forEach(p => {
      if (p && playerPresenceFresh(p)) n += 1;
    });
  });
  return n;
}

function countLivePlayers(all) {
  const now = Date.now();
  return Object.values(all || {}).filter(p => p && p.lastSeen && now - p.lastSeen < PRESENCE_STALE_MS).length;
}

function updateOnlineCount() {
  const inLoc = Object.keys(others).length + 1;
  document.getElementById("onlineCount").textContent = String(inLoc);
  updatePlayersToggleCount();
  if (isPreviewBuild() || !db) return;
  if (!presenceOk) return;
  db.ref("presence").once("value").then(s => {
    const global = countLivePresenceTree(s.val());
    const gEl = document.getElementById("onlineGlobal");
    if (gEl) gEl.textContent = String(global);
  }).catch(() => {});
}

function afterLocationChange() {
  window.Onboarding?.onEnterLocation?.(me.location);
  window.Onboarding?.syncGuideTarget?.();
  window.StoryEngine?.onLocationChange?.(me.location);
  if (me.location === "roof" && !window.StoryEngine?.ensureStoryState(me).events.roof_scrap_once) {
    const st = window.StoryEngine.ensureStoryState(me);
    st.materials.scrap = (st.materials.scrap || 0) + 2;
    st.events.roof_scrap_once = true;
  }
  if (me.location === "elevator" && me._pkgTaken) {
    window.StoryEngine?.fireStoryEvent?.("package_roof");
  }
}

function goLocation(id, fromHash) {
  if (!LOCATIONS[id]) return;
  if (!fromHash && location.hash !== "#" + id) {
    history.replaceState(null, "", "#" + id);
  }
  if (!isPreviewBuild() && presenceOk && presenceRef && db) db.ref("presence/" + me.location + "/" + uid).remove().catch(() => {});
  me.location = id;
  me.x = 45;
  me.y = 60;
  portalCooldown = Date.now() + 1600;
  window.World3D?.setPortalGrace?.(1600);
  saveMe();
  if (presenceOk) listenPresence();
  else listenPlayersInLocation();
  listenBuildings();
  refreshLifeScene();
  renderAll();
  syncStage3D();
  toast(locTitle(id));
  if (pendingJobAction) {
    const act = pendingJobAction;
    pendingJobAction = null;
    setTimeout(() => runJobAction(act), 350);
  }
  afterLocationChange();
}

function onRoomClick(e) {
  if (document.body.classList.contains("mode-world3d")) return;
  if (e.target.closest(".hotspot, .entity, .btn, .modal, .chat, .ambient, .ambient-life, .build-piece, #dogEntity, .life-dog")) return;
  const rect = document.getElementById("roomLayer").getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  if (buildMode && LOCATIONS[me.location].buildZone === "city") {
    tryPlaceBuild(x, y);
    return;
  }
  me.x = Math.max(5, Math.min(95, x));
  me.y = Math.max(20, Math.min(92, y));
  saveMe();
  renderPlayers();
}

function onKey(e) {
  if (document.body.classList.contains("mode-world3d")) return;
  const step = 4;
  if (["w", "a", "s", "d", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
    if (e.key === "w" || e.key === "ArrowUp") me.y -= step;
    if (e.key === "s" || e.key === "ArrowDown") me.y += step;
    if (e.key === "a" || e.key === "ArrowLeft") me.x -= step;
    if (e.key === "d" || e.key === "ArrowRight") me.x += step;
    me.x = Math.max(5, Math.min(95, me.x));
    me.y = Math.max(20, Math.min(92, me.y));
    saveMe();
    renderPlayers();
    syncStage3D();
  }
}

function renderAll() {
  const loc = LOCATIONS[me.location];
  const world3d = document.body.classList.contains("mode-world3d");
  if (!world3d) {
    document.getElementById("bg").src = loc.bg;
    const bgDup = document.getElementById("bgDup");
    if (bgDup) bgDup.src = loc.bg;
  }
  document.getElementById("locTitle").textContent = locTitle(loc.id);
  document.getElementById("coins").textContent = formatCoinsDisplay();
  document.getElementById("xp").textContent = String(me.xp);
  document.getElementById("level").textContent = String(me.level);
  document.getElementById("rep").textContent = String(me.rep);
  document.getElementById("chainStat").textContent = String(me.stats.chain);
  window.StoryEngine?.Authority?.renderAuthorityHud?.(me);

  const doors = document.getElementById("doors");
  if (world3d) doors.innerHTML = "";
  else doors.innerHTML = loc.doors.map(d =>
    `<div class="hotspot door" data-label="${escapeHtml(doorT(d.labelKey || d.label))}" style="left:${d.x}%;top:${d.y}%;width:${d.w}%;height:${d.h}%;" data-to="${d.to}"></div>`
  ).join("");
  doors.querySelectorAll(".hotspot").forEach(el => {
    el.onpointerdown = (e) => e.stopPropagation();
    el.onclick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      goLocation(el.dataset.to);
    };
  });

  document.getElementById("btnJob").style.display = "inline-block";
  document.getElementById("btnBuild").style.display = loc.buildZone === "city" ? "inline-block" : "none";
  document.getElementById("btnDecor").style.display = me.location === "room" ? "inline-block" : "none";
  document.getElementById("btnParkour").style.display = loc.parkour ? "inline-block" : "none";
  document.getElementById("btnFight").style.display = (loc.npcs && loc.npcs.length) ? "inline-block" : "none";

  renderPlayers();
  LifeEngine.onSceneRender(loc);
  LifeEngine.decorateEntities();
  renderQuickNav();
  renderQuest();
  renderDailyQuestHud();
  renderNpcMarkers();
  applyI18nDom();
}

function renderDailyQuestHud() {
  const el = document.getElementById("dailyQuestHud");
  if (!el || !window.PlayV21) return;
  el.innerHTML = `<b>${escapeHtml(t("daily_title"))}</b>` + window.PlayV21.renderDailyPanel(me);
}

function showLevelUpPopup(unlock) {
  const el = document.getElementById("levelUpPopup");
  if (!el) return;
  el.classList.remove("hidden");
  el.innerHTML = `<div>${escapeHtml(t("level_up"))} ${me.level}</div><small>${escapeHtml(unlock || t("level_unlock"))}</small>`;
  setTimeout(() => el.classList.add("hidden"), 3200);
}

function refreshLifeScene() {
  const loc = LOCATIONS[me.location];
  LifeEngine.onLocationChange(!!loc.night);
}

function renderPlayers() {
  const layer = document.getElementById("entities");
  if (document.body.classList.contains("mode-world3d")) {
    layer.innerHTML = "";
    syncStage3D();
    return;
  }
  let html = `<div class="entity me" style="left:${me.x}%;top:${me.y}%;">
    <div class="sprite-wrap breathe sway"><img class="avatar" src="${me.avatar}" alt=""><span class="blink-overlay"></span></div>
    <div class="tag">${escapeHtml(me.name)} ${t("you")}</div></div>`;

  Object.entries(others).forEach(([id, p]) => {
    if (id === uid || !p) return;
    html += `<div class="entity breathe sway" style="left:${p.x}%;top:${p.y}%;">
      <div class="sprite-wrap"><img class="avatar" src="${escapeHtml(p.avatar || "imagine_images/Lix06.jpg")}" alt=""></div>
      <div class="tag">${escapeHtml(p.name)} · ${t("lvl_short")}${p.level || 1}</div></div>`;
  });

  (LOCATIONS[me.location].npcs || []).forEach(nid => {
    const n = NPCS[nid];
    if (!n) return;
    const px = 25 + (nid.length * 7) % 50;
    const py = 48 + (nid.length * 3) % 20;
    html += `<div class="entity npc breathe sway" style="left:${px}%;top:${py}%;" data-npc="${nid}">
      <div class="sprite-wrap"><img class="avatar" src="${n.img}" alt=""><span class="blink-overlay npc-blink"></span></div>
      <div class="tag">${escapeHtml(tNpcName(nid))}</div></div>`;
  });

  layer.innerHTML = html;
  layer.querySelectorAll(".entity.npc").forEach(el => {
    el.onclick = () => openNpcDialog(el.dataset.npc);
  });
  LifeEngine.afterEntityRender?.();
  syncStage3D();
}

function petDog(fromLife) {
  if (!fromLife) LifeEngine.barkAndPet();
  toast(t("petHappy"));
  me.dogHappy = Math.min(100, (me.dogHappy || 35) + 8);
  window.PlayV21?.bumpDaily?.(me, "pet_dog", { toast, save: saveMe });
  if (!isOwner) me.coins += 6;
  me.xp += 3;
  saveMe();
  document.getElementById("coins").textContent = formatCoinsDisplay();
}

function renderNpcMarkers() {}

function renderBuildings() {
  const layer = document.getElementById("buildLayer");
  const icons = { crypt: "🪦", neon_sign: "💡", shack: "🏚️", poster: "🎸" };
  layer.innerHTML = buildings.map(b =>
    `<div class="build-piece" style="left:${b.x}%;top:${b.y}%;" title="${escapeHtml(b.type)}">${icons[b.type] || "🧱"}</div>`
  ).join("");
}

function renderQuest() {
  if (window.me?.onboarding && !window.me.onboarding.done) {
    window.Onboarding?.render?.();
    return;
  }
  if (window.LifeCh1Slice?.renderObjectivePanel?.()) return;
  if (window.StoryEngine?.renderObjectivePanel?.()) return;
  const qid = me.quests.active;
  if (me.onboarding?.done && qid === "intro") {
    document.getElementById("questBox").innerHTML =
      `<div class="quest-tracker"><b>${escapeHtml(t("onboard_title"))}</b>
       <div class="quest-step-title">${escapeHtml(t("onboard_all_done"))}</div>
       <div class="quest-step-text">${escapeHtml(questText("intro"))}</div></div>`;
    return;
  }
  const q = QUESTS[qid];
  if (!q) {
    document.getElementById("questBox").innerHTML = `<b>${escapeHtml(t("quests_label"))}</b><br>${escapeHtml(t("quest_done"))}`;
    return;
  }
  const prog = me.quests.progress || {};
  let status = Object.entries(q.need).map(([k, v]) => `${tProg(k)}: ${prog[k] || 0}/${v}`).join(", ");
  document.getElementById("questBox").innerHTML =
    `<b>${escapeHtml(questTitle(qid))}</b><br>${escapeHtml(questText(qid))}<br><small>${status}</small>`;
}

function questBump(key, amt = 1) {
  const qid = me.quests.active;
  if (!qid || !QUESTS[qid]) return;
  const need = QUESTS[qid].need;
  if (!(key in need)) return;
  me.quests.progress[key] = (me.quests.progress[key] || 0) + amt;
  const prog = me.quests.progress;
  const done = Object.entries(need).every(([k, v]) => (prog[k] || 0) >= v);
  if (done) {
    const r = QUESTS[qid].reward;
    if (!isOwner && r.coins) me.coins += r.coins;
    if (r.xp) me.xp += r.xp;
    if (r.rep) me.rep += r.rep;
    toast(t("quest_complete") + " " + questTitle(qid));
    const order = ["intro", "chain_duel", "parkour_rep", "build_crypts"];
    const idx = order.indexOf(qid);
    me.quests.active = order[idx + 1] || null;
    me.quests.progress = {};
  }
  saveMe();
  renderQuest();
  document.getElementById("coins").textContent = formatCoinsDisplay();
}

function openModal(id) {
  document.getElementById(id).classList.add("active");
  if (id === "shopModal") renderShop();
  if (id === "gangModal") renderGangList();
  if (id === "mapModal") renderMapModal();
  if (id === "magicModal") renderMagic();
  if (id === "invModal") renderInventory();
}

function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

function renderGangList() {
  const loc = LOCATIONS[me.location];
  const ids = loc.npcs?.length ? loc.npcs : Object.keys(NPCS).slice(0, 4);
  document.getElementById("gangList").innerHTML = ids.map(nid => {
    const n = NPCS[nid];
    return `<div class="npc-row" data-npc="${nid}">
      <img src="${n.img}" alt=""><div><b>${escapeHtml(tNpcName(nid))}</b><br><small>${escapeHtml(t("gang_dialog_hint"))}</small></div></div>`;
  }).join("");
  document.getElementById("gangList").querySelectorAll(".npc-row").forEach(el => {
    el.onclick = () => openNpcDialog(el.dataset.npc);
  });
}

function openNpcDialog(nid) {
  if (window.StoryEngine?.tryStoryNpc?.(nid)) {
    closeModal("gangModal");
    return;
  }
  const n = NPCS[nid];
  if (!n) return;
  const lines = npcLines(n);
  const line = lines[Math.floor(Math.random() * lines.length)];
  document.getElementById("dialogArea").innerHTML =
    `<div class="dialog-box"><b>${escapeHtml(tNpcName(nid))}:</b> ${escapeHtml(line)}</div>
     <button class="btn danger" onclick="closeModal('gangModal'); startNpcFight('${nid}')">${escapeHtml(t("chain_fight"))}</button>
     ${n.quest ? `<button class="btn secondary" onclick="acceptQuest('${n.quest}')">${escapeHtml(t("accept_quest"))}</button>` : ""}`;
  openModal("gangModal");
  if (window.Voice) Voice.speakCharacter(nid, line);
  if (window.World3D?.setTalking) World3D.setTalking(nid, true);
  if (nid === "razor") {
    questBump("talk_razor");
    window.Onboarding?.onTalkRazor?.();
  }
}

window.changeCharacter = function () {
  if (!window.CharSelect) return;
  CharSelect.open(id => {
    if (typeof isCharacterJoinable === "function" && !isCharacterJoinable(id)) return;
    me.characterId = id;
    me.avatar = getCharacterDef(id).poster;
    saveMe();
    syncStage3D();
    toast(t("char_changed"));
  });
};

window.toggleVoiceMute = function () {
  if (!window.Voice) return;
  Voice.setMuted(!Voice.getMuted());
  const btn = document.getElementById("btnVoiceMute");
  if (btn) btn.textContent = Voice.getMuted() ? t("voice_unmute") : t("voice_mute");
};

function acceptQuest(qid) {
  me.quests.active = qid;
  me.quests.progress = {};
  saveMe();
  renderQuest();
  toast(t("quest_new") + " " + questTitle(qid));
}

function renderShop() {
  const items = SHOP[shopTab] || [];
  document.getElementById("shopGrid").innerHTML = items.map(it => {
    const own = me.owned.includes(it.id);
    return `<div class="card">
      <img src="${it.img}" alt="">
      <div><b>${escapeHtml(tShop(it.id))}</b></div>
      <div class="price">${isOwner ? t("free") : it.price + " " + t("coins_word")}</div>
      <button class="btn" ${own && it.cat !== "materials" ? "disabled" : ""} onclick="buyItem('${it.id}')">
        ${own && it.cat !== "materials" ? t("owned") : t("buy")}
      </button></div>`;
  }).join("");
  document.querySelectorAll(".tab").forEach(t => {
    t.classList.toggle("active", t.dataset.tab === shopTab);
    t.onclick = () => { shopTab = t.dataset.tab; renderShop(); };
  });
}

function buyItem(id) {
  const it = ALL_SHOP.find(x => x.id === id);
  if (!it) return;
  if (it.cat !== "materials" && me.owned.includes(id)) return;
  if (!isOwner && me.coins < it.price) {
    const short = it.price - me.coins;
    toast(t("notEnough") + " — " + short + " " + (t("coins_short") || ""));
    window.StoryEngine?.beginEarnCoins?.(short, { returnLabel: tShop(id) });
    return;
  }
  if (!isOwner) me.coins -= it.price;
  if (it.cat === "materials") {
    me.inventory.materials[it.build] = (me.inventory.materials[it.build] || 0) + 1;
  } else if (it.cat === "magic") {
    me.inventory.spells.push(it.spell);
    if (!me.owned.includes(id)) me.owned.push(id);
  } else if (it.cat === "pets") {
    me.pet = it.id;
    if (!me.owned.includes(id)) me.owned.push(id);
    if (it.id === "pet_dog") {
      dogPos = { x: me.x - 5, y: me.y + 3 };
      toast(t("dog_with_you"));
    }
  } else {
    me.owned.push(id);
    if (it.cat === "chains") me.equipment.chains = id;
    if (it.cat === "clothes") {
      me.equipment.jacket = id;
      me.avatar = it.img;
    }
    applyItemStats(it);
  }
  saveMe();
  renderAll();
  renderShop();
  toast(t("bought_item") + " " + tShop(it.id));
  window.PlayV21?.syncCosmetics?.(me);
  window.Onboarding?.onShopBuy?.();
}

function renderInventory() {
  const mats = Object.entries(me.inventory.materials || {}).map(([k, v]) => `${k}: ${v}`).join(", ") || t("inv_none");
  document.getElementById("invContent").innerHTML = `
    <p><b>${escapeHtml(t("inv_chain"))}:</b> ${me.equipment.chains || t("inv_dash")}</p>
    <p><b>${escapeHtml(t("inv_pet"))}:</b> ${me.pet ? escapeHtml(tShop(me.pet)) : t("inv_dash")}</p>
    <p><b>${escapeHtml(t("inv_materials"))}:</b> ${escapeHtml(mats)}</p>
    <p><b>${escapeHtml(t("inv_spells"))}:</b> ${(me.inventory.spells || []).map(s => escapeHtml(tSpell(s))).join(", ") || t("inv_dash")}</p>`;
}

function renderMagic() {
  const spells = [...new Set(me.inventory.spells || [])];
  document.getElementById("magicList").innerHTML = spells.length
    ? spells.map(s => {
        const sp = SPELLS[s];
        return `<button class="btn" onclick="castWorldSpell('${s}')">${escapeHtml(tSpell(s))}</button>`;
      }).join(" ")
    : `<p>${escapeHtml(t("magic_empty"))}</p>`;
}

function castWorldSpell(spellId) {
  const now = Date.now();
  if ((spellCooldowns[spellId] || 0) > now) {
    toast(t("cooldown"));
    return;
  }
  const sp = SPELLS[spellId];
  spellCooldowns[spellId] = now + sp.cd;
  const layer = document.getElementById("roomLayer");
  const fx = document.createElement("div");
  fx.className = "fx-burst";
  fx.style.left = me.x + "%";
  fx.style.top = me.y + "%";
  layer.appendChild(fx);
  setTimeout(() => fx.remove(), 700);
  if (spellId === "neon_flash") {
    me.xp += 5;
    toast(tSpell(spellId) + t("neon_burst"));
  } else if (spellId === "graffiti_shield") {
    me.stats._shield = (me.stats._shield || 0) + sp.shield;
    toast(t("shield_on"));
  } else if (spellId === "shadow_dash") {
    me.x = Math.min(95, me.x + 12);
    toast(t("shadow_dash_toast"));
  } else if (spellId === "chain_spark") {
    me.stats.chain += 2;
    toast(t("spark_chain"));
  }
  saveMe();
  renderAll();
}

function doJob(action) {
  runJobAction(action);
}

function runJobAction(action) {
  if (action === "cemetery_night") {
    window.PlayV21?.startCemeteryJob(me, { toast, save: saveMe });
    return;
  }
  if (action === "pizza_delivery") {
    window.PlayV21?.startPizzaJob(me, { toast, save: saveMe });
    return;
  }
  if (action === "flyer_post" || action === "construction_helper" || action === "dishes_zoya") {
    window.PlayV21?.startStoryJob?.(me, action, { toast, save: saveMe });
    return;
  }
  if (action === "parkour") {
    if (me.location !== "parkour") {
      pendingJobAction = "parkour";
      goLocation("parkour");
      return;
    }
    runParkourJob();
    return;
  }
  const cemeteryActions = ["dig", "cobwebs", "clean", "water"];
  if (!cemeteryActions.includes(action)) return;
  if (me.location !== "cemetery") {
    pendingJobAction = action;
    goLocation("cemetery");
    return;
  }
  const now = Date.now();
  const cd = me.jobCooldowns[action] || 0;
  if (!isOwner && now < cd) { toast(t("rest")); return; }
  const base = { dig: 55, cobwebs: 42, clean: 35, water: 30 }[action] || 30;
  let gain = base + Math.floor(Math.random() * 22);
  if (me.pet === "pet_cat") gain = Math.floor(gain * 1.15);
  if (hasDog()) gain += 5;
  if (!isOwner) me.coins += gain;
  me.xp += 12;
  me.jobCooldowns[action] = now + 10000;
  me.lastJob = now;
  saveMe();
  renderAll();
  const labels = { dig: t("job_dig_done"), cobwebs: t("job_cobwebs_done"), clean: t("job_clean_done"), water: t("job_water_done") };
  toast(`${labels[action] || t("job_generic")} (+${gain})`);
}

function openJobPanel() {
  document.getElementById("jobModalTitle").textContent = t("jobTitle");
  document.getElementById("jobModalDesc").textContent = t("jobDesc");
  document.getElementById("jobActions").innerHTML = JOB_BOARD.map(j =>
    `<div class="card" style="margin-bottom:8px">
      <b>${escapeHtml(t(j.titleKey))}</b><br><small>${escapeHtml(t(j.descKey))}</small><br>
      <button class="btn" style="margin-top:6px" onclick="travelJob('${j.action}','${j.loc}')">${escapeHtml(t("job_go"))}</button>
    </div>`
  ).join("");
  openModal("jobModal");
}

function travelJob(action, loc) {
  closeModal("jobModal");
  if (me.location === loc) runJobAction(action);
  else {
    pendingJobAction = action;
    goLocation(loc);
  }
}

function toggleBuildMode() {
  buildMode = !buildMode;
  toast(buildMode ? t("build_mode_on") : t("build_mode_off"));
}

function tryPlaceBuild(x, y) {
  const type = selectedBuild;
  const count = me.inventory.materials[type] || 0;
  if (count < 1) { toast(t("buy_materials")); return; }
  me.inventory.materials[type]--;
  const piece = { type, x, y, owner: uid, ts: Date.now() };
  db.ref("buildings/city").push(piece);
  me.built = (me.built || 0) + 1;
  saveMe();
  questBump("built", 1);
  toast(t("built"));
}

function tryDecorPlace() {
  if (me.location !== "room") return;
  window.toggleRoomDecor?.();
  if (me._decorMode) toast(t("decor_mode_on"));
}

function decorPlaceAtWorld(wx, wz) {
  window.World3D?.placeDecorAt?.(wx, wz);
}

window.startTrainingDuelMohawk = function () {
  if (me.location !== "street") {
    goLocation("street");
    return;
  }
  if (window.World3D?.startDuel3D?.("mohawk", { training: true, firstTo: 3 })) {
    window._duel3dEnd = win => {
      if (win) window.StoryEngine?.fireStoryEvent?.("auth_trial_duel");
      else toast(t("fight_try_again"));
    };
  }
};

function startNpcFight(nid) {
  const npc = NPCS[nid] || { id: "razor", img: "imagine_images/MRgTC.jpg" };
  if (window.World3D?.startDuel3D?.(nid || npc.id)) {
    fight = {
      npcName: tNpcName(npc.id || nid),
      npcHp: 100,
      npcMax: 100,
      playerHp: 100,
      playerMax: 100,
      shield: 0,
      log: [],
      _duel3d: true
    };
    window._duel3dEnd = win => endFight(win);
    return;
  }
  fight = {
    npcName: tNpcName(npc.id || nid),
    npcHp: 55 + Math.floor(Math.random() * 30),
    npcMax: 85,
    playerHp: me.stats.hp,
    playerMax: me.stats.maxHp,
    shield: me.stats._shield || 0,
    log: []
  };
  document.getElementById("fightOverlay").classList.add("active");
  updateFightUi();
}

function duel3dAttack() { window._duelAttack = true; }
function duel3dDodge() { window._duelDodge = true; }
function duel3dBlock() {
  window._duelBlock = true;
  if (fight) fight.shield = (fight.shield || 0) + 10;
}

function startFightUi() {
  const loc = LOCATIONS[me.location];
  const nid = (loc.npcs || [])[0] || "razor";
  startNpcFight(nid);
}

function updateFightUi() {
  if (!fight) return;
  document.getElementById("fightNpcName").textContent = fight.npcName;
  document.getElementById("fightLog").innerHTML = fight.log.slice(-4).map(l => `<div>${escapeHtml(l)}</div>`).join("");
  document.getElementById("playerHpBar").style.width = Math.max(0, (fight.playerHp / fight.playerMax) * 100) + "%";
  document.getElementById("npcHpBar").style.width = Math.max(0, (fight.npcHp / fight.npcMax) * 100) + "%";
}

function fightDodge() {
  if (!fight || fight._dodgeCd > Date.now()) return;
  fight._dodgeCd = Date.now() + 1400;
  fight.shield = (fight.shield || 0) + 14;
  fight.log.push(t("fight_dodge"));
  updateFightUi();
}

function fightAttack(kind) {
  if (!fight) return;
  let dmg = me.stats.chain + Math.floor(Math.random() * 10);
  if (kind === "kick") dmg = Math.floor(dmg * 0.7) + 4;
  if (kind === "heavy") dmg = Math.floor(dmg * 1.3);
  fight.npcHp -= dmg;
  fight.log.push(`${t("fight_hit_you")} (−${dmg})`);
  if (fight.npcHp <= 0) return endFight(true);
  npcTurn();
}

function fightSpell() {
  const spells = me.inventory.spells || [];
  if (!spells.length) { toast(t("no_scrolls")); return; }
  const s = spells[0];
  const sp = SPELLS[s];
  const dmg = sp.dmg || 10;
  fight.npcHp -= dmg;
  fight.log.push(tSpell(s) + ` (−${dmg})`);
  if (fight.npcHp <= 0) return endFight(true);
  if (sp.skip) fight.log.push(t("fight_skip_turn"));
  else npcTurn();
}

function npcTurn() {
  let dmg = 8 + Math.floor(Math.random() * 14);
  if (fight.shield > 0) {
    const block = Math.min(fight.shield, dmg);
    fight.shield -= block;
    dmg -= block;
    fight.log.push(t("fight_shield_block") + " " + block);
  }
  fight.playerHp -= dmg;
  fight.log.push(fight.npcName + ` ${t("fight_hit_npc")} (−${dmg})`);
  updateFightUi();
  if (fight.playerHp <= 0) endFight(false);
}

function endFight(win) {
  document.getElementById("fightOverlay").classList.remove("active");
  const shieldLeft = fight ? fight.shield : 0;
  if (win) {
    const reward = 70 + Math.floor(Math.random() * 40);
    if (!isOwner) me.coins += reward;
    me.xp += 25;
    me.rep += 8;
    toast(t("win_fight") + " +" + reward);
    questBump("win_fight");
    window.PlayV21?.bumpDaily?.(me, "win_duel", { toast, save: saveMe });
    window.Onboarding?.onWinFight?.();
    window.StoryEngine?.fireStoryEvent?.("duel_razor_win");
  } else {
    toast(t("lose_fight"));
    me.stats.hp = me.stats.maxHp;
  }
  fight = null;
  if (shieldLeft) me.stats._shield = shieldLeft;
  saveMe();
  renderAll();
}

function closeFight() {
  document.getElementById("fightOverlay").classList.remove("active");
  fight = null;
}

function runParkour() {
  window.StoryEngine?.fireStoryEvent?.("parkour_win");
  if (me.location !== "parkour") {
    pendingJobAction = "parkour";
    goLocation("parkour");
    return;
  }
  runParkourJob();
}

function runParkourJob() {
  const steps = [t("parkour_step1"), t("parkour_step2"), t("parkour_step3"), t("parkour_step4")];
  let i = 0;
  const next = () => {
    if (i >= steps.length) {
      me.rep += 12;
      me.xp += 30;
      const pay = 65 + Math.floor(Math.random() * 30);
      if (!isOwner) me.coins += pay;
      saveMe();
      renderAll();
      questBump("parkour_win");
      toast(t("parkour_done") + " +" + pay);
      return;
    }
    if (confirm(steps[i] + " — нажми OK вовремя")) {
      i++;
      setTimeout(next, 280);
    } else toast(t("parkour_fail"));
  };
  next();
}

function sendChat() {
  if (isPreviewBuild()) {
    toast(typeof t === "function" ? t("preview_chat_off") : "Chat is off in preview builds.");
    return;
  }
  if (window.LifeCh1Slice?.isActive?.()) {
    toast(typeof t === "function" ? t("life_ch1_chat_presets") : "Use preset phrase buttons only.");
    return;
  }
  const inp = document.getElementById("chatInput");
  const text = inp.value.trim();
  if (!text) return;
  db.ref("chat").push({ uid, name: me.name, text, time: Date.now(), loc: me.location }).catch(() => {
    toast(t("chatDown"));
  });
  inp.value = "";
}

function tickPresence() {
  pushPresence();
  updateOnlineCount();
}

function tickNight() {
  document.getElementById("coins").textContent = formatCoinsDisplay();
}

window.openModal = openModal;
window.closeModal = closeModal;
window.buyItem = buyItem;
window.doJob = doJob;
window.openJobPanel = openJobPanel;
window.toggleBuildMode = toggleBuildMode;
window.startFightUi = startFightUi;
window.fightAttack = fightAttack;
window.fightDodge = fightDodge;
window.duel3dAttack = duel3dAttack;
window.duel3dDodge = duel3dDodge;
window.duel3dBlock = duel3dBlock;
window.decorPlaceAtWorld = decorPlaceAtWorld;
window.renderDailyQuestHud = renderDailyQuestHud;
window.fightSpell = fightSpell;
window.closeFight = closeFight;
window.runParkour = runParkour;
window.sendChat = sendChat;
window.castWorldSpell = castWorldSpell;
window.startNpcFight = startNpcFight;
window.acceptQuest = acceptQuest;
window.tryDecorPlace = tryDecorPlace;
window.setBuildType = function (bt) { selectedBuild = bt; toast(t("building") + " " + bt); };
window.travelJob = travelJob;
window.runJobAction = runJobAction;

document.addEventListener("DOMContentLoaded", init);
