# QA — living3d-v22r5-accounts (real accounts + owner)

| Test | Chromium | WebKit mobile | Notes |
|------|----------|---------------|--------|
| Reload keeps coins (same uid) | **PASS** | **SKIP/PASS** if browser installed | Real Firebase RTDB |
| Sign out → new anonymous uid | **PASS** | same | Old save not deleted |
| Owner page guest UI (sign-in, no panel) | **PASS** | same | Non-owner email → «Нет доступа» (manual) |
| Account modal / HUD «Войти» PNGs | **PASS** | **PASS** or mobile-chromium fallback | `qa/accounts/*.png` |
| Anonymous → link email, same uid | **SKIP** | **SKIP** | `auth/operation-not-allowed` until Inna enables Email in Console |
| Google link / redirect | **MANUAL** | Safari redirect | After Google provider enabled |
| `npm run test:loading` | **PASS** | webkit skip if not installed | |
| `npm run test:loading-early-save` | **PASS** | webkit skip if not installed | |

## Requires OWNER ACTION (Firebase Console)

See `docs/release/ACCOUNTS_SETUP.md`: enable **Google** + **Email/Password**, authorized domains, **publish** `database.rules.json`.

Until then: guest play + anonymous saves work; email/Google link and owner player list need console setup.

## Commands

```bash
python3 -m http.server 8765
npm run test:accounts
node scripts/capture-accounts-qa.js
```
