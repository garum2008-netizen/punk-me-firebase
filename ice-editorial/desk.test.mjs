import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  applyBatchDecision,
  buildApprovalBatch,
  collectMetrics,
  contentVersion,
  pendingApproval,
  planDesk,
  recordApproval,
  scheduleApproved,
  verifyPublication
} from "./desk.mjs";
import { earlierSignatureDraft, reviewPackages } from "./review-packages.mjs";

const owner = { approved: true, approver: "Inna Kragh", approvedAt: "2026-11-11T11:55:00+01:00" };
const facebook = reviewPackages.find((pkg) => pkg.id === "gdpr-20261204-fb");

test("silence and a pending record do not schedule", () => {
  assert.equal(scheduleApproved(facebook, null).error, "SILENCE");
  assert.equal(scheduleApproved(facebook, pendingApproval(facebook)).error, "NOT_APPROVED");
  assert.equal(scheduleApproved(facebook, { status: "approved" }).error, "NOT_APPROVED");
});

test("an exact owner approval schedules that version and nothing else", () => {
  const pkg = { ...facebook, approval: "approved" };
  const record = recordApproval(pkg, owner);
  const scheduled = scheduleApproved(pkg, record);
  assert.equal(scheduled.stage, "schedule");
  assert.equal(scheduled.publish, false);
  assert.equal(scheduled.action, "create");
  assert.equal(scheduled.draftId, null);
  assert.equal(scheduled.request.mode, "customScheduled");
  assert.equal(scheduled.request.dueAt, "2026-12-04T12:00:00+01:00");
  assert.equal(scheduled.request.saveToDraft, false);
  assert.equal(scheduled.request.channelId, "6a9d9398cd8b9c702c1981cd");
  assert.equal(scheduled.request.metadata.facebook.type, "post");
  assert.equal(scheduled.request.assets, undefined);
  const edited = scheduleApproved({ ...pkg, text: pkg.text + "\nChanged." }, record);
  assert.equal(edited.error, "VERSION_MISMATCH");
  const moved = scheduleApproved(pkg, { ...record, intendedDueAt: "2026-12-05T12:00:00+01:00" });
  assert.equal(moved.error, "DATE_MISMATCH");
});

test("the revised signature text does not replace the existing draft", () => {
  const pkg = reviewPackages.find((entry) => entry.id === "eudi-20261120-li");
  assert.equal(pkg.bufferDraftId, undefined);
  assert.deepEqual(pkg.collisions, [earlierSignatureDraft.id]);
  const record = recordApproval({ ...pkg, approval: "approved" }, owner);
  assert.equal(record.status, "approved");
  assert.equal(scheduleApproved(pkg, record).stage, "held");
});

test("the stored ledger matches the package versions", () => {
  const ledger = JSON.parse(readFileSync(new URL("./approvals.json", import.meta.url), "utf8"));
  assert.equal(ledger.status, "pending_owner");
  for (const item of ledger.items) {
    const pkg = reviewPackages.find((entry) => entry.id === item.id);
    assert.equal(item.approval.version, contentVersion(pkg));
    assert.equal(item.approval.status, "pending_owner");
  }
});

test("the review slate stays unscheduled and a batch can be split", () => {
  const plan = planDesk(reviewPackages.map((pkg) => ({
    id: pkg.id,
    package: pkg,
    approval: pendingApproval(pkg)
  })));
  assert.equal(plan.length, 16);
  assert.equal(plan.find((item) => item.id === "eudi-20261120-li").stage, "held");
  assert.ok(plan.filter((item) => item.id !== "eudi-20261120-li").every((item) => item.error === "NOT_APPROVED"));
  const batch = buildApprovalBatch(reviewPackages, {
    id: "batch-2026-11-11",
    createdAt: "2026-11-11T11:55:00+01:00"
  });
  assert.equal(applyBatchDecision(batch, reviewPackages, {}).error, "SILENCE");
  assert.equal(applyBatchDecision(batch, reviewPackages, { approved: true }).records.length, 0);
  const two = applyBatchDecision(batch, reviewPackages, { ...owner, ids: ["gdpr-20261204-li", "nda-20261208-fb"] });
  assert.equal(two.records.length, 2);
  assert.equal(two.records[0].approval.approver, "Inna Kragh");
  assert.ok(two.skipped.some((item) => item.id === "cisg-20261214-li" && item.status === "pending_owner"));
  const changed = reviewPackages.map((pkg) => pkg.id === "gdpr-20261204-li" ? { ...pkg, text: pkg.text + " Edited." } : pkg);
  const stale = applyBatchDecision(batch, changed, { ...owner, ids: ["gdpr-20261204-li"] });
  assert.equal(stale.records.length, 0);
  assert.equal(stale.skipped.find((item) => item.id === "gdpr-20261204-li").error, "VERSION_MISMATCH");
  const whole = applyBatchDecision(batch, reviewPackages, { ...owner, scope: "all" });
  assert.equal(whole.records.length, 16);
  assert.ok(whole.records.every((item) => item.approval.status === "approved" && item.approval.approvedAt === owner.approvedAt));
});

test("publication verification and analytics count a post once", () => {
  const pkg = reviewPackages[0];
  const sent = { id: "post-1", status: "sent", channelId: pkg.channelId, text: pkg.text, assets: [] };
  const first = verifyPublication(sent, pkg);
  const second = verifyPublication(sent, pkg, first.seen);
  assert.equal(first.counted, true);
  assert.equal(second.reason, "duplicate");
  assert.equal(verifyPublication({ ...sent, status: "draft" }, pkg).reason, "not_sent");
  const totals = collectMetrics([
    { id: "a", reactions: 2, impressions: 10 },
    { id: "a", reactions: 2, impressions: 10 },
    { id: "b", reactions: 3, impressions: 5 }
  ]);
  assert.deepEqual(totals, { posts: 2, reactions: 5, comments: 0, impressions: 15 });
});
