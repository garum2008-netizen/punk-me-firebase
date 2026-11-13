/**
 * Minimal RTDB rules hotfix: close public /players read; premium/entitlements/qa admin-only.
 * Preserves live presence/chat/publicProfiles/buildings when present and working.
 * Repairs presence only when live export cannot allow authenticated own writes (client needs this).
 */

const ADMIN_READ_PLAYERS = "auth != null && auth.token.admin === true";
const UID_READ = "auth != null && (auth.uid === $uid || auth.token.admin === true)";
const UID_WRITE = "auth != null && auth.uid === $uid";

const PRIV_VALIDATE =
  "!newData.exists() || auth.token.admin === true || (data.exists() && newData.val() == data.val())";

/** Block parent PATCH/PUT from introducing or changing privileged fields (child .validate alone is insufficient). */
const UID_PRIVILEGED_VALIDATE = [
  "(!newData.hasChild('premium') || auth.token.admin === true || (data.hasChild('premium') && newData.child('premium').val() == data.child('premium').val()))",
  "(!newData.hasChild('entitlements') || auth.token.admin === true || (data.hasChild('entitlements') && newData.child('entitlements').val() == data.child('entitlements').val()))",
  "(!newData.hasChild('qa') || auth.token.admin === true || (data.hasChild('qa') && newData.child('qa').val() == data.child('qa').val()))",
  "(!newData.hasChild('owner') || auth.token.admin === true || (data.hasChild('owner') && newData.child('owner').val() == data.child('owner').val()))"
].join(" && ");

export const PRIVILEGED_CHILD_RULES = {
  premium: { ".write": "auth != null && auth.token.admin === true", ".validate": PRIV_VALIDATE },
  entitlements: { ".write": "auth != null && auth.token.admin === true", ".validate": PRIV_VALIDATE },
  qa: { ".write": "auth != null && auth.token.admin === true", ".validate": PRIV_VALIDATE },
  owner: { ".write": "auth != null && auth.token.admin === true", ".validate": PRIV_VALIDATE }
};

/** Matches main @ 450d6da client `pushPresence` payload; read requires auth (prod anon deny). */
export const MINIMAL_CHAT_FOR_CLIENT = {
  ".read": "auth != null",
  $msgId: {
    ".write":
      "auth != null && !data.exists() && newData.child('uid').val() === auth.uid && newData.child('text').isString() && newData.child('text').val().length <= 280",
    ".validate":
      "newData.hasChildren(['uid', 'name', 'text', 'time']) && newData.child('name').isString() && newData.child('name').val().length <= 64"
  }
};

export const MINIMAL_PRESENCE_FOR_CLIENT = {
  $location: {
    ".read": "auth != null",
    $uid: {
      ".write": UID_WRITE,
      ".validate":
        "newData.hasChildren(['name', 'x', 'y', 'ts']) && newData.child('name').isString() && newData.child('name').val().length <= 64 && newData.child('x').isNumber() && newData.child('y').isNumber() && newData.child('ts').isNumber() && (!newData.hasChild('avatar') || newData.child('avatar').isString()) && (!newData.hasChild('level') || newData.child('level').isNumber()) && (!newData.hasChild('characterId') || newData.child('characterId').isString()) && (!newData.hasChild('anim') || newData.child('anim').isString()) && (!newData.hasChild('probe') || newData.child('probe').isBoolean())"
    }
  }
};

function flattenRules(obj, prefix = "") {
  const paths = {};
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    if (prefix) paths[prefix] = obj;
    return paths;
  }
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(paths, flattenRules(v, p));
    } else if (prefix || k.startsWith(".")) {
      paths[p] = v;
    }
  }
  return paths;
}

/** True if some rule under presence allows auth.uid === $uid to write own leaf. */
export function presenceAllowsOwnWrite(rulesRoot) {
  const flat = flattenRules(rulesRoot?.presence ?? {});
  const writeEntries = Object.entries(flat).filter(([k]) => k.endsWith(".write") || k === ".write");
  if (!writeEntries.length) return false;
  return writeEntries.some(([, v]) => {
    if (typeof v !== "string") return false;
    return v.includes("auth.uid") && (v.includes("$uid") || v.includes("=== $uid") || v.includes("=== auth.uid"));
  });
}

export function ensurePresenceForClient(rulesRoot) {
  if (presenceAllowsOwnWrite(rulesRoot)) {
    return { repaired: false };
  }
  rulesRoot.presence = JSON.parse(JSON.stringify(MINIMAL_PRESENCE_FOR_CLIENT));
  return { repaired: true, reason: "live export missing or blocking presence/$location/$uid write" };
}

function chatAllowsAuthWrite(rulesRoot) {
  const flat = flattenRules(rulesRoot?.chat ?? {});
  return Object.entries(flat).some(([k, v]) => k.includes(".write") && typeof v === "string" && v.includes("auth.uid"));
}

export function ensureChatForClient(rulesRoot) {
  if (chatAllowsAuthWrite(rulesRoot)) {
    return { repaired: false };
  }
  rulesRoot.chat = JSON.parse(JSON.stringify(MINIMAL_CHAT_FOR_CLIENT));
  return { repaired: true, reason: "live export missing chat write rules" };
}

export function applyHotfixPatch(liveRules) {
  const out = JSON.parse(JSON.stringify(liveRules));
  if (!out.rules) out.rules = {};
  const players = out.rules.players ?? {};
  players[".read"] = ADMIN_READ_PLAYERS;
  if (players[".write"] === undefined) players[".write"] = false;
  const uid = { ...(players["$uid"] ?? {}) };
  uid[".read"] = UID_READ;
  uid[".write"] = `auth != null && auth.uid === $uid && (${UID_PRIVILEGED_VALIDATE})`;
  uid[".validate"] = uid[".validate"]
    ? `(${uid[".validate"]}) && (${UID_PRIVILEGED_VALIDATE})`
    : UID_PRIVILEGED_VALIDATE;
  for (const [k, v] of Object.entries(PRIVILEGED_CHILD_RULES)) {
    uid[k] = v;
  }
  players["$uid"] = uid;
  out.rules.players = players;
  const presenceRepair = ensurePresenceForClient(out.rules);
  const chatRepair = ensureChatForClient(out.rules);
  return { rulesJson: out, presenceRepair, chatRepair };
}

/** Flatten rule object to dotted paths for diff. */
function flatten(obj, prefix = "") {
  const paths = {};
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    paths[prefix] = obj;
    return paths;
  }
  for (const [k, v] of Object.entries(obj)) {
    if (k === "_hotfixMeta") continue;
    const p = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(paths, flatten(v, p));
    } else {
      paths[p] = v;
    }
  }
  return paths;
}

export function diffRules(before, after) {
  const a = flatten(before?.rules ?? before);
  const b = flatten(after?.rules ?? after);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const changes = [];
  for (const k of [...keys].sort()) {
    const va = a[k];
    const vb = b[k];
    if (JSON.stringify(va) !== JSON.stringify(vb)) {
      changes.push({ path: k, before: va ?? null, after: vb ?? null });
    }
  }
  return changes;
}

export function formatDiff(changes) {
  if (!changes.length) return "(no changes)\n";
  return changes
    .map(c => `- ${c.path}\n    live:    ${JSON.stringify(c.before)}\n    hotfix:  ${JSON.stringify(c.after)}`)
    .join("\n");
}
