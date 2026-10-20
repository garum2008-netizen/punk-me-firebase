import { setTouchMove, touchInteract, touchJump } from "./controls-3d.mjs";

let active = false;
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
    setTouchMove(0, 0, false);
  };

  joy.addEventListener("pointerdown", e => {
    active = true;
    joyId = e.pointerId;
    const r = joy.getBoundingClientRect();
    joyOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    joy.setPointerCapture(e.pointerId);
    moveKnob(e, knob, maxR);
  });
  joy.addEventListener("pointermove", e => {
    if (e.pointerId !== joyId) return;
    moveKnob(e, knob, maxR);
  });
  joy.addEventListener("pointerup", e => {
    if (e.pointerId !== joyId) return;
    joyId = null;
    resetKnob();
  });
  joy.addEventListener("pointercancel", resetKnob);

  interact?.addEventListener("click", () => touchInteract());

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

function moveKnob(e, knob, maxR) {
  let dx = e.clientX - joyOrigin.x;
  let dy = e.clientY - joyOrigin.y;
  const len = Math.hypot(dx, dy);
  if (len > maxR) {
    dx = (dx / len) * maxR;
    dy = (dy / len) * maxR;
  }
  knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  const nx = dx / maxR;
  const ny = -dy / maxR;
  const run = len > maxR * 0.72;
  setTouchMove(nx, ny, run);
}
