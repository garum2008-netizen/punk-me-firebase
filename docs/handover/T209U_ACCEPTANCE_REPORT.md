# t209u — Chapter 1 acceptance report (owner addendum 2026-11-14 21:54 CET)

**Chapter 1 status: PENDING** — not ready for release review as a *finished child-playable product* until the **Full playthrough** and **Re-entry** rows are green with one UNCUT recording.

**Branch / tip:** `cursor/vertical-slice-ch1-d81d` @ **`3127d3f`** (re-entry save merge + sequence test re-run in flight).

**Preview deploy:** unchanged owner hold — **no** new tarball to `punk-me-preview-552740b` from this agent until owner GO. Accepted technical stage remains **`a5c305c`**.

---

## Final acceptance table (t209u)

| Check | Requirement | Status | Evidence / defect |
|-------|-------------|--------|-------------------|
| **Full playthrough** | ONE continuous recording (CYBER PUNK BLUE, intro → chapter end, save/re-entry) | **NOT MET** | Regression (`test-ordinary-ch1-sequence-t209.js`) reaches `ch1_complete` ~12:33 session time (see log `t209-sequence-v2.log`) but **fails on reload hydration** (fix `3127d3f` under verification). No owner-grade UNCUT WebM + SHA256 at tip yet. **Work:** green sequence proof then `ORDINARY_PASS=t209-ch1-full` with ffmpeg (`DISPLAY=:1`). |
| **Story** | All stages with timecodes | **PARTIAL (log only)** | Ordinary scene log (no video): `+55s` onboarding; `+434s` shop step; `+508s` crypt/city; `+668s` Life Ch1; `+753s` reflect complete. Full timecode table requires **green** capture metadata + `generate-ch1-playthrough-log.js`. |
| **Wings** | Animation + intersection checks | **MET (automated)** | `test-wing-clip-t207.js` PASS — 12 samples, `/opt/cursor/artifacts/avatar-qa-t207/wing-clip-samples-t207.json`, commit tip at run time. Jump clip **N/A** on rig (documented in JSON). |
| **Angelina** | Present in **real** gameplay (hints + reactions) | **PARTIAL** | Text banner + `react()` on onboarding, crypt, fight, shop, Ch1 complete; 3D follow billboard when `playerCutout === false` (`syncCompanionAngelina3D`, `goLocation` sync). **Gap:** owner visual verify in 3D loop; reactions not yet on every quest failure/success path. |
| **iPad** | Real device or **NOT TESTED** | **NOT TESTED** | No physical iPad on Cloud Agent VM. Checklist: `docs/qa/IPAD_SAFARI_OWNER_CHECKLIST.md`. |
| **Build** | SHA-256, commit, QA matrix | **PARTIAL** | Matrix: `docs/game-design/CHAPTER_01_QA_MATRIX.md` (updated t209). Preview tarball SHA for **acceptance build** pending green capture. Emulator tests: wing PASS; preview-build mostly PASS (time-to-player median gate flaky on 1280). |
| **Re-entry** | Saved progress works | **NOT MET** | Root cause: `lifeCh1` not always embedded in `punkme_lifech1_local_player_v1` blob → reload could not restore completed Ch1. **Fix:** `3127d3f` merges `ensureLifeCh1` into `lifeCh1LocalSavePlayer` + disk assert before reload. Prior runs: 300s wait timeout on reload. **Proof pending:** scene `ch1_reentry` in sequence test. |

---

## EXTRA: onboarding timeout — code fix + replay proof

| Item | Detail |
|------|--------|
| **Root cause** | Documented in `docs/handover/T209_ONBOARDING_TIMEOUT_RCA.md` (shop disabled buttons, post-Ch1 map hang, move skip, reload flush). |
| **Commits** | `7b47500` (move skip / post-Ch1 hang), `30ed660` + `e3eefd6` (shop stall), `8990b65`/`0efa9ca`/`3127d3f` (re-entry), `d88b6ff` (RCA + regression test). |
| **Replay proof** | `node scripts/with-emulator-env.js node scripts/test-ordinary-ch1-sequence-t209.js` — **onboarding through `onboarding_step_6` + `ch1_complete` PASSING** on runs 2026-11-14; full exit 0 blocked on `ch1_reentry` until `3127d3f` verified. |

---

## Product pillars vs t209 “real game”

| Pillar | State |
|--------|--------|
| Story arc (intro → climax → end) | **Functional** in Life Ch1 + onboarding; **clarity for solo child** not yet evidenced on video. |
| Avatar Creator diversity | **PASS** CYBER PUNK BLUE + presets (`test-avatar-qa-t206.js`). |
| 3D world (city, crypt, chains, magic) | **In slice** — crypt onboarding; duel 3D + shop magic inventory; not full city narrative trial. |
| Performance (no freezes/timeouts) | **Improving** — onboarding shop/fight fixed; **open:** boot contention when multiple Playwright/ffmpeg instances; 1280 load median >12s. |
| Monetization free vs paid | **Design only** — `docs/game-design/MONETIZATION_CH1_PROPOSAL.md`; no Stripe/checkout. |

---

## Open defects (specific)

| ID | Repro | Remaining work |
|----|-------|----------------|
| T209-VID-01 | Run ordinary capture to completion at tip SHA | One UNCUT WebM + SHA256 + ffprobe duration; pass tag `t209-ch1-full`. |
| T209-RE-01 | Complete Ch1 → `saveMe` → reload | Prove `ch1_reentry` in scene log (regression test). |
| T209-ANG-01 | Play with `playerCutout: false` | Owner confirms 3D billboard + banner during walk/build/fight. |
| T209-IPAD-01 | Safari on iPad | Owner checklist run. |
| T209-PERF-01 | `test-preview-build.js` 1280 | Investigate median time-to-player >12s (load path, not gameplay soft-lock). |

---

## HOLD (unchanged)

Firebase **emulator only**; no prod `punk-me-40605`; no merge PR #52 / `main` / production domain / rules / asset deletion / Stripe / secrets in Git.