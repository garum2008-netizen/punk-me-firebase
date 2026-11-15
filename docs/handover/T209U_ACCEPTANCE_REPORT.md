# t209u — Chapter 1 acceptance (Grok run #77+)

**Date:** 2026-11-15 12:35 CET (Europe/Copenhagen)  
**Git tip (engineering):** `2886927` (`cursor/t209-grok-review-1430`)  
**Latest full capture:** `8a6d736` (gate **FAIL** luminance); **r16** in flight on `2886927`  
**Prior:** `e6f9147` r14 (~1155 s), `65eef73` r13 (city/Razor band fixed vs r11)  
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
| 1 | **District void / black 3D** | r13 **t70–145 PASS**; r15 **t160–200 FAIL** streak 40 s (luma **44–48**, threshold 48) — world **visible** (Razor dialogue on street); **not** empty-scene void (`renderDiag` loc city/street, `renderCalls` 1) | **PARTIAL** | Borderline **canvas crop** during gang/Razor step 5 + location hops; brighter street/duel lights in `2886927`. |
| 2 | **Duel VFX** | r15 duel band ~t190+ (`duel: true` in timeline); t375+ canvas **luma >54** on r15 | **MET (weak)** | Chain/bolt/KO visible in world; beat stills not yet packaged (no green gate). |
| 3 | **Angelina street** | Prior `5340d8e` + gameplay redirects | **MET** | Off-street soft-lock **fixed** in game (unchanged). |
| 4 | **Climax / MIDNIGHT PULSE** | r8 end `@ +1080s` `ch1_complete` | **MET** | Panel + rewards (prior frames still valid). |
| 5 | **Studio preview** | `studio-step-stills-8a6d736/` hair / outfit / wings + `wallMs=35454` (**≤70s assert PASS**) | **MET** | `CAPTURE_STUDIO_FAST` batch clicks (~35 s configure wall). |
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