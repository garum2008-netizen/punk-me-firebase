/**
 * Synthetic player save shapes (no real user data) for rules compatibility tests.
 * Mirrors defaultPlayer() + common variants from game.js sanitizePlayer / migrate.
 */
function base() {
  const n = 42;
  return {
    name: "Панк" + n,
    coins: 100,
    energy: 100,
    mood: 100,
    xp: 0,
    level: 1,
    rep: 0,
    location: "room",
    x: 42,
    y: 62,
    avatar: "imagine_images/LTPb8.jpg",
    owned: [],
    inventory: { materials: {}, spells: [] },
    equipment: { chains: null, jacket: null },
    pet: null,
    stats: { chain: 10, magic: 8, hp: 100, maxHp: 100 },
    quests: { active: "intro", progress: {} },
    jobCooldowns: { dig: 0, clean: 0, water: 0, cobwebs: 0 },
    lastJob: 0,
    built: 0,
    decor: [],
    dog: { x: 38, y: 65 },
    characterId: null,
    lastSeen: Date.now(),
    story: null,
    authority: 0,
    gang_rank: "newbie",
    lang: "en",
    owner: false
  };
}

/** @returns {{ id: string, data: object }[]} */
function buildPlayerSaveFixtures() {
  const fixtures = [];
  const push = (id, patch) => fixtures.push({ id, data: { ...base(), ...patch } });

  push("fx-default", {});
  push("fx-pet-dog", { pet: "pet_dog", owned: ["pet_dog"], coins: 500 });
  push("fx-pet-null", { pet: null });
  push("fx-owned-empty", { owned: [] });
  push("fx-owned-list", {
    owned: ["jacket_neon", "chain_neon", "pet_dog"],
    equipment: { chains: "chain_neon", jacket: "jacket_neon" }
  });
  push("fx-owned-rtdb-map", {
    owned: { "0": "jacket_neon", "1": "chain_neon" }
  });
  push("fx-inventory-materials", {
    inventory: { materials: { brick: 3, nail: 2, board: 1 }, spells: ["spark"] },
    coins: 80
  });
  push("fx-equipment-only", {
    equipment: { chains: "chain_neon", jacket: null },
    owned: ["chain_neon"]
  });
  push("fx-story-active", {
    story: {
      chapter: 2,
      authority: 12,
      gang_rank: "member",
      quest: { activeId: "hangout", step: 2, completed: { intro: true } },
      materials: { brick: 1 },
      events: { roof_scrap_once: true }
    },
    authority: 12,
    gang_rank: "member"
  });
  push("fx-story-null", { story: null });
  push("fx-onboarding-legacy", {
    onboarding: { step: 3, progress: { moved: 1 }, done: false }
  });
  push("fx-linked-auth", {
    linkedAuth: { email: "player@example.com", provider: "google.com" }
  });
  push("fx-minimal-old", {
    name: "Legacy99",
    coins: 50,
    location: "street",
    lastSeen: 1700000000000
  });
  push("fx-decor-items", {
    decor: [{ type: "poster", x: 10, y: 20 }, { type: "lamp", x: 30, y: 40 }]
  });
  push("fx-decor-empty", { decor: [] });
  push("fx-dog-pos", { dog: { x: 12.5, y: 88 }, pet: "pet_dog" });
  push("fx-job-cooldowns", {
    jobCooldowns: { dig: 1999999999999, clean: 0, water: 0, cobwebs: 0 },
    lastJob: 1999999999990,
    location: "cemetery"
  });
  push("fx-character-cobalt", {
    characterId: "cobalt",
    avatar: "imagine_images/77Mdp.jpg",
    xp: 400,
    level: 2
  });
  push("fx-owner-flag", { owner: true, coins: 9999 });
  push("fx-heavy", {
    pet: "pet_dog",
    owned: ["pet_dog", "jacket_neon", "chain_neon", "mat_brick"],
    inventory: { materials: { brick: 10, nail: 2 }, spells: ["zap", "shield"] },
    equipment: { chains: "chain_neon", jacket: "jacket_neon" },
    quests: { active: "authority", progress: { tease: 1 } },
    story: { chapter: 1, quest: { activeId: "auth", step: 4, completed: {} } },
    onboarding: { step: 6, progress: {}, done: true },
    linkedAuth: { email: "linked@example.com", provider: "password" },
    decor: [{ type: "skull", x: 5, y: 5 }],
    built: 3,
    authority: 25,
    gang_rank: "rusty_chains",
    location: "city",
    x: 55,
    y: 70
  });
  return fixtures;
}

module.exports = { buildPlayerSaveFixtures, base };
