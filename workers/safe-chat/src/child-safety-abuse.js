import { REPORT_CATEGORY_CHILD_SAFETY } from "./config.js";
import { rtdbPath, rtdbRequest } from "./rtdb.js";
import { reporterTrustForChildSafety } from "./player-profile.js";

function pathChatMessage(msgId) {
  return rtdbPath("chat", "messages", msgId);
}

async function hmacHex(input, salt) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(salt || "cluster"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(input));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

export async function ipv4ClusterHash(ip, salt) {
  const trimmed = String(ip || "").trim();
  const m = trimmed.match(/^(\d+)\.(\d+)\.(\d+)\.\d+$/);
  if (!m) return null;
  const prefix = `${m[1]}.${m[2]}.${m[3]}.0/24`;
  return hmacHex(prefix, salt);
}

/** Pseudonymous cluster id for IPv6 /64 (draft — legal review). */
export async function ipv6ClusterHash(ip, salt) {
  const raw = String(ip || "")
    .trim()
    .toLowerCase()
    .split("%")[0];
  if (!raw.includes(":")) return null;
  let expanded = raw;
  if (raw.includes("::")) {
    const [head, tail] = raw.split("::");
    const h = head ? head.split(":").filter(Boolean) : [];
    const t = tail ? tail.split(":").filter(Boolean) : [];
    const missing = 8 - h.length - t.length;
    const mid = missing > 0 ? Array(missing).fill("0") : [];
    expanded = [...h, ...mid, ...t].join(":");
  }
  const groups = expanded.split(":").filter(Boolean);
  while (groups.length < 8) groups.push("0");
  const prefix = `${groups.slice(0, 4).join(":")}::/64`;
  return hmacHex(prefix, salt);
}

export async function clusterHashFromRequest(request, env) {
  const salt = env.SAFE_CHAT_CLUSTER_SALT || env.SAFE_CHAT_HASH_SALT || "";
  const cf = request.headers.get("CF-Connecting-IP")?.trim();
  const ip = cf || request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || "";
  if (!ip) return null;
  if (ip.includes(":")) return ipv6ClusterHash(ip, salt);
  return ipv4ClusterHash(ip, salt);
}

export async function loadReporterAutoHideDenied(config, token, emu, ns, uid, reporterHash) {
  if (reporterHash) {
    const byHash = await rtdbRequest(
      config,
      rtdbPath("chat", "internal", "reporterAutoHideDenied", reporterHash),
      "GET",
      null,
      token,
      emu,
      ns
    );
    if (typeof byHash.json === "number") return byHash.json;
  }
  const snap = await rtdbRequest(
    config,
    rtdbPath("chatMeta", uid, "childSafetyAutoHideDeniedUntil"),
    "GET",
    null,
    token,
    emu,
    ns
  );
  const legacy = await rtdbRequest(
    config,
    rtdbPath("chatMeta", uid, "childSafetyHideDeniedUntil"),
    "GET",
    null,
    token,
    emu,
    ns
  );
  const until =
    (typeof snap.json === "number" ? snap.json : 0) ||
    (typeof legacy.json === "number" ? legacy.json : 0);
  return until;
}

/** After mod false-report review: reduces auto-hide weight only; reporting always allowed. */
export async function penalizeFalseChildSafetyReport(config, token, emu, ns, reporterHash, now, configObj) {
  const denyUntil = now + configObj.childSafetyHideDeniedMs;
  if (reporterHash) {
    await rtdbRequest(
      config,
      rtdbPath("chat", "internal", "reporterAutoHideDenied", reporterHash),
      "PUT",
      denyUntil,
      token,
      emu,
      ns
    );
  }
  return { denyUntil, strikes: 1 };
}

export async function loadAuthorSafetyMeta(config, token, emu, ns, authorSid) {
  if (!authorSid) return { confirmedViolations: 0, newAccount: false };
  const path = rtdbPath("chat", "internal", "authorSafety", authorSid);
  const cur = await rtdbRequest(config, path, "GET", null, token, emu, ns);
  const o = cur.json && typeof cur.json === "object" ? cur.json : {};
  return {
    confirmedViolations: typeof o.confirmedViolations === "number" ? o.confirmedViolations : 0,
    newAccount: Boolean(o.newAccount)
  };
}

