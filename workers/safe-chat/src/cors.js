import { loadConfig } from "./config.js";

const DEFAULT_ORIGIN = "https://halloween.punk.contractbot.dk";

export function corsHeaders(request, env) {
  const cfg = loadConfig(env);
  const origin = request.headers.get("Origin");
  const allowed = cfg.corsOrigins;
  if (origin && allowed.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      Vary: "Origin"
    };
  }
  if (!origin && allowed.includes(DEFAULT_ORIGIN)) {
    return {
      "Access-Control-Allow-Origin": DEFAULT_ORIGIN,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type"
    };
  }
  return {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type"
  };
}
