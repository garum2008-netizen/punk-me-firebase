# READY FOR OWNER ACCEPTANCE — Chapter 1 (t203u candidate)

**Branch:** [`cursor/vertical-slice-ch1-d81d`](https://github.com/garum2008-netizen/punk-me-firebase/tree/cursor/vertical-slice-ch1-d81d)  
**Candidate commit:** `7aee086d727baca54e2450ef7e9b275390193b85` on branch `cursor/vertical-slice-ch1-d81d` (not a production release tag).  
**Status:** `READY_FOR_OWNER_ACCEPTANCE` (owner playtest + narrative canon decision still required).  
**Owner decision:** `a37c200` accepted as **candidate** for product acceptance; **merge/production HOLD**.

---

## Live preview (only)

| Item | Value |
|------|--------|
| URL | https://punk-me-preview-552740b.pages.dev |
| Update path | New tarball in Agent Store → Game Bot redeploys **same** project |
| Empty project | `punk-me-ch1-preview` — untouched |

---

## Acceptance gates

| Gate | Status | Evidence |
|------|--------|----------|
| Commit SHA + branch | ✅ | This doc + GitHub branch link |
| Emulator-only Firebase | ✅ | `with-emulator-env.js`, prod route block in captures |
| Ordinary playthrough (no dev shortcuts) | ✅ | `capture-ice-ordinary-path-footage.js` — UI input only |
| Onboarding step 7 crypt | ✅ | Sessions `ceo-desktop-full-v2`+; `onCityBuildPlaced` + crypt material |
| Angelina persistent guide | ✅ | `#angelinaGuideBanner`, all onboarding + Life Ch1 hint keys |
| RU / EN / DA | ✅ | `node scripts/verify-t203-i18n.js` |
| Life Ch1 complete | ✅ | Scene `ch1_complete` in ordinary metadata |
| Automated tests | ✅ | smoke, life-ch1-unit, city-builds-sanitize (+ preview-build when run) |
| Desktop UNCUT video | ✅ | `ice-ch1-ORDINARY-UNCUT-desktop-7aee086d727b-…-pass-t203-owner-desktop.webm` (SHA in `EVIDENCE_INTEGRITY.json`) |
| Story bible + arc | ✅ | `docs/story/STORY_BIBLE.md`, `CHAPTER_01_STORY_ARC.md` |
| Monetization proposal | ✅ | `docs/story/MONETIZATION_CH1_PROPOSAL.md` (no live payments) |

---

## Remaining limitations (honest)

1. **Proposed four-act city memory arc** — not fully scripted; crypt placement has **first-person toast** only, no open/keep-secret trial.  
2. **Canon conflict** — proposed arc vs **player = Angelina** (03.11); see `STORY_BIBLE.md` — **owner must choose** reconciliation.  
3. **“Feels like a real game”** — onboarding is tutorial-heavy; Life Ch1 ending is room-scale, not full city restoration cinematic.  
4. **Cemetery chapter finale** — not in ordinary automation end state.  
5. **Desktop video** — x11grab records full display (`-t 900` cap); tail may extend past chapter end — trim for review. Playwright WebM still flaky on this VM.

---

## What to play (owner)

1. Open preview URL (Basic Auth from Cloudflare only).  
2. New local save: complete 7 onboarding steps (watch guide banner + language toggle in settings if present).  
3. Step 7: Map → City → **Build** → place **crypt** → story toast.  
4. Continue Life Ch1: mirror, note, reflect.  
5. Judge: goal clarity, Angelina voice, city beat, ending pull.

---

## Game Bot handoff

When this commit is accepted for preview refresh:

- Path: `/cursor/stores/self/preview-<short-sha>/`  
- Files: `punk-me-preview-<short-sha>.tar.gz`, `MANIFEST.json`, `PREVIEW_DEPLOY_FOR_GAME_BOT.md`  
- Game Bot: snapshot current deployment, then upload new bundle to **punk-me-preview-552740b**.

**Game Bot — preview refresh:** `/cursor/stores/self/preview-7aee086d727b/` · SHA-256 `66be7f04d6c00c22dfe4276a299c4155b619903e9469ca2ce7a660691a2bb80e`

**Status label:** `READY_FOR_OWNER_ACCEPTANCE`
