# QA content clips — отчёт

Commit: см. `clip.md` в папках · Дата съёмки: 2026-10-25 · Ветка: `qa-media-content-d81d` (сборка PR #39 / `cursor/pr-b-build-d81d`)

| Клип | Длительность (видео) | Готово | Заблокировано / примечания |
| --- | --- | --- | --- |
| 01-first-job (RU) | ~0:49 | видео + `clip.md` | EN-версия: `gameplay-1080p-en-*` в той же папке |
| 01-first-job (EN) | ~0:59 | то же | — |
| 02-how-to-start | ~1:16 | да | — |
| 03-interact-talk (desktop) | ~1:03 | да | — |
| 03-interact-talk (1080×1920) | ~1:16 | да | `content-force-touch` для джойстика при ширине 1080 |
| 04-crypt | ~4:02 | да | до/после украшения склепа |
| 05-apartment | ~3:47 | да | каталог, поворот, цвет |
| 06-city-plot | ~1:33 | частично | **нет кнопки покупки в HUD** — только `purchaseCityPlot()`; постройка на улице видна |
| 07-duel | ~1:36 | да | гейт onboarding step=4 (как `test:duel-onboarding`); **победа засчитывается** |
| 08-dog-shnurok | ~3:44 | да | **Шнурок** = `pet_dog` («Панковый пёс»), покупка + комната |

## Файлы в каждой папке `qa/content/<тема>/`

- `gameplay-1080p-silent.mp4` (и при необходимости `gameplay-1080x1920-silent.mp4`, `gameplay-1080p-en-silent.mp4`)
- `music.wav`, `sfx.wav`, `mix.wav`, `gameplay-1080p-mix.mp4` — после `npm run record:content` (или `refinalize:content`, если уже есть `*-raw.webm`)
- `clip.md` — коммит, таймкоды, управление, баланс/квест, баги

Полный пересъём с дорожками: `npm run record:content` (идёт в фоне на агенте или локально).
