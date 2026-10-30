/** q_ch2_antibully — newbie on street, fixable choice. */

export function maybeStartAntibully() {
  const st = window.StoryEngine?.ensureStoryState?.(window.me);
  if (!st?.flags?.joined_gang || st.hangoutStage < 2) return;
  if (st.flags.ch2_antibully_resolved || st.quest.activeId === "q_ch2_antibully") return;
  if (st.quest.completed?.q_ch2_antibully) return;
  window.StoryEngine?.startQuest?.("q_ch2_antibully");
}

export function applyAntibullyChoice(helped, hooks) {
  const st = window.StoryEngine?.ensureStoryState?.(window.me);
  st.flags.ch2_antibully_resolved = true;
  st.decisions.antibully = helped ? "help" : "mock";
  if (helped) {
    st.rel.gang_rust = (st.rel.gang_rust || 0) + 8;
    st.flags.rookie_ally = true;
  } else {
    st.rel.gang_rust = (st.rel.gang_rust || 0) - 5;
    st.flags.rookie_mocked = true;
  }
  window.StoryEngine?.completeQuest?.("q_ch2_antibully");
  hooks?.save?.();
}

export function canRedeemAntibully() {
  const st = window.StoryEngine?.ensureStoryState?.(window.me);
  return st?.flags?.rookie_mocked && !st.flags.rookie_redeemed;
}

export function redeemAntibully(hooks) {
  const st = window.StoryEngine?.ensureStoryState?.(window.me);
  st.flags.rookie_redeemed = true;
  st.rel.gang_rust = (st.rel.gang_rust || 0) + 6;
  hooks?.toast?.(
    typeof window.t === "function"
      ? window.t("antibully_redeem_ok")
      : "You stood up for the rookie — the gang noticed."
  );
  hooks?.save?.();
}
