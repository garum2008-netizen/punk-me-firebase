/**
 * Parent / adult gate for optional real-money cosmetics (preview).
 * Collects no personal data — local age attestation + parent challenge only.
 */

export function createParentChallenge(seed = Date.now()) {
  const a = 7 + (Math.abs(seed) % 8);
  const b = 3 + (Math.floor(Math.abs(seed) / 7) % 9);
  return {
    a,
    b,
    prompt: { ru: `Взрослый рядом? Сколько ${a} + ${b}?`, en: `Adult nearby? What is ${a} + ${b}?` },
    answer: String(a + b)
  };
}

/**
 * @param {{ ageConfirmed: boolean, adultConfirmed: boolean, userAnswer: string, challenge: { answer: string } | null }} input
 */
export function verifyParentGate(input) {
  if (!input?.ageConfirmed) {
    return { ok: false, reason: "age_required" };
  }
  if (!input?.adultConfirmed) {
    return { ok: false, reason: "adult_required" };
  }
  const expected = input.challenge?.answer;
  if (!expected) {
    return { ok: false, reason: "challenge_missing" };
  }
  const given = String(input.userAnswer ?? "").trim();
  if (given !== expected) {
    return { ok: false, reason: "challenge_wrong" };
  }
  return { ok: true };
}

/** Session token stored in sessionStorage — not sent to server. */
export function mintParentGateSession() {
  const token = "pg_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  try {
    sessionStorage.setItem("punk_preview_parent_gate", token);
  } catch (_) {}
  return token;
}

export function hasParentGateSession() {
  try {
    return !!sessionStorage.getItem("punk_preview_parent_gate");
  } catch (_) {
    return false;
  }
}
