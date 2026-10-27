/** Shared keyboard + pointer orbit state for World3D. */
const state = {
  w: false, a: false, s: false, d: false,
  arrowup: false, arrowdown: false, arrowleft: false, arrowright: false,
  shift: false,
  jump: false,
  interact: false,
  moveX: 0,
  moveZ: 0,
  run: false,
  touchX: 0,
  touchZ: 0,
  touchRun: false,
  touchActive: false
};

let orbitCb = null;
let orbitDragging = false;
let lastX = 0;

export function getInputState() {
  if (state.touchActive) {
    state.moveX = state.touchX;
    state.moveZ = state.touchZ;
    state.run = state.touchRun;
    return state;
  }
  const up = state.w || state.arrowup;
  const down = state.s || state.arrowdown;
  const left = state.a || state.arrowleft;
  const right = state.d || state.arrowright;
  state.moveX = (right ? 1 : 0) - (left ? 1 : 0);
  state.moveZ = (down ? 1 : 0) - (up ? 1 : 0);
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

function gameplayInputBlocked() {
  if (document.body?.dataset?.gamePaused === "1") return true;
  if (document.querySelector(".modal.active, #startGameOverlay.active")) return true;
  return false;
}

function onKeyDown(e) {
  if (e.target?.matches?.("input, textarea, select")) return;
  if (gameplayInputBlocked()) return;
  if (e.code === "KeyW") state.w = true;
  if (e.code === "KeyA") state.a = true;
  if (e.code === "KeyS") state.s = true;
  if (e.code === "KeyD") state.d = true;
  if (e.code === "ArrowUp") state.arrowup = true;
  if (e.code === "ArrowDown") state.arrowdown = true;
  if (e.code === "ArrowLeft") state.arrowleft = true;
  if (e.code === "ArrowRight") state.arrowright = true;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") state.shift = true;
  if (e.code === "Space") { state.jump = true; e.preventDefault(); }
  if (e.code === "KeyE" && !e.repeat) state.interact = true;
}

function onKeyUp(e) {
  if (e.code === "KeyW") state.w = false;
  if (e.code === "KeyA") state.a = false;
  if (e.code === "KeyS") state.s = false;
  if (e.code === "KeyD") state.d = false;
  if (e.code === "ArrowUp") state.arrowup = false;
  if (e.code === "ArrowDown") state.arrowdown = false;
  if (e.code === "ArrowLeft") state.arrowleft = false;
  if (e.code === "ArrowRight") state.arrowright = false;
  if (e.code === "ShiftLeft" || e.code === "ShiftRight") state.shift = false;
  if (e.code === "KeyE") state.interact = false;
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
  state.touchX = x;
  state.touchZ = z;
  state.touchRun = !!run;
  state.touchActive = Math.abs(x) > 0.04 || Math.abs(z) > 0.04;
}

export function touchJump() {
  state.jump = true;
}

export function touchInteract() {
  state.interact = true;
}
