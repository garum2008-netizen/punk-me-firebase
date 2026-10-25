# Presence `permission_denied` — analysis (2025-10-25)

## Client path

- Writes: `presence/{location}/{auth.uid}` (e.g. `presence/room/{uid}`).
- Payload (after fix): `name`, `x`, `y`, `ts`, optional `avatar`, `level`, `characterId`, `anim`.
- Probe on boot: same path, then `remove()`; on failure → `presenceOk = false`, listen-only fallback.

## Rules in repo (`database.rules.json`, PR #33)

- `presence/$location/$uid`: `.read: true`, `.write: auth != null && auth.uid === $uid`.
- `.validate` requires `name`, `x`, `y`, `ts` and optional field types (strings/numbers).

## Published snapshot (`scripts/rules-deploy-snapshots/live-published-open.json`)

- Same write rule: `auth.uid === $uid`.
- Weaker validate: only `hasChildren(['name','x','y','ts'])` — extra fields allowed.

## Likely causes of `permission_denied` on live

1. **Validation failure** (secure rules): client sent invalid or missing `name` / non-numeric `x`/`y` / bad types → RTDB reports `PERMISSION_DENIED`. Mitigated by `buildPresencePayload()` in `js/game.js` (emulator passes full payload).
2. **No auth token on write**: write before `signInAnonymously` completes → denied. Mitigated by checking `auth.currentUser.uid === uid` before probe/set.
3. **Wrong uid in path**: not observed in code (always uses session `uid`).
4. **Deployed rules mismatch**: site QA (2025-10-25) still logs `permission_denied` for both `/presence/room/{uid}` and `/publicProfiles/{uid}` against production RTDB while using the fix branch static bundle — points to **published rules** (or project) not matching repo `database.rules.json`, not only client bugs. Compare Firebase console with `database.rules.json` / `scripts/rules-deploy-snapshots/` before GO.

## Rules change for review

No broadening of access required for this fix. Optional review file: `database.rules.review-presence.json` (identical to repo `presence` subtree) — **do not deploy** without Inna GO.

## Emulator tests

`npm run test:rules` — includes presence allow/deny matrix.
