# PUNK ME — чеклист релиза (web + PWA + сторы)

Версия: **living3d-v22r5**.

## Перед выкладкой на production

- [ ] `GAME_VERSION` и `sw.js` `CACHE_VERSION` совпадают.
- [ ] `index.html` query `?v=` = `GAME_VERSION`.
- [ ] `node scripts/smoke-check.js`
- [ ] `node scripts/audit-v22r4-game.js` — без критичных **broken**.
- [ ] `node scripts/capture-v22r5-pwa.js` + Lighthouse PWA JSON в `qa/v22r5-pwa/`.
- [ ] `docs/audit/AUDIT_v22r4.md` обновлён.
- [ ] Firebase rules / hosting deploy (**OWNER ACTION** — не из этого PR).

## Тестирование

- [ ] `docs/release/TESTING.md` — пройден чеклист тестером.
- [ ] `?test=1` / `beta.html` только на staging или с пониманием публичного доступа.

## Монетизация (без изменения текстов 13+ / 4,99 € / consent)

- [ ] `subscribe.html` — кнопка disabled до реальной оплаты.
- [ ] Terms + Privacy актуальны (**OWNER ACTION** юрист).
- [ ] Платёжный провайдер + entitlement (**OWNER ACTION**).

## Apple / Google

- [ ] `docs/release/APP_STORE.md` — bundle id, скрины, IAP (**OWNER ACTION** $99/год Apple, $25 Google).
- [ ] `docs/release/GOOGLE_PLAY.md` — TWA asset links, Play Billing.
- [ ] Не публиковать «пустую» web-wrapper без IAP при включённой подписке в app.

## После релиза

- [ ] Мониторинг Firebase usage, ошибок SW update.
- [ ] Buffer / YouTube анонс (**вне репо**).
