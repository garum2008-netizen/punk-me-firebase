import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

/** Subtle bloom — neon/portals only (high threshold). */
export function createAtmospherePipeline(renderer, scene, camera, enabled) {
  if (!enabled) return { composer: null, resize: () => {} };
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(renderer.domElement.width, renderer.domElement.height),
    0.32,
    0.45,
    0.86
  );
  composer.addPass(bloom);
  return {
    composer,
    resize(w, h) {
      composer.setSize(w, h);
      bloom.resolution.set(w, h);
    }
  };
}

export function renderAtmosphere(pipe, renderer, scene, camera) {
  if (pipe?.composer) pipe.composer.render();
  else renderer.render(scene, camera);
}
