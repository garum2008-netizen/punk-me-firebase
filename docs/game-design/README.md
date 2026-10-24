# PUNK ME — пакет геймдизайна (living3d-v22r3)

Навигация по спецификациям игры **PUNK ME** (оригинальная браузерная 3D life-sim, 13+, RU/EN/DA).  
Источник правды по контенту локаций и экономике: [PUNK_ME_TZ_locations.md](../PUNK_ME_TZ_locations.md).  
Сайт: [halloween.punk.contractbot.dk](https://halloween.punk.contractbot.dk) · ветка `main` = **living3d-v22r3**.

## Документы

| Документ | Назначение |
|----------|------------|
| [PUNK_ME_MASTER_TZ.md](./PUNK_ME_MASTER_TZ.md) | Концепция, цикл, главы, системы, архитектура |
| [STORY_STORYBOARD.md](./STORY_STORYBOARD.md) | Пошаговый сюжет, диалоги, триггеры, награды |
| [CINEMATIC_INTRO.md](./CINEMATIC_INTRO.md) | Кинематографическое интро ~85 с + быстрая версия 20 с |
| [VOICEOVER_AND_SUBTITLES.md](./VOICEOVER_AND_SUBTITLES.md) | Озвучка, субтитры RU/EN/DA, без дешёвого TTS |
| [INTERACTIVE_TUTORIAL.md](./INTERACTIVE_TUTORIAL.md) | Интерактивное обучение управлению и UI |
| [QUESTS_AND_GAMEPLAY.md](./QUESTS_AND_GAMEPLAY.md) | Квесты, NPC, работы, ветвления |
| [UI_UX_REQUIREMENTS.md](./UI_UX_REQUIREMENTS.md) | HUD, карта, инвентарь, мобильный UI |
| [GAME_ECONOMY.md](./GAME_ECONOMY.md) | Монеты, цены, баланс (согласно ТЗ §1) |
| [MONETIZATION_PLAN.md](./MONETIZATION_PLAN.md) | Подписка 4,99 €/мес, косметика, без pay-to-win |
| [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) | Версии v22–v28 |
| [ACCEPTANCE_CHECKLIST.md](./ACCEPTANCE_CHECKLIST.md) | Чеклист приёмки релизов |

См. также: [CHARACTERS.md](../CHARACTERS.md), [ROADMAP.md](../ROADMAP.md), [VOICE.md](../VOICE.md) (историческая заметка; актуальное поведение — в VOICEOVER_AND_SUBTITLES.md и `js/voice.js`).

## Статус функций (проверено по коду `main` @ living3d-v22r3)

Обозначения: **IMPLEMENTED** — есть в репозитории и работает в сборке; **IN PROGRESS** — частично; **PLANNED** — только в ТЗ/доках.

| Функция | Статус | Примечание |
|---------|--------|------------|
| Выбор героя (Vienna, Razor, Cobalt, Mohawk) | IMPLEMENTED | `js/char-select.mjs` |
| 10 локаций 3D (комната…паркур) | IMPLEMENTED | `js/world/locations.mjs` |
| Локации Склеп, Замок, Дом зомби (ТЗ §3) | PLANNED | В гайде v21 отмечены как «ещё не сделаны» |
| Онбординг «Новенький» (6 шагов) | IMPLEMENTED | `js/onboarding.js` (отличается от идеала ТЗ гл.0: нет отдельных шагов кухня/щенок/лифт) |
| Панель «Как играть» RU/EN/DA | IMPLEMENTED | `js/how-to-play.mjs`, `js/i18n.js` |
| Управление WASD/Shift/Space/E, мобильный джойстик | IMPLEMENTED | `js/controls-3d.mjs`, i18n `howto_body_*` |
| Путь «Авторитет» (4 этапа + ранги) | IMPLEMENTED | `js/story/authority.mjs`, `data/story/authority-path.json` |
| Выбор анти-буллинга (глава 2) | IMPLEMENTED | `authority-path.json` → `chapter2_antibullying` |
| Story Engine: квесты, диалоги, маяки | IN PROGRESS | `js/story/story-engine.mjs`, `data/story/quests.json`; гл.1 «Прописка» — три пути + earn guidance (PR stage 1) |
| Работы: флаеры, посуда, подсобник | IN PROGRESS | `jobs.json` + `play-features-v21.mjs` (смены на Улице/Кухне/Стройке) |
| Доставка пиццы, смена на кладбище | IMPLEMENTED | `js/game.js`, `js/play-features-v21.mjs` |
| Металлолом (Крыша/паркур) | PLANNED | ТЗ §1.3 |
| Цепная дуэль с NPC | IMPLEMENTED | `js/game.js`, QA v22r3 |
| Стройка: склепы/неон в городе | IMPLEMENTED | `js/game.js` |
| Тусовка банды 4 этапа | IN PROGRESS | Данные `construction-hangout.json`; полный UX по ТЗ — доработка |
| Энергия / Настроение (ТЗ §1.2) | IN PROGRESS | Поля в `story`; не все подсказки и штрафы |
| Субтитры + голос (без Web Speech TTS) | IMPLEMENTED | `js/voice.js` (по умолчанию mute; клипы `assets/audio/voice/` — каталог пуст) |
| Кинематографическое интро 85 с | PLANNED | Спека: [CINEMATIC_INTRO.md](./CINEMATIC_INTRO.md) |
| Главы 3–4 (кладбище/склеп/замок/3 концовки) | PLANNED | Сюжет в ТЗ; локации не в 3D |
| Монетизация: subscribe.html, оплата | IN PROGRESS | Страница и тексты есть; кнопка «Скоро — оплата ещё не подключена» |
| Firebase сохранение, presence, чат | IMPLEMENTED | `js/game.js`, RTDB |
| QA authority + HUD mobile v22r3 | IMPLEMENTED | `qa/v22r3/QA_REPORT.md` |

## Проверка ссылок

```bash
node docs/game-design/check-links.mjs
```
