/**
 * Safe-chat RTDB overlay (apply on PR #45 baseline or live export via build-safe-chat-rules.mjs).
 * Chat trust data lives under chatMeta only (server Worker writes). players/$uid stays game-only.
 */

/** Server-only chat subtree — replaces legacy chat/$msgId client writes. */
export const SAFE_CHAT_RTDB = {
  messages: {
    ".read": "auth != null",
    ".write": false,
    "$msgId": {
      ".read": "auth != null",
      ".write": false
    }
  },
  reports: {
    ".read": false,
    ".write": false
  },
  modState: {
    ".read": false,
    ".write": false,
    "$uid": {
      ".read": false,
      ".write": false
    }
  },
  internal: {
    ".read": false,
    ".write": false
  }
};

/** Per-user chat state — Worker (admin SDK) writes only. */
export const CHAT_META_RULES = {
  $uid: {
    ".read": "auth != null && auth.uid === $uid",
    ".write": false
  }
};

/**
 * @param {object} rulesRoot — parsed database.rules.json `rules` object
 */
export function applySafeChatPatch(rulesRoot) {
  const out = JSON.parse(JSON.stringify(rulesRoot));
  out.chat = JSON.parse(JSON.stringify(SAFE_CHAT_RTDB));
  out.chatMeta = JSON.parse(JSON.stringify(CHAT_META_RULES));
  return out;
}

export const SAFE_CHAT_RULES_DELTA_MD = `
### RTDB safe-chat overlay

- **chat/** — \`messages\` read \`auth != null\`; all writes **denied** (Worker uses admin SDK).
- **chatMeta/$uid** — read owner only; **write denied** (age, registration, blocklist, send counts).
- **players/$uid** — game fields only; legacy chat keys are ignored by the Worker (migrate with \`scripts/migrate-players-chat-fields-to-meta.mjs\`).

Apply on PR #45 baseline or live export: \`node scripts/build-safe-chat-rules.mjs --write path/to/database.rules.json\`.
`.trim();
