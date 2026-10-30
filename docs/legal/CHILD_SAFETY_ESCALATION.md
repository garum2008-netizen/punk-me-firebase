# Child safety escalation procedure (DRAFT — not approved policy)

> **Owner review required (Inna). This document does not authorize automated law-enforcement contact.**

## Triggers

- In-game report category **`child_safety`** (UI: harm to a child / threat / grooming).
- Server-side **`detectChildHarmSignals`** on outbound message text (see `child-harm.js`).

## Immediate response (owner requirement)

Every **`child_safety`** report or filter hit:

1. **Hides the message immediately** (`hidden: true`) — no waiting for reporter trust.  
2. Enqueues **`chat/internal/safetyQueue/{msgId}`** with **`priority: critical`**.  
3. Stores a moderator-only evidence snapshot at **`chat/internal/safetyEvidence/{msgId}`**.

Reports are stored with **`priority: high`** in `chat/reports`. Moderators list the priority queue via **`GET /api/mod/safety-queue`**.

## Trust / Sybil (erasure & sanctions only)

Server **`chatMeta.chatRegisteredAt`** and **`chatSendCount`** determine **`trustedReporterCount`** on the queue entry. Low-trust reporters **still trigger immediate hide**. Trust affects whether automated **sanctions** may run in future and informs **erasure deferral** policy — not public visibility.

## Retention & erasure

- **Retention** skips child-harm queued / evidence messages until moderator resolution (see `CHILD_HARM_EVIDENCE_RETENTION.md`).  
- **Author erasure** defers deletion while **`childHarm`** queue or **`safetyEvidence`** exists; moderator **`resolve-safety`** clears or upholds.

## Moderator steps (draft)

1. Open mod API / `moderation.html` — **`/api/mod/safety-queue`** first (critical priority).  
2. Preserve evidence: export RTDB snapshot if needed *(owner process)*.  
3. False alarm → `action: "dismiss"`.  
4. Confirmed violation → mute/ban author; `action: "uphold_delete"` or `confirm_legal_hold`.  
5. Credible threat to a minor → **escalate to owner** *(add hotline / authority contacts before publish)*.

## Not in scope of this PR

- Automated NCMEC / police reporting APIs.  
- Age verification for free-text chat (`SAFE_CHAT_FREE_TEXT=false` remains default).
