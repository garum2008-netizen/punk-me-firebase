# PUNK ME Chapter 1 — Release checklist

Owner t179u, t162u, t198u. **Merge to `main` = production deploy** of halloween.punk.contractbot.dk.

- [ ] All tests: `FIREBASE_EMULATOR=1` + localhost DATABASE/AUTH emulators; prod `punk-me-40605` never touched
- [ ] Ordinary entry → Angelina (A/B/C-v2) → tutorial → Razor → quests → chapter end
- [ ] No skip/dev flags, injected progress, prepared saves, forced clicks, map portal shortcuts
- [ ] **3 consecutive** fresh-start passes on the **same final committed SHA**
- [ ] Uncut video per run; defect list + severity; build version + SHA
- [ ] Angelina halo gates 0/0 (greyMatt browser+Lanczos), `silhouetteNearWhite` 0, visual crops (preview path separate from shipped until accepted)
- [ ] Real touch mobile + measured smoothness
- [ ] Prod isolation: no dev currency/purchases; cloud save isolated; Rules deploy decoupled from site publish
- [ ] Firebase rules verified in emulator (deploy = separate GO)
- [ ] Closed staging link working
- [ ] Owner visual acceptance (Roblox-level polish bar)
- [ ] **Inna's separate explicit GO** for merge to `main` / domain
- [ ] Stripe/live payments, real data, public promo: separate GOs
