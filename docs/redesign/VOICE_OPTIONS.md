# Voice options — Stage 1 (prototype) & Stage 2 (shipping)

**Policy (t138u):** Nothing purchased or connected in this doc pass. **Commercial rights required** for any audio shipped to players. Piper in repo = **development fallback only** (`docs/audio/VOICE_MODEL_ACCEPTANCE.md`).

**Ch1 vertical slice scope (words):** ~600–900 spoken words (narrator ~250, Angelina ~350, Mira ~150, UI barks ~50) — from `CH1_DIALOGUES.md`.

---

## Stage 1 — Temporary AI voice (prototype checkpoint)

**Purpose:** Unblock **playable Chapter 1 vertical slice** with synced subtitles and event timing before casting final actors.

| Vendor | Public pricing (checked 2026-10-30) | Commercial licence (summary) | Fit for Stage 1 |
|--------|--------------------------------------|------------------------------|-----------------|
| **ElevenLabs** | Free $0 / 10k credits — **non-commercial only**; **Starter $6/mo** (30k credits, **Commercial License** listed on plan); Creator $22/mo; Pro $99/mo — https://elevenlabs.io/pricing | Paid subscription: Terms §2 — **Paid Users** may use Services and **Output for commercial purposes** subject to Prohibited Use Policy; **Free Users non-commercial only** — https://www.elevenlabs.io/terms-of-use | **Yes** if **paid plan** + legal review of game category; regenerate lines in CI; store mp3 + manifest like Piper |
| **PlayHT** (example alt) | Plans from ~$31/mo with commercial terms on paid tiers — verify current page before buy | Must read vendor ToS per project | Backup if ElevenLabs voice unsuitable |
| **Piper (local)** | $0 | OSS voices — check per-voice licence in manifest | **Dev / offline only** — not Owner “professional” bar for ship |

**Stage 1 budget estimate (planning):**

- ElevenLabs Starter **$6–22/mo** × 2–3 months iteration ≈ **$12–66** for ch1 line churn (regenerations).
- One-time export pipeline work (already similar to `scripts/build-voice-lines.mjs`).

**Stage 1 acceptance (prototype):**

- Every `voiceId` in ch1 narrator table plays without 404.
- Subtitle text matches spoken line (same string key); max desync **500 ms** after line start on target phone.
- No Free-tier ElevenLabs output in public builds.

---

## Stage 2 — Final voices (Owner approval + budget)

**Purpose:** Replace Stage 1 temp files before marketing / minors testing at scale.

| Channel | Public rate reference | Typical ch1 buyout (planning) | Commercial licence |
|---------|----------------------|---------------------------------|-------------------|
| **Union / GVAA-style session** | Voice Crafters industry card **$200–350/hr**, 2–4 hr min — https://www.voicecrafters.com/industry-standard-voice-over-rates/ | Narrator 2 hr + Angelina 2 hr + Mira 1 hr ≈ **$1,000–2,800** session + studio | Work-for-hire / buyout in contract (legal draft) |
| **Marketplace character pack** | Voquent from **~$650+** for ~20 lines (plan-dependent) — https://www.voquent.com/voice-over/rates/ | Per-character packages × 3 ≈ **$2k–4k** | Platform licence + game usage clause — read per booking |
| **Word-based indie** | Real Voice Over calculator **~$0.24/word** game — https://realvoiceover.com/tools/voice-rate-calculator | 800 words ≈ **$192** + revisions | Per SOW |

**Stage 2 acceptance (shipping bar):**

- Owner sign-off on narrator timbre + Angelina age read (13–15) per `VOICE_MODEL_ACCEPTANCE.md`.
- **RU master** recorded first; EN/DA/UK follow same script ids.
- All files **work-for-hire or equivalent** documented in `docs/audio/LICENSES.md` before merge to `main`.

---

## Implementation (both stages)

| Piece | Technical |
|-------|-----------|
| Catalog | Extend `data/audio/voice-lines.json` — `id`, `speaker`, `lang`, `file`, `durationMs` |
| Playback | Reuse `js/speech-bridge.mjs` + `audio-manager.mjs` ducking |
| Triggers | `NarratorDirector` + dialogue nodes call `SpeechBridge.playLine(voiceId)` |
| Subtitles | `#voiceSubtitle` + i18n key = `voiceId` text |
| CI | Script fails if ch1 `voiceId` missing from manifest |

**Owner decision:** **D10** — recommend **Stage 1 paid AI → Stage 2 human** for narrator + Angelina; Mira may stay AI longer if budget constrained.

**Not in scope:** Connecting Stripe, hiring actors, or storing API keys in repo.
