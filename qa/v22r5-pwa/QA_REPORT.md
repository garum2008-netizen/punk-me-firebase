# QA v22r5 — PWA, test mode, audit

| Item | Result | Artifact |
|------|--------|----------|
| Desktop tester panel (`?test=1`) | **PASS** | `desktop-tester-panel.png` |
| Mobile tester panel | **PASS** | `mobile-tester-panel.png` |
| Desktop share dialog + link field | **PASS** | `desktop-share-dialog.png` |
| Mobile share (modal visible) | **PASS** | `mobile-share-dialog.png` |
| Install UI (fallback / prompt slot) | **PASS** | `desktop-install-prompt-ui.png` |
| Lighthouse PWA category score | **PASS** (1.0) | `lighthouse-pwa.json` |
| Headless gameplay audit (full) | **PASS** / частично save+mobile | `../audit-v22r4/audit-results.json` |

## Lighthouse (PWA)

- **installable-manifest:** pass  
- **splash-screen:** pass  
- **themed-omnibox:** pass  

## Scripts

```bash
python3 -m http.server 8765
node scripts/capture-v22r5-pwa.js
npx lighthouse@11.7.1 http://127.0.0.1:8765/index.html?solo=1 --only-categories=pwa --output=json --output-path=qa/v22r5-pwa/lighthouse-pwa.json
```
