# Child safety escalation (DRAFT — legal review)

**Model:** Risk-Based Child Safety Moderation (Owner decision t139u). Child protection does **not** depend on reporter age or report quotas. Reporter credibility **weights** risk; it never blocks submission.

## Report subcategories (client quick-select)

| Subcategory | Typical server action |
|-------------|------------------------|
| `immediate_danger` | Temporary hide when risk threshold met; **immediate_danger** queue tier; shortest SLA; `moderatorNotify` |
| `sexual_exploitation`, `grooming`, `violence_threat` | Temporary hide when category + corroborating signal (message context, filter hit, author history) |
| `other_child_safety` | Urgent review + evidence; auto-hide only at higher risk threshold |
| Legacy `child_safety` | Treated as `other_child_safety` |

## Risk signals (server)

- Message **filter** (`detectChildHarmSignals`) → mandatory temporary hide + queue (no reporter).
- **Conversation context** (RU/UK/EN/DA keyword/regex set): off-platform contact, age/location/photo asks, secrecy, gifts, etc.
- **Author history:** prior moderator-confirmed violations, new-account flag (`chat/internal/authorSafety`).
- **Independent reporters:** small weighted boost only; **report count alone never increases risk**; coordinated clusters (/24, registration time, timing) merged into one case with zero boost.

## Auto-hide vs queue

| Source | Hide |
|--------|------|
| Filter serious threat | Always (mandatory) |
| High-tier report + corroboration | Always (mandatory), regardless of reporter age/ban/quota |
| `other_child_safety` at threshold | Yes; may consume **discretionary** reporter auto-hide quota (1/3 per 24h) |
| Banned/suspicious reporter alone | Never sufficient to hide |
| Mass identical coordinated reports | Merged; no hide from count alone |

**Reports are never rate-limited** for child-safety subcategories. Quotas apply only to discretionary auto-hide weight.

## Immediate danger escalation (moderator procedure)

1. Queue item: `escalationTier: immediate_danger`, `moderatorNotify: true`, SLA `SAFE_CHAT_IMMEDIATE_DANGER_SLA_MS` (default 4h).
2. Moderator reviews evidence (minimal snapshot; moderator-only RTDB paths).
3. **Documented owner/moderator step:** if real-world imminent harm is credible, contact **local emergency services / national child helpline** using official public numbers for the jurisdiction — **no automated external calls** from the Worker.
4. Log decision in `chat/internal/safetyDecisions`; restore visibility via `restore_visibility` if wrongful.

## False reports

After mod review with `falseReport: true`: reporter **auto-hide weight** reduced for 30 days (`childSafetyAutoHideDeniedUntil`). **Reporting remains allowed.**

## Reporter privacy (GDPR)

API response to reporter: `{ received: true, messageKey: "thanks_received" }` only — no target identity, case status, evidence, or mod notes.

## Appeal

Player: `POST /api/chat/appeal-hide` `{ msgId, reasonCode }` → appeal queue + decision log entry. Moderator resolves with `restore_visibility` or uphold.

## Related docs

- `CHILD_HARM_EVIDENCE_RETENTION.md` — evidence minimization & retention  
- `CHAT_PRIVACY.md` — cluster HMAC for coordination (24h)  
- `ERASURE_AND_LEGAL_HOLD.md` — deferred erasure while queued  
