import { CONTACT_PATTERNS, EMAIL_PATTERN, PHONE_PATTERN, PROFANITY_STEMS, URL_PATTERN } from "./wordlist.js";

const HOMOGLYPHS = {
  a: "а",
  e: "е",
  o: "о",
  p: "р",
  c: "с",
  y: "у",
  x: "х",
  k: "к",
  m: "м",
  t: "т",
  h: "н",
  b: "в",
  n: "п",
  i: "і",
  "@": "а",
  "$": "s",
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b"
};

const LEET = {
  "@": "a",
  "$": "s",
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b"
};

export function collapseSpacedLetters(s) {
  let prev = "";
  let out = "";
  for (const ch of s) {
    if (ch === " " || ch === "." || ch === "-" || ch === "_") {
      if (prev && /[a-zа-яіїєґ0-9]/i.test(prev)) continue;
      out += ch;
      prev = ch;
      continue;
    }
    out += ch;
    prev = ch;
  }
  let prevLen = 0;
  while (out.length !== prevLen) {
    prevLen = out.length;
    out = out.replace(/([a-zа-яіїєґ0-9])\s+(?=[a-zа-яіїєґ0-9])/gi, "$1");
  }
  return out;
}

export function normalizeAsciiProfanity(raw) {
  let s = String(raw || "").toLowerCase();
  s = s.normalize("NFKC");
  for (const [leet, plain] of Object.entries(LEET)) {
    s = s.replaceAll(leet, plain);
  }
  s = collapseSpacedLetters(s);
  s = s.replace(/[^\p{L}\p{N}\s]/gu, "");
  return s.replace(/\s+/g, " ").trim();
}

export function normalizeForModeration(raw) {
  let s = String(raw || "").toLowerCase();
  s = s.normalize("NFKC");
  for (const [lat, cyr] of Object.entries(HOMOGLYPHS)) {
    s = s.replaceAll(lat, cyr);
  }
  for (const [leet, plain] of Object.entries(LEET)) {
    s = s.replaceAll(leet, plain);
  }
  s = collapseSpacedLetters(s);
  s = s.replace(/[^\p{L}\p{N}\s]/gu, "");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

export function containsProfanity(normalized) {
  const compact = normalized.replace(/\s/g, "");
  for (const stem of PROFANITY_STEMS) {
    const n = stem.replace(/\s/g, "");
    if (n.length < 3) continue;
    if (compact.includes(n) || normalized.includes(n)) return true;
  }
  return false;
}

export function filterMessage(text, maxLen = 200) {
  const raw = String(text || "").trim();
  if (!raw) return { ok: false, reason: "empty" };
  if (raw.length > maxLen) return { ok: false, reason: "too_long" };

  const normalized = normalizeForModeration(raw);
  const asciiNorm = normalizeAsciiProfanity(raw);
  if (containsProfanity(normalized) || containsProfanity(asciiNorm)) {
    return { ok: false, reason: "profanity" };
  }

  if (URL_PATTERN.test(raw) || URL_PATTERN.test(normalized.replace(/\s/g, ""))) {
    return { ok: false, reason: "link" };
  }
  if (EMAIL_PATTERN.test(raw)) return { ok: false, reason: "email" };
  if (PHONE_PATTERN.test(raw.replace(/\s/g, ""))) return { ok: false, reason: "phone" };

  for (const re of CONTACT_PATTERNS) {
    if (re.test(raw) || re.test(normalized)) return { ok: false, reason: "contact" };
  }

  return { ok: true, text: raw };
}
