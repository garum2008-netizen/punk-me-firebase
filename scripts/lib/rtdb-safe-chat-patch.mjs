/**
 * Safe-chat RTDB overlay on top of PR #45 hotfix (MINIMAL_CHAT_FOR_CLIENT).
 * Clients may read messages when authenticated; only the Worker (admin SDK / SA) writes.
 */

/** Replaces legacy chat/$msgId client-write tree from main / hotfix repo file. */
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

export const PLAYER_SAFE_CHAT_FIELDS = {
  chatBlocklist: {
    ".validate": "true"
  },
  chatRegisteredAt: {
    ".validate":
      "!newData.exists() || (newData.isNumber() && newData.val() > 0 && (!data.exists() || newData.val() === data.val()))"
  }
};

/**
 * @param {object} rulesRoot — parsed database.rules.json `rules` object
 */
export function applySafeChatPatch(rulesRoot) {
  const out = JSON.parse(JSON.stringify(rulesRoot));
  out.chat = JSON.parse(JSON.stringify(SAFE_CHAT_RTDB));
  const uid = out.players?.["$uid"] ?? {};
  for (const [k, v] of Object.entries(PLAYER_SAFE_CHAT_FIELDS)) {
    if (!uid[k]) uid[k] = v;
  }
  out.players["$uid"] = uid;
  return out;
}

/** Human-readable delta vs PR #45 MINIMAL_CHAT_FOR_CLIENT */
export const SAFE_CHAT_RULES_DELTA_MD = `
### RTDB chat rules: changes on top of PR #45

PR #45 (\`MINIMAL_CHAT_FOR_CLIENT\` in \`scripts/lib/rtdb-hotfix-patch.mjs\`) allows:
- \`chat\` read when \`auth != null\`
- \`chat/$msgId\` create when \`auth.uid === newData.uid\` (client push)

This PR **replaces** the \`chat\` subtree with:
- \`chat/messages\` — read \`auth != null\`, **write denied** for all clients
- \`chat/reports\`, \`chat/modState\`, \`chat/internal\` — no client read/write
- Player profile fields \`chatBlocklist\`, \`chatRegisteredAt\` (user-owned blocklist + one-time registration timestamp)

Legacy path \`chat/$msgId\` is removed in the repo rules file; production still has old messages until migration (optional one-time script — **not run in this PR**).
`.trim();
