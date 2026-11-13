# RTDB rules snapshots

| File | Meaning |
|------|---------|
| `main-450d6da-pre-hotfix.json` | Copy of **git** `database.rules.json` on `main` @ `450d6da` — **not** live prod |

**Rollback target after any rules deploy:** file from owner export  
`docs/release/prod-readonly-snapshots/rtdb-rules-prod-*.json`  
(see `scripts/owner-readonly-check.sh`).
