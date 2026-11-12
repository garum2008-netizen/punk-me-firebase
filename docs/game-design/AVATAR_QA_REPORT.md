# Avatar QA report (t204u foundation)

**Commit:** see branch tip after t204u landing.  
**Preview:** update via Game Bot after QA sign-off.

## Automated

| Test | Result |
|------|--------|
| `node scripts/test-avatar-catalog.js` | PASS |
| `node scripts/test-life-ch1-slice-unit.js` | PASS (`playerCutout: false`) |
| `node scripts/verify-t203-i18n.js` | PASS |
| `FIREBASE_*_EMULATOR_HOST=… node scripts/test-preview-build.js` | PASS (`prodAttempts: 0`) |

## Manual / visual (pending owner)

| Case | Status |
|------|--------|
| New game → Character Studio → confirm | Implement |
| Save/load `me.avatarConfig` | localStorage + me |
| 6 distinct sample heroes | use Randomize ×6 screenshots |
| Ch1 complete with custom hero | re-run ordinary capture |
| RU/EN/DA studio labels | i18n keys |
| Angelina guide uses hero name | `{name}` welcome line |
| Companion wardrobe (Angelina A/B/C) | Life Ch1 mirror flow |

## Sample configs (for visual QA)

1. `electric_blue` mohawk + cyber punk + wings  
2. `hc_gothic` + dark gothic + chains  
3. `tone_12` teal fantasy + angel waves  
4. `body_razor` + street angel  
5. Random ×2

## Defects

- Playwright desktop WebM flaky; ffmpeg x11grab fallback used for evidence.
- Hair/accessory diversity limited to procedural palette until art pass.
