# PR #45 — Security hotfix: presence FAIL root cause & risk (t111u)

**Status:** `build:hotfix-rules --test` on prod audit model → **25 PASS, 0 FAIL** (presence + chat repair). **No prod deploy.**

## 1. Cause of `alice write own presence → allow` FAIL

Owner Cloud Shell run: **14 PASS, 1 FAIL** on **hotfix rules built from live export** (`prod-hotfix` profile).

| Finding | Detail |
|---------|--------|
| **Not a players hotfix regression** | `applyHotfixPatch` only changes `players` (+ premium/entitlements/qa validate). It did **not** copy `presence` from git `database.rules.json`. |
| **Live export shape** | Model `rtdb-rules-prod-model-audit-2026-10-25.json` (and typical owner export after `database:rules:get`) contains **only** `players` under `rules` — no `presence` subtree. Root `.read`/`.write` are `false`. |
| **Effect** | Any write to `presence/room/{uid}` is denied → FAIL matches **Permission denied**, not validation. |
| **Prior prod behavior** | If live truly had no presence rules, **main @ 450d6da** would already fall back (`initMultiplayer` → `presenceOk=false` → `listenPlayersInLocation`). Hotfix did not make that worse; it left the hole in the export. |

## 2. Decision: hotfix vs test expectation

| Option | Choice |
|--------|--------|
| Change test to expect deny | **Rejected** for deploy profile — client **requires** authenticated own write to `presence/{loc}/{uid}` (`pushPresence`, `initMultiplayer` probe). |
| Minimal hotfix addition | **Accepted** — when live export does not allow own presence write, merge `MINIMAL_PRESENCE_FOR_CLIENT` (`scripts/lib/rtdb-hotfix-patch.mjs`): |
| | • `$location`.read = `auth != null` (keeps **anon deny**, matches prod-hotfix tests) |
| | • `$uid`.write = `auth.uid === $uid` + validate aligned with **main @ 450d6da** payload |
| | • Does **not** open public read on `/players` or add anon presence read |

If live export **already** has working own-write presence (e.g. `live-published-open.json`), patch **does not** replace it.

## 3. Game / online impact

| Area | Impact |
|------|--------|
| **Solo / save / F5** | Unchanged — `players/{uid}` owner read/write + premium guards |
| **Multiplayer** | **Improves** when export lacked presence rules; **unchanged** when live already had them |
| **Online count** | `db.ref("presence").once` needs auth read on tree — repaired rules use `auth != null` on `$location` (signed-in clients only) |
| **Public leak** | `/players` root closed to admin; no new anon paths |

## 4. Emulator protocol (full matrix)

Run (Cloud Shell or CI):

```bash
npm run build:hotfix-rules -- --model-audit --test
npm run test:rules          # git database.rules.json target model
npm run test:save-sanitize
```

`test-database-rules.js` logs **PASS/FAIL per case** and a **summary** (no stop on first FAIL).

Cases include: players root, owner coins, premium/entitlements/qa, admin read, publicProfiles, presence (own write, bob deny, authed read, anon deny in prod-hotfix), chat, buildings, PATCH bypass attempts on premium.

## 5. Risk assessment (deploy hotfix rules file)

| Risk | Level | Mitigation |
|------|-------|------------|
| Close `/players` public read | **Intended** | Client does not use root read on main |
| Premium escalation | **Low** | `.validate` on premium/entitlements/qa |
| Presence too open | **Low** | Repair uses auth-only location read; only own uid write |
| Accidental full git rules deploy | **High** | Deploy **only** `rtdb-rules-hotfix-from-live.json` after diff review |
| Rollback | **Low** | Redeploy timestamped `rtdb-rules-prod-*.json` from owner export |

## 6. `v12-break_curse-99-error` (cross-ref)

Unrelated to PR #45 — game UI/scenario artifact on PR #43.
