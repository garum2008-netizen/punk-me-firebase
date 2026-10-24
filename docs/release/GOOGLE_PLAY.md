# PUNK ME — публикация в Google Play

**Версия:** living3d-v22r5.

## Рекомендуемый путь: TWA (Trusted Web Activity)

1. **PWA** на production-домене с `manifest.webmanifest` + `sw.js` (уже в репозитории v22r5).
2. **Bubblewrap** (`@bubblewrap/cli`) или **PWABuilder** → Android проект с TWA.
3. **Digital Asset Links** (`assetlinks.json` на `https://<domain>/.well-known/assetlinks.json`) — связывает домен и package name.

Альтернатива: **Capacitor Android** — тот же код, что для iOS, WebView + Play Billing.

---

## OWNER ACTION

| Шаг | Действие |
|-----|----------|
| Google Play Console | Регистрация **25 USD** (разово), аккаунт разработчика (**Inna / ContractBot**) |
| Package name | Напр. `dk.contractbot.punkme` |
| Play App Signing | Включить managed signing |
| Merchant account | Для подписок и IAP |
| Data safety form | Заполнить по Firebase/чату (**OWNER ACTION**) |

---

## Play Billing

- Подписка **4,99 €/мес** — product ID в Play Console, синхронизация с backend entitlement.
- **Не использовать** внешнюю оплату для цифровых подписок внутри Android app (политика Google Play).
- Тексты 13+ и parental consent на сайте — без изменений; в приложении — возрастной gate при покупках.

---

## Контентный рейтинг

IARC questionnaire → ожидаемый **PEGI 12 / Teen** (cartoon violence, no real money gambling in current build).

---

## Скриншоты Play

- Телефон: минимум 2, рекомендуется 1080 × 1920 (или 16:9).
- 7" / 10" tablet — опционально.
- Feature graphic: 1024 × 500.

---

## Чеклист перед загрузкой AAB

- [ ] `targetSdk` актуальный (требования Play обновляются ежегодно).
- [ ] Privacy policy URL (`privacy.html` на production).
- [ ] Тест internal / closed track.
- [ ] Проверка TWA: Chrome «Add to Home screen» = тот же manifest, что в Bubblewrap.

См. также `RELEASE_CHECKLIST.md`, `INSTALL_GUIDE.md`.
