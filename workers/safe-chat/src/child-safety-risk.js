import { detectChildHarmSignals } from "./child-harm.js";
import { normalizeContextText } from "./child-harm-context.js";

export const CHILD_SAFETY_SUBCATEGORIES = [
  "immediate_danger",
  "sexual_exploitation",
  "grooming",
  "violence_threat",
  "other_child_safety"
];

export const HIGH_TIER_SUBCATEGORIES = new Set([
  "immediate_danger",
  "sexual_exploitation",
  "grooming",
  "violence_threat"
]);

/** Legacy client category `child_safety` maps to other_child_safety. */
export function normalizeChildSafetySubcategory(category, subcategory) {
  const sub = subcategory ? String(subcategory).slice(0, 48) : "";
  if (CHILD_SAFETY_SUBCATEGORIES.includes(sub)) return sub;
  if (CHILD_SAFETY_SUBCATEGORIES.includes(category)) return category;
  if (category === "child_safety") return "other_child_safety";
  return null;
}

export function isChildSafetyReport(category, subcategory) {
  return normalizeChildSafetySubcategory(category, subcategory) != null;
}

const SUBCATEGORY_BASE = {
  immediate_danger: 38,
  sexual_exploitation: 34,
  grooming: 30,
  violence_threat: 34,
  other_child_safety: 12
};

/**
 * Conversation / grooming context (RU, UK, EN, DA). Draft set — legal review before expand.
 */