/**
 * Merge mass identical subcategory reports into one case signal (no extra intrinsic risk from count).
 */
export async function recordMergedSafetyReport({
  config,
  token,
  emu,
  ns,
  msgId,
  subcategory,
  reporterHash,
  clusterHash,
  reporterRegisteredAt,
  now,
  configObj
}) {
  const path = rtdbPath("chat", "internal", "safetyCase", msgId);
  const cur = await rtdbRequest(config, path, "GET", null, token, emu, ns);
  const prev = cur.json && typeof cur.json === "object" ? cur.json : { reports: [] };
  const windowMs = configObj.childSafetyMergeWindowMs;
  const coordMs = configObj.childSafetyCoordinationWindowMs;
  const reports = (Array.isArray(prev.reports) ? prev.reports : []).filter(r => now - (r.at || 0) <= windowMs);
  reports.push({
    at: now,
    subcategory,
    reporterHash,
    clusterHash: clusterHash || null,
    reporterRegisteredAt: reporterRegisteredAt || null
  });

  const sameSubRecent = reports.filter(r => r.subcategory === subcategory);
  const mergedDuplicate =
    sameSubRecent.length > 1 &&
    sameSubRecent.some(
      (r, i) =>
        i < sameSubRecent.length - 1 &&
        Math.abs(r.at - now) <= coordMs &&
        (r.clusterHash === clusterHash || Math.abs((r.reporterRegisteredAt || 0) - (reporterRegisteredAt || 0)) < 3600000)
    );

  const clusters = new Set(reports.map(r => r.clusterHash).filter(Boolean));
  const coordinated =
    sameSubRecent.length >= 3 &&
    clusters.size <= 1 &&
    sameSubRecent.every(r => now - r.at <= coordMs);

  const independentHashes = new Set(reports.map(r => r.reporterHash));
  await rtdbRequest(
    config,
    path,
    "PUT",
    { reports, lastSubcategory: subcategory, updatedAt: now },
    token,
    emu,
    ns
  );

  return {
    mergedDuplicate,
    coordinated,
    independentReporterCount: independentHashes.size,
    reportCountInCase: reports.length
  };
}

