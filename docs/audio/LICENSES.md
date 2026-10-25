# PUNK ME — audio asset licenses

All files under `assets/audio/` unless noted.

| File(s) | Author | License | Source |
| --- | --- | --- | --- |
| `music/music_*.ogg`, `music/music_*.mp3` | PUNK ME / Inna project (generated) | CC0 1.0 | `scripts/generate-audio-assets.mjs` (procedural, in-repo) |
| `sfx/*.ogg`, `sfx/*.mp3` | PUNK ME / Inna project (generated) | CC0 1.0 | `scripts/generate-audio-assets.mjs` (procedural, in-repo) |
| `voice/manifest.json` | PUNK ME | — | Line slots; recorded VO per language (see `docs/game-design/EPISODE1.md` line IDs) |

Regenerate procedural assets: `node scripts/generate-audio-assets.mjs`

In-game credits string (when audio settings open): see `AudioManager.getCreditsLine()`.
