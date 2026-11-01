# t139u manual verification scenarios

Run only in owner-approved staging; never against production without GO.

## FM-03 — Phrase-only grooming sequence (OD:27)

1. Set `SAFE_CHAT_FREE_TEXT=false` on the staging Worker (production default).
2. With two test accounts A (author) and R (reporter), send allowed preset phrases in sequence that together imply contact off-platform (e.g. repeated `thanks` / contact phrases across several messages in one room).
3. From R, submit `other_child_safety` or `grooming` on the latest message.
4. **Expected:** HTTP 2xx with `received: true`; exactly one `chat/internal/safetyQueue/{msgId}` row; `chat/internal/safetyEvidence/{msgId}` exists with `snapshot.sid` matching A’s public sid (not Firebase uid). Evidence does not need to link every phrase in v1, but the snapshot must match the reported message.
5. **Fail if:** report rejected, no queue/evidence, or response exposes author uid/name.

## BY-09 — DO persistence after restart (OD:26)

1. In staging with miniflare or deployed DO, exhaust one user’s discretionary hide quota (one global hide from filter-hit reports).
2. Restart the Worker/DO isolate (redeploy or miniflare restart).
3. Submit another child-safety report from the same uid on a new message with filter-hit text.
4. **Expected:** Second global hide is still blocked by quota (no second global hide); DO counters persist until 24h prune.
5. **Fail if:** quota resets to full after restart without prune.

## P-05 — Logs and wrangler tail PII (OD:15)

1. Enable wrangler tail (or staging log drain) on the safe-chat Worker.
2. Submit 10 mixed child-safety reports (including duplicate and immediate_danger).
3. Inspect captured log lines for the session.
4. **Expected:** No raw Firebase uid, no `SAFE_CHAT_HASH_SALT`, no full message evidence text, no raw IP addresses, no cluster HMAC inputs.
5. **Fail if:** any of the above appear in info-level or error logs.
