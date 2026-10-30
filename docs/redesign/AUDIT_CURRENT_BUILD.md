# Audit — current build vs Owner gap table (r6 baseline)

**Baseline:** `cursor/scenario-preview-r6-d81d` @ `b4ea4c7` (`GAME_VERSION`: `story-preview-p0-r4` in `js/game.js`).  
**Scope:** honest inventory for redesign Phase 1 — **not** a pass/fail for CEO re-QA on `492d464`.  
**Method:** code + assets + playable systems on r6; AUTOMATED e2e in progress, **human phone kit** not executed (`docs/release/PLAYTEST_NEW_PLAYER_PHONE.md`).

---

## Gap table (Owner directive t135u) — row by row

| Owner gap | What exists today | What is missing / weak | Severity | Evidence |
|-----------|-------------------|-------------------------|----------|----------|
| **Primitive graphics → quality 3D, one style, smooth animation** | WebGL world in `js/world3d.mjs`; hero GLBs Meshy (`assets/models/meshy/{razor,punk_pink,mohawk,cobalt}.glb`, CC BY 4.0); procedural room shells in `js/world/locations.mjs` + clutter props; idle/walk/run retarget in `js/world/meshy-punk.mjs`; 2D HUD/posters `imagine_images/` (~60 JPG) mixed with 3D | No **Angel City** art direction; rooms vary in prop density; Angelina has **no** 3D model (CSS gradient portrait); some NPCs still poster/2D lineage; animation set minimal (3 locomotion clips); no facial performance beyond jaw hook; mobile tier disables shadows/AA (`mobileQuality` in `world3d.mjs`) | **P0** visual | `css/game.css`, `docs/CHARACTERS.md` |
| **No storyline → chapters, missions, conflicts** | Data-driven quests `data/story/quests.json` (29 ids); spine `js/story/story-spine.mjs`; ch0 **14-step** code onboarding `js/onboarding.js`; chapter intro slides `js/story/chapter-intro.mjs`; Authority ch1 `js/story/authority.mjs`; endings scaffold `js/story/story-endings.mjs` + `STORY_ENDINGS_TZ_2026-10-25.md` | Story is **Tykvograd / House 13 / Rusty Chains**, not Angel City life-sim arc; many side quests/jobs without unified season narrator; conflict/climax/resolution **not** packaged as “Season 1 five chapters” in product; ch2–4 playable depth uneven vs design docs | **P0** narrative product | `docs/release/QUEST_TABLE.md`, `docs/game-design/STORY_STORYBOARD.md` |
| **No voice → professional voice** | Piper-rendered lines `assets/audio/voice/{ru,en,da}/` (~45 mp3/lang + manifest); playback `js/speech-bridge.mjs`, `js/audio-manager.mjs`; catalog `data/audio/voice-lines.json` | **Not** professional human VO; Owner policy in `VOICEOVER_AND_SUBTITLES.md` rejects cheap TTS for shipping; DA Piper noted robotic in `LICENSES.md`; narrator onboarding uses Piper + `js/narrator.mjs` polling, not cinematic director | **P0** audio quality | `docs/audio/VOICE_MODEL_ACCEPTANCE.md`, `D-VOICE-01` in `DEFECTS.md` |
| **No host → Angelina permanent guide (13–15)** | Help panel `#angelinaHelpPanel` `js/story/angelina-help.mjs`, tiers `js/story/angelina-guide.mjs`; authority HUD `js/story/authority.mjs`; context banner `#angelinaContext` | Angelina is **reactive help button**, not following/leading NPC; no 3D presence; not tied to Narrated Gameplay beats; spec says avatar waits ICE approval (`STORY_ENDINGS_TZ` §5) | **P0** UX/host | `index.html`, `angelina-help.mjs` L1 comment |
| **No dialogues → choices + consequences** | `data/story/dialogues.json` (14 trees); runtime `story-engine.mjs` choices with `effects` (flags, quests, duels) | Most ch0 is **action steps**, not conversation trees; few branching consequences in first 10 minutes; no unified “dialogue consequence” schema doc for life-sim | **P1** (partial engine exists) | grep `choices` in dialogues.json |
| **No hints → steps, markers, tutorial** | Onboarding hints per step `onboarding.js`; Angelina tiers 1–4; beacons `BEACONS` + `js/world/quest-markers.mjs`; `#storyGoalBar` `story-goal-hud.mjs`; idle hints 60/120/180s | First-time player still gets lost (R4 QA, honest e2e stuck on movement/overlays on r6); tier-4 “solution” recently patched; **no** single “Mission 1 — Follow Angelina” UI | **P1** | `P0_CH0_CH1_DEFECTS.md` |
| **No motivation → rewards, growth, unlocks** | Coins/XP `game.js`, `balance.json` (start 100, fee 150); quest rewards; authority ranks; location locks `story-spine.mjs`; daily quests `gameplay-v21.mjs`; shop `game.js` | No **achievements** system; no **Angel Coins** branding; decoration/clothes loop weak in ch0; “character growth” = numeric level only | **P1** | no `achievement` symbols in repo |
| **Unclear what to do → objective + next action** | `#questBox` onboarding tracker; story goal HUD; context hint line | Competing overlays (intro/how-to/start) blocked input in tests; objective text sometimes raw keys in QA history; Angelina not stating **one** next verb | **P0** clarity | honest e2e, R4 report |

### Sound & music (directive add-on)

