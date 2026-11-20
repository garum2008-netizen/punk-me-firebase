import assert from "node:assert/strict";
import { ANGELINA_VOICE } from "../js/angelina-voice-config.mjs";
import { resolveClip } from "../js/story/angelina-voice.mjs";

assert.equal(ANGELINA_VOICE.provider, "espeak");
assert.equal(ANGELINA_VOICE.candidate, "");
assert.deepEqual(resolveClip(ANGELINA_VOICE, "en", "angelina_idle"), {
  url: "assets/audio/voice/en/angelina_idle.wav",
  fallback: ""
});
assert.deepEqual(resolveClip({ candidate: "azure-ava" }, "da", "angelina_finale"), {
  url: "assets/audio/voice/candidates/azure-ava/da/angelina_finale.mp3",
  fallback: "assets/audio/voice/da/angelina_finale.wav"
});
assert.equal(resolveClip({ candidate: "azure-emma" }, "fr", "angelina_idle").url.includes("/ru/"), true);
console.log("voice config ok");
