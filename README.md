# PUNK ME

Оригинальная браузерная мультиплеерная игра: подростковая панк-банда, неоновая ночь, цепи, магия, стройка кварталов и работа на кладбище у Вены.

**Игра:** [halloween.punk.contractbot.dk](https://halloween.punk.contractbot.dk)

## Стек

- Статика: `index.html`, `css/game.css`, `js/game.js`
- Firebase: Anonymous Auth + Realtime Database (`punk-me-40605`)
- Деплой сайта: GitHub Pages (ветка `main`, файл `CNAME`)

## Локальный запуск

```bash
npm start
# открыть http://localhost:3456
```

```bash
npm test
npm run lint
```

## Правила базы данных

После изменения `database.rules.json`:

```bash
npx firebase-tools deploy --only database --project punk-me-40605
```

(Нужен логин Firebase CLI с правами на проект.)

## Управление

- **Клик** по сцене — движение; **WASD** — шаги
- **Двери** (подсвеченные зоны) — переход между локациями
- Нижняя панель — банда, лавка, магия, работа (на кладбище), стройка (в городе), драка, паркур

Подробнее: [docs/ROADMAP.md](docs/ROADMAP.md)
