# Erasure requests vs legal hold (DRAFT — legal review required)

> **Not approved policy.** Describes how the safe-chat Worker handles `POST /api/chat/delete-my-data` when evidence must be preserved.

## GDPR Art. 17(3) — exceptions to erasure

Erasure under Art. 17(1) does **not** apply when processing is necessary for:

- **(e)** establishment, exercise or defence of **legal claims**; or  
- **(f)** other important grounds of public interest, including **child protection**.

Author erasure defers deletion while **`childHarm`** queue entries or **`safetyEvidence`** snapshots exist (immediate hide does not require moderator hold). Moderator **`resolve-safety`** clears or upholds.

`chat/internal/erasureDeferred/{msgId}` stores a **minimized snapshot** (no raw reporter uid) with **`expiresAt`** for moderator review; stale entries should be escalated or cleared by moderators.

The API response lists **`erasureDeferred`** message ids when a **`safetyHold`** blocks deletion.

## Batching and rate limits

Large erasure jobs run in batches bounded by **`SAFE_CHAT_ERASURE_MAX_SUBREQUESTS`** (default 45). The Worker **ignores client-supplied cursors**; continuation uses server **`erasureCursor`** only. Incomplete jobs schedule **Durable Object alarms** to call `/api/internal/erasure-continue`. Partial completion is reported honestly (`complete: false`, `cursor` set). **`/erase-user` on the limits DO runs only when `complete: true`.**

## Moderator resolution

Moderators use `POST /api/mod/resolve-safety` (see `CHILD_SAFETY_ESCALATION.md`):

| Action | Effect |
|--------|--------|
| `retain_evidence` / `dismiss` | Clear hold flags; keep message visible if appropriate |
| `uphold_delete` / `approve_erasure` | Delete message and clear deferred/hold records after review |

Deferred erasure does **not** auto-delete reports or queue entries; retention skips held/queued child_safety evidence until resolved.

Reporter-owned **`chat/reports`** rows are **not deleted** while the message remains in **`safetyQueue`** or **`safetyHolds`** (open case).

## Related docs

- `docs/legal/CHILD_SAFETY_ESCALATION.md` — child_safety queue and safetyHold  
- `docs/legal/GDPR_DSA_REVIEW.md` — overall DSA/GDPR draft review
