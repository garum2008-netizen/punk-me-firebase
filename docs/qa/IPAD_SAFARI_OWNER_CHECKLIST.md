# iPad Safari — owner acceptance checklist (t208u)

**Agent VM:** no physical iPad available; emulator and DevTools do **not** satisfy t208 priority 5. Run this checklist on a **real iPad** with **Safari** against preview `punk-me-preview-552740b` when the owner accepts a t208-complete build (not before).

## Setup

1. Connect iPad to stable Wi‑Fi; disable Low Power Mode.
2. Open Safari → private window optional; use preview URL from Grok Bot (not production).
3. Verify page is `noindex` and login gate works if enabled.
4. Clear site data once for a **first-time child** pass (Settings → Safari → Advanced → Website Data).

## Controls & performance

| # | Action | Pass criteria |
|---|--------|----------------|
| P1 | Load game to playable 3D | Character Studio → confirm within ~15s; no blank stage >30s |
| P2 | Touch move | Tap floor + virtual stick (if shown); hero walks without stuck camera |
| P3 | Portrait + landscape | UI readable; Angelina banner not covered by safe-area/home indicator |
| P4 | Open Map, travel Street | One tap targets; no double-scroll trap |
| P5 | Gang → Razor | List scrolls; talk/fight buttons hittable (44pt feel) |
| P6 | Build mode in City | Build toggle; single tap places crypt; Angelina react line visible |
| P7 | Frame feel | No >500ms freezes during walk + wardrobe open (subjective but note stutters) |

## Chapter 1 clarity (child can finish alone)

| # | Beat | Pass criteria |
|---|------|----------------|
| C1 | Onboarding step 1 | Quest panel says **move**; child moves without map cheat |
| C2 | Street portal | Glow/portal obvious; no dead end in room |
| C3 | Life Ch1 panel | Objectives update after move / mirror / trust / reflect |
| C4 | Angelina | Banner hints match current step; companion portrait/billboard visible where designed |
| C5 | End state | After reflect OK, toast + banner acknowledge **chapter complete** |
| C6 | Save/reload | Force-quit Safari, reopen preview URL; progress + hero look preserved |

## Record for owner report

- Screen recording (iOS built-in) of one full pass with CYBER PUNK BLUE or child’s own hero.
- Note iPad model, iOS version, Safari version, and preview commit SHA.
- File defects with timestamps; compare to `CHAPTER_01_DEFECTS.md`.