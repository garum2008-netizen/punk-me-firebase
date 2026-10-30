# Keep / Improve / Replace — current build vs Life Story direction

**Baseline:** r6 @ `b4ea4c7`. **Rule (t138u):** ORIGINAL LOCK — canon story, cast, locations, **currency**, **chapter 0** **Keep** until Owner row in [`OWNER_DECISIONS.md`](./OWNER_DECISIONS.md) says otherwise.

| Area | Existing (evidence) | Keep | Improve | Replace | Owner decision |
|------|---------------------|------|---------|---------|----------------|
| **World / Tykvograd** | `locations.mjs`, House 13, Street, cemetery, castle | ✓ Geography & portals | Retheme props/music in life zones; add cafe interior | ✗ New “Angel City” map as primary | **D1** — recommend keep Tykvograd id |
| **Chapter 0** | `onboarding.js`, `q_ch0_newbie`, 14 steps | ✓ Full flow | Shorter copy, narrator events on milestones | ✗ Angel City arrival replaces ch0 | **D3** — recommend keep ch0 |
| **Main story gl.1–4** | `quests.json`, Bell, Razor, endings | ✓ Quest ids & endings | Narrator + Angelina on beats; journal clarity | ✗ Five-chapter season replaces Bell | **D2** — map titles, keep arc |
| **Currency** | `me.coins`, `balance.json` 100 start, UI монеты | ✓ Field & economy rules | Mission reward UX, visible “next reward” | ✗ “Angel Coins” rebrand without GO | **D4** |
| **Quest engine** | `story-engine.mjs`, flags, rewards | ✓ | Validate choice effects; life quest ids | — | — |
| **Save / Firebase** | `saveMe`, `story-save-schema.mjs` | ✓ | `relationships`, `achievements[]`, life flags | — | — |
| **3D runtime** | `world3d.mjs`, touch, markers | ✓ | Host NPC follow, FPS telemetry | — | — |
| **Hero models** | Meshy gang GLBs CC BY 4.0 | ✓ Cast | Animation polish per `QUALITY_BENCHMARK.md` | ✗ Reskin as Mira/Vienna without GO | **D8** |
| **Angelina** | `angelina-help.mjs`, tiers, portrait | ✓ Tier logic | Lead mode, VO hooks, subtitle sync | ✗ Final 3D before ICE | **D15** |
| **Narrator** | `narrator.mjs` onboarding polling | ✓ Subtitle + speech pipeline | Event-driven `NarratorDirector`, ≥5 ch1 events | ✗ Piper as ship VO | **D10** |
| **Dialogues** | `dialogues.json`, choices | ✓ Format | +3 interactive trees ch1 life quest | — | — |
| **Voice assets** | Piper mp3, `voice-lines.json` | ✓ Pipeline | Stage 1 commercial TTS prototype; Stage 2 actors | Piper for shipping | **D10**, `VOICE_OPTIONS.md` |
| **Music** | Matthew Steele rock + CC0 home | CC0 SFX | Duck/mute in life quests; new beds | Rock in life-sim UI | **D11** |
| **Chat** | RTDB 280 char | ✓ Rules until P2 | Phrase wheel design | Free text removal | **D12** |
| **Onboarding UI** | Intro slides, how-to overlays | ✓ Machinery | Single mission card; reduce overlay stack | 14-step deletion | **D3** |
| **Jobs / cafe** | `jobs.json`, kitchen minigames | ✓ Economy | Dedicated cafe shift for life ch1 | — | P1 MVP |
| **Home build** | Partial placement `game.js` | ✓ | 3-slot furnish mission | — | P1 MVP |
| **Shop / clothes** | Character select, shop | ✓ | First-outfit mission w/ preview | — | P1 MVP |
| **Authority HUD** | `authority.mjs` | ✓ | Optional hide in “life journal” view only | Angelina replaces Authority | **D7** |
| **Achievements** | None | — | New module + toasts | — | P2 |
| **i18n uk** | Partial `i18n.js` | ✓ ru/en/da | Complete uk UI strings | — | **D13** in OWNER_QUESTIONS |
| **QA process** | Automated smoke, honest e2e WIP | ✓ Scripts | Internal QA checklist → parental playtest | Agent-only sign-off | **D17–D18** |
| **Monetization** | Stripe sandbox docs | ✓ No live charge | P3 cosmetic SKUs doc | Story paywalls | **D16** — no GO |
| **Product title** | PUNK ME / Tykvograd | ✓ IP | Subtitle “My Life, My Story” in menu | Rename world to Angel City in UI | **D1** |

**Legend:** ✓ = recommended default under ORIGINAL LOCK. **Replace** column lists what t137u docs * incorrectly implied* before t138u — not agent action without Owner GO.
