# Season 1 script arc (five chapters)

**Product:** PUNK ME ANGEL — Interactive Life Story Simulator.  
**Setting (Owner directive):** **Angel City** — new city fantasy layer (canon mapping unresolved; see `OWNER_QUESTIONS.md`).  
**Format:** each chapter = goal · conflict · climax · resolution · missions · rewards · cliffhanger.

---

## Season logline

You arrive in Angel City with nothing but a suitcase and a mysterious invitation. Angelina — a streetwise local your age — becomes your guide. Each chapter deepens friendships, work, home, and a city-wide mystery that ties your choices to who you become.

---

## Chapter 1 — «Первый адрес» (First address)

| Beat | Content |
|------|---------|
| **Goal** | Get a room, meet Angelina, earn first Angel Coins, open the mystery thread |
| **Conflict** | Unfamiliar city; shy or bold choices affect first friend; landlord wants a small deposit |
| **Climax** | Cafe shift goes wrong (line rush or spilled tray) — player must recover with Angelina’s tier hint |
| **Resolution** | Room furnished, outfit chosen, first friend secured, deposit paid |
| **Missions** | M1 Follow Angelina · M2 Settle room · M3 First friend · M4 Cafe shift · M5 Read the message |
| **Rewards** | 100 + 50 + 80 Angel Coins; outfit item; `ach_ch1_home`; unlock **Cafe** district map |
| **Cliffhanger** | Encrypted note: “The bell you heard wasn’t weather. Find who sent this.” (links to season mystery — **not** replacing Bell canon until Owner decides) |

**Play time target:** first **10 minutes** = guided onboarding (see `CH1_DIALOGUES.md` timecodes).

---

## Chapter 2 — «Соседи и смены»

| Beat | Content |
|------|---------|
| **Goal** | Hold a job streak; help Angelina’s friend; expand social circle |
| **Conflict** | Rival coworker; choice to cover or expose them |
| **Climax** | Double shift event — energy/mood management |
| **Resolution** | Stable income; new district unlock (**Park** or **Metro**) |
| **Cliffhanger** | Friend mentions “old festival in the hills” (Tykvograd echo — optional bridge) |

---

## Chapter 3 — «Тайная переписка»

| Beat | Content |
|------|---------|
| **Goal** | Decode message from ch1; follow trail across city |
| **Conflict** | Red herring NPC; choice to trust Angelina vs solo path |
| **Climax** | Night scene — find drop point |
| **Resolution** | Partial truth about sender |
| **Cliffhanger** | Sender knows player’s real choice in ch2 |

---

## Chapter 4 — «Выбор улицы»

| Beat | Content |
|------|---------|
| **Goal** | Align with a city faction (life-sim “crew”, not necessarily Rusty Chains) |
| **Conflict** | Two factions want the player |
| **Climax** | Public event — dialogue-heavy |
| **Resolution** | Faction flag locks for season finale |
| **Cliffhanger** | Season villain silhouette |

---

## Chapter 5 — «Огни Angel City» (finale)

| Beat | Content |
|------|---------|
| **Goal** | Stop the season threat; protect friends |
| **Conflict** | Timed multi-objective |
| **Climax** | Player-led decision using ch2–4 flags |
| **Resolution** | Season 1 ending variant (3 branches — **new**, not Tykvograd curse endings unless merged by Owner) |
| **Cliffhanger** | Season 2 hook (Angelina’s secret) |

---

## Relationship to existing canon (carry-over map)

| Existing canon | Season 1 Angel City |
|----------------|---------------------|
| `q_ch0_newbie` House 13 onboarding | **Replaced in player-facing ch1** by Angel City arrival (code TBD) |
| `q_ch1_authority` / Razor initiation | **Deferred** or parallel “old town” fast travel — Owner decision |
| Three Bell endings (`STORY_ENDINGS_TZ`) | **Season 5** or separate “Tykvograd arc” — not silently merged |
| CHARACTERS.md gang | Guest appearances possible; not hosts |
| Angelina help tiers | **Carried over** mechanically |
| Firebase save schema | **Carried over** with new flags |

---

## Mission numbering (data-ready ids)

| id | Chapter | Title (RU) |
|----|---------|------------|
| `q_s1_ch1_arrival` | 1 | Прибытие |
| `q_s1_ch1_room` | 1 | Моя комната |
| `q_s1_ch1_friends` | 1 | Первые друзья |
| `q_s1_ch1_cafe` | 1 | Смена в кафе |
| `q_s1_ch1_mystery` | 1 | Первое послание |
| `q_s1_ch2_*` … | 2–5 | TBD in Phase 2 writing |

---

## Narrator + Angelina beat sheet (chapter 1 only)

| Minute | Narrator | Angelina |
|--------|----------|----------|
| 0–2 | Arrival myth | Meet + follow mission |
| 2–5 | “Home is choice” | Room tutorial |
| 5–8 | “City answers courage” | Friend intro |
| 8–10 | “Some messages find you” | Mystery reveal |

Full lines: `CH1_DIALOGUES.md`.
