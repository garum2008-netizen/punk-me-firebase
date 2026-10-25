# Episode 1 — YouTube capture timecodes

Recorded: Playwright Chromium 1920×1080, `html.episode-capture` (no account HUD / version / credits).
Deliverable: `qa/episode1/episode1-youtube.webm` (8.87 MB)

## ffprobe (audio check)
```
codec_name=vp8
codec_type=video
codec_name=opus
codec_type=audio
sample_rate=48000
channels=2
```

| Time | Moment | Notes |
| --- | --- | --- |
| 00:00 | boot | solo new player |
| 00:23 | char_select | Cobalt |
| 00:23 | start_overlay | Episode 1 intro lines |
| 00:26 | start_game | audio unlock gesture |
| 00:40 | tutorial_move | WASD / joystick — room |
| 00:55 | tutorial_street | quick nav → street |
| 01:12 | razor_talk | gang UI → Razor dialog |
| 01:54 | quest_journal | pause menu journal |
| 02:25 | tutorial_cemetery | cemetery visit |
| 02:45 | tutorial_duel | Chain fight UI |
| 03:36 | tutorial_duel_result | fight timeout |
| 03:58 | shop_open | shop modal — prices on grid **prices/coins on screen** |
| 04:16 | shop_buy | first item purchased **prices/coins on screen** |
| 04:17 | onboarding_reward | onboarding.done + grantRewardOnce |
| 05:33 | propiska_intro | q_initiation_pay accepted |
| 05:57 | reload_continue | onboarding.done=true quest=q_initiation_pay coins 235 (was 235) **prices/coins on screen** |

## Episode beats (EPISODE1.md)
- Onboarding: move → street → talk Razor → cemetery → duel win → shop buy → `onboarding.done`
- Finale: `dlg_razor_initiation` → accept pay path → `q_initiation_pay`
- Reload: persistence of coins, onboarding.done, active story quest