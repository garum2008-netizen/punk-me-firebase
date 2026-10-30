import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";
import { TEST_MUTATION_DISABLE_ENV_KEYS } from "./src/test-mutation-flags.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const integration = process.env.SAFE_CHAT_INTEGRATION === "1";
const newbie = process.env.SAFE_CHAT_INTEGRATION_NEWBIE === "1";

const mutationBindings = Object.fromEntries(
  TEST_MUTATION_DISABLE_ENV_KEYS.map(key => [key, process.env[key] || ""])
);

export default defineWorkersConfig({
  resolve: {
    alias: {
      [path.resolve(__dirname, "src/auth-prod.js")]: path.resolve(__dirname, "src/auth.integration.js"),
      [path.resolve(__dirname, "src/admin-token.js")]: path.resolve(__dirname, "src/admin-token.integration.js")
    }
  },
  test: {
    fileParallelism: false,
    testTimeout: integration ? 120000 : 10000,
    include: integration
      ? newbie
        ? ["src/integration.newbie.test.js"]
        : [
            "src/integration.emulator.test.js",
            "src/integration.t139u.test.js",
            "src/integration.protections.test.js",
            "src/integration.erasure.test.js"
          ]
      : ["src/prod-config.test.js", "src/worker.smoke.test.js"],
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: {
            SAFE_CHAT_EMULATOR: integration ? "true" : "false",
            FIREBASE_EMULATOR_HOST: "127.0.0.1",
            FIREBASE_EMULATOR_NS: "punk-me-40605-default-rtdb",
            FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
            MODERATOR_UIDS: process.env.SAFE_CHAT_TEST_MOD_UID || "",
            SAFE_CHAT_DAILY_LIMIT: integration ? "2" : "80",
            SAFE_CHAT_REPORT_AUTO_HIDE: "3",
            SAFE_CHAT_FREE_TEXT: newbie ? "true" : "false",
            SAFE_CHAT_INTEGRATION: integration ? "1" : "0",
            SAFE_CHAT_TEST_MOD_TOKEN: process.env.SAFE_CHAT_TEST_MOD_TOKEN || "",
            SAFE_CHAT_HASH_SALT: "vitest-local-salt-do-not-use-in-prod",
            SAFE_CHAT_CORS_ORIGINS: "https://halloween.punk.contractbot.dk,http://127.0.0.1",
            SAFE_CHAT_ERASURE_MIN_INTERVAL_MS: integration ? "0" : String(60 * 60 * 1000),
            SAFE_CHAT_ERASURE_MAX_SUBREQUESTS: integration ? "40" : "40",
            SAFE_CHAT_ERASURE_BATCH: integration ? "5" : "40",
            SAFE_CHAT_YOUNG_COOLDOWN_MS: integration ? "0" : "5000",
            SAFE_CHAT_CHILD_SAFETY_REPORTER_MIN_MS: integration ? String(24 * 60 * 60 * 1000) : String(24 * 60 * 60 * 1000),
            SAFE_CHAT_CHILD_SAFETY_CLUSTER_HIDE_CAP: integration ? "3" : "5",
            SAFE_CHAT_RETENTION_BATCH: integration ? "120" : "45",
            ...mutationBindings
          }
        }
      }
    }
  }
});
