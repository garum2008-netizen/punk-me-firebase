# KNOWN_BUGS — контекст записи

**Commit:** `72bdf35d6252e4f04302ae4d3b23cee40f975103`

| ID | Область | Статус в записи |
| --- | --- | --- |
| RTDB-presence | `permission_denied` на `/presence/room/{uid}` на проде | Не блокирует соло-съёмку; онлайн-счётчик может молчать |
| RTDB-publicProfiles | deny на запись профиля на проде | Вне кадра для Angelina long |
| Cemetery-fail | Слабая попытка dig обрывается через `endAllActivities` | Ожидаемо без награды |
| Duel-defeat | Экран «Поражение… отдыхай / Попробуй снова» | Показан намеренно (1-й раунд) |
| Audio-capture | Playwright MediaRecorder ingest (0 segments) | `music.wav` / `sfx.wav` собраны из licensed assets по таймлайну (`scripts/build-angelina-stems.js`); **не** bus-capture сессии. Пересъёмка с `__contentStopAudioCapture` + 22s drain — TODO |
| Cemetery-fail-coins | Слабая попытка dig дала +монеты | Зафиксировано в таймкоде `cemetery_fail_end` |


