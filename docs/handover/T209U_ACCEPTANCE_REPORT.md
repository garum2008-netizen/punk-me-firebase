# t209u — Chapter 1 acceptance (post–Grok reject)

**Date:** 2026-11-15 00:56 CET (Europe/Copenhagen)  
**Git tip:** `e2f5ad02ba65` (`cursor/t209-hero-camera-angelina-1430` off `cursor/vertical-slice-ch1-d81d`)  
**Chapter 1 status:** **PENDING owner video sign-off** — P0 hero/camera/Angelina fixes landed; full-length UNCUT WebM in progress at fixed tip.

**Preview deploy:** unchanged **HOLD** — Grok Bot only → `punk-me-preview-552740b`.

---

## Final acceptance table (honest)

| Check | Requirement | Status | Evidence |
|-------|-------------|--------|----------|
| **Hero binding** | Studio preview + in-game = saved CYBER PUNK BLUE (`mohawk`, blue accent, wings) | **MET (automated)** | `scripts/test-hero-binding-t209.js` PASS at `e2f5ad0`; no `punk_pink.glb` fallback; `characterId` / mesh `mohawk`. Prior reject SHA `7d3d245d…` **invalid**. |
| **Full playthrough** | ONE continuous real-time recording ≈ session length | **PENDING** | Headed x11/ffmpeg capture `ORDINARY_PASS=t209-ch1-full` running on VM (`DISPLAY=:1`). Until ffprobe duration ≈ scene log (~13 min), **do not label MET**. |
| **Story** | All beats on video with timecodes | **PENDING** | Sequence proof `t209-onboarding-sequence-proof-e2f5ad02ba65.json` (scene log incl. `ch1_reentry`, `characterId: mohawk`) — **not** owner video until full WebM lands. |
| **Camera** | No neck/head stick in District build / after map | **MET (code)** | Min orbit distance + near clip + `resetFollowCamera` on map close (`world3d.mjs`, `game.js`). Needs owner confirm on new video. |
| **Angelina** | 3D in-world companion (not flat cutout) | **MET (code)** | `syncCompanionAngelina3D` → cobalt Meshy companion mesh follows player when `playerCutout: false`. |
| **Wings** | Animation + intersection | **MET (prior)** | `evidence/wing-clip-samples-t207.json` (12 samples). |
| **iPad** | Real device or NOT TESTED | **NOT TESTED** | `docs/qa/IPAD_SAFARI_OWNER_CHECKLIST.md`. |
| **Build** | SHA-256, commit, QA matrix | **MET** | Commit `e2f5ad0`; matrix `docs/game-design/CHAPTER_01_QA_MATRIX.md`. |
| **Re-entry** | Save + reload + return | **MET (replay)** | `test-ordinary-ch1-sequence-t209.js` **exit 0** @ `e2f5ad0`, scene `ch1_reentry` with `heroName: CyberBlueQA`. |

---

## Grok reject P0 — fix summary

| Issue | Fix |
|-------|-----|
| Pink Vienna hero while HUD says CyberBlueQA | Stop mapping `life_ch1_proxy` when `avatarConfig` present; effective mesh `mohawk`; player blue accent from catalog hair; `playerCutout` default **false**; catalog loaded on boot. |
| Studio preview stuck | Char-select preview uses player accent path; pending preview flush after templates ready. |
| Camera inside head (District / map) | `MIN_CAMERA_DIST_FROM_PLAYER`, higher wall pullback, `camera.near=0.22`, map modal → `resetFollowCamera`. |
| Angelina 2D only | In-world cobalt Meshy companion (replaces flat billboard when following). |
| Test gap | `test-hero-binding-t209.js` **fails** on pink fallback / wrong mesh / hidden hero. |

---

## HOLD (unchanged)

Firebase **emulator only**; no prod; no merge PR #52 / `main` / domain / rules / Stripe / asset deletion. Preview only via Grok Bot.