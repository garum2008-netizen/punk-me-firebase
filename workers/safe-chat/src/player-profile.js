import { rtdbRequest } from "./rtdb.js";
import { isImpersonationName } from "./impersonation.js";
import { filterMessage } from "./filter.js";

/** Game location ids (must match client LOCATIONS). */
export const ALLOWED_LOCATION_IDS = new Set([
  "room",
  "street",
  "cemetery",
  "city",
  "construction",
  "roof",
  "parkour",
  "kitchen",
  "elevator",
  "toilet",
  "duel"
]);

async function loadChatMeta(config, env, token, uid) {
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const snap = await rtdbRequest(config, `chatMeta/${uid}`, "GET", null, token, emu, ns);
  return snap.json && typeof snap.json === "object" ? snap.json : {};
}

export async function loadPlayerProfileForChat(config, env, token, uid) {
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const snap = await rtdbRequest(config, `players/${uid}`, "GET", null, token, emu, ns);
  const p = snap.json && typeof snap.json === "object" ? snap.json : {};
  const meta = await loadChatMeta(config, env, token, uid);

  let rawName = typeof p.name === "string" ? p.name.trim().slice(0, 64) : "Player";
  if (!rawName || isImpersonationName(rawName)) {
    throw new Error("impersonation_name");
  }
  const filteredName = filterMessage(rawName, 64);
  if (!filteredName.ok) {
    const err = new Error("bad_display_name");
    err.reason = filteredName.reason;
    throw err;
  }
  const name = filteredName.text;

  let loc = null;
  if (typeof p.location === "string" && ALLOWED_LOCATION_IDS.has(p.location)) {
    loc = p.location;
  }

  const chatAge13DeclaredAt =
    typeof meta.chatAge13DeclaredAt === "number" && meta.chatAge13DeclaredAt > 0
      ? meta.chatAge13DeclaredAt
      : typeof p.chatAge13DeclaredAt === "number" && p.chatAge13DeclaredAt > 0
        ? p.chatAge13DeclaredAt
        : null;
  const chatRegisteredAt =
    typeof meta.chatRegisteredAt === "number" && meta.chatRegisteredAt > 0
      ? meta.chatRegisteredAt
      : typeof p.chatRegisteredAt === "number" && p.chatRegisteredAt > 0
        ? p.chatRegisteredAt
        : null;
  const rateLimitLevel =
    typeof meta.rateLimitLevel === "number" ? meta.rateLimitLevel : typeof p.level === "number" ? p.level : null;
  const rawPlayerLevel = typeof p.level === "number" ? p.level : null;
  const level = rateLimitLevel;
  const blockedSids =
    meta.blockedSids && typeof meta.blockedSids === "object" ? { ...meta.blockedSids } : {};

  return { name, loc, chatAge13DeclaredAt, chatRegisteredAt, level, rawPlayerLevel, blockedSids };
}
