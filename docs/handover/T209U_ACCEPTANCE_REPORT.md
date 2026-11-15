# t209u — Chapter 1 acceptance (Grok run #77+)

**Date:** 2026-11-15 08:30 CET (Europe/Copenhagen)  
**Git tip (engineering):** `3a9a74c` (`cursor/t209-grok-review-1430`)  
**Latest full capture:** `51d45c2` (gate **FAIL** — see below); **r9** re-record in flight on `3a9a74c`  
**Agent store (r8 video):** `/cursor/stores/self/t209-ch1-acceptance-51d45c2/`  
**PR:** [#74](https://github.com/garum2008-netizen/punk-me-firebase/pull/74)

**Rule:** MET requires frame proof (5 s luminance + beats). **Canvas-only** luma gate (`VIDEO_LUMINANCE_IGNORE_BEFORE_SEC=70` studio skip) must pass for automation.

**Preview deploy:** **HOLD** — owner only.

---

## Round 5 capture (`51d45c2`, ~1107 s wall)

| Field | Value |
|-------|-------|
| File | `ice-ch1-ORDINARY-UNCUT-desktop-51d45c2-desktop1280x720-pass-t209-ch1-full.mp4` |
| Gate | **FAIL** — `luminance.ok` (worst canvas streak **80 s** @ t160–240); hair + duration **PASS** |
| Canvas gate proof on prior void video | `5340d8e` + ignore 70s → **FAIL** streak **85 s** t120–205 (would have caught Grok void) |

---

## Honest MET / CLAIM table (r8 video + code)

| # | Point | Frame / gate evidence | Status | Notes |
|---|--------|----------------------|--------|-------|
| 1 | **District void / black 3D** | t150 canvas **luma ~72** (r8); t165 `canvas-0033.png` **still black**; t494–525 **luma 59–65** (build step) | **PARTIAL** | Stale `dialogueCameraLock` fixes + build-mode release **help**; **gang modal** no longer pins 3D camera (`3a9a74c`). Remaining void **t160–240** (early city / Razor onboarding) on r8 — r9 re-record pending. |
| 2 | **Duel VFX** | t375 canvas **luma ~60** (r8); beats `win_fight` window | **CLAIM→PARTIAL** | World **visible** at duel on r8; chain/bolt/KO need frame eyes on beat stills (not black void). |
| 3 | **Angelina street** | Prior `5340d8e` + gameplay redirects | **MET** | Off-street soft-lock **fixed** in game (unchanged). |
| 4 | **Climax / MIDNIGHT PULSE** | r8 end `@ +1080s` `ch1_complete` | **MET** | Panel + rewards (prior frames still valid). |
| 5 | **Studio preview** | `hero-stills-51d45c2/00-studio-confirm.png` | **MET** | Blue hero visible; studio triple stills in store when r9 completes. |
| 6 | **Cemetery 4:59–5:07** | r8 ~t288–312 cemetery steps; extract beats | **MET (weak)** | Add `frame-0599`–`frame-0614` in store for cemetery window on next gated pass. |

---

## Engineering landed (P0 track)

1. **`isStoryUiBlockingWorldCamera()`** — release stale dialogue capture when story UI is not really open; resume follow camera every frame.  
2. **Build mode / Life Ch1** — force `releaseCaptureFrame`; Life Ch1 `closeDialogue` → `clearDialogueCamera`.  
3. **Gang modal** — 2D sheet must **not** block 3D camera unlock (`3a9a74c`).  
4. **`video-luminance-scan.js`** — canvas crop only; `ignoreBeforeSec=70`; capture wires same env.  
5. **Tests:** `test-world-render-locks-t209.js`, `test-city-build-luma-t209.js`, `test-duel-3d-t209.js` **PASS**.

---

## HOLD

Emulator only; no prod / main / Rules / payments / deletion; no agent preview deploy.