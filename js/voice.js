/* Subtitles + optional pre-rendered clips (no live speechSynthesis — choppy TTS removed). */
const Voice = (() => {
  let muted = true;
  let volume = 1;
  let queue = [];
  let playing = false;
  const audio = typeof Audio !== "undefined" ? new Audio() : null;

  function loadSettings() {
    try {
      const m = localStorage.getItem("punkme_voice_mute");
      muted = m === null ? true : m === "1";
      const v = parseFloat(localStorage.getItem("punkme_voice_vol"));
      if (!Number.isNaN(v)) volume = Math.max(0, Math.min(1, v));
    } catch (e) {}
  }

  function setMuted(m) {
    muted = !!m;
    try { localStorage.setItem("punkme_voice_mute", muted ? "1" : "0"); } catch (e) {}
    if (muted && audio) {
      audio.pause();
      queue = [];
      playing = false;
    }
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    try { localStorage.setItem("punkme_voice_vol", String(volume)); } catch (e) {}
    if (audio) audio.volume = volume;
  }

  function langKey() {
    const l = typeof getLanguage === "function" ? getLanguage() : "en";
    return l === "ru" ? "ru" : l === "da" ? "da" : "en";
  }

  function showSubtitle(text, characterId) {
    const el = document.getElementById("voiceSubtitle");
    if (el) {
      const name = characterId && typeof tNpcName === "function" ? tNpcName(characterId) : "";
      el.textContent = name ? `${name}: ${text}` : text;
      el.classList.add("visible");
      clearTimeout(el._hideT);
      el._hideT = setTimeout(() => el.classList.remove("visible"), Math.max(2200, text.length * 45));
    }
  }

  function clipUrl(characterId, text) {
    const lang = langKey();
    const hash = Math.abs([...text].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0));
    return `assets/audio/voice/${lang}/${characterId || "npc"}_${hash}.ogg`;
  }

  function playNext() {
    if (!audio || !queue.length || muted) {
      playing = false;
      return;
    }
    playing = true;
    const { url, text, characterId, onEnd } = queue.shift();
    audio.src = url;
    audio.volume = volume;
    audio.onended = () => {
      playing = false;
      onEnd?.();
      playNext();
    };
    audio.onerror = () => {
      playing = false;
      onEnd?.();
      playNext();
    };
    audio.play().catch(() => {
      playing = false;
      onEnd?.();
      playNext();
    });
  }

  function speak(text, characterId, onEnd) {
    if (!text) { onEnd?.(); return; }
    showSubtitle(text, characterId);
    if (muted || !audio) {
      onEnd?.();
      return;
    }
    const url = clipUrl(characterId, text);
    queue.push({ url, text, characterId, onEnd });
    if (!playing) playNext();
  }

  function speakCharacter(characterId, text) {
    speak(text, characterId, () => {
      if (window.World3D?.setTalking) World3D.setTalking(null, false);
    });
    if (window.World3D?.setTalking) World3D.setTalking(characterId, true);
  }

  function isSpeaking() { return playing; }

  loadSettings();
  return {
    speak,
    speakCharacter,
    setMuted,
    setVolume,
    isSpeaking,
    getVolume: () => volume,
    getMuted: () => muted
  };
})();

window.Voice = Voice;
