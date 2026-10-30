# t139u test plan coverage matrix (automated vs manual)

Parameterised thresholds: `SAFE_CHAT_CHILD_SAFETY_RISK_*`, `SAFE_CHAT_IMMEDIATE_DANGER_SLA_MS`, hide quotas in `config.js` / `wrangler.toml` vars.

| ID | Automated test | Status | Notes |
|----|----------------|--------|-------|
| F-01 | `integration.newbie.test.js` child-harm filter hide | PASS | freeText in newbie suite only |
| F-02 | queue `slaReviewBy` / `legalHoldUntil` in integration retention | PASS | |
| F-03 | filter mandatory hide integration | PASS | |
| F-04 | `integration.emulator` free_text_disabled + prod-config guard | PASS | |
| F-05 | `safe-chat-child-harm.test.js` benign phrases | PASS | FP list in test file |
| D-01 | `risk: immediate_danger uses escalation tier` | PASS | |
| D-02 | `risk: unaged reporter grooming report with message context still hides` | PASS | |
| D-03 | `risk: other_child_safety on benign phrase queues without auto-hide` | PASS | |
| D-04 | `risk: high-tier hide bypasses discretionary hide quota` | PASS | |
| D-05 | `risk: banned reporter submission accepted` | PASS | OD:11 precedence documented in CHILD_SAFETY_ESCALATION |
| D-06 | `safe-chat-mod-alert.test.js` + queue `alertDeliveredAt` when URL set | PASS | Disabled in prod until `SAFE_CHAT_MOD_ALERT_URL` |
| D-07 | context signals in `child-safety-risk.js` + grooming tests | PASS | |
| O-01..O-05 | risk integration + config thresholds in SAFE_CHAT_REPORT | PASS/PARTIAL | O-05 SLA overdue via `runRetentionJob` |
| FM-01..FM-02 | `risk: filter miss caught by player grooming report` | PASS | |
| FM-03 | — | MANUAL | Phrase-only prod; no multi-message evidence link in v1 |
| FM-04 | — | MANUAL | Deleted message report behaviour not implemented |
| U-01 | `security: child_safety reports bypass daily report cap (sample)` | PASS | 12 msgs sample; not full 200 |
| U-02 | queue always + `reportPressure` in reportMeta | PASS | |
| U-03 | child safety skips global cap + down-weight | PASS | |
| U-04 | `risk: false dismiss` + reporterAutoHideDenied by hash | PASS | |
| U-05 | dedup integration | PASS | |
| U-06 | — | MANUAL | Fetch spy budget; spot-check erasure batch accounting |
| B-01..B-08 | mass/coordination integration tests | PASS/PARTIAL | B-04 burst breaker not implemented |
| BY-01..BY-10 | cluster IPv6 unit + rules + security tests | PARTIAL | BY-09 DO restart MANUAL |
| P-01..P-06 | reporter privacy integration | PASS/PARTIAL | P-04 hidden text still in RTDB payload — KNOWN |
| E-01..E-05 | retention overdue + mod alert hook | PARTIAL | E-05 cron vs SLA documented in SAFE_CHAT_REPORT |
| M-01..M-08 | mod resolve/appeal integration | PASS/PARTIAL | M-05 invalid_action guard |
| R-01..R-09 | evidence minimal + retention job | PARTIAL | R-06 reporter erasure by hash |
| FT-01..FT-04 | prod-config + erasure subrequest bump fix | PARTIAL | |
| C-01..C-04 | integration age/send/block/report | PASS | |
| C-05 | — | OWNER | Mod capacity sign-off |

See `npm run test:safe-chat` for current PASS/FAIL.
