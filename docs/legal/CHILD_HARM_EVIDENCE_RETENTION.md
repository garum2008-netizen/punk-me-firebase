# Child-harm evidence retention (DRAFT — legal review required)

> **Not approved policy.** Describes how suspected child-harm chat content is hidden, queued, and retained beyond the normal 7-day message TTL.

## Legal basis (draft)

Extended retention of hidden child-harm messages and moderator snapshots is claimed under:

- **GDPR Article 17(3)(f)** — processing necessary for important grounds of public interest, including **child protection**; and  
- **Digital Services Act (EU) 2022/2065 Article 9** — illegal content notice and action (draft mapping only).

Exact wording and jurisdiction must be confirmed by counsel before production use. Config string: `SAFE_CHAT_SAFETY_LEGAL_BASIS` (see `workers/safe-chat/src/config.js`).

## Immediate hide + priority queue (owner requirement)

On **`child_safety` report** or **server-side child-harm pattern detection** (`detectChildHarmSignals` in `child-harm.js`):

1. Message **`hidden: true`** immediately (removed from normal player view).  
2. Entry in **`chat/internal/safetyQueue/{msgId}`** with **`priority: critical`**, `childHarm: true`, and documented `legalBasis` / `legalHoldUntil`.  
3. Minimized snapshot in **`chat/internal/safetyEvidence/{msgId}`** (`access: moderator_only`).

**Anti-Sybil trust** (`chatMeta` age + send history) is stored on the queue entry for **erasure deferral and sanctions only**. It does **not** gate immediate hide.

## Access control

| Node | Client RTDB | Moderator API (Bearer + mod uid) |
|------|-------------|----------------------------------|
| `chat/messages` | read auth | via mod tools |
| `chat/internal/safetyQueue` | **denied** | `GET /api/mod/safety-queue` |
| `chat/internal/safetyEvidence` | **denied** | admin SDK / mod workflows only |
| `chat/internal/safetyDecisions` | **denied** | append-only via `POST /api/mod/resolve-safety` |

## Retention

- Normal **7-day** message TTL **does not delete** messages with active **`safetyQueue` (childHarm)**, **`safetyEvidence`**, or **`safetyHold`** (see retention job in `index.js`).
- **`legalHoldUntil`** / **`safetyEvidenceMaxHoldMs`** (default 365 days) caps extended hold unless a moderator extends via policy *(owner process)*.

## Deletion procedure (draft)

1. Moderator reviews via **`GET /api/mod/safety-queue`** and reports list.  
2. **`POST /api/mod/resolve-safety`** with `action`:  
   - `confirm_legal_hold` / `retain_evidence` — sets **`safetyHold`**, keeps evidence; logs decision.  
   - `dismiss` — unhide, clear queue/evidence/snapshot.  
   - `uphold_delete` — delete message and all hold/queue/evidence nodes; logs decision.  
3. Each action appends **`chat/internal/safetyDecisions`** with moderator uid, timestamp, and optional note.

## Related

- `docs/legal/CHILD_SAFETY_ESCALATION.md` — operational escalation  
- `docs/legal/ERASURE_AND_LEGAL_HOLD.md` — user erasure vs holds
