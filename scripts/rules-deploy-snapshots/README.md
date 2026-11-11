# RTDB rules snapshots (deploy-order tests)

| File | Meaning |
|------|---------|
| `repo-main-7ee242b.json` | `database.rules.json` on git `main` at `7ee242b` / `a0e15b5` (#16) — **never published** as production rules; no `publicProfiles`. Emulator / deploy-order tests only. |
| `live-published-open.json` | **Unverified — do not use for rollback.** Approximation from a 2026-10-24 audit (open `/players` read). Later live checks showed `presence/` and `buildings/` reads return **401**, so this file does **not** match current production. For rollback, copy rules from **Firebase Console** before publishing (see `docs/release/RULES_PUBLISH_CHECKLIST.md`). |
| `secure-pr33.json` | Merged #33 secure rules (admin claim, per-uid saves, `publicProfiles`). Matches target `database.rules.json` on `main`. |

Production rollback source: **Console rules text you save before publish**, not these JSON files alone.
