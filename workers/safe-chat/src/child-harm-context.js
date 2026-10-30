import { collapseSpacedLetters, normalizeAsciiProfanity, stripInvisible } from "./filter.js";

export function normalizeHarm(raw) {
  let s = stripInvisible(String(raw || ""));
  s = collapseSpacedLetters(s);
  s = normalizeAsciiProfanity(s);
  return s.replace(/\s+/g, " ").trim();
}

/** Keeps word boundaries for multi-word context patterns (RU/UK/EN/DA). */
export function normalizeContextText(raw) {
  let s = stripInvisible(String(raw || "")).toLowerCase();
  s = s.replace(/[^\p{L}\p{N}\s']/gu, " ");
  return s.replace(/\s+/g, " ").trim();
}
