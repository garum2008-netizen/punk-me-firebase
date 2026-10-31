# Safe chat — release preconditions (Owner t147u / Inna Kragh)

## Product policy (CEO option 1 — approved)

- **Hide decisions use risk signals**, not reporter reputation. Reporter credibility and account age only adjust scoring weight; they do **not** gate report acceptance and must **not** alone cause a global hide.
- **Global hide** requires an **independent signal** (filter child-harm hit, author confirmed violation history, or two independent reporters from distinct clusters). Without that signal, the case is **urgently queued** and the reporter may get **reporter-local hide** only — never automatic trust in a single anonymous report.
- **`immediate_danger`** means **immediate escalation** (priority, SLA target, optional mod alert hook). It does **not** bypass the independent-signal gate for global hide on preset-only or benign content.

Implementation: `workers/safe-chat/src/child-safety-risk.js` (`hasGlobalHideIndependentSignal`, `decideChildSafetyAction`), wired in `index.js` `handleReport`.

## SLA defaults (4h / 24h) — operational precondition

Config keys (emulator + production via env):

- `SAFE_CHAT_IMMEDIATE_DANGER_SLA_MS` — default 4 hours
- `SAFE_CHAT_SAFETY_QUEUE_ESCALATE_MS` — default 24 hours (via `safetyQueueEscalateMs` in config)

These defaults are **accepted in code** but **not a production commitment** until all of the following are true:

1. A **responsible moderator** is assigned to the product (roster / on-call), and
2. **`SAFE_CHAT_MOD_ALERT_URL`** is set to a working **HTTPS** endpoint and delivery has been verified end-to-end, and
3. Moderation tooling (`moderation.html` + `/api/mod/*`) is in routine use for the environment.

Until then:

- SLA fields are written on queue rows for **testing and future ops** (`slaReviewBy`, `runSlaOverdueJob` on `*/15` cron).
- **Moderator alerts are disabled** when `SAFE_CHAT_MOD_ALERT_URL` is unset, empty, or `disabled` (`workers/safe-chat/src/mod-alert.js` returns `{ sent: false, reason: "disabled" }`).

Do **not** treat overdue SLA cron output as an operational incident until the preconditions above are met.

## Preset-phrases-first release blockers (automated)

Chat stays on a **separate track** until Security review PASS. For the first release with **`SAFE_CHAT_FREE_TEXT=false`** only, CI must keep passing:

| Blocker | Requirement | Automated coverage |
|---------|-------------|-------------------|
| Hidden content | Clients must not read globally hidden message bodies | `integration.t139u.test.js` P-04; `integration.protections.test.js` PROTECT P-04 / P-04g; `integration.emulator.test.js` risk privacy paths |
| Block / ban | Mute/ban must block send; must not bypass safety reporting | `integration.t139u.test.js` M-04; `integration.emulator.test.js` muted/banned reporter tests |
| Erasure | Delete-my-data must actually remove own messages via cron queue (≤40 subrequests/hop) | `integration.erasure.test.js` H-1 + FT-04; `integration.emulator.test.js` large-set + NEW-11b |

Run: `npm run test:safe-chat` (0 skipped).

## Chat track vs Security PASS

- No production deploy or merge to `main` from the safe-chat worker PR until Security Governor review PASS on the pinned SHA.
- Free text, expanded SLA ops, and mod-alert paging remain **out of scope** for the preset-only launch unless explicitly re-approved after preconditions are met.
