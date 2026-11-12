# Импорт в Experience владельца

1. Собрать: `cd roblox && ./scripts/check.sh`.
2. Studio владельца → **File → Open** → `build/PunkMeAngel_Ep1.rbxlx` **или** Rojo sync из `roblox/`.
3. **File → Publish to Roblox** → выбрать **группу/аккаунт Инны** (не личный аккаунт разработчика).
4. Сохранить **Place ID** и **Universe ID** в безопасном месте (не в публичном репо).
5. Включить API Services для DataStore (тест в приватном experience).
6. Developer Products: **не создавать боевые** до отдельного разрешения; тест — id `0` в `DevProducts.lua`.

См. `PUBLISH_SAFE.md`.
