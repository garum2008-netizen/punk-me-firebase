# Season 1 — My Life, My Story (five chapters)

**Product:** PUNK ME ANGEL — **My Life, My Story** (Life Simulator + Mystery Story).  
**Setting:** **Angel City** (Owner t137u).  
**Chapter titles (Owner exact):** use English titles below; localise in UI/VO.

| # | Owner title | RU working title |
|---|-------------|------------------|
| 1 | **New Girl in Town** | Новенькая в городе |
| 2 | **Build Your Dream Life** | Построй жизнь мечты |
| 3 | **The Secret Club** | Тайный клуб |
| 4 | **The Big Challenge** | Большой вызов |
| 5 | **The Hidden Truth** | Скрытая правда |

**Format per chapter:** goal · conflict · climax · resolution · missions · choices/consequences · rewards · cliffhanger.

---

## Season logline

You create a character, move to Angel City, and build a real life—home, style, friends, school, work—while Angelina mentors you. A mystery runs under the city; each chapter reveals more until a **final decision in Ch5** changes your tasks and opens **Season 2**.

---

## Chapter 1 — New Girl in Town

| | |
|--|--|
| **Goal** | Arrive; meet Angelina; get first room; first outfit; first currency; first story hook |
| **Conflict** | New place; deposit for room; social anxiety (player choice tone) |
| **Climax** | Cafe shift pressure—recover without failing the shift |
| **Resolution** | Room liveable; outfit chosen; friend met; deposit paid |
| **Missions** | M1 Choose outfit · M2 Follow Angelina · M3 Furnish room · M4 Meet friend + cafe shift · M5 Mysterious message |
| **Key choices** | Outfit style; how to greet Mira; trust Angelina with message or not |
| **Consequences** | `[rel_mira]`, `[flag:mystery_*]`, reputation +creativity if bold outfit |
| **Rewards** | 100 + 50 + 80 Angel Coins; `ach_ch1_settled`; unlock cafe on map |
| **Cliffhanger** | Anonymous note about the “sound at arrival”—Season thread `s1_secret` opened |
| **Daily life** | After M2, player may re-decorate or explore street **before** cafe (optional) |
| **First 10 min** | Scripted in `CH1_DIALOGUES.md` (0–2 arrival, 2–5 room, 5–8 friends/cafe, 8–10 mystery) |

---

## Chapter 2 — Build Your Dream Life

| | |
|--|--|
| **Goal** | Earn steady income; expand style; meet core cast (3–5 NPCs); open second shop type |
| **Conflict** | Rival at work; budget trade-offs (furniture vs clothes) |
| **Climax** | “First paycheck” event—choose where to invest |
| **Resolution** | Stable loop: work → coins → home/style; **School** district unlocked (classes stub) |
| **Missions** | Job streak · Style challenge · Help NPC side quest · Upgrade room tier 1 |
| **Key choices** | Cover coworker mistake vs report; spend on decor vs outfit |
| **Consequences** | Work reputation; `[rel_*]` shifts; unlock design studio shift (optional) |
| **Rewards** | New furniture pack; reputation rank “Helpful”; district **Park** teaser |
| **Cliffhanger** | School poster: “Secret Club — invite only” |

---

## Chapter 3 — The Secret Club

| | |
|--|--|
| **Goal** | Enter school social layer; receive mysterious invitation; decide **whom to trust** and **which team** |
| **Conflict** | Two student factions; Angelina warns vs encourages curiosity |
| **Climax** | Night meeting—dialogue-heavy; wrong trust path complicates Ch4 (not hard fail) |
| **Resolution** | Player aligned with **Team A or B**; club membership flag |
| **Missions** | Attend class task · Find invitation · Infiltration dialogue tree · Club oath choice |
| **Key choices** | Trust Angelina / solo / peer leader; Team A vs Team B |
| **Consequences** | `[flag:club_team]`; locked dialogue in Ch4 festival; relationship deltas |
| **Rewards** | Club badge cosmetic; reputation “Trusted” or “Independent”; secret map pin |
| **Cliffhanger** | Club knows something about Angel City’s “old festival” |

---

## Chapter 4 — The Big Challenge

| | |
|--|--|
| **Goal** | City festival; competitions; team tasks; **new districts** open |
| **Conflict** | Team rivalry; timed festival games; resource prep (work/home buffs) |
| **Climax** | Main competition stage—performance uses style + reputation |
| **Resolution** | Festival winner flag; district unlock (market / rooftop) |
| **Missions** | Prep quests · Team co-op tasks (P2 safe co-op) · Festival run · Repair rift if team lost |
| **Key choices** | Sports vs creative track; share credit with team or stand out |
| **Consequences** | `[flag:festival_outcome]`; NPC crowd reactions in Ch5 |
| **Rewards** | Festival trophy achievement; large coin grant; exclusive outfit |
| **Cliffhanger** | Festival lights reveal hidden symbol tied to city secret |

---

## Chapter 5 — The Hidden Truth

| | |
|--|--|
| **Goal** | Discover Angel City’s secret; protect friends; **final decision** |
| **Conflict** | Antagonist thread (TBD name); truth vs safety |
| **Climax** | Multi-objective finale—choices from Ch2–4 matter |
| **Resolution** | **Season 1 ending variant** (min. 2 branches + neutral); world state changes |
| **Missions** | Investigate · Confront · Choose finale path |
| **Key choices** | **Final decision** (Owner): e.g. expose truth publicly / protect club / defer to Angelina plan |
| **Consequences** | **Changes available tasks in free play** and **Season 2 entry quests** (Owner t137u) |
| **Rewards** | Season 1 completion set; title; room trophy |
| **Cliffhanger** | Explicit Season 2 hook (Angelina’s unrevealed tie to secret) |

---

## Mystery vs daily life (all chapters)

- **Story missions** advance season flags and unlock districts/secrets.  
- **Daily life** (cafe, decor, hangout with friends) always available in unlocked zones; rewards feed economy, not story paywalls.  
- **Narrator** speaks on chapter beats only; **Angelina** handles tutorial-scale hints.

---

## Canon carry-over (unchanged rule)

See `OWNER_QUESTIONS.md` — Tykvograd, Bell endings, gang cast, graveyard content **not** merged without Owner choice.

---

## Quest id map (data-ready)

| id | Chapter |
|----|---------|
| `q_s1_ch1_new_girl` | 1 New Girl in Town |
| `q_s1_ch2_dream_life` | 2 Build Your Dream Life |
| `q_s1_ch3_secret_club` | 3 The Secret Club |
| `q_s1_ch4_big_challenge` | 4 The Big Challenge |
| `q_s1_ch5_hidden_truth` | 5 The Hidden Truth |

Sub-steps mirror missions in each chapter block above.
