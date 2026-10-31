import { beforeAll, beforeEach } from "vitest";
import { env, SELF } from "cloudflare:test";
import {
  resetIntegrationIsolation,
  authSignUp,
  apiGet,
  rtdbOwner,
  waitForChatMessage
} from "./test-helpers.js";

/** Each integration test starts from clean RTDB chat state and reset limits DO counters. */
beforeEach(async () => {
  await resetIntegrationIsolation(env);
});

/** Block the suite until owner POST + worker config reads are consistently visible (cold emulator). */
beforeAll(async () => {
  if (env.SAFE_CHAT_INTEGRATION !== "1") return;
  let lastErr = null;
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try {
      await rtdbOwner("chat/messages", "GET");
      const u = await authSignUp();
      const cfg = await (await apiGet(SELF, "/api/chat/config", u.idToken)).json();
      const sid = cfg?.mySid;
      if (typeof sid !== "string" || !/^[a-f0-9]{32}$/.test(sid)) {
        throw new Error("warmup: mySid missing");
      }
      const ref = await rtdbOwner("chat/messages", "POST", {
        sid,
        name: "Warmup",
        text: "warmup",
        time: Date.now()
      });
      const id = ref.json?.name;
      if (!id) throw new Error("warmup: POST returned no id");
      await waitForChatMessage(id);
      const m = await rtdbOwner(`chat/messages/${id}`, "GET");
      if (m.json?.sid !== sid) throw new Error("warmup: sid mismatch on read-back");
      return;
    } catch (e) {
      lastErr = e;
      await new Promise(r => setTimeout(r, 250));
    }
  }
  throw lastErr || new Error("integration RTDB warmup failed");
}, 120000);
