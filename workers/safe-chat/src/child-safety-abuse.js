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

export async function clusterHashFromRequest(request, env) {
  const salt = env.SAFE_CHAT_CLUSTER_SALT || env.SAFE_CHAT_HASH_SALT || "";
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "";
  if (!ip) return null;
  return ipv4ClusterHash(ip, salt);
}

export async function loadReporterHideDenied(config, token, emu, ns, uid) {
  const snap = await rtdbRequest(config, rtdbPath("chatMeta", uid, "childSafetyHideDeniedUntil"), "GET", null, token, emu, ns);
  const until = typeof snap.json === "number" ? snap.json : 0;
  return until;
}

export async function penalizeFalseChildSafetyReport(config, token, emu, ns, reporterUid, now, configObj) {
  const denyUntil = now + configObj.childSafetyHideDeniedMs;
  await rtdbRequest(
    config,
    rtdbPath("chatMeta", reporterUid, "childSafetyHideDeniedUntil"),
    "PUT",
    denyUntil,
    token,
    emu,
    ns
  );
  const strikesRes = await rtdbRequest(
    config,
    rtdbPath("chatMeta", reporterUid, "childSafetyFalseStrikes"),
    "GET",
    null,
    token,
    emu,
    ns
  );
  const strikes = (typeof strikesRes.json === "number" ? strikesRes.json : 0) + 1;
  await rtdbRequest(
    config,
    rtdbPath("chatMeta", reporterUid, "childSafetyFalseStrikes"),
    "PUT",
    strikes,
    token,
    emu,
    ns
  );
  if (strikes >= configObj.childSafetyFalseReportAutoMuteThreshold) {
    await rtdbRequest(
      config,
      rtdbPath("chat", "modState", reporterUid, "mute"),
      "PUT",
      { until: now + 365 * 24 * 60 * 60 * 1000, reason: "child_safety_false_reports", pendingModReview: true },
      token,
      emu,
      ns
    );
  }
  return { denyUntil, strikes };
}

async function recordAuthorLowTrustHide(config, token, emu, ns, authorSid, reporterHash, now, configObj) {
  if (!authorSid || !reporterHash) return { possibleBrigading: false };
  const path = rtdbPath("chat", "internal", "authorHideSignals", authorSid);
  const cur = await rtdbRequest(config, path, "GET", null, token, emu, ns);
  const prev = cur.json && typeof cur.json === "object" ? cur.json : { events: [] };
  const windowMs = configObj.childSafetyBrigadingWindowMs;
  const events = (Array.isArray(prev.events) ? prev.events : []).filter(e => now - (e.at || 0) <= windowMs);
  events.push({ at: now, reporterHash, lowTrust: true });
  const distinct = new Set(events.map(e => e.reporterHash)).size;
  await rtdbRequest(config, path, "PUT", { events }, token, emu, ns);
  return { possibleBrigading: distinct > configObj.childSafetyBrigadingLowTrustDistinct };
}

export async function enqueueChildSafetyReview({
  config,
  token,
  emu,
  ns,
  msgId,
  now,
  configObj,
  trigger,
  hideMessage,
  trustedReporterCount,
  childSafetyReportCount,
  extraQueueFields = {}
}) {
  const queuePath = rtdbPath("chat", "internal", "safetyQueue", msgId);
  const prevRes = await rtdbRequest(config, queuePath, "GET", null, token, emu, ns);
  const prev = prevRes.json && typeof prevRes.json === "object" ? prevRes.json : {};

  const legalHoldUntil = now + configObj.safetyEvidenceMaxHoldMs;
  const queueEntry = {
    ...prev,
    ...extraQueueFields,
    at: prev.at || now,
    hiddenAt: hideMessage || prev.hiddenAt ? prev.hiddenAt || now : prev.hiddenAt || null,
    priority: "critical",
    childHarm: true,
    trigger: trigger === "filter" ? "filter" : "report",
    category: REPORT_CATEGORY_CHILD_SAFETY,
    overdue: false,
    nextEscalateAt: now + configObj.safetyQueueEscalateMs,
    childSafetyReports: childSafetyReportCount,
    trustedReporterCount,
    legalBasis: configObj.safetyEvidenceLegalBasis,
    legalHoldUntil,
    access: "moderator_only",
    slaReviewBy: now + configObj.safetyQueueEscalateMs
  };

  if (hideMessage) {
    await rtdbRequest(config, `${pathChatMessage(msgId)}/hidden`, "PUT", true, token, emu, ns);
    queueEntry.hiddenAt = queueEntry.hiddenAt || now;
  }

  await rtdbRequest(config, queuePath, "PUT", queueEntry, token, emu, ns);

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
      legalBasis: configObj.safetyEvidenceLegalBasis,
      maxHoldUntil: legalHoldUntil,
      access: "moderator_only",
      snapshot: snap
    },
    token,
    emu,
    ns
  );

  return { hidden: hideMessage, queued: true, priority: "critical", queueEntry };
}

/**
 * Evaluate whether this reporter may hide on a child_safety report (queue always allowed separately).
 */
export async function evaluateChildSafetyReportHide({
  config,
  env,
  token,
  emu,
  ns,
  authUid,
  profile,
  now,
  configObj,
  limitsStub,
  clusterHash,
  authorSid,
  reporterHash
}) {
  const trust = reporterTrustForChildSafety(profile, now, configObj);
  const deniedUntil = await loadReporterHideDenied(config, token, emu, ns, authUid);
  if (deniedUntil && now < deniedUntil) {
    return { hideMessage: false, reason: "hide_denied_reputation", trust, trustedReporterCount: 0 };
  }

  const quota = trust.fullyTrusted
    ? configObj.childSafetyHideQuotaTrusted
    : configObj.childSafetyHideQuotaLow;

  const hideCheck = await limitsStub(env, "/child-safety-hide-check", {
    uid: authUid,
    now,
    quota,
    bump: false
  });
  if (!hideCheck.ok) {
    return { hideMessage: false, reason: hideCheck.reason || "hide_quota", trust, trustedReporterCount: 0 };
  }

  if (clusterHash) {
    const clusterCheck = await limitsStub(env, "/cluster-hide-check", {
      clusterHash,
      now,
      cap: configObj.childSafetyClusterHideCap,
      bump: false
    });
    if (!clusterCheck.ok) {
      return { hideMessage: false, reason: "cluster_hide_cap", trust, trustedReporterCount: 0 };
    }
  }

  const bumpHide = await limitsStub(env, "/child-safety-hide-check", {
    uid: authUid,
    now,
    quota,
    bump: true
  });
  if (!bumpHide.ok) {
    return { hideMessage: false, reason: bumpHide.reason || "hide_quota", trust, trustedReporterCount: 0 };
  }

  if (clusterHash) {
    const bumpCluster = await limitsStub(env, "/cluster-hide-check", {
      clusterHash,
      now,
      cap: configObj.childSafetyClusterHideCap,
      bump: true
    });
    if (!bumpCluster.ok) {
      return { hideMessage: false, reason: "cluster_hide_cap", trust, trustedReporterCount: 0 };
    }
  }

  let brigading = { possibleBrigading: false };
  if (!trust.fullyTrusted && authorSid) {
    brigading = await recordAuthorLowTrustHide(config, token, emu, ns, authorSid, reporterHash, now, configObj);
  }

  const trustedReporterCount = trust.fullyTrusted ? 1 : 0;
  return {
    hideMessage: true,
    reason: null,
    trust,
    trustedReporterCount,
    possibleBrigading: brigading.possibleBrigading
  };
}
