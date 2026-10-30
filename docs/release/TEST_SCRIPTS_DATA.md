# Что пишут тестовые скрипты (read-only справка для Инны)

**Политика:** `PROD_TEST_POLICY.md`. **Ничего не удалять** в prod без отдельного OK.

## `scripts/test-accounts-auth.js`

| Действие | Куда | Чужой uid? |
|----------|------|------------|
| Anonymous sign-in | Firebase Auth | нет |
| `players/{ownUid}` update (coins 4242) | RTDB | **только свой** uid |
| `publicProfiles/{ownUid}` set | RTDB | **только свой** |
| `presence/{loc}/{ownUid}` via `saveMe` / `pushPresence` | RTDB | **только свой** |
| Sign-out → новый anonymous uid | Auth | нет |
| `linkWithCredential(punktest+{timestamp}@contractbot.dk)` | Auth (привязка email к **текущему** uid) | нет |
| `/chat` push | только если игрок сам пишет в чат | свой uid |

Не пишет: `premium`, чужие `players/*`, admin claims.

## `scripts/capture-*.js`, `record-episode1*`, `verify-live-playable.js`

| Режим | Риск |
|-------|------|
| `?dev=1` на **live** (до guard в preview) | `players/{uid}` с **9999** монет, полный прогресс |
| `?solo=1` без dev | обычный гость 100 монет, полный `players` + presence + publicProfiles |
| `verify-live` | **только GET** страницы, без `saveMe` в скрипте |

После `b370d70+`: `guard-no-prod-firebase.js` блокирует prod URL; клиент блокирует dev-save на production host.

## Идентификация

- Точный email теста: `punktest+1792953969532@contractbot.dk` → `node scripts/list-test-artifacts.mjs --email=...` (ADC, read-only).
- Анонимы 25.10 18:00–20:00 UTC → `--anon-window=2026-10-25T18:00:00Z/2026-10-25T20:00:00Z`.
