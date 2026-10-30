# Owner decisions — canon vs Life Story concept (t138u)

**Authority:** `OWNER_AMENDMENTS_t138u` **overrides** earlier directives where they conflict.  
**ORIGINAL LOCK:** Approved **story, characters, locations, currency (`me.coins` / монеты), chapter 0 (`q_ch0_newbie`)** stay until separate Owner GO. **“Angel City”** and **“PUNK ME ANGEL: My Life, My Story”** are **working titles** for the development direction — not a silent world replacement.

**How to use this file:** Each row is a **contradiction** between Owner concept (t137u: seven life systems, five chapter titles, 3–5 min fun, P0–P3) and **approved canon** (`QUEST_TABLE.md`, `STORY_ENDINGS_TZ_2026-10-25.md`, `CHARACTERS.md`, `balance.json`). Pick **A–D** (or hybrid) in the Draft PR review. **Agent recommendation** assumes ORIGINAL LOCK and **develops** the concept on top of the shipping game.

| ID | Contradiction | Options | Agent recommendation |
|----|---------------|---------|----------------------|
| **D1** | **City name:** canon **Tykvograd** / House 13 vs concept **“Angel City”** | **A** Replace geography · **B** Working title for Tykvograd tone refresh · **C** Parallel “new city” zone after ch0 · **D** Marketing subtitle only | **B + D:** Keep Tykvograd as canonical place name in data/UI; use “Angel City” only in Owner pitch docs until D1-B confirmed. Vertical slice uses existing `home` / `street` / retagged interiors — no new city id without GO. |
| **D2** | **Five Owner chapter titles** vs **gl.0–4 + three Bell endings** | **A** New parallel season track · **B** Map titles onto gl.1–4 as **episode names** · **C** Replace Bell arc · **D** Titles UI-only for life-sim beats inside existing chapters | **B:** Ch1 title **New Girl in Town** = **life-sim layer** after ch0 (room/cafe/mystery), not replacement of `q_ch1_initiation_choice`. Bell arc unchanged. Ch5 **Hidden Truth** maps to ch4 finale **only if** Owner merges mystery — else Season 2 hook. |
| **D3** | **Chapter 0:** 14-step House 13 onboarding vs concept arrival/room-first script | **A** Delete ch0 · **B** Dual start · **C** Keep ch0; concept starts **after** `reward_ch0_complete` · **D** Shorten ch0 to movement only | **C (LOCK):** Do **not** replace `onboarding.js` / `q_ch0_newbie`. Implement `CH1_DIALOGUES.md` beats as **`q_life_ch1_*`** (or extension quest) gated after ch0 OR as optional “daily life” tab — **Owner picks gate** before code merge. |
| **D4** | **Currency:** docs said “Angel Coins” vs canon **`me.coins`**, UI **монеты**, `startingCoins: 100` | **A** UI rename · **B** New field · **C** Keep монеты everywhere · **D** VO says “coins”, UI монеты | **C (LOCK):** Keep backend and primary UI **монеты**; optional subtitle in narrator copy only after Owner approves D4-A. No `angelCoins` field without GO. |
| **D5** | **Ch1 script setting** (train arrival, Angel City skyline) vs **wake in House 13** | **A** Cinematic reskin of ch0 ending · **B** Skip cinematic; start at room in Tykvograd · **C** Dream sequence then reality · **D** Drop arrival cinematic | **B:** First life-sim beat = **mirror + room** in existing home; “arrival” line is narrator **metaphor** after ch0, not new map. |
| **D6** | **“New Girl in Town”** vs player may choose **Cobalt / any** hero (`CHARACTERS.md`) | **A** Neutral title · **B** Keep English marketing title · **C** Dynamic from avatar · **D** Per-locale gendered variants | **A + C:** Journal uses **neutral RU** «Новенький в городе» / EN **New in Town**; keep Owner English season doc title as **subtitle**. |
| **D7** | **Angelina mentor** vs **Authority / Razor** core loop | **A** Hide Authority in life mode · **B** Dual HUD · **C** Angelina hints only; Authority unchanged | **C (LOCK):** Keep `#authorityStat` and Razor path; extend Angelina for **life-sim quest** hints only. |
| **D8** | **NPC Mira (cafe)** vs canon cast (Vienna, Razor, …) | **A** Mira = new NPC · **B** Mira = Vienna alternate skin · **C** Cafe uses existing shop NPC · **D** No new NPC; reuse `npc_*` from data | **A:** Add **`npc_mira`** as life-sim friend; do **not** retire Vienna without art + story GO. |
| **D9** | **Seven life systems** vs current **jobs + shop + partial build** | **A** Build all seven in P1 · **B** P1: home/style/work/friends/city stub; school/club ch3+ · **C** Document only | **B:** Matches Owner P1 MVP + ORIGINAL LOCK (no school district before cafe loop proven). |
| **D10** | **Narrator “professional human”** vs **Piper** in repo | **A** Human only ship · **B** Stage 1 AI commercial TTS prototype; Stage 2 human (`VOICE_OPTIONS.md`) · **C** Piper ship | **B (t138u):** Prototype may use **paid commercial TTS**; shipping requires Stage 2 approval. Piper = dev fallback only. |
| **D11** | **Rock music** (`LICENSES.md`) vs life-sim tone | **A** Replace beds · **B** Zone mute/duck in life quests · **C** Commission · **D** VO-only ch1 | **B** for vertical slice; **A** before public promo. |
| **D12** | **Free-text chat** vs **quick phrases** (P2) | **A** Phrase wheel in life mode · **B** Keep 280 char · **C** Disable chat · **D** Age gate | **B (LOCK)** until P2; design phrase wheel; no removal without social GO. |
| **D13** | **Roblox quest table** vs web Season 1 ids (`q_s1_ch1_*`) | **A** Shared ids · **B** Web adds life quests only · **C** Roblox leads · **D** Fork | **B:** Keep `quest-table.json` canon line; add **`q_life_*`** rows in web `quests.json` with Owner approval before Roblox sync. |
| **D14** | **Graveyard / duels** in concept “no combat ch1” vs canon ch1–3 | **A** Life mode hides combat · **B** Parallel routes · **C** Cut legacy · **D** Echo in lore only | **A:** Life-sim vertical slice **does not** disable cemetery; it **does not** require duel for life quest completion. |
| **D15** | **Angelina 3D avatar** | **A** Wait ICE · **B** Meshy commission · **C** 2D only · **D** Voice only | **A (LOCK t138u):** Requirements in GDD §5; **no** final model in this PR. Portrait + beacon until ICE. |
| **D16** | **Monetization / Stripe** | **A** No change · **B** Cosmetics later · **C** Subscribe | **A (LOCK):** P3 docs only; no payments in vertical slice. |
| **D17** | **Checkpoint:** docs vs **playable ch1 vertical slice** | **A** Docs sufficient · **B** Playable slice required | **B (LOCK t138u):** `VERTICAL_SLICE_PLAN.md` is the gate; this doc pack alone does **not** complete redesign. |
| **D18** | **Testing:** agents vs **internal QA → minors with consent** | **A** Agent smoke only · **B** Internal QA then parental playtests | **B (LOCK):** Link `docs/release/PARENTAL_CONSENT_PLAYTEST.md` when present on r6; no child tests before internal QA pass. |

