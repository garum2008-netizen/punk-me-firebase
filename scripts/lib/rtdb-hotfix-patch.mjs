/**
 * Minimal RTDB rules hotfix: close public /players read; premium/entitlements/qa admin-only.
 * Does NOT modify presence, chat, publicProfiles, buildings (keeps live prod shape).
 */

const ADMIN_READ_PLAYERS = "auth != null && auth.token.admin === true";
const UID_READ = "auth != null && (auth.uid === $uid || auth.token.admin === true)";
const UID_WRITE = "auth != null && auth.uid === $uid";

const PRIV_VALIDATE =
  "!newData.exists() || auth.token.admin === true || (data.exists() && newData.val() == data.val())";

export const PRIVILEGED_CHILD_RULES = {
  premium: { ".validate": PRIV_VALIDATE },
  entitlements: { ".validate": PRIV_VALIDATE },
  qa: { ".validate": PRIV_VALIDATE }
};

export function applyHotfixPatch(liveRules) {
  const out = JSON.parse(JSON.stringify(liveRules));
  if (!out.rules) out.rules = {};
  const players = out.rules.players ?? {};
  players[".read"] = ADMIN_READ_PLAYERS;
  if (players[".write"] === undefined) players[".write"] = false;
  const uid = { ...(players["$uid"] ?? {}) };
  uid[".read"] = UID_READ;
  uid[".write"] = UID_WRITE;
  for (const [k, v] of Object.entries(PRIVILEGED_CHILD_RULES)) {
    uid[k] = v;
  }
  players["$uid"] = uid;
  out.rules.players = players;
  return out;
}

/** Flatten rule object to dotted paths for diff. */
function flatten(obj, prefix = "") {
  const paths = {};
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    paths[prefix] = obj;
    return paths;
  }
  for (const [k, v] of Object.entries(obj)) {
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
