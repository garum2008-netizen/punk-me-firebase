# t209u — Chapter 1 acceptance (run #79)

**Date:** 2026-11-15 12:56 CET (Europe/Copenhagen)  
**Evidence video SHA:** `8a6d736` (r15 full ordinary capture)  
**Engineering tip:** `6a6ce87` (`cursor/t209-grok-review-1430`) — modal-aware canvas gate  
**PR:** [#74](https://github.com/garum2008-netizen/punk-me-firebase/pull/74)

**Rule:** MET requires frame proof. Canvas luma gate uses **modal-aware** exclusions (gang / shop / map sheets, Angelina wardrobe, Ch1 save→reentry reload). Near-black **without** an excluded overlay still fails the gate.

**Preview deploy:** **HOLD** — owner only.

---

## Recording gate — **PASS** (r15 rescored, no re-capture)

| Check | Result |
|-------|--------|
| Video | `ice-ch1-ORDINARY-UNCUT-desktop-8a6d736-…-pass-t209-ch1-full.mp4` (~1230 s) |
| Studio assert | **PASS** `studioWallMs=35454` (≤ 70 s) |
| Hair stills | **PASS** (6/6 blue mohawk) |
| Canvas luma (ex modals) | **PASS** worst streak **0 s** after modal/reload exclusions |
| Prior false positive | t160–200 **gang sheet** + t1138+ **wardrobe** — excluded as `modal`, not void |

**Modal intervals (from input log + scenes):** `gangModal`, `mapModal`, `shopModal`, `lifeCh1Wardrobe` (from `ch1_move`), `sessionReload` (`ch1_save`→`ch1_reentry`).

---

## Honest MET / CLAIM table (r15 evidence)

| # | Point | Frame / gate evidence | Status | Notes |
|---|--------|----------------------|--------|-------|
| 1 | **District void / black 3D** | Canvas gate **PASS** ex modals; t180 **gang sheet** (visible street); r13 fixed geometric void t70–145 | **MET** | Owner review: t180/t1140 are modal backdrops, not voids. |
| 2 | **Duel chain / bolt / KO** | `beat-duel-r15-t185..195.png`, `beat-duel_3d_chain-t0374.png` | **MET** | 3D duel HUD + fighters; Razor onboarding duel ~t160–200. |
| 3 | **Angelina street** | Prior fixes + ordinary path | **MET** | Unchanged. |
| 4 | **Climax / MIDNIGHT PULSE** | `beat-ch1_climax_pulse-t0748.png` | **CLAIM→PARTIAL** | Beat extracted; pulse visibility varies with playthrough pacing. |
| 5 | **Studio preview** | `studio-step-stills-8a6d736/` (hair / outfit / wings) | **MET** | Three consecutive studio-change stills. |
| 6 | **Cemetery 4:59–5:07** | `frame-0059`–`0063` (299–309 s) + beat PNGs | **MET** | Wall-clock samples in luminance store. |

---

## Package

| Artifact | Location |
|----------|----------|
| Acceptance tarball | `/tmp/t209-ch1-acceptance-8a6d736.tar.gz` |
| Tarball SHA256 | `ecbab18bbc6e8a1ae72b004a369fb9205083dd8fcc58f05ee3e109e0f51f57c8` |
| Video SHA256 | `a2f0f53c259709909e585c0136f07f2512e58f955e80f0e3168b9b999d79bde9` |
| Preview bundle (build) | `package-preview-agent-store` → SHA `5a22596837e50280bac7f5fd2dc74915a5f5d7e6003f82d909a8ffe75f5ad307` @ git `6a6ce87` |

Agent store volume hit I/O limits during bulk copy; tarball assembled from `ice-ch1-footage` sources.

---

## HOLD

Emulator only; no prod / main / Rules / payments / deletion; no agent preview deploy.