# PUNK ME safe chat Worker

**Do not deploy** until owner written GO (Inna).

## Local dev (no production)

```bash
cd workers/safe-chat
npm install
# Emulator + skip JWT:
SAFE_CHAT_SKIP_AUTH=true \
FIREBASE_EMULATOR_HOST=127.0.0.1 \
FIREBASE_EMULATOR_NS=punk-me-40605-default-rtdb \
SAFE_CHAT_EMULATOR=true \
npx wrangler dev
```

Set secrets only via `wrangler secret put` on the owner account — never commit JSON keys.

See `docs/release/SAFE_CHAT_REPORT.md`.
