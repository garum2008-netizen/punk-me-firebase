# Голоса Piper — кандидаты для утверждения Инной

**Важно:** лицензии датасета (MIT voices) **недостаточны** — нужно подтвердить **условия использования конкретной модели и движка Piper** для коммерческого веб-релиза.

## Кандидаты (из аудита, без NC / без ru_RU-irina)

| Роль | RU | EN | DA |
|------|----|----|-----|
| Narrator / жен. | `ru_RU-denis-medium` | `en_US-ljspeech-medium` | `da_DK-talesyntese-medium` |
| Муж. (Razor, Tony) | `ru_RU-dmitri-medium` | `en_GB-cori-medium` | `da_DK-talesyntese-medium` |

**Сняты с рассмотрения:** `ru_RU-irina`, любые NC-голоса.

## Образцы

Сгенерировать локально (после `npm run generate:voice-audit-samples`):

- `qa/voice-audit/samples/*.ogg` — одна фраза на модель.

До утверждения Инной **не** перегенерировать весь пакет в preview.
