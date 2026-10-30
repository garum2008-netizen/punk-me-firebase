# Season 1 — Life Story layer (five Owner chapter titles)

**Product direction:** Life Simulator + Mystery Story (**develops** canon — **does not replace** `QUEST_TABLE.md` main line).  
**Setting name in pitch:** **Angel City** = **working title only** (t138u). **Canonical world:** Tykvograd / House 13 until **D1** in [`OWNER_DECISIONS.md`](./OWNER_DECISIONS.md).  
**Owner chapter titles (English):** map to **life-story episodes** running **alongside or after** approved chapters — not a rewrite of Bell endings.

| Owner # | Title | Canon map (recommended) | Playable today |
|---------|-------|-------------------------|----------------|
| 1 | **New Girl in Town** | After **`q_ch0_newbie`** → proposed **`q_life_ch1_settle`** | Vertical slice target |
| 2 | **Build Your Dream Life** | Parallel **`q_initiation_*` / `q_ch2_hangout`** economy beats | Partial jobs/shop |
| 3 | **The Secret Club** | Thematic layer before **`q_ch3_cemetery_night`** — club ≠ Bell without GO | Not built |
| 4 | **The Big Challenge** | Festival / team beat before **`q_ch4_castle`** | Not built |
| 5 | **The Hidden Truth** | Season hook — **must not** replace `ending_break_curse` / `ending_zombie_style` / `ending_count_deal` without GO | Endings scaffold only |

**Format per chapter:** goal · conflict · climax · resolution · missions · choices · rewards · cliffhanger — see blocks below (content direction for life layer).

---

## Season logline (life layer)

After waking in House 13 and learning the streets, the player builds daily life—home, style, friends, work—while Angelina mentors optional **life journal** missions. A mystery thread runs under the city; Owner episode titles mark beats until Season 2 (Owner t137u).

---

## Chapter 1 — New Girl in Town

| | |
|--|--|
| **Goal** | Settle room; outfit; meet friend; earn **монеты**; open mystery hook |
| **Conflict** | New routines; social tone (player choice) |
| **Climax** | Cafe shift pressure |
| **Resolution** | Room furnished; friend met; message read |
| **Missions** | M0 outfit · M1 follow Angelina · M2 furnish · M3 Mira + cafe · M4 message |
| **Key choices** | Outfit; greet Mira; trust Angelina with note |
| **Consequences** | `[rel_mira]`, `[flag:mystery_*]` |
| **Rewards** | Script totals in **монеты** (`CH1_DIALOGUES.md`) — not Angel Coins unless **D4-A** |
| **Cliffhanger** | Anonymous note — `s1_mystery_sender` |
| **Script** | `CH1_DIALOGUES.md` + narrator ids |

---

## Chapter 2 — Build Your Dream Life

| | |
|--|--|
| **Goal** | Steady income; style; 3–5 NPCs; second shop type |
| **Conflict** | Budget vs initiation / gang errands (canon still runs) |
| **Climax** | First paycheck investment choice |
| **Resolution** | Work → coins → home/style loop |
| **Cliffhanger** | “Secret Club — invite only” poster |

---

## Chapter 3 — The Secret Club

| | |
|--|--|
| **Goal** | Invitation; trust / team choice |
| **Conflict** | Factions; Angelina warns vs curiosity |
| **Climax** | Night dialogue |
| **Resolution** | Team flag |
| **Cliffhanger** | Tie to city “old festival” lore |

---

## Chapter 4 — The Big Challenge

| | |
|--|--|
| **Goal** | Festival; competitions; districts |
| **Climax** | Stage performance (style + rep) |
| **Cliffhanger** | Hidden symbol |

---

## Chapter 5 — The Hidden Truth

| | |
|--|--|
| **Goal** | City secret; protect friends; **final decision** (Owner) |
| **Resolution** | Branching **life** outcomes + Season 2 hook — **separate** from three Bell endings unless Owner merges (**D2**) |

---

## Mystery vs daily life

- Story missions advance **life flags**; daily cafe/decor available in unlocked zones.  
- **Narrator** on chapter beats; **Angelina** for hints.

---

## Quest id map (proposed — web life layer)

| id | Owner title | Gate |
|----|-------------|------|
| `q_life_ch1_settle` | New Girl in Town | `onboarding.done` (**D3**) |
| `q_life_ch2_dream` | Build Your Dream Life | ch1 life complete + canon ch2 entry |
| `q_life_ch3_club` | The Secret Club | Owner GO + district |
| `q_life_ch4_festival` | The Big Challenge | Owner GO |
| `q_life_ch5_truth` | The Hidden Truth | Owner GO |

Legacy ids `q_s1_ch1_*` in earlier drafts → **renamed** to `q_life_*` to avoid implying replacement of `q_ch0_newbie`.

---

## Canon carry-over (LOCK)

Characters (Razor, Vienna, …), locations, **currency**, **chapter 0**, three endings — unchanged until Owner marks **Decision** in `OWNER_DECISIONS.md`.
