/**
 * Moderator alert hook — POST JSON to owner-configured URL (no secrets in repo).
 * Disabled when SAFE_CHAT_MOD_ALERT_URL is unset or "disabled".
 */
export async function sendModeratorAlert(env, payload, opts = {}) {
  const url = (env.SAFE_CHAT_MOD_ALERT_URL || env.SAFE_CHAT_WEBHOOK_URL || "").trim();
  if (!url || url.toLowerCase() === "disabled") {
    return { sent: false, reason: "disabled" };
  }
  if (!/^https:\/\//i.test(url)) {
    return { sent: false, reason: "invalid_url_scheme" };
  }
  const timeoutMs = opts.timeoutMs ?? 3000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "punk-me-safe-chat",
        at: Date.now(),
        ...payload
      }),
      signal: controller.signal
    });
    return { sent: res.ok, status: res.status, reason: res.ok ? "delivered" : "http_error" };
  } catch (e) {
    return { sent: false, reason: e?.name === "AbortError" ? "timeout" : "fetch_failed" };
  } finally {
    clearTimeout(timer);
  }
}
