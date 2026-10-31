import { beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { resetHideCountersDo, rtdbOwner } from "./test-helpers.js";

/** Every integration test starts with clean discretionary/cluster hide counters on the limits DO. */
beforeEach(async () => {
  await resetHideCountersDo(env);
  await rtdbOwner("chat/messages", "DELETE");
  await rtdbOwner("chat/reports", "DELETE");
  await rtdbOwner("chat/internal", "DELETE");
});
