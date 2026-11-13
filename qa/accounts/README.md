# QA account test artifacts

`test-results.json` is **gitignored** after PR mask: regenerate on a developer machine when re-running account QA.

Historical commits may still contain test `@contractbot.dk` addresses and Firebase UIDs. Removing them from **git history** requires an owner-approved rewrite (BFG/filter-repo) — not performed in the mask PR.
