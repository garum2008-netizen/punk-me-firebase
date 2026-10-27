# PR #45 — Security hotfix (RTDB rules + client sanitize)

| Field | Value |
|-------|--------|
| **Branch** | `cursor/prod-security-hotfix-d81d` |
| **PR** | [#45](https://github.com/garum2008-netizen/punk-me-firebase/pull/45) (Draft) |
| **Head SHA** | `0322440` |
| **Deploy** | **No** — emulator + docs only until owner GO |

## Scope delivered

1. **Privileged `players/{uid}` fields** — `owner`, `premium`, `entitlements`, `qa`: only **`auth.token.admin === true`** may create or change values. Child `.write` + `.validate` and parent `$uid` `.write` / `.validate` block PUT/PATCH bypass. Players may still update normal gameplay fields (e.g. `coins`) when admin-set `premium` is unchanged.
2. **`presence` + `chat` reads** — `.read` = **`auth != null`** in **git** `database.rules.json` and in **`scripts/rules-deploy-snapshots/rtdb-rules-hotfix-from-live.json`** (via `MINIMAL_*_FOR_CLIENT` when live export lacks them).
3. **Own presence write** — `presence/{location}/{uid}` write = `auth.uid === $uid`; emulator case **`presence: own write → allow`** (PASS).
4. **Client** — `sanitizePlayer()` omits `owner` unless local owner session; no `premium` in save payload (`js/game.js`).

Admin privilege in-game uses **`auth.token.admin`** (custom claims), not an RTDB `players/.../admin` field.

## Owner decision (27.10.2026) — gang chat in hotfix

Deployable artifact: **`rtdb-rules-hotfix-from-live.json`** (built from live export + `applyHotfixPatch`), not wholesale git `database.rules.json`.

**Gang chat stays included** (owner **27.10.2026 13:37**): signed-in players read `chat/` and post new messages under existing RTDB rules. Follow-up (rate limit, report/block, filter, TTL) is **out of scope** for PR #45.

## Emulator results (agent run)

```bash
npm run test:pr45-emulator
```

| Suite | Result |
|-------|--------|
| `build-hotfix-rules.mjs --model-audit --test` | **37/37** PASS (`prod-hotfix` matrix) |
| `test-save-sanitize` | PASS |
| `run-rules-emulator.js` (git `database.rules.json`) | **39/39** PASS |

**Bypass cases covered:** `owner:true` PUT; parent PATCH `owner` / `premium` / `entitlements` / `qa`; anon read `presence` / `chat`; spoofed chat uid; foreign presence write.

## PR #46 (`cursor/safe-chat-worker`) compatibility

| Item | Assessment |
|------|------------|
| **Base** | PR #46 forked at **`d9cbf3f`**; PR #45 tip adds **`97549f4+`** (`owner` lock, auth-only presence/chat in target rules). |
| **Rebase** | **Yes — recommended** onto current `cursor/prod-security-hotfix-d81d` before merge. |
| **Conflicts** | Expect in `database.rules.json` (PR #46: `chat/messages/*`, `presence.$location.read: true`, weaker `owner`); merge must **keep PR #45** privileged-field guards and **`auth != null`** presence read unless owner explicitly accepts public presence read for Worker design. |
| **Client** | PR #46 adds `safe-chat.js`; PR #45 `sanitizePlayer` changes are orthogonal — no forced rebase of Worker code beyond rules merge. |

## Cloud Shell — verification (no deploy)

```bash
git clone https://github.com/garum2008-netizen/punk-me-firebase.git
cd punk-me-firebase
git fetch origin cursor/prod-security-hotfix-d81d
git checkout cursor/prod-security-hotfix-d81d
npm install --no-audit --no-fund --ignore-scripts

npx firebase login --no-localhost
export FIREBASE_PROJECT=punk-me-40605

# Live rules export (read-only); do not commit output
npm run owner:readonly-check

# Hotfix diff + emulator (model audit if no fresh export)
npm run build:hotfix-rules -- --model-audit --test

npm run test:pr45-emulator
```

Full step-by-step: [`TESTING_CLOUD_SHELL.md`](./TESTING_CLOUD_SHELL.md).

## Cloud Shell — future GO (database rules only)

**Do not run without explicit owner GO.**

```bash
cd punk-me-firebase   # branch cursor/prod-security-hotfix-d81d, HEAD reviewed
export FIREBASE_PROJECT=punk-me-40605
npx firebase login --no-localhost

# 1) Fresh live export
npm run owner:readonly-check
LIVE=docs/release/prod-readonly-snapshots/rtdb-rules-prod-*.json   # newest file

# 2) Build deploy candidate
npm run build:hotfix-rules -- --input="$LIVE"
diff -u "$LIVE" scripts/rules-deploy-snapshots/rtdb-rules-hotfix-from-live.json | less

# 3) Re-run emulator on hotfix file
npm run build:hotfix-rules -- --input="$LIVE" --test

# 4) Deploy ONLY after GO (backup live rules from step 1)
cp database.rules.json database.rules.json.git-backup
cp scripts/rules-deploy-snapshots/rtdb-rules-hotfix-from-live.json database.rules.json
npx firebase deploy --only database --project punk-me-40605
mv database.rules.json.git-backup database.rules.json
```

**Rollback:** redeploy the timestamped `rtdb-rules-prod-*.json` from step 1.

**Hosting:** merge PR #45 → `main` → GitHub Pages; **not** `firebase deploy --only hosting` for the public game URL.

## Historical: presence FAIL on first owner run

First Cloud Shell hotfix test: **14 PASS, 1 FAIL** (`alice write own presence`) because live export had **no** `presence` subtree. `ensurePresenceForClient` + `ensureChatForClient` in `scripts/lib/rtdb-hotfix-patch.mjs` repair that without opening anon `/players`.

## Cross-ref

- `v12-break_curse-99-error` — PR #43 scenario UI (frozen QA on `d0512fd`).
