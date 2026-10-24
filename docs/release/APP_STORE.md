# PUNK ME — путь в Apple App Store и Mac App Store

**Язык:** RU (списки RU/EN/DA для стора ниже). **Версия документа:** living3d-v22r5.

## Рекомендуемый технический путь

1. **Обёртка Capacitor** (или Cordova) вокруг текущего статического `index.html` + Firebase.
2. **WebView** грузит production URL (`https://halloween.punk.contractbot.dk`) или bundled `www/` (offline ограничен без полного asset pack).
3. **Нативные плагины:** In-App Purchase (StoreKit 2), push (опционально), deep links.

Альтернатива Mac: **Safari Web App** / PWA «Add to Dock» без стора (см. `INSTALL_GUIDE.md`) — без комиссии Apple, но без App Store discovery.

---

## OWNER ACTION — учётные записи и деньги

| Шаг | Действие |
|-----|----------|
| Apple Developer Program | **99 USD/год**, организация или физлицо (**Inna Kragh / ContractBot**) |
| Bundle ID | Зарезервировать, напр. `dk.contractbot.punkme` (**OWNER ACTION**) |
| App Store Connect | Создать приложение, возрастной рейтинг, контракты Paid Apps (**OWNER ACTION**) |
| Банковские / налоговые формы | W-8BEN, EU VAT (**OWNER ACTION**) |

---

## Возрастной рейтинг и контент

- Целевой рейтинг: **13+** (на сайте уже 13+; в Connect — опросник: mild cartoon violence, no gambling).
- Нет реальных денег в текущей web-сборке; при подписке 4,99 € — **In-App Purchase** обязателен для цифрового контента в iOS (Guideline 3.1.1).
- Внешние ссылки на оплату вне IAP для цифровых подписок внутри app — **риск отклонения** (3.1.1, 3.1.3).

---

## Privacy Nutrition Labels (App Store Connect)

Указать сбор данных по факту Firebase:

- **Идентификаторы:** anonymous Firebase UID, device id (если добавите analytics).
- **Данные использования:** presence, чат (если включён multiplayer).
- **Не продавать данные** — отметить согласно политике `privacy.html` (**уточнить юристом — OWNER ACTION**).

---

## In-App Purchase (подписка)

- Продукт: auto-renewable subscription, tier ~**4,99 €/мес** (локальные цены в Connect).
- **Apple комиссия** 15–30%; семейный доступ по желанию.
- Server-side: verify receipt / App Store Server API, синхронизация с Firebase entitlement (**разработка + OWNER ACTION**).
- Тексты 13+, parental consent на сайте **не менять** без решения владельца; в iOS добавить **Ask to Buy / возраст** при IAP для несовершеннолетних.

---

## Риски Review Guidelines

| Риск | Митигация |
|------|-----------|
| **4.2 Minimum Functionality** (простая web-обёртка) | Нативные IAP, push, haptics, offline cache, Game Center (опционально), чёткий onboarding |
| **2.3.10** точность метаданных | Скриншоты только из реальной сборки |
| **5.1.1** Privacy | Nutrition labels + ссылка на privacy в app |
| **3.1.1** Payments | Только IAP для подписки внутри iOS app |

---

## Скриншоты (типовые размеры, 2025–2026)

| Устройство | Размер (px) |
|------------|-------------|
| iPhone 6.7" | 1290 × 2796 |
| iPhone 6.5" | 1284 × 2778 |
| iPhone 5.5" | 1242 × 2208 |
| iPad Pro 12.9" | 2048 × 2732 |
| Mac (если Mac App Store) | 1280 × 800, 1440 × 900, 2560 × 1600, 2880 × 1800 |

Минимум 3–5 скринов: выбор героя, улица 3D, дуэль, квест/HUD, subscribe (без активной оплаты).

---

## Тексты листинга (черновик)

### RU

- **Название:** PUNK ME — неоновая ночь банды  
- **Подзаголовок:** 3D life-sim, квесты, дуэли, 13+  
- **Описание:** Оригинальная браузерная игра про панк-подростков: 10 локаций, путь «Авторитет», работы, стройка, мультиплеер. Бесплатно; опциональная подписка на косметику (когда подключена).

### EN

- **Name:** PUNK ME — Neon Gang Night  
- **Subtitle:** 3D life-sim, quests, duels, 13+  
- **Description:** Original teen punk gang night: 10 3D locations, Authority path, jobs, building, multiplayer. Free to play; optional cosmetic subscription when live.

### DA

- **Navn:** PUNK ME — Neon bandenat  
- **Undertitel:** 3D life-sim, quests, dueller, 13+  
- **Beskrivelse:** Original teen punk-band: 10 3D-lokationer, Authority-sti, jobs, byggeri, multiplayer. Gratis; valgfrit kosmetisk abonnement når det er live.

---

## Mac App Store

Тот же бинарь Capacitor «Designed for iPad» / Catalyst или отдельный macOS target. Требования Apple Silicon + notarization для распространения вне стора (**OWNER ACTION** для сертификатов Developer ID).
