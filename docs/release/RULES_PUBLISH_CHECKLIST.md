# PUNK ME — Firebase RTDB rules publish checklist (OWNER: Inna)

**Issue:** [#20](https://github.com/garum2008-netizen/punk-me-firebase/issues/20)  
**Goal:** Close public read of `/players` while keeping saves and multiplayer working.  
**Do not publish rules from a cloud agent** — only you, from Console or authenticated CLI.

**Policy (2026-10-25, Inna):** Firebase Rules публикуются **вместе с релизом после приёмки §18** (сообщение «приёмка подтверждена»). До приёмки — только репозиторий + эмулятор (`docs/release/FIREBASE_RULES_RELEASE.md`).

---

## Three rules states (do not confuse)

| State | Source | `/players` list | `publicProfiles` | Notes |
|-------|--------|-----------------|------------------|--------|
| **Live published today** | Documented in `scripts/rules-deploy-snapshots/live-published-open.json` | **World-readable** (~979+ saves exposed) | Path absent → writes denied | What production RTDB actually enforces (audit 2026-10-24). |
| **Repo `main` (#16, never published)** | `scripts/rules-deploy-snapshots/repo-main-7ee242b.json` | Owner **email** in rules (not live) | Absent | Matches git `7ee242b` / `a0e15b5` `database.rules.json`. |
| **PR #33 secure** | `database.rules.json` on branch / `secure-pr33.json` | **Admin claim only** | Public read, owner write own | Target after publish. |

Emulator proof: `npm run test:deploy-order` (new JS + old rules; old JS + new rules).

---

## Recommended rollout order (forward)

Do **not** publish new rules before new static JS is on production.

1. **Backup** (mandatory, no deletes):

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
   node scripts/backup-players-export.js
   ```

   Store the JSON offline and private.

2. **Merge PR #33** to `main` (do not skip review).

3. **Deploy static site** (hosting) with PR #33 JavaScript — `GAME_VERSION` bundle includes:
   - `saveMe` → `players/{uid}` update (required)
   - `publicProfiles/{uid}` write with **`.catch()`** (optional until step 5)
   - `isOwner` / `owner.html` via **`admin` custom claim** (not email)

   **While live rules are still open or repo-email rules:** gameplay and `players/{uid}` saves work. `publicProfiles` writes fail harmlessly until new rules exist.

4. **Set admin custom claim** (your machine only):

   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
   node scripts/set-admin-claim.mjs --email=garum2008@gmail.com
   ```

   Sign out and sign in again in the browser (refresh ID token).

5. **Smoke test on production** (still old rules OK):
   - New player: load → play → reload → save intact.
   - DevTools: no dependency on reading `/players.json` root for gameplay.
   - `owner.html`: without claim → access denied UI; **not** a crash.

6. **Publish new rules** in Firebase Console:
   - **Build** → **Realtime Database** → **Rules**
   - Paste full `database.rules.json` from merged `main` (PR #33)
   - **Publish**
   - Save a copy of the **previous** rules JSON (Console **Rules history** or `live-published-open.json` for reference)

7. **Post-publish smoke**:
   - Incognito: play, save, reload.
   - Network: no unauthenticated `GET .../players.json` with body of all saves.
   - `owner.html` with Google + **admin claim**: player count loads.
   - Multiplayer: still via **`presence/`**, not `/players`.

---

## Rollback (exact)

### If something breaks after step 6 (new rules live)

1. **Re-publish old rules immediately** (fastest fix for leaked/closing mismatch):
   - Console → Realtime Database → **Rules** → **Rules history** → select the version **before** PR #33 publish → **Restore** / publish.
   - Or paste contents of `scripts/rules-deploy-snapshots/live-published-open.json` (matches pre-secure **live** behavior) and publish.

2. **If gameplay still broken** (rare with forward order): redeploy **previous** static hosting bundle (git tag / prior `GAME_VERSION`).

3. **Order when panicking:** restore **old rules first** (unblocks old cached JS and wide `/players` reads), then redeploy old static if needed. Player data in RTDB is **not** deleted by rule changes.

### If only `owner.html` broken after step 3

- Usually missing **admin claim** — run `set-admin-claim.mjs`, re-login. Do **not** republish open rules for that alone.

---

## Local verification (recommended)

```bash
npm install
npm run test:rules
npm run test:deploy-order
```

| Script | Proves |
|--------|--------|
| `test:rules` | Secure rules matrix + 20 save fixtures + gameplay `saveMe` |
| `test:deploy-order` | (a) New JS + repo-main & live-open rules; (b) Old JS `7ee242b` + secure rules |

---

## What changes for players (after step 6)

| Path | Live today | After PR #33 rules |
|------|------------|-------------------|
| `/players` | World-readable | **Denied** (except `admin` claim) |
| `/players/{uid}` | Often world-readable | **Only that `uid`** (or admin) |
| `/publicProfiles/{uid}` | N/A | Public: name, avatar, coins |
| `/presence/...` | Public | Unchanged |

---

## Cached old JS (pre-#33)

- Gameplay uses **`players/{uid}`** and **`presence/`** only — **no** `/players` root reads.
- **`owner.html`** (old): email gate + `loadStats()` on `/players` → **permission denied** under new rules; UI shows rules hint, **no gameplay impact**.

---

## What agents must not do

- Publish rules without your written OK.
- Run `backup-players-export.js` or `set-admin-claim.mjs` against production from cloud VMs.
- Delete `/players` data.

See also: `docs/release/ACCOUNTS_SETUP.md`, `scripts/rules-deploy-snapshots/README.md`.
