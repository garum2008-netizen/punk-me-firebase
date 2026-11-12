# PUNK ME — Story Bible (working draft, t204u)

**Status:** Canon resolution **t204u** (Inna Kragh, 2026-11-12) · **not** production until owner acceptance.  
**Branch:** `cursor/vertical-slice-ch1-d81d` · **Production:** HOLD.

## Executive summary

PUNK ME Chapter 1 is a **vertical slice**: **Character Studio** hero creation → onboarding (seven steps ending in **city crypt build**) → **Life Ch1** (`q_life_ch1_settle`). The **player** is a **custom 3D hero** they name. **Angelina** is a **permanent story companion/guide** (skins A/B/C-v2 = **companion** art only).

## Approved canon (t204u — supersedes 03.11 “player = Angelina”)

| Role | Rule |
|------|------|
| **Player** | Creates persistent **custom hero** (`me.avatarConfig`, `me.heroName`). Appears in 3D gameplay, build, crypt, save/load. |
| **Angelina** | **Companion** — guide banner, dialogue portraits, Life Ch1 wardrobe (companion look). Not the player mesh. |
| **Dialogue** | May use the player’s **chosen name** where lines support `{name}` / localized variants. Life Ch1 JSON may still use first-person **player** speaker until copy pass. |
| **Art** | Approved Angelina A/B/C-v2 → **companion only**. |

**Historical note:** `docs/release/ANGELINA_PLAYER_REWRITE.md` (2026-11-03) described preview as **player = Angelina**. **t204u owner directive replaces that** for new work; file kept for audit, not as active canon.

## Guide + hero (resolved)

**Arc draft** (“Город, который забыл своё имя”): Angelina **accompanies** the player — **implemented** as companion + custom hero, not dual POV as “you play Angelina.”

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
| **Player hero** | Custom avatar (Character Studio) |
| **Angelina** | Companion (guide + portrait dialogs + wardrobe) |
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
