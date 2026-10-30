# Child safety escalation procedure (DRAFT — not approved policy)

> **Owner review required (Inna). This document does not authorize automated law-enforcement contact.**

## Triggers

- In-game report category **`child_safety`** (UI: harm to a child / threat / grooming).
- Worker immediately **hides** the message, sets **`safetyHold`**, and flags the report **`priority: high`**.
- Content on **`safetyHold`** is **excluded** from 7-day message retention and linked reports from 90-day purge until a moderator resolves the hold.

## Moderator steps (draft)

1. Open mod API / `moderation.html` — high-priority reports listed first.
2. Preserve evidence: do not rely on auto-delete; export RTDB snapshot if needed *(owner process)*.
3. Assess severity: false alarm → `POST /api/mod/resolve-safety` with `action: "dismiss"` (unhide if appropriate).
4. Confirmed violation → mute/ban author; `action: "uphold_delete"` or manual delete; document internally.
5. If credible threat to a minor: **escalate to owner** for legal/parent contact — *(add national hotline / authority contacts before publish)*.

## Not in scope of this PR

- Automated NCMEC / police reporting APIs (paid / legal sign-off).
- Age verification for free-text chat (`SAFE_CHAT_FREE_TEXT=false` remains default).
