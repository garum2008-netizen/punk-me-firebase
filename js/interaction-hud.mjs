/** Explicit «Говорить» / Talk control (MASTER TZ §5.1). */

function talkToNearestNpc() {
  const nid = window.World3D?.getNearestNpc?.();
  if (nid && window.openNpcDialog) {
    window.openNpcDialog(nid);
    return true;
  }
  window.toast?.(typeof t === "function" ? t("hint_no_npc_near") : "No one nearby");
  return false;
}

export function initInteractionHud() {
  document.getElementById("btnTalk")?.addEventListener("click", e => {
    e.preventDefault();
    talkToNearestNpc();
  });
  document.getElementById("touchTalk")?.addEventListener("click", e => {
    e.preventDefault();
    talkToNearestNpc();
  });
  document.getElementById("touchJump")?.addEventListener("click", e => {
    e.preventDefault();
    import("./controls-3d.mjs").then(m => m.touchJump());
  });
}

export function updateInteractionHud(data) {
  const near = !!data?.nearNpc;
  const btn = document.getElementById("btnTalk");
  const touch = document.getElementById("touchTalk");
  if (btn) btn.style.display = near ? "inline-block" : "none";
  if (touch) touch.classList.toggle("visible", near);
}

window.initInteractionHud = initInteractionHud;
window.updateInteractionHud = updateInteractionHud;
window.talkToNearestNpc = talkToNearestNpc;
