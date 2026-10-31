import { env } from "cloudflare:test";

const DB_HOST = "127.0.0.1";
const DB_PORT = 9000;

const appliedNs = new Set();

/** Emulator only applies firebase.json rules to the default instance; push rules per test ns. */
export async function ensureIntegrationRtdbRules(ns) {
  if (appliedNs.has(ns)) return;
  const body = env.SAFE_CHAT_TEST_RTDB_RULES;
  if (!body) throw new Error("SAFE_CHAT_TEST_RTDB_RULES binding missing (integration vitest only)");
  const res = await fetch(
    `http://${DB_HOST}:${DB_PORT}/.settings/rules.json?ns=${encodeURIComponent(ns)}`,
    {
      method: "PUT",
      headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
      body
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RTDB rules upload failed ns=${ns} status=${res.status} ${text}`);
  }
  appliedNs.add(ns);
}
