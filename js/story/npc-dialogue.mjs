/**
 * Pick the dialogue tree opened by talking to an NPC.
 * Enter-location callouts are not talk trees.
 * Trigger conditions (for example flag:!joined_gang) are honored.
 */
export function findNpcDialogue(dialogues, npcId, loc, conditionsPass) {
  const pass = typeof conditionsPass === "function" ? conditionsPass : () => true;
  return (
    (dialogues || []).find(d => {
      if (!d || d.location !== loc) return false;
      if (d.trigger?.type === "enter") return false;
      const speaks = d.nodes?.some(n => String(n.speaker || "").includes(npcId));
      if (!speaks) return false;
      if (d.trigger?.conditions && !pass(d.trigger.conditions)) return false;
      return true;
    }) || null
  );
}
