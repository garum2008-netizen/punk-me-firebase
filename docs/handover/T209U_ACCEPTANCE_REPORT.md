# t209u — Chapter 1 acceptance (Grok round 4, video-first)

**Date:** 2026-11-15 06:25 CET (Europe/Copenhagen)  
**Git tip:** `5340d8e00c5f` (`cursor/t209-grok-review-1430`)  
**Agent store:** `/cursor/stores/self/t209-ch1-acceptance-5340d8e00c5f/`  
**PR:** [#74](https://github.com/garum2008-netizen/punk-me-firebase/pull/74)

**Rule:** MET requires **frame proof** in the store (`stills/luminance-scan/frame-*.png` every **5 s** + `stills/video-beat-frames/`). Full-frame luminance gate is necessary but not sufficient when HUD masks a black 3D viewport.

**Preview deploy:** **HOLD** — owner only.

---

## Video (round 4 — complete capture)

| Field | Value |
|-------|-------|
| File | `ice-ch1-ORDINARY-UNCUT-desktop-5340d8e00c5f-desktop1280x720-pass-t209-ch1-full.mp4` |
| SHA256 | `2d7d8f044336dc540ca44f88b479582be9890c8668961c756b5a8214ef838da7` |
| Duration | 774.33 s (ffprobe) |
| Gate | `VIDEO_ACCEPTANCE_GATE-pass-t209-ch1-full.json` **PASS** (hair pixels + duration + **`luminance.ok`**) |
| Luminance | `stills/luminance-scan/LUMINANCE_SCAN.json` — worst near-black streak **0 s** (155 samples @ 5 s) |
| Grok self-check | `evidence/GROK_SIX_POINT_VERIFY.json` — automated luma thresholds **pass** (see honest table below) |

---

## Grok six points — honest MET / CLAIM (frame review)

| # | Point | Frame evidence | Status | Notes |
|---|--------|----------------|--------|-------|
| 1 | **District void** | `frame-0023.png` (t113 beat) **MET**; `frame-0025.png`–`0040.png` (t120–195) **FAIL** | **PARTIAL** | City/district **ground visible** early (`beat-district_city_ground-t0113.png`). During **District build** onboarding (~2–3½ min) and **3D duel** (`frame-0076.png` t375), **3D viewport is pitch black** while HUD/dialogue stays lit — Grok’s void class bug **still present** in those modes. Full-frame luma ~46–51 (HUD), so luminance gate alone is insufficient. |
| 2 | **Duel VFX / chain** | `frame-0076.png` t375; `beat-duel_3d_chain-t0374.png` | **CLAIM** | **3D duel HUD** (Chain/Magic/Block/Dodge) — not 2D modal. **No visible chain mesh, projectile, or KO moment** on frames because the **world layer is black** at duel time. Code has one-shots + chain line + bolt (round 4); needs visible render fix + re-check. |
| 3 | **Aimless Gang Street** | `frame-0107.png` t530; log `onboarding_step_3` @ +247s | **MET** | Quest text + **Razor** objective; capture cleared **Angelina street** step 3 → 4 with guide walk. **Game fix:** off-street redirect (`onboard_angelina_street_offpath`, portal waypoints, cemetery→street portal). |
| 4 | **Climax / MIDNIGHT PULSE** | `beat-ch1_climax_pulse-t0748.png`; `frame-0151.png` t750 | **MET** | Narrative panel *“The town that forgot its name”* + reward line; 3D pulse in room; no debug “life climax beat” string. |
| 5 | **Studio preview on click** | `frame-0006.png` t25; `beat-studio_hair_blue-t0055.png` | **MET** | Blue mohawk + wings visible; studio canvas updates (capture waits on `__lastStudioPreviewMs`). |
| 6 | **Cemetery camera clip** | `frame-0061.png` t300 | **MET (weak)** | Cemetery fully lit; tombstone in **lower-left** but **no obvious clip-through** at this sample (Grok window 4:59–5:07 not exactly sampled). |

---

## Prior video (reference)

**`68bb559` / `835a7bc2…`** — partial accept (blue hero, 3D duel shell, Angelina 3D, re-entry). Superseded for evidence by **`5340d8e`** capture above.

---

## Round 4 code highlights (`5340d8e`)

1. **District camera:** `dialogueCameraLock`, `releaseCaptureFrame` on travel/modals/rebuild; city fog; camera far 190; boundary walls.  
2. **Duel:** chain line + magic bolt + KO beat (`gameplay-v21.mjs`).  
3. **Angelina street (game + harness):** quest step, cross-location markers, Angelina **wrong-loc / back** lines; cemetery street portal.  
4. **Climax:** `lifeCh1ClimaxPanel` + MIDNIGHT PULSE rewards.  
5. **Evidence:** `video-luminance-scan.js`, 5 s frames in store, `verify-grok-six-points.js`.

---

## Next engineering (still open after this run)

- **P0:** 3D viewport black during **city District build** and **3D duel** while HUD renders (child-visible void). Investigate render path when build UI / duel HUD active — not fixed by luminance gate alone.

---

## HOLD

Emulator only; no prod / main merge / domain / Rules / payments / deletion; no agent preview deploy.