| Topic | Exists | Gap | Severity |
|-------|--------|-----|----------|
| Scene-appropriate music | Location buckets `audio-manager.mjs` → `assets/audio/music/music_{home,street,cemetery,city,roof,construction,castle}.{mp3,ogg}` | **Heavy rock/thrash** on street/city/roof per `LICENSES.md` (Matthew Steele pack) — conflicts with Owner “no random heavy rock”; home uses CC0 fastsong | **P1** |
| Speech / SFX / sliders | 3-channel manager; `js/audio-settings-ui.mjs`; ducking on VO | Volume UX exists; emotional narrator direction **not** in pipeline | **P1** |
| Jukebox | Procedural bleeps in kitchen `gameplay-v21.mjs` | Not unified life-sim audio design | **P2** |

### Performance on phones (directive add-on)

| Topic | Exists | Gap | Severity |
|-------|--------|-----|----------|
| Touch | `js/touch-controls.mjs`, `#touchJoystick`, `#touchInteract` | R4: menu/lang at 390px, double-tap nav — partially fixed on r6, not human-verified | **P1** |
| GPU budget | Mobile: pixelRatio 1, no shadows, no MSAA (`world3d.mjs`) | No published FPS/memory budget; long session on mid Android **unmeasured** | **P1** |
| Load | Static hosting + large GLBs + voice assets | Cold start on 4G not benchmarked; 404 on some VO paths in automated runs | **P2** |

### Child safety & data (directive add-on)

| Topic | Exists | Gap | Severity |
|-------|--------|-----|----------|
| Age / PII | `privacy.html`; Firebase rules | No in-game **13+** gate copy aligned with Angel City; no parental consent flow for user testing (process only) | **P1** process |
| Chat | RTDB `chat` 280 char, auth write `database.rules.json`; soft-disabled early story `game.js` | Not “quick phrases only”; free text | **P1** vs new spec |

---

## KEEP inventory (reuse candidates)

| Category | Assets / systems | Quality notes | Reuse in redesign |
|----------|------------------|---------------|-------------------|
| **3D heroes** | `assets/models/meshy/*.glb` (4 gang) | Good silhouettes; CC BY 4.0; clips limited | **KEEP** cast for Tykvograd path; Angelina **new** model TBD |
| **Dog** | `assets/models/pets/punk_dog.glb` | Works in world | KEEP pet sim |
| **Locations module** | `js/world/locations.mjs` + 19 world helpers | Procedural, maintainable | **REUSE** engine; **retheme** or add Angel City zones |
| **World runtime** | `js/world3d.mjs` | Large but feature-complete (portals, duels, markers) | REUSE core; extend follow-camera for host NPC |
| **Quest engine** | `story-engine.mjs`, JSON quests/dialogues | Mature flags/rewards | REUSE data format; new season content |
| **Hint tiers** | `angelina-help.mjs`, `angelina-guide.mjs` | Tier logic works | REUSE; rebind to Narrated Gameplay |
| **Save / progress** | Firebase Auth anon + `players/{uid}`, `story-save-schema.mjs` | Prod guard for dev flags | KEEP |
| **i18n** | `js/i18n.js` ru/en/da + partial **uk** | UK block incomplete (fallback ru) | KEEP pipeline; expand uk |
| **Beacons / markers** | `quest-markers.mjs`, `BEACONS` | Visible in 3D | KEEP |
| **Onboarding step machine** | `onboarding.js` | 14 steps, rewards | **REPLACE content** for Angel City ch1; keep machinery |
| **Speech pipeline** | `speech-bridge.mjs`, manifest | File-based, subtitle sync | KEEP architecture; swap assets to human VO |
| **Interact priority** | `js/interact-priority.mjs` | E vs pet/TV priority fixes on r6 | KEEP |
| **2D art bank** | `imagine_images/*.jpg` | Posters/shop UI | KEEP for UI/shop; not as 3D substitute |
| **Audio SFX** | `assets/audio/sfx/` procedural CC0 | Fine for UI | KEEP |
| **Jobs / economy data** | `data/story/jobs.json`, `balance.json` | Tuned for initiation fee | ADAPT currency naming |

---

## Systems that work (concrete)

- Anonymous Firebase boot + `loadMe` / `saveMe` with migration (`js/game.js`).
- Chapter 0 onboarding can complete to street + Razor talk (AUTOMATED path fragile; P2 fixes on r6).
- Dialogue trees with choices for Razor initiation (`dlg_*` + duels).
- Authority stages 1–4 with HUD (`authority.mjs`).
- Location music crossfade (quality of **genre** is the issue, not code).
- Mobile touch locomotion + camera orbit (`controls-3d.mjs`, `touch-controls.mjs`).
- Roblox quest table parity documented (`docs/release/QUEST_TABLE.md`, PR #44 reference).

---

## Systems weak or misleading for Owner vision

- **Product identity:** game presents punk Halloween Tykvograd, not “Interactive Life Story Simulator / Angel City”.
- **Host fantasy:** Angelina is UI help, not embodied guide.
- **First 10 minutes:** mom/kitchen/Shnurok/elevator — not room/clothes/cafe/mystery message arc.
- **Voice marketing risk:** Piper can sound acceptable for dev; fails Owner “professional” bar.
- **Music:** rock pack undermines life-sim tone (Owner explicit).
- **QA truth:** smoke tests used cheats; honest emulator e2e still maturing; no signed human phone run.

---

## Severity legend

- **P0:** blocks Owner redesign acceptance or misrepresents product quality.
- **P1:** major gap but engine pieces exist.
- **P2:** polish, measurement, or content depth.

---

## Related repo docs

- `docs/release/P0_CH0_CH1_DEFECTS.md` (R4/R6 defect mapping)  
- `docs/release/REQUIREMENTS_MATRIX.md`  
- `docs/game-design/VOICEOVER_AND_SUBTITLES.md`  
- `docs/audio/LICENSES.md`
