/** Injected into browser for full-length episode audio capture. */
function episode1AudioInitScript(port) {
  const endpoint = `http://127.0.0.1:${port}/chunk`;
  window.__ep1AudioEndpoint = endpoint;
  window.__ep1CaptureActive = false;

  window.__ep1StartAudioCapture = async function resume() {
    await window.AudioManager?.unlockAudio?.();
    window.AudioManager?.installCaptureTap?.();
    const loc = window.me?.location || "room";
    window.AudioManager?.setLocationMusic?.(loc);
    if (window.AudioManager?.setChannelVolume) {
      window.AudioManager.setChannelVolume("music", 0.82);
      window.AudioManager.setChannelVolume("sfx", 0.88);
      window.AudioManager.setChannelVolume("speech", 0.9);
    }
    const stream = window.AudioManager?.installCaptureTap?.();
    if (!stream) return { ok: false, reason: "no stream" };
    if (window.__ep1AudioRecorder) {
      try {
        window.__ep1AudioRecorder.stop();
      } catch (e) {}
    }
    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    const rec = new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 160000 });
    rec.ondataavailable = e => {
      if (!e.data?.size) return;
      fetch(endpoint, { method: "POST", body: e.data, mode: "cors" }).catch(() => {});
    };
    rec.start(200);
    window.__ep1AudioRecorder = rec;
    window.__ep1CaptureActive = true;
    return { ok: true, resume: !!resume };
  };

  window.__ep1StopAudioCapture = async function () {
    window.__ep1CaptureActive = false;
    const rec = window.__ep1AudioRecorder;
    if (!rec) return;
    await new Promise(resolve => {
      rec.onstop = resolve;
      try {
        rec.stop();
      } catch (e) {
        resolve();
      }
    });
    window.__ep1AudioRecorder = null;
  };

  window.addEventListener("pageshow", () => {
    if (window.__ep1CaptureActive && document.documentElement.classList.contains("episode-capture")) {
      window.__ep1StartAudioCapture(true);
    }
  });
}

module.exports = { episode1AudioInitScript };
