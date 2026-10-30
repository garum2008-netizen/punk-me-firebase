/**
 * Open moderation patterns (RU/UK/EN/DA). Not exhaustive — server-side layer only.
 * Extend via repo review; no external paid APIs.
 */

/** Whole-word / substring profanity stems (lowercase, normalized). */
export const PROFANITY_STEMS = [
  // EN
  "fuck", "fuk", "shit", "bitch", "bastard", "asshole", "cunt", "dick", "whore", "slut", "nigger", "faggot",
  // RU (latin translit + cyrillic stems)
  "бля", "бляд", "хуй", "хуе", "пизд", "ебан", "ебат", "ёб", "ебл", "сука", "мудак", "мудил", "гандон", "пидор", "пидр",
  // UK (overlap + specific)
  "пізд", "їбат", "блять",
  // DA
  "fuck", "lort", "kælling", "idiot"
];

/** Contact / off-platform solicitation */
export const CONTACT_PATTERNS = [
  /\btelegram\b/i,
  /телеграм/i,
  /\bt\.me\b/i,
  /\bwhatsapp\b/i,
  /\bwa\.me\b/i,
  /\bsnapchat\b/i,
  /\bdiscord\b/i,
  /\bdiscord\.gg\b/i,
  /\binsta(gram)?\b/i,
  /\btiktok\b/i,
  /\bvk\.com\b/i,
  /\bпиши\s+в\s+личк/i,
  /\bнапиши\s+в\s+лс/i,
  /напиши\s+в\s+лс/i,
  /\bв\s+лс\b/i,
  /\bнапиши\s+мені/i,
  /\bwrite\s+me\s+(on|in)\s+dm/i,
  /\badd\s+me\s+on\b/i,
  /\bskriv\s+til\s+mig\s+privat/i
];

export const URL_PATTERN =
  /(?:https?:\/\/|www\.|[a-z0-9][-a-z0-9]*\.(com|net|org|ru|ua|dk|io|gg|me|xyz|app|dev|link|top|site|online|shop|store|club|info|biz|co)\b)/i;

export const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;

export const PHONE_PATTERN =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4}/;

/** Obfuscated email (at/dot tokens, spaced) */
export const EMAIL_OBFUSCATED_PATTERN =
  /\b[a-z0-9._%+-]+\s*(?:\[at\]|@|\(at\)|\bat\b)\s*[a-z0-9._%-]+\s*(?:\[dot\]|\.|\(dot\)|\bdot\b)\s*[a-z]{2,}\b/i;

/** Social handles (@user) */
export const SOCIAL_HANDLE_PATTERN = /(?:^|\s)@[a-z0-9_]{2,32}\b/i;

/** PII / grooming solicitation (not exhaustive) */
export const PII_PATTERNS = [
  /(?:мне|мені)\s+\d{1,2}\s*(?:год|лет|років)/i,
  /\b(?:mi|jeg|i'?m|je\s+bent)\s+\d{1,2}\s*(?:year|år|old|yo)\b/i,
  /\b(?:школ|school|skole|klasse|classroom)\b/i,
  /\b(?:гroom|grooming|сына|дочь|daughter|son|child|ребён|minor|несоверш|under\s*18)\b/i,
  /\b(?:send\s+nudes?|сиськ|гол(?:ая|ий)|nøgen|nude)\b/i
];
