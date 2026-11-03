# Safe chat (PR #46) — release preconditions

Draft worker + rules + client changes must ship in a fixed order. **Do not publish RTDB rules or production deploy without explicit owner GO.**

## Order (worker + mirror → client → rules)

1. **Worker** — Deploy the safe-chat worker with `chat/clientMessages` mirroring (send, hide/redact, erasure, retention).
2. **Backfill `chat/clientMessages`** — Run a dry-run script first (default), then owner-approved apply: for each canonical `chat/messages/{id}` that should be public, write the whitelisted mirror fields. Orphan mirrors without canonical rows should be removed in the same maintenance window.
3. **Client** — Ship the game client that reads `chat/clientMessages` (not `chat/` root / `chat/messages`) and sends via the worker API (`js/safe-chat.js` path in this PR).
4. **RTDB rules** — Only after (1–3) are live: publish rules that deny list read on `chat/messages`, deny client writes on `chat/clientMessages`, and remove legacy `chat/$msgId` client writes.

Publishing rules before the new client and worker **breaks** the current production client on `main` (`js/game.js` still reads/writes `chat` directly).

## Legacy flat `chat/$msgId` rows

Historical rows may contain `uid` and other fields not allowed on the mirror. **Migration or deletion is a separate owner GO** — do not bulk-delete production chat data without that approval.

## Verification before rules GO

- Integration gate green on the release SHA (`npm run test:safe-chat`, 3× consecutive EXIT 0).
- Spot-check mirror: no hidden/redacted/held-erasure text on `chat/clientMessages`.
- Confirm worker + client versions in staging against emulator rules matching production intent.
