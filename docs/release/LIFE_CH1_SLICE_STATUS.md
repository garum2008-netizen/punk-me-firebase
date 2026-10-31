# Life Chapter 1 vertical slice — implementation status (automated checkpoint)

**Branch:** `cursor/vertical-slice-ch1-d81d` · **Owner GO:** t147u + skin switcher t569u.

## Works (verified in automated tests where noted)

| Feature | Status |
|---------|--------|
| Life quest namespace `me.lifeCh1` (non-destructive vs canon save) | Implemented |
| Quest flow: move → wardrobe → Angelina dialogues → rewards → complete | E2E |
| `me.coins` rewards + persist via `lifeCh1Local` overlay / Firebase `lifeCh1` | E2E reload |
| Angelina skin A/B/C wardrobe (placeholders + manifest sha256) | Unit + E2E |
| Skin choice in `lifeCh1.angelinaSkin` survives reload | E2E |
| Dialogue portrait + world billboard from manifest paths | E2E display check |
| Preset chat only while life quest active (D12-A) | Implemented |
| D11-B music soft CSS class while life quest active | Implemented |

## Not yet / out of scope

| Item | Notes |
|------|--------|
| Final Owner PNGs for A/B/C | Drop into manifest paths; update sha256 only |
| ICE-approved Angelina 3D model | Placeholder billboard only |
| Paid / AI voice | Text + UI blip only |
| Full ch0 onboarding in E2E | Snapshot skips to post-ch0 for slice focus |
| Production deploy / hosting | Owner GO required |
| PR #46 safe chat | Not included (D12-A preset phrases in slice only) |
