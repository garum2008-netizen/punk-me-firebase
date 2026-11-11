import { prepareVisualDraft } from "../ice-buffer/visual-media-gate.mjs";

const CONFIDENTIAL = /clarges/i;
const REQUIRED = ["scenario", "framework", "risk", "lesson", "cta", "text"];

export function reviewPackage(pkg) {
  const reasons = [];
  if (!pkg || pkg.realClient === true) reasons.push("confidential_client");
  if (CONFIDENTIAL.test(JSON.stringify(pkg || {}))) reasons.push("confidential_marker");
  if (!pkg || pkg.teachingExample !== true) reasons.push("must_be_labelled_teaching_example");
  for (const field of REQUIRED) {
    if (!pkg || !String(pkg[field] || "").trim()) reasons.push("missing_" + field);
  }
  if (!pkg || !Array.isArray(pkg.sources) || pkg.sources.length < 1) reasons.push("missing_source");
  if (pkg && pkg.audience === "children") reasons.push("children_not_in_legal_desk");
  if (!pkg || (pkg.approval !== "pending_owner" && pkg.approval !== "existing_queue" && pkg.approval !== "approved")) reasons.push("approval_missing");
  if (pkg && Array.isArray(pkg.collisions) && pkg.collisions.length > 0) reasons.push("queue_collision");
  if (pkg && pkg.visual === true) {
    if (!pkg.imageUrl) reasons.push("missing_media");
    if (pkg.mediaTopic && pkg.topic && pkg.mediaTopic !== pkg.topic) reasons.push("media_topic_mismatch");
  }
  const hard = reasons.filter((reason) => reason !== "queue_collision");
  if (hard.length) return { ok: false, decision: "block", publish: false, reasons };
  if (reasons.includes("queue_collision") || pkg.approval === "existing_queue") {
    return { ok: true, decision: "hold", publish: false, reasons };
  }
  const draft = prepareVisualDraft({
    idempotencyKey: pkg.idempotencyKey,
    channelId: pkg.channelId,
    audience: pkg.audience,
    service: pkg.service,
    visual: pkg.visual === true,
    imageUrl: pkg.imageUrl,
    altText: pkg.altText,
    text: pkg.text
  });
  if (!draft.ok) {
    return { ok: false, decision: "block", publish: false, reasons: reasons.concat(draft.error_code || draft.status) };
  }
  return { ok: true, decision: "create_draft", publish: false, reasons, draft };
}
