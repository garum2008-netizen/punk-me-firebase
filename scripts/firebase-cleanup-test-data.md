# Firebase test data cleanup (owner approval required)

**Do not run destructive scripts until the owner (Inna) explicitly says yes.**

## What accumulates

- `/players/*` — anonymous QA accounts (Cobalt*, Панк*, etc.)
- `/presence/*` — stale entries (game now filters by `ts` / `lastSeen` < 2 min)
- `/chat` — automated test messages

## Dry-run inventory (read-only)

```bash
# Requires Firebase Admin or database secret — use owner credentials only
node scripts/firebase-cleanup-test-data.js --dry-run
```

## Apply cleanup (after owner yes)

```bash
node scripts/firebase-cleanup-test-data.js --apply --confirm OWNER_YES
```

The script only deletes players whose `name` matches test patterns (`/^Cobalt\d+/`, `/^Панк\d+/`, `/^Player\d+/`, names containing `audit` or `qa-`) and chat messages older than 7 days from non-owner UIDs.

## Manual alternative

Firebase Console → Realtime Database → export backup → delete `/players` test nodes and `/chat` test lines.
