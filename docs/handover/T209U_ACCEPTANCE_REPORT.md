# t209u — Chapter 1 acceptance (post–Grok reject + capture harness)

**Date:** 2026-11-15 03:55 CET (Europe/Copenhagen)  
**Git tip:** `c21eb4c1d2fe` (`cursor/t209-hero-camera-angelina-1430`)  
**Agent store:** `/cursor/stores/self/t209-ch1-acceptance-c21eb4c1d2fe/`

**Preview deploy:** unchanged **HOLD** — Grok Bot only.

---

## Final acceptance table (honest)

| Check | Status | Evidence |
|-------|--------|----------|
| **Hero binding** | **MET** | `test-hero-binding-t209.js`; 6 in-session stills `meshId: mohawk`, `accent: blue`, `wings: true`, `companion3d: true` |
| **Full playthrough video** | **MET** | `VIDEO_ACCEPTANCE_GATE-pass-t209-ch1-full.json` **PASS** — duration **790.17 s** vs wall **789.36 s** (δ 0.1%) |
| **Story (video timecodes)** | **MET** | `docs/CH1_PLAYTHROUGH_LOG-c21eb4c1d2fe.md` + scene log in metadata |
| **Camera / Angelina** | **MET (video)** | Full session x11 desktop capture; stills at shop/build + re-entry |
| **Re-entry** | **MET** | Scene `ch1_reentry`, `characterId: mohawk`, `CyberBlueQA` |

**Rejected legacy video:** SHA `7d3d245d…` / **245.4 s** — **excluded** from tarball (packaging refuses short/legacy paths).

---

## Video (owner)

| Field | Value |
|-------|-------|
| Primary | `ice-ch1-ORDINARY-UNCUT-desktop-c21eb4c1d2fe-desktop1280x720-pass-t209-ch1-full.mp4` |
| SHA256 | `d899922e1acef6f309baa5d6d13c008fa49dc5a0570fcd8ff505692cfa86844a` |
| Duration | 790.17 s (ffprobe) |
| Segments | 7 × 120 s MKV in `/tmp`, concatenated before remux |
| Stills | `hero-stills-c21eb4c1d2fe-pass-t209-ch1-full/` (6 gated) + `hero-frames-video-*` extractions |

---

## Capture harness (fixed)

- Playwright: **page.close → context.close → browser.close → video.path/saveAs** (180 s timeout).
- x11grab: **`/usr/bin/ffmpeg`**, segmented MKV in `/tmp`, **SIGINT** stop, **concat**, remux to deliverable MP4/WebM.
- Exit **nonzero** if duration or hero-still gates fail.

---

## HOLD

Emulator only; no prod / merge PR #52 / main / domain / rules / Stripe; no preview deploy from agent.