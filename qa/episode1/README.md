# Episode 1 QA artifacts

| File | Description |
|------|-------------|
| `episode1-report.json` | Chromium + WebKit full playthrough + KeyE / mobile checks |
| `episode1-youtube.mp4` | Full episode capture 1920×1080 with muxed game audio (H.264/AAC) |
| `episode1-youtube.webm` | Copy/mux when applicable |
| `TIMECODES.md` | Chapter markers for the YouTube reel |
| `episode1-chromium.png`, `episode1-webkit.png` | End-state screenshots |
| `*-dialog-razor.png`, `*-journal-onboarding.png`, `*-shop-prices.png`, `*-finale-propiska.png` | Key moments |
| `playthrough-demo.webm` | Shorter Chromium test recording |

## Commands

```bash
npm run test:episode1
npm run record:episode1-youtube
```

`record:episode1-youtube` requires **ffmpeg**. After recording, verify audio:

```bash
ffprobe -v error -show_entries stream=codec_type,codec_name,sample_rate,channels \
  -of default=noprint_wrappers=1 qa/episode1/episode1-youtube.webm
```

Example output (2026-10-25 capture):

```
codec_name=vp8
codec_type=video
codec_name=opus
codec_type=audio
sample_rate=48000
channels=2
```

H.264/AAC copy: `qa/episode1/episode1-youtube.mp4` (same timeline, muxed via ffmpeg).
