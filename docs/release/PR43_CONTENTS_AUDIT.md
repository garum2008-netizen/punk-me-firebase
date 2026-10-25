# PR #43 — аудит состава (`cursor/scenario-preview-d81d` vs `main`)

- **Base:** `450d6da80d805b9ea57319ae26ff1db570bcc285` (origin/main)
- **Head:** `5bdf2f22aa43aa4452a1e838200e1419cf201806` (HEAD)
- **Файлов в diff:** 644
- **Суммарный размер (working tree):** 385.36 MiB
- **Security hotfix (отдельно):** PR [#45](https://github.com/garum2008-netizen/punk-me-firebase/pull/45) от `main`, не из этого PR.

| Группа | Файлов | Размер |
|--------|--------|--------|
| Игровой код (js, index, css) | 52 | 649.1 KiB |
| Данные сюжета / конфиги | 6 | 62.3 KiB |
| Аудио / voice / лицензии | 2 | 3.4 KiB |
| Firebase RTDB rules | 1 | 6.5 KiB |
| Cloud Functions | 2 | 2.7 KiB |
| Документация release | 16 | 87.6 KiB |
| Скрипты CI, capture, тесты | 37 | 164.4 KiB |
| QA: скрины, видео, piper, capture | 219 | 361.66 MiB |
| Прочее | 309 | 22.75 MiB |

## Исключить из production deploy (`firebase.json` hosting.ignore)
- `qa/**`
- `artifacts/**`
- `walkthrough/**`
- `tools/piper.tgz`
- `**/*.mp4`
- `**/*.webm`
- `scripts/recordings/**`
- `node_modules/**`

QA-артефакты в diff: **361.66 MiB** — вынести в ветку артефактов или не мержить в релиз.

## Секреты / PII в diff
- Ключи/service-account: не обнаружено по расширениям.
- Email в тексте diff: `punktest+1792953969532@contractbot.dk`, `support@contractbot.dk` (тестовые контакты, не UID игроков).
- Полные UID: не публикуются; инвентаризация — `npm run list:test-artifacts` (владелец, read-only).

Пересобрать: `node scripts/generate-pr43-contents-audit.mjs`