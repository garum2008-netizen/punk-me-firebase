/* Subtitles + speech — delegates to AudioManager / SpeechBridge when loaded. */
const Voice = (() => {
  function mgr() {
    return window.AudioManager;
  }

  function bridge() {
    return window.SpeechBridge;
  }

  function speak(text, characterId, onEnd) {
    if (!text) {
      onEnd?.();
      return;
    }
    const am = mgr();
    const sb = bridge();
    if (!am || !sb?.play) {
      onEnd?.();
      return;
    }
    if (!am.isUnlocked()) {
      onEnd?.();
      return;
    }
    const handle = sb.play({
      text,
      characterId,
      onEnd
    });
    if (handle?.cancel && onEnd) {
      am.addEventListener(
        "onLineEnd",
        ev => {
          if (ev.detail?.subtitle?.includes(text) || ev.detail?.id) onEnd();
        },
        { once: true }
      );
    }
  }

  function speakCharacter(characterId, text) {
    speak(text, characterId, () => {
      if (window.World3D?.setTalking) World3D.setTalking(null, false);
    });
    if (window.World3D?.setTalking) World3D.setTalking(characterId, true);
  }

  function setMuted(m) {
    mgr()?.setMuted?.(!!m);
  }

  function setVolume(v) {
    mgr()?.setChannelVolume?.("speech", v);
  }

  function isSpeaking() {
    return false;
  }

  return {
    speak,
    speakCharacter,
    setMuted,
    setVolume,
    isSpeaking,
    getVolume: () => mgr()?.getChannelVolume?.("speech") ?? 1,
    getMuted: () => mgr()?.getMuted?.() ?? true
  };
})();

window.Voice = Voice;
