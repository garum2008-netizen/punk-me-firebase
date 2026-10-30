# RTDB rules snapshots (deploy-order tests)

| File | Meaning |
|------|---------|
| `repo-main-7ee242b.json` | `database.rules.json` on git `main` at `7ee242b` / `a0e15b5` (#16) — **never published** to production per owner; no `publicProfiles`. |
| `live-published-open.json` | Documented **actually live** rules (open `/players` read). Used to prove new JS works before rules publish. |
| `secure-pr33.json` | PR #33 secure rules (admin claim, per-uid saves, `publicProfiles`). |
| `prod-rollback-2026-10-25.json` | **Rollback copy** of documented live prod rules before secure release (refresh from Console before go-live). |

Production today: **live-published-open** ≠ **repo `database.rules.json`**.

**Policy (2026-10-25):** publish `database.rules.json` **together with** accepted release — not before acceptance. See `docs/release/FIREBASE_RULES_RELEASE.md`.
