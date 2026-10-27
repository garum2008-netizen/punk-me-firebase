# P0 story preview — build labels (PR #43 Draft)

`GAME_VERSION` in the web client is a **stable preview label**, not a git SHA. Map labels to commits here.

| Label | Branch | Git commit (full) | Notes |
|-------|--------|-------------------|--------|
| `story-preview-p0-r1` | `cursor/scenario-preview-d81d` | `6f1cd47b7a8bbb965e2dd90bc94b8908dd4290b2` | First P0 ch0–ch1 onboarding pass |
| `story-preview-p0-r2` | `cursor/scenario-preview-d81d` | `d9cdf79` (features); label `r2` set in `13ec851` | Loc title sync, Angelina single-line, social offline HUD, mom subtitles, mp4 playthrough |
| `story-preview-p0-r3` | `cursor/scenario-preview-d81d` | `1fa317a` | QA P0/P1: start/menu overlays, RTDB empty progress, ch1 Mohawk beacon, interact/sofa, hints, economy, newcomer test |
| `story-preview-p0-r4` | `cursor/scenario-preview-d81d` | `cb9337d` | P1: pet explicit+cooldown, cemetery proportional pay, hangout built (4/4) HUD |

Do not embed commit SHAs in `GAME_VERSION` — they drift on every commit and are easy to mistype.
