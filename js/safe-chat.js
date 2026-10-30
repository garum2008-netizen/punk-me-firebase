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
  let blockedSids = {};
  let mySid = "";
  let chatPath = "chat/messages";

  function workerBase() {
    const u = window.__PUNK_SAFE_CHAT_URL || workerUrl;
    return (u || "").replace(/\/$/, "");
  }

  function useSafeChat() {
    return Boolean(workerBase());
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

  function isBlocked(sid) {
    return Boolean(sid && blockedSids[sid]);
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
    const on = config.freeTextEnabled && useSafeChat();
    inp.disabled = !on;
    inp.placeholder = on
      ? (typeof window.t === "function" ? window.t("chatPh") : "…")
      : tChat("chatFreeTextOff");
  }

  function setChatReadOnlyUi() {
    const inp = document.getElementById("chatInput");
    if (inp) {
      inp.disabled = true;
      inp.placeholder = tChat("chatFreeTextOff");
    }
    const row = document.getElementById("chatPhraseRow");
    if (row) row.innerHTML = "";
  }

  async function refreshConfig() {
    if (!workerBase()) {
      config.freeTextEnabled = false;
      setChatReadOnlyUi();
      return;
    }
    try {
      const { json } = await api("/api/chat/config");
      if (json.ok) {
        config = { ...config, ...json };
        if (json.mySid) mySid = json.mySid;
        blockedSids = {};
        (json.blockedSids || []).forEach(s => {
          blockedSids[s] = true;
        });
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

  function messageSid(m) {
    return m?.sid || m?.uid || "";
  }

  function appendMessageLine(m, msgId) {
    if (!m || m.hidden) return;
    const sid = messageSid(m);
    if (isBlocked(sid)) return;
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
    if (msgId && sid && sid !== mySid) {
      const safety = document.createElement("button");
      safety.type = "button";
      safety.className = "chat-report-btn chat-safety-btn";
      safety.title = tChat("chatReportSafety");
      safety.textContent = "⚠";
      safety.addEventListener("click", () => openChildSafetyReport(msgId));
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
        blockMessage(msgId, sid);
        line.remove();
      });
      line.appendChild(blk);
    }
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  async function blockMessage(msgId, sid) {
    if (!useSafeChat()) return;
    const body = sid ? { sid } : { msgId };
    const { json } = await api("/api/chat/block", body);
    if (json.ok && json.sid) {
      blockedSids[json.sid] = true;
    }
  }

  function listenChat() {
    if (!useSafeChat()) return;
    const db = window.db;
    if (!db) return;
    db.ref(chatPath).limitToLast(25).on("child_added", s => {
      appendMessageLine(s.val(), s.key);
    });
  }

  async function ensureAge13Declared() {
    if (!useSafeChat()) return false;
    const { json } = await api("/api/chat/declare-age13", { confirmed: true });
    return json.ok === true;
  }

  async function sendPhrase(phraseId) {
    if (!useSafeChat()) {
      showNotSent();
      return;
    }
    await ensureAge13Declared();
    const { json } = await api("/api/chat/send", {
      phraseId,
      lang: typeof window.getLanguage === "function" ? window.getLanguage() : "en"
    });
    if (!json.ok) showNotSent();
    return json;
  }

  async function sendFreeText(text) {
    if (!useSafeChat()) {
      showNotSent();
      return;
    }
    await ensureAge13Declared();
    const { json } = await api("/api/chat/send", {
      text,
      lang: typeof window.getLanguage === "function" ? window.getLanguage() : "en"
    });
    if (!json.ok) showNotSent();
    return json;
  }

  async function reportMessage(msgId, category, subcategory) {
    if (!useSafeChat()) return;
    const body = { msgId };
    if (category) body.category = category;
    if (subcategory) body.subcategory = subcategory;
    const { json } = await api("/api/chat/report", body);
    if (typeof window.toast === "function") {
      if (json.messageKey === "thanks_received" || category === "child_safety" || subcategory) {
        window.toast(tChat("chatReportSafetyThanks"));
      } else {
        window.toast(tChat("chatReported"));
      }
    }
    return json;
  }

  function openChildSafetyReport(msgId) {
    const subs = config.childSafetySubcategories || [
      "immediate_danger",
      "sexual_exploitation",
      "grooming",
      "violence_threat",
      "other_child_safety"
    ];
    const labels = {
      immediate_danger: tChat("chatSafetyImmediate"),
      sexual_exploitation: tChat("chatSafetySexual"),
      grooming: tChat("chatSafetyGrooming"),
      violence_threat: tChat("chatSafetyViolence"),
      other_child_safety: tChat("chatSafetyOther")
    };
    const pick = window.prompt(
      [tChat("chatSafetyPickTitle"), ...subs.map(s => `- ${labels[s] || s}`)].join("\n"),
      "1"
    );
    if (pick == null) return;
    const idx = parseInt(pick, 10);
    const sub = Number.isFinite(idx) && idx >= 1 && idx <= subs.length ? subs[idx - 1] : subs[0];
    reportMessage(msgId, sub, sub);
  }

  function init(opts) {
    if (opts?.workerUrl) workerUrl = opts.workerUrl;
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
    blockMessage,
    isBlocked,
    useSafeChat,
    refreshConfig,
    appendMessageLine,
    listenChat
  };
})();
