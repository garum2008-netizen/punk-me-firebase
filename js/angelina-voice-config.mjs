/**
 * Angelina's voice. Change this file only.
 * Leave candidate empty to keep the espeak-ng wavs.
 * Set candidate to "azure-ava", "azure-emma", or "azure-libby"
 * to play the free preview files in
 * assets/audio/voice/candidates/<candidate>/{ru,en,da}/.
 * A missing preview file falls back to the espeak wav.
 * Those previews are Microsoft neural voices rendered with Edge TTS.
 * They are not an Azure Speech licence. A paid voice still needs an owner GO.
 */
export const ANGELINA_VOICE = {
  provider: "espeak",
  candidate: ""
};
