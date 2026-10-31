# Life Chapter 1 vertical slice — implementation status (automated checkpoint)

**Branch:** `cursor/vertical-slice-ch1-d81d` · **Owner GO:** t147u + approved PNGs t569u.

## Works (verified in automated tests where noted)

| Feature | Status |
|---------|--------|
| Life quest namespace `me.lifeCh1` (non-destructive vs canon save) | Implemented |
| Quest flow: move → wardrobe → Angelina dialogues → rewards → complete | E2E |
| `me.coins` rewards + persist via `lifeCh1Local` overlay / Firebase `lifeCh1` | E2E reload |
| Angelina skin A/B/C — Owner **source PNG** + shipped **portrait/world WebP** | Unit sha256 + E2E |
| Skin choice in `lifeCh1.angelinaSkin` survives reload | E2E |
| Dialogue portrait + world billboard from manifest | E2E (`*-portrait.webp`) |
| Preset chat only while life quest active (D12-A) | Implemented |
| D11-B music soft CSS class while life quest active | Implemented |

## Resolution (report only — no invented art)

- **A/B source:** 744×1334 screenshot crops — sufficient for wardrobe + dialogue (shipped portrait ~372px wide WebP).
- **C-v2 source:** 720×1280 — **only** `angelina-teen-C-v2.png`; **never** v1 guitar PNG.
- **World sprite:** upper-body crop → ~256px wide WebP. OK at current billboard scale; Owner may re-export full-res before large-format promo (still **no promo GO**).

## Promo / deploy

**Forbidden** without separate Owner GO. See `assets/ui/angelina-skins/README_SLICE_ONLY.md` and manifest `sliceOnly` / `promoDeployForbidden`.

## Not yet / out of scope

| Item | Notes |
|------|--------|
| ICE-approved Angelina 3D model | 2D billboard + portraits only |
| Paid / AI voice | Text + UI blip only |
| Full ch0 onboarding in E2E | Snapshot skips to post-ch0 for slice focus |
| Production deploy / hosting | Owner GO required |
| PR #46 safe chat | Not included (D12-A preset phrases in slice only) |