---

## Mapping table (concept → canon, no replacement)

| Owner concept (t137u) | Canon anchor (keep) | Development (after decisions) |
|----------------------|---------------------|--------------------------------|
| Ch1 **New Girl in Town** | `gl.0` complete → street / life entry | Quest **`q_life_ch1_settle`** (proposed): room, outfit, friend, cafe, message |
| Ch2 **Build Your Dream Life** | `q_initiation_*`, `q_ch2_hangout` economy | Extra decor/style missions **alongside** gang arc |
| Ch3 **The Secret Club** | School N/A today; mystery = Bell / club tease | New district **after** P1; tie to `q_ch3_*` only if D2-B extended |
| Ch4 **The Big Challenge** | Festival / hangout / castle prep | Optional festival beat before `q_ch4_castle` |
| Ch5 **The Hidden Truth** | Three endings + Season 2 hook | **Do not** rewrite `ending_*` without Owner GO |
| **Currency loop** | `me.coins`, shop, jobs | Cafe shift rewards **монеты** |
| **Host** | Angelina help + ch0 voice | Lead/follow on **life quest** steps only |

---

## Supersedes

Detailed option text for Q1–Q16 remains in [`OWNER_QUESTIONS.md`](./OWNER_QUESTIONS.md) for meeting notes. **This file is the decision register for Draft PR #50 (t138u).** Owner marks **Decision:** `D# = ?` inline or in PR comments.
