import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_PATH = path.resolve(__dirname, "../../../database.rules.json");
const DB_HOST = "127.0.0.1";
const DB_PORT = 9000;

let cachedRulesBody = null;
const appliedNs = new Set();

function rulesBody() {
  if (!cachedRulesBody) cachedRulesBody = fs.readFileSync(RULES_PATH, "utf8");
  return cachedRulesBody;
}

/** Emulator only applies firebase.json rules to the default instance; push rules per test ns. */
export async function ensureIntegrationRtdbRules(ns) {
  if (appliedNs.has(ns)) return;
  const res = await fetch(
    `http://${DB_HOST}:${DB_PORT}/.settings/rules.json?ns=${encodeURIComponent(ns)}`,
    {
      method: "PUT",
      headers: { Authorization: "Bearer owner", "Content-Type": "application/json" },
      body: rulesBody()
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`RTDB rules upload failed ns=${ns} status=${res.status} ${text}`);
  }
  appliedNs.add(ns);
}
