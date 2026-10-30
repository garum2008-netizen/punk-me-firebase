/**
 * Recommended ending from play state — ids match QUEST_TABLE.md (t105u).
 * Player may override in UI; override is stored in story.decisions.ending_override.
 */

const ENDING_IDS = ["ending_break_curse", "ending_zombie_style", "ending_count_deal"];

export function scoreEndings(st) {
  const scores = {
    ending_break_curse: 8,
    ending_zombie_style: 8,
    ending_count_deal: 8
  };
  const rel = st?.rel || {};
  const dec = st?.decisions || {};
  const head = st?.flags?.concert_headliner || dec.headliner;

  if (dec.antibully === "help") scores.ending_break_curse += 18;
  if (dec.antibully === "mock") scores.ending_zombie_style += 6;

  scores.ending_break_curse += Math.min(25, (rel.zombie || 0) * 0.35);
  scores.ending_zombie_style += Math.min(28, (rel.gang_rust || 0) * 0.4);

  if (dec.bell_tongue === "zombie" || st?.unique?.bell_tongue_zombie) scores.ending_zombie_style += 22;
  if (dec.bell_tongue === "zoya" || st?.unique?.bell_tongue_zoya) scores.ending_count_deal += 14;

  scores.ending_count_deal += Math.min(30, (rel.count || 0) * 0.45);

  if (head === "zombina" || head === "gang") scores.ending_zombie_style += 26;
  if (head === "family" || head === "mortvinov") scores.ending_break_curse += 24;
  if (head === "count") scores.ending_count_deal += 28;

  if (st?.flags?.rookie_ally) scores.ending_break_curse += 8;
  if (st?.flags?.rookie_mocked) scores.ending_zombie_style += 5;

  return scores;
}

export function recommendEnding(st) {
  const scores = scoreEndings(st);
  let best = ENDING_IDS[0];
  let bestV = -Infinity;
  for (const id of ENDING_IDS) {
    if (scores[id] > bestV) {
      bestV = scores[id];
      best = id;
    }
  }
  return best;
}

export function annotateEndingChoiceUi(st) {
  const rec = recommendEnding(st);
  st.flags.ending_recommended = rec;
  const root = document.getElementById("endingChoice");
  if (!root) return rec;
  root.querySelectorAll("[data-ending]").forEach(btn => {
    const isRec = btn.dataset.ending === rec;
    btn.classList.toggle("ending-recommended", isRec);
    btn.setAttribute("aria-describedby", isRec ? "endingRecommendedHint" : "");
  });
  let hint = document.getElementById("endingRecommendedHint");
  if (!hint) {
    hint = document.createElement("p");
    hint.id = "endingRecommendedHint";
    hint.className = "ending-preview";
    root.querySelector(".ending-choice-panel")?.prepend(hint);
  }
  const lang = typeof window.getLanguage === "function" ? window.getLanguage() : "ru";
  const labels = {
    ru: "По твоим решениям и концерту логичнее этот исход (можно выбрать другой):",
    en: "Given your choices and the concert, this outcome fits best (you may still pick another):",
    da: "Ud fra dine valg passer dette bedst (du kan vælge et andet):"
  };
  hint.textContent = labels[lang] || labels.en;
  return rec;
}

window.StoryEndingResolve = { scoreEndings, recommendEnding, annotateEndingChoiceUi };
