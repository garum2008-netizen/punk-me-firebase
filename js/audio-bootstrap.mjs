import { initAudioManager } from "./audio-manager.mjs";
import { initAudioSettingsUi } from "./audio-settings-ui.mjs";
import { initSpeechBridge } from "./speech-bridge.mjs";
import { initNarrator } from "./narrator.mjs";
import { initStoryGoalHud } from "./story/story-goal-hud.mjs";
import { initStorySpine } from "./story/story-spine.mjs";
import { initGameMenu, showStartGameOverlay } from "./game-menu.mjs";

initAudioManager();
initAudioSettingsUi();
initSpeechBridge().catch(e => console.warn("speech-bridge", e));
initNarrator();
initStoryGoalHud();
initStorySpine();
initGameMenu();
window.__punkShowStartGameOverlay = showStartGameOverlay;

function unlockOnGesture() {
  const am = window.AudioManager;
  if (!am || am.isUnlocked()) return;
  am.unlockAudio().then(ok => {
    if (ok) am.setLocationMusic?.(window.me?.location || "room");
    window.Narrator?.refresh?.();
  });
}

document.addEventListener("pointerdown", unlockOnGesture, { once: true, passive: true });
document.addEventListener("keydown", unlockOnGesture, { once: true });
