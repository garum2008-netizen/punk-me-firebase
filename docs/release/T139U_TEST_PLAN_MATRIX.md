# t139u test plan coverage matrix (automated vs manual)

Mapped from `PUNK_t139u_TEST_PLAN_ed48.md` and Security Review #4. **85 case IDs.** Status: **COVERED** = automated test with verifiable assertion; **MANUAL** = step scenario in `T139U_MANUAL_SCENARIOS.md`; **OWNER** = operational sign-off.

Parameterised thresholds: `SAFE_CHAT_CHILD_SAFETY_RISK_*`, `SAFE_CHAT_IMMEDIATE_DANGER_SLA_MS`, hide quotas in `config.js` / `wrangler.toml`.

| ID | Test (file: exact test name) | Status | Notes |
|----|------------------------------|--------|-------|
| F-01 | workers/safe-chat/src/integration.newbie.test.js: server child-harm filter hides message and enqueues priority queue | COVERED | |
| F-02 | workers/safe-chat/src/integration.emulator.test.js: risk: immediate_danger uses escalation tier and moderator notify | COVERED | |
| F-03 | workers/safe-chat/src/integration.newbie.test.js: t139u F-03: filter send-path hide applies to new and aged authors equally | COVERED | Send path filter hide |
| F-04 | workers/safe-chat/src/integration.emulator.test.js: freeTextEnabled=false rejects free text, allows preset phrase | COVERED | |
| F-05 | scripts/safe-chat-child-harm.test.js: allows benign preset-like phrases | COVERED | |
| D-01 | workers/safe-chat/src/integration.emulator.test.js: risk: immediate_danger uses escalation tier and moderator notify | COVERED | |
| D-02 | workers/safe-chat/src/integration.t139u.test.js: t139u D-02: R_new13 and R_aged grooming reports both queue with same escalation | COVERED | |
| D-03 | workers/safe-chat/src/integration.emulator.test.js: risk: other_child_safety on benign phrase queues without auto-hide (false positive guard) | COVERED | |
| D-04 | workers/safe-chat/src/integration.t139u.test.js: t139u D-04: hide quota consumed then global hide still allowed with independent signal | COVERED | |
| D-05 | workers/safe-chat/src/integration.emulator.test.js: risk: banned reporter immediate_danger does not global-hide benign preset alone | COVERED | |
| D-06 | scripts/safe-chat-t139u-matrix-unit.test.js: D-06: mod alert rejects non-HTTPS URL; scripts/safe-chat-t139u-matrix-unit.test.js: D-06: mod alert times out hanging endpoint | COVERED | |
| D-07 | scripts/safe-chat-t139u-matrix-unit.test.js: D-07: evasion grooming text still yields reporter-local hide path without global signal | COVERED | |
| O-01 | workers/safe-chat/src/integration.emulator.test.js: risk: other_child_safety on benign phrase queues without auto-hide (false positive guard) | COVERED | |
| O-02 | scripts/safe-chat-child-safety-risk.test.js: t139u O-02: global hide at independent-signal threshold not one step below | COVERED | |
| O-03 | scripts/safe-chat-t139u-matrix-unit.test.js: O-03: risk hide thresholds match documented config defaults | COVERED | |
| O-04 | workers/safe-chat/src/integration.t139u.test.js: t139u O-04: safetyEvidence snapshot has minimal fields only | COVERED | |
| O-05 | workers/safe-chat/src/integration.t139u.test.js: t139u O-05 / E-01: retention marks safety queue overdue after SLA | COVERED | |
| FM-01 | workers/safe-chat/src/integration.emulator.test.js: risk: filter miss caught by player grooming report (explicit) | COVERED | |
| FM-02 | workers/safe-chat/src/integration.t139u.test.js: t139u FM-02: fresh unaged reporter filter-miss grooming path queues report | COVERED | |
| FM-03 | docs/release/T139U_MANUAL_SCENARIOS.md: FM-03 — Phrase-only grooming sequence | MANUAL | Multi-message phrase-only prod |
| FM-04 | workers/safe-chat/src/integration.t139u.test.js: t139u FM-04: report on deleted message returns message_not_found | COVERED | |
| U-01 | workers/safe-chat/src/integration.t139u.test.js: t139u U-01: child_safety reports on distinct messages are not rate-limited (sample 35) | COVERED | Sample 35 (plan 200) |
| U-02 | workers/safe-chat/src/integration.t139u.test.js: t139u U-02: after hide quota exhausted, child_safety report still creates queue evidence | COVERED | |
| U-03 | workers/safe-chat/src/integration.t139u.test.js: t139u U-03: child_safety report accepted after generic report volume on same message | COVERED | 30 distinct reporters sample |
| U-04 | workers/safe-chat/src/integration.emulator.test.js: risk: false dismiss reduces auto-hide weight but report still accepted | COVERED | |
| U-05 | workers/safe-chat/src/integration.emulator.test.js: deduplicates reports from the same reporter | COVERED | |
| U-06 | workers/safe-chat/src/integration.t139u.test.js: t139u U-06: child_safety report handler stays under 50 fetches | COVERED | |
| B-01 | workers/safe-chat/src/integration.t139u.test.js: t139u B-01: fifty identical reports without extra signal do not global-hide | COVERED | 12-reporter sample |
| B-02 | workers/safe-chat/src/integration.t139u.test.js: t139u B-02: coordinated mass reports set possibleCoordination on queue | COVERED | |
| B-03 | workers/safe-chat/src/integration.t139u.test.js: t139u B-03: distinct cluster reporters still no count-only global hide | COVERED | |
| B-04 | workers/safe-chat/src/integration.t139u.test.js: t139u B-04: cluster hide cap blocks excess global hides from one cluster | COVERED | Cluster cap, not separate burst breaker |
| B-05 | workers/safe-chat/src/integration.emulator.test.js: security: muted reporter child_safety report still accepted | COVERED | |
| B-06 | workers/safe-chat/src/integration.emulator.test.js: risk: false dismiss reduces auto-hide weight but report still accepted | COVERED | |
| B-07 | workers/safe-chat/src/integration.t139u.test.js: t139u B-07: false-report penalty does not block later child_safety submission | COVERED | |
| B-08 | workers/safe-chat/src/integration.t139u.test.js: t139u B-08: one safety queue row per message with merged reports | COVERED | |
| AG-01 | workers/safe-chat/src/integration.emulator.test.js: requires chatAge13DeclaredAt before send | COVERED | |
| AG-02 | workers/safe-chat/src/integration.emulator.test.js: risk: unaged reporter grooming report with message context queues; global hide needs independent signal | COVERED | |
| AG-03 | workers/safe-chat/src/integration.emulator.test.js: risk: child-safety reports never rejected for rate limits or undeclared age | COVERED | |
| BY-01 | workers/safe-chat/src/integration.t139u.test.js: t139u BY-01: fresh accounts cannot exceed low-trust hide quota | COVERED | |
| BY-02 | workers/safe-chat/src/integration.t139u.test.js: t139u BY-02: delete-my-data does not clear childSafetyAutoHideDeniedUntil | COVERED | |
| BY-03 | workers/safe-chat/src/integration.t139u.test.js: t139u BY-03: per-uid hide quota applies regardless of IP change | COVERED | |
| BY-04 | scripts/safe-chat-t139u-matrix-unit.test.js: BY-04: IPv6 /64 cluster hashes differ across /64 boundaries | COVERED | |
| BY-05 | scripts/safe-chat-t139u-matrix-unit.test.js: BY-05: clusterHashFromRequest ignores X-Forwarded-For without CF-Connecting-IP | COVERED | CF-Connecting-IP only |
| BY-06 | workers/safe-chat/src/integration.t139u.test.js: t139u BY-06: many reporters behind one IP still queue danger reports | COVERED | |
| BY-07 | scripts/test-safe-chat-rules.js: client cannot write chatMeta; scripts/test-safe-chat-rules.js: client cannot set players chatAge13DeclaredAt; scripts/test-safe-chat-rules.js: client cannot set players chatRegisteredAt | COVERED | |
| BY-08 | workers/safe-chat/src/integration.t139u.test.js: t139u BY-08: internal erasure-continue forbidden without secret | COVERED | |
| BY-09 | docs/release/T139U_MANUAL_SCENARIOS.md: BY-09 — DO persistence after restart | MANUAL | DO restart in staging |
| BY-10 | workers/safe-chat/src/integration.t139u.test.js: t139u BY-10: parallel reports from one uid do not exceed hide quota | COVERED | |
| P-01 | workers/safe-chat/src/integration.emulator.test.js: risk: reporter privacy response has no case or target details | COVERED | |
| P-02 | workers/safe-chat/src/integration.emulator.test.js: client cannot read moderator-only safetyEvidence or safetyQueue | COVERED | |
| P-03 | workers/safe-chat/src/integration.emulator.test.js: mod API forbidden for non-moderator (moderation.html uses same API) | COVERED | |
| P-04 | workers/safe-chat/src/integration.t139u.test.js: t139u P-04: hidden messages retain text in RTDB (client must not render) | COVERED | KNOWN: rules allow read; client must redact |
| P-05 | docs/release/T139U_MANUAL_SCENARIOS.md: P-05 — Logs and wrangler tail PII | MANUAL | |
| P-06 | workers/safe-chat/src/integration.t139u.test.js: t139u P-06: delete-my-data response lists only reporter own message ids | COVERED | |
| E-01 | workers/safe-chat/src/integration.t139u.test.js: t139u O-05 / E-01: retention marks safety queue overdue after SLA | COVERED | |
| E-02 | workers/safe-chat/src/integration.t139u.test.js: t139u E-02: mod safety-queue lists immediate_danger before ordinary priority | COVERED | |
| E-03 | scripts/safe-chat-mod-alert.test.js: POSTs JSON when URL configured | COVERED | Stub channel; owner enables URL in prod |
| E-04 | workers/safe-chat/src/integration.t139u.test.js: t139u E-04: mod safety-queue responds for many open cases | COVERED | 15-case sample |
| E-05 | scripts/safe-chat-t139u-matrix-unit.test.js: E-05 / FT-03: wrangler cron is daily; immediate SLA is 4h (documented gap) | COVERED | Documents daily cron vs 4h SLA |
| M-01 | workers/safe-chat/src/integration.t139u.test.js: t139u M-01: restore_visibility writes safetyDecisions entry | COVERED | |
| M-02 | workers/safe-chat/src/integration.emulator.test.js: mod API forbidden for non-moderator (moderation.html uses same API) | COVERED | |
| M-03 | workers/safe-chat/src/integration.t139u.test.js: t139u M-03: mod uphold_delete removes message after safety review | COVERED | |
| M-04 | workers/safe-chat/src/integration.t139u.test.js: t139u M-04: mod ban prevents send but not child_safety report acceptance | COVERED | |
| M-05 | workers/safe-chat/src/integration.t139u.test.js: t139u M-05: mod resolve-safety rejects invalid_action | COVERED | |
| M-06 | workers/safe-chat/src/integration.emulator.test.js: risk: appeal and moderator restore after wrongful hide | COVERED | |
| M-07 | workers/safe-chat/src/integration.t139u.test.js: t139u M-07: client cannot PATCH chat internal reportCounts | COVERED | |
| M-08 | workers/safe-chat/src/integration.t139u.test.js: t139u M-08: mod can list reports and delete message | COVERED | |
| R-01 | workers/safe-chat/src/integration.emulator.test.js: security: reportMeta stores reporterSid not raw uid | COVERED | |
| R-02 | workers/safe-chat/src/integration.emulator.test.js: client cannot read moderator-only safetyEvidence or safetyQueue | COVERED | |
| R-03 | workers/safe-chat/src/integration.emulator.test.js: retention deletes messages >7d and reports >90d (test clock) | COVERED | |
| R-04 | workers/safe-chat/src/integration.t139u.test.js: t139u R-04: retention enforces legalHoldUntil cap on open case | COVERED | |
| R-05 | workers/safe-chat/src/integration.t139u.test.js: t139u R-05: erasureDeferred snapshot carries expiresAt | COVERED | |
| R-06 | workers/safe-chat/src/integration.t139u.test.js: t139u R-06: reporter delete-my-data removes own generic report rows | COVERED | |
| R-07 | workers/safe-chat/src/integration.emulator.test.js: security: erasure completes after stale cursor (NEW-11b) | COVERED | |
| R-08 | scripts/safe-chat-limits-do-erasure-alarm.test.js: R-08: alarm keeps uid in queue when worker URL or secret missing; scripts/safe-chat-limits-do-erasure-alarm.test.js: R-08: alarm re-queues uid when internal erasure fetch fails | COVERED | |
| R-09 | scripts/safe-chat-t139u-matrix-unit.test.js: R-09: evidence max hold documented in config matches CHILD_HARM doc reference | COVERED | |
| FT-01 | workers/safe-chat/src/integration.emulator.test.js: security: erasure subrequests stay within budget for 25 own messages (FT-01) | COVERED | |
| FT-02 | scripts/safe-chat-t139u-matrix-unit.test.js: FT-02: free-tier config enforces sqlite DO class | COVERED | |
| FT-03 | scripts/safe-chat-t139u-matrix-unit.test.js: E-05 / FT-03: wrangler cron is daily; immediate SLA is 4h (documented gap) | COVERED | |
| FT-04 | scripts/safe-chat-t139u-matrix-unit.test.js: FT-04: erasure and retention batch sizes stay under Workers free subrequest budget | COVERED | |
| C-01 | workers/safe-chat/src/integration.emulator.test.js: requires chatAge13DeclaredAt before send | COVERED | |
| C-02 | workers/safe-chat/src/integration.emulator.test.js: freeTextEnabled=false rejects free text, allows preset phrase | COVERED | |
| C-03 | workers/safe-chat/src/integration.emulator.test.js: server blocklist hides peer by sid | COVERED | |
| C-04 | workers/safe-chat/src/integration.t139u.test.js: t139u C-04: chat config exposes childSafetySubcategories for client picker | COVERED | |
| C-05 | none | OWNER | Mod capacity and immediate-danger SLA operational sign-off |

## Matrix totals (85 case IDs)

| Status | Count |
|--------|------:|
| COVERED | 81 |
| MANUAL | 3 |
| OWNER | 1 |
| **Total** | **85** |

Manual scenarios: `docs/release/T139U_MANUAL_SCENARIOS.md`. Harness: `npm run test:safe-chat`.
