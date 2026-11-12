#!/usr/bin/env node
/** t203u: required RU/EN/DA keys for onboarding + Angelina + crypt beat. */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const src = fs.readFileSync(path.join(ROOT, "js/i18n.js"), "utf8");
const langs = ["ru", "en", "da"];
const keys = [
  "onboard_move_title",
  "onboard_city_build_title",
  "onboard_city_build_text",
  "angelina_guide_welcome",
  "angelina_guide_city_build",
  "angelina_guide_lifech1_outfit",
  "story_crypt_placed",
];

function blockForLang(lang) {
  const re = new RegExp(`\\b${lang}:\\s*\\{`, "m");
  const m = src.match(re);
  if (!m) return "";
  const start = m.index;
  let depth = 0;
  let i = start;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) {
        return src.slice(start, i + 1);
      }
    }
  }
  return "";
}

let ok = true;
for (const lang of langs) {
  const block = blockForLang(lang);
  for (const key of keys) {
    const hit = new RegExp(`${key}:\\s*"`).test(block);
    if (!hit) {
      console.error(`MISSING ${lang}.${key}`);
      ok = false;
    }
  }
}
if (!ok) process.exit(1);
console.log("verify-t203-i18n: PASS", keys.length, "keys ×", langs.length, "langs");
