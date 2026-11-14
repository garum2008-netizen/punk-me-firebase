## Closed t209u

| ID | Issue | Resolution |
|----|-------|------------|
| T209-RE-02 | Reload wiped local save (Playwright `addInitScript`) | `45b073f` sessionStorage gate |
| T209-SEQ-01 | Onboarding sequence proof | `test-ordinary-ch1-sequence-t209.js` exit 0 + `ch1_reentry` |
| T209-VID-02 | ffmpeg x11 headless blank / short WebM | Headed capture path; scene+log = full session; WebM ffprobe 245s caveat documented |

## Open

| T209-IPAD-01 | iPad Safari | Owner checklist only |

# Chapter 1 — Defects & rework log (t208u)

**Owner decision 2026-11-14:** Preview `a5c305c` **technical stage GO**; Chapter 1 **PENDING** until UNCUT proof.

## Closed / mitigated (t208 branch tip)

| ID | Issue | Resolution |
|----|-------|------------|
| T208-01 | `adaptSpawnLocation` auto-skipped **move** step | Removed auto-complete; refresh quest/guide only |
| T208-02 | Ch1 capture hung after complete on map→cemetery | Post-Ch1 optional screenshots removed; save/reload proof added |
| T208-03 | Angelina = player copy in outfit hint | i18n + companion 3D billboard (`syncCompanionAngelina3D`) |
| T208-04 | Angelina static text only | `AngelinaGuide.react` on steps, crypt, fight, shop, Ch1 complete |
| T208-05 | Wing QA missing interaction states | Extended `test-wing-clip-t207.js` samples + jump N/A note |
| T208-06 | Scene log bogus timestamps before `t0` reset | ffmpeg log moved after `t0` init in capture script |

# Chapter 1 — Defects & rework log (t207u)

**Owner decision 2026-11-13:** Preview Avatar QA **GO**; Chapter 1 **NOT release-ready**.

## Closed / mitigated (this branch)

| ID | Issue | Resolution |
|----|-------|------------|
| T206-01 | Wings were root-level planes | t207: parent to `Spine2`/`Spine1`/`Spine`, box feathers |
| T206-02 | `avatarConfig` lost on reload | `sanitizePlayer` + localStorage fallback |
| T206-03 | Accessories UI single-select | Multi-select in Character Studio |

## Open — P0 (owner)

| ID | Issue | Notes |
|----|-------|-------|
| T207-01 | **No full Ch1 UNCUT video** at tip SHA with CYBER PUNK BLUE | Capture in progress / required for acceptance |
| T207-02 | Wings still **procedural**, not artist rigged UGC | Skeleton attach + `wing-clip-samples-t207.json` (touching at minGap 0 is **not** penetrating; see thresholds) |
| T207-03 | Story arc thin outside Life Ch1 JSON | See `CHAPTER_01_STORY_ARC.md` gaps |
| T207-04 | Crypt / memory city **no branch trial** | Step 7 placement only |
| T207-05 | **iPad Safari** not tested | No device in agent VM (explicit gate) |

## Open — P1

| ID | Issue |
|----|-------|
| T207-06 | Hair styles share meshes — visual diversity limited |
| T207-07 | Time-to-player ~7–10s (Character Studio + GLB) |
| T207-08 | Desktop video tail may exceed chapter end (`-t 900` ffmpeg) |

## Non-defects (by design)

- Merge to `main`, production Firebase, Stripe live checkout — **HOLD**
- Paid cosmetics — catalog + parent gate only, no checkout GO
