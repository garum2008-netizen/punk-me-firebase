/** Tester panel: ?test=1, /beta.html, or localStorage punkme_test=1 */

const LOCATIONS = [
  "room", "kitchen", "toilet", "elevator", "roof", "street",
  "city", "construction", "cemetery", "parkour"
];

export function isTestMode() {
  try {
    if (new URLSearchParams(location.search).has("test")) return true;
    return localStorage.getItem("punkme_test") === "1";
  } catch (e) {
    return false;
  }
}

function deviceInfo() {
  const nav = navigator;
  return {
    version: window.GAME_VERSION || document.getElementById("gameVersion")?.textContent || "?",
    url: location.href,
    lang: nav.language,
    platform: nav.platform,
    userAgent: nav.userAgent,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    dpr: window.devicePixelRatio,
    solo: new URLSearchParams(location.search).has("solo"),
    test: true,
    ts: new Date().toISOString()
  };
}

export function collectFeedbackText() {
  const info = deviceInfo();
  const lines = [
    "PUNK ME bug report",
    `version: ${info.version}`,
    `url: ${info.url}`,
    `viewport: ${info.viewport} dpr=${info.dpr}`,
    `lang: ${info.lang} platform: ${info.platform}`,
    `ua: ${info.userAgent}`,
    `time: ${info.ts}`,
    "",
    "Опишите баг здесь:"
  ];
  return lines.join("\n");
}

function jumpAuthorityStage(stage) {
  const me = window.me;
  if (!me) return;
  const st = window.StoryEngine?.ensureStoryState?.(me);
  if (!st) return;
  st.flags.joined_gang = false;
  st.auth.s1Done = stage > 1;
  st.auth.stage = stage;
  st.auth.tasks = {};
  st.auth.trials = {};
  st.auth.ch2Done = false;
  st.auth.ch2Choice = null;
  if (stage >= 2) {
    st.auth.s1Done = true;
    st.authority = stage === 2 ? 28 : stage === 3 ? 52 : 92;
  }
  if (stage >= 3) {
    st.auth.tasks = { pizza: true, no_rat: true, cobalt_item: true, ghost_prank: true };
    st.authority = 52;
  }
  if (stage >= 4) {
    st.auth.trials = { cemetery: true, roof_parkour: true, duel_mohawk: true };
    st.authority = 92;
  }
  if (stage === 1) st.authority = 8;
  st.chapter = stage >= 4 ? 2 : 1;
  window.StoryEngine?.Authority?.syncGangRank?.(me);
  window.StoryEngine?.Authority?.renderAuthorityHud?.(me);
  window.goLocation?.("street");
  window.syncStage3D?.();
  window.saveMe?.();
}

function jumpChapter(ch) {
  const me = window.me;
  if (!me) return;
  const st = window.StoryEngine?.ensureStoryState?.(me);
  if (!st) return;
  st.chapter = ch;
  if (ch >= 2) {
    st.gang_rank = "gang_member";
    st.flags.joined_gang = true;
    st.auth.stage = 5;
    st.authority = 100;
  }
  window.StoryEngine?.Authority?.renderAuthorityHud?.(me);
  window.saveMe?.();
  if (ch === 2) {
    window.StoryEngine?.Authority?.maybeChapter2Bullying?.();
  }
}

async function resetProgress() {
  if (!confirm("Сбросить прогресс этого игрока (Firebase)?")) return;
  const me = window.me;
  try {
    const uid = window._punkUid;
    if (uid && window.firebase?.database) {
      await window.firebase.database().ref("players/" + uid).remove();
    }
  } catch (e) { /* ignore */ }
  try {
    localStorage.removeItem("punkme_howto_seen");
    localStorage.removeItem("punkme_dev");
  } catch (e) { /* ignore */ }
  location.href = "index.html?test=1&solo=1";
}

export function initTestMode() {
  if (!isTestMode()) return;
  try {
    localStorage.setItem("punkme_test", "1");
  } catch (e) { /* ignore */ }

  const panel = document.getElementById("testModePanel");
  if (!panel) return;
  panel.hidden = false;
  document.body.classList.add("test-mode-active");

  const verEl = document.getElementById("testModeVersion");
  if (verEl) verEl.textContent = window.GAME_VERSION || "?";

  document.getElementById("testModeFeedback")?.addEventListener("click", async () => {
    const text = collectFeedbackText();
    try {
      await navigator.clipboard.writeText(text);
      window.toast?.("Отчёт скопирован в буфер");
    } catch (e) {
      window.prompt("Скопируйте отчёт:", text);
    }
  });

  document.getElementById("testModeCoins")?.addEventListener("click", () => {
    if (!window.me) return;
    window.me.coins = (window.me.coins || 0) + 5000;
    try { localStorage.setItem("punkme_dev", "1"); } catch (e) { /* ignore */ }
    document.getElementById("coins")?.textContent = window.formatCoinsDisplay?.() || String(window.me.coins);
    window.saveMe?.();
    window.toast?.("+5000 test coins");
  });

  document.getElementById("testModeReset")?.addEventListener("click", () => resetProgress());

  const locGrid = document.getElementById("testModeLocs");
  if (locGrid) {
    locGrid.innerHTML = LOCATIONS.map(id =>
      `<button type="button" class="btn secondary test-loc-btn" data-loc="${id}">${id}</button>`
    ).join("");
    locGrid.querySelectorAll(".test-loc-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        window.goLocation?.(btn.dataset.loc);
        window.syncStage3D?.();
      });
    });
  }

  document.getElementById("testModeAuth1")?.addEventListener("click", () => jumpAuthorityStage(1));
  document.getElementById("testModeAuth4")?.addEventListener("click", () => jumpAuthorityStage(4));
  document.getElementById("testModeCh2")?.addEventListener("click", () => jumpChapter(2));

  document.getElementById("testModeToggle")?.addEventListener("click", () => {
    panel.classList.toggle("collapsed");
  });
}
