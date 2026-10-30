import { rtdbRequest } from "./rtdb.js";
import { isImpersonationName } from "./impersonation.js";

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

export async function loadPlayerProfileForChat(config, env, token, uid) {
  const emu = env.FIREBASE_EMULATOR_HOST;
  const ns = env.FIREBASE_EMULATOR_NS;
  const snap = await rtdbRequest(config, `players/${uid}`, "GET", null, token, emu, ns);
  const p = snap.json && typeof snap.json === "object" ? snap.json : {};
  let name = typeof p.name === "string" ? p.name.trim().slice(0, 64) : "Player";
  if (!name || isImpersonationName(name)) {
    const err = new Error("impersonation_name");
    throw err;
  }
  let loc = null;
  if (typeof p.location === "string" && ALLOWED_LOCATION_IDS.has(p.location)) {
    loc = p.location;
  }
  const chatAge13DeclaredAt =
    typeof p.chatAge13DeclaredAt === "number" && p.chatAge13DeclaredAt > 0 ? p.chatAge13DeclaredAt : null;
  const chatRegisteredAt =
    typeof p.chatRegisteredAt === "number" && p.chatRegisteredAt > 0 ? p.chatRegisteredAt : null;
  const level = typeof p.level === "number" ? p.level : null;
  return { name, loc, chatAge13DeclaredAt, chatRegisteredAt, level };
}
