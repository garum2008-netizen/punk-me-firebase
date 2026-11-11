import { createHash } from "node:crypto";
import { reviewPackage } from "./quality-gate.mjs";

export function contentVersion(pkg) {
  const canonical = JSON.stringify({
    text: String((pkg && pkg.text) || ""),
    channelId: String((pkg && pkg.channelId) || ""),
    mediaUrl: pkg && pkg.visual === true ? String(pkg.imageUrl || "") : "",
    intendedDueAt: String((pkg && pkg.intendedDueAt) || ""),
    language: String((pkg && pkg.language) || "")
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export function pendingApproval(pkg) {
  return {
    status: "pending_owner",
    version: contentVersion(pkg),
    channelId: pkg.channelId,
    mediaUrl: pkg.visual === true ? String(pkg.imageUrl || "") : "",
    intendedDueAt: pkg.intendedDueAt || "",
    approver: null,
    approvedAt: null
  };
}

export function recordApproval(pkg, decision) {
  if (!decision || decision.approved !== true || !String(decision.approver || "").trim() || !decision.approvedAt) {
    return { ok: false, status: "pending_owner", error: "SILENCE", publish: false };
  }
  return {
    ok: true,
    status: "approved",
    version: contentVersion(pkg),
    channelId: pkg.channelId,
    mediaUrl: pkg.visual === true ? String(pkg.imageUrl || "") : "",
    intendedDueAt: pkg.intendedDueAt || "",
    approver: String(decision.approver),
    approvedAt: decision.approvedAt,
    publish: false
  };
}

export function scheduleApproved(pkg, record) {
  const qa = reviewPackage(pkg);
  if (!qa.ok) return { ok: false, stage: "legal_or_media_qa", publish: false, reasons: qa.reasons };
  if (qa.decision === "hold") return { ok: false, stage: "held", publish: false, reasons: qa.reasons };
  if (!record) return { ok: false, stage: "awaiting_owner", error: "SILENCE", publish: false };
  if (record.status !== "approved" || !record.approver || !record.approvedAt) {
    return { ok: false, stage: "awaiting_owner", error: "NOT_APPROVED", publish: false };
  }
  if (record.version !== contentVersion(pkg)) {
    return { ok: false, stage: "reapproval_required", error: "VERSION_MISMATCH", publish: false };
  }
  if (record.channelId !== pkg.channelId) {
    return { ok: false, stage: "reapproval_required", error: "CHANNEL_MISMATCH", publish: false };
  }
  const mediaUrl = pkg.visual === true ? String(pkg.imageUrl || "") : "";
  if ((record.mediaUrl || "") !== mediaUrl) {
    return { ok: false, stage: "reapproval_required", error: "MEDIA_MISMATCH", publish: false };
  }
  if (!pkg.intendedDueAt || record.intendedDueAt !== pkg.intendedDueAt) {
    return { ok: false, stage: "reapproval_required", error: "DATE_MISMATCH", publish: false };
  }
  const request = {
    ...qa.draft.request,
    mode: "customScheduled",
    dueAt: pkg.intendedDueAt,
    saveToDraft: false
  };
  if (request.mode === "shareNow") {
    return { ok: false, stage: "blocked_publish_not_authorized", error: "PUBLISH_NOT_AUTHORIZED", publish: false };
  }
  return {
    ok: true,
    stage: "schedule",
    publish: false,
    scheduledPublication: true,
    action: pkg.bufferDraftId ? "edit" : "create",
    draftId: pkg.bufferDraftId || null,
    request
  };
}

export function buildApprovalBatch(packages, meta) {
  return {
    id: meta.id,
    status: "pending_owner",
    createdAt: meta.createdAt,
    approver: null,
    approvedAt: null,
    publish: false,
    items: packages.map((pkg) => ({
      id: pkg.id,
      topic: pkg.topic,
      channelId: pkg.channelId,
      channel: pkg.service,
      brand: pkg.brand,
      mediaUrl: pkg.visual === true ? String(pkg.imageUrl || "") : "",
      media: pkg.visual === true ? "attached" : "text_only",
      proposedDueAt: pkg.intendedDueAt,
      hash: contentVersion(pkg),
      status: "pending_owner",
      scheduleBlock: pkg.collisions && pkg.collisions.length ? "existing_buffer_item" : null,
      review: pkg.review || "",
      text: pkg.text
    }))
  };
}

export function applyBatchDecision(batch, packages, decision) {
  const untouched = (batch.items || []).map((item) => item.id);
  if (!decision || decision.approved !== true || !String(decision.approver || "").trim() || !decision.approvedAt) {
    return { ok: false, error: "SILENCE", records: [], skipped: untouched, publish: false };
  }
  if (decision.scope !== "all" && !Array.isArray(decision.ids)) {
    return { ok: false, error: "SILENCE", records: [], skipped: untouched, publish: false };
  }
  const selected = new Set(decision.scope === "all" ? untouched : decision.ids);
  const records = [];
  const skipped = [];
  for (const item of batch.items) {
    if (!selected.has(item.id)) {
      skipped.push({ id: item.id, status: "pending_owner" });
      continue;
    }
    const pkg = packages.find((entry) => entry.id === item.id);
    if (!pkg || contentVersion(pkg) !== item.hash) {
      skipped.push({ id: item.id, error: "VERSION_MISMATCH" });
      continue;
    }
    records.push({ id: item.id, approval: recordApproval(pkg, decision) });
  }
  return { ok: records.length > 0, error: records.length ? null : "NONE_SELECTED", records, skipped, publish: false };
}

export function planDesk(items) {
  return items.map((item) => {
    const result = scheduleApproved(item.package, item.approval);
    return { id: item.id, ...result };
  });
}

export function verifyPublication(post, pkg, seen) {
  const ledger = seen || new Set();
  if (!post || ledger.has(post.id)) return { ok: false, counted: false, reason: "duplicate" };
  if (post.status !== "sent") return { ok: false, counted: false, reason: "not_sent" };
  if (post.channelId !== pkg.channelId || post.text !== pkg.text) {
    return { ok: false, counted: false, reason: "version" };
  }
  if (pkg.visual === true) {
    const urls = (post.assets || []).map((asset) => asset && asset.source).filter(Boolean);
    if (!urls.includes(pkg.imageUrl)) return { ok: false, counted: false, reason: "media" };
  }
  ledger.add(post.id);
  return { ok: true, counted: true, seen: ledger };
}

export function collectMetrics(posts) {
  const seen = new Set();
  const totals = { posts: 0, reactions: 0, comments: 0, impressions: 0 };
  for (const post of posts) {
    if (!post || seen.has(post.id)) continue;
    seen.add(post.id);
    totals.posts += 1;
    totals.reactions += Number(post.reactions) || 0;
    totals.comments += Number(post.comments) || 0;
    totals.impressions += Number(post.impressions) || 0;
  }
  return totals;
}
