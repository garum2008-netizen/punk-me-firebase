# PR #45 — Security hotfix: presence FAIL root cause & risk (t111u)

**Status:** `npm run test:pr45-emulator` — full protocol on hotfix rules (`presence` + `chat` blocks per owner decision 27.10.2026). **No prod deploy.**

## Owner decision (27.10.2026) — gang chat in hotfix

The deployable hotfix file **`rtdb-rules-hotfix-from-live.json`** includes **both** repaired **`presence`** and **`chat`** (see `bb77831` / `MINIMAL_*_FOR_CLIENT` in `rtdb-hotfix-patch.mjs`).

**Gang chat stays included** (owner decision **27.10.2026 13:37**): any **signed-in** player may read `chat/` and post their own messages. Chat is **not** disabled in this hotfix.

| Residual risk | Follow-up backlog (not in PR #45) |
|---------------|-----------------------------------|
| Abuse / spam | **Rate limit** on chat writes |
| Harassment / unsafe content | **Report / block** player flows |
| Offensive text | **Profanity / content filter** (rules or Cloud Function) |
| Data retention | **TTL / archival** for chat messages |
| PII / policy | Owner policy + optional server validation on write |

### `players/{uid}/owner` (and similar admin flags)

Clients must **not** self-elevate: `owner` (and existing `premium` / `entitlements` / `qa`) are writable only when **`auth.token.admin === true`**, including blocking parent-path PATCH/PUT bypass. Emulator tests cover direct `owner:true` write and parent PATCH.

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
npm run test:pr45-emulator
```

`test-database-rules.js` logs **PASS/FAIL per case** and a **summary** (no stop on first FAIL).

**prod-hotfix matrix highlights:** non-admin `/players` list deny; `owner` / premium / entitlements / qa admin-only (direct + parent PATCH deny); presence own write / foreign deny / **auth-only** read (no public read); chat **auth-only** read + signed-in post; new message (own uid, ≤280) allow; edit/delete other’s message deny; >280 chars deny; spoofed uid deny.

**Repo target `database.rules.json`:** `presence` and `chat` `.read` = `auth != null` (aligned with `rtdb-rules-hotfix-from-live.json` after `build-hotfix-rules.mjs`).

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
