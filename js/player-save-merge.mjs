/**
 * Merge guest progress into account save without wiping richer cloud data.
 */
export function mergePlayerSaves(guest, remote) {
  if (!guest || typeof guest !== "object") return remote || {};
  if (!remote || typeof remote !== "object") return { ...guest };
  const out = { ...remote };

  out.coins = Math.max(Number(guest.coins) || 0, Number(remote.coins) || 0);
  out.xp = Math.max(Number(guest.xp) || 0, Number(remote.xp) || 0);
  out.rep = Math.max(Number(guest.rep) || 0, Number(remote.rep) || 0);
  out.built = Math.max(Number(guest.built) || 0, Number(remote.built) || 0);

  const gOn = guest.onboarding || {};
  const rOn = remote.onboarding || {};
  if (rOn.done) out.onboarding = rOn;
  else if (gOn.done) out.onboarding = gOn;
  else {
    const gStep = Number(gOn.step) || 0;
    const rStep = Number(rOn.step) || 0;
    out.onboarding = gStep >= rStep ? { ...gOn } : { ...rOn };
  }

  const gInv = guest.inventory?.materials || {};
  const rInv = remote.inventory?.materials || {};
  const materials = { ...rInv };
  for (const [k, v] of Object.entries(gInv)) {
    materials[k] = Math.max(Number(materials[k]) || 0, Number(v) || 0);
  }
  out.inventory = {
    materials,
    spells: [...new Set([...(remote.inventory?.spells || []), ...(guest.inventory?.spells || [])])]
  };

  out.owned = [...new Set([...(remote.owned || []), ...(guest.owned || [])])];
  out.decor = [...(remote.decor || []), ...(guest.decor || [])];

  const gHeard = guest.dialogueHeard || {};
  const rHeard = remote.dialogueHeard || {};
  out.dialogueHeard = { ...rHeard };
  for (const [k, v] of Object.entries(gHeard)) {
    out.dialogueHeard[k] = !!(v || out.dialogueHeard[k]);
  }

  out.settings = {
    ...(guest.settings || {}),
    ...(remote.settings || {}),
    audio: {
      ...(guest.settings?.audio || {}),
      ...(remote.settings?.audio || {})
    }
  };

  if (!remote.lang && guest.lang) out.lang = guest.lang;
  if (!remote.characterId && guest.characterId) out.characterId = guest.characterId;

  const gCh = Number(guest.story?.chapter) || 0;
  const rCh = Number(remote.story?.chapter) || 0;
  if (gCh > rCh && guest.story) out.story = guest.story;
  else if (remote.story) out.story = remote.story;
  else if (guest.story) out.story = guest.story;

  return out;
}

window.__punkMergePlayerSaves = mergePlayerSaves;
