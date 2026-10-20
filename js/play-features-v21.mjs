/** v21 playable systems: interactables, jobs, daily quests, room decor, dog fetch. */

const DECOR_KEY = "punkme_room_decor_v21";
const DAILY_KEY = "punkme_daily_v21";

function t(key) {
  return typeof window.t === "function" ? window.t(key) : key;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function initPlayV21(ctx) {
  const api = {
    tryInteract(me, hooks) {
      const loc = me.location;
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
        me.energy = Math.min(100, (me.energy || 50) + 18);
        hooks.toast(t("interact_snack"));
        hooks.save();
        return true;
      }
      if (loc === "kitchen" && me.y >= 40) {
        const track = window.World3D?.cycleJukebox?.();
        hooks.toast(t("interact_jukebox") + " #" + ((track ?? 0) + 1));
        return true;
      }
      if (loc === "street") {
        hooks.toast(t("interact_arcade"));
        me.coins += 12;
        me.xp += 5;
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
      me.coins += 35;
      me.xp += 15;
      hooks.save();
      hooks.toast(t("job_pizza_done"));
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
    }
  };
  window.PlayV21 = api;
  return api;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
