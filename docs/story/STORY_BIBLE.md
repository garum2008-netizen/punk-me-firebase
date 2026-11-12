# PUNK ME — Story Bible (working draft, t203u)

**Status:** Phase 1 narrative audit · **not** approved canon until owner sign-off.  
**Branch:** `cursor/vertical-slice-ch1-d81d` · **Production:** HOLD.

## Executive summary

PUNK ME Chapter 1 today is a **vertical slice**: UI onboarding (seven steps ending in **city crypt build**) plus **Life Ch1** (`q_life_ch1_settle`) in the room (outfit → note/trust → reflect). Wider world (street, cemetery, districts) exists as gameplay scaffolding; story text is thinnest outside Life Ch1 JSON.

## Approved canon (do not overwrite)

| Source | Rule |
|--------|------|
| `docs/release/ANGELINA_PLAYER_REWRITE.md` (2026-11-03) | In preview/slice, **the player is Angelina** (teen 13–15). |
| `data/story/life-ch1-slice.json` | First-person POV; `speaker: "player"`; no `"speaker": "angelina"`; NPCs (e.g. Mira) address Angelina by name. |
| `scripts/test-life-ch1-slice-unit.js` | Bans “talk to Angelina” / trust-Angelina-as-NPC strings. |
| Owner 03.11 | Dialogues must **not** treat “you” as a separate person from Angelina. |

## Canon conflict — owner flag (t203u proposed arc)

**Proposed arc draft** (“Город, который забыл своё имя”) describes **Angelina explaining the city to the player** and “accompanying” them — i.e. **guide + player** as two roles.

**Locked canon** says **player = Angelina** (first-person identity).

**Reconciliation options (owner choice required):**

1. **Internal monologue / future self** — banner hints are Angelina’s own thoughts (already closest to current `angelina-guide.mjs`).
2. **Split timeline** — playable present Angelina; voiceover is memory or older self (needs UI label).
3. **Retcon approved 03.11** — revert to external guide (breaks Life Ch1 JSON POV and tests).

**Agent default until owner decides:** keep **player = Angelina**; treat guide banner as **first-person coach**, not a second character.

## World layers (current build)

| Layer | Content | Story density |
|-------|---------|----------------|
| Onboarding 1–6 | Room → street → Razor → cemetery → duel → shop | Tutorial objectives (i18n) |
| Onboarding 7 | City build + **crypt** placement | Objective text only; **no branch trial yet** |
| Life Ch1 | Mirror, note, Mira trust branch | Full RU/EN/DA dialogue JSON |
| `#angelinaGuideBanner` | Contextual hints | RU/EN/DA; first-person teen voice |
| `story-engine` / `quests.json` | Legacy quests | Parallel to slice; not Ch1 gate |

## Characters (in slice)

| Id | Role in Ch1 slice |
|----|-------------------|
| **Angelina** | Player identity (cutout + dialogs) |
| **Mira** | Off-screen / trust branch in reflect |
| **Razor** | Onboarding NPC (street gang) |

## Seven places / memory city (proposed — not implemented)

Owner arc: restore **seven key places**; crypt holds **lost city memory**. **Not** in current gameplay data — map for Ch2–5 only.

## Languages

All player-facing onboarding + guide + Life Ch1: **RU / EN / DA** via `js/i18n.js` and slice JSON `text.{ru,en,da}`.

## Monetization boundary (design only)

See `docs/story/MONETIZATION_CH1_PROPOSAL.md`. **No** production checkout, **no** paywall on crypt/victory/resources.

## Lore files (reference)

- `data/story/life-ch1-slice.json` — Ch1 life arc
- `data/story/dialogues.json` — legacy story engine
- `data/story/quests.json` — legacy quests
- `docs/release/ANGELINA_PLAYER_REWRITE.md` — player=Angelina law
