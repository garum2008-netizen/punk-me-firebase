# t139u test plan coverage matrix (automated vs manual)

Mapped from `PUNK_REVIEW4_c579754_02b1.md` item 2 and `PUNK_t139u_TEST_PLAN_ed48.md` (HEAD `c579754`). **85 case IDs:** F, D, O, FM, U, B, BY, P, E, M, R, FT, C (through C-05), plus AG-01..AG-03 (OD:4). Status meanings: **COVERED** = automated test matches the plan criterion; **PARTIAL** / **WEAK** = test exists but does not fully prove it; **GAP** = no adequate automated test; **MANUAL** / **OWNER** = human sign-off.

Parameterised thresholds: `SAFE_CHAT_CHILD_SAFETY_RISK_*`, `SAFE_CHAT_IMMEDIATE_DANGER_SLA_MS`, hide quotas in `config.js` / `wrangler.toml` vars.

| ID | Test (file: exact test name or "none") | Status | Notes |
|----|----------------------------------------|--------|-------|
| F-01 | workers/safe-chat/src/integration.newbie.test.js: server child-harm filter hides message and enqueues priority queue | COVERED | Does not use one fixture per harm category |
| F-02 | none | GAP | No test asserts `slaReviewBy` or `legalHoldUntil`; prior matrix PASS claim unsupported |
| F-03 | workers/safe-chat/src/integration.emulator.test.js: filter-detected message content hides regardless of reporter auto-hide quota | WEAK | Uses report path, not send-path filter hide for aged vs new author |
| F-04 | workers/safe-chat/src/integration.emulator.test.js: freeTextEnabled=false rejects free text, allows preset phrase; workers/safe-chat/src/prod-config.test.js: free text off and production CORS default | COVERED | |
| F-05 | scripts/safe-chat-child-harm.test.js: allows benign preset-like phrases | COVERED | Small FP corpus |
| D-01 | workers/safe-chat/src/integration.emulator.test.js: risk: immediate_danger uses escalation tier and moderator notify | COVERED | |
| D-02 | workers/safe-chat/src/integration.emulator.test.js: risk: unaged reporter grooming report with message context queues; global hide needs independent signal | PARTIAL | R_new only; no R_new13 or R_aged reporter fixtures |
| D-03 | workers/safe-chat/src/integration.emulator.test.js: risk: other_child_safety on benign phrase queues without auto-hide (false positive guard) | WEAK | Not high-tier category; R4 scratch A1: `immediate_danger` can hide with no corroboration (H-2) |
| D-04 | workers/safe-chat/src/integration.emulator.test.js: risk: high-tier hide with independent signal despite hide quota | WEAK | Does not assert discretionary quota was consumed first |
| D-05 | workers/safe-chat/src/integration.emulator.test.js: risk: banned reporter immediate_danger does not global-hide benign preset alone | WEAK | R4 A2: banned + `immediate_danger` can hide (H-2) |
| D-06 | scripts/safe-chat-mod-alert.test.js: is disabled without URL; POSTs JSON when URL configured | PARTIAL | No `alertDeliveredAt` assertion; no webhook timeout test |
| D-07 | scripts/safe-chat-child-safety-risk.test.js: global hide requires independent signal even with grooming context; scripts/safe-chat-filter-bypass.test.js (corpus) | PARTIAL | No danger report on filter-evasion text |
| O-01 | workers/safe-chat/src/integration.emulator.test.js: risk: other_child_safety on benign phrase queues without auto-hide (false positive guard) | COVERED | |
| O-02 | scripts/safe-chat-child-safety-risk.test.js: coordinated mass reports add zero reporter boost; workers/safe-chat/src/integration.emulator.test.js: reports from three players auto-hide message | PARTIAL | No step-by-step threshold sweep vs config |
| O-03 | none | GAP | Thresholds in config.js only |
| O-04 | workers/safe-chat/src/integration.emulator.test.js: child_safety hides after trusted reporter age and retains evidence on author erasure | PARTIAL | |
| O-05 | none | GAP | No test references overdue SLA; daily cron vs 4h SLA (E-05) |
| FM-01 | workers/safe-chat/src/integration.emulator.test.js: risk: filter miss caught by player grooming report (explicit) | COVERED | |
| FM-02 | workers/safe-chat/src/integration.emulator.test.js: risk: filter miss caught by player grooming report (explicit) | PARTIAL | Same test as FM-01; fresh reporter only |
| FM-03 | none | MANUAL | Phrase-only prod; no multi-message evidence link in v1 |
| FM-04 | none | GAP | Deleted-message report behaviour not implemented |
| U-01 | workers/safe-chat/src/integration.emulator.test.js: security: child_safety reports bypass daily report cap (U-01 sample) | PARTIAL | 12 reports, not 200 |
| U-02 | workers/safe-chat/src/integration.emulator.test.js: risk: child-safety reports never rejected for rate limits or undeclared age | COVERED | |
| U-03 | workers/safe-chat/src/integration.emulator.test.js: duplicate reports do not consume global per-message report cap | WEAK | Does not fill cap with ~150 distinct reporters |
| U-04 | workers/safe-chat/src/integration.emulator.test.js: risk: false dismiss reduces auto-hide weight but report still accepted | COVERED | |
| U-05 | workers/safe-chat/src/integration.emulator.test.js: deduplicates reports from the same reporter | COVERED | |
| U-06 | none | GAP | R4 R1: ~24 RTDB fetches per child-safety report; no fetch-budget integration test |
| B-01 | workers/safe-chat/src/integration.emulator.test.js: risk: mass identical coordinated reports do not hide from count alone | PARTIAL | 6 accounts, not 50 |
| B-02 | workers/safe-chat/src/integration.emulator.test.js: risk: mass identical coordinated reports do not hide from count alone | PARTIAL | Single IP via test harness |
| B-03 | none | GAP | |
| B-04 | none | GAP | Burst breaker not implemented; R4 A1 unbounded recent-message hide |
| B-05 | workers/safe-chat/src/integration.emulator.test.js: security: muted reporter child_safety report still accepted | COVERED | Submission accepted; hide leg not fully proven for ban/mute |
| B-06 | workers/safe-chat/src/integration.emulator.test.js: risk: false dismiss reduces auto-hide weight but report still accepted | PARTIAL | |
| B-07 | none | GAP | No test for `childSafetyFalseStrikes` |
| B-08 | workers/safe-chat/src/integration.emulator.test.js: risk: mass identical coordinated reports do not hide from count alone | WEAK | Asserts merged case length, not full anti-brigade criterion |
| AG-01 | workers/safe-chat/src/integration.emulator.test.js: requires chatAge13DeclaredAt before send | COVERED | Send path age gate (OD:4 companion) |
| AG-02 | workers/safe-chat/src/integration.emulator.test.js: risk: unaged reporter grooming report with message context queues; global hide needs independent signal | COVERED | Danger report without age declaration |
| AG-03 | workers/safe-chat/src/integration.emulator.test.js: risk: child-safety reports never rejected for rate limits or undeclared age | COVERED | |
| BY-01 | none | GAP | |
| BY-02 | none | GAP | |
| BY-03 | none | GAP | |
| BY-04 | scripts/safe-chat-cluster-ipv6.test.js: hashes IPv6 /64 | PARTIAL | Unit hash only; no Worker hide cap integration |
| BY-05 | none | GAP | No `X-Forwarded-For` cluster tests |
| BY-06 | none | GAP | |
| BY-07 | scripts/test-safe-chat-rules.js: client cannot write chatMeta; client cannot set players chatAge13DeclaredAt; client cannot set players chatRegisteredAt; workers/safe-chat/src/integration.emulator.test.js: players level does not affect server chat tier (young account limits) | COVERED | |
| BY-08 | none | GAP | Internal erasure endpoints untested; secret compare not constant-time (R4 LOW) |
| BY-09 | none | MANUAL | DO restart / cluster state after outage |
| BY-10 | none | GAP | No parallel coordination load test |
| P-01 | workers/safe-chat/src/integration.emulator.test.js: risk: reporter privacy response has no case or target details | COVERED | Single response branch |
| P-02 | workers/safe-chat/src/integration.emulator.test.js: client cannot read moderator-only safetyEvidence or safetyQueue; scripts/test-safe-chat-rules.js: client read chat/internal/safetyEvidence denied | COVERED | |
| P-03 | workers/safe-chat/src/integration.emulator.test.js: mod API forbidden for non-moderator (moderation.html uses same API) | COVERED | |
| P-04 | none | GAP | KNOWN: hidden message text still readable under `chat/messages` |
| P-05 | none | MANUAL | Logs / wrangler tail PII review |
| P-06 | none | GAP | Reporter `delete-my-data` must not leak reported child |
| E-01 | none | GAP | |
| E-02 | none | GAP | |
| E-03 | scripts/safe-chat-mod-alert.test.js: POSTs JSON when URL configured | PARTIAL | No real notification channel |
| E-04 | none | GAP | |
| E-05 | none | GAP | Cron `0 4 * * *` cannot meet 4h immediate-danger SLA without webhook or polling |
| M-01 | workers/safe-chat/src/integration.emulator.test.js: moderator restore_visibility unhides with decision log | WEAK | Asserts `restoredAt`, not `safetyDecisions` entry |
| M-02 | workers/safe-chat/src/integration.emulator.test.js: mod API forbidden for non-moderator (moderation.html uses same API) | PARTIAL | |
| M-03 | none | GAP | |
| M-04 | none | GAP | |
| M-05 | none | GAP | No `invalid_action` / dismiss typo guard test; prior matrix PASS unsupported |
| M-06 | workers/safe-chat/src/integration.emulator.test.js: risk: appeal and moderator restore after wrongful hide | COVERED | |
| M-07 | scripts/test-safe-chat-rules.js: client PUT chat/internal denied | PARTIAL | Rules only |
| M-08 | workers/safe-chat/src/integration.emulator.test.js: mod can list reports and delete message | PARTIAL | |
| R-01 | workers/safe-chat/src/integration.emulator.test.js: security: reportMeta stores reporterSid not raw uid | COVERED | |
| R-02 | workers/safe-chat/src/integration.emulator.test.js: client cannot read moderator-only safetyEvidence or safetyQueue | COVERED | |
| R-03 | workers/safe-chat/src/integration.emulator.test.js: retention deletes messages >7d and reports >90d (test clock) | PARTIAL | Not per mod decision path |
| R-04 | none | GAP | R4 RT1: `maxHoldUntil` written but not enforced as cap while queued |
| R-05 | workers/safe-chat/src/integration.emulator.test.js: child_safety evidence defers author erasure until moderator resolves | PARTIAL | No `expiresAt` enforcement check |
| R-06 | none | GAP | No reporter-hash erasure test |
| R-07 | workers/safe-chat/src/integration.emulator.test.js: security: erasure completes after stale cursor (NEW-11b) | WEAK | Cursor not truly stale; assertion tautological; R4 E1 |
| R-08 | none | GAP | Integration uses in-process drain; DO alarm queue drop untested (R4 D1) |
| R-09 | none | GAP | Doc vs code trace for CHILD_HARM_EVIDENCE_RETENTION.md |
| FT-01 | workers/safe-chat/src/prod-config.test.js: free text off and production CORS default; scripts/test-safe-chat-prod-config.mjs | GAP | R4 E2: erasure exceeds 50 subrequests (~4+ own messages) |
| FT-02 | scripts/test-safe-chat-free-tier-config.mjs | PARTIAL | `new_sqlite_classes` check |
| FT-03 | none | GAP | |
| FT-04 | none | GAP | |
| C-01 | workers/safe-chat/src/integration.emulator.test.js: requires chatAge13DeclaredAt before send; workers/safe-chat/src/integration.newbie.test.js: first 10 minutes allows only preset phrases | COVERED | |
| C-02 | workers/safe-chat/src/integration.emulator.test.js: freeTextEnabled=false rejects free text, allows preset phrase; workers/safe-chat/src/prod-config.test.js: free text off and production CORS default | COVERED | |
| C-03 | workers/safe-chat/src/integration.emulator.test.js: server blocklist hides peer by sid | COVERED | |
| C-04 | none | PARTIAL | Documented in CHILD_SAFETY_ESCALATION / client picker; no dedicated CI case |
| C-05 | none | OWNER | Mod capacity and immediate-danger SLA operational sign-off |

## Matrix totals (85 case IDs)

| Status | Count |
|--------|------:|
| COVERED | 23 |
| PARTIAL | 19 |
| WEAK | 8 |
| GAP | 31 |
| MANUAL | 3 |
| OWNER | 1 |
| **Total** | **85** |

See `npm run test:safe-chat` for current harness pass/fail (suite green ≠ plan COVERED).
