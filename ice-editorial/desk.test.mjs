import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  collectMetrics,
  contentVersion,
  pendingApproval,
  planDesk,
  recordApproval,
  scheduleApproved,
  verifyPublication
} from "./desk.mjs";
import { reviewPackages } from "./review-packages.mjs";

const owner = { approved: true, approver: "Inna Kragh", approvedAt: "2026-11-11T10:40:00+01:00" };

test("silence and a pending record do not schedule the signature draft", () => {
  const pkg = reviewPackages[0];
  assert.equal(pkg.bufferDraftId, "6af442e5f41d6d2bbb6444d1");
  assert.equal(scheduleApproved(pkg, null).error, "SILENCE");
  assert.equal(scheduleApproved(pkg, pendingApproval(pkg)).error, "NOT_APPROVED");
  assert.equal(scheduleApproved(pkg, { status: "approved" }).error, "NOT_APPROVED");
});

test("an exact owner approval schedules that version and nothing else", () => {
  const pkg = { ...reviewPackages[0], approval: "approved" };
  const record = recordApproval(pkg, owner);
  const scheduled = scheduleApproved(pkg, record);
  assert.equal(scheduled.stage, "schedule");
  assert.equal(scheduled.publish, false);
  assert.equal(scheduled.action, "edit");
  assert.equal(scheduled.draftId, "6af442e5f41d6d2bbb6444d1");
  assert.equal(scheduled.request.mode, "customScheduled");
  assert.equal(scheduled.request.dueAt, "2026-11-20T08:00:00+01:00");
  assert.equal(scheduled.request.saveToDraft, false);
  assert.equal(scheduled.request.channelId, "6a9d9227cd8b9c702c197a40");
  assert.equal(scheduled.request.assets, undefined);
  const edited = scheduleApproved({ ...pkg, text: pkg.text + "\nChanged." }, record);
  assert.equal(edited.error, "VERSION_MISMATCH");
  const moved = scheduleApproved(pkg, { ...record, intendedDueAt: "2026-11-21T08:00:00+01:00" });
  assert.equal(moved.error, "DATE_MISMATCH");
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

test("the four-week review slate stays unscheduled", () => {
  const plan = planDesk(reviewPackages.map((pkg) => ({
    id: pkg.id,
    package: pkg,
    approval: pendingApproval(pkg)
  })));
  assert.equal(plan.length, 8);
  assert.ok(plan.every((item) => item.error === "NOT_APPROVED" && item.publish === false));
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
