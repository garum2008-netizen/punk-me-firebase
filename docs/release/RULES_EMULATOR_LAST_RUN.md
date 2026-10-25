# Rules emulator run (PR #45)

Branch: `cursor/prod-security-hotfix-d81d`. Command: `npm run test:rules`.  
Includes `test-database-rules.js` (21 cases), save fixtures, save-gameplay.

```
> test:rules
> node scripts/run-rules-emulator.js

⚠  emulators: You are not currently authenticated so some features may not work correctly. Please run firebase login to authenticate the CLI.
i  emulators: Starting emulators: auth, database
i  database: Database Emulator logging to database-debug.log
⚠  emulators: The Emulator UI is not starting, either because none of the running emulators have a UI component or the Emulator UI cannot determine the Project ID. Pass the --project flag to specify a project.

┌─────────────────────────────────────────────────────────────┐
│ ✔  All emulators ready! It is now safe to connect your app. │
└─────────────────────────────────────────────────────────────┘

┌────────────────┬────────────────┐
│ Emulator       │ Host:Port      │
├────────────────┼────────────────┤
│ Authentication │ 127.0.0.1:9099 │
├────────────────┼────────────────┤
│ Database       │ 127.0.0.1:9000 │
└────────────────┴────────────────┘
  Emulator Hub host: 127.0.0.1 port: 4400
  Other reserved ports: 4500

Issues? Report them at https://github.com/firebase/firebase-tools/issues and attach the *-debug.log files.
 
PASS: unauth read /players root → deny — status 401
PASS: unauth read /players/{uid} → deny — status 401
PASS: alice read own /players/{uid} → allow — status 200
PASS: alice read bob /players/{uid} → deny — status 401
PASS: alice write own coins → allow — 101
PASS: alice SET /players/{uid} with premium:true → deny — status 401
PASS: alice PUT premium:true → deny — status 401
PASS: alice update coins when premium already true (admin-set) → allow — 105
PASS: alice PUT entitlements → deny — status 401
PASS: bob write alice coins → deny — status 401
PASS: admin read /players root → allow — status 200
PASS: unauth read publicProfiles/{uid} → allow — status 200
PASS: bob write alice publicProfile → deny — status 401
PASS: alice write own publicProfile → allow — {"avatar":"imagine_images/Oo040.jpg","coins":105,"name":"TestPunk"}
PASS: unauth write presence → deny — status 401
PASS: alice write own presence → allow — {"anim":"idle","avatar":"imagine_images/Oo040.jpg","characterId":"cobalt","level":1,"name":"TestPunk","ts":1792965680847,"x":50,"y":55}
PASS: unauth read presence/room → allow — status 200
PASS: unauth read chat → allow — status 200
PASS: alice write chat message → allow — {"name":"TestPunk","text":"hi","time":1792965680874,"uid":"J96AyZMI4DyeY8mpD8X0g7tMQ43Z"}
PASS: unauth read buildings/city → allow — status 200
PASS: alice place building piece → allow — {"owner":"J96AyZMI4DyeY8mpD8X0g7tMQ43Z","type":"bench","x":1,"y":2}

--- client impact (main @ 450d6da vs rules in this repo) ---
PASS (analysis): main game.js does NOT read /players root; multiplayer uses /presence/{location} only.
PASS (analysis): owner-admin.mjs reads /players root — needs auth.token.admin (rules allow).
WARN (prod vs git): live prod allows anon GET /players (owner verified 25.10); git rules deny — deploy git rules closes leak, does not break main client save/F5.
WARN (prod vs git): live prod denies anon presence/publicProfiles/chat/buildings; git rules ALLOW read — naive full deploy OPENS those paths. Merge premium/players fixes INTO exported prod rules.
PASS (analysis): hotfix game.js saveMe uses .update(sanitizePlayer) without premium — compatible with premium validate + unchanged admin premium.

All 21 emulator rule cases passed.
save-fixtures: 20 shapes
  OK fx-default (pet=null)
  OK fx-pet-dog (pet="pet_dog")
  OK fx-pet-null (pet=null)
  OK fx-owned-empty (pet=null)
  OK fx-owned-list (pet=null)
  OK fx-owned-rtdb-map (pet=null)
  OK fx-inventory-materials (pet=null)
  OK fx-equipment-only (pet=null)
  OK fx-story-active (pet=null)
  OK fx-story-null (pet=null)
  OK fx-onboarding-legacy (pet=null)
  OK fx-linked-auth (pet=null)
  OK fx-minimal-old (pet=null)
  OK fx-decor-items (pet=null)
  OK fx-decor-empty (pet=null)
  OK fx-dog-pos (pet="pet_dog")
  OK fx-job-cooldowns (pet=null)
  OK fx-character-cobalt (pet=null)
  OK fx-owner-flag (pet=null)
  OK fx-heavy (pet="pet_dog")
save-fixtures: all PASS
save-gameplay: PASS {"snapshot":{"uid":"LMZU6g6tA9SozTRjsknwHTjuHwpV","pet":"pet_dog","coins":4740,"location":"street","shack":1,"lastJob":1792965706390,"dbPet":"pet_dog","dbLocation":"street","dbShack":1},"after":{"pet":"pet_dog","location":"street","shack":1,"coins":4760}}
run-rules-emulator: all tests PASS
```
