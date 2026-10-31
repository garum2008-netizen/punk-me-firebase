import { beforeAll, beforeEach } from "vitest";
import { env, SELF } from "cloudflare:test";
import {
  resetIntegrationIsolation,
  authSignUp,
  apiGet,
  rtdbOwner
} from "./test-helpers.js";

/** Each integration test starts from clean RTDB chat state and reset limits DO counters. */
beforeEach(async () => {
  await resetIntegrationIsolation(env);
});

/** First RTDB write after emulator attach can lag; warm up before erasure tests run first in the suite. */
beforeAll(async () => {
  if (env.SAFE_CHAT_INTEGRATION !== "1") return;
  await rtdbOwner("chat/messages", "GET");
  const u = await authSignUp();
  const sid = (await (await apiGet(SELF, "/api/chat/config", u.idToken)).json()).mySid;
  if (sid) {
    await rtdbOwner("chat/messages", "POST", {
      sid,
      name: "Warmup",
      text: "warmup",
      time: 1
    });
  }
});
