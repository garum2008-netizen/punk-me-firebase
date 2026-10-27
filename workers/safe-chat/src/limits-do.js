export class ChatLimitsDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/check") {
      const body = await request.json();
      const result = await this.checkAndBump(body);
      return Response.json(result);
    }
    return new Response("not found", { status: 404 });
  }

  async loadState() {
    return (await this.state.storage.get("limits")) || {};
  }

  async saveState(data) {
    await this.state.storage.put("limits", data);
  }

  dayKey(ts) {
    return new Date(ts).toISOString().slice(0, 10);
  }

  async checkAndBump({ uid, now, cooldownMs, dailyLimit }) {
    const data = await this.loadState();
    const rec = data[uid] || { lastSend: 0, day: this.dayKey(now), dayCount: 0 };
    if (rec.day !== this.dayKey(now)) {
      rec.day = this.dayKey(now);
      rec.dayCount = 0;
    }
    if (now - rec.lastSend < cooldownMs) {
      return { ok: false, reason: "cooldown", retryMs: cooldownMs - (now - rec.lastSend) };
    }
    if (rec.dayCount >= dailyLimit) {
      return { ok: false, reason: "daily_limit" };
    }
    rec.lastSend = now;
    rec.dayCount += 1;
    data[uid] = rec;
    await this.saveState(data);
    return { ok: true };
  }
}
