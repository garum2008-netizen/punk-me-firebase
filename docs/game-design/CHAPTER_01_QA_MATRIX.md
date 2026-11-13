# Chapter 1 — QA matrix (t207u)

**Baseline accepted for preview:** `a95efee` (Avatar Creator + CYBER PUNK BLUE on emulator).  
**Release gate:** full Ch1 playable + story complete + device evidence.

| Area | Test | Automated | Manual / video | Status |
|------|------|-----------|----------------|--------|
| Avatar Creator | CYBER PUNK BLUE via UI | `test-avatar-qa-t206.js` | Studio screenshot | PASS (emulator) |
| Avatar | 6+ distinct looks | `avatar-qa-presets.js` | — | PASS |
| Avatar | Save / reload config | `test-avatar-qa-t206.js` | — | PASS |
| Avatar | RU / EN / DA studio | `test-avatar-qa-t206.js` | — | PASS |
| Avatar | Wings on skeleton | `test-wing-clip-t207.js` | Visual in playthrough | **NEW — run each build** |
| Avatar | Wing clip metrics | `wing-clip-samples-t207.json` | 7 samples incl. build + Angelina; thresholds documented in JSON | **PASS** |
| Ch1 path | Onboarding 1–7 + crypt | `capture-ice-ordinary-path-footage.js` | **Full UNCUT video** | **PENDING** |
| Ch1 | Life Ch1 complete | ordinary metadata `ch1_complete` | Video | PENDING |
| Ch1 | Progress save + re-entry | preview-build reload | Playthrough | PENDING |
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
