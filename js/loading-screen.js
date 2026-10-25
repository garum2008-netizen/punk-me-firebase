/**
 * Boot / loading failure UI — error kinds: webgl, auth, network, save, timeout, unknown.
 */
(function () {
  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  const WEBGL_TEST_URL = "https://get.webgl.org/webgl/";
  const ERROR_KINDS = ["webgl", "auth", "network", "save", "timeout", "unknown"];

  function classifyBootError(message, code) {
    const c = (code || "").toLowerCase();
    const m = (message || "").toLowerCase();
    if (c === "webgl" || /webgl|webgpu|creating webgl context|failed to create webgl/.test(m)) return "webgl";
    if (c === "auth" || /auth|permission_denied|signin|sign-in|id-token|unauthorized/.test(m)) return "auth";
    if (c === "network" || /network|timeout|failed to fetch|offline|enetunreach/.test(m)) return "network";
    if (c === "timeout" || /timeout|too long/.test(m)) return "timeout";
    if (c === "save" || /save|snapshot|migrate|player/.test(m)) return "save";
    return "unknown";
  }

  function probeWebGL() {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ||
        canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ||
        canvas.getContext("experimental-webgl");
      if (!gl) return { ok: false, reason: "no_context" };
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "unknown";
      return { ok: true, renderer: String(renderer || "unknown") };
    } catch (e) {
      return { ok: false, reason: e.message || String(e) };
    }
  }

  function collectSupportInfo(kind, detail) {
    const webgl = probeWebGL();
    const nav = navigator;
    const ua = nav.userAgent || "";
    const lang = typeof getLanguage === "function" ? getLanguage() : "ru";
    return {
      kind: kind || "unknown",
      detail: detail || "",
      siteVersion: window.GAME_VERSION || document.getElementById("gameVersion")?.textContent || "unknown",
      commit: document.querySelector('meta[name="punkme-commit"]')?.content || "",
      language: lang,
      webgl: webgl.ok ? "yes" : "no",
      webglRenderer: webgl.renderer || webgl.reason || "",
      userAgent: ua,
      platform: nav.platform || "",
      hardwareConcurrency: nav.hardwareConcurrency || "",
      deviceMemory: nav.deviceMemory || "",
      timestamp: new Date().toISOString()
    };
  }

  function supportBlockText(info) {
    return [
      `error: ${info.kind}`,
      `site: ${info.siteVersion}`,
      info.commit ? `commit: ${info.commit}` : null,
      `webgl: ${info.webgl} (${info.webglRenderer})`,
      `lang: ${info.language}`,
      `platform: ${info.platform}`,
      `ua: ${info.userAgent}`,
      info.detail ? `detail: ${info.detail}` : null,
      `at: ${info.timestamp}`
    ]
      .filter(Boolean)
      .join("\n");
  }

  function titleForKind(kind) {
    const k = `boot_title_${kind}`;
    return typeof t === "function" && t(k) !== k ? t(k) : kind;
  }

  function bodyForKind(kind) {
    const k = `boot_body_${kind}`;
    return typeof t === "function" && t(k) !== k ? t(k) : "";
  }

  function showBootFailure(kind, detail, opts = {}) {
    const resolved = ERROR_KINDS.includes(kind) ? kind : classifyBootError(detail, opts.code);
    const info = collectSupportInfo(resolved, detail);
    const el = document.getElementById("loading");
    if (!el) return;
    el.style.display = "flex";
    const showFresh = resolved === "save" || resolved === "timeout" || resolved === "unknown";
    const retryHint =
      resolved === "webgl"
        ? typeof t === "function"
          ? t("boot_retry_webgl_hint")
          : ""
        : typeof t === "function"
          ? t("boot_retry_default_hint")
          : "";
    el.innerHTML = `<div style="font-size:22px;font-weight:800;color:#ff00ff">PUNK ME</div>
      <h2 class="loading-boot-title">${escapeHtml(titleForKind(resolved))}</h2>
      <p class="loading-error">${escapeHtml(bodyForKind(resolved))}</p>
      ${detail && resolved !== "webgl" ? `<p class="loading-error-detail">${escapeHtml(detail)}</p>` : ""}
      ${resolved === "webgl" ? `<p class="loading-boot-tips">${escapeHtml(typeof t === "function" ? t("boot_webgl_tips") : "")}</p>
        <p class="loading-boot-link"><a href="${WEBGL_TEST_URL}" target="_blank" rel="noopener">${escapeHtml(typeof t === "function" ? t("boot_webgl_test_link") : "WebGL test")}</a></p>` : ""}
      ${retryHint ? `<p class="loading-boot-retry-hint">${escapeHtml(retryHint)}</p>` : ""}
      <p class="loading-boot-support-label">${escapeHtml(typeof t === "function" ? t("boot_support_label") : "Support details")}</p>
      <pre class="loading-support-dump" id="loadingSupportDump">${escapeHtml(supportBlockText(info))}</pre>
      <div class="loading-actions">
        <button type="button" class="btn" id="loadingRetryBtn">${escapeHtml(typeof t === "function" ? t("loading_retry") : "Retry")}</button>
        <button type="button" class="btn secondary" id="loadingCopySupportBtn">${escapeHtml(typeof t === "function" ? t("boot_copy_support") : "Copy")}</button>
        ${showFresh ? `<button type="button" class="btn secondary" id="loadingFreshBtn">${escapeHtml(typeof t === "function" ? t("loading_fresh") : "Fresh")}</button>` : ""}
      </div>
      <div class="legal-footer legal-footer-start">
        <span class="age-badge-inline" data-i18n="age_13">13+</span>
        <a href="subscribe.html" data-i18n="footer_subscribe">${escapeHtml(typeof t === "function" ? t("footer_subscribe") : "")}</a>
      </div>`;
    if (typeof applyI18nDom === "function") applyI18nDom();

    document.getElementById("loadingCopySupportBtn")?.addEventListener("click", () => {
      const text = document.getElementById("loadingSupportDump")?.textContent || "";
      navigator.clipboard?.writeText(text).catch(() => {});
    });
    document.getElementById("loadingRetryBtn")?.addEventListener("click", () => {
      if (resolved === "webgl") {
        const again = probeWebGL();
        if (!again.ok) return;
      }
      if (typeof window.__punkRestoreLoadingMarkup === "function") window.__punkRestoreLoadingMarkup();
      if (typeof window.__punkLoadMe === "function") window.__punkLoadMe();
      else location.reload();
    });
    document.getElementById("loadingFreshBtn")?.addEventListener("click", () => {
      if (typeof window.__punkStartFreshPlayerKeepAccount === "function") {
        window.__punkStartFreshPlayerKeepAccount();
      } else location.reload();
    });
  }

  window.__punkClassifyBootError = classifyBootError;
  window.__punkProbeWebGL = probeWebGL;
  window.__punkCollectSupportInfo = collectSupportInfo;
  window.__punkShowBootFailure = showBootFailure;
})();
