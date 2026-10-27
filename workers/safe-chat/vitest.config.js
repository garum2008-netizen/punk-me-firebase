import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        wrangler: { configPath: "./wrangler.toml" },
        miniflare: {
          bindings: {
            SAFE_CHAT_SKIP_AUTH: "true",
            SAFE_CHAT_EMULATOR: "true",
            FIREBASE_EMULATOR_HOST: "127.0.0.1",
            FIREBASE_EMULATOR_NS: "punk-me-40605-default-rtdb"
          }
        }
      }
    }
  }
});
