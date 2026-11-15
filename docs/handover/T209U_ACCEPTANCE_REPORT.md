# t209u — Chapter 1 acceptance (Grok round 2 + `1f929a7`)

**Date:** 2026-11-15 04:48 CET (Europe/Copenhagen)  
**Git tip:** `1f929a7b6ae6` (`cursor/t209-grok-review-1430`)  
**Agent store:** `/cursor/stores/self/t209-ch1-acceptance-1f929a7b6ae6/`  
**Tarball SHA256:** `9043ddd3aa4725e65afd7be8009e99aa679e9dd1489aaabbda19e483da1acad6`

**Preview deploy:** unchanged **HOLD** — owner only.

---

## Acceptance table (post–Grok P0 fixes, honest)

| Row | Grok ask | Status | Evidence |
|-----|----------|--------|----------|
| Capture harness | One uncut take, finalize | **MET** | 787.43 s wall / 788.42 s ffprobe; 7×120 s MKV concat |
| Hero hair (rendered) | Blue mohawk, not green | **MET** | `electric_blue` hex **3381759**; `tintHairTexture`; 6 stills pass **hair pixel gate** (blue/green ratio **1.33–2.17**) |
| Studio 3D preview | Visible while picking hair | **MET** | Sticky `#charSelect3d` + scrollable studio panel (`css/game.css`) |
| District void | No fall-through; spawn on city/build | **MET (code + test)** | `snapPlayerToLocationSpawn` on city/construction; `test-player-floor-y-t209.js` **PASS** |
| Objectives / markers | Child knows what to do | **PARTIAL** | Life Ch1 beacons refresh on move; onboarding `syncGuideTarget` each render — automation still skips some beats quickly |
| 3D chain duel | In-world, not 2D-only | **MET** | `startNpcFight` always keeps 3D duel; capture step 4 uses `duel3dHud` |
| Magic in story path | At least one use | **MET** | Shop magic tab + `duel3d-spell` in capture fight loop |
| Climax before slice complete | Event, not dialogue-only | **MET (minimal)** | `playLifeCh1ClimaxBeat` cyan ring pulse before ch1 complete toast |
| Cemetery camera clip | Gravestone occlusion | **PARTIAL** | Cemetery follow dist/height nudged; not re-validated frame-by-frame in this pass |
| Re-entry 12:50–13:00 | Level/coins retained | **MET** | Scene `ch1_reentry`, `characterId: mohawk`, `CyberBlueQA` |

**Rejected legacy video:** SHA `7d3d245d…` (245 s) — excluded from store packaging.

---

## Video

| Field | Value |
|-------|-------|
| Primary | `ice-ch1-ORDINARY-UNCUT-desktop-1f929a7b6ae6-desktop1280x720-pass-t209-ch1-full.mp4` |
| SHA256 | `7a64ee7efc24995b7d776eb77a182b7c1c73174a15601cba9d3c7c63eaa0717e` |
| Gate JSON | `VIDEO_ACCEPTANCE_GATE-pass-t209-ch1-full.json` **PASS** |
| Hero stills | `hero-stills-1f929a7b6ae6-pass-t209-ch1-full/` |

### Frame-sampled hero hair (stills)

| Tag | blueMean | greenMean | ratio | pass |
|-----|----------|-----------|-------|------|
| `00-studio-confirm` | 73.33 | 33.76 | 2.172 | ✓ |
| `05-onboarding-shop-build` | 51.40 | 27.19 | 1.890 | ✓ |
| `06-onboarding-shop-build` | 98.36 | 65.50 | 1.502 | ✓ |
| `04-ch1-start` | 134.57 | 101.38 | 1.327 | ✓ |
| `05-ch1-mirror` | 107.07 | 78.19 | 1.369 | ✓ |
| `06-ch1-reentry` | 117.36 | 60.40 | 1.943 | ✓ |

---

## Tests

- `scripts/test-hero-binding-t209.js` — mesh **mohawk** + **rendered** hair pixel sample (ratio **2.277** on stage screenshot).
- `scripts/test-player-floor-y-t209.js` — city spawn `rootY: 0`, `belowFloor: false`.
- `scripts/hero-hair-pixel-gate.js` — wired into capture finalize gate.

---

## HOLD

Emulator only; no prod / merge to main / domain / Rules / payments / deletion; no preview deploy from agent.