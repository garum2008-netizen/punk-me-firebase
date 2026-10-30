# Erasure requests vs legal hold (DRAFT — legal review required)

> **Not approved policy.** Describes how the safe-chat Worker handles `POST /api/chat/delete-my-data` when evidence must be preserved.

## GDPR Art. 17(3) — exceptions to erasure

Erasure under Art. 17(1) does **not** apply when processing is necessary for:

- **(e)** establishment, exercise or defence of **legal claims**; or  
- **(f)** other important grounds of public interest, including **child protection**.

When a message is subject to an active **`safetyHold`**, **`safetyQueue`** review, or **`erasure_deferred`** moderator hold, the Worker **does not delete** that content in response to a user erasure request. Instead it records:

- `chat/internal/erasureDeferred/{msgId}` with `status: "erasure_deferred"`, reason, timestamp, and a snapshot of the message for moderators.

The API response lists **`erasureDeferred`** message ids so the requester knows erasure was **partially deferred**, not silently ignored.

## Moderator resolution

Moderators use `POST /api/mod/resolve-safety` (see `CHILD_SAFETY_ESCALATION.md`):

| Action | Effect |
|--------|--------|
| `retain_evidence` / `dismiss` | Clear hold flags; keep message visible if appropriate |
| `uphold_delete` / `approve_erasure` | Delete message and clear deferred/hold records after review |

Deferred erasure does **not** auto-delete reports or queue entries; retention skips held/queued items until resolved.

## Batching and rate limits

Large erasure jobs run in batches (`SAFE_CHAT_ERASURE_BATCH`, default 40 subrequests) with `cursor` continuation and a per-user minimum interval. Partial completion is reported honestly (`complete: false`, `cursor` set).

## Related docs

- `docs/legal/CHILD_SAFETY_ESCALATION.md` — child_safety queue and safetyHold  
- `docs/legal/GDPR_DSA_REVIEW.md` — overall DSA/GDPR draft review
