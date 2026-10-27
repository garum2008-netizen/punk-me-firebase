import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

const integration = process.env.SAFE_CHAT_INTEGRATION === "1";
const newbie = process.env.SAFE_CHAT_INTEGRATION_NEWBIE === "1";

export default defineWorkersConfig({
  test: {
    fileParallelism: false,
    testTimeout: integration ? 30000 : 10000,
    include: integration
      ? newbie
        ? ["src/integration.newbie.test.js"]
        : ["src/integration.emulator.test.js"]
      : ["src/prod-config.test.js", "src/worker.smoke.test.js"],
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: {
            SAFE_CHAT_TEST_MODE: integration ? "true" : "false",
            SAFE_CHAT_EMULATOR: integration ? "true" : "false",
            FIREBASE_EMULATOR_HOST: "127.0.0.1",
            FIREBASE_EMULATOR_NS: "punk-me-40605-default-rtdb",
            FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
            MODERATOR_UIDS: process.env.SAFE_CHAT_TEST_MOD_UID || "",
            SAFE_CHAT_DAILY_LIMIT: integration ? "2" : "80",
            SAFE_CHAT_REPORT_AUTO_HIDE: "3",
            SAFE_CHAT_FREE_TEXT: newbie ? "true" : "false",
            SAFE_CHAT_SKIP_AUTH: "false",
            SAFE_CHAT_INTEGRATION: integration ? "1" : "0",
            SAFE_CHAT_TEST_MOD_TOKEN: process.env.SAFE_CHAT_TEST_MOD_TOKEN || ""
          }
        }
      }
    }
  }
});
