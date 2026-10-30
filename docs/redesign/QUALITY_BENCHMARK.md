# Visual & audio quality benchmark (reference targets)

**Scope:** Chapter 1 **life-sim vertical slice** on **licensed / owned assets only**. No copyrighted third-party screenshots in repo. References: Meshy heroes **CC BY 4.0**, CC0 SFX, project `imagine_images/`, procedural rooms in `locations.mjs`.

**Target devices (agreed for measurement):**

| Device class | Resolution | OS |
|--------------|------------|-----|
| Primary phone | 390×844 portrait | iOS Safari 17+ (iPhone 12 class) |
| Android reference | 720×1600 | Chrome 120+ mid-range (4 GB RAM) |

---

## 3D graphics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Hero GLB size | ≤ **8 MB** per character | `ls -la assets/models/meshy/*.glb` |
| Room prop draw | ≤ **120** visible meshes in home + cafe greybox | Render doc count in dev overlay (implement in slice) |
| Textures | ≤ **2048²** albedo per hero; **1024²** props | Artist checklist |
| Style | Single readable silhouette at 5 m on 390px width | Internal QA screenshot rubric (1–5), pass ≥ **4** on Angelina marker + player |
| Shadows / AA | Mobile: pixelRatio 1, no MSAA (reuse `mobileQuality`) | Config snapshot in test log |

---

## Animation

| Clip | Required for slice | Quality bar |
|------|-------------------|-------------|
| idle | ✓ | Loop ≤ 1 cm foot slide |
| walk | ✓ | 1.0× move speed match |
| run | optional in ch1 | Same |
| interact (pickup) | ✓ cafe prop | 0.8–1.2 s, one shot |
| Angelina | **No final body (ICE)** | Portrait pulse or floating marker; lip-sync **N/A** until model |

**FPS:** ≥ **30** sustained in home; ≥ **24** in cafe with 2 NPCs + player (10 s sample, p95 frame time ≤ 33 ms / 41 ms).

---

## UI

| Rule | Target |
|------|--------|
| Touch targets | ≥ **44×44 px** |
| Mission card | One primary objective line + reward preview |
| Subtitles | Max **2 lines**, bottom safe area, contrast ≥ WCAG AA on `#voiceSubtitle` |
| Language | RU default; EN/DA strings present for ch1 keys |
| No raw keys | 0 visible `quest_*` / `narr_*` ids in player UI |

---

## Audio

| Channel | Target | Measurement |
|---------|--------|-------------|
| VO loudness | **−16 LUFS** integrated (stereo mp3) | ffmpeg `loudnorm` scan in asset CI (future) |
| Music under VO | Duck **−12 dB** relative bed | `audio-manager.mjs` behaviour — verify by ear in QA |
| Life-sim zones | No full-volume thrash rock during ch1 life quest | Meter peak ≤ **−20 dBFS** below VO on street if rock still loaded (**D11**) |
| SFX | CC0 / owned; one-shot UI ≤ **0.3 s** | LICENSES.md entry |

---

## Content reference (allowed)

- `assets/models/meshy/*.glb` — attribution in `LICENSES.md`
- `assets/audio/sfx/*` — procedural CC0
- `imagine_images/*` — shop/posters only, not as world replacement for GLB heroes
- **Forbidden in commit:** Netflix/AAA reference grabs, unlicensed character art

---

## QA gate (ties to vertical slice)

Slice **does not pass** internal QA unless:

1. FPS targets met on both device classes (logged).
2. Subtitle + VO sync ≤ **500 ms** (Stage 1 temp VO acceptable).
3. UI rubric ≥ **4/5** on mission clarity (internal checklist in `VERTICAL_SLICE_PLAN.md`).
