# PUNK ME — Firebase RTDB rules publish checklist (OWNER: Inna)

**Issue:** [#20](https://github.com/garum2008-netizen/punk-me-firebase/issues/20)  
**Goal:** Close public read of `/players` while keeping saves and multiplayer working.  
**Do not publish rules from a cloud agent** — only you, from Console or authenticated CLI after backup.

**Status:** PR #33 merged to `main`; secure **JavaScript is live** on hosting. **Rules are not published yet** — production RTDB still uses the pre-#33 rules until you publish.

---

## Before you change anything (rollback source)

1. Firebase Console → **Realtime Database** → **Rules**.
2. **Copy the full current rules text** (or download / paste into a private file dated today).  
   This is your **authoritative rollback** if the new rules misbehave.
3. Optional: note **Rules → History** — you can restore a prior version from there.

Do **not** rely on `scripts/rules-deploy-snapshots/live-published-open.json` for rollback (see below).

---

## Three rules states (do not confuse)

| State | Source | `/players` list | `publicProfiles` | Notes |
|-------|--------|-----------------|------------------|--------|
| **Live published today** | **Console copy (step above)** | Audit 2026-10-24: open `/players` read | Varies | Live checks showed `presence/` and `buildings/` return **401** on read — repo snapshot `live-published-open.json` is **unverified; do not use for rollback**. |
| **Repo `main` (#16, never published as-is)** | `scripts/rules-deploy-snapshots/repo-main-7ee242b.json` | Owner **email** in rules | Absent | Historical git snapshot for emulator tests only. |
| **Secure (merged #33)** | `database.rules.json` on `main` / `secure-pr33.json` | **Admin claim only** | Public read, owner write own | **Target** when you publish rules. |

Emulator proof: `npm run test:deploy-order` (new JS + old rules; old JS + new rules).

---

## Recommended rollout order (forward)

Do **not** publish new rules before secure static JS is on production (**already deployed** with #33 merge).

1. **Backup** (mandatory, read-only, no deletes):

   ```bash
   gcloud auth application-default login
   gcloud auth application-default set-quota-project punk-me-40605
   node scripts/backup-players-export.js
   ```

   Store the JSON offline and private.

2. **Set admin custom claim** (your Mac or [Cloud Shell](https://shell.cloud.google.com/) only):

   ```bash
   gcloud auth application-default login
   gcloud auth application-default set-quota-project punk-me-40605
   node scripts/set-admin-claim.mjs --email garum2008@gmail.com
   ```

   Sign out and sign in again in the browser (refresh ID token).

3. **Smoke test on production** (still **old** rules OK):
   - New player: load → play → reload → save intact.
   - DevTools: gameplay must not depend on reading `/players.json` root.
   - `owner.html`: without claim → access denied UI; **not** a crash.
   - With claim (after step 2): owner panel may still fail `/players` list until step 4 — expected.

4. **Publish new rules** in Firebase Console:
   - **Build** → **Realtime Database** → **Rules**
   - Paste full `database.rules.json` from `main`
   - **Publish**
   - Keep the **Console copy** from “Before you change anything” as rollback.

5. **Post-publish smoke**:
   - Incognito: play, save, reload.
   - Network: no unauthenticated `GET .../players.json` with body of all saves.
   - `owner.html` with Google + **admin claim**: player count loads.
   - Multiplayer: **`presence/`** (not `/players` root).

---

## Rollback (exact)

### If something breaks after step 4 (new rules live)

1. **Re-publish the rules you copied from Console** before publish (fastest, authoritative).
2. Or Console → Realtime Database → **Rules** → **Rules history** → restore the version **immediately before** your publish.
3. **Do not** paste `live-published-open.json` — marked **unverified**; live `presence/` / `buildings/` behavior does not match that file.

4. **If gameplay still broken** (rare with forward order): redeploy **previous** static hosting bundle (git tag / prior `GAME_VERSION`).

5. **Order when panicking:** restore **old rules first**, then redeploy old static if needed. Player data in RTDB is **not** deleted by rule changes.

### If only `owner.html` broken before rules publish

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
| `test:deploy-order` | (a) New JS + repo-main & live-open snapshots; (b) Old JS `7ee242b` + secure rules |

Owner scripts (emulator smoke, no production writes):

```bash
# Terminal A: firebase emulators:start --only auth,database --project punk-me-40605
FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 node scripts/backup-players-export.js --dry-run
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 node scripts/set-admin-claim.mjs --dry-run --email test@example.com
```

---

## What changes for players (after rules publish)

| Path | Typical live today | After secure rules |
|------|-------------------|-------------------|
| `/players` | Often world-readable | **Denied** (except `admin` claim) |
| `/players/{uid}` | Often per-uid or open | **Only that `uid`** (or admin) |
| `/publicProfiles/{uid}` | N/A until rules | Public: name, avatar, coins |
| `/presence/...` | **Verify on Console** | Intended public read in `database.rules.json` |

---

## Cached old JS (pre-#33)

- Gameplay uses **`players/{uid}`** and **`presence/`** only — **no** `/players` root reads in current `main` JS.
- Old bundles: same pattern; **`owner.html`** may show no access under secure rules.

---

## What agents must not do

- Publish rules without your written OK.
- Run `backup-players-export.js` or `set-admin-claim.mjs` against **production** from cloud VMs.
- Delete `/players` data.

See also: `docs/release/ACCOUNTS_SETUP.md`, `scripts/rules-deploy-snapshots/README.md`.
