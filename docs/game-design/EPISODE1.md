# Episode 1 — «Новенький в доме 13» → «Прописка» (opening playthrough)

**Owner:** Inna · **Integrator branch:** `cursor/episode1-integration-d81d`  
**Canon:** approved characters Vienna, Razor, Cobalt, Mohawk, Ghost, puppy **Шнурок**; chapters 0–1 only. No new story beats without owner approval.

## Player promise (~10–15 min)

New account learns controls, talks to **Razor** on the street, completes the **intro + onboarding chain**, receives the first **Прописка** quest hook, and can log out/in without losing tutorial/quest state.

## Quest & state machine

| ID | Giver | Why | Player action | Where | Completion signal | Reward (once) | Unlocks |
|----|-------|-----|---------------|-------|-------------------|---------------|---------|
| `tutorial_move` | System (Шнурок VO) | Learn walk | Move in room | `room` | `onboarding.progress.moved ≥ 1` | +20 coins, +15 XP (`onboard:move`) | Step 2 |
| `tutorial_street` | System | Reach gang turf | Portal to street | `room` → `street` | `visit_street` | +30, +20 (`onboard:go_street`) | Step 3 |
| `tutorial_talk_razor` | Razor | Meet the boss | Talk (E / Talk button) | `street`, npc `razor` | `talk_razor` | +40, +25 (`onboard:talk_razor`) | Step 4 |
| `tutorial_cemetery` | Razor (dialogue) | Scout graveyard | Enter cemetery | `street` portal | `visit_cemetery` | +50, +30 (`onboard:visit_cemetery`) | Step 5 |
| `tutorial_duel` | Razor | Prove yourself | Win training duel | `street` | `win_fight` | +80, +45 (`onboard:win_fight`) | Step 6 |
| `tutorial_shop` | System | Gear up | Buy in room shop | `room` shop UI | `shop_buy` | +25, +35 (`onboard:shop_buy`) | `onboarding.done` |
| `q_propiska_intro` | Razor | Start **Прописка** | Accept in dialogue | `street` | `story.quest` step `q_initiation_pay` accepted | Story flags only | Authority path stage 1 |

**Persistence:** `me.onboarding.{step,progress,done}`, `me.story.rewardsGranted`, `me.story.quest`, `me.tutorial.{version,startedAt,replayCount}`. Reload must not reset `step` or re-grant rewards.

## Dialogue line IDs (for audio agent)

| Line ID | Speaker | Context | RU gist |
|---------|---------|---------|---------|
| `ep1_intro_01` | narrator | Start overlay | Welcome to house 13 |
| `ep1_intro_02` | narrator | After Start | Your goal: find Razor |
| `ep1_tut_move` | system | Tutorial step 1 | Walk with WASD / joystick |
| `ep1_tut_street` | system | Step 2 | Go to the street portal |
| `ep1_tut_talk` | system | Step 3 | Press E near Razor |
| `ep1_razor_meet_a` | razor | First talk | Who are you? |
| `ep1_razor_meet_b` | razor | Quest given | Pay your dues (Прописка hook) |
| `ep1_razor_repeat` | razor | Repeat talk | State-aware stub |

Story JSON dialogues remain source of truth for branching; these IDs are hooks for `AudioManager.playLine(id)`.

## Interaction rules (implementation)

1. **E / Talk:** `event.code === 'KeyE'`; blocked when focus in input or modal blocks gameplay.
2. **Priority:** portal (if in ring) → **nearest NPC talk** → dog → story beacon → other interactables. **No street arcade** while `Onboarding.isActive()`.
3. **NPC range:** 3.5 m (3D) for talk hint and interact.
4. **HUD:** `#contextHint` only shows talk when `nearNpc`; `#questBox` shows current onboarding step or `StoryEngine.renderObjectivePanel`.

## UI menu (episode 1)

- **Controls & help** → `howToOverlay`
- **Quest journal** → `#gameMenuQuest` (onboarding + active story quest)
- **Sound** → `AudioManager` sliders (music / voice / SFX / mute)
- **Language** → existing RU/EN/DA
- **Pause** → pauses 3D tick + shows menu
- **Replay tutorial** → resets `onboarding` progress (not `rewardsGranted`)

## Audio integration (branch b)

Module: `js/audio-manager.mjs`. Episode 1 calls:

- `AudioManager.unlockFromUserGesture()` on **Start game**
- `AudioManager.playLine('ep1_*')` with subtitles
- Duck music during voice; stop line on dialog close

Browser TTS: **opt-in fallback only**, labeled in settings (`settings.ttsFallback`).

## Acceptance (automated)

`npm run test:episode1` — Chromium + WebKit: start overlay → tutorial steps through talk → reload keeps onboarding step → video artifact `qa/episode1/playthrough-demo.webm`.

## Out of scope (proposals only)

- New story chapters beyond Прописка initiation trio
- Roblox / graphics overhaul