export const CONTEXT_SIGNAL_PATTERNS = [
  /\b(send|show|share)\s+(nudes?|pics?|photos?|snaps?)\b/i,
  /\b(don'?t|do not)\s+tell\s+(?:\w+\s+){0,3}(mom|dad|parent|teacher|anyone)\b/i,
  /\b(secret|keep\s+this\s+between\s+us)\b/i,
  /\b(how\s+old\s+are\s+you|what'?s\s+your\s+age|sk[åa]l\s+du\s+er)\b/i,
  /\b(whatsapp|telegram|discord|snap(chat)?|insta(grame)?)\b/i,
  /\b(meet\s+(me\s+)?(alone|in\s+person|irl))\b/i,
  /\b(пиши\s+в\s+(лс|личку|телеграм|дискорд))\b/i,
  /\b(не\s+говори\s+(мам|родител))\b/i,
  /\b(сколько\s+тебе\s+лет|твой\s+возраст)\b/i,
  /\b(надішли\s+фото|не\s+кажи\s+мам)\b/i,
  /\b(скільки\s+тебе\s+років)\b/i,
  /\b(giv\s+(mig|dig)\s+(gaver|gave)|mød\s+mig\s+alene)\b/i,
  /\b(hvor\s+bor\s+du|send\s+billeder)\b/i
];

export function detectConversationContextSignals(text) {
  const n = normalizeContextText(text);
  if (!n) return [];
  const hits = [];
  for (const re of CONTEXT_SIGNAL_PATTERNS) {
    if (re.test(n)) hits.push(re.source.slice(0, 48));
  }
  return hits;
}

export function computeIntrinsicRiskScore({
  subcategory,
  messageText,
  filterHit,
  authorConfirmedViolations = 0
}) {
  const base = SUBCATEGORY_BASE[subcategory] ?? SUBCATEGORY_BASE.other_child_safety;
  let score = base;
  const signals = [];

  if (filterHit) {
    score += 50;
    signals.push("filter_child_harm");
  }

  const context = detectConversationContextSignals(messageText);
  if (context.length) {
    score += Math.min(24, context.length * 12);
    signals.push("conversation_context");
  }

  if (authorConfirmedViolations > 0) {
    score += Math.min(20, authorConfirmedViolations * 10);
    signals.push("author_prior_violation");
  }

  return {
    intrinsicScore: score,
    corroborating: filterHit || context.length > 0 || authorConfirmedViolations > 0,
    contextHits: context,
    signals
  };
}

/** Global hide requires an independent signal (CEO proposal — pending owner OD:11/19). */
export function hasGlobalHideIndependentSignal({
  filterHit,
  authorConfirmedViolations,
  independentReporterCount,
  distinctClusterCount
}) {
  if (filterHit) return true;
  if (authorConfirmedViolations > 0) return true;
  if (independentReporterCount >= 2 && distinctClusterCount >= 2) return true;
  return false;
}

/** Credibility weights content; never blocks report submission. */
export function reporterCredibilityWeight({ fullyTrusted, ageDeclared, banned, muted, autoHideDenied }) {
  if (banned) return 0.12;
  if (muted) return 0.35;
  if (autoHideDenied) return 0.2;
  if (!ageDeclared) return 0.55;
  return fullyTrusted ? 1 : 0.72;
}

/**
 * Count alone must not raise risk — coordination discount only affects reporter boost, not intrinsic.
 */
export function reporterBoostFromIndependence({ credibility, independentReporterCount, coordinated }) {
  if (coordinated) return 0;
  if (independentReporterCount <= 1) return credibility * 4;
  return credibility * Math.min(10, 4 + (independentReporterCount - 1) * 2);
}

export function decideChildSafetyAction({
  subcategory,
  intrinsicScore,
  corroborating,
  credibility,
  reporterBoost,
  configObj,
  filterHit,
  globalHideSignal
}) {
  if (filterHit) {
    return {
      hide: true,
      hideBasis: "filter_signal",
      discretionary: false,
      reporterLocalHide: false,
      effectiveScore: intrinsicScore + reporterBoost,
      intrinsicScore,
      escalationTier: subcategory === "immediate_danger" ? "immediate_danger" : "critical",
      queuePriority: subcategory === "immediate_danger" ? "immediate_danger" : "critical",
      moderatorNotify: subcategory === "immediate_danger",
      slaReviewByMs:
        subcategory === "immediate_danger"
          ? configObj.childSafetyImmediateDangerSlaMs
          : configObj.safetyQueueEscalateMs
    };
  }

  const highThreshold = configObj.childSafetyRiskHideHighTier;
  const otherThreshold = configObj.childSafetyRiskHideOther;
  const immediateThreshold = configObj.childSafetyRiskHideImmediate;
  const effective = intrinsicScore + reporterBoost;

  const highTier = HIGH_TIER_SUBCATEGORIES.has(subcategory);
  const immediate = subcategory === "immediate_danger";

  let hide = false;
  let hideBasis = null;
  let discretionary = false;
  let reporterLocalHide = false;

  const scoreWouldHide = () => {
    if (highTier) {
      return (
        intrinsicScore >= highThreshold ||
        (corroborating && intrinsicScore >= immediateThreshold)
      );
    }
    return intrinsicScore >= otherThreshold || (corroborating && effective >= otherThreshold - 5);
  };

  if (globalHideSignal && scoreWouldHide()) {
    hide = true;
    hideBasis = highTier ? "high_tier_risk" : "other_threshold";
    discretionary = !highTier || intrinsicScore < highThreshold;
  } else if (scoreWouldHide() || immediate || highTier) {
    reporterLocalHide = true;
  }

  let escalationTier = "critical";
  let queuePriority = "critical";
  let moderatorNotify = immediate;
  let slaReviewByMs = configObj.safetyQueueEscalateMs;

  if (immediate) {
    escalationTier = "immediate_danger";
    queuePriority = "immediate_danger";
    moderatorNotify = true;
    slaReviewByMs = configObj.childSafetyImmediateDangerSlaMs;
  }

  return {
    hide,
    hideBasis,
    discretionary,
    reporterLocalHide,
    effectiveScore: effective,
    intrinsicScore,
    escalationTier,
    queuePriority,
    moderatorNotify,
    slaReviewByMs
  };
}

export function messagePassesFilter(text) {
  return detectChildHarmSignals(text);
}
