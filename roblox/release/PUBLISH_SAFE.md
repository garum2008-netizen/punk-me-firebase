# Безопасная публикация (черновик t105u)

- Только **приватный** experience до приёмки Инны.
- DataStore production: убрать суффикс `_TEST` только осознанно (`DataStoreScope.lua`).
- `MarketplaceService.ProcessReceipt`: идемпотентность обязательна; реальные Product ID — после подключения experience владельца.
- **Никаких реальных оплат** без отдельного GO.
- Откат: сохранить предыдущий `.rbxlx` в `release/` с датой в имени файла.

Полный чеклист: `roblox/docs/PUBLISH_CHECKLIST.md`.
