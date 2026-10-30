# Chapter 1 — New Girl in Town (life layer script, RU)

**Owner title:** **New Girl in Town** — journal **neutral RU** «Новенький в городе» (**D6**).  
**Gate (recommended):** starts after **`q_ch0_newbie`** / `onboarding.done` — quest **`q_life_ch1_settle`**. Does **not** replace House 13 wake-up (**ORIGINAL LOCK**).  
**Setting copy:** “город” / Tykvograd — **not** a separate Angel City map unless **D1** approved.  
**Currency UI:** **монеты** (`me.coins`).  
**Languages:** RU master; EN/DA/UK follow these ids.

**Speakers:** `narrator`, `angelina`, `npc_mira`, `ui`.

---

## Narrator trigger registry (exact ids)

| Trigger ID | When (quest step / event) | Cooldown group | Sets flag |
|------------|---------------------------|----------------|-----------|
| `narr_ch1_metaphor_01` | `q_life_ch1_settle:step_outfit_start` | `narrator_main` | `narr_ch1_metaphor_01_heard` |
| `narr_ch1_street_01` | `q_life_ch1_settle:follow_angelina` (enter follow mode) | `narrator_main` (+40s) | `narr_ch1_street_01_heard` |
| `narr_ch1_home_01` | `q_life_ch1_settle:decorate_done` | `narrator_main` | `narr_ch1_home_01_heard` |
| `narr_ch1_cafe_01` | Cafe: first order success | `narrator_main` | `narr_ch1_cafe_01_heard` |
| `narr_ch1_mystery_01` | `q_life_ch1_settle:message_read` | `narrator_main` | `narr_ch1_mystery_01_heard` |
| `narr_ch1_close_01` | Quest complete (critical priority) | — | `narr_ch1_close_01_heard` |

**Acceptance:** ≥ **5** of the above fire in one playthrough (all **6** in golden path).

---

## Dialogue trees (interactive)

| Dialogue id | Choices | Consequence flag |
|-------------|---------|------------------|
| `dlg_ch1_outfit` | 3 outfit styles | `outfit_calm` / `outfit_bright` / `outfit_bold` |
| `dlg_s1_mira_intro` | 3 greet lines | `rel_mira:warm` / `shy` / `curious` |
| `dlg_ch1_mystery_trust` | 3 trust lines | `mystery_secret` / `mystery_open` / `mystery_trust_angelina` |

**Delayed consequence:** `mystery_open` → Mira line variant on **`q_life_ch2_dream:step_mira_revisit`** (stub text in data).

---

## Player actions & mission map

| Mission | Player action | Quest step id | Reward (монеты) |
|---------|---------------|---------------|-----------------|
| M0 | Interact kiosk/mirror — pick outfit | `step_outfit` | +25 on confirm |
| M1 | Follow Angelina beacon | `follow_angelina` | +100 on arrive room door |
| M2 | Place bed, desk, lamp | `decorate` | +50 on `decorate_done` |
| M3 | Talk Mira (`dlg_s1_mira_intro`) | `meet_mira` | +30 |
| M4 | Complete cafe shift (3 orders) | `cafe_shift` | +50 |
| M5 | Read note + `dlg_ch1_mystery_trust` | `message_read` | achievement flag only |

---

## Script body (lines tied to triggers)

### M0 — Outfit (`narr_ch1_metaphor_01` on step start)

**Narrator:**

> «Каждая история начинается с выбора. Сегодня ты делаешь первый шаг в своём городе — даже маленькое решение может изменить твою судьбу».

**UI:** Mission «Выбери образ» · +25 монеты

**dlg_ch1_outfit** → flags as table above.

---

### M1 — Follow Angelina

**Angelina:**

> «Привет! Я Ангелина. Давай сначала найдём тебе комнату. А потом я покажу одно место, о котором почти никто не знает».

> «Я пойду рядом. Просто иди за мной — увидишь стрелку на земле».

**[GAMEPLAY]** Lead mode · blocked unrelated portals during step.

**`narr_ch1_street_01`:**

> «Город шумит, но у каждого здесь есть свой угол. Сегодня — твой».

---

### M2 — Room (`narr_ch1_home_01` after decorate)

**Angelina:**

> «Вот эта дверь — твоя комната. Зайди внутрь. Сначала выбери, как ты хочешь выглядеть — это важно».

> «Класс. Теперь расставим пару вещей — так комната станет твоей».

**Narrator (`narr_ch1_home_01`):**

> «Дом — это не стены. Это то, что ты оставляешь после себя каждый день».

**Angelina:**

> «Нравится? Пойдём познакомлю тебя с одним человеком. Но сначала — кафе. Там всё просто, обещаю».

---

### M3–M4 — Mira & cafe

**Angelina:**

> «Это Мира. Она работает здесь по выходным. Можешь просто поздороваться — как хочешь».

**npc_mira:**

> «О, привет! Angelina говорила, что кто-то новенький появится. Ты уже обустроил комнату?»

**dlg_s1_mira_intro:**

→ **«Да, уже обустроил»** → `[rel_mira:warm]` · Angelina: «Видишь? Улыбка — уже полдела.»  
→ **«Пока только чемодан»** → `[rel_mira:shy]` · Angelina: «Нормально. Главное — не молчи слишком долго.»  
→ **«А ты давно здесь живёшь?»** → `[rel_mira:curious]`

**Angelina:**

> «Хочешь подработать? Одна короткая смена — и тебе хватит на мелочи в городе».

**`narr_ch1_cafe_01`** (first order success):

> «Первые монеты в новом месте всегда пахнут кофе и нервами. Это нормально».

---

### M5 — Mystery

**Angelina:**

> «Стой. Вот на скамейке… это не моё. Открой — но не пугайся».

**`narr_ch1_mystery_01`:**

> «Иногда город говорит первым. Вопрос — готов ли ты слушать».

**UI message:**

> «Тот звук, что ты слышал у ворот, — не погода. Не показывай это Мире. — ?»

**dlg_ch1_mystery_trust** (Angelina):

> «Это странно. Что сделаем?»

→ **«Спрятать и подумать»** → `[flag:mystery_secret]`  
→ **«Спрятать и спросить у Миры позже»** → `[flag:mystery_open]` *(later distrust)*  
→ **«Рассказать Angelina всё»** → `[flag:mystery_trust_angelina]`

**`narr_ch1_close_01`:**

> «Глава первая заканчивается не точкой, а вопросом. Город помнит тех, кто выбирает».

**Save:** autosave · journal «Первое послание» · `s1_mystery_sender` open.

---

## Angelina tier fallback (ch1)

| Tier | RU |
|------|-----|
| 1 | «Посмотри на стрелку — туда.» |
| 2 | «Подойди ближе и нажми E (или кнопку руки).» |
| 3 | «Сначала комната, потом кафе. Я жду у двери.» |
| 4 | «Иди к метке “Зеркало”, выбери образ, поставь кровать.» |

---

## VO / avatar

- `voiceId` = `{trigger_or_dialogue_id}_{lang}` in `voice-lines.json`.
- **Angelina 3D:** requirements only — **no final model** (ICE, **D15**).
- Stage 1 temp TTS / Stage 2 actors: `VOICE_OPTIONS.md`.

---

## Explicit non-goals

- Does not remove Razor, cemetery, duels from canon routes.
- No free-text chat — choices only.
- Not claimed playable in this doc PR.
