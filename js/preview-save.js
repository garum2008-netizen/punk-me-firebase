/**
 * Cloudflare Pages preview — local-only persistence (never Firebase).
 * Keys: punkme_preview_* namespace on this device only.
 */
(function () {
  const PLAYER_KEY = "punkme_preview_player_v1";
  const DEVICE_KEY = "punkme_preview_device_id";

  function randomId() {
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
    return "pv_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  window.PunkPreviewSave = {
    PLAYER_KEY,
    DEVICE_KEY,
    getDeviceId() {
      try {
        let id = localStorage.getItem(DEVICE_KEY);
        if (!id) {
          id = "preview_" + randomId();
          localStorage.setItem(DEVICE_KEY, id);
        }
        return id;
      } catch (_) {
        return "preview_ephemeral";
      }
    },
    load() {
      try {
        const raw = localStorage.getItem(PLAYER_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? parsed : null;
      } catch (_) {
        return null;
      }
    },
    save(payload) {
      try {
        localStorage.setItem(PLAYER_KEY, JSON.stringify(payload));
        return true;
      } catch (_) {
        return false;
      }
    },
    clear() {
      try {
        localStorage.removeItem(PLAYER_KEY);
      } catch (_) {}
    }
  };
})();
