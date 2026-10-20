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
const GAME_VERSION = "mvp-live-anim";

const LOCATIONS = {
  room: {
    id: "room", title: "Комната панка", bg: "imagine_images/q4BXV.jpg",
    doors: [
      { x: 8, y: 42, w: 10, h: 18, to: "kitchen", label: "Кухня" },
      { x: 82, y: 38, w: 10, h: 20, to: "toilet", label: "Туалет" },
      { x: 44, y: 72, w: 14, h: 14, to: "elevator", label: "Лифт" },
      { x: 68, y: 18, w: 12, h: 14, to: "roof", label: "Крыша" }
    ],
    npcs: [],
    job: false, buildZone: "room_private"
  },
  kitchen: {
    id: "kitchen", title: "Кухня", bg: "imagine_images/kwt1b.jpg",
    doors: [{ x: 4, y: 50, w: 8, h: 16, to: "room", label: "Комната" }],
    npcs: []
  },
  toilet: {
    id: "toilet", title: "Туалет", bg: "imagine_images/ocVdL.jpg",
    doors: [{ x: 6, y: 48, w: 8, h: 16, to: "room", label: "Комната" }]
  },
  elevator: {
    id: "elevator", title: "Лифт", bg: "imagine_images/VmOQt.jpg",
    doors: [
      { x: 20, y: 55, w: 18, h: 20, to: "room", label: "Этаж" },
      { x: 42, y: 30, w: 16, h: 18, to: "roof", label: "Крыша" },
      { x: 62, y: 30, w: 16, h: 18, to: "street", label: "Улица" }
    ]
  },
  roof: {
    id: "roof", title: "Крыша", bg: "imagine_images/SXE19.jpg",
    doors: [
      { x: 10, y: 60, w: 12, h: 16, to: "elevator", label: "Лифт" },
      { x: 78, y: 35, w: 12, h: 18, to: "parkour", label: "Паркур" }
    ],
    night: true
  },
  street: {
    id: "street", title: "Улица банды", bg: "imagine_images/77Mdp.jpg",
    doors: [
      { x: 6, y: 55, w: 10, h: 16, to: "elevator", label: "Дом" },
      { x: 85, y: 45, w: 10, h: 18, to: "cemetery", label: "Кладбище" },
      { x: 45, y: 70, w: 14, h: 14, to: "city", label: "Город" }
    ],
    npcs: ["razor", "mohawk", "vienna", "ghost"],
    night: true
  },
  cemetery: {
    id: "cemetery", title: "Кладбище у Вены", bg: "imagine_images/RgdDh.jpg",
    doors: [{ x: 4, y: 52, w: 10, h: 16, to: "street", label: "Улица" }],
    job: true, night: true,
    npcs: ["gravedigger"]
  },
  city: {
    id: "city", title: "Стройка кварталов", bg: "imagine_images/Z7wM3.jpg",
    doors: [{ x: 5, y: 58, w: 10, h: 14, to: "street", label: "Улица" }],
    buildZone: "city", night: true
  },
  parkour: {
    id: "parkour", title: "Крышный паркур", bg: "imagine_images/tvSdj.jpg",
    doors: [{ x: 8, y: 62, w: 12, h: 14, to: "roof", label: "Крыша" }],
    parkour: true, night: true
  }
};

