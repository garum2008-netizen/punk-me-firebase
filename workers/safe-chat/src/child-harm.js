import { REPORT_CATEGORY_CHILD_SAFETY } from "./config.js";
import { collapseSpacedLetters, normalizeAsciiProfanity, stripInvisible } from "./filter.js";
import { rtdbPath, rtdbRequest } from "./rtdb.js";

/** Draft pattern set — lawyer review before expanding. */
const CHILD_HARM_STEMS = [
  "kill the kid",
  "kill your kid",
  "hurt the child",
  "hurt the kid",
  "rape the kid",
  "rape the child",
  "molest",
  "groom the kid",
  "meet the kid alone",
  "send nudes kid",
  "child porn",
  "cp link",
  "underage pic"
];

function normalizeHarm(raw) {
  let s = stripInvisible(String(raw || ""));
  s = collapseSpacedLetters(s);
  s = normalizeAsciiProfanity(s);
  return s.replace(/\s+/g, " ").trim();
}

export function detectChildHarmSignals(text) {
  const n = normalizeHarm(text);
  if (!n) return false;
  const compact = n.replace(/\s+/g, "");
  for (const stem of CHILD_HARM_STEMS) {
    if (n.includes(stem)) return true;
    const stemCompact = stem.replace(/\s+/g, "");
    if (stemCompact && compact.includes(stemCompact)) return true;
  }
  return false;
}

function pathChatMessage(msgId) {
  return rtdbPath("chat", "messages", msgId);
}

/**
 * Immediate public hide + priority moderator queue (any reporter / filter).
 * Trust scores are recorded for erasure/sanctions only — not for hide.
 */
export async function applyImmediateChildHarmResponse({
  config,
  token,
  emu,
  ns,
  msgId,
  now,
  trigger,
  trustedReporterCount = 0,
  childSafetyReportCount = 1
}) {
  await rtdbRequest(config, `${pathChatMessage(msgId)}/hidden`, "PUT", true, token, emu, ns);

  const queuePath = rtdbPath("chat", "internal", "safetyQueue", msgId);
  const prevRes = await rtdbRequest(config, queuePath, "GET", null, token, emu, ns);
  const prev = prevRes.json && typeof prevRes.json === "object" ? prevRes.json : {};

  const legalHoldUntil = now + config.safetyEvidenceMaxHoldMs;
  const queueEntry = {
    ...prev,
    at: prev.at || now,
    hiddenAt: now,
    priority: "critical",
    childHarm: true,
    trigger: trigger === "filter" ? "filter" : "report",
    category: REPORT_CATEGORY_CHILD_SAFETY,
    overdue: false,
    nextEscalateAt: now + config.safetyQueueEscalateMs,
    childSafetyReports: childSafetyReportCount,
    trustedReporterCount,
    legalBasis: config.safetyEvidenceLegalBasis,
    legalHoldUntil,
    access: "moderator_only"
  };

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
      legalBasis: config.safetyEvidenceLegalBasis,
      maxHoldUntil: legalHoldUntil,
      access: "moderator_only",
      snapshot: snap
    },
    token,
    emu,
    ns
  );

  return { hidden: true, queued: true, priority: "critical" };
}