export async function enqueueChildSafetyReview({
  config,
  token,
  emu,
  ns,
  msgId,
  now,
  configObj,
  env,
  trigger,
  hideMessage,
  childSafetyReportCount,
  extraQueueFields = {},
  subcategory,
  riskSnapshot = {}
}) {
  const queuePath = rtdbPath("chat", "internal", "safetyQueue", msgId);
  const prevRes = await rtdbRequest(config, queuePath, "GET", null, token, emu, ns);
  const prev = prevRes.json && typeof prevRes.json === "object" ? prevRes.json : {};

  const legalHoldUntil = now + configObj.safetyEvidenceMaxHoldMs;
  const priority = extraQueueFields.queuePriority || prev.queuePriority || "critical";
  const slaMs = extraQueueFields.slaReviewByMs ?? configObj.safetyQueueEscalateMs;

  const queueEntry = {
    ...prev,
    ...extraQueueFields,
    at: prev.at || now,
    hiddenAt: hideMessage || prev.hiddenAt ? prev.hiddenAt || now : prev.hiddenAt || null,
    priority,
    queuePriority: priority,
    childHarm: true,
    trigger: trigger === "filter" ? "filter" : "report",
    category: REPORT_CATEGORY_CHILD_SAFETY,
    subcategory: subcategory || prev.subcategory || "other_child_safety",
    overdue: false,
    nextEscalateAt: now + slaMs,
    childSafetyReports: childSafetyReportCount,
    legalBasis: configObj.safetyEvidenceLegalBasis,
    legalHoldUntil,
    access: "moderator_only",
    slaReviewBy: now + slaMs,
    riskScore: riskSnapshot.effectiveScore ?? prev.riskScore ?? null,
    intrinsicRisk: riskSnapshot.intrinsicScore ?? prev.intrinsicRisk ?? null,
    hideBasis: riskSnapshot.hideBasis ?? prev.hideBasis ?? null
  };

  if (hideMessage) {
    await rtdbRequest(config, `${pathChatMessage(msgId)}/hidden`, "PUT", true, token, emu, ns);
    queueEntry.hiddenAt = queueEntry.hiddenAt || now;
  }

  await rtdbRequest(config, queuePath, "PUT", queueEntry, token, emu, ns);

  let alertResult = null;
  if (extraQueueFields.moderatorNotify) {
    const { sendModeratorAlert } = await import("./mod-alert.js");
    alertResult = await sendModeratorAlert(env, {
      msgId,
      subcategory: queueEntry.subcategory,
      priority: queueEntry.priority,
      escalationTier: extraQueueFields.escalationTier || queueEntry.escalationTier,
      trigger: queueEntry.trigger,
      riskIntrinsic: riskSnapshot.intrinsicScore ?? null
    });
    if (alertResult.sent) {
      queueEntry.alertDeliveredAt = now;
      await rtdbRequest(config, queuePath, "PUT", { ...queueEntry, alertDeliveredAt: now }, token, emu, ns);
    }
  }

  const msgRes = await rtdbRequest(config, pathChatMessage(msgId), "GET", null, token, emu, ns);
  const snap = msgRes.json
    ? {
        sid: msgRes.json.sid || null,
        text: msgRes.json.text || "",
        time: msgRes.json.time || null,
        phraseId: msgRes.json.phraseId || null
      }
    : null;

  await rtdbRequest(
    config,
    rtdbPath("chat", "internal", "safetyEvidence", msgId),
    "PUT",
    {
      capturedAt: now,
      trigger: queueEntry.trigger,
      subcategory: queueEntry.subcategory,
      legalBasis: configObj.safetyEvidenceLegalBasis,
      maxHoldUntil: legalHoldUntil,
      access: "moderator_only",
      snapshot: snap,
      riskIntrinsic: riskSnapshot.intrinsicScore ?? null,
      riskEffective: riskSnapshot.effectiveScore ?? null
    },
    token,
    emu,
    ns
  );

  return { hidden: hideMessage, queued: true, priority, queueEntry };
}

/** Discretionary reporter-triggered auto-hide quota (mandatory risk hides skip this). */
export async function checkDiscretionaryHideQuota({
  env,
  configObj,
  limitsStub,
  authUid,
  profile,
  now,
  clusterHash
}) {
  const trust = reporterTrustForChildSafety(profile, now, configObj);
  const quota = trust.fullyTrusted
    ? configObj.childSafetyHideQuotaTrusted
    : configObj.childSafetyHideQuotaLow;

  const hideCheck = await limitsStub(env, "/child-safety-hide-check", {
    uid: authUid,
    now,
    quota,
    bump: false
  });
  if (!hideCheck.ok) return { ok: false, reason: hideCheck.reason || "hide_quota" };

  if (clusterHash) {
    const clusterCheck = await limitsStub(env, "/cluster-hide-check", {
      clusterHash,
      now,
      cap: configObj.childSafetyClusterHideCap,
      bump: false
    });
    if (!clusterCheck.ok) return { ok: false, reason: "cluster_hide_cap" };
  }

  const bumpHide = await limitsStub(env, "/child-safety-hide-check", {
    uid: authUid,
    now,
    quota,
    bump: true
  });
  if (!bumpHide.ok) return { ok: false, reason: bumpHide.reason || "hide_quota" };

  if (clusterHash) {
    const bumpCluster = await limitsStub(env, "/cluster-hide-check", {
      clusterHash,
      now,
      cap: configObj.childSafetyClusterHideCap,
      bump: true
    });
    if (!bumpCluster.ok) return { ok: false, reason: "cluster_hide_cap" };
  }

  return { ok: true };
}

export const CHILD_SAFETY_REPORT_RECEIVED = {
  ok: true,
  received: true,
  messageKey: "thanks_received"
};
