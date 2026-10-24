# Аудит PUNK ME — living3d-v22r5 (после merge PR #11 + docs #10)

**Дата:** 2026-10-24 · **Метод:** headless Playwright (`scripts/audit-v22r4-game.js`), solo + test, локальный сервер.  
**Скриншоты:** `qa/audit-v22r4/` · **Сырые данные:** `qa/audit-v22r4/audit-results.json`

Сверка с геймдизайном: `docs/game-design/*` (мастер-ТЗ, квесты, монетизация, приёмка).

---

## 1. Игровая логика и сценарий

| Область | Статус | Комментарий | Доказательство |
|---------|--------|-------------|----------------|
| Онбординг «Новенький» (6 шагов) | **Работает** | `Onboarding.init`, цепочка шагов в `js/onboarding.js`; полный проход вручную не автоматизирован | — |
| Квесты / панель цели | **Работает** | Story state и objective panel; текст цели зависит от прогресса | `desktop-quest-panel.png` |
| Авторитет, этап 1 | **Работает** | authority=8, HUD обновляется | `desktop-authority-stage1.png` |
| Авторитет, этап 2 | **Работает** | authority=28 | `desktop-authority-stage2.png` |
| Авторитет, этап 4 | **Работает** | authority=92, триалы отмечены | `desktop-authority-stage4.png` |
| Глава 2, анти-буллинг | **Работает** | Диалог с ≥2 выборами после `maybeChapter2Bullying` | `desktop-chapter2-antibullying.png` |
| Работы / монеты | **Работает** | Кухня, пицца/кладбище в коде; тестовые монеты через `?test=1` | `mobile-kitchen-job.png` |
| Лавка | **Работает** | Модалка, карточки товаров | `desktop-shop-modal.png` |
| Стройка | **Работает** | Переход на construction + toggle build | `desktop-build-mode.png` |
| Дуэль | **Работает** | 3D HUD активен | `desktop-duel.png` |
| Сохранение / reload | **Частично** | После reload монеты могут отличаться от только что записанных (гонка Firebase / merge с default); персонаж и сцена восстанавливаются | `desktop-after-reload.png` |
| Мобильный клиент | **Частично** | Улица + HUD; тест-панель на узком viewport требует ручной проверки жестов | `mobile-street-test-hud.png` |

### Известные пробелы по ТЗ (не баги релиза v22r5)

- Главы 3–4, локации склеп/замок/дом зомби — **PLANNED** (`docs/game-design/README.md`).
- Кинематографическое интро 85 с — **PLANNED**.
- Часть работ ТЗ (флаеры, посуда и т.д.) — **PLANNED** / частично в данных.

### Исправления по аудиту (код)

- Повышен `z-index` нижней панели (`game-bottom-bar`), чтобы кнопки PWA не перекрывались canvas 3D.
- Исправлены таймауты `waitForFunction` в audit/capture-скриптах (Playwright API).

---

## 2. Монетизация и юридические страницы

| Элемент | Статус | Комментарий | Доказательство |
|---------|--------|-------------|----------------|
| `subscribe.html` | **Работает** | Цена **4,99 €/мес**, 13+, тексты RU/EN/DA **не менялись** | `subscribe-page.png` |
| Кнопка подписки | **Работает (заглушка)** | `disabled`, «оплата не подключена» — ожидаемо | см. subscribe |
| Terms / Privacy | **Работает** | Ссылки с subscribe открываются | `terms-page.png`, `privacy-page.png` |
| Реальная оплата | **Отсутствует** | Stripe / IAP / проверка подписки в игре — **PLANNED** |
| Родительское согласие в UI покупки | **Отсутствует** | Чекбокс EU на subscribe **disabled** до подключения оплаты |
| Мёртвые кнопки | **Нет** на subscribe (кроме намеренно disabled подписки) | «Играть» ведёт в index |

### Чего не хватает до коммерческого запуска

1. Платёжный провайдер и server-side верификация подписки (**OWNER ACTION**).
2. Apple/Google IAP при публикации в сторах (см. `docs/release/APP_STORE.md`, `GOOGLE_PLAY.md`).
3. Актуализация Terms/Privacy юристом (**OWNER ACTION**).
4. Включение EU consent + возрастных gate при реальных списаниях.

---

## 3. PWA, тест-режим, установка (v22r5)

| Функция | Статус | Артефакт |
|---------|--------|----------|
| Тест-панель `?test=1` / `beta.html` | **Работает** | `qa/v22r5-pwa/desktop-tester-panel.png` |
| Share + QR fallback | **Работает** | `qa/v22r5-pwa/desktop-share-dialog.png` |
| Install UI | **Частично** | Кнопка по `beforeinstallprompt`; в headless показ fallback | `qa/v22r5-pwa/desktop-install-prompt-ui.png` |
| Lighthouse PWA | см. `qa/v22r5-pwa/lighthouse-pwa.json` | `qa/v22r5-pwa/QA_REPORT.md` |

Подробнее для тестировщиков: `docs/release/TESTING.md`.
