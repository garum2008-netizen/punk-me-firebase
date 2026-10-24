# RTDB rules snapshots (deploy-order tests)

| File | Meaning |
|------|---------|
| `repo-main-7ee242b.json` | `database.rules.json` on git `main` at `7ee242b` / `a0e15b5` (#16) — **never published** to production per owner; no `publicProfiles`. |
| `live-published-open.json` | Documented **actually live** rules (open `/players` read). Used to prove new JS works before rules publish. |
| `secure-pr33.json` | PR #33 secure rules (admin claim, per-uid saves, `publicProfiles`). |

Production today: **live-published-open** ≠ **repo-main**.
