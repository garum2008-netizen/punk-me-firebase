/** Angelina hint tiers: nudge → direction → exact (t104u §5). */

function lang() {
  return typeof window.getLanguage === "function" ? window.getLanguage() : "ru";
}

function L(obj) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  const l = lang();
  return obj[l] || obj.en || obj.ru || "";
}

function t(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

export function pickAngelinaHint(step, idleHintLevel, youtubeMode) {
  if (!step) return "";
  const tier = Math.max(0, Number(idleHintLevel) || 0);
  if (youtubeMode && tier >= 1) {
    const base = L(step.objective || step.hint_nudge || {});
    const why = L(step.hint_why || {});
    return [base, why].filter(Boolean).join(" — ");
  }
  if (tier >= 3 && step.hint_exact) return `${t("angelina_hint_exact")}: ${L(step.hint_exact)}`;
  if (tier >= 2 && step.hint_60s) return `${t("angelina_hint_direction")}: ${L(step.hint_60s)}`;
  if (tier >= 1 && step.hint_nudge) return `${t("angelina_hint_nudge")}: ${L(step.hint_nudge)}`;
  return "";
}

export function refreshAngelinaContextBanner() {
  const el = document.getElementById("angelinaContext");
  if (!el || !window.me) return;
  const s = window.StoryEngine?.ensureStoryState?.(window.me);
  if (!s) return;
  const cp = s.checkpoints?.[String(s.mainlineChapter ?? s.chapter)];
  if (!cp?.at) {
    el.textContent = "";
    el.classList.remove("visible");
    return;
  }
  const ch = s.mainlineChapter ?? s.chapter ?? 0;
  const title = typeof window.t === "function" ? window.t(`chapter_${ch}_title`) : `Ch ${ch}`;
  el.textContent = `${title} · ${new Date(cp.at).toLocaleString()}`;
  el.classList.add("visible");
}

window.AngelinaGuide = { pickAngelinaHint, refreshAngelinaContextBanner };
