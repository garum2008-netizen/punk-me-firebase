/* Legacy Voice facade — delegates to AudioManager when loaded. */
const Voice = (() => {
  function am() {
    return window.AudioManager;
  }

  function loadSettings() {
    /* AudioManager owns persistence */
  }

  function setMuted(m) {
    if (am()) am().setMuted(!!m);
  }

  function setVolume(v) {
    if (am()) am().setChannelVolume("speech", v);
  }

  function speak(text, characterId, onEnd) {
    if (!text) {
      onEnd?.();
      return;
    }
    const mgr = am();
    if (!mgr) {
      onEnd?.();
      return;
    }
    const hash = Math.abs([...text].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0));
    const id = `legacy_${characterId || "npc"}_${hash}`;
    mgr.addEventListener(
      "onLineEnd",
      ev => {
        if (ev.detail?.id === id) onEnd?.();
      },
      { once: true }
    );
    mgr.playLine(id, { subtitle: text, characterId });
  }

  function speakCharacter(characterId, text) {
    speak(text, characterId, () => {
      if (window.World3D?.setTalking) World3D.setTalking(null, false);
    });
    if (window.World3D?.setTalking) World3D.setTalking(characterId, true);
  }

  function isSpeaking() {
    return false;
  }

  loadSettings();
  return {
    speak,
    speakCharacter,
    setMuted,
    setVolume,
    isSpeaking,
    getVolume: () => am()?.getChannelVolume("speech") ?? 1,
    getMuted: () => am()?.getMuted() ?? true
  };
})();

window.Voice = Voice;
