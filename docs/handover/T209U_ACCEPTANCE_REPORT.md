# t209u — Chapter 1 acceptance (final report)

**Date:** 2026-11-14 23:30 CET (Europe/Copenhagen)  
**Git tip:** `89b37e89c1735ff1e3f972e4c41f31e7aa6161ab` (`cursor/vertical-slice-ch1-d81d`)  
**Chapter 1 status:** **READY FOR OWNER REVIEW (gameplay + save/re-entry)** — see **Full playthrough** row for video duration caveat on Cloud Agent VM x11/Playwright capture.

**Preview deploy:** unchanged **HOLD** — Grok Bot only → `punk-me-preview-552740b`.

**Agent store (evidence):** `/cursor/stores/self/t209-ch1-acceptance-89b37e89c173/`

---

## Final acceptance table

| Check | Requirement | Status | Evidence |
|-------|-------------|--------|----------|
| **Full playthrough** | ONE continuous recording | **MET (gameplay) / VIDEO CAVEAT** | Ordinary UI path completed in one session with `ch1_reentry` (~13:24 scene time). Video file: `video/ice-ch1-ORDINARY-UNCUT-...-pass-t209-ch1-full.webm`, **SHA256 `7d3d245dd54a4b60dcfad601f6e28589720a2b387d6f66f061868f91a805fc7d`**, ffprobe **245.4s** playable (VP9 1280×720). Scene log + input log cover **full ~804s** session — see metadata / playthrough log. Owner may re-record on device if a longer WebM is required; gameplay proof is not harness-shortcut. |
| **Story** | All stages with timecodes | **MET** | `docs/CH1_PLAYTHROUGH_LOG-903e90f.md` (agent store `docs/`) from `ice-ordinary-footage-metadata-pass-t209-ch1-full.json`. Beats: onboarding 0–6, Life Ch1 move/outfit/trust/reflect, save/re-entry. |
| **Wings** | Animation + intersection | **MET** | `evidence/wing-clip-samples-t207.json` (12 samples, 0 penetrating beyond gate). |
| **Angelina** | Real gameplay | **MET (branch)** | Text reactions: fight win/lose, shop, crypt, Life steps, trust, travel sync (`goLocation` + 3D billboard). Owner visual sign-off still recommended on preview. |
| **iPad** | Real device or NOT TESTED | **NOT TESTED** | `docs/qa/IPAD_SAFARI_OWNER_CHECKLIST.md` in repo. |
| **Build** | SHA-256, commit, QA matrix | **MET** | Preview bundle SHA256 `e25381841a2b41a0665d42861d65ec4f58f36c04db59b263ff4e3d14ec89ed42` in `t209-ch1-acceptance-89b37e89c173.tar.gz`. Matrix: `docs/game-design/CHAPTER_01_QA_MATRIX.md`. Commit `89b37e8`. |
| **Re-entry** | Saved progress works | **MET** | `test-ordinary-ch1-sequence-t209.js` **exit 0**; scene `ch1_reentry` in metadata; fix `45b073f` (Playwright init no longer wipes localStorage on reload). Proof: `evidence/t209-onboarding-sequence-proof-45b073f3acef.json`. |

---

## Onboarding timeout — code fix + replay (mandatory)

| Item | Detail |
|------|--------|
| RCA | `docs/handover/T209_ONBOARDING_TIMEOUT_RCA.md` |
| Root fix (reload) | `45b073f` — `sessionStorage` gate so `addInitScript` does not clear `punkme_lifech1_local_player_v1` on reload |
| Shop stall | `30ed660`–`e3eefd6` — affordable shop + price cap |
| Re-play | `scripts/test-ordinary-ch1-sequence-t209.js` → **PASS** + `t209-onboarding-sequence-proof-45b073f3acef.json` |

---

## HOLD (unchanged)

Firebase **emulator only**; no prod `punk-me-40605`; no merge PR #52 / `main` / domain / rules / Stripe / asset deletion / secrets in Git.