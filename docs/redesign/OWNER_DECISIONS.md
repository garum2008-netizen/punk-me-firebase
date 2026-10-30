# Owner decisions — canon vs Life Story concept (t138u)

**Authority:** `OWNER_AMENDMENTS_t138u` **overrides** earlier directives where they conflict.

## What the Owner actually locked (t138u)

These are **not** open decisions — do not treat them as “agent LOCK labels” on individual rows unless they repeat one of these:

| Lock | Meaning |
|------|---------|
| **ORIGINAL LOCK** | Approved **story, characters, locations, currency (`me.coins` / монеты), chapter 0 (`q_ch0_newbie`)** stay until separate Owner GO. Concept **develops** the game; **“Angel City”** / “My Life, My Story” = **working titles** only. |
| **Angelina avatar** | Wait for **ICE** — no final model approval in design/docs PRs. |
| **Checkpoint** | **Playable Chapter 1 vertical slice** (`VERTICAL_SLICE_PLAN.md`) — documents alone do **not** complete the redesign. |
| **Testing order** | **Internal QA first**; controlled tests with children only with **parental consent** (no unnecessary personal data). |
| **Production** | **No deploy, no payments, no promo-as-finished** without separate Owner GO. |

Everything else in the table below is **options + agent recommendation** and/or **Open owner decision** until the Owner marks **Decision: D# = …** on the Draft PR.

**How to use this file:** Each row is a **contradiction** between Owner concept (t137u) and **approved canon** (`QUEST_TABLE.md`, `STORY_ENDINGS_TZ_2026-10-25.md`, `CHARACTERS.md`, `balance.json`).

