import { setTouchMove, touchInteract, touchJump } from "./controls-3d.mjs";

let active = false;
const touchJoySmooth = { x: 0, y: 0 };
let joyId = null;
let joyOrigin = { x: 0, y: 0 };
let camId = null;
let camLastX = 0;
let onCamera;

export function initTouchControls(opts = {}) {
  onCamera = opts.onCameraOrbit;
  const wrap = document.getElementById("touchControls");
  if (!wrap) return;
  const joy = document.getElementById("touchJoystick");
  const knob = document.getElementById("touchJoystickKnob");
  const interact = document.getElementById("touchInteract");
  if (!joy || !knob) return;

  const maxR = 42;
  const resetKnob = () => {
    knob.style.transform = "translate(-50%, -50%)";
    touchJoySmooth.x = 0;
    touchJoySmooth.y = 0;
    setTouchMove(0, 0, false);
  };

  const moveKnob = e => {
    let dx = e.clientX - joyOrigin.x;
    let dy = e.clientY - joyOrigin.y;
    const len = Math.hypot(dx, dy);
    if (len > maxR) {
      dx = (dx / len) * maxR;
      dy = (dy / len) * maxR;
    }
    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    const rawNx = dx / maxR;
    const rawNy = -dy / maxR;
    touchJoySmooth.x = (touchJoySmooth.x || 0) * 0.55 + rawNx * 0.45;
    touchJoySmooth.y = (touchJoySmooth.y || 0) * 0.55 + rawNy * 0.45;
    const smLen = Math.hypot(touchJoySmooth.x, touchJoySmooth.y);
    const run = smLen > 0.58;
    setTouchMove(touchJoySmooth.x, touchJoySmooth.y, run);
  };

  const endJoy = e => {
    if (joyId != null && e.pointerId !== joyId) return;
    try {
      joy.releasePointerCapture(joyId);
    } catch (err) {}
    joyId = null;
    resetKnob();
  };

  joy.addEventListener("pointerdown", e => {
    active = true;
    joyId = e.pointerId;
    const r = joy.getBoundingClientRect();
    joyOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    joy.setPointerCapture(e.pointerId);
    moveKnob(e);
  });
  joy.addEventListener("pointermove", e => {
    if (e.pointerId !== joyId) return;
    moveKnob(e);
  });
  joy.addEventListener("pointerup", endJoy);
  joy.addEventListener("pointercancel", endJoy);

  interact?.addEventListener("click", e => {
    e.preventDefault();
    touchInteract();
  });

  const stage = document.getElementById("stage3d");
  stage?.addEventListener("pointerdown", e => {
    if (window.matchMedia("(min-width: 901px)").matches) return;
    const half = window.innerWidth / 2;
    if (e.clientX < half) return;
    camId = e.pointerId;
    camLastX = e.clientX;
    stage.setPointerCapture(e.pointerId);
  });
  stage?.addEventListener("pointermove", e => {
    if (e.pointerId !== camId || !onCamera) return;
    const dx = e.clientX - camLastX;
    camLastX = e.clientX;
    onCamera(-dx * 0.007);
  });
  stage?.addEventListener("pointerup", e => {
    if (e.pointerId === camId) camId = null;
  });
}
