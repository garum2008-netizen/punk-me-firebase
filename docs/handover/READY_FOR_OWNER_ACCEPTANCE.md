# READY FOR OWNER ACCEPTANCE — Chapter 1 (t207u)

**Owner decision 2026-11-13:** Preview Avatar QA **GO** (`a95efee` baseline). **Chapter 1 NOT release-ready** until full playthrough video + story polish.

**Candidate commit:** see `gameplayAcceptanceSha` in `EVIDENCE_INTEGRITY.json` (wing rework + Ch1 capture).  
**Branch:** [`cursor/vertical-slice-ch1-d81d`](https://github.com/garum2008-netizen/punk-me-firebase/tree/cursor/vertical-slice-ch1-d81d)  
**Live preview:** https://punk-me-preview-552740b.pages.dev (deployment `4b53abab` = `a95efee`; rollback tarball retained)

## Gates

| Gate | Status |
|------|--------|
| Preview / Avatar Creator | **GO** (owner) |
| CYBER PUNK BLUE + diversity | PASS |
| Wing skeleton attach + clip metrics | PASS (`test-wing-clip-t207.js`) |
| Full Ch1 UNCUT video | **PENDING** |
| iPad Safari real device | **OPEN** (no iPad on agent VM) |
| Merge / prod / payments | **HOLD** |

## Owner playtest focus

1. Finish Chapter 1 as CYBER PUNK BLUE (crypt + Life Ch1).  
2. Judge story pull for teens — not only avatar customization.  
3. Wings follow spine during walk/run (t207 rework).

## Game Bot

Package from Agent Store at branch tip → snapshot → redeploy **only** `punk-me-preview-552740b`.

See also: `docs/game-design/CHAPTER_01_QA_MATRIX.md`, `CHAPTER_01_DEFECTS.md`.
