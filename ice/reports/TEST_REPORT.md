# ICE test report

**Result: PASS**

Checked 11 November 2026, Europe/Copenhagen. No scheduled post was edited. No second Buffer post was created. The draft from 8 November 2026, 21:53 Europe/Copenhagen, was read back and is still a draft.

## Modules

| Module | What the tests showed |
| --- | --- |
| Content Production | Business channels produce a post, article, caption or script plus a media candidate. Kids channels refuse new copy. Grok and other paid models are refused. |
| Media Validation | A visual post is blocked when the file is missing, not public, unreachable, the wrong content type, or the wrong kind for the channel. |
| Publishing Queue | Happy path recorded in the journal: `PENDING → GENERATING → VALIDATING → READY → DRAFT`. A technical failure is retried once and then drafted. An ambiguous failure is not retried. The same text is not sent twice. |

`python3 -m unittest ice.tests.test_factory` — 10 tests, OK.

## Buffer checkpoint

| Check | Result |
| --- | --- |
| Draft `6af0e14bd6bbae6fa10f1ce0` | `draft`, `dueAt` empty, not sent |
| Channel | Facebook Legal Tech Counsellor |
| Media | 1 JPEG, 1122×1402, public HTTPS URL, alt text present |
| Scheduled queue before and after this run | 40 posts, 0 differences |
| Kids channels in that queue | 4 before, 4 after |
| Draft id inside the scheduled queue | no |

The same English checkpoint text is now treated as already used. A later job with that brief takes a different template instead of creating a copy.

## Permission boundary

`publish_permission` is false in the saved policy. `approve` and `schedule` do nothing to Buffer unless a test turns the flag on. Even then, scheduling reuses the existing idempotency key and does not create a second post. `WHO OWNS THE TRUTH?` stays a draft: approval is refused until a separate GO.

## Blockers

- Live scheduling is not connected. Moving the draft onto the Buffer queue needs a separate GO and an update of this draft, not a new post.
- Grok bots are outside this environment and were not switched off. The existing Buffer queue keeps publishing.
- This factory sits in the public game repository. Firebase Hosting ignores `ice/**`. GitHub Pages serves the repository root, so a merge makes these files reachable on the game site.
