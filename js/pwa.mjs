/** PWA install prompt, service worker, share game */

let deferredInstall = null;

function shareUrl() {
  try {
    const u = new URL(location.href);
    u.searchParams.delete("test");
    return u.origin + u.pathname + (u.search || "");
  } catch (e) {
    return location.origin + "/index.html";
  }
}

function drawQr(canvas, text) {
  const size = 200;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    ctx.drawImage(img, 0, 0, size, size);
  };
  img.onerror = () => {
    ctx.fillStyle = "#111";
    ctx.font = "12px sans-serif";
    ctx.fillText("QR unavailable", 40, 100);
  };
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}

export async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) {
          window.toast?.("Новая версия загружена — обновите страницу");
        }
      });
    });
  } catch (e) {
    console.warn("SW register failed", e);
  }
}

export function openShareGameModal() {
  const url = shareUrl();
  const dlg = document.getElementById("shareModal");
  const link = document.getElementById("shareLinkField");
  const qr = document.getElementById("shareQrCanvas");
  if (link) link.value = url;
  if (qr) drawQr(qr, url);
  dlg?.classList.add("active");
}

export function initPwaUi() {
  registerServiceWorker();
  window.openShareGameModal = openShareGameModal;

  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    deferredInstall = e;
    const btn = document.getElementById("btnInstallApp");
    if (btn) btn.hidden = false;
  });

  document.getElementById("btnInstallApp")?.addEventListener("click", async () => {
    if (!deferredInstall) {
      window.toast?.("Установка: меню браузера → «Установить» / «На экран Домой»");
      return;
    }
    deferredInstall.prompt();
    await deferredInstall.userChoice;
    deferredInstall = null;
    const btn = document.getElementById("btnInstallApp");
    if (btn) btn.hidden = true;
  });

  document.getElementById("btnShareGame")?.addEventListener("click", async () => {
    const url = shareUrl();
    const title = "PUNK ME";
    const text = "Играй в неоновую панк-банду — PUNK ME";
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if (e.name === "AbortError") return;
      }
    }
    openShareGameModal();
    try {
      await navigator.clipboard.writeText(url);
      window.toast?.("Ссылка скопирована");
    } catch (e) { /* ignore */ }
  });

  document.getElementById("shareCopyBtn")?.addEventListener("click", async () => {
    const link = document.getElementById("shareLinkField");
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.value);
      window.toast?.("Ссылка скопирована");
    } catch (e) {
      link.select();
    }
  });

  document.getElementById("shareCloseBtn")?.addEventListener("click", () => {
    document.getElementById("shareModal")?.classList.remove("active");
  });
}
