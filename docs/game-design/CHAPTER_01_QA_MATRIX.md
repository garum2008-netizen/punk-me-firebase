# Chapter 1 — QA matrix (t209u)

**Baseline accepted for preview (technical only):** `a5c305c` (owner 2026-11-14).  
**Release gate:** full Ch1 playable + one UNCUT video + re-entry proof + iPad or explicit NOT TESTED.

| Area | Test | Automated | Manual / video | Status |
|------|------|-----------|----------------|--------|
| Avatar Creator | CYBER PUNK BLUE via UI | `test-avatar-qa-t206.js` | Studio screenshot | PASS (emulator) |
| Avatar | 6+ distinct looks | `avatar-qa-presets.js` | — | PASS |
| Avatar | Save / reload config | `test-avatar-qa-t206.js` | — | PASS |
| Avatar | RU / EN / DA studio | `test-avatar-qa-t206.js` | — | PASS |
| Avatar | Wings on skeleton | `test-wing-clip-t207.js` | Visual in playthrough | **NEW — run each build** |
| Avatar | Wing clip metrics | `wing-clip-samples-t207.json` | 12 samples; thresholds in JSON | **PASS** (tip build) |
| Ch1 path | Onboarding 1–7 + crypt | `test-ordinary-ch1-sequence-t209.js` | Same path as capture | **RUN EACH TIP** |
| Ch1 path | Full UNCUT video | `ORDINARY_PASS=t209-ch1-full` | One continuous WebM + SHA256 | **PENDING** |
| Ch1 | Life Ch1 complete | scene `ch1_complete` | Video timecode | PENDING video |
| Ch1 | Progress save + re-entry | scene `ch1_reentry` | Video + regression JSON | PENDING |
| Onboarding | Timeout RCA | `T209_ONBOARDING_TIMEOUT_RCA.md` | Commits `7b47500`–`8990b65` | **FIXED — prove via t209 test** |
| Companion | Angelina separate from hero | life-ch1-unit, preview-build | Video | PASS |
| Firebase | Emulator only | `prodAttempts: 0` | — | PASS |
| Preview bundle | Build + secrets scan | `test-preview-build.js` | — | PASS |
| **iPad Safari** | Real device | — | **No physical iPad on Cloud Agent VM** | **OPEN OWNER GATE** |
| Production | Merge / pay / rules | Policy HOLD | — | HOLD |

## Device gate (owner t207u)

This environment has **no physical iPad**. Playwright + desktop Chrome/1280 captures are **not** a substitute for Safari on iPad. Owner or Game Bot must run the matrix rows marked **OPEN OWNER GATE** on hardware before store release.

## Evidence index

| Artifact | Path |
|----------|------|
| CYBER PUNK BLUE screenshots | `/opt/cursor/artifacts/avatar-qa-t206/` |
| Wing clip samples | `/opt/cursor/artifacts/avatar-qa-t207/wing-clip-samples-t207.json` |
| Full Ch1 UNCUT (target) | `/opt/cursor/artifacts/ice-ch1-footage/ice-ch1-ORDINARY-UNCUT-desktop-*-pass-t207-ch1-full.webm` |
| Defects | `docs/game-design/CHAPTER_01_DEFECTS.md` |