const NPCS = {
  razor: {
    id: "razor", name: "Рейзор", img: "imagine_images/LTPb8.jpg",
    lines: [
      "Цепи звенят — это наш гимн. Покажи, что не слабак.",
      "На улице ночью только свои. Остальные — фон.",
      "Взял квест? Выполни, и банда запомнит."
    ],
    quest: "chain_duel"
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
    { id: "boots_spike", cat: "clothes", name: "Шипованные ботинки", price: 200, img: "imagine_images/9iBXD.jpg", stat: { chain: 2 } }
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
  { id: "dig", title: "Копать могилы", loc: "cemetery", action: "dig", desc: "Кладбище у Вены" },
  { id: "cobwebs", title: "Снять паутину", loc: "cemetery", action: "cobwebs", desc: "Углы кладбища" },
  { id: "parkour_run", title: "Паркур-забег", loc: "parkour", action: "parkour", desc: "Крышный маршрут" }
];

function defaultPlayer() {
  const n = Math.floor(Math.random() * 900) + 100;
  return {
    name: "Панк" + n,
    coins: 200,
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
    jobCooldowns: { dig: 0, clean: 0, water: 0, cobwebs: 0 },
    lastJob: 0,
    built: 0,
    decor: [],
    dog: { x: 38, y: 65 },
    lastSeen: Date.now()
  };
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

function init() {
  me = defaultPlayer();
  firebase.initializeApp(FIREBASE_CONFIG);
  auth = firebase.auth();
  db = firebase.database();
  auth.onAuthStateChanged(u => {
    if (u) {
      uid = u.uid;
      isOwner = u.email === OWNER_EMAIL && u.emailVerified;
      loadMe();
    } else {
      auth.signInAnonymously().catch(e => {
        document.getElementById("loading").innerHTML = "<p>Ошибка входа: " + escapeHtml(e.message) + "</p>";
      });
    }
  });
  document.getElementById("roomLayer").addEventListener("click", onRoomClick);
  window.addEventListener("keydown", onKey);
  setInterval(tickPresence, 2500);
  setInterval(tickNight, 4000);
  LifeEngine.init({
    getMe: () => me,
    hasDog,
    onPetDog: () => petDog(true),
    onTrashKick: () => {
      if (!isOwner) me.coins += 5;
      me.xp += 2;
      saveMe();
      toast("+5 за мусор");
      document.getElementById("coins").textContent = isOwner ? "∞" : String(me.coins);
    },
    onCatPet: () => toast("Кот шипит и убегает")
  });
  const ver = document.getElementById("gameVersion");
  if (ver) ver.textContent = GAME_VERSION;
}

function loadMe() {
  db.ref("players/" + uid).once("value").then(s => {
    if (s.exists()) {
      const v = s.val();
      me = { ...defaultPlayer(), ...v };
      me.inventory = { materials: {}, spells: [], ...(v.inventory || {}) };
      me.inventory.materials = v.inventory?.materials || {};
      me.inventory.spells = v.inventory?.spells || [];
      me.quests = v.quests || me.quests;
      me.stats = { ...defaultPlayer().stats, ...(v.stats || {}) };
    }
    me.level = levelFromXp(me.xp || 0);
    me.lastSeen = Date.now();
    saveMe();
    hideLoading();
    renderAll();
    initMultiplayer();
    listenChat();
    listenBuildings();
    refreshLifeScene();
    if (me.dog) dogPos = { ...me.dog };
    else dogPos = { x: me.x - 4, y: me.y + 2 };
  });
}

function hideLoading() {
  const el = document.getElementById("loading");
  if (el) el.style.display = "none";
}

function saveMe() {
  if (!uid) return;
  me.level = levelFromXp(me.xp || 0);
  me.lastSeen = Date.now();
  db.ref("players/" + uid).update(sanitizePlayer(me));
  pushPresence();
}

function sanitizePlayer(p) {
  return {
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
    owner: isOwner,
    lastSeen: p.lastSeen
  };
}

function initMultiplayer() {
  if (!uid) return;
  const probe = db.ref("presence/" + me.location + "/" + uid);
  probe.set({ probe: true, ts: Date.now() }).then(() => {
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
  if (!uid) return;
  if (!presenceOk) return;
  const loc = me.location;
  const data = {
    name: me.name,
    x: me.x,
    y: me.y,
    avatar: me.avatar,
    level: me.level,
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

function listenPresence() {
  if (!presenceOk) {
    listenPlayersInLocation();
    return;
  }
  if (presenceListenRef) presenceListenRef.off();
  const loc = me.location;
  presenceListenRef = db.ref("presence/" + loc);
  presenceListenRef.on("value", snap => {
    others = snap.val() || {};
    renderPlayers();
    renderPlayersList();
    updateOnlineCount();
  }, err => {
    disablePresence(err?.message || "read");
  });
}

function listenPlayersInLocation() {
  if (playersListenRef) playersListenRef.off();
  playersListenRef = db.ref("players");
  playersListenRef.on("value", snap => {
    const all = snap.val() || {};
    others = {};
    Object.entries(all).forEach(([id, p]) => {
      if (id === uid || !p || p.location !== me.location) return;
      others[id] = {
        name: p.name,
        x: p.x || 50,
        y: p.y || 55,
        avatar: p.avatar,
        level: p.level || 1
      };
    });
    renderPlayers();
    renderPlayersList();
    document.getElementById("onlineCount").textContent = String(Object.keys(all).length);
  });
}

function renderPlayersList() {
  const el = document.getElementById("playersList");
  if (!el) return;
  const rows = Object.entries(others).filter(([id]) => id !== uid).map(([, p]) => `● ${escapeHtml(p.name)}`);
  el.innerHTML = rows.length ? rows.join("<br>") : "<span style='opacity:.6'>Пока одни...</span>";
}

function listenChat() {
  db.ref("chat").limitToLast(25).on("child_added", s => {
    const m = s.val();
    if (!m) return;
    const box = document.getElementById("chatMessages");
    const line = document.createElement("div");
    line.innerHTML = "<b>" + escapeHtml(m.name) + ":</b> " + escapeHtml(m.text);
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  });
}

function listenBuildings() {
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

function updateOnlineCount() {
  if (!presenceOk) return;
  db.ref("presence").once("value").then(s => {
    let n = 0;
    const v = s.val() || {};
    Object.keys(v).forEach(k => { n += Object.keys(v[k] || {}).length; });
    document.getElementById("onlineCount").textContent = String(n);
  }).catch(() => {
    db.ref("players").once("value").then(s => {
      document.getElementById("onlineCount").textContent = String(Object.keys(s.val() || {}).length);
    });
  });
}

function goLocation(id) {
  if (!LOCATIONS[id]) return;
  if (presenceOk && presenceRef) db.ref("presence/" + me.location + "/" + uid).remove().catch(() => {});
  me.location = id;
  me.x = 45;
  me.y = 60;
  saveMe();
  if (presenceOk) listenPresence();
  else listenPlayersInLocation();
  listenBuildings();
  refreshLifeScene();
  renderAll();
  toast(LOCATIONS[id].title);
  if (pendingJobAction) {
    const act = pendingJobAction;
    pendingJobAction = null;
    setTimeout(() => runJobAction(act), 350);
  }
}

function onRoomClick(e) {
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
  }
}

function renderAll() {
  const loc = LOCATIONS[me.location];
  document.getElementById("bg").src = loc.bg;
  document.getElementById("locTitle").textContent = loc.title;
  document.getElementById("coins").textContent = isOwner ? "∞" : String(me.coins);
  document.getElementById("xp").textContent = String(me.xp);
  document.getElementById("level").textContent = String(me.level);
  document.getElementById("rep").textContent = String(me.rep);
  document.getElementById("chainStat").textContent = String(me.stats.chain);

  const doors = document.getElementById("doors");
  doors.innerHTML = loc.doors.map(d =>
    `<div class="hotspot door" data-label="${escapeHtml(d.label)}" style="left:${d.x}%;top:${d.y}%;width:${d.w}%;height:${d.h}%;" data-to="${d.to}"></div>`
  ).join("");
  doors.querySelectorAll(".hotspot").forEach(el => {
    el.onclick = () => goLocation(el.dataset.to);
  });

  document.getElementById("btnJob").style.display = "inline-block";
  document.getElementById("btnBuild").style.display = loc.buildZone === "city" ? "inline-block" : "none";
  document.getElementById("btnDecor").style.display = me.location === "room" ? "inline-block" : "none";
  document.getElementById("btnParkour").style.display = loc.parkour ? "inline-block" : "none";
  document.getElementById("btnFight").style.display = (loc.npcs && loc.npcs.length) ? "inline-block" : "none";

  renderPlayers();
  LifeEngine.onSceneRender(loc);
  LifeEngine.decorateEntities();
  renderQuest();
  renderNpcMarkers();
}

function refreshLifeScene() {
  const loc = LOCATIONS[me.location];
  LifeEngine.onLocationChange(!!loc.night);
}

function renderPlayers() {
  const layer = document.getElementById("entities");
  let html = `<div class="entity me" style="left:${me.x}%;top:${me.y}%;">
    <div class="sprite-wrap breathe sway"><img class="avatar" src="${me.avatar}" alt=""><span class="blink-overlay"></span></div>
    <div class="tag">${escapeHtml(me.name)} (ты)</div></div>`;

  Object.entries(others).forEach(([id, p]) => {
    if (id === uid || !p) return;
    html += `<div class="entity breathe sway" style="left:${p.x}%;top:${p.y}%;">
      <div class="sprite-wrap"><img class="avatar" src="${escapeHtml(p.avatar || "imagine_images/Lix06.jpg")}" alt=""></div>
      <div class="tag">${escapeHtml(p.name)} · ур.${p.level || 1}</div></div>`;
  });

  (LOCATIONS[me.location].npcs || []).forEach(nid => {
    const n = NPCS[nid];
    if (!n) return;
    const px = 25 + (nid.length * 7) % 50;
    const py = 48 + (nid.length * 3) % 20;
    html += `<div class="entity npc breathe sway" style="left:${px}%;top:${py}%;" data-npc="${nid}">
      <div class="sprite-wrap"><img class="avatar" src="${n.img}" alt=""><span class="blink-overlay npc-blink"></span></div>
      <div class="tag">${escapeHtml(n.name)}</div></div>`;
  });

  layer.innerHTML = html;
  layer.querySelectorAll(".entity.npc").forEach(el => {
    el.onclick = () => openNpcDialog(el.dataset.npc);
  });
  LifeEngine.afterEntityRender?.();
}

function petDog(fromLife) {
  if (!fromLife) LifeEngine.barkAndPet();
  toast("Пёс рад! +6 монет");
  if (!isOwner) me.coins += 6;
  me.xp += 3;
  saveMe();
  document.getElementById("coins").textContent = isOwner ? "∞" : String(me.coins);
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
  const qid = me.quests.active;
  const q = QUESTS[qid];
  if (!q) {
    document.getElementById("questBox").innerHTML = "<b>Квесты</b><br>Все задания выполнены!";
    return;
  }
  const prog = me.quests.progress || {};
  let status = Object.entries(q.need).map(([k, v]) => `${k}: ${prog[k] || 0}/${v}`).join(", ");
  document.getElementById("questBox").innerHTML =
    `<b>${escapeHtml(q.title)}</b><br>${escapeHtml(q.text)}<br><small>${status}</small>`;
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
    toast("Квест выполнен: " + QUESTS[qid].title);
    const order = ["intro", "chain_duel", "parkour_rep", "build_crypts"];
    const idx = order.indexOf(qid);
    me.quests.active = order[idx + 1] || null;
    me.quests.progress = {};
  }
  saveMe();
  renderQuest();
  document.getElementById("coins").textContent = isOwner ? "∞" : String(me.coins);
}

function openModal(id) {
  document.getElementById(id).classList.add("active");
  if (id === "shopModal") renderShop();
  if (id === "gangModal") renderGangList();
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
      <img src="${n.img}" alt=""><div><b>${escapeHtml(n.name)}</b><br><small>Диалог / квест</small></div></div>`;
  }).join("");
  document.getElementById("gangList").querySelectorAll(".npc-row").forEach(el => {
    el.onclick = () => openNpcDialog(el.dataset.npc);
  });
}

function openNpcDialog(nid) {
  const n = NPCS[nid];
  if (!n) return;
  const line = n.lines[Math.floor(Math.random() * n.lines.length)];
  document.getElementById("dialogArea").innerHTML =
    `<div class="dialog-box"><b>${escapeHtml(n.name)}:</b> ${escapeHtml(line)}</div>
     <button class="btn" onclick="startNpcFight('${nid}')">Цепная дуэль</button>
     ${n.quest ? `<button class="btn secondary" onclick="acceptQuest('${n.quest}')">Взять задание</button>` : ""}`;
  openModal("gangModal");
  if (nid === "razor") questBump("talk_razor");
}

function acceptQuest(qid) {
  me.quests.active = qid;
  me.quests.progress = {};
  saveMe();
  renderQuest();
  toast("Новое задание: " + QUESTS[qid].title);
}

function renderShop() {
  const items = SHOP[shopTab] || [];
  document.getElementById("shopGrid").innerHTML = items.map(it => {
    const own = me.owned.includes(it.id);
    return `<div class="card">
      <img src="${it.img}" alt="">
      <div><b>${escapeHtml(it.name)}</b></div>
      <div class="price">${isOwner ? "FREE" : it.price + " монет"}</div>
      <button class="btn" ${own && it.cat !== "materials" ? "disabled" : ""} onclick="buyItem('${it.id}')">
        ${own && it.cat !== "materials" ? "Есть" : "Купить"}
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
  if (!isOwner && me.coins < it.price) { toast("Не хватает монет"); return; }
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
      toast("Пёс теперь с тобой!");
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
  toast("Куплено: " + it.name);
}

function renderInventory() {
  const mats = Object.entries(me.inventory.materials || {}).map(([k, v]) => `${k}: ${v}`).join(", ") || "нет";
  document.getElementById("invContent").innerHTML = `
    <p><b>Цепь:</b> ${me.equipment.chains || "—"}</p>
    <p><b>Питомец:</b> ${me.pet || "—"}</p>
    <p><b>Материалы:</b> ${escapeHtml(mats)}</p>
    <p><b>Свитки:</b> ${(me.inventory.spells || []).join(", ") || "—"}</p>`;
}

function renderMagic() {
  const spells = [...new Set(me.inventory.spells || [])];
  document.getElementById("magicList").innerHTML = spells.length
    ? spells.map(s => {
        const sp = SPELLS[s];
        return `<button class="btn" onclick="castWorldSpell('${s}')">${sp.name}</button>`;
      }).join(" ")
    : "<p>Купи свитки в лавке (раздел Магия).</p>";
}

function castWorldSpell(spellId) {
  const now = Date.now();
  if ((spellCooldowns[spellId] || 0) > now) {
    toast("Перезарядка...");
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
    toast(sp.name + " — неон взрывается!");
  } else if (spellId === "graffiti_shield") {
    me.stats._shield = (me.stats._shield || 0) + sp.shield;
    toast("Щит активен");
  } else if (spellId === "shadow_dash") {
    me.x = Math.min(95, me.x + 12);
    toast("Теневой рывок!");
  } else if (spellId === "chain_spark") {
    me.stats.chain += 2;
    toast("Искра усиливает цепь!");
  }
  saveMe();
  renderAll();
}

function doJob(action) {
  runJobAction(action);
}

function runJobAction(action) {
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
  if (!isOwner && now < cd) { toast("Отдых..."); return; }
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
  const labels = { dig: "Выкопал яму", cobwebs: "Снял паутину", clean: "Убрал мусор", water: "Полил цветы" };
  toast(`${labels[action] || "Работа"} (+${gain})`);
}

function openJobPanel() {
  document.getElementById("jobModalTitle").textContent = "Подработки банды";
  document.getElementById("jobModalDesc").textContent =
    "Выбери смену — тебя отвезут на локацию, потом начнётся работа.";
  document.getElementById("jobActions").innerHTML = JOB_BOARD.map(j =>
    `<div class="card" style="margin-bottom:8px">
      <b>${escapeHtml(j.title)}</b><br><small>${escapeHtml(j.desc)}</small><br>
      <button class="btn" style="margin-top:6px" onclick="travelJob('${j.action}','${j.loc}')">Ехать и работать</button>
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
  toast(buildMode ? "Режим стройки: кликни на землю" : "Стройка выкл");
}

function tryPlaceBuild(x, y) {
  const type = selectedBuild;
  const count = me.inventory.materials[type] || 0;
  if (count < 1) { toast("Купи материалы в лавке"); return; }
  me.inventory.materials[type]--;
  const piece = { type, x, y, owner: uid, ts: Date.now() };
  db.ref("buildings/city").push(piece);
  me.built = (me.built || 0) + 1;
  saveMe();
  questBump("built", 1);
  toast("Построено!");
}

function tryDecorPlace() {
  if (me.location !== "room") return;
  const poster = me.owned.find(o => o.startsWith("mat_") || o === "jacket_neon");
  const piece = { type: "poster", x: 30 + Math.random() * 40, y: 30 + Math.random() * 30, owner: uid };
  me.decor = me.decor || [];
  me.decor.push(piece);
  saveMe();
  loadPrivateDecor();
  toast("Декор в комнате!");
}

function startNpcFight(nid) {
  const npc = NPCS[nid] || { name: "Хулиган", img: "imagine_images/MRgTC.jpg" };
  fight = {
    npcName: npc.name,
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

function fightAttack(kind) {
  if (!fight) return;
  let dmg = me.stats.chain + Math.floor(Math.random() * 10);
  if (kind === "kick") dmg = Math.floor(dmg * 0.7) + 4;
  if (kind === "heavy") dmg = Math.floor(dmg * 1.3);
  fight.npcHp -= dmg;
  fight.log.push(`Ты бьёшь (−${dmg})`);
  if (fight.npcHp <= 0) return endFight(true);
  npcTurn();
}

function fightSpell() {
  const spells = me.inventory.spells || [];
  if (!spells.length) { toast("Нет свитков"); return; }
  const s = spells[0];
  const sp = SPELLS[s];
  const dmg = sp.dmg || 10;
  fight.npcHp -= dmg;
  fight.log.push(sp.name + ` (−${dmg})`);
  if (fight.npcHp <= 0) return endFight(true);
  if (sp.skip) fight.log.push("Соперник пропускает ход");
  else npcTurn();
}

function npcTurn() {
  let dmg = 8 + Math.floor(Math.random() * 14);
  if (fight.shield > 0) {
    const block = Math.min(fight.shield, dmg);
    fight.shield -= block;
    dmg -= block;
    fight.log.push("Щит блокирует " + block);
  }
  fight.playerHp -= dmg;
  fight.log.push(fight.npcName + ` бьёт (−${dmg})`);
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
    toast("Победа! +" + reward);
    questBump("win_fight");
  } else {
    toast("Поражение... отдыхай");
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
  if (me.location !== "parkour") {
    pendingJobAction = "parkour";
    goLocation("parkour");
    return;
  }
  runParkourJob();
}

function runParkourJob() {
  const steps = ["Прыжок!", "Баланс!", "Рывок!", "Финиш!"];
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
      toast("Паркур пройден! +" + pay);
      return;
    }
    if (confirm(steps[i] + " — нажми OK вовремя")) {
      i++;
      setTimeout(next, 280);
    } else toast("Сорвался...");
  };
  next();
}

function sendChat() {
  const inp = document.getElementById("chatInput");
  const text = inp.value.trim();
  if (!text) return;
  db.ref("chat").push({ uid, name: me.name, text, time: Date.now(), loc: me.location }).catch(() => {
    toast("Чат временно недоступен");
  });
  inp.value = "";
}

function tickPresence() {
  pushPresence();
  updateOnlineCount();
}

function tickNight() {
  document.getElementById("coins").textContent = isOwner ? "∞" : String(me.coins);
}

window.openModal = openModal;
window.closeModal = closeModal;
window.buyItem = buyItem;
window.doJob = doJob;
window.openJobPanel = openJobPanel;
window.toggleBuildMode = toggleBuildMode;
window.startFightUi = startFightUi;
window.fightAttack = fightAttack;
window.fightSpell = fightSpell;
window.closeFight = closeFight;
window.runParkour = runParkour;
window.sendChat = sendChat;
window.castWorldSpell = castWorldSpell;
window.startNpcFight = startNpcFight;
window.acceptQuest = acceptQuest;
window.tryDecorPlace = tryDecorPlace;
window.setBuildType = function (t) { selectedBuild = t; toast("Строим: " + t); };
window.travelJob = travelJob;
window.runJobAction = runJobAction;

document.addEventListener("DOMContentLoaded", init);
