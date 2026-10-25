# Отчёт для Инны (25.10.2025, 17:33+) — факты и предложения

Сборка: ветка `cursor/qa-media-content-d81d` (PR #39). **Код музыки/диалогов в этом отчёте не менялся** — только фиксация фактов и предложения.

---

## 1. Пакет из 6 роликов (структура)

| # | Папка | Сюжет / формат | Дуга в кадре |
|---|--------|----------------|--------------|
| 01 | `01-cemetery-job` | Сюжет: первая работа (dig) | доска работ → кладбище → мини-игра → рост монет |
| 02 | `02-crypt-decor` | Сюжет: склеп до/после | кладбище → декор → результат в 3D |
| 03 | `03-controls-desktop` | Управление ПК | how-to + WASD/E + журнал |
| 04 | `04-controls-mobile` | Управление touch | how-to + джойстик + Talk |
| 05 | `05-surprise-night` | Неожиданность | ночная смена / призраки (реальная механика) |
| 06 | `06-route-fork` | Развилка маршрута | три ветки у Razor → квест `q_initiation_pay` |

Запись: `npm run record:content` (ключи `01`, `01v`, `02`, `03`, `04`, `05`, `06`).  
Дуэль в этот набор **не входит** (по ТЗ — только если нужна отдельно и победа засчитывается).

Файлы на ролик (как раньше): `gameplay-*-silent.mp4`, `music.wav`, `sfx.wav`, `voice.wav` (речь/TTS-канал, если есть сигнал), `mix.wav` / `*-mix.mp4`, `clip.md`.

---

## 2. Музыка по локациям (факты)

Источник правды: [`docs/audio/LICENSES.md`](../../docs/audio/LICENSES.md), [`assets/audio/music-sources.json`](../../assets/audio/music-sources.json).  
Процедурные лупы **не** используются для BGM локаций — только файлы `music_<bucket>.ogg/.mp3`.

| Локация игры | Bucket BGM | Трек | Автор | Лицензия |
|--------------|------------|------|-------|----------|
| room, kitchen, toilet, elevator | `home` | Fast Song | Bart | **CC0** |
| street | `street` | Downtown Destruction | Matthew Steele | **CC-BY 3.0** |
| cemetery | `cemetery` | Hammer of the Berserker | Matthew Steele | **CC-BY 3.0** |
| city | `city` | Plutonian Thrash | Matthew Steele | **CC-BY 3.0** |
| roof, parkour | `roof` | Chick with Weapon | Matthew Steele | **CC-BY 3.0** |
| construction | `construction` | Last Spike | Matthew Steele | **CC-BY 3.0** |
| castle (если есть сцена) | `castle` | Headbangr | Bart | **CC0** |

SFX UI/геймплея: процедурные из `generate-audio-assets.mjs`, **CC0** (не BGM локаций).

### Обрывы при смене локаций

- В коде (`audio-manager.mjs`): кроссфейд **1.8 с** между треками при `setLocationMusic` (два слота A/B, overlap, без принудительной паузы).
- По полному прохождению `qa/pr-b-full/punk-me-ep-full-1080p.mp4` (≈20:37): `silencedetect` на **смешанной** дорожке показал длинную тишину только **в конце** (~40 с) — типичный хвост после геймплея, не серия обрывов на переходах room↔street↔cemetery.
- По stem `music.wav` клипа `07-duel` (короткий фрагмент): **нет** серий `silence_duration` >0.25 s на уровне −50 dB.
- **Риск:** при медленной загрузке `decodeUrl(music_*.ogg)` теоретически возможна задержка старта нового bucket (в консоли `music load failed`) — на принятой записи PR B это не проявилось как длинные «дыры».

### Озвучка и диалоги

| Вопрос | Факт в сборке |
|--------|----------------|
| Записанные файлы актёров | Каталог `assets/audio/voice/` **пуст** в репозитории; в LICENSES: «Cast recordings — pending». `manifest.json` для voice lines при отсутствии файлов не даёт `recorded`. |
| Субтитры | Да: `#storyDialog`, `.voice-subtitle`, `StoryEngine.setSubtitle`, подписи NPC в диалогах. |
| TTS | `AudioManager.playLine`: сначала файл `assets/audio/voice/<lang>/<id>.*`, при ошибке — **только если** включён `temporaryVoice` в настройках, иначе субтитр по таймеру без звука. Отдельный legacy `voice.js` — очередь клипов по hash, по умолчанию **mute**. |
| Диалоги **между** Razor, Cobalt, Mohawk, Ghost | В `data/story/dialogues.json` узлы **один спикер → игрок** (Razor, Cobalt, Mohawk, Gravedigger и т.д.). **Нет** сцен, где два NPC переговариваются друг с другом в одной цепочке. |
| Исключения / близко к «перепалке» | `authority-path.json`: Ирокез обращается **к игроку** (этап насмешек). `authority.mjs`: после событий главы 2 — **отдельные toast** от Razor и Cobalt (не общий диалог). Призрак как персонаж банды в диалогах **не** выделен; «призраки» на кладбище — геймплей ночной смены. |

---

## 3. Предложения (не внедрять без отдельного ТЗ)

### Музыка «тяжёлый панк + ангел», без обрывов

- Уже в игре: Steele pack (thrash/rock) + Bart CC0 — хорошая база «панк».
- Дополнительно с OGA (проверить длительность loop ≥60 s и нормализацию громкости при импорте):
  - **CC0:** [Headbangr](https://opengameart.org/content/headbangr) (Bart) — уже `castle`; [Fast Song](https://opengameart.org/content/fastsong) — `home`.
  - **CC-BY 3.0:** [Rock Music Pack](https://opengameart.org/content/rock-music-pack) (Matthew Steele) — уже 5 bucket’ов; в паке есть и более «мелодичные» треки для контраста «ангел» (например более чистый lead в другом bucket для `room`/`roof`).
- «Ангел» без смены лицензий: второй слой **только CC0** pad/choir one-shot на сторис-события (не location BGM), ducking уже есть на music bus.
- Технически против обрывов: держать кроссфейд ≥1.8 s, preload следующего bucket при открытии карты, не вызывать `stopMusic` без overlap (уже так).

### Короткие перепалки банды (канон, без смены наград/квестов)

Места, где можно **косметические** callout’ы (2–3 реплики подряд, разные `speaker`), не трогая `effects` квестов:

1. **Улица, после onboarding** — фоновый пинг-понг Mohawk ↔ Razor в `dlg_street_enter` (отдельный optional dialogue id, триггер `flag:intro_seen`, без `quest_start`).
2. **Крыша** — Cobalt комментирует, в кадре cutaway на Mohawk на паркуре (`dlg_roof_enter` + proximity callout).
3. **Construction** — Foreman/Vintik перебивают друг друга перед выдачей работы (только `toast` / bubble, награда через существующий `construction_helper`).
4. **Authority stage 1** — после выбора игрока одна реплика Razor **о** реакции Mohawk (текст в `npc_reactions`, уже есть заготовки в `authority.mjs` для гл.2 — расширить для stage 1).

Все варианты — **новые node в dialogues** или `showNpcProximityCallout`, без изменения `q_initiation_*` и баланса.

---

## 4. Тесты: что считать «пройдено» и статус (25.10.2025, агент)

В `package.json` **нет** скриптов `test:episode1` и `test:audio` — ниже эквиваленты и фактический прогон.

| Скрипт / смысл | Что проверяет | Chromium | WebKit | Статус сейчас |
|----------------|---------------|----------|--------|----------------|
| `npm test` (`smoke-check.js`) | Статика, ключевые файлы, локации в smoke | n/a | n/a | **PASS** |
| `npm run test:duel-onboarding` | Дуэль UI, `win_fight` / `hasPassedWinFight` | да (Playwright default) | не запускается | **PASS** |
| `npm run test:pr-b` | Build layer, music files, city plot API, decor, cemetery job; скриншоты | **PASS** | **PASS** | **PASS** (+ mobile chromium 390×844) |
| `npm run test:pr-a` | HUD, AudioManager API, качество UI | в скрипте | см. скрипт | **PASS** (отчёт `ok: true`) |
| Episode 1 full capture | `record-episode1-youtube.js` + `validateEpisode1Recording()` | ручной/CI | — | **Не автотест в package.json**; валидация: marks, duration, freezedetect при вызове finalize |
| Audio stems QA | Отдельного `test:audio` нет; `test:pr-b` проверяет наличие **разных** `music_*.ogg` и `music-sources.json` | косвенно | косвенно | **PASS** (musicOk в pr-b) |
| `npm run test:loading` / `test:accounts` / `test:rules` / `test:emulator` | Другие подсистемы | по скрипту | по скрипту | **Не запускались в этом отчёте** |

**Чтобы формально закрыть «episode1 + audio» как в чеклисте Инны:**

1. Добавить в CI (или ручной gate перед съёмкой): `node scripts/record-episode1-youtube.js` (или укороченный dry-run) + `validate-episode1-recording.js` на артефакте.
2. Добавить `test:audio` = проверка decode всех buckets + кроссфейд smoke (nav room→street→cemetery, уровень music bus не падает в −∞ дольше 0.3 s) — **сейчас такого скрипта нет**.
3. Дублировать `test:duel-onboarding` на WebKit (одна строка в тесте).

---

## 5. Статус съёмки 6 роликов

После обновления сценариев запустите:

```bash
npm run record:content
```

Старые папки (`07-duel`, `08-dog-shnurok`, …) — архив предыдущего пакета; актуальные темы — `01-cemetery-job` … `06-route-fork`.

Сводная таблица длительностей обновляется в `qa/content/REPORT.md` после прогона.
