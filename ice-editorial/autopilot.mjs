const BLOCKED_KINDS = new Set(["schedule", "publish"]);

function list(queue) {
  return (queue && queue.tasks) || [];
}

function byPriority(tasks) {
  return [...tasks].sort((a, b) => a.priority - b.priority || String(a.id).localeCompare(String(b.id)));
}

function dependencyOpen(task, tasks) {
  const index = new Map(tasks.map((item) => [item.id, item]));
  return (task.dependsOn || []).some((id) => {
    const dependency = index.get(id);
    return !dependency || dependency.status !== "done";
  });
}

export function selectNext(queue) {
  for (const task of byPriority(list(queue))) {
    if (task.status === "done" || task.status === "pending_owner" || task.status === "blocked") continue;
    if (BLOCKED_KINDS.has(task.kind)) continue;
    if (dependencyOpen(task, list(queue))) continue;
    const attempts = task.attempts || 0;
    const limit = task.maxAttempts || 3;
    if (task.status === "failed" && attempts >= limit) continue;
    if (task.status === "ready" || task.status === "failed") return task;
  }
  return null;
}

export function resume(queue) {
  const next = selectNext(queue);
  const pendingOwner = list(queue).filter((task) => task.status === "pending_owner").map((task) => task.id);
  return {
    next,
    pendingOwner,
    continue: Boolean(next),
    reason: next ? "authorized_work_remains" : "no_authorized_independent_work"
  };
}

function replace(queue, id, patch) {
  return {
    ...queue,
    tasks: list(queue).map((task) => (task.id === id ? { ...task, ...patch } : task))
  };
}

export function completeTask(queue, id, evidence) {
  const task = list(queue).find((item) => item.id === id);
  if (!task) return { ok: false, error: "MISSING_TASK", queue };
  if (BLOCKED_KINDS.has(task.kind) || task.status === "pending_owner") {
    return { ok: false, error: "NOT_AUTHORIZED", queue };
  }
  return {
    ok: true,
    queue: replace(queue, id, { status: "done", evidence: evidence || {}, finishedAt: evidence && evidence.finishedAt })
  };
}

export function failTask(queue, id, error) {
  const task = list(queue).find((item) => item.id === id);
  if (!task) return { ok: false, error: "MISSING_TASK", queue };
  const attempts = (task.attempts || 0) + 1;
  const limit = task.maxAttempts || 3;
  const exhausted = attempts >= limit;
  return {
    ok: true,
    exhausted,
    queue: replace(queue, id, {
      attempts,
      status: exhausted ? "blocked" : "failed",
      lastError: String(error || "failed"),
      escalate: exhausted
    })
  };
}

export function releaseSchedule(task, approval) {
  if (!task || !BLOCKED_KINDS.has(task.kind)) return { ok: false, error: "NOT_A_PUBLISH_TASK", publish: false };
  if (!approval || approval.approved !== true || !approval.approver || !approval.approvedAt) {
    return { ok: false, error: "SILENCE", publish: false };
  }
  if (approval.id !== task.targetId || approval.hash !== task.hash) {
    return { ok: false, error: "VERSION_MISMATCH", publish: false };
  }
  return { ok: true, error: null, publish: false, schedule: true };
}

export function compareDraft(live, expectedText) {
  if (!live) return { status: "missing", edit: false, schedule: false };
  if (live.sharedNow === true || live.status === "sent") {
    return { status: "already_sent", edit: false, schedule: false };
  }
  const same = String(live.text || "") === String(expectedText || "");
  return {
    status: same ? "in_sync" : "drift",
    liveStatus: live.status || null,
    dueAt: live.dueAt || null,
    edit: false,
    schedule: false
  };
}

export function classifyMedia(response) {
  const status = response && response.status;
  const type = String((response && response.contentType) || "");
  if (status === 200 && /^image\/(jpeg|png|webp)/.test(type)) return { ok: true, status: "reachable" };
  return { ok: false, status: status || "unreachable" };
}
