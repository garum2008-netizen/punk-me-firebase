# Safe chat — privacy supplement (DRAFT)

> **Draft for legal review by owner (Inna). Not published automatically.**

## What we store

| Data | Where | Retention | Purpose |
|------|--------|-----------|---------|
| Chat message text, display name, Firebase UID, timestamp, optional location id | Firebase RTDB `chat/messages` | 7 days (cron cleanup) | Gang chat |
| Report records (message id, hashed reporter id, hashed author id, time) | `chat/reports` | 90 days | Moderation / DSA |
| Mute/ban flags | `chat/modState` | 90 days after lift/expiry (cron) | Safety |
| Report dedup keys / counts | `chat/internal/*` | Purged with reports (90d) or on message delete | Anti-abuse |
| Age declaration timestamp | `players/{uid}/chatAge13DeclaredAt` | While account exists (server-written only) | 13+ gate evidence |
| Rate-limit counters | Cloudflare Durable Object (`ChatLimitsDO`) | ~30 days idle prune (cron) | Anti-spam |

We **do not** store email or IP in chat message records. Firebase Auth processes sign-in separately (see main `privacy.html`).

## Backups and logs (analysis draft)

| Location | May contain chat data? | Retention note |
|----------|------------------------|----------------|
| Firebase RTDB automated backups (Google) | Yes, if enabled on project | Independent of Worker cron; **purge on restore** or align backup TTL with owner policy before GO |
| Cloudflare Worker observability logs | Request metadata only (no message body in default code) | Short platform retention |
| Cloudflare cron `runRetentionJob` | Deletes aged rows in RTDB | Does not erase backup snapshots |
| Moderator exports / manual copies | Possible | Out of band — procedure for owner |

**Child-safety hold:** messages with `safetyHold` and linked reports are skipped by automated retention until `/api/mod/resolve-safety`.

## How to delete

- In-game: hide/block a player (client-side list on your profile).
- Account deletion: contact owner *(add process before publish)* — chat messages may remain until retention expiry if not linked to deletion workflow.

## Controller / contact

*(Add legal entity and contact before publish — Denmark/EU GDPR.)*
