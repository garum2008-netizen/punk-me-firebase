# t139u test plan coverage matrix (Security Review #6)

**85 case IDs.** Status: **COVERED** = automated test with verifiable assertion; **MANUAL** / **OWNER** = human sign-off. Release policy preconditions (Owner t147u): `docs/release/RELEASE_PRECONDITIONS.md`. Protective mechanisms are guarded by `scripts/safe-chat-mutation-check.mjs` (**MUT-A** hide quota, **MUT-B** cluster cap, **MUT-C** brigading, **MUT-D** false-report penalty, **MUT-E** reporter privacy, **MUT-F** global hide gate, **MUT-G** maxHold escalation / decision log, **MUT-H** P-04 redaction, **MUT-I** erasure subrequest budget, **MUT-J** erasure continuation, **MUT-K** DO re-queue on incomplete erasure). Patches apply to a temp copy of worker source (no env kill-switches in prod bundle).

| ID | Test (file: exact test name) | Status | Notes |
|----|------------------------------|--------|-------|
| F-01 | workers/safe-chat/src/integration.newbie.test.js: server child-harm filter hides message and enqueues priority queue | COVERED | |
| F-02 | workers/safe-chat/src/integration.emulator.test.js: risk: immediate_danger uses escalation tier and moderator notify | COVERED | |
| F-03 | workers/safe-chat/src/integration.newbie.test.js: t139u F-03: filter send-path hide applies to new and aged authors equally | COVERED | |
| F-04 | workers/safe-chat/src/integration.emulator.test.js: freeTextEnabled=false rejects free text, allows preset phrase | COVERED | |
| F-05 | scripts/safe-chat-child-harm.test.js: allows benign preset-like phrases | COVERED | |
| D-01 | workers/safe-chat/src/integration.emulator.test.js: risk: immediate_danger uses escalation tier and moderator notify | COVERED | |
| D-02 | workers/safe-chat/src/integration.t139u.test.js: t139u D-02: R_new13 and R_aged grooming reports both queue with same escalation | COVERED | Asserts shared escalationTier + reportMeta intrinsic scores |
| D-03 | workers/safe-chat/src/integration.emulator.test.js: risk: other_child_safety on benign phrase queues without auto-hide (false positive guard) | COVERED | |
| D-04 | workers/safe-chat/src/integration.t139u.test.js: t139u D-04: hide quota consumed then global hide still allowed with independent signal | COVERED | |
| D-05 | workers/safe-chat/src/integration.emulator.test.js: risk: banned reporter immediate_danger does not global-hide benign preset alone | COVERED | |
| D-06 | scripts/safe-chat-t139u-matrix-unit.test.js: D-06: mod alert rejects non-HTTPS URL; D-06: mod alert times out hanging endpoint | COVERED | alertFailedAt on live path in child-safety-abuse.js |
| D-07 | workers/safe-chat/src/integration.emulator.test.js: t139u D-07: evasion grooming on worker path yields reporter-local hide without global hide | COVERED | Worker report path + reporterSafetyHidden |
| O-01 | workers/safe-chat/src/integration.emulator.test.js: risk: other_child_safety on benign phrase queues without auto-hide (false positive guard) | COVERED | |
| O-02 | scripts/safe-chat-child-safety-risk.test.js: t139u O-02: global hide at independent-signal threshold not one step below | COVERED | |
| O-03 | workers/safe-chat/src/integration.protections.test.js: PROTECT O-03: benign preset other_child_safety does not global-hide without corroboration | COVERED | Live worker threshold + intrinsicRisk |
| O-04 | workers/safe-chat/src/integration.t139u.test.js: t139u O-04: safetyEvidence snapshot has minimal fields only | COVERED | |
| O-05 | workers/safe-chat/src/integration.protections.test.js: PROTECT E-05: runSlaOverdueJob marks overdue at configured SLA boundary | COVERED | |
| FM-01 | workers/safe-chat/src/integration.emulator.test.js: risk: filter miss caught by player grooming report (explicit) | COVERED | |
| FM-02 | workers/safe-chat/src/integration.t139u.test.js: t139u FM-02: fresh unaged reporter filter-miss grooming path queues report | COVERED | |
| FM-03 | docs/release/T139U_MANUAL_SCENARIOS.md: FM-03 — Phrase-only grooming sequence | MANUAL | |
| FM-04 | workers/safe-chat/src/integration.t139u.test.js: t139u FM-04: report on deleted message returns message_not_found | COVERED | |
| U-01 | workers/safe-chat/src/integration.t139u.test.js: t139u U-01: child_safety reports on distinct messages are not rate-limited (sample 35) | COVERED | 35 distinct msgs; all HTTP 200 + received |
| U-02 | workers/safe-chat/src/integration.t139u.test.js: t139u U-02: after hide quota exhausted, child_safety report still creates queue evidence | COVERED | |
| U-03 | workers/safe-chat/src/integration.t139u.test.js: t139u U-03: child_safety report accepted after generic report volume on same message | COVERED | 30 generic reporters then child_safety queues |
| U-04 | workers/safe-chat/src/integration.emulator.test.js: risk: false dismiss reduces auto-hide weight but report still accepted | COVERED | |
| U-05 | workers/safe-chat/src/integration.emulator.test.js: deduplicates reports from the same reporter | COVERED | |
| U-06 | workers/safe-chat/src/integration.t139u.test.js: t139u U-06: child_safety report handler stays under 50 fetches | COVERED | |
| B-01 | workers/safe-chat/src/integration.t139u.test.js: t139u B-01: fifty identical reports without extra signal do not global-hide | COVERED | 20 reporters / distinct IPs; case merge count |
| B-02 | workers/safe-chat/src/integration.t139u.test.js: t139u B-02: coordinated mass reports set possibleCoordination on queue | COVERED | Mutation MUT-C |
| B-03 | workers/safe-chat/src/integration.t139u.test.js: t139u B-03: distinct cluster reporters still no count-only global hide | COVERED | High intrinsic grooming text; no global hide |
| B-04 | workers/safe-chat/src/integration.protections.test.js: PROTECT cluster cap: fourth global hide from same cluster IP is blocked | COVERED | Mutation MUT-B |
| B-05 | workers/safe-chat/src/integration.emulator.test.js: security: muted reporter child_safety report still accepted | COVERED | |
| B-06 | workers/safe-chat/src/integration.emulator.test.js: risk: false dismiss reduces auto-hide weight but report still accepted | COVERED | |
| B-07 | workers/safe-chat/src/integration.t139u.test.js: t139u B-07: false-report penalty does not block later child_safety submission | COVERED | Mutation MUT-D |
| B-08 | workers/safe-chat/src/integration.t139u.test.js: t139u B-08: one safety queue row per message with merged reports | COVERED | |
| AG-01 | workers/safe-chat/src/integration.emulator.test.js: requires chatAge13DeclaredAt before send | COVERED | |
| AG-02 | workers/safe-chat/src/integration.protections.test.js: PROTECT global hide gate: single reporter cannot globally hide grooming preset alone | COVERED | Mutation MUT-F |
| AG-03 | workers/safe-chat/src/integration.emulator.test.js: risk: child-safety reports never rejected for rate limits or undeclared age | COVERED | |
| BY-01 | workers/safe-chat/src/integration.protections.test.js: PROTECT hide quota: second discretionary global hide on new messages is blocked | COVERED | Mutation MUT-A |
| BY-02 | workers/safe-chat/src/integration.t139u.test.js: t139u BY-02: delete-my-data does not clear childSafetyAutoHideDeniedUntil | COVERED | |
| BY-03 | workers/safe-chat/src/integration.protections.test.js: PROTECT hide quota: second discretionary global hide on new messages is blocked | COVERED | Same test as BY-01 (per-uid quota) |
| BY-04 | scripts/safe-chat-t139u-matrix-unit.test.js: BY-04: IPv6 /64 cluster hashes differ across /64 boundaries | COVERED | |
| BY-05 | scripts/safe-chat-t139u-matrix-unit.test.js: BY-05: missing CF-Connecting-IP uses shared unknown cluster bucket | COVERED | Fail-closed shared bucket |
| BY-06 | workers/safe-chat/src/integration.t139u.test.js: t139u BY-06: many reporters behind one IP still queue danger reports | COVERED | |
| BY-07 | scripts/test-safe-chat-rules.js: client cannot write chatMeta; client cannot set players chatAge13DeclaredAt; client cannot set players chatRegisteredAt | COVERED | |
| BY-08 | workers/safe-chat/src/integration.t139u.test.js: t139u BY-08: internal erasure-continue forbidden without secret | COVERED | |
| BY-09 | scripts/safe-chat-by09-do-restart.test.js: BY-09: child-safety hide quota persists across DO restart simulation | COVERED | Executable MemStorage restart |
| BY-10 | workers/safe-chat/src/integration.t139u.test.js: t139u BY-10: parallel reports from one uid do not exceed hide quota | COVERED | Parallel multi-msg + parallel dup on one msg |
| P-01 | workers/safe-chat/src/integration.emulator.test.js: risk: reporter privacy response has no case or target details | COVERED | Mutation MUT-E (emulator + PROTECT) |
| P-02 | workers/safe-chat/src/integration.emulator.test.js: client cannot read moderator-only safetyEvidence or safetyQueue | COVERED | |
| P-03 | workers/safe-chat/src/integration.emulator.test.js: mod API forbidden for non-moderator (moderation.html uses same API) | COVERED | |
| P-04 | workers/safe-chat/src/integration.protections.test.js: PROTECT P-04: globally hidden message text is not readable by another client | COVERED | Mutation MUT-H |
| P-05 | docs/release/T139U_MANUAL_SCENARIOS.md: P-05 — Logs and wrangler tail PII | MANUAL | |
| P-06 | workers/safe-chat/src/integration.t139u.test.js: t139u P-06: delete-my-data response lists only reporter own message ids | COVERED | Response JSON omits victim msgId; victim row retained |
| E-01 | workers/safe-chat/src/integration.protections.test.js: PROTECT E-05: runSlaOverdueJob marks overdue at configured SLA boundary | COVERED | |
| E-02 | workers/safe-chat/src/integration.t139u.test.js: t139u E-02: mod safety-queue lists immediate_danger before ordinary priority | COVERED | Sort order index immediate_danger before critical |
| E-03 | scripts/safe-chat-mod-alert.test.js: POSTs JSON when URL configured | COVERED | Owner enables URL in prod |
| E-04 | workers/safe-chat/src/integration.t139u.test.js: t139u E-04: mod safety-queue responds for many open cases | COVERED | 15 cases each present in mod queue |
| E-05 | scripts/safe-chat-t139u-matrix-unit.test.js: E-05 / FT-03: SLA overdue cron runs every 15 minutes; immediate SLA remains config | COVERED | `*/15` cron + runSlaOverdueJob |
| M-01 | workers/safe-chat/src/integration.t139u.test.js: t139u M-01: restore_visibility writes safetyDecisions entry | COVERED | Restores text from evidence |
| M-02 | workers/safe-chat/src/integration.emulator.test.js: mod API forbidden for non-moderator (moderation.html uses same API) | COVERED | |
| M-03 | workers/safe-chat/src/integration.t139u.test.js: t139u M-03: mod uphold_delete removes message after safety review | COVERED | |
| M-04 | workers/safe-chat/src/integration.t139u.test.js: t139u M-04: mod ban prevents send but not child_safety report acceptance | COVERED | Send non-200 + report received |
| M-05 | workers/safe-chat/src/integration.t139u.test.js: t139u M-05: mod resolve-safety rejects invalid_action | COVERED | |
| M-06 | workers/safe-chat/src/integration.emulator.test.js: risk: appeal and moderator restore after wrongful hide | COVERED | |
| M-07 | workers/safe-chat/src/integration.t139u.test.js: t139u M-07: client cannot PATCH chat internal reportCounts | COVERED | |
| M-08 | workers/safe-chat/src/integration.t139u.test.js: t139u M-08: mod can list reports and delete message | COVERED | |
| R-01 | workers/safe-chat/src/integration.emulator.test.js: security: reportMeta stores reporterSid not raw uid | COVERED | |
| R-02 | workers/safe-chat/src/integration.emulator.test.js: client cannot read moderator-only safetyEvidence or safetyQueue | COVERED | |
| R-03 | workers/safe-chat/src/integration.emulator.test.js: retention deletes messages >7d and reports >90d (test clock) | COVERED | |
| R-04 | workers/safe-chat/src/integration.emulator.test.js: retention enforces legalHoldUntil and maxHoldUntil (R-04) | COVERED | Escalates; no silent unhide; MUT-G |
| R-05 | workers/safe-chat/src/integration.t139u.test.js: t139u R-05: erasureDeferred snapshot carries expiresAt | COVERED | |
| R-06 | workers/safe-chat/src/integration.t139u.test.js: t139u R-06: reporter delete-my-data removes own generic report rows | COVERED | |
| R-07 | workers/safe-chat/src/integration.emulator.test.js: security: erasure completes after stale cursor (NEW-11b) | COVERED | |
| R-08 | scripts/safe-chat-limits-do-erasure-alarm.test.js: R-08: alarm keeps uid in queue when worker URL or secret missing; R-08: alarm re-queues uid when internal erasure fetch returns HTTP 500 | COVERED | Backoff + 500 re-queue |
| R-09 | workers/safe-chat/src/integration.t139u.test.js: t139u R-09: safetyEvidence maxHoldUntil matches config retention cap | COVERED | Live evidence maxHoldUntil vs 365d config |
| FT-01 | workers/safe-chat/src/integration.erasure.test.js: H-1: erasure deletes 25 own messages with zero leftovers and metadata cleared; H-1: erasure deletes 50 own messages with zero leftovers and metadata cleared | COVERED | Real completion + metadata |
| FT-02 | scripts/safe-chat-t139u-matrix-unit.test.js: FT-02: free-tier config enforces sqlite DO class; scripts/run-safe-chat-tests.mjs: wrangler deploy --dry-run (no publish) | COVERED | wrangler.toml + dry-run bundle |
| FT-03 | scripts/safe-chat-t139u-matrix-unit.test.js: E-05 / FT-03: SLA overdue cron runs every 15 minutes; immediate SLA remains config | COVERED | |
| FT-04 | workers/safe-chat/src/integration.protections.test.js: PROTECT erasure budget: delete-my-data subrequests stay within configured max | COVERED | Mutation MUT-I; config caps in unit test |
| C-01 | workers/safe-chat/src/integration.emulator.test.js: requires chatAge13DeclaredAt before send | COVERED | |
| C-02 | workers/safe-chat/src/integration.emulator.test.js: freeTextEnabled=false rejects free text, allows preset phrase | COVERED | |
| C-03 | workers/safe-chat/src/integration.emulator.test.js: server blocklist hides peer by sid | COVERED | |
| C-04 | workers/safe-chat/src/integration.t139u.test.js: t139u C-04: chat config exposes childSafetySubcategories for client picker | COVERED | |
| C-05 | none | OWNER | Mod capacity / SLA operational sign-off |

## Matrix totals (85 case IDs)

| Status | Count |
|--------|------:|
| COVERED | 81 |
| PARTIAL | 0 |
| WEAK | 0 |
| MANUAL | 2 |
| OWNER | 1 |
| **Total** | **85** |

Harness: `npm run test:safe-chat`. Mutation guard: `node scripts/safe-chat-mutation-check.mjs` (full integration vitest suite).
