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

  const joyDown = e => {
    active = true;
    joyId = e.pointerId != null ? e.pointerId : 1;
    const r = joy.getBoundingClientRect();
    joyOrigin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    if (joy.setPointerCapture && e.pointerId != null) joy.setPointerCapture(e.pointerId);
    moveKnob(e, knob, maxR);
  };
  joy.addEventListener("pointerdown", joyDown);
  joy.addEventListener("mousedown", e => {
    if (e.button !== 0) return;
    joyDown({ ...e, pointerId: 1, clientX: e.clientX, clientY: e.clientY });
  });
  const joyMove = e => {
    if (e.pointerId != null && e.pointerId !== joyId) return;
    if (e.pointerId == null && joyId !== 1) return;
    moveKnob(e, knob, maxR);
  };
  joy.addEventListener("pointermove", joyMove);
  joy.addEventListener("mousemove", e => {
    if (joyId !== 1) return;
    joyMove({ ...e, pointerId: 1 });
  });
  const joyUp = e => {
    if (e.pointerId != null && e.pointerId !== joyId) return;
    joyId = null;
    resetKnob();
  };
  joy.addEventListener("pointerup", joyUp);
  joy.addEventListener("mouseup", e => {
    if (joyId !== 1) return;
    joyUp({ ...e, pointerId: 1 });
  });
  joy.addEventListener("pointercancel", resetKnob);

  interact?.addEventListener("click", () => touchInteract());

  const jumpBtn = document.getElementById("touchJump");
  jumpBtn?.addEventListener("pointerdown", e => {
    e.preventDefault();
    touchJump();
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

function moveKnob(e, knob, maxR) {
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
}
