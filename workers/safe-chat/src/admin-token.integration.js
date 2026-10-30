import { getServiceAccountAccessToken } from "./rtdb.js";

let cached = { token: null, expSec: 0 };

/** Vitest/integration only (aliased over admin-token.js in vitest.config.js). */
export async function getCachedAdminToken(env) {
  if (env.SAFE_CHAT_EMULATOR === "true" && !env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    return "owner";
  }
  if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    throw new Error("missing FIREBASE_SERVICE_ACCOUNT_JSON");
  }
  const now = Math.floor(Date.now() / 1000);
  if (cached.token && cached.expSec > now + 120) return cached.token;
  const token = await getServiceAccountAccessToken(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  cached = { token, expSec: now + 3500 };
  return token;
}

export function resetAdminTokenCacheForTests() {
  cached = { token: null, expSec: 0 };
}
