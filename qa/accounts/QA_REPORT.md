# QA — living3d-v22r5-accounts-r1 (PR #16 fixes)

| Check | Result | Evidence |
|-------|--------|----------|
| **0** `Firebase App '[DEFAULT]'` page errors | **PASS** | `page-errors.json` (`firebaseNoAppCount: 0`) |
| Account modal above How-to-play | **PASS** | `desktop-account-modal.png` (howto closed, z-index 210) |
| Owner i18n (no raw keys) | **PASS** | `desktop-owner-signin.png` + `i18n.js` on owner.html |
| Subscribe «Войти в аккаунт» next to Play | **PASS** | `desktop-subscribe-account-link.png` (`.play-account-row`) |
| Loading / char-select Sign-in readable | **PASS** | `desktop-loading-signin.png`, `desktop-char-select-signin.png`, `mobile-chromium-*` |
| Mobile 390×844 | **PASS** (Chromium) | `mobile-chromium-loading-signin.png`, `mobile-chromium-char-select-signin.png`, `mobile-chromium-ingame-signin.png` |
| WebKit mobile | **SKIP** (CI host deps) | — |
| Saves/reload (user + prior CI) | **PASS** | `npm run test:loading*`, `test:accounts` |
| Email link same uid | **SKIP** | Firebase providers (OWNER ACTION) |

## Commands

```bash
python3 -m http.server 8765
node scripts/capture-accounts-qa.js
npm run test:accounts
```

Deploy + rules order: `docs/release/ACCOUNTS_SETUP.md`.
