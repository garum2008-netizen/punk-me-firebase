# Child safety escalation procedure (DRAFT — not approved policy)

> **Owner review required (Inna). This document does not authorize automated law-enforcement contact.**

## Triggers

- In-game report category **`child_safety`** (UI: harm to a child / threat / grooming).
- Every **`child_safety`** report is stored with **`priority: high`** and appears in the mod queue.
- **Instant hide + `safetyHold`** applies only if the reporter’s server **`chatMeta.chatRegisteredAt`** age is at least **24 hours** (configurable) **or** at least **two** distinct reporters have reported the same `msgId`.
- A **new anonymous reporter alone** does **not** hide the message; it is listed under **`chat/internal/safetyQueue/{msgId}`** until a moderator acts or the hide threshold is met.
- **`safetyHold`** and **queue** entries escalate on cron (`overdue` flag, extended deadline); **reports are never auto-deleted** while queued or held.
- Erasure requests defer deletion of held/queued messages to **`chat/internal/erasureDeferred`** (see `ERASURE_AND_LEGAL_HOLD.md`).

## Moderator steps (draft)

1. Open mod API / `moderation.html` — high-priority reports listed first.
2. Preserve evidence: do not rely on auto-delete; export RTDB snapshot if needed *(owner process)*.
3. Assess severity: false alarm → `POST /api/mod/resolve-safety` with `action: "dismiss"` (unhide if appropriate).
4. Confirmed violation → mute/ban author; `action: "uphold_delete"` or manual delete; document internally.
5. If credible threat to a minor: **escalate to owner** for legal/parent contact — *(add national hotline / authority contacts before publish)*.

## Not in scope of this PR

- Automated NCMEC / police reporting APIs (paid / legal sign-off).
- Age verification for free-text chat (`SAFE_CHAT_FREE_TEXT=false` remains default).
