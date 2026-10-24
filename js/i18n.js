/* Локализация: ru / en / da */
const I18N = {
  ru: {
    coins: "Монеты", xp: "XP", level: "Уровень", rep: "Репутация", chain: "Цепь", online: "Здесь", onlineGlobal: "Всего в игре",
    loading: "Вход в банду...", loading_retry: "Повторить", loading_fresh: "Начать заново (аккаунт сохранится)",
    loading_timeout: "Загрузка слишком долгая. Проверь сеть или нажми «Повторить».",
    loading_boot_error: "Не удалось загрузить сохранение.", chatPh: "Чат банды...", onlineSide: "В этой локации", alone: "Пока одни…",
    here_short: "Здесь", chat_toggle: "Чат",
    map: "Карта", gang: "Банда", shop: "Лавка", magic: "Магия", inv: "Инвентарь", job: "Работа", build: "Стройка",
    decor: "Декор", fight: "Драка", parkour: "Паркур", you: "(ты)", buy: "Купить", owned: "Есть", free: "FREE",
    mapTitle: "Карта ночи", mapDesc: "Выбери локацию — телепорт откроет сцену.",
    go: "Идти", here: "Ты здесь", gangTitle: "Живая банда", shopTitle: "Неоновая лавка",
    jobTitle: "Подработки банды", jobDesc: "Выбери смену — тебя отвезут на локацию.",
    fightTitle: "Цепная дуэль", flee: "Сбежать", chainBtn: "Цепь", kick: "Пинок", heavy: "Тяжёлый", scroll: "Свиток",
    tab_clothes: "Одежда", tab_chains: "Цепи", tab_magic: "Магия", tab_pets: "Питомцы", tab_materials: "Материалы",
    quest_done: "Все задания выполнены!", notEnough: "Не хватает монет", bought: "Куплено",
    dogBark: "Гав!", petHappy: "Пёс рад! +6 монет", chatDown: "Чат временно недоступен",
    ownerCoinsHint: "владелец",
    nav_room: "Дом", nav_street: "Улица", nav_cemetery: "Кладбище", nav_city: "Город", nav_roof: "Крыша", nav_parkour: "Паркур",
    door_kitchen: "Кухня", door_toilet: "Туалет", door_elevator: "Лифт", door_roof: "Крыша", door_room: "Комната",
    door_street: "Улица", door_cemetery: "Кладбище", door_city: "Город", door_construction: "Стройка",
    door_home: "Дом", door_parkour: "Паркур",
    nav_construction: "Стройка", coins_short: "монет", authority_label: "Авторитет",
    duel_training_win: "Тренировка выиграна!",
    job_flyers: "Расклейка флаеров", job_flyers_desc: "Улица, 2 мин, 30 монет",
    job_helper: "Подсобник", job_helper_desc: "Стройка, 3 мин, 45 монет + доски",
    job_dishes: "Мойка посуды", job_dishes_desc: "Кухня, 2 мин, 25 монет + пирог",
    npc_zoya: "Бабуля Зоя", npc_plukh: "Плюх", npc_tony: "Тони", npc_bolt: "Дядя Болт",
    npc_foreman: "Михална", npc_vintik: "Винтик", story_low_energy: "Мало энергии — перекуси",
    job_dig: "Копать могилы", job_cobwebs: "Снять паутину", job_parkour: "Паркур-забег",
    job_go: "Ехать и работать", chain_fight: "Цепная дуэль", accept_quest: "Взять задание",
    coins_word: "монет", devCoins: "тест-монеты",
    shop_jacket_neon: "Неоновая куртка", shop_mohawk_dye: "Краситель ирокеза", shop_boots_spike: "Шипованные ботинки",
    shop_chain_rust: "Ржавая цепь", shop_chain_neon: "Неоновая цепь", shop_chain_vienna: "Венская цепь",
    shop_pet_dog: "Панковый пёс", shop_pet_cat: "Ночной кот", shop_pet_rat: "Крыса", shop_pet_crow: "Ворона",
    shop_spell_neon_flash: "Свиток: Неоновый всплеск", shop_spell_graffiti: "Свиток: Граффити-щит",
    shop_spell_shadow: "Свиток: Теневой рывок", shop_spell_spark: "Свиток: Искра цепи",
    shop_mat_crypt: "Камень склепа", shop_mat_neon: "Неоновая панель", shop_mat_brick: "Кирпич из мусора",
    sys_bought: "купил(а)", quests_label: "Квесты", gang_dialog_hint: "Диалог / квест",
    magic_title: "Панк-магия", inv_title: "Рюкзак", inv_chain: "Цепь", inv_pet: "Питомец",
    inv_materials: "Материалы", inv_spells: "Свитки", inv_none: "нет", inv_dash: "—",
    magic_empty: "Купи свитки в лавке (раздел Магия).", build_hint: "Стройка: купи материалы → Город → Стройка → клик по земле.",
    build_crypt: "Склеп", build_shack: "Дом", build_neon: "Неон",
    fight_you: "Ты", fight_rival: "Соперник", lvl_short: "ур.",
    quest_new: "Новое задание:", quest_complete: "Квест выполнен:",
    dog_with_you: "Пёс теперь с тобой!", bought_item: "Куплено:",
    trash_coins: "+5 за мусор", cat_hiss: "Кот шипит и убегает",
    cooldown: "Перезарядка...", no_scrolls: "Нет свитков", shield_on: "Щит активен",
    shadow_dash_toast: "Теневой рывок!", spark_chain: "Искра усиливает цепь!",
    neon_burst: " — неон взрывается!", rest: "Отдых...",
    build_mode_on: "Режим стройки: кликни на землю", build_mode_off: "Стройка выкл",
    buy_materials: "Купи материалы в лавке", built: "Построено!", decor_room: "Декор в комнате!",
    building: "Строим:", win_fight: "Победа!", lose_fight: "Поражение... отдыхай", fight_try_again: "Попробуй снова",
    parkour_done: "Паркур пройден!", parkour_fail: "Сорвался...",
    parkour_step1: "Прыжок!", parkour_step2: "Баланс!", parkour_step3: "Рывок!", parkour_step4: "Финиш!",
    job_dig_done: "Выкопал яму", job_cobwebs_done: "Снял паутину", job_clean_done: "Убрал мусор", job_water_done: "Полил цветы",
    job_generic: "Работа", job_cemetery_spot: "Кладбище у Вены", job_corners: "Углы кладбища", job_roof_route: "Крышный маршрут",
    login_error: "Ошибка входа:", fight_hit_you: "Ты бьёшь", fight_hit_npc: "бьёт",
    fight_shield_block: "Щит блокирует", fight_skip_turn: "Соперник пропускает ход",
    npc_razor: "Рейзор", npc_mohawk: "Ирокез", npc_vienna: "Вена", npc_ghost: "Призрак Сцены", npc_gravedigger: "Смотритель",
    npc_cobalt: "Кобальт",
    char_select_title: "Выбери своего панка", char_select_confirm: "В бой", char_changed: "Персонаж сменён",
    char_razor_soon: "Скоро", hint_pet_dog: "E — погладить",
    age_13: "13+", footer_subscribe: "Цена и условия",
    auth_sign_in: "Войти", auth_sign_out: "Выйти", auth_account: "Аккаунт",
    auth_modal_title: "Войти в аккаунт", auth_modal_hint: "Сохраните прогресс на всех устройствах. Гостевой прогресс останется в этом же аккаунте.",
    auth_google: "Войти через Google", auth_email: "Email", auth_password: "Пароль",
    auth_email_sign_in: "Email: войти / привязать", auth_reset_password: "Сброс пароля по email",
    auth_signed_in: "Вы вошли в аккаунт", auth_signed_out: "Вы вышли — новая гостевая сессия",
    auth_linked_ok: "Аккаунт привязан — прогресс сохранён", auth_signed_in_existing: "Загружен сохранённый аккаунт",
    auth_enter_email: "Введите email", auth_email_prompt: "Email владельца", auth_password_prompt: "Пароль",
    auth_conflict_title: "Аккаунт уже существует",
    auth_conflict_body: "У {email} уже есть сохранение. Войти в него (гостевой прогресс на этом устройстве останется отдельно) или остаться гостем?",
    auth_conflict_use: "Войти в этот аккаунт", auth_conflict_keep: "Остаться гостем",
    auth_err_popup: "Всплывающее окно заблокировано — разрешите окна для сайта или будет переход",
    auth_err_cancelled: "Вход отменён", auth_err_email_used: "Email уже занят",
    auth_err_account_exists: "Этот аккаунт уже зарегистрирован", auth_err_wrong_password: "Неверный пароль",
    auth_err_no_user: "Пользователь не найден", auth_err_weak_password: "Пароль слишком простой (мин. 6)",
    auth_err_invalid_email: "Некорректный email", auth_err_providers_disabled: "Провайдер не включён в Firebase (см. ACCOUNTS_SETUP.md)",
    auth_err_email_unavailable: "Вход по email временно недоступен. Используйте «Войти через Google».",
    auth_err_unsupported_env: "Вход через всплывающее окно недоступен — пробуем переход…",
    auth_err_network: "Нет сети — проверьте подключение и повторите",
    auth_err_too_many_requests: "Слишком много попыток — подождите и повторите",
    auth_err_user_disabled: "Аккаунт отключён",
    auth_err_invalid_credential: "Неверные данные для входа",
    auth_err_requires_recent_login: "Войдите снова и повторите действие",
    auth_err_generic: "Ошибка входа", auth_redirect_try: "Переход для входа…",
    owner_loading: "Загрузка…", owner_denied: "Нет доступа", owner_sign_in_prompt: "Войдите как владелец",
    owner_welcome: "Владелец:", owner_version: "Версия игры", owner_player_count: "Игроков в базе",
    owner_recent: "Недавно активные", owner_tester_link: "Тестовая сборка (?test=1)",
    owner_rules_hint: "Нет прав на чтение players — опубликуйте rules (см. RULES_PUBLISH_CHECKLIST.md)",
    owner_admin_claim_hint: "Нужен admin Custom Claim. Локально: node scripts/set-admin-claim.mjs (см. RULES_PUBLISH_CHECKLIST.md)",
    subscribe_account_link: "Войти в аккаунт",
    voice_mute: "Без голоса", voice_unmute: "Голос вкл", char_change_btn: "Сменить героя",
    audio_settings_title: "Звук", audio_settings_btn: "Звук", audio_music: "Музыка", audio_speech: "Речь", audio_sfx: "Эффекты",
    audio_mute_all: "Без звука", audio_unmute_all: "Звук вкл",
    audio_temp_voice: "Временный компьютерный голос", audio_temp_voice_hint: "По умолчанию выкл. Браузер читает реплики, если нет записи.",
    audio_voice_recorded: "голос: запись есть", audio_voice_synth: "голос: только браузер", audio_voice_none: "голос: пока нет",
    spell_neon_flash: "Неоновый всплеск", spell_graffiti: "Граффити-щит", spell_shadow: "Теневой рывок", spell_spark: "Искра цепи",
    prog_talk_razor: "Поговорить с Рейзором", prog_win_fight: "Победить в драке", prog_parkour_win: "Пройти паркур", prog_built: "Построить",
    howto_title: "Как играть", howto_goal: "Цель: пройти обучение и освоить ночной мир банды.", howto_gotit: "Понятно",
    howto_body_desktop: "WASD / стрелки — ходьба\nShift — бег\nПробел — прыжок\nE — разговор / действие\nПКМ + движение мыши — камера\nКлик по полу — идти",
    howto_body_touch: "Джойстик слева — ходьба (дальше = бег)\nE справа — действие\nСвайп справа — камера",
    hint_talk_npc: "E — поговорить", hint_portal: "Зайди в неоновое кольцо — переход", hint_portal_named: "Портал: {dest}",
    onboard_title: "Обучение", onboard_step_done: "Шаг готов!", onboard_all_done: "Обучение пройдено!",
    onboard_move_title: "Шаг 1: Осмотрись", onboard_move_text: "Пройдись по комнате (WASD или джойстик).",
    onboard_go_street_title: "Шаг 2: Улица", onboard_go_street_text: "Из дома войди в портал «Улица».",
    onboard_talk_razor_title: "Шаг 3: Рейзор", onboard_talk_razor_text: "На улице найди Рейзора и нажми E.",
    onboard_visit_cemetery_title: "Шаг 4: Кладбище", onboard_visit_cemetery_text: "С улицы зайди на кладбище.",
    onboard_win_fight_title: "Шаг 5: Дуэль", onboard_win_fight_text: "Победи в цепной драке с NPC.",
    onboard_shop_buy_title: "Шаг 6: Лавка", onboard_shop_buy_text: "Купи что-нибудь в лавке (кнопка Shop).",
    dodge: "Уклон", fight_dodge: "Уклон! Щит +14",
    interact_sit: "Отдыхаешь на диване…", interact_snack: "Перекус из холодильника (+энергия)", interact_arcade: "Аркада: +12 монет",
    interact_tv: "Телевизор щёлкает каналами…",
    job_cemetery_night: "Ночная смена на кладбище", job_cemetery_night_desc: "Свечи, листья и призраки — таймер 28 с",
    job_cemetery_start: "Смена началась!", job_cemetery_tick: "Задача выполнена…", job_cemetery_done: "Смена окончена:",
    job_go_cemetery: "Сначала иди на кладбище", job_pizza: "Доставка пиццы", job_pizza_desc: "Город — забери и доставь",
    job_pizza_done: "Пицца доставлена! +35 монет", job_go_city: "Сначала иди в город",
    daily_walk_street: "Погуляй по улице", daily_pet_dog: "Погладь пса", daily_win_duel: "Выиграй дуэль",
    daily_complete: "Ежедневное задание:", decor_room_only: "Декор только в комнате", decor_mode_on: "Режим декора: кликни пол",
    decor_mode_off: "Декор выключен", decor_placed: "Мебель поставлена", decor_limit: "Лимит мебели (12)",
    dog_fetch: "Пёс принёс мячик!", need_dog: "Нужен пёс из лавки",
    shop_hat_spike: "Шипастая шляпа",
    daily_title: "Ежедневные", level_up: "Новый уровень!", level_unlock: "Открыт аксессуар в лавке",
    fight_block: "Блок", interact_jukebox: "Джукбокс: трек",
    job_cemetery_hud: "Ночная смена", job_candles: "свечи", job_ghosts: "призраки"
  },
  en: {
    coins: "Coins", xp: "XP", level: "Level", rep: "Rep", chain: "Chain", online: "Here", onlineGlobal: "Total online",
    loading: "Joining the gang...", loading_retry: "Retry", loading_fresh: "Start fresh (keep account)",
    loading_timeout: "Loading is taking too long. Check your network or tap Retry.",
    loading_boot_error: "Could not load your save.", chatPh: "Gang chat...", onlineSide: "In this location", alone: "Just you for now…",
    here_short: "Here", chat_toggle: "Chat",
    map: "Map", gang: "Gang", shop: "Shop", magic: "Magic", inv: "Bag", job: "Jobs", build: "Build",
    decor: "Decor", fight: "Fight", parkour: "Parkour", you: "(you)", buy: "Buy", owned: "Owned", free: "FREE",
    mapTitle: "Night map", mapDesc: "Pick a location to jump there.",
    go: "Go", here: "You are here", gangTitle: "Living gang", shopTitle: "Neon shop",
    jobTitle: "Gang side jobs", jobDesc: "Pick a shift — you will be taken to the spot.",
    fightTitle: "Chain duel", flee: "Run", chainBtn: "Chain", kick: "Kick", heavy: "Heavy", scroll: "Scroll",
    tab_clothes: "Clothes", tab_chains: "Chains", tab_magic: "Magic", tab_pets: "Pets", tab_materials: "Materials",
    quest_done: "All quests done!", notEnough: "Not enough coins", bought: "Purchased",
    dogBark: "Woof!", petHappy: "Dog is happy! +6 coins", chatDown: "Chat unavailable",
    ownerCoinsHint: "owner",
    nav_room: "Home", nav_street: "Street", nav_cemetery: "Cemetery", nav_city: "City", nav_roof: "Roof", nav_parkour: "Parkour",
    door_kitchen: "Kitchen", door_toilet: "Toilet", door_elevator: "Elevator", door_roof: "Rooftop", door_room: "Room",
    door_street: "Street", door_cemetery: "Cemetery", door_city: "City", door_construction: "Construction",
    door_home: "Home", door_parkour: "Parkour",
    nav_construction: "Construction", coins_short: "coins", authority_label: "Authority",
    duel_training_win: "Training win!",
    job_flyers: "Flyer run", job_flyers_desc: "Street, 2 min, 30 coins",
    job_helper: "Site helper", job_helper_desc: "Construction, 3 min, 45 coins + boards",
    job_dishes: "Dish washing", job_dishes_desc: "Kitchen, 2 min, 25 coins + pie",
    npc_zoya: "Grandma Zoya", npc_plukh: "Plukh", npc_tony: "Tony", npc_bolt: "Uncle Bolt",
    npc_foreman: "Foreman Mikhailna", npc_vintik: "Vintik", story_low_energy: "Low energy — snack first",
    job_dig: "Grave digging", job_cobwebs: "Clear cobwebs", job_parkour: "Parkour run",
    job_go: "Go & work", chain_fight: "Chain duel", accept_quest: "Take quest",
    coins_word: "coins", devCoins: "test coins",
    shop_jacket_neon: "Neon jacket", shop_mohawk_dye: "Mohawk dye", shop_boots_spike: "Spiked boots",
    shop_chain_rust: "Rust chain", shop_chain_neon: "Neon chain", shop_chain_vienna: "Vienna chain",
    shop_pet_dog: "Punk dog", shop_pet_cat: "Night cat", shop_pet_rat: "Sewer rat", shop_pet_crow: "Grave crow",
    shop_spell_neon_flash: "Scroll: Neon burst", shop_spell_graffiti: "Scroll: Graffiti shield",
    shop_spell_shadow: "Scroll: Shadow dash", shop_spell_spark: "Scroll: Chain spark",
    shop_mat_crypt: "Crypt stone", shop_mat_neon: "Neon panel", shop_mat_brick: "Scrap brick",
    sys_bought: "bought", quests_label: "Quests", gang_dialog_hint: "Dialog / quest",
    magic_title: "Punk magic", inv_title: "Backpack", inv_chain: "Chain", inv_pet: "Pet",
    inv_materials: "Materials", inv_spells: "Scrolls", inv_none: "none", inv_dash: "—",
    magic_empty: "Buy scrolls at the shop (Magic tab).", build_hint: "Build: buy materials → City → Build → click ground.",
    build_crypt: "Crypt", build_shack: "Shack", build_neon: "Neon",
    fight_you: "You", fight_rival: "Rival", lvl_short: "lv.",
    quest_new: "New quest:", quest_complete: "Quest complete:",
    dog_with_you: "Dog is with you now!", bought_item: "Purchased:",
    trash_coins: "+5 for trash", cat_hiss: "Cat hisses and runs off",
    cooldown: "Cooldown...", no_scrolls: "No scrolls", shield_on: "Shield active",
    shadow_dash_toast: "Shadow dash!", spark_chain: "Spark boosts your chain!",
    neon_burst: " — neon explodes!", rest: "Rest...",
    build_mode_on: "Build mode: click the ground", build_mode_off: "Build mode off",
    buy_materials: "Buy materials in the shop", built: "Built!", decor_room: "Decor in your room!",
    building: "Building:", win_fight: "Victory!", lose_fight: "Defeat... rest up", fight_try_again: "Try again",
    parkour_done: "Parkour cleared!", parkour_fail: "You slipped...",
    parkour_step1: "Jump!", parkour_step2: "Balance!", parkour_step3: "Dash!", parkour_step4: "Finish!",
    job_dig_done: "Dug a grave", job_cobwebs_done: "Cleared cobwebs", job_clean_done: "Cleaned up", job_water_done: "Watered flowers",
    job_generic: "Job", job_cemetery_spot: "Vienna cemetery", job_corners: "Cemetery corners", job_roof_route: "Rooftop route",
    login_error: "Login error:", fight_hit_you: "You hit", fight_hit_npc: "hits",
    fight_shield_block: "Shield blocks", fight_skip_turn: "Rival skips a turn",
    npc_razor: "Razor", npc_mohawk: "Mohawk", npc_vienna: "Vienna", npc_ghost: "Stage Ghost", npc_gravedigger: "Gravedigger",
    npc_cobalt: "Cobalt",
    char_select_title: "Pick your punk", char_select_confirm: "Join the gang", char_changed: "Character changed",
    char_razor_soon: "Soon", hint_pet_dog: "E — pet",
    age_13: "13+", footer_subscribe: "Price & terms",
    auth_sign_in: "Sign in", auth_sign_out: "Sign out", auth_account: "Account",
    auth_modal_title: "Sign in", auth_modal_hint: "Keep progress on all devices. Guest progress stays on this account when you link.",
    auth_google: "Sign in with Google", auth_email: "Email", auth_password: "Password",
    auth_email_sign_in: "Email: sign in / link", auth_reset_password: "Reset password by email",
    auth_signed_in: "Signed in", auth_signed_out: "Signed out — new guest session",
    auth_linked_ok: "Account linked — progress kept", auth_signed_in_existing: "Loaded existing account save",
    auth_enter_email: "Enter email", auth_email_prompt: "Owner email", auth_password_prompt: "Password",
    auth_conflict_title: "Account already exists",
    auth_conflict_body: "{email} already has a save. Sign in to load it (guest progress on this device stays separate) or stay a guest?",
    auth_conflict_use: "Sign in to that account", auth_conflict_keep: "Stay guest",
    auth_err_popup: "Popup blocked — allow popups for this site or we'll use redirect",
    auth_err_cancelled: "Sign-in cancelled", auth_err_email_used: "Email already in use",
    auth_err_account_exists: "Account already registered", auth_err_wrong_password: "Wrong password",
    auth_err_no_user: "User not found", auth_err_weak_password: "Password too weak (min 6)",
    auth_err_invalid_email: "Invalid email", auth_err_providers_disabled: "Provider not enabled in Firebase (see ACCOUNTS_SETUP.md)",
    auth_err_email_unavailable: "Email sign-in is temporarily unavailable. Please use Sign in with Google.",
    auth_err_unsupported_env: "Popup sign-in isn't available here — trying redirect…",
    auth_err_network: "Network error — check your connection and try again",
    auth_err_too_many_requests: "Too many attempts — wait a moment and try again",
    auth_err_user_disabled: "This account has been disabled",
    auth_err_invalid_credential: "Invalid sign-in credentials",
    auth_err_requires_recent_login: "Please sign in again and retry",
    auth_err_generic: "Sign-in error", auth_redirect_try: "Redirecting to sign in…",
    owner_loading: "Loading…", owner_denied: "Access denied", owner_sign_in_prompt: "Sign in as owner",
    owner_welcome: "Owner:", owner_version: "Game version", owner_player_count: "Players in database",
    owner_recent: "Recently active", owner_tester_link: "Test build (?test=1)",
    owner_rules_hint: "Cannot read players — publish rules (see RULES_PUBLISH_CHECKLIST.md)",
    owner_admin_claim_hint: "Admin custom claim required. Run scripts/set-admin-claim.mjs locally (see RULES_PUBLISH_CHECKLIST.md)",
    subscribe_account_link: "Sign in to your account",
    voice_mute: "Mute voices", voice_unmute: "Voices on", char_change_btn: "Change hero",
    audio_settings_title: "Audio", audio_settings_btn: "Audio", audio_music: "Music", audio_speech: "Speech", audio_sfx: "SFX",
    audio_mute_all: "Mute all", audio_unmute_all: "Sound on",
    audio_temp_voice: "Temporary computer voice", audio_temp_voice_hint: "Off by default. Browser speech when no recorded line exists.",
    audio_voice_recorded: "voice: recorded", audio_voice_synth: "voice: browser only", audio_voice_none: "voice: not available yet",
    spell_neon_flash: "Neon burst", spell_graffiti: "Graffiti shield", spell_shadow: "Shadow dash", spell_spark: "Chain spark",
    prog_talk_razor: "Talk to Razor", prog_win_fight: "Win a fight", prog_parkour_win: "Clear parkour", prog_built: "Build",
    howto_title: "How to play", howto_goal: "Goal: finish onboarding and explore the gang's night world.", howto_gotit: "Got it",
    howto_body_desktop: "WASD / arrows — move\nShift — run\nSpace — jump\nE — talk / interact\nRight-drag — orbit camera\nClick floor — walk",
    howto_body_touch: "Left joystick — move (far = run)\nE button — interact\nRight-side swipe — camera",
    hint_talk_npc: "E — talk", hint_portal: "Step into the neon ring to travel", hint_portal_named: "Portal: {dest}",
    onboard_title: "Training", onboard_step_done: "Step complete!", onboard_all_done: "Training complete!",
    onboard_move_title: "Step 1: Look around", onboard_move_text: "Walk around your room (WASD or joystick).",
    onboard_go_street_title: "Step 2: Street", onboard_go_street_text: "From home, use the Street portal.",
    onboard_talk_razor_title: "Step 3: Razor", onboard_talk_razor_text: "On the street, find Razor and press E.",
    onboard_visit_cemetery_title: "Step 4: Cemetery", onboard_visit_cemetery_text: "From the street, enter the cemetery.",
    onboard_win_fight_title: "Step 5: Duel", onboard_win_fight_text: "Win a chain duel against an NPC.",
    onboard_shop_buy_title: "Step 6: Shop", onboard_shop_buy_text: "Buy something in the Shop.",
    dodge: "Dodge", fight_dodge: "Dodged! Shield +14",
    interact_sit: "Chilling on the sofa…", interact_snack: "Snack from the fridge (+energy)", interact_arcade: "Arcade: +12 coins",
    interact_tv: "TV flickers through channels…",
    job_cemetery_night: "Cemetery night shift", job_cemetery_night_desc: "Candles, leaves, ghosts — 28s timer",
    job_cemetery_start: "Shift started!", job_cemetery_tick: "Task done…", job_cemetery_done: "Shift complete:",
    job_go_cemetery: "Go to the cemetery first", job_pizza: "Pizza delivery", job_pizza_desc: "City — pick up and deliver",
    job_pizza_done: "Pizza delivered! +35 coins", job_go_city: "Go to the city first",
    daily_walk_street: "Walk the street", daily_pet_dog: "Pet the dog", daily_win_duel: "Win a duel",
    daily_complete: "Daily quest:", decor_room_only: "Decor only in your room", decor_mode_on: "Decor mode: tap floor",
    decor_mode_off: "Decor off", decor_placed: "Furniture placed", decor_limit: "Furniture limit (12)",
    dog_fetch: "Dog fetched the ball!", need_dog: "Buy the dog in the shop",
    shop_hat_spike: "Spiked hat",
    daily_title: "Daily", level_up: "Level up!", level_unlock: "Shop unlock available",
    fight_block: "Block", interact_jukebox: "Jukebox track",
    job_cemetery_hud: "Night shift", job_candles: "candles", job_ghosts: "ghosts"
  },
  da: {
    coins: "Mønter", xp: "XP", level: "Niveau", rep: "Respekt", chain: "Kæde", online: "Her", onlineGlobal: "Online i alt",
    loading: "Går ind i banden...", loading_retry: "Prøv igen", loading_fresh: "Start forfra (behold konto)",
    loading_timeout: "Indlæsning tager for lang tid. Tjek netværket eller tryk Prøv igen.",
    loading_boot_error: "Kunne ikke indlæse dit save.", chatPh: "Bandechat...", onlineSide: "På denne lokation", alone: "Kun dig lige nu…",
    here_short: "Her", chat_toggle: "Chat",
    map: "Kort", gang: "Bande", shop: "Butik", magic: "Magie", inv: "Taske", job: "Job", build: "Byg",
    decor: "Dekor", fight: "Slåskamp", parkour: "Parkour", you: "(dig)", buy: "Køb", owned: "Ejet", free: "GRATIS",
    mapTitle: "Natkort", mapDesc: "Vælg et sted for at hoppe dertil.",
    go: "Gå", here: "Du er her", gangTitle: "Levende bande", shopTitle: "Neon-butik",
    jobTitle: "Bande-jobs", jobDesc: "Vælg et skift — du bliver taget til stedet.",
    fightTitle: "Kæde-duel", flee: "Flygt", chainBtn: "Kæde", kick: "Spark", heavy: "Tung", scroll: "Rune",
    tab_clothes: "Tøj", tab_chains: "Kæder", tab_magic: "Magie", tab_pets: "Kæledyr", tab_materials: "Materialer",
    quest_done: "Alle opgaver klaret!", notEnough: "Ikke nok mønter", bought: "Købt",
    dogBark: "Vov!", petHappy: "Hunden er glad! +6 mønter", chatDown: "Chat utilgængelig",
    ownerCoinsHint: "ejer",
    nav_room: "Hjem", nav_street: "Gade", nav_cemetery: "Kirkegård", nav_city: "By", nav_roof: "Tag", nav_parkour: "Parkour",
    door_kitchen: "Køkken", door_toilet: "Toilet", door_elevator: "Elevator", door_roof: "Tag", door_room: "Værelse",
    door_street: "Gade", door_cemetery: "Kirkegård", door_city: "By", door_construction: "Byggeplads",
    door_home: "Hjem", door_parkour: "Parkour",
    nav_construction: "Byggeplads", coins_short: "mønter", authority_label: "Autoritet",
    duel_training_win: "Træning vundet!",
    job_flyers: "Plakattur", job_flyers_desc: "Gade, 2 min, 30 mønter",
    job_helper: "Byggehjælper", job_helper_desc: "Byggeplads, 3 min, 45 mønter",
    job_dishes: "Opvask", job_dishes_desc: "Køkken, 2 min, 25 mønter",
    npc_zoya: "Bedstemor Zoya", npc_plukh: "Plukh", npc_tony: "Tony", npc_bolt: "Onkel Bolt",
    npc_foreman: "Formand Mikhailna", npc_vintik: "Vintik", story_low_energy: "Lav energi — spis først",
    job_dig: "Grave grave", job_cobwebs: "Ryd spindelvæv", job_parkour: "Parkour-løb",
    job_go: "Kør & arbejd", chain_fight: "Kæde-duel", accept_quest: "Tag opgave",
    coins_word: "mønter", devCoins: "testmønter",
    shop_jacket_neon: "Neon-jakke", shop_mohawk_dye: "Mohawk-farve", shop_boots_spike: "Pigstøvler",
    shop_chain_rust: "Rusten kæde", shop_chain_neon: "Neon-kæde", shop_chain_vienna: "Wien-kæde",
    shop_pet_dog: "Punk-hund", shop_pet_cat: "Natkat", shop_pet_rat: "Rotte", shop_pet_crow: "Ravn",
    shop_spell_neon_flash: "Rune: Neon-burst", shop_spell_graffiti: "Rune: Graffiti-skærm",
    shop_spell_shadow: "Rune: Skygge-spring", shop_spell_spark: "Rune: Kæde-gnist",
    shop_mat_crypt: "Kryptsten", shop_mat_neon: "Neonpanel", shop_mat_brick: "Murbrik",
    sys_bought: "købte", quests_label: "Opgaver", gang_dialog_hint: "Dialog / opgave",
    magic_title: "Punk-magie", inv_title: "Rygsæk", inv_chain: "Kæde", inv_pet: "Kæledyr",
    inv_materials: "Materialer", inv_spells: "Runer", inv_none: "ingen", inv_dash: "—",
    magic_empty: "Køb runer i butikken (fanen Magie).", build_hint: "Byg: køb materialer → By → Byg → klik på jorden.",
    build_crypt: "Krypt", build_shack: "Skur", build_neon: "Neon",
    fight_you: "Dig", fight_rival: "Modstander", lvl_short: "nv.",
    quest_new: "Ny opgave:", quest_complete: "Opgave fuldført:",
    dog_with_you: "Hunden er med dig nu!", bought_item: "Købt:",
    trash_coins: "+5 for skrald", cat_hiss: "Katten hvæser og løber",
    cooldown: "Genopladning...", no_scrolls: "Ingen runer", shield_on: "Skjold aktivt",
    shadow_dash_toast: "Skygge-spring!", spark_chain: "Gnist booster kæden!",
    neon_burst: " — neon eksploderer!", rest: "Hvile...",
    build_mode_on: "Byg-tilstand: klik på jorden", build_mode_off: "Byg-tilstand fra",
    buy_materials: "Køb materialer i butikken", built: "Bygget!", decor_room: "Dekor i dit værelse!",
    building: "Bygger:", win_fight: "Sejr!", lose_fight: "Nederlag... hvil dig", fight_try_again: "Prøv igen",
    parkour_done: "Parkour klaret!", parkour_fail: "Du faldt...",
    parkour_step1: "Hop!", parkour_step2: "Balance!", parkour_step3: "Sprint!", parkour_step4: "Mål!",
    job_dig_done: "Gravede en grav", job_cobwebs_done: "Fjernede spindelvæv", job_clean_done: "Ryddede op", job_water_done: "Vandede blomster",
    job_generic: "Job", job_cemetery_spot: "Wien-kirkegård", job_corners: "Kirkegårdshjørner", job_roof_route: "Tagrute",
    login_error: "Login-fejl:", fight_hit_you: "Du slår", fight_hit_npc: "slår",
    fight_shield_block: "Skjold blokerer", fight_skip_turn: "Modstander springer tur over",
    npc_razor: "Razor", npc_mohawk: "Mohawk", npc_vienna: "Vienna", npc_ghost: "Scenegåst", npc_gravedigger: "Gravvogter",
    npc_cobalt: "Cobalt",
    char_select_title: "Vælg din punk", char_select_confirm: "Gå med banden", char_changed: "Karakter skiftet",
    char_razor_soon: "Snart", hint_pet_dog: "E — kæl",
    age_13: "13+", footer_subscribe: "Pris og vilkår",
    auth_sign_in: "Log ind", auth_sign_out: "Log ud", auth_account: "Konto",
    auth_modal_title: "Log ind", auth_modal_hint: "Gem fremskridt på alle enheder. Gæstefremskridt bliver på samme konto ved linking.",
    auth_google: "Log ind med Google", auth_email: "Email", auth_password: "Adgangskode",
    auth_email_sign_in: "Email: log ind / link", auth_reset_password: "Nulstil adgangskode",
    auth_signed_in: "Logget ind", auth_signed_out: "Logget ud — ny gæstesession",
    auth_linked_ok: "Konto linket — fremskridt bevaret", auth_signed_in_existing: "Eksisterende konto indlæst",
    auth_enter_email: "Indtast email", auth_email_prompt: "Ejer-email", auth_password_prompt: "Adgangskode",
    auth_conflict_title: "Konto findes allerede",
    auth_conflict_body: "{email} har allerede et save. Log ind for at hente det (gæst på denne enhed forbliver separat) eller forbliv gæst?",
    auth_conflict_use: "Log ind på den konto", auth_conflict_keep: "Forbliv gæst",
    auth_err_popup: "Popup blokeret — tillad popups for sitet eller bruges redirect",
    auth_err_cancelled: "Login annulleret", auth_err_email_used: "Email er i brug",
    auth_err_account_exists: "Konto findes allerede", auth_err_wrong_password: "Forkert adgangskode",
    auth_err_no_user: "Bruger ikke fundet", auth_err_weak_password: "Adgangskode for svag (min 6)",
    auth_err_invalid_email: "Ugyldig email", auth_err_providers_disabled: "Provider ikke aktiveret i Firebase",
    auth_err_email_unavailable: "Email-login er midlertidigt utilgængelig. Brug Log ind med Google.",
    auth_err_unsupported_env: "Popup-login er ikke tilgængelig her — prøver omdirigering…",
    auth_err_network: "Netværksfejl — tjek forbindelsen og prøv igen",
    auth_err_too_many_requests: "For mange forsøg — vent og prøv igen",
    auth_err_user_disabled: "Kontoen er deaktiveret",
    auth_err_invalid_credential: "Ugyldige loginoplysninger",
    auth_err_requires_recent_login: "Log ind igen og prøv",
    auth_err_generic: "Login-fejl", auth_redirect_try: "Omdirigerer til login…",
    owner_loading: "Indlæser…", owner_denied: "Ingen adgang", owner_sign_in_prompt: "Log ind som ejer",
    owner_welcome: "Ejer:", owner_version: "Spilversion", owner_player_count: "Spillere i databasen",
    owner_recent: "Nyligt aktive", owner_tester_link: "Testbuild (?test=1)",
    owner_rules_hint: "Kan ikke læse players — publicer rules",
    owner_admin_claim_hint: "Admin custom claim påkrævet. Kør scripts/set-admin-claim.mjs lokalt",
    subscribe_account_link: "Log ind på konto",
    voice_mute: "Sluk stemmer", voice_unmute: "Stemmer på", char_change_btn: "Skift helt",
    audio_settings_title: "Lyd", audio_settings_btn: "Lyd", audio_music: "Musik", audio_speech: "Tale", audio_sfx: "Effekter",
    audio_mute_all: "Sluk lyd", audio_unmute_all: "Lyd til",
    audio_temp_voice: "Midlertidig computerstemme", audio_temp_voice_hint: "Slået fra som standard. Browser-tale når der ikke er optagelse.",
    audio_voice_recorded: "stemme: optaget", audio_voice_synth: "stemme: kun browser", audio_voice_none: "stemme: ikke tilgængelig endnu",
    spell_neon_flash: "Neon-burst", spell_graffiti: "Graffiti-skærm", spell_shadow: "Skygge-spring", spell_spark: "Kæde-gnist",
    prog_talk_razor: "Tal med Razor", prog_win_fight: "Vind en kamp", prog_parkour_win: "Klare parkour", prog_built: "Byg",
    howto_title: "Sådan spiller du", howto_goal: "Mål: fuldfør onboarding og udforsk bandens nat.", howto_gotit: "Forstået",
    howto_body_desktop: "WASD / pile — gå\nShift — løb\nMellemrum — hop\nE — tal / interager\nHøjreklik+træk — kamera\nKlik gulv — gå",
    howto_body_touch: "Venstre joystick — gå (langt = løb)\nE-knap — interager\nSwipe til højre — kamera",
    hint_talk_npc: "E — tal", hint_portal: "Gå ind i neonringen for at rejse", hint_portal_named: "Portal: {dest}",
    onboard_title: "Træning", onboard_step_done: "Trin klaret!", onboard_all_done: "Træning færdig!",
    onboard_move_title: "Trin 1: Kig rundt", onboard_move_text: "Gå rundt i værelset (WASD eller joystick).",
    onboard_go_street_title: "Trin 2: Gade", onboard_go_street_text: "Fra hjem, brug Gade-portalen.",
    onboard_talk_razor_title: "Trin 3: Razor", onboard_talk_razor_text: "På gaden, find Razor og tryk E.",
    onboard_visit_cemetery_title: "Trin 4: Kirkegård", onboard_visit_cemetery_text: "Fra gaden, gå til kirkegården.",
    onboard_win_fight_title: "Trin 5: Duel", onboard_win_fight_text: "Vind en kæde-duel mod en NPC.",
    onboard_shop_buy_title: "Trin 6: Butik", onboard_shop_buy_text: "Køb noget i butikken (Shop).",
    dodge: "Undvig", fight_dodge: "Undveget! Skjold +14",
    interact_sit: "Hygger på sofaen…", interact_snack: "Snack fra køleskabet (+energi)", interact_arcade: "Arkade: +12 mønter",
    interact_tv: "TV skifter kanal…",
    job_cemetery_night: "Nattevagt på kirkegården", job_cemetery_night_desc: "Lys, blade, spøgelser — 28 sek",
    job_cemetery_start: "Vagt startet!", job_cemetery_tick: "Opgave…", job_cemetery_done: "Vagt slut:",
    job_go_cemetery: "Gå til kirkegården først", job_pizza: "Pizza-levering", job_pizza_desc: "By — hent og lever",
    job_pizza_done: "Pizza leveret! +35 mønter", job_go_city: "Gå til byen først",
    daily_walk_street: "Gå på gaden", daily_pet_dog: "Klapp hunden", daily_win_duel: "Vind en duel",
    daily_complete: "Daglig opgave:", decor_room_only: "Dekor kun i værelset", decor_mode_on: "Dekor-tilstand",
    decor_mode_off: "Dekor fra", decor_placed: "Møbel placeret", decor_limit: "Møbelgrænse (12)",
    dog_fetch: "Hunden hentede bolden!", need_dog: "Køb hunden i butikken",
    shop_hat_spike: "Pigget hat",
    daily_title: "Daglige", level_up: "Nyt level!", level_unlock: "Butiks-unlock",
    fight_block: "Blok", interact_jukebox: "Jukebox-nummer",
    job_cemetery_hud: "Nattevagt", job_candles: "lys", job_ghosts: "spøgelser"
  }
};

