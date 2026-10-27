# Safe chat — privacy supplement (DRAFT)

> **Draft for legal review by owner (Inna). Not published automatically.**

## What we store

| Data | Where | Retention | Purpose |
|------|--------|-----------|---------|
| Chat message text, display name, Firebase UID, timestamp, optional location id | Firebase RTDB `chat/messages` | 7 days (cron cleanup) | Gang chat |
| Report records (message id, hashed reporter id, hashed author id, time) | `chat/reports` | 90 days | Moderation / DSA |
| Mute/ban flags | `chat/modState` | Until lifted | Safety |
| Per-player block list | `players/{uid}/chatBlocklist` | Until user removes | User preference |
| Rate-limit counters | Cloudflare Durable Object | Rolling / daily | Anti-spam |

We **do not** store email or IP in chat message records. Firebase Auth processes sign-in separately (see main `privacy.html`).

## How to delete

- In-game: hide/block a player (client-side list on your profile).
- Account deletion: contact owner *(add process before publish)* — chat messages may remain until retention expiry if not linked to deletion workflow.

## Controller / contact

*(Add legal entity and contact before publish — Denmark/EU GDPR.)*
