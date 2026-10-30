import { collapseSpacedLetters, normalizeAsciiProfanity, stripInvisible } from "./filter.js";

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
