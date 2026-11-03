import { beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { assignIntegrationIsolation, syncIntegrationEnvBindings } from "./integration-isolation.js";
import { ensureIntegrationRtdbRules } from "./integration-rtdb-rules.js";

/** Per-test RTDB namespace + limits DO id (no cross-test wipe). */
beforeEach(async (ctx) => {
  if (env.SAFE_CHAT_INTEGRATION !== "1") return;
  const { ns } = assignIntegrationIsolation(ctx.task);
  await ensureIntegrationRtdbRules(ns);
  syncIntegrationEnvBindings(env);
});
