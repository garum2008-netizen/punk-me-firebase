# Политика: никаких записей в production RTDB из тестов

## Клиент (браузер)

- `?dev=1` / `localStorage.punkme_dev` **не дают 9999 монет** на production-хосте (GitHub Pages с `main`, e.g. `halloween.punk.*`).
- `saveMe()` **не вызывается**, если на production включены флаги `dev` / `qa` / `punkme_dev` / `punkme_qa`.
- Эмулятор: `?firebaseEmulator=1` на localhost.

## Скрипты (Playwright, capture, test:*)

- Обязательно: `FIREBASE_EMULATOR=1` и `PUNK_BASE=http://127.0.0.1:…` (см. `scripts/lib/guard-no-prod-firebase.js`).
- `PUNK_ALLOW_PROD_TESTS` **не используется** (всегда блок).
- Скрипты `capture-live.js`, `verify-live-playable.js` — только read-only обход live UI; **не** открывать с `?dev=1` на prod.

## Запись видео / episode1

- Только локальный статик + эмулятор Auth/RTDB.
- Не деплоить и не гонять `record-episode1*` против `halloween.punk.contractbot.dk`.