| ID | Contradiction | Options | Agent recommendation / status |
|----|---------------|---------|--------------------------------|
| **D1** | **City name:** Tykvograd / House 13 vs pitch **“Angel City”** | **A** Replace geography · **B** Working title / tone refresh · **C** Parallel zone after ch0 · **D** Subtitle only | **Open.** Recommend **B + D:** keep Tykvograd in data/UI; “Angel City” in pitch docs only until Owner picks. |
| **D2** | **Five Owner chapter titles** vs **gl.0–4 + three Bell endings** | **A** Parallel season · **B** Map titles to episodes · **C** Replace Bell · **D** UI-only labels | **Open.** Recommend **B:** life layer after ch0; Bell arc unchanged. |
| **D3** | **Chapter 0** vs room-first life script | **A** Delete ch0 · **B** Dual start · **C** Keep ch0; life after `reward_ch0_complete` · **D** Shorten ch0 | Recommend **C** — required by **ORIGINAL LOCK (ch0)**. Owner still picks **gate** (after ch0 vs optional tab) before code merge. |
| **D4** | **“Angel Coins”** vs **`me.coins` / монеты** | **A** UI rename · **B** New field · **C** Keep монеты · **D** VO only | Recommend **C** — **ORIGINAL LOCK (currency)**. Rename only after explicit Owner GO on **D4-A**. |
| **D5** | Arrival cinematic vs wake in House 13 | **A** Reskin · **B** Room in Tykvograd · **C** Dream · **D** Drop cinematic | **Open.** Recommend **B** for vertical slice. |
| **D6** | **“New Girl in Town”** vs any avatar | **A** Neutral title · **B** Keep marketing title · **C** Dynamic · **D** Locale variants | **Open.** Recommend **A + C** for journal copy. |
| **D7** | Angelina mentor vs **Authority / Razor** | **A** Hide Authority · **B** Dual HUD · **C** Angelina hints only | **Open.** Recommend **C** (keep Authority HUD and Razor path). |
| **D8** | **NPC Mira** vs Vienna / Razor cast | **A** New NPC · **B** Vienna reskin · **C** Existing shop NPC · **D** Reuse `npc_*` | **Open.** Recommend **A**; do not retire Vienna without GO. |
| **D9** | **Seven life systems** vs current build | **A** All seven in P1 · **B** P1 subset · **C** Docs only | **Open.** Recommend **B** (matches Owner P1 MVP). |
| **D10** | Human VO vs Piper | **A** Human ship · **B** Stage 1 commercial TTS → Stage 2 human · **C** Piper ship | **Open** (voice strategy). Recommend **B** for prototype **after Owner budget GO** for Stage 1 paid TTS — **nothing purchased or connected in this doc pass** (`VOICE_OPTIONS.md`). Piper = dev fallback only. Stage 2 casting requires separate Owner approval. |
| **D11** | Rock music vs life-sim tone | **A** Replace · **B** Duck/mute · **C** Commission · **D** VO-only | **Open.** Recommend **B** for slice; **A** before broad promo. |
| **D12** | Free-text chat vs quick phrases (P2) | **A** Phrase wheel · **B** Keep 280 char · **C** Disable chat · **D** Age gate | **Open owner decision.** Recommend **A** long-term; until P2 social GO, **do not enable free text** in the new **safe chat** track ([PR #46](https://github.com/garum2008-netizen/punk-me-firebase/pull/46)) — preset phrases / disabled write only. Legacy RTDB chat unchanged on `main` until Owner decides migration. |
| **D13** | Roblox table vs web `q_life_*` | **A** Shared ids · **B** Web additive · **C** Roblox leads · **D** Fork | **Open.** Recommend **B**. |
| **D14** | Graveyard / duels vs peaceful life ch1 | **A** Hide in life mode · **B** Parallel · **C** Cut legacy · **D** Lore echo | **Open.** Recommend **A** for slice scope (life quest need not require duel). |
| **D15** | Angelina 3D avatar | **A** Wait ICE · **B** Meshy · **C** 2D only · **D** Voice only | **Owner lock:** **A** — ICE before final appearance; requirements-only in docs; portrait + beacon until then. |
| **D16** | Monetization / Stripe (P3) | **A** No change in redesign · **B** Cosmetics later · **C** Subscribe | **Open owner decision** on product monetization shape. Recommend **A** for redesign phase documentation. **Process lock (t138u):** no live payments or cosmetic SKU wiring without separate Owner GO; vertical slice must ship **without** payment UI. |
| **D17** | Docs vs playable slice | **A** Docs enough · **B** Playable slice required | **Owner lock:** **B** — `VERTICAL_SLICE_PLAN.md` is the redesign checkpoint. |
| **D18** | Testing | **A** Agent smoke only · **B** Internal QA → minors with consent | **Owner lock (order):** **B** — internal QA on agreed devices **first**; child sessions only after parental consent process (Owner-run); agents do not run minor tests. |

---

## Mapping table (concept → canon, no replacement)

| Owner concept (t137u) | Canon anchor (keep) | Development (after decisions) |
|----------------------|---------------------|--------------------------------|
| Ch1 **New Girl in Town** | `gl.0` complete → street / life entry | Quest **`q_life_ch1_settle`** (proposed): room, outfit, friend, cafe, message |
| Ch2 **Build Your Dream Life** | `q_initiation_*`, `q_ch2_hangout` | Extra decor/style missions **alongside** gang arc |
| Ch3 **The Secret Club** | Bell / club tease | New district after P1 if Owner extends **D2** |
| Ch4 **The Big Challenge** | Hangout / castle prep | Optional festival beat |
| Ch5 **The Hidden Truth** | Three endings + S2 hook | Do not rewrite `ending_*` without GO |
| **Currency loop** | `me.coins`, shop, jobs | Cafe rewards **монеты** |
| **Host** | Angelina help + ch0 voice | Lead/follow on life quest steps; **no ICE model** |

---

## Supersedes

Detail for Q1–Q16: [`OWNER_QUESTIONS.md`](./OWNER_QUESTIONS.md). **Decision register for Draft PR #51** (`cursor/redesign-docs-main-d81d`, docs-only from `main`). PR #50 superseded for review.
