/* Character definitions — look, anim, voice, intros (RU/EN/DA) */
const PLAYABLE_CHARACTER_IDS = ["razor", "vienna", "cobalt", "mohawk"];

const CHARACTERS = {
  razor: {
    id: "razor",
    playable: true,
    npc: true,
    poster: "imagine_images/LTPb8.jpg",
    look: {
      scale: 1.04,
      hairStyle: "spikes",
      hair: 0x1c1c24,
      jacket: 0x0d0d14,
      pants: 0x1a1020,
      boots: 0x222228,
      emissive: 0xff0066,
      tint: 0xffccaa,
      chain: true,
      choker: false,
      spikes: true
    },
    anim: {
      idle: ["Idle_Loop"],
      walk: ["Walk_Loop"],
      run: ["Jog_Fwd_Loop"],
      talk: ["Idle_Talking_Loop"],
      emote: ["Sword_Idle"],
      walkSpeed: 1.05,
      idleSpeed: 0.92,
      runSpeed: 1.1
    },
    voice: { pitch: 0.78, rate: 0.94 },
    intro: {
      ru: "Рейзор. Цепи звенят — покажи, что ты свой.",
      en: "Razor. Chains are ringing — prove you're one of us.",
      da: "Razor. Kæderne ringer — vis du er en af os."
    }
  },
  vienna: {
    id: "vienna",
    playable: true,
    npc: true,
    poster: "imagine_images/Oo040.jpg",
    look: {
      scale: 0.96,
      hairStyle: "mohawk",
      hair: 0xff3399,
      jacket: 0x2a0a28,
      pants: 0x180818,
      boots: 0x330022,
      emissive: 0xff3399,
      tint: 0xffbbaa,
      chain: true,
      choker: true,
      spikes: false
    },
    anim: {
      idle: ["Idle_Loop"],
      walk: ["Walk_Formal_Loop", "Walk_Loop"],
      run: ["Jog_Fwd_Loop"],
      talk: ["Idle_Talking_Loop"],
      emote: ["Idle_Torch_Loop"],
      walkSpeed: 1.0,
      idleSpeed: 1.0,
      runSpeed: 1.05
    },
    voice: { pitch: 1.12, rate: 1.02 },
    intro: {
      ru: "Вена. NOT DEAD YET — живём громко.",
      en: "Vienna. NOT DEAD YET — we live loud.",
      da: "Vienna. NOT DEAD YET — vi lever højt."
    }
  },
  cobalt: {
    id: "cobalt",
    playable: true,
    npc: false,
    poster: "imagine_images/Lix06.jpg",
    look: {
      scale: 0.94,
      hairStyle: "pigtails",
      hair: 0x33bbff,
      jacket: 0x102838,
      pants: 0x081820,
      boots: 0x0a2838,
      emissive: 0x00ccff,
      tint: 0xffccaa,
      chain: false,
      choker: false,
      spikes: true
    },
    anim: {
      idle: ["Idle_Loop"],
      walk: ["Walk_Loop"],
      run: ["Sprint_Loop", "Jog_Fwd_Loop"],
      talk: ["Idle_Talking_Loop"],
      emote: ["Spell_Simple_Idle_Loop"],
      wave: ["Interact"],
      sit: ["Sitting_Idle_Loop"],
      interact: ["PickUp_Table", "Interact"],
      walkSpeed: 1.15,
      idleSpeed: 1.08,
      runSpeed: 1.25
    },
    voice: { pitch: 1.18, rate: 1.12 },
    intro: {
      ru: "Кобальт. Прыгай выше неона — я прикрою.",
      en: "Cobalt. Jump higher than the neon — I'll cover you.",
      da: "Cobalt. Hop højere end neonen — jeg dækker dig."
    }
  },
  mohawk: {
    id: "mohawk",
    playable: true,
    npc: true,
    poster: "imagine_images/Lix06.jpg",
    look: {
      scale: 1.0,
      hairStyle: "mohawk",
      hair: 0x66ff22,
      jacket: 0x142810,
      pants: 0x0a1808,
      boots: 0x1a2810,
      emissive: 0x66ff22,
      tint: 0xffccaa,
      chain: false,
      choker: false,
      spikes: false
    },
    anim: {
      idle: ["Spell_Simple_Idle_Loop", "Idle_Loop"],
      walk: ["Walk_Loop"],
      run: ["Jog_Fwd_Loop"],
      talk: ["Idle_Talking_Loop"],
      emote: ["Idle_Torch_Loop"],
      walkSpeed: 1.02,
      idleSpeed: 1.05,
      runSpeed: 1.08
    },
    voice: { pitch: 0.95, rate: 1.08 },
    intro: {
      ru: "Ирокез. Магия жжёт — держись рядом.",
      en: "Mohawk. Magic burns — stay close.",
      da: "Mohawk. Magien brænder — bliv tæt på."
    }
  },
  ghost: {
    id: "ghost",
    playable: false,
    npc: true,
    poster: "imagine_images/ilRF3.jpg",
    look: {
      scale: 1.0,
      hairStyle: "spikes",
      hair: 0xaaaaff,
      jacket: 0x1a1a2e,
      emissive: 0x222244,
      tint: 0xccccff,
      chain: false,
      choker: true,
      spikes: false
    },
    anim: {
      idle: ["Idle_Loop"],
      walk: ["Walk_Formal_Loop"],
      run: ["Walk_Loop"],
      talk: ["Idle_Talking_Loop"],
      emote: ["Idle_Loop"],
      walkSpeed: 0.9,
      idleSpeed: 0.85,
      runSpeed: 0.95
    },
    voice: { pitch: 1.05, rate: 0.88 },
    intro: { ru: "", en: "", da: "" }
  },
  gravedigger: {
    id: "gravedigger",
    playable: false,
    npc: true,
    poster: "imagine_images/HePl7.jpg",
    look: {
      scale: 1.06,
      hairStyle: "spikes",
      hair: 0x444433,
      jacket: 0x2a2820,
      emissive: 0x111100,
      tint: 0xddccaa,
      chain: false,
      choker: false,
      spikes: false
    },
    anim: {
      idle: ["Sitting_Idle_Loop"],
      walk: ["Walk_Loop"],
      run: ["Walk_Loop"],
      talk: ["Idle_Talking_Loop"],
      emote: ["Idle_Loop"],
      walkSpeed: 0.85,
      idleSpeed: 0.8,
      runSpeed: 0.9
    },
    voice: { pitch: 0.72, rate: 0.9 },
    intro: { ru: "", en: "", da: "" }
  }
};

function getCharacterDef(id) {
  return CHARACTERS[id] || CHARACTERS.razor;
}

function getPlayableCharacters() {
  return PLAYABLE_CHARACTER_IDS.map(id => CHARACTERS[id]);
}

function isCharacterJoinable(id) {
  const c = CHARACTERS[id];
  return !!c && c.playable !== false && !c.comingSoon;
}

window.isCharacterJoinable = isCharacterJoinable;

function characterIntroLine(id, lang) {
  const c = getCharacterDef(id);
  const l = lang || (typeof getLanguage === "function" ? getLanguage() : "en");
  return (c.intro && (c.intro[l] || c.intro.en)) || "";
}

window.CHARACTERS = CHARACTERS;
window.PLAYABLE_CHARACTER_IDS = PLAYABLE_CHARACTER_IDS;
window.getCharacterDef = getCharacterDef;
window.getPlayableCharacters = getPlayableCharacters;
window.characterIntroLine = characterIntroLine;
