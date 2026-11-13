# Owner decisions — canon vs Life Story concept

**Superseded for decisions by:** [`OWNER_DECISIONS.md`](./OWNER_DECISIONS.md) (**t138u** register with recommendations).  
**Rule:** design agents **do not** silently replace approved canon. Each item needs Owner choice before implementation.

---

## Q1 — Setting: Tykvograd vs Angel City

| Option | Description |
|--------|-------------|
| **A. Replace** | Angel City becomes primary world; House 13 becomes flashback/DLC |
| **B. Parallel** | Angel City = “real world” layer; Tykvograd = in-game fiction / portal zone |
| **C. Reskin** | Keep House 13 geography; rename tone only (minimal art change) |
| **D. Cancel Angel City** | Keep Tykvograd; apply Narrated Gameplay + host to existing map |

**Current docs conflict:** `STORY_ENDINGS_TZ_2026-10-25.md`, `PUNK_ME_TZ_locations.md` vs Owner t135u “Angel City”.

---

## Q2 — Season 1 (5 chapters) vs existing 4-chapter Bell arc

| Option | Description |
|--------|-------------|
| **A. New season track** | Season 1 Angel City completes separately; Bell arc = Season 2+ |
| **B. Merge finales** | Season 5 finale feeds into three Bell endings |
| **C. Abandon Bell in web** | Focus life-sim; Bell only Roblox |
| **D. Keep Bell only** | Reject five-chapter Angel season |

**Approved canon:** three endings `ending_break_curse`, `ending_zombie_style`, `ending_count_deal`.

---

## Q3 — Chapter 1 onboarding path

| Option | Description |
|--------|-------------|
| **A. Replace ch0** | `onboarding.js` steps → Angel City script (`CH1_DIALOGUES.md`) |
| **B. Dual onboarding** | Player picks “Angel City” vs “House 13” at start |
| **C. Keep ch0** | Angel City starts after existing Razor intro |
| **D. Shortened ch0** | Keep movement tutorial only; then Angel City |

**Current code:** 14 steps `ch0_*` tied to `QUEST_TABLE.md` `ch0_s_*`.

---

## Q4 — Currency naming

| Option | Description |
|--------|-------------|
| **A. Rename UI to Angel Coins** | Keep `me.coins` integer backend |
| **B. New field** | `angelCoins` separate from legacy монеты |
| **C. Keep монеты** | Narrator says “Angel Coins” in VO only |

**Current:** `balance.json` `startingCoins: 100`; initiation `150` for Razor path.

---

## Q5 — Angelina 3D avatar (ICE spec)

| Option | Description |
|--------|-------------|
| **A. Wait for ICE approval** | Ship ch1 with portrait + beacon host only |
| **B. Commission Meshy** | New GLB under CC BY; submit to ICE |
| **C. 2D host only** | Permanent illustrated avatar |
| **D. No on-screen body** | Voice + journal only |

**Canon:** `STORY_ENDINGS_TZ` §5 — avatar pending; repo has **no** Angelina GLB.

---

## Q6 — Host role vs Authority meter

| Option | Description |
|--------|-------------|
| **A. Angelina replaces Authority HUD** | Gang ranks hidden in Angel City mode |
| **B. Dual meters** | Trust (Angelina) + Authority (Tykvograd) |
| **C. Keep Authority** | Angelina hints only; Razor path unchanged |

**Current:** `#authorityStat`, `authority-path.json` stages 1–4.

---

## Q7 — Razor, Rusty Chains, gang cast

| Option | Description |
|--------|-------------|
| **A. Cameo later** | Season 1 no Razor |
| **B. Parallel questline** | Optional “old town” after ch1 |
| **C. Full integration** | Mira = reskin Vienna (reject without art) |
| **D. Keep gang as core** | Angel City framing is marketing only |

**CHARACTERS.md** defines Razor, Vienna, Cobalt, Mohawk as core cast.

---

## Q8 — Voice strategy for checkpoint (quality ch1)

| Option | Description |
|--------|-------------|
| **A. Human actors** | Narrator + Angelina + Mira session; Piper dev only |
| **B. Hybrid** | Human narrator; Piper NPCs until budget |
| **C. Premium TTS vendor** | e.g. ElevenLabs (legal/budget review) |
| **D. Piper ship** | Reject Owner “professional” requirement |

