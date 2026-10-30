/** SQLite-backed DO; uses synchronous KV storage API (storage.get/put). */
export class ChatLimitsDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async alarm() {
    const retentionPending = await this.state.storage.get("retentionContinuePending");
    if (retentionPending) {
      await this.state.storage.put("retentionContinuePending", false);
      const base = (this.env.SAFE_CHAT_WORKER_URL || "").replace(/\/$/, "");
      const secret = this.env.SAFE_CHAT_INTERNAL_SECRET || "";
      if (base && secret) {
        try {
          await fetch(`${base}/api/internal/retention-continue`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Safe-Chat-Internal": secret
            },
            body: "{}"
          });
        } catch (_) {}
      }
    }
    const queue = (await this.state.storage.get("erasureContinueQueue")) || [];
    const uid = queue.shift();
    await this.state.storage.put("erasureContinueQueue", queue);
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
    if (queue.length > 0) {
      await this.state.storage.setAlarm(Date.now() + 750);
    } else {
      const stillRetention = await this.state.storage.get("retentionContinuePending");
      if (stillRetention) {
        await this.state.storage.setAlarm(Date.now() + 750);
      }
    }
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
    if (request.method === "POST" && url.pathname === "/child-safety-hide-check") {
      const body = await request.json();
      const result = await this.checkChildSafetyHide(body);
      return Response.json(result);
    }
    if (request.method === "POST" && url.pathname === "/cluster-hide-check") {
      const body = await request.json();
      const result = await this.checkClusterHide(body);
      return Response.json(result);
    }
    if (request.method === "POST" && url.pathname === "/schedule-erasure-continue") {
      const body = await request.json();
      const uid = String(body.uid || "");
      if (!uid) return Response.json({ ok: false }, { status: 400 });
      const queue = (await this.state.storage.get("erasureContinueQueue")) || [];
      if (!queue.includes(uid)) queue.push(uid);
      await this.state.storage.put("erasureContinueQueue", queue);
      const existing = await this.state.storage.getAlarm();
      if (!existing) {
        await this.state.storage.setAlarm(Date.now() + 750);
      }
      return Response.json({ ok: true, queued: queue.length });
    }
    if (request.method === "POST" && url.pathname === "/schedule-retention-continue") {
      await this.state.storage.put("retentionContinuePending", true);
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

  async saveState(data) {
    await this.state.storage.put("limits", data);
  }

  async loadReportState() {
    return (await this.state.storage.get("reports")) || {};
  }

  async loadChildSafetyHide() {
    return (await this.state.storage.get("childSafetyHide")) || {};
  }

  async saveChildSafetyHide(data) {
    await this.state.storage.put("childSafetyHide", data);
  }

  async loadClusterHide() {
    return (await this.state.storage.get("clusterHide")) || {};
  }

  async saveClusterHide(data) {
    await this.state.storage.put("clusterHide", data);
  }

  windowMs24h() {
    return 24 * 60 * 60 * 1000;
  }

  async checkChildSafetyHide({ uid, now, quota, bump }) {
    const data = await this.loadChildSafetyHide();
    let rec = data[uid] || { windowStart: now, count: 0 };
    if (now - (rec.windowStart || 0) >= this.windowMs24h()) {
      rec = { windowStart: now, count: 0 };
    }
    if (rec.count >= quota) {
      return { ok: false, reason: "hide_quota" };
    }
    if (bump) {
      rec.count += 1;
      data[uid] = rec;
      await this.saveChildSafetyHide(data);
    }
    return { ok: true, remaining: quota - rec.count };
  }

  async checkClusterHide({ clusterHash, now, cap, bump }) {
    if (!clusterHash) return { ok: true };
    const data = await this.loadClusterHide();
    let rec = data[clusterHash] || { windowStart: now, count: 0 };
    if (now - (rec.windowStart || 0) >= this.windowMs24h()) {
      rec = { windowStart: now, count: 0 };
    }
    if (rec.count >= cap) {
      return { ok: false, reason: "cluster_hide_cap" };
    }
    if (bump) {
      rec.count += 1;
      data[clusterHash] = rec;
      await this.saveClusterHide(data);
    }
    return { ok: true, remaining: cap - rec.count };
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
    const csh = await this.loadChildSafetyHide();
    let removedCsh = 0;
    for (const [uid, rec] of Object.entries(csh)) {
      if (now - (rec.windowStart || 0) > this.windowMs24h()) {
        delete csh[uid];
        removedCsh += 1;
      }
    }
    await this.saveChildSafetyHide(csh);
    const cl = await this.loadClusterHide();
    let removedCl = 0;
    for (const [k, rec] of Object.entries(cl)) {
      if (now - (rec.windowStart || 0) > this.windowMs24h()) {
        delete cl[k];
        removedCl += 1;
      }
    }
    await this.saveClusterHide(cl);
    return { ok: true, removedSend, removedRep, removedCsh, removedCl };
  }
}
