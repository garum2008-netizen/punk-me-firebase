# Chapter 1 — New Girl in Town (dialogue script, RU)

**Chapter (Owner t137u):** **New Girl in Town** / «Новенькая в городе».  
**Scope:** Season 1 Chapter 1 — first **10 minutes** guided onboarding (Owner t135u + t137u: outfit, Angelina, first reward, **no long tutorial**).  
**Languages in shipping:** RU master; EN/DA/UK localisation follows this script (not written here).  
**Speakers:** `narrator`, `angelina`, `npc_*`, `ui` (mission toasts).  
**Format:** `→` player choice; `[flag]` consequence.

**Canon note:** This script implements **Angel City** onboarding. It does **not** automatically replace `q_ch0_newbie` / House 13 until Owner resolves `OWNER_QUESTIONS.md`.

---

## 0:00–2:00 — Arrival in Angel City

### Cinematic (skippable after 5s)

**[VIDEO]** Train/car arrival, skyline “Angel City”, soft ambient (no rock).

**Narrator** (verbatim Owner example):

> «Каждая история начинается с выбора. Сегодня ты приезжаешь в Angel City — город, где даже маленькое решение может изменить твою судьбу».

**[UI] Mission 1:** «Следуй за Ангелиной» · Награда: **100 Angel Coins**

**Angelina** (verbatim Owner example):

> «Привет! Я Ангелина. Давай сначала найдём тебе комнату. А потом я покажу одно место, о котором почти никто не знает».

**Angelina** (follow-up):

> «Я пойду рядом. Просто иди за мной — увидишь стрелку на земле».

**[GAMEPLAY]** Lead mode: beacon on Angelina; no combat; blocked portals.

**Narrator** (cooldown group `narrator_main`, +40s after previous):

> «Город шумит, но у каждого здесь есть свой угол. Сегодня — твой».

---

## 2:00–5:00 — My first room

**Angelina:**

> «Вот эта дверь — твоя комната. Зайди внутрь. Сначала выбери, как ты хочешь выглядеть — это важно».

**[INTERACT] Mirror / wardrobe**

**UI:** «Выбери образ» (3 outfits: casual / sporty / bold — cosmetic only)

→ **«Спокойный стиль»** → `[flag:outfit_calm]` + toast «Образ сохранён»  
→ **«Яркий стиль»** → `[flag:outfit_bright]`  
→ **«Смелый стиль»** → `[flag:outfit_bold]`

**Angelina:**

> «Класс. Теперь расставим пару вещей — так комната станет твоей».

**[INTERACT]** Place furniture (3 slots: bed / desk / lamp — snap grid)

**Narrator:**

> «Дом — это не стены. Это то, что ты оставляешь после себя каждый день».

**[UI] Mission 2 complete:** «Обустрой комнату» · +**50 Angel Coins**

**Angelina** (short):

> «Нравится? Пойдём познакомлю тебя с одним человеком. Но сначала — кафе. Там всё просто, обещаю».

---

## 5:00–8:00 — First friends + cafe

**[LOCATION]** Cafe exterior (new district or retagged `city` interior)

**Angelina:**

> «Это Мира. Она работает здесь по выходным. Можешь просто поздороваться — как хочешь».

**npc_mira:**

> «О, привет! Angelina говорила, что кто-то новенький приедет. Ты уже нашёл комнату?»

→ **«Да, уже обустроил»** → `[rel_mira:warm]` · Angelina: «Видишь? Улыбка — уже полдела.»  
→ **«Пока только чемодан»** → `[rel_mira:shy]` · Angelina: «Нормально. Главное — не молчи слишком долго.»  
→ **«А ты давно знаешь Angel City?»** → `[rel_mira:curious]` · unlock lore line (no spoils)

**Angelina:**

> «Хочешь подработать? Одна короткая смена — и тебе хватит на мелочи в городе».

**[MINIGAME]** Cafe shift: 3 orders, timer generous; fail = Angelina tier-2 hint (not game over)

**Narrator** (on first successful order):

> «Первые монеты в новом городе всегда пахнут кофе и нервами. Это нормально».

**[UI] Mission 3–4:** «Познакомься» + «Смена в кафе» · +**80 Angel Coins** total segment

**Angelina** (after shift):

> «Ты справился. Пойдём на улицу — хочу кое-что проверить».

---

## 8:00–10:00 — First mystery

**[LOCATION]** Quiet alley / bench (marker)

**Angelina:**

> «Стой. Вот на скамейке… это не моё. Открой — но не пугайся».

**[INTERACT]** Letter / phone notification prop

**Narrator:**

> «Иногда город говорит первым. Вопрос — готов ли ты слушать».

**[UI] Text on screen (message):**

> «Тот звон, что ты слышал при въезде, — не погода. Не показывай это Мире. — ?»

**Angelina** (choice):

> «Это странно. Что сделаем?»

→ **«Спрятать и подумать»** → `[flag:mystery_secret]` · «Окей. Я помогу, но без геройства.»  
→ **«Сразу спросить у Миры»** → `[flag:mystery_open]` · Mira later line distrust (ch2 hook)  
→ **«Показать Angelina всё»** → `[flag:mystery_trust_angelina]` · +affinity Angelina

**Narrator** (chapter end stinger):

> «Глава первая заканчивается не точкой, а вопросом. Angel City помнит тех, кто выбирает».

**[UI] Chapter 1 complete · Cliffhanger:** Season thread `s1_mystery_sender` opened  
**Save:** autosave + journal entry «Первое послание»

---

## Angelina hint lines (tier fallback, ch1)

| Tier | RU line |
|------|---------|
| 1 | «Посмотри на стрелку — туда.» |
| 2 | «Подойди ближе и нажми E (или кнопку руки).» |
| 3 | «Сначала комната, потом кафе. Я жду у двери.» |
| 4 | «Иди прямо к метке “Зеркало”, выбери образ, потом поставь кровать.» |

---

## VO / subtitle notes

- Narrator: adult professional voice; pace slow; pauses marked in studio direction (Phase 2).
- Angelina: teen voice; **simple sentences**; max ~12 words per hint (Owner).
- All lines require `voiceId` + subtitle sync in `data/audio/voice-lines.json` when implemented.
- **3D Angelina avatar:** lip-sync when ICE-approved model exists; until then portrait + subtitles only.

---

## Data hooks (for implementation Phase 2)

| Beat | Suggested quest step id |
|------|-------------------------|
| Follow | `q_s1_ch1_arrival:follow` |
| Room outfit | `q_s1_ch1_room:outfit` |
| Furniture | `q_s1_ch1_room:decorate` |
| Mira dialogue | `dlg_s1_mira_intro` |
| Cafe shift | `q_s1_ch1_cafe:shift` |
| Message | `q_s1_ch1_mystery:read` |

---

## Explicit non-goals in this script

- No Razor initiation, no cemetery, no duel (Tykvograd ch1) unless Owner merges arcs.
- No free-text chat with Mira — only choices above.
- No claim that this script is recorded or playable yet.