Cost ranges: see `EFFORT_PLAN.md` (GVAA / Voquent / Real Voice Over — **not** connected to payments).

---

## Q9 — Music direction

| Option | Description |
|--------|-------------|
| **A. Replace rock OGA** | New ambient beds per district |
| **B. Duck + filter** | Keep files, lower mix in life-sim zones |
| **C. Commission composer** | Original Angel City theme |
| **D. Silence + VO** | Minimal music ch1 |

**Current:** Matthew Steele rock in `assets/audio/music/` per `LICENSES.md`.

---

## Q10 — Chat & social

| Option | Description |
|--------|-------------|
| **A. Phrase wheel only** | Remove free text in Angel City |
| **B. Keep free chat** | 280 char rules |
| **C. Disable chat entirely** | Single-player story |
| **D. Age-gated open chat** | 16+ toggle |

---

## Q11 — Ukrainian (UK) locale

| Option | Description |
|--------|-------------|
| **A. Full uk parity** | Translate Season 1 + VO |
| **B. UI uk only** | VO ru/en |
| **C. Rename label** | Clarify UK = Ukrainian not British English |
| **D. Drop uk** | ru/en/da only |

**Current:** partial `uk` in `i18n.js` with ru fallback.

---

## Q12 — Roblox PR #44 alignment

| Option | Description |
|--------|-------------|
| **A. Quest ids shared** | `quest-table.json` = source of truth both platforms |
| **B. Fork tables** | Web Season 1; Roblox stays Tykvograd |
| **C. Roblox leads** | Delay web until Roblox season spec |
| **D. Cancel Roblox sync** | Independent tracks |

---

## Q13 — Monetization / Stripe (t104u)

| Option | Description |
|--------|-------------|
| **A. No change in redesign Phase** | Story first |
| **B. Cosmetic shop Angel Coins** | No paywall on ch1 |
| **C. Subscribe after Season 1** | 4.99€ sandbox only until GO |

**Forbidden without GO:** live payments, ads (`Owner directive`).

---

## Q14 — “New Girl in Town” vs player gender / character choice (t137u)

| Option | Description |
|--------|-------------|
| **A. Neutral title** | UI string “New in Town” / “Новенький в городе” (gender-neutral RU) |
| **B. Keep “New Girl”** | Fixed feminine marketing; player picks any avatar body |
| **C. Dynamic title** | Journal title from `character.genderPresentation` flag |
| **D. Separate titles** | Male/female/nonbinary copy variants in i18n |

**Conflict:** Chapter 1 Owner title is **New Girl in Town**; playable cast includes Cobalt and others (`CHARACTERS.md`).

---

## Q15 — Punk-gang / Halloween canon vs Angel City (t137u)

| Option | Description |
|--------|-------------|
| **A. Separate IP layer** | Angel City = primary; Tykvograd = TV show inside game / poster world |
| **B. Same world** | Razor/Mohawk live in another district (“Old Town”) reachable later |
| **C. Reskin gang** | Existing Meshy heroes become Angel City teens with new names |
| **D. Pause legacy** | Hide House 13 route until Season 2+; no gang in P1 MVP |

**Assets:** `assets/models/meshy/*.glb`, Halloween tone in `PUNK_ME_TZ_locations.md`.

---

## Q16 — Graveyard / crypt / chain-fight content (t137u)

| Option | Description |
|--------|-------------|
| **A. Later season district** | Cemetery as unlockable zone Season 2+ with Bell mystery |
| **B. Mini-zone in Season 1** | Ch5 truth ties to crypt (heavy scope) |
| **C. Cut from Angel City mode** | Legacy Tykvograd only; not in P1 district |
| **D. Narrative echo only** | Posters/lore; no cemetery gameplay in S1 |

**Current code:** `cemetery`, `castle`, duels, `authority-path.json` chain fights.

---

## Priority for Owner meeting (recommended order)

1. **Q1 + Q2 + Q14–Q16** (world, season, title, canon geography)  
2. **Q3** (replace ch0 or not)  
3. **Q5 + Q8** (Angelina presence + voice budget)  
4. **Q12** (Roblox)  
5. **Q4, Q6, Q9–Q11, Q13** (secondary)
