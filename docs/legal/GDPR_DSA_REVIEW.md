# GDPR / DSA review — safe chat (DRAFT)

> **Not a compliance certificate.** Automated tests passing does **not** mean GDPR or DSA conformity.

## Data minimization

| Processing | Lawful basis (draft — legal to confirm) | Minimization |
|------------|----------------------------------------|--------------|
| Chat messages (text, uid, name, time) | Legitimate interest / contract for game feature | 7-day retention; phrases-only mode default |
| Reports (hashed ids, category, time) | Legal obligation / safety (DSA Art. 16 context) | 90-day retention; child-safety hold until mod resolve |
| Rate limits in DO | Legitimate interest (security) | Aggregated counters only |
| Mute/ban | Safety | Until lifted |

## User rights (draft operational notes)

- **Access / erasure:** tie to Firebase Auth account deletion workflow *(owner to document in Privacy Notice)*.
- **Objection / restriction:** contact owner; blocklist is client-side on `players/{uid}/chatBlocklist`.
- **Complaints:** DSA contact point *(add before EU publish)*.

## Documents to align before GO

- `docs/legal/CHAT_RULES.md` — community rules
- `docs/legal/CHAT_PRIVACY.md` — retention, backups, logs
- Main site `privacy.html` — link to chat supplement
- `CHILD_SAFETY_ESCALATION.md` — moderator procedure

## DSA transparency (draft)

- Statement of reasons for moderation actions *(not automated in Worker)*.
- Annual transparency report *(out of scope for code)*.

## Minors

- Product positioning 13+; free text disabled until owner enables after review.
- Child-safety report path with immediate hide and mod priority.
