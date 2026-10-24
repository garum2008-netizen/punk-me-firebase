/** v21 playable systems: interactables, jobs, daily quests, room decor, dog fetch. */

const DECOR_KEY = "punkme_room_decor_v21";
const DAILY_KEY = "punkme_daily_v21";

function t(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function applyJobShift(me, hooks, opts) {
  if (!window.isOwner && opts.pay) me.coins += opts.pay;
  if (opts.xp) me.xp += opts.xp;
  if (opts.rep) me.rep += opts.rep;
  me.energy = Math.max(0, Math.min(100, (me.energy ?? 100) + (opts.energy || -10)));
  if (me.story) me.story.energy = me.energy;
  if (opts.rewardEnergy) {
    me.energy = Math.min(100, me.energy + opts.rewardEnergy);
    if (me.story) me.story.energy = me.energy;
  }
  if (opts.materials && window.StoryEngine) {
    const st = window.StoryEngine.ensureStoryState(me);
    Object.entries(opts.materials).forEach(([k, v]) => {
      st.materials[k] = (st.materials[k] || 0) + v;
    });
  }
  hooks.save();
  window.StoryEngine?.fireStoryEvent?.("job_shift_done");
  window.StoryEngine?.onEconomyChanged?.();
}

export function initPlayV21(ctx) {
  const api = {
    tryInteract(me, hooks) {
      const loc = me.location;
      const nearNpc = window.World3D?.getNearestNpc?.();
      if (nearNpc && window.openNpcDialog) {
        window.openNpcDialog(nearNpc);
        return true;
      }
      if (loc === "room") {
        const nearSofa = me.x < 55 && me.y > 45;
        if (nearSofa) {
          window.World3D?.setPlayerSit?.(true);
          hooks.toast(t("interact_sit"));
          setTimeout(() => window.World3D?.setPlayerSit?.(false), 4200);
          return true;
        }
      }
      if (loc === "kitchen" && me.y < 40) {
        me.energy = Math.min(100, (me.energy || 50) + 25);
        if (me.story) me.story.energy = me.energy;
        hooks.toast(t("interact_snack"));
        hooks.save();
        if (window.StoryEngine?.ensureStoryState(me).earn?.mode === "snack") {
          window.StoryEngine.ensureStoryState(me).earn = null;
          window.StoryEngine.renderObjectivePanel?.();
        }
        return true;
      }
      if (loc === "kitchen" && me.y >= 40) {
        const track = window.World3D?.cycleJukebox?.();
        hooks.toast(t("interact_jukebox") + " #" + ((track ?? 0) + 1));
        return true;
      }
      if (loc === "street") {
        const cap = window.StoryEngine?.getArcadeDailyCap?.() ?? 100;
        const day = todayKey();
        if (!me._arcadeDay || me._arcadeDay.day !== day) me._arcadeDay = { day, coins: 0 };
        if (me._arcadeDay.coins >= cap) {
          hooks.toast(t("interact_arcade_cap") || t("interact_arcade"));
          return true;
        }
        const pay = Math.min(12, cap - me._arcadeDay.coins);
        if (!window.isOwner) me.coins += pay;
        me._arcadeDay.coins += pay;
        me.xp += 5;
        hooks.toast(t("interact_arcade") + (pay < 12 ? ` (+${pay})` : ""));
        hooks.save();
        return true;
      }
      if (loc === "room" && me.x > 70) {
        hooks.toast(t("interact_tv"));
        return true;
      }
      return false;
    },
    startCemeteryJob(me, hooks) {
      if (me.location !== "cemetery") {
        hooks.toast(t("job_go_cemetery"));
        return;
      }
      window._cemeteryJobDone = success => {
        const pay = 25 + (success ? 55 : 15);
        me.coins += pay;
        me.xp += 10 + (success ? 20 : 5);
        hooks.save();
        hooks.toast(t("job_cemetery_done") + " +" + pay);
        window.StoryEngine?.fireStoryEvent?.("job_cemetery_done");
      };
      if (window.World3D?.startCemeteryJobMini?.()) {
        hooks.toast(t("job_cemetery_start"));
        return;
      }
      hooks.toast(t("job_cemetery_start"));
    },
    startPizzaJob(me, hooks) {
      if (me.location !== "city") {
        hooks.toast(t("job_go_city"));
        return;
      }
      const pay = 40 + Math.floor(Math.random() * 30);
      applyJobShift(me, hooks, { pay, xp: 15, energy: -10 });
      hooks.toast(t("job_pizza_done") + " +" + pay);
      window.StoryEngine?.fireStoryEvent?.("job_pizza_done");
      window.StoryEngine?.fireStoryEvent?.("auth_pizza_done");
    },
    startStoryJob(me, action, hooks) {
      const jobs = window.StoryEngine?.getJobs?.() || [];
      const def = jobs.find(j => j.action === action);
      const loc = def?.loc;
      if (loc && me.location !== loc) {
        hooks.toast(t("job_go_" + loc) || loc);
        return;
      }
      if ((me.energy ?? 100) < 10) {
        hooks.toast(t("story_low_energy") || "Low energy — snack first");
        window.StoryEngine?.beginEarnCoins?.(0, {});
        return;
      }
      const pay = def?.payMin ? def.payMin + Math.floor(Math.random() * Math.max(0, (def.payMax || def.payMin) - def.payMin)) : 30;
      applyJobShift(me, hooks, {
        pay,
        xp: def?.xp || 10,
        energy: def?.energy || -10,
        rep: def?.rep || 0,
        materials: def?.rewardMaterials,
        rewardEnergy: def?.rewardEnergy
      });
      if (action === "flyer_post") window.StoryEngine?.fireStoryEvent?.("flyer_shift_done");
      else if (action === "construction_helper") window.StoryEngine?.fireStoryEvent?.("job_construction_done");
      else if (action === "dishes_zoya") window.StoryEngine?.fireStoryEvent?.("job_dishes_done");
      hooks.toast((def?.title?.en ? def.title[window.getLanguage?.() || "en"] || def.title.en : action) + " +" + pay);
    },
    ensureDailyQuests(me) {
      const day = todayKey();
      if (me.dailyDay === day && me.dailyQuests?.length) return me.dailyQuests;
      me.dailyDay = day;
      me.dailyQuests = [
        { id: "walk_street", key: "daily_walk_street", need: 1, prog: 0, reward: 40 },
        { id: "pet_dog", key: "daily_pet_dog", need: 2, prog: 0, reward: 25 },
        { id: "win_duel", key: "daily_win_duel", need: 1, prog: 0, reward: 60 }
      ];
      return me.dailyQuests;
    },
    bumpDaily(me, id, hooks) {
      api.ensureDailyQuests(me);
      const q = me.dailyQuests.find(x => x.id === id);
      if (!q || q.done) return;
      q.prog = Math.min(q.need, (q.prog || 0) + 1);
      if (q.prog >= q.need) {
        q.done = true;
        me.coins += q.reward;
        hooks.toast(t("daily_complete") + " +" + q.reward);
        hooks.save();
      }
    },
    renderDailyPanel(me) {
      api.ensureDailyQuests(me);
      return me.dailyQuests.map(q => {
        const label = t(q.key);
        return `<div class="daily-row">${escapeHtml(label)} — ${q.prog || 0}/${q.need} ${q.done ? "✓" : ""}</div>`;
      }).join("");
    },
    loadRoomDecor() {
      try {
        return JSON.parse(localStorage.getItem(DECOR_KEY) || "[]");
      } catch {
        return [];
      }
    },
    saveRoomDecor(items) {
      localStorage.setItem(DECOR_KEY, JSON.stringify(items));
    },
    toggleDecorMode(me, hooks) {
      if (me.location !== "room") {
        hooks.toast(t("decor_room_only"));
        return;
      }
      me._decorMode = !me._decorMode;
      window.World3D?.setDecorMode?.(me._decorMode);
      hooks.toast(me._decorMode ? t("decor_mode_on") : t("decor_mode_off"));
    },
    placeDecorItem(me, type, hooks) {
      const items = api.loadRoomDecor();
      if (items.length >= 12) {
        hooks.toast(t("decor_limit"));
        return;
      }
      items.push({ type, x: me.x, y: me.y, rot: Math.random() * 6.28 });
      api.saveRoomDecor(items);
      hooks.toast(t("decor_placed"));
      hooks.save();
    },
    throwBallForDog(me, hooks) {
      if (!hooks.hasDog()) {
        hooks.toast(t("need_dog"));
        return;
      }
      me.dogHappy = Math.min(100, (me.dogHappy || 40) + 12);
      api.bumpDaily(me, "pet_dog", hooks);
      hooks.toast(t("dog_fetch"));
      window.World3D?.playEmote?.("dog", "hop");
    },
    syncCosmetics(me) {
      window.World3D?.applyHeroCosmetics?.(me.owned || [], me.equipped || {});
    },
    endAllActivities() {
      window.World3D?.endAllGameplayActivities?.();
      window.StoryEngine?.dismissAllStoryUi?.();
    }
  };
  window.PlayV21 = api;
  return api;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
