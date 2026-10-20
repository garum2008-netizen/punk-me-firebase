/** Shared keyboard + pointer orbit state for World3D. */
const state = {
  w: false, a: false, s: false, d: false,
  arrowup: false, arrowdown: false, arrowleft: false, arrowright: false,
  shift: false,
  jump: false,
  interact: false,
  moveX: 0,
  moveZ: 0,
  run: false
};

let orbitCb = null;
let orbitDragging = false;
let lastX = 0;

export function getInputState() {
  const up = state.w || state.arrowup;
  const down = state.s || state.arrowdown;
  const left = state.a || state.arrowleft;
  const right = state.d || state.arrowright;
  state.moveX = (right ? 1 : 0) - (left ? 1 : 0);
  state.moveZ = (up ? 1 : 0) - (down ? 1 : 0);
  state.run = state.shift;
  return state;
}

export function consumeJump() {
  if (!state.jump) return false;
  state.jump = false;
  return true;
}

export function consumeInteract() {
  if (!state.interact) return false;
  state.interact = false;
  return true;
}

export function initControls3D(canvas, onOrbitDelta) {
  orbitCb = onOrbitDelta;
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  canvas.addEventListener("pointerdown", onPtrDown);
  canvas.addEventListener("pointermove", onPtrMove);
  canvas.addEventListener("pointerup", onPtrUp);
  canvas.addEventListener("pointercancel", onPtrUp);
}

function onKeyDown(e) {
  if (e.target?.matches?.("input, textarea, select")) return;
  const k = e.key.toLowerCase();
  if (k === "w" || k === "a" || k === "s" || k === "d") state[k] = true;
  if (e.key === "ArrowUp") state.arrowup = true;
  if (e.key === "ArrowDown") state.arrowdown = true;
  if (e.key === "ArrowLeft") state.arrowleft = true;
  if (e.key === "ArrowRight") state.arrowright = true;
  if (e.key === "Shift") state.shift = true;
  if (e.key === " ") { state.jump = true; e.preventDefault(); }
  if (k === "e") state.interact = true;
}

function onKeyUp(e) {
  const k = e.key.toLowerCase();
  if (k === "w" || k === "a" || k === "s" || k === "d") state[k] = false;
  if (e.key === "ArrowUp") state.arrowup = false;
  if (e.key === "ArrowDown") state.arrowdown = false;
  if (e.key === "ArrowLeft") state.arrowleft = false;
  if (e.key === "ArrowRight") state.arrowright = false;
  if (e.key === "Shift") state.shift = false;
}

function onPtrDown(e) {
  if (e.button === 2 || e.button === 1 || e.altKey) {
    orbitDragging = true;
    lastX = e.clientX;
    e.target.setPointerCapture?.(e.pointerId);
  }
}

function onPtrMove(e) {
  if (!orbitDragging || !orbitCb) return;
  const dx = e.clientX - lastX;
  lastX = e.clientX;
  orbitCb(-dx * 0.006);
}

function onPtrUp() {
  orbitDragging = false;
}

/** Touch layer fills move/run (joystick). */
export function setTouchMove(x, z, run) {
  state.moveX = x;
  state.moveZ = z;
  state.run = !!run;
}

export function touchJump() {
  state.jump = true;
}

export function touchInteract() {
  state.interact = true;
}
