/** SQLite-backed DO; uses synchronous KV storage API (storage.get/put). */
export class ChatLimitsDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async alarm() {
    const uid = await this.state.storage.get("erasureContinueUid");
    await this.state.storage.delete("erasureContinueUid");
    if (!uid) return;
    const base = (this.env.SAFE_CHAT_WORKER_URL || "").replace(/\/$/, "");
    const secret = this.env.SAFE_CHAT_INTERNAL_SECRET || "";
    if (!base || !secret) return;
    try {
      await fetch(`${base}/api/internal/erasure-continue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Safe-Chat-Internal": secret
        },
        body: JSON.stringify({ uid })
      });
    } catch (_) {}
  }

  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/check") {
      const body = await request.json();
      const result = await this.checkAndBumpSend(body);
      return Response.json(result);
    }
    if (request.method === "POST" && url.pathname === "/check-report") {
      const body = await request.json();
      const result = await this.checkAndBumpReport(body);
      return Response.json(result);
    }
    if (request.method === "POST" && url.pathname === "/prune") {
      const body = await request.json();
      const result = await this.pruneStale(body);
      return Response.json(result);
    }
    if (request.method === "POST" && url.pathname === "/erase-user") {
      const body = await request.json();
      const uid = String(body.uid || "");
      const send = await this.loadState();
      delete send[uid];
      await this.saveState(send);
      const rep = await this.loadReportState();
      delete rep[uid];
      await this.saveReportState(rep);
      return Response.json({ ok: true });
    }
    if (request.method === "POST" && url.pathname === "/schedule-erasure-continue") {
      const body = await request.json();
      const uid = String(body.uid || "");
      if (!uid) return Response.json({ ok: false }, { status: 400 });
      await this.state.storage.put("erasureContinueUid", uid);
      const existing = await this.state.storage.getAlarm();
      if (!existing) {
        await this.state.storage.setAlarm(Date.now() + 750);
      }
      return Response.json({ ok: true });
    }
    return new Response("not found", { status: 404 });
  }

  async loadState() {
    return (await this.state.storage.get("limits")) || {};
  }

  async loadReportState() {
    return (await this.state.storage.get("reports")) || {};
  }

  async saveState(data) {
    await this.state.storage.put("limits", data);
  }

  async saveReportState(data) {
    await this.state.storage.put("reports", data);
  }

  dayKey(ts) {
    return new Date(ts).toISOString().slice(0, 10);
  }

  async checkAndBumpSend({ uid, now, cooldownMs, dailyLimit }) {
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

  async checkAndBumpReport({ uid, now, dailyLimit }) {
    const data = await this.loadReportState();
    const rec = data[uid] || { day: this.dayKey(now), dayCount: 0 };
    if (rec.day !== this.dayKey(now)) {
      rec.day = this.dayKey(now);
      rec.dayCount = 0;
    }
    if (rec.dayCount >= dailyLimit) {
      return { ok: false, reason: "report_rate_limit" };
    }
    rec.dayCount += 1;
    data[uid] = rec;
    await this.saveReportState(data);
    return { ok: true };
  }

  async pruneStale({ now, maxAgeMs }) {
    const send = await this.loadState();
    let removedSend = 0;
    for (const [uid, rec] of Object.entries(send)) {
      if (now - (rec.lastSend || 0) > maxAgeMs) {
        delete send[uid];
        removedSend += 1;
      }
    }
    await this.saveState(send);
    const rep = await this.loadReportState();
    let removedRep = 0;
    for (const [uid, rec] of Object.entries(rep)) {
      if (rec.day !== this.dayKey(now) && now - Date.parse(`${rec.day}T00:00:00.000Z`) > maxAgeMs) {
        delete rep[uid];
        removedRep += 1;
      }
    }
    await this.saveReportState(rep);
    return { ok: true, removedSend, removedRep };
  }
}
