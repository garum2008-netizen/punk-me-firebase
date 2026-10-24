# PUNK ME — квесты и геймплей

## Quest Manager

**Реализация:** `js/story/story-engine.mjs` + `data/story/quests.json`.

| Возможность | Описание | Статус |
|-------------|----------|--------|
| Главы | Поле `chapter` в квестах | IN PROGRESS (1–2 в данных) |
| Шаги | `steps[]` с `objective` RU/EN/DA | IMPLEMENTED |
| Маяк | `beacon`: npc id или объект | IMPLEMENTED |
| Завершение шага | `complete_on`: `coins>=N`, `event:*` | IMPLEMENTED |
| Награды | `rewards`: xp, rel, flag, items | IN PROGRESS |
| Панель цели | Одна активная цель, подцели «заработай N» | IN PROGRESS (ТЗ §1.5) |

Примеры квестов гл.1: `q_initiation_pay`, `q_initiation_duel`, `q_initiation_graffiti` — взнос 150 монет **или** дуэль + теги.

---

## Dialogue Manager

**Данные:** `data/story/dialogues.json`.

| Возможность | Статус |
|-------------|--------|
| Оклики `enter` / `proximity` | IMPLEMENTED (QA v22: enter callouts) |
| Ветвления `choices[]` | IMPLEMENTED |
| Связь с Authority | IMPLEMENTED (`authority-path.json`) |
| Пузырь + субтитры | IMPLEMENTED |
| Кулдаун 90 с, приоритет сюжет &gt; работа | PLANNED полностью по ТЗ |

---

## NPC

| NPC | Локации | Роль |
|-----|---------|------|
| Razor / Рейзор | Улица, NEON SHOP | Лидер, дуэль, посвящение |
| Tony / Тони | Город | Пицца |
| Vienna | Кладбище (герой или сюжет) | Работы, склепы |
| Cobalt, Mohawk | Улица | Authority этап 1, реакции ch2 |
| Gravedigger | Кладбище | Смены |
| Бабуля Зоя | Кухня | Еда, сюжет гл.4 (ТЗ) |
| Призрак Плюх | WC | Гл.1/3 (ТЗ) |
| Дядя Болт | Город | Материалы (ТЗ, hangout hints) |

Полный список по локациям: [PUNK_ME_TZ_locations.md](../PUNK_ME_TZ_locations.md) §3.

---

## Репутация и ранги

- **Репутация** (0 → Легенда района): `me.reputation`, квесты `type: rel`.  
- **Авторитет** 0–100 и **gang_rank**: `js/story/authority.mjs`.  
- **Отношения:** `story.rel.gang_rust`, `zombie`, граф — гл.4.

---

## Работы

| Работа | Локация | В коде | ТЗ §1.3 |
|--------|---------|--------|---------|
| Доставка пиццы | Город | IMPLEMENTED | 40–70 монет, 3 мин |
| Ночная смена кладбища | Кладбище | IMPLEMENTED | 60–90, 4 мин |
| Подсобник на стройке | Стройка | PLANNED | 45, +2 доски |
| Расклейка флаеров | Улица | IN PROGRESS (authority task) | 30, +5 реп. |
| Мойка посуды | Кухня | PLANNED | 25 + пирог |
| Металлолом | Крыша/паркур | PLANNED | материалы |
| Аркада | Комната | IN PROGRESS | до 100 мон/день |

Данные: `data/story/jobs.json`, хуки в `js/play-features-v21.mjs`.

---

## Мини-игры

- Аркада в комнате (рекорд Рейзора 500 очков — ТЗ).  
- Дуэль цепями (пошаговая, HP).  
- Стройка: мини-игры «помешай пирог», «почини кран» — ТЗ, **PLANNED**.

---

## Стройка

1. **Город:** размещение склепов/неона (`js/game.js`, квест `build_crypts`).  
2. **Тусовка:** 4 этапа `data/story/construction-hangout.json` на `construction`.  
3. **Склеп** (гл.3): отдельная локация — PLANNED.

Подсказка «Где взять?» — ТЗ §4, **IN PROGRESS**.

---

## Питомцы

Щенок в комнате; магазин «звери ночи»; призрачный питомец — награда гл.3 (PLANNED).

---

## Ветвления

- Authority stage 1: 4 реакции на насмешки.  
- Глава 2 antibullying: 2 исхода.  
- Пирог бабули: Рейзор / зомби / себе (ТЗ).  
- Три концовки гл.4 (ТЗ).  
- Плохих концовок нет — только разные награды.
