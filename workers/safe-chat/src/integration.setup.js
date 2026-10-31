import { beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { assignIntegrationIsolation, syncIntegrationEnvBindings } from "./integration-isolation.js";

/** Per-test RTDB namespace + limits DO id (no cross-test wipe). */
beforeEach((ctx) => {
  if (env.SAFE_CHAT_INTEGRATION !== "1") return;
  assignIntegrationIsolation(ctx.task);
  syncIntegrationEnvBindings(env);
});
