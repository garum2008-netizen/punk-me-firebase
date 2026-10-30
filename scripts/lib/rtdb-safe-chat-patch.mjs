/**
 * Safe-chat RTDB overlay (apply on PR #45 baseline or live export via build-safe-chat-rules.mjs).
 * Clients: chat read auth-only, no client writes. Chat trust fields live under chatMeta (server-only).
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

/** Legacy chat keys on players/$uid: cannot add, change, or delete (cascade-safe). */
export const PLAYER_CHAT_LOCK_VALIDATE = [
  "chatAge13DeclaredAt",
  "chatRegisteredAt",
  "chatBlocklist"
]
  .map(
    f =>
      `((!newData.hasChild('${f}') && !data.hasChild('${f}')) || (newData.hasChild('${f}') && data.hasChild('${f}') && newData.child('${f}').val() == data.child('${f}').val()))`
  )
  .join(" && ");

/** @deprecated child .write:false does not revoke parent grant — kept empty for patch compat */
export const PLAYER_CHAT_DENY_WRITES = {};

/**
 * @param {object} rulesRoot — parsed database.rules.json `rules` object
 */
export function applySafeChatPatch(rulesRoot) {
  const out = JSON.parse(JSON.stringify(rulesRoot));
  out.chat = JSON.parse(JSON.stringify(SAFE_CHAT_RTDB));
  out.chatMeta = JSON.parse(JSON.stringify(CHAT_META_RULES));
  const uid = out.players?.["$uid"] ?? {};
  for (const [k, v] of Object.entries(PLAYER_CHAT_DENY_WRITES)) {
    uid[k] = { ...(uid[k] || {}), ...v };
  }
  const prevValidate = uid[".validate"];
  uid[".validate"] = prevValidate
    ? `(${prevValidate}) && (${PLAYER_CHAT_LOCK_VALIDATE})`
    : PLAYER_CHAT_LOCK_VALIDATE;
  out.players["$uid"] = uid;
  return out;
}

export const SAFE_CHAT_RULES_DELTA_MD = `
### RTDB safe-chat overlay

- **chat/** — \`messages\` read \`auth != null\`; all writes **denied** (Worker uses admin SDK).
- **chatMeta/$uid** — read owner only; **write denied** (age declaration, registration, blocklist, limit snapshots).
- **players/$uid** — validate locks **chatRegisteredAt**, **chatAge13DeclaredAt**, **chatBlocklist** (immutable by owner; chat trust data under **chatMeta**).

Apply on PR #45 baseline or live export: \`node scripts/build-safe-chat-rules.mjs --write path/to/database.rules.json\`.
`.trim();
