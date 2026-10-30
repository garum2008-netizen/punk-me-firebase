import { normalizeAsciiProfanity, normalizeForModeration } from "./filter.js";

const BLOCKED_NAME_STEMS = [
  "moderator",
  "moderator",
  "admin",
  "administrator",
  "system",
  "support",
  "staff",
  "owner",
  "angelina",
  "ангелина",
  "inna",
  "инна",
  "модератор",
  "админ",
  "система",
  "служба",
  "dev",
  "developer"
];

export function isImpersonationName(displayName) {
  const variants = [
    normalizeForModeration(String(displayName || "")),
    normalizeAsciiProfanity(String(displayName || ""))
  ];
  for (const n of variants) {
    if (!n) return true;
    const compact = n.replace(/\s/g, "");
    for (const stem of BLOCKED_NAME_STEMS) {
      const s = stem.replace(/\s/g, "");
      if (compact.includes(s) || n.includes(stem)) return true;
    }
  }
  return false;
}