const QUEST_I18N = {
  intro: {
    ru: { title: "Ночь начинается", text: "Поговори с Рейзором и выиграй цепную дуэль." },
    en: { title: "Night begins", text: "Talk to Razor and win a chain duel." },
    da: { title: "Natten starter", text: "Tal med Razor og vind en kæde-duel." }
  },
  build_crypts: {
    ru: { title: "Три склепа", text: "Поставь 3 объекта в городе." },
    en: { title: "Three crypts", text: "Place 3 builds in the city." },
    da: { title: "Tre krypta", text: "Placer 3 bygninger i byen." }
  },
  chain_duel: {
    ru: { title: "Цепной вызов", text: "Победи соперника в цепной драке (NPC на улице)." },
    en: { title: "Chain challenge", text: "Beat a rival in a chain fight on the street." },
    da: { title: "Kæde-udfordring", text: "Slå en rival i kæde-kamp på gaden." }
  },
  parkour_rep: {
    ru: { title: "Прыжок репутации", text: "Пройди крышный паркур без падения." },
    en: { title: "Rep jump", text: "Clear the rooftop parkour without falling." },
    da: { title: "Respekt-spring", text: "Klare tag-parkour uden at falde." }
  }
};

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

const LOC_TITLES = {
  room: { ru: "Комната панка", en: "Punk room", da: "Punk-værelse" },
  kitchen: { ru: "Кухня", en: "Kitchen", da: "Køkken" },
  toilet: { ru: "Туалет", en: "Toilet", da: "Toilet" },
  elevator: { ru: "Лифт", en: "Elevator", da: "Elevator" },
  roof: { ru: "Крыша", en: "Rooftop", da: "Tag" },
  street: { ru: "Улица банды", en: "Gang street", da: "Bandegade" },
  cemetery: { ru: "Кладбище банды", en: "Gang cemetery", da: "Bandekirkegård" },
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

function tShop(id) {
  return t("shop_" + id) || id;
}

function tSpell(spellId) {
  return t("spell_" + spellId) || spellId;
}

function tNpcName(npcId) {
  return t("npc_" + npcId) || npcId;
}

function questTitle(qid) {
  const v = tQuestField(qid, "title");
  return v || (QUEST_FALLBACK[qid]?.title) || qid;
}

function tProg(key) {
  return t("prog_" + key) || key;
}

function questText(qid) {
  const v = tQuestField(qid, "text");
  return v || (QUEST_FALLBACK[qid]?.text) || "";
}

const QUEST_FALLBACK = {
  intro: { title: "Night begins", text: "Talk to Razor on the street and win a chain duel." },
  chain_duel: { title: "Chain challenge", text: "Win a chain fight." },
  parkour_rep: { title: "Rep jump", text: "Clear parkour." },
  build_crypts: { title: "Three crypts", text: "Place 3 builds." }
};

function tQuestField(qid, field) {
  const q = QUEST_I18N[qid];
  if (!q) return "";
  const l = q[currentLang] || q.en;
  return l[field] || "";
}

function npcLinesI18n(npcId) {
  const n = NPC_I18N[npcId];
  if (!n) return [];
  return n[currentLang] || n.en || n.ru;
}

function doorT(key) {
  return t(key) || key;
}

function applyI18nDom() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const k = el.getAttribute("data-i18n");
    if (k) el.textContent = t(k);
  });
  document.querySelectorAll("[data-i18n-ph]").forEach(el => {
    el.placeholder = t(el.getAttribute("data-i18n-ph"));
  });
  const side = document.querySelector(".players-drawer-title");
  if (side) side.textContent = t("onlineSide");
  document.querySelectorAll(".tab[data-tab]").forEach(tab => {
    const k = "tab_" + tab.dataset.tab;
    if (I18N[currentLang][k]) tab.textContent = t(k);
  });
  const jt = document.getElementById("jobModalTitle");
  if (jt) jt.textContent = t("jobTitle");
  const jd = document.getElementById("jobModalDesc");
  if (jd) jd.textContent = t("jobDesc");
}

window.t = t;
window.locTitle = locTitle;
window.setLanguage = setLanguage;
window.initLanguage = initLanguage;
window.getLanguage = () => currentLang;
window.applyI18nDom = applyI18nDom;
window.tShop = tShop;
window.tQuestField = tQuestField;
window.npcLinesI18n = npcLinesI18n;
window.doorT = doorT;
window.tSpell = tSpell;
window.tNpcName = tNpcName;
window.questTitle = questTitle;
window.questText = questText;
window.tProg = tProg;
