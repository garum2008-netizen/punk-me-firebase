# PUNK ME — Voice & speech

## Current build (world3d-v1+)

- **Engine:** [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) (`speechSynthesis`) in the browser.
- **License:** No separate audio assets; voices are provided by the user’s OS/browser (Microsoft, Google, Apple, etc.). Redistribution of generated speech is not part of this repo.
- **Per-character tuning:** `pitch` and `rate` per character in `js/characters.js` (`voice` block). Language follows game locale (RU / EN / DA) via `utterance.lang`.
- **Fallback:** If `speechSynthesis` is missing or muted in settings, dialogue shows as text only.
- **Lip-sync:** `talk` animation + short jaw bone rotation while `Voice.isSpeaking()` for the active character.

## Future (optional build pipeline)

Commercial TTS (e.g. ElevenLabs, Azure Neural, Google Cloud TTS) may be baked to `assets/voice/<character>/<lang>/<line>.mp3` with license recorded in this file. Until then, Web Speech API is the shipping solution for RU/EN/DA.

## Player settings

- `localStorage.punkme_voice_mute` — mute all VO
- `localStorage.punkme_voice_vol` — 0–1 volume multiplier
