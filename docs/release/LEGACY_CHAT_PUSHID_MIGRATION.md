# Legacy `chat/<pushId>` message paths

Historically some messages may exist under flat RTDB keys `chat/<firebasePushId>` instead of `chat/messages/<pushId>`.

## Current rules

Under `database.rules.json`, client reads go through `chat/messages` only. Legacy flat nodes are not readable by players and cannot be written by clients.

## Migration plan (owner GO before prod rules publish)

1. **Inventory**: Admin export `GET /chat.json?shallow=true` and list child keys other than `messages`, `reports`, `modState`, `internal`.
2. **Move**: For each legacy push id, `GET` the object and `PUT` to `chat/messages/<id>` if not already present, then `DELETE` the legacy path.
3. **Verify**: Rules test suite + spot-check that no shallow keys remain except the four canonical branches.
4. **Retention**: Worker retention only deletes under `chat/messages`; legacy orphans should be removed in step 2.

Dry-run script: extend `scripts/migrate-players-chat-fields-to-meta.mjs` pattern or a one-off admin script (emulator only until GO).
