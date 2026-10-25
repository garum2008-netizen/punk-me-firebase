# Episode 1 — YouTube capture timecodes

Measured with `ffprobe` on deliverables (2025-10-25 capture).

| File | `format.duration` (s) |
| --- | ---: |
| `/opt/cursor/artifacts/episode1-youtube-full.webm` | 739.720 |
| `/opt/cursor/artifacts/episode1-youtube-full.mp4` | 739.720 |
| `qa/episode1/episode1-youtube.webm` (git, re-encode) | see `episode1-youtube-meta.json` |

## ffprobe streams (full webm)

```
codec_name=vp8
codec_type=video
codec_name=opus
codec_type=audio
sample_rate=48000
channels=2
```

## Timecodes (wall clock from `episode1-youtube-marks.jsonl`)

| Time | Label | Notes |
| --- | --- | --- |
| 00:00 | boot | solo new player |
| 00:33 | char_select | Cobalt |
| 00:40 | start_game | audio unlock |
| 01:31 | tutorial_move | room walk |
| 02:44 | tutorial_street | map → street |
| 03:34 | razor_talk | gang → Razor |
| 04:52 | quest_journal | pause menu |
| 05:54 | tutorial_cemetery | cemetery |
| 06:49 | tutorial_duel | Chain fight |
| 07:52 | tutorial_duel_result | see duel note below |
| 08:52 | shop_open | prices on grid |
| 09:19 | shop_buy | purchase |
| 09:33 | onboarding_reward | `onboarding.done` |
| 10:58 | propiska_intro | `q_initiation_pay` |
| 11:38 | reload_continue | reload persistence |

QA: `qa/episode1/frames/` (ffmpeg `-ss` per mark), `qa/episode1/contact-sheet.png`.

### Duel / `win_fight`

Onboarding step 5 completes only when `game.js` `endFight(true)` runs and calls `Onboarding.onWinFight()` → `bump("win_fight")` (`onboarding.progress.win_fight ≥ 1`). The record mark `tutorial_duel_result` is taken right after the Playwright fight loop; if the overlay closes asynchronously, the mark text can show `progress=0` even though the step completes before `shop_open` (check `onboarding_reward`).
