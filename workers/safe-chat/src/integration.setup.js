import { beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { resetIntegrationIsolation } from "./test-helpers.js";

/** Each integration test starts from clean RTDB chat state and reset limits DO counters. */
beforeEach(async () => {
  await resetIntegrationIsolation(env);
});
