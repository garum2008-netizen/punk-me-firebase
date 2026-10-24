const STORAGE_KEY = "punkme_howto_seen";

function isTouchPrimary() {
  return window.matchMedia("(max-width: 900px)").matches
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1100);
}

function howToHtml() {
  const touch = isTouchPrimary();
  const title = typeof t === "function" ? t("howto_title") : "How to play";
  const goal = typeof t === "function" ? t("howto_goal") : "";
  const body = touch
    ? (typeof t === "function" ? t("howto_body_touch") : "")
    : (typeof t === "function" ? t("howto_body_desktop") : "");
  const btn = typeof t === "function" ? t("howto_gotit") : "Got it";
  const ver = document.getElementById("gameVersion")?.textContent || "";
  const mobileExtras = touch
    ? `<div class="howto-extras">
      <div class="lang-switch" id="howtoLangSwitch">
        <button type="button" class="lang-btn" data-lang="ru">RU</button>
        <button type="button" class="lang-btn" data-lang="en">EN</button>
        <button type="button" class="lang-btn" data-lang="da">DA</button>
      </div>
      <button type="button" class="lang-btn" id="howtoVoiceMute">${typeof t === "function" ? t("voice_mute") : "Mute"}</button>
      <button type="button" class="lang-btn" id="howtoChangeChar">${typeof t === "function" ? t("char_change_btn") : "Change hero"}</button>
      <div class="badge hud-version">v <strong>${ver}</strong></div>
    </div>`
    : "";
  return `<div class="howto-panel" role="dialog" aria-labelledby="howtoTitle">
    <h2 id="howtoTitle">${title}</h2>
    <p class="howto-goal">${goal}</p>
    <pre class="howto-controls">${body}</pre>
    ${mobileExtras}
    <button type="button" class="btn howto-close">${btn}</button>
  </div>`;
}

function openHowTo() {
  const el = document.getElementById("howToOverlay");
  if (!el) return;
  el.innerHTML = howToHtml();
  el.classList.add("active");
  el.querySelector(".howto-close")?.addEventListener("click", () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch (e) {}
    el.classList.remove("active");
  });
  el.querySelectorAll("#howtoLangSwitch .lang-btn").forEach(btn => {
    btn.onclick = () => typeof setLanguage === "function" && setLanguage(btn.dataset.lang, true);
  });
  el.querySelector("#howtoVoiceMute")?.addEventListener("click", () => window.toggleVoiceMute?.());
  el.querySelector("#howtoChangeChar")?.addEventListener("click", () => {
    el.classList.remove("active");
    window.changeCharacter?.();
  });
}

function initHowToPlay() {
  const btn = document.getElementById("btnHowTo");
  btn?.addEventListener("click", openHowTo);
  let seen = false;
  try { seen = localStorage.getItem(STORAGE_KEY) === "1"; } catch (e) {}
  if (!seen) {
    setTimeout(openHowTo, 800);
  }
}

window.openHowToPlay = openHowTo;
window.initHowToPlay = initHowToPlay;
export { initHowToPlay, openHowTo };
