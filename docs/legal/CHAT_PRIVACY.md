# Chat privacy (DRAFT — legal review)

## Sybil / cluster rate-limiting (legitimate interest)

To reduce coordinated **`child_safety`** report abuse while keeping **immediate hide** for genuine filter-detected harm, the safe-chat Worker may derive a **pseudonymous cluster id** from the client IP:

- Source header: `CF-Connecting-IP` (or `X-Forwarded-For` first hop in tests).
- Processing: IPv4 **/24 prefix** only → HMAC-SHA256 with **`SAFE_CHAT_CLUSTER_SALT`** (or `SAFE_CHAT_HASH_SALT` fallback).
- Storage: **Cloudflare Durable Object** (`ChatLimitsDO`) counters only — **no raw IP** in RTDB.
- Retention: rolling **24 hours**, then pruned by the limits DO `/prune` job.
- Purpose: cap **child_safety hides per cluster per 24h** (`SAFE_CHAT_CHILD_SAFETY_CLUSTER_HIDE_CAP`, default 5).

Legal basis (draft): **legitimate interest** (GDPR Art. 6(1)(f)) to protect users from censorship-by-spam while meeting child-protection hide obligations. DPIA and counsel review required before production.

## What we do not store in RTDB

- Raw IP addresses  
- Unsalted cluster prefixes  

## Related

- `docs/legal/CHILD_SAFETY_ESCALATION.md` — hide quotas and reputation  
- `docs/release/SAFE_CHAT_REPORT.md` — product summary
