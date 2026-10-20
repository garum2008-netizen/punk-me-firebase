/* Web Speech API — per-character pitch/rate, RU/EN/DA */
const Voice = (() => {
  let muted = false;
  let volume = 1;
  let speaking = false;
  let onEndCb = null;

  function loadSettings() {
    try {
      muted = localStorage.getItem("punkme_voice_mute") === "1";
      const v = parseFloat(localStorage.getItem("punkme_voice_vol"));
      if (!Number.isNaN(v)) volume = Math.max(0, Math.min(1, v));
    } catch (e) {}
  }

  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem("punkme_voice_mute", muted ? "1" : "0"); } catch (e) {}
    if (muted && window.speechSynthesis) speechSynthesis.cancel();
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    try { localStorage.setItem("punkme_voice_vol", String(volume)); } catch (e) {}
  }

  function langCode() {
    const l = typeof getLanguage === "function" ? getLanguage() : "en";
    return { ru: "ru-RU", en: "en-US", da: "da-DK" }[l] || "en-US";
  }

  function speak(text, characterId, onEnd) {
    if (!text || muted || !window.speechSynthesis) {
      onEnd?.();
      return;
    }
    const def = typeof getCharacterDef === "function" ? getCharacterDef(characterId) : { voice: { pitch: 1, rate: 1 } };
    const v = def.voice || { pitch: 1, rate: 1 };
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = langCode();
    u.pitch = v.pitch ?? 1;
    u.rate = v.rate ?? 1;
    u.volume = volume;
    speaking = true;
    onEndCb = onEnd;
    u.onend = () => { speaking = false; onEndCb?.(); onEndCb = null; };
    u.onerror = () => { speaking = false; onEndCb?.(); onEndCb = null; };
    speechSynthesis.speak(u);
  }

  function speakCharacter(characterId, text) {
    speak(text, characterId, () => {
      if (window.World3D?.setTalking) World3D.setTalking(null, false);
    });
    if (window.World3D?.setTalking) World3D.setTalking(characterId, true);
  }

  function isSpeaking() { return speaking; }

  loadSettings();
  return { speak, speakCharacter, setMuted, setVolume, isSpeaking, getVolume: () => volume, getMuted: () => muted };
})();

window.Voice = Voice;
