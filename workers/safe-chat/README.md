# PUNK ME safe chat Worker

**Do not deploy** until owner written GO (Inna).

## Local dev (no production)

```bash
cd workers/safe-chat
npm install
# Emulator + Auth lookup test mode (local only — never set in wrangler.toml [vars]):
SAFE_CHAT_TEST_MODE=true \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIREBASE_EMULATOR_HOST=127.0.0.1 \
FIREBASE_EMULATOR_NS=punk-me-40605-default-rtdb \
SAFE_CHAT_EMULATOR=true \
npx wrangler dev
```

Set secrets only via `wrangler secret put` on the owner account — never commit JSON keys.

See `docs/release/SAFE_CHAT_REPORT.md`.
