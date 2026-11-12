# Roblox release package (t105u §9)

**Не RELEASE READY** до выполнения P0 (`roblox/docs/TASK-INNA-2026-10-25-ROBLOX-P0.md`).

| Файл | Назначение |
|------|------------|
| `PunkMeAngel_Ep1.rbxlx` | Финальная сборка (копия из `build/` после `scripts/check.sh`) |
| `../` (корень `roblox/`) | Rojo-проект и исходники |
| `ASSETS.md` | Реестр ресурсов и Roblox Asset ID |
| `IMPORT.md` | Импорт в Experience владельца |
| `PUBLISH_SAFE.md` | Безопасная публикация, DataStore, монетизация (test only) |
| `TEST_MATRIX.md` | Матрица тестов (авто + Studio + ручные) |
| `DEFECTS.md` | Известные дефекты |
| `TESTING.md` | Open Cloud / headless и блокеры |

Сборка в CI/агенте: `cd roblox && ./scripts/check.sh && cp build/PunkMeAngel_Ep1.rbxlx release/`
