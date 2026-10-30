# Child safety escalation procedure (DRAFT — not approved policy)

> **Owner review required (Inna). This document does not authorize automated law-enforcement contact.**

## Owner rule (non-negotiable)

Suspected **child harm** content must be **hidden from public view immediately** and sent to a **priority moderator queue**, with **evidence retained** until a moderator decides.

## Two paths

| Path | Hide? | Queue |
|------|-------|-------|
| **Server filter** (`detectChildHarmSignals`) | **Always immediately** | Critical + evidence |
| **`child_safety` report** | Immediately **only if abuse controls allow** | **Always** critical + evidence |

Filter detection is **not** subject to reporter quotas, cluster caps, or reputation.

## Report path — abuse controls (reporter-side)

All reports require server **`chatMeta.chatAge13DeclaredAt`**, and reporter must not be **muted/banned**.

1. **Hide quota (24h rolling, DO):** low-trust (new / low send history) **1 hide/day**; trusted **3 hides/day**. Over quota → report still **queues**, **no new hide** (message stays visible unless already hidden).
2. **Reputation:** moderator **`dismiss` + `falseReport`** → reporter **queue-only for 30 days** (`childSafetyHideDeniedUntil`). Repeated false reports → **auto-mute** (pending mod review).
3. **Author brigading signal:** if the **same author** receives **>N** distinct **low-trust** hides in a short window **without filter trigger**, queue item flagged **`possibleBrigading`** + **`moderatorNotify`** (message **stays hidden** until mod **`restore_visibility`** or uphold).
4. **Cluster cap (optional):** salted HMAC of IPv4 **/24** in DO only — max hides per cluster per 24h. See `docs/legal/CHAT_PRIVACY.md`.
5. **Moderator:** **`restore_visibility`** one-click unhide + decision log; **`confirm_legal_hold`** for extended hold; SLA via existing **`overdue`** escalation.

## Residual risk (accepted)

A determined attacker with **many aged, trusted accounts** can still hide a **limited** number of messages until moderator review. This is accepted because **child-protection immediate hide** is owner priority. Mitigations: quotas, cluster cap, brigading flag, reputation, mod SLA.

## Related

- `docs/legal/CHILD_HARM_EVIDENCE_RETENTION.md` — retention & access  
- `docs/legal/CHAT_PRIVACY.md` — cluster HMAC  
- `docs/release/SAFE_CHAT_REPORT.md` — test matrix
