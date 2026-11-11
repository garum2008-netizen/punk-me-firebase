/** Keyboard and the virtual joystick keep separate vectors. Neither device wipes the other. */
const state = {
  w: false, a: false, s: false, d: false,
  arrowup: false, arrowdown: false, arrowleft: false, arrowright: false,
  shift: false,
  jump: false,
  interact: false,
  moveX: 0,
  moveZ: 0,
  run: false,
  source: "idle"
};

const touch = { x: 0, z: 0, run: false, active: false };

let orbitCb = null;
let orbitDragging = false;
let lastX = 0;

function keyboardVector() {
  const up = state.w || state.arrowup;
  const down = state.s || state.arrowdown;
  const left = state.a || state.arrowleft;
  const right = state.d || state.arrowright;
  return {
    x: (right ? 1 : 0) - (left ? 1 : 0),
    z: (up ? 1 : 0) - (down ? 1 : 0),
    run: state.shift
  };
}

function touchLayerEnabled() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(max-width: 900px)").matches;
}

export function getInputState() {
  const key = keyboardVector();
  if (key.x || key.z) {
    state.moveX = key.x;
    state.moveZ = key.z;
    state.run = key.run;
    state.source = "keyboard";
  } else if (touch.active && touchLayerEnabled()) {
    state.moveX = touch.x;
    state.moveZ = touch.z;
    state.run = touch.run;
    state.source = "touch";
  } else {
    state.moveX = 0;
    state.moveZ = 0;
    state.run = false;
    state.source = "idle";
  }
  return state;
}

/** Shared by key listeners and tests. Repeat on E does not re-arm interact. */
export function setKey(name, down, { repeat = false } = {}) {
  const on = !!down;
  if (name === "w" || name === "a" || name === "s" || name === "d") state[name] = on;
  if (name === "arrowup") state.arrowup = on;
  if (name === "arrowdown") state.arrowdown = on;
  if (name === "arrowleft") state.arrowleft = on;
  if (name === "arrowright") state.arrowright = on;
  if (name === "shift") state.shift = on;
  if (name === " " && on) state.jump = true;
  if (name === "e" && on && !repeat) state.interact = true;
  return getInputState();
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
  if (k === "w" || k === "a" || k === "s" || k === "d") setKey(k, true);
  if (e.key === "ArrowUp") setKey("arrowup", true);
  if (e.key === "ArrowDown") setKey("arrowdown", true);
  if (e.key === "ArrowLeft") setKey("arrowleft", true);
  if (e.key === "ArrowRight") setKey("arrowright", true);
  if (e.key === "Shift") setKey("shift", true);
  if (e.key === " ") { setKey(" ", true); e.preventDefault(); }
  if (k === "e") setKey("e", true, { repeat: !!e.repeat });
}

function onKeyUp(e) {
  const k = e.key.toLowerCase();
  if (k === "w" || k === "a" || k === "s" || k === "d") setKey(k, false);
  if (e.key === "ArrowUp") setKey("arrowup", false);
  if (e.key === "ArrowDown") setKey("arrowdown", false);
  if (e.key === "ArrowLeft") setKey("arrowleft", false);
  if (e.key === "ArrowRight") setKey("arrowright", false);
  if (e.key === "Shift") setKey("shift", false);
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

/** Virtual joystick. Does not clear keyboard flags. */
export function setTouchMove(x, z, run) {
  touch.x = x;
  touch.z = z;
  touch.run = !!run;
  touch.active = Math.hypot(x, z) > 0.02;
}

export function touchJump() {
  state.jump = true;
}

export function touchInteract() {
  state.interact = true;
}
