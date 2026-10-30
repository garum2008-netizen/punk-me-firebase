/**
 * Safe gang chat client — messages via Cloudflare Worker; RTDB read-only for chat/messages.
 */
(function () {
  const DEFAULT_WORKER_URL = ""; // set at deploy: window.__PUNK_SAFE_CHAT_URL
  let workerUrl = DEFAULT_WORKER_URL;
  const DEFAULT_PHRASES = [
    { id: "hi", text: { ru: "Привет!", uk: "Привіт!", en: "Hi!", da: "Hej!" } },
    { id: "gg", text: { ru: "GG", uk: "GG", en: "GG", da: "GG" } },
    { id: "cemetery", text: { ru: "Пойдём на кладбище", uk: "Підемо на цвинтар", en: "Let's hit the cemetery", da: "Skal vi til kirkegården?" } },
    { id: "street", text: { ru: "На улицу!", uk: "На вулицю!", en: "To the street!", da: "Ud på gaden!" } },
    { id: "help", text: { ru: "Нужна помощь", uk: "Потрібна допомога", en: "Need help", da: "Brug for hjælp" } },
    { id: "thanks", text: { ru: "Спасибо!", uk: "Дякую!", en: "Thanks!", da: "Tak!" } }
  ];
  let config = { freeTextEnabled: false, phrases: DEFAULT_PHRASES, cooldownMs: 3000 };
  let blocklist = {};
  let chatPath = "chat/messages";

  function workerBase() {
    const u = window.__PUNK_SAFE_CHAT_URL || workerUrl;
    return (u || "").replace(/\/$/, "");
  }

  function useSafeChat() {
    return Boolean(workerBase()) || window.__PUNK_SAFE_CHAT_FORCE === true;
  }

  async function getIdToken() {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error("not_signed_in");
    return user.getIdToken();
  }

  async function api(path, body) {
    const token = await getIdToken();
    const res = await fetch(`${workerBase()}${path}`, {
      method: body ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, json };
  }

  function tChat(key) {
    if (typeof window.tSafeChat === "function") return window.tSafeChat(key);
    return key;
  }

  function showNotSent() {
    if (typeof window.toast === "function") window.toast(tChat("chatNotSent"));
  }

  function loadBlocklistFromMe() {
    blocklist = { ...(window.me?.chatBlocklist || {}) };
  }

  function saveBlocklist(uidToBlock) {
    if (!window.me || !window.uid) return;
    window.me.chatBlocklist = window.me.chatBlocklist || {};
    window.me.chatBlocklist[uidToBlock] = true;
    blocklist = { ...window.me.chatBlocklist };
    if (typeof window.saveMe === "function") window.saveMe();
  }

  function unblockUser(uidToUnblock) {
    if (!window.me?.chatBlocklist) return;
    delete window.me.chatBlocklist[uidToUnblock];
    blocklist = { ...window.me.chatBlocklist };
    if (typeof window.saveMe === "function") window.saveMe();
  }

  function isBlocked(uid) {
    return Boolean(blocklist[uid]);
  }

  function ensureChatRegisteredAt() {
    if (!window.me || window.me.chatRegisteredAt) return;
    window.me.chatRegisteredAt = Date.now();
    if (typeof window.saveMe === "function") window.saveMe();
  }

  function renderPhraseButtons() {
    const row = document.getElementById("chatPhraseRow");
    if (!row) return;
    row.innerHTML = "";
    const lang = typeof window.getLanguage === "function" ? window.getLanguage() : "en";
    const list = config.phrases?.length ? config.phrases : [];
    list.forEach(p => {
      const id = p.id;
      const text = (p.text && (p.text[lang] || p.text.en)) || id;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chat-phrase-btn";
      btn.textContent = text;
      btn.addEventListener("click", () => sendPhrase(id));
      row.appendChild(btn);
    });
  }

  function applyFreeTextUi() {
    const inp = document.getElementById("chatInput");
    if (!inp) return;
    const on = config.freeTextEnabled;
    inp.disabled = !on;
    inp.placeholder = on
      ? (typeof window.t === "function" ? window.t("chatPh") : "…")
      : tChat("chatFreeTextOff");
  }

  async function refreshConfig() {
    if (!workerBase()) {
      config.freeTextEnabled = false;
      return;
    }
    try {
      const res = await fetch(`${workerBase()}/api/chat/config`);
      const json = await res.json();
      if (json.ok) {
        config = { ...config, ...json };
        renderPhraseButtons();
        applyFreeTextUi();
      }
    } catch (e) {
      console.warn("safe-chat config", e);
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function appendMessageLine(m, msgId) {
    if (!m || m.hidden) return;
    if (isBlocked(m.uid)) return;
    const box = document.getElementById("chatMessages");
    if (!box) return;
    const line = document.createElement("div");
    line.className = "chat-line";
    line.dataset.msgId = msgId || "";
    const text =
      typeof window.localizeChatText === "function" ? window.localizeChatText(m.text) : m.text;
    line.innerHTML =
      '<span class="chat-line-body"><b>' +
      escapeHtml(m.name) +
      ":</b> " +
      escapeHtml(text) +
      "</span>";
    if (msgId && m.uid !== window.uid) {
      const safety = document.createElement("button");
      safety.type = "button";
      safety.className = "chat-report-btn chat-safety-btn";
      safety.title = tChat("chatReportSafety");
      safety.textContent = "⚠";
      safety.addEventListener("click", () => reportMessage(msgId, "child_safety"));
      line.appendChild(safety);
      const rep = document.createElement("button");
      rep.type = "button";
      rep.className = "chat-report-btn";
      rep.title = tChat("chatReport");
      rep.textContent = "!";
      rep.addEventListener("click", () => reportMessage(msgId, "generic"));
      line.appendChild(rep);
      const blk = document.createElement("button");
      blk.type = "button";
      blk.className = "chat-block-btn";
      blk.title = tChat("chatBlock");
      blk.textContent = "×";
      blk.addEventListener("click", () => {
        saveBlocklist(m.uid);
        line.remove();
      });
      line.appendChild(blk);
    }
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  function listenChat() {
    const db = window.db;
    if (!db) return;
    db.ref(chatPath).limitToLast(25).on("child_added", s => {
      appendMessageLine(s.val(), s.key);
    });
  }

  async function sendPhrase(phraseId) {
    ensureChatRegisteredAt();
    if (!useSafeChat()) return legacySendPhrase?.(phraseId);
    const { status, json } = await api("/api/chat/send", {
      phraseId,
      lang: typeof window.getLanguage === "function" ? window.getLanguage() : "en",
      name: window.me?.name || "Player",
      loc: window.me?.location
    });
    if (!json.ok) showNotSent();
    return { status, json };
  }

  async function sendFreeText(text) {
    ensureChatRegisteredAt();
    if (!useSafeChat()) return legacySendFreeText?.(text);
    const { status, json } = await api("/api/chat/send", {
      text,
      lang: typeof window.getLanguage === "function" ? window.getLanguage() : "en",
      name: window.me?.name || "Player",
      loc: window.me?.location
    });
    if (!json.ok) showNotSent();
    return { status, json };
  }

  async function reportMessage(msgId, category) {
    if (!useSafeChat()) return;
    const body = { msgId };
    if (category) body.category = category;
    await api("/api/chat/report", body);
    if (typeof window.toast === "function") {
      window.toast(category === "child_safety" ? tChat("chatReportSafetyDone") : tChat("chatReported"));
    }
  }

  function init(opts) {
    if (opts?.workerUrl) workerUrl = opts.workerUrl;
    loadBlocklistFromMe();
    if (typeof window.onLanguageChanged === "undefined") {
      window.onLanguageChanged = function () {};
    }
    const prev = window.onLanguageChanged;
    window.onLanguageChanged = function () {
      if (typeof prev === "function") prev();
      renderPhraseButtons();
      applyFreeTextUi();
    };
    refreshConfig().then(() => {
      listenChat();
      applyFreeTextUi();
    });
  }

  window.PunkSafeChat = {
    init,
    sendPhrase,
    sendFreeText,
    reportMessage,
    saveBlocklist,
    unblockUser,
    isBlocked,
    useSafeChat,
    refreshConfig,
    appendMessageLine,
    listenChat
  };
})();
