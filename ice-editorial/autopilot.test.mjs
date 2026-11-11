import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  classifyMedia,
  compareDraft,
  completeTask,
  failTask,
  releaseSchedule,
  resume,
  selectNext
} from "./autopilot.mjs";

function queue() {
  return {
    tasks: [
      { id: "owner-batch", priority: 1, status: "pending_owner", kind: "owner_decision" },
      { id: "schedule-batch", priority: 2, status: "blocked", kind: "schedule", targetId: "gdpr-20261204-li", hash: "abc", dependsOn: ["owner-batch"] },
      { id: "audit-media", priority: 10, status: "ready", kind: "audit", maxAttempts: 3 },
      { id: "sync-draft", priority: 11, status: "ready", kind: "sync", dependsOn: ["audit-media"] }
    ]
  };
}

test("owner decisions stay queued while the next audit starts", () => {
  const first = resume(queue());
  assert.equal(first.next.id, "audit-media");
  assert.deepEqual(first.pendingOwner, ["owner-batch"]);
  const done = completeTask(queue(), "audit-media", { finishedAt: "2026-11-11T12:20:00+01:00" });
  assert.equal(selectNext(done.queue).id, "sync-draft");
  assert.equal(selectNext(done.queue).kind === "schedule", false);
});

test("a schedule is not released by silence or a different hash", () => {
  const task = queue().tasks[1];
  assert.equal(releaseSchedule(task, null).error, "SILENCE");
  assert.equal(releaseSchedule(task, { approved: true, approver: "Inna Kragh", approvedAt: "2026-11-11T12:20:00+01:00", id: task.targetId, hash: "other" }).error, "VERSION_MISMATCH");
  assert.equal(releaseSchedule(task, { approved: true, approver: "Inna Kragh", approvedAt: "2026-11-11T12:20:00+01:00", id: task.targetId, hash: task.hash }).schedule, true);
  assert.equal(releaseSchedule(task, { approved: true, approver: "Inna Kragh", approvedAt: "2026-11-11T12:20:00+01:00", id: task.targetId, hash: task.hash }).publish, false);
});

test("retries stop at the attempt limit", () => {
  let state = queue();
  state = failTask(state, "audit-media", "timeout").queue;
  state = failTask(state, "audit-media", "timeout").queue;
  const last = failTask(state, "audit-media", "timeout");
  assert.equal(last.exhausted, true);
  assert.equal(last.queue.tasks.find((task) => task.id === "audit-media").status, "blocked");
  assert.equal(selectNext(last.queue), null);
});

test("draft comparison never asks for an edit", () => {
  assert.equal(compareDraft(null, "text").status, "missing");
  assert.equal(compareDraft({ status: "draft", text: "same", dueAt: null }, "same").status, "in_sync");
  assert.equal(compareDraft({ status: "draft", text: "old" }, "new").edit, false);
  assert.equal(compareDraft({ status: "sent", sharedNow: false, text: "old" }, "old").status, "already_sent");
  assert.deepEqual(classifyMedia({ status: 200, contentType: "image/jpeg" }), { ok: true, status: "reachable" });
  assert.equal(classifyMedia({ status: 403, contentType: "text/plain" }).ok, false);
});

test("a local draft is not added to the 16-version batch", () => {
  const batch = JSON.parse(readFileSync(new URL("./approval-batch.json", import.meta.url), "utf8"));
  const local = JSON.parse(readFileSync(new URL("./local-drafts.json", import.meta.url), "utf8"));
  assert.equal(batch.status, "pending_owner");
  assert.equal(batch.items.length, 16);
  for (const item of local.items) {
    assert.equal(batch.items.some((entry) => entry.id === item.id), false);
    assert.equal(item.intendedDueAt, null);
  }
});

test("the stored queue does not make a publication runnable", () => {
  const stored = JSON.parse(readFileSync(new URL("./queue.json", import.meta.url), "utf8"));
  const next = selectNext(stored);
  assert.equal(next == null || (next.kind !== "schedule" && next.kind !== "publish"), true);
  assert.ok(stored.tasks.some((task) => task.id === "owner-batch-2026-11-11" && task.status === "pending_owner"));
  assert.ok(stored.tasks.filter((task) => task.kind === "schedule" || task.kind === "publish").every((task) => task.status !== "ready"));
});
