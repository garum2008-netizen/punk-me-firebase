/**
 * Moderator alert hook — POST JSON to owner-configured URL (no secrets in repo).
 * Disabled when SAFE_CHAT_MOD_ALERT_URL is unset or "disabled".
 */
export async function sendModeratorAlert(env, payload) {
  const url = (env.SAFE_CHAT_MOD_ALERT_URL || env.SAFE_CHAT_WEBHOOK_URL || "").trim();
  if (!url || url.toLowerCase() === "disabled") {
    return { sent: false, reason: "disabled" };
  }
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "punk-me-safe-chat",
        at: Date.now(),
        ...payload
      })
    });
    return { sent: res.ok, status: res.status, reason: res.ok ? "delivered" : "http_error" };
  } catch {
    return { sent: false, reason: "fetch_failed" };
  }
}
