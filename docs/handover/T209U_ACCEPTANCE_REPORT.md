# t209u — Chapter 1 acceptance (Grok round 3, video-first)

**Date:** 2026-11-15 06:02 CET (Europe/Copenhagen)  
**Git tip:** `68bb5594eb17` (`cursor/t209-grok-review-1430`)  
**Agent store:** `/cursor/stores/self/t209-ch1-acceptance-68bb5594eb17/`  
**Tarball SHA256:** `b65e00e12b2c90cce854e380340fc306e774f5599d23bc8fa05f9bfcd926a8ab`

**Rule:** MET rows require **extracted video beat frames** in the store (`stills/video-beat-frames/`), not unit tests alone.

**Preview deploy:** **HOLD** — owner only.

---

## Video

| Field | Value |
|-------|-------|
| File | `ice-ch1-ORDINARY-UNCUT-desktop-68bb5594eb17-desktop1280x720-pass-t209-ch1-full.mp4` |
| SHA256 | `835a7bc2309a74a7438b8f23c4c2127626a4b805872792c65084783f6774c4c4` |
| Duration | 822.17 s wall / 823.83 s ffprobe |
| Gate JSON | `VIDEO_ACCEPTANCE_GATE-pass-t209-ch1-full.json` **PASS** (hair pixels + duration) |
| Beat frames | `stills/video-beat-frames/BEAT_FRAMES_MANIFEST.json` (7 claims, all PNGs extracted) |

---

## Acceptance table (honest — await Grok frame review)

| Claim | Automated gate | Video beat frame | Status |
|-------|----------------|------------------|--------|
| Blue hero hair | Hair pixel gate (6 stills) | `beat-studio_hair_blue-t0055.png` | **MET (hair)** — prior run confirmed blue; Grok to re-check frame |
| 3D chain duel (not 2D modal) | `test-duel-3d-t209.js`; capture **throws** if `fightOverlay` active | `beat-duel_3d_chain-t0374.png` | **CLAIM** — code blocks 2D; **needs Grok frame proof** |
| District city ground (no void) | `test-player-floor-y-t209.js` (Y only) | `beat-district_city_ground-t0113.png` | **CLAIM** — added grid/mesh/beacon; **needs Grok frame proof** |
| Magic in duel | Capture casts `duel3d-spell` | `beat-magic_cast_duel-t0390.png` | **CLAIM** — needs Grok frame proof |
| Climax event (not dialogue-only) | `playLifeCh1ClimaxBeat` + full-screen flash | `beat-ch1_climax_pulse-t0748.png` | **CLAIM** — needs Grok frame proof |
| Studio preview updates on pick | `clearAccentTexCache` + dispose | *(no dedicated beat yet)* | **PARTIAL** |
| Onboarding objective visibility | Shorter move threshold + guide sync | `beat-onboarding_objective-t0530.png` | **PARTIAL** |
| Re-entry / L3 / coins | Scene log `ch1_reentry` | `beat-ch1_complete-t0764.png` | **MET (log)** |

Rejected legacy: SHA `7d3d245d…` (245 s).

---

## What changed in `68bb559` (vs false MET on `1f929a7`)

1. **Duel:** `mode-world3d` never opens 2D `fightOverlay` (CSS + logic); spawn `npc_razor` if missing; ordinary capture **fails** on 2D.
2. **District:** Emissive ground plate + grid + spawn beacon; **3D meshes** for placed city builds (`city-builds-3d.mjs`); brighter fog/lights.
3. **Climax:** Full-screen `MIDNIGHT PULSE` flash + tall light pillar + longer ring pulse before slice complete.
4. **Wings:** Default / hair-matched **blue** wing material (not green/red block).
5. **Evidence:** `scripts/extract-video-beat-frames.js` runs in `package-t209-acceptance-store.sh`.

---

## HOLD

Emulator only; no prod / main merge / domain / Rules / payments / deletion; no agent preview deploy.