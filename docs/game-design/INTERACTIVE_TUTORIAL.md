# PUNK ME — интерактивное обучение

Цель: каждый шаг **проверяет реальное действие игрока** (событие в коде), а не только показ текста.

## Текущая реализация (v22r3)

| Шаг | ID | Проверка | Награда | Статус |
|-----|-----|----------|---------|--------|
| 1 | `move` | `onboarding.progress.moved` после ходьбы в комнате | +20 монет, +15 XP | IMPLEMENTED |
| 2 | `go_street` | `visit_street` — портал на улицу | +30, +20 | IMPLEMENTED |
| 3 | `talk_razor` | `talk_razor` — диалог с NPC | +40, +25 | IMPLEMENTED |
| 4 | `visit_cemetery` | `visit_cemetery` | +50, +30 | IMPLEMENTED |
| 5 | `win_fight` | `win_fight` — победа в дуэли | +80, +45 | IMPLEMENTED |
| 6 | `shop_buy` | `shop_buy` — покупка в лавке | +25, +35 | IMPLEMENTED |

Модуль: `js/onboarding.js`. Маяк: `World3D.setGuideTarget` / `syncGuideTarget`.

Панель «Как играть» (все клавиши): `js/how-to-play.mjs` + i18n `howto_body_desktop` / `howto_body_touch`.

---

## Целевое покрытие управления (ТЗ + гайд v21)

Каждая строка — отдельный микро-шаг или проверка в туториале гл.0.

| Элемент | Desktop | Mobile | Событие верификации | Статус |
|---------|---------|--------|---------------------|--------|
| Ходьба | WASD / стрелки | Джойстик слева | `player moved` / дистанция &gt; N | IMPLEMENTED (шаг 1) |
| Бег | Shift удержание | Джойстик дальше от центра | `controls.shift` или speed &gt; walk | IMPLEMENTED в `controls-3d.mjs`; **нет отдельного шага онбординга** |
| Прыжок | Пробел | TBD кнопка | `jump` event | IN PROGRESS — клавиша есть; шаг туториала **PLANNED** |
| Действие / диалог | E | Кнопка E | `interact` / диалог открыт | IMPLEMENTED (шаг 3) |
| Камера | ПКМ + мышь | Свайп справа | yaw/pitch change | PLANNED отдельный шаг |
| Клик по полу | ЛКМ | тап | `click-to-move` | IMPLEMENTED в 3D |
| NPC | подойти + E | + кнопка E | `bump('talk_razor')` | IMPLEMENTED |
| Портал | войти в кольцо | то же | смена `me.location` | IMPLEMENTED (шаг 2, 4) |
| Квест | панель `#questBox` | свёрнутый список на mobile | `renderQuest` / story objective | IN PROGRESS |
| Маяк | луч / стрелка | то же | `setGuideTarget` | IMPLEMENTED |

---

## Тексты шагов (RU / EN / DA)

Пример шага 1 (из i18n):

- **RU:** «Шаг 1: Осмотрись» — «Пройдись по комнате (WASD или джойстик).»  
- **EN:** “Step 1: Look around” — “Walk around your room (WASD or joystick).”  
- **DA:** “Trin 1: Kig rundt” — “Gå rundt i værelset (WASD eller joystick).”

Остальные ключи: `onboard_<id>_title`, `onboard_<id>_text` в `js/i18n.js`.

---

## Связь с Authority path

После `onboarding.done` вызывается `StoryEngine.onOnboardingComplete()` → старт **этапа 1 «Насмешки»** ([STORY_STORYBOARD.md](./STORY_STORYBOARD.md)).

---

## Расхождение с ТЗ гл.0

ТЗ: 6 шагов «комната, кухня, щенок, лифт, улица, Рейзор».  
Код v22: комната → улица → Рейзор → кладбище → дуэль → лавка.

**TBD — needs owner input:** заменить онбординг на ТЗ-цепочку или оставить ускоренный путь.

---

## Приёмка

См. [ACCEPTANCE_CHECKLIST.md](./ACCEPTANCE_CHECKLIST.md) — пункты «игрок понимает управление», «первый квест», «мобильный джойстик».
