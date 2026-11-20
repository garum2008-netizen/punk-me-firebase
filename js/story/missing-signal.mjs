/**
 * House 13: The Missing Signal. Text lives in data/story/missing-signal/screenplay.json.
 * Angelina's body stays hidden until the screenplay sets companion.
 */

const PLAY_ID = "ms-signal";
let book = null;
let coldTimer = 0;
let coldStarted = false;

function player() {
  return window.me;
}

function lang() {
  return typeof window.getLanguage === "function" ? window.getLanguage() : "ru";
}

function L(obj) {
  if (!obj) return "";
  if (typeof obj === "string") return obj;
  return obj[lang()] || obj.ru || obj.en || "";
}

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function owns(p = player()) {
  return p?.chapter1?.playId === PLAY_ID;
}

function bag(p = player()) {
  if (!p.missingSignal || typeof p.missingSignal !== "object") {
    p.missingSignal = { step: "cold", flags: {}, symbols: 0 };
  }
  if (!p.missingSignal.flags) p.missingSignal.flags = {};
  return p.missingSignal;
}

export function showAngelina() {
  if (!owns()) return true;
  return !!bag().flags.companion;
}

function step() {
  return book?.steps?.[bag().step] || null;
}

function save() {
  window.saveMe?.();
}

function setFlag(token) {
  const st = bag();
  const [id, value] = String(token).split(":");
  st.flags[id] = value === undefined ? true : value;
}

function applySets(list) {
  (list || []).forEach(setFlag);
}

function portalAllowed(to) {
  if (!owns()) return true;
  if (bag().step === "cold" || bag().step === "end") return to === player()?.location;
  const f = bag().flags;
  if (!f.door_unlocked) return to === "room";
  if (!f.cctv_seen) return ["room", "street", "city", "elevator", "kitchen", "cemetery"].includes(to);
  return true;
}

export function allowPortal(to) {
  return portalAllowed(to);
}

export function blockedPortal() {
  refresh();
}

function hideDialog() {
  const dlg = document.getElementById("storyDialog");
  if (!dlg) return;
  dlg.classList.remove("active");
  dlg.setAttribute("aria-hidden", "true");
  const body = dlg.querySelector(".story-dialog-body");
  if (body) body.innerHTML = "";
}

function showDialog(speaker, lines, done) {
  const dlg = document.getElementById("storyDialog");
  if (!dlg) {
    done();
    return;
  }
  dlg.classList.add("active");
  dlg.setAttribute("aria-hidden", "false");
  const title = dlg.querySelector(".story-dialog-title");
  const body = dlg.querySelector(".story-dialog-body");
  let i = 0;
  const paint = () => {
    if (i >= lines.length) {
      hideDialog();
      done();
      return;
    }
    if (title) title.textContent = speaker;
    if (body) {
      body.innerHTML = `<p class="story-line">${esc(L(lines[i]))}</p><button type="button" class="btn" id="msNext">${esc(L(book.ui.next))}</button>`;
      body.querySelector("#msNext").onclick = () => {
        i += 1;
        paint();
      };
    }
  };
  paint();
}

function showChoices(node, choices) {
  const dlg = document.getElementById("storyDialog");
  if (!dlg) return;
  dlg.classList.add("active");
  dlg.setAttribute("aria-hidden", "false");
  const title = dlg.querySelector(".story-dialog-title");
  const body = dlg.querySelector(".story-dialog-body");
  if (title) title.textContent = L(node.objective).slice(0, 80);
  if (!body) return;
  body.innerHTML = choices.map(c =>
    `<button type="button" class="btn story-choice" data-choice="${esc(c.id)}"><span class="choice-text">${esc(L(c.text))}</span></button>`
  ).join("");
  body.querySelectorAll("[data-choice]").forEach(btn => {
    btn.onclick = () => {
      const choice = choices.find(c => c.id === btn.dataset.choice);
      hideDialog();
      if (!choice) return;
      if (node.kind === "symbols") {
        pickSymbol(choice.id);
        return;
      }
      applySets(choice.set);
      goStep(choice.next);
    };
  });
}

function pickSymbol(id) {
  const node = step();
  const st = bag();
  const want = node.order[st.symbols];
  if (id !== want) {
    st.symbols = 0;
    st.flags.symbols_reset = (st.flags.symbols_reset || 0) + 1;
    save();
    showDialog("writing", [node.wrong], () => refresh());
    return;
  }
  st.symbols += 1;
  if (st.symbols >= node.order.length) {
    st.flags.symbols = node.order.length;
    goStep(node.next);
    return;
  }
  save();
  refresh();
}

function goStep(id) {
  const st = bag();
  st.step = id;
  const node = book.steps[id];
  if (!node) return;
  if (node.clearBlackout) document.body.classList.remove("ms-blackout");
  if (node.blackout) document.body.classList.add("ms-blackout");
  if (node.lightsOut) document.body.classList.add("ms-blackout");
  if (node.showAngelina) {
    st.flags.companion = true;
    window.World3D?.setLocation?.(player().location);
  }
  if (node.buildGenerator && window.World3D?.placeCityPlot) {
    window.World3D.placeCityPlot({ id: "generator", kind: "stall", x: 0.2, z: 3.1 }, true);
  }
  save();
  if (node.kind === "duel") {
    refresh();
    startDuel();
    return;
  }
  if (node.kind === "end") {
    showEnd(node);
    return;
  }
  refresh();
}

function startDuel(attempt = 0) {
  const begin = () => {
    const ok = window.World3D?.startDuel3D?.("razor", { storyTell: true, hp: 64, npcHp: 36 });
    if (!ok && attempt < 12 && step()?.kind === "duel") {
      setTimeout(() => startDuel(attempt + 1), 400);
    }
  };
  if (player().location !== "street") {
    window.goLocation?.("street");
    setTimeout(begin, 700);
  } else begin();
}

export function onDuelEnd(win) {
  if (!owns()) return;
  const node = step();
  if (!node || node.kind !== "duel") return;
  if (!win) {
    refresh();
    startDuel();
    return;
  }
  if (bag().step === "s3_beat") bag().flags.razor_path = "beat";
  goStep(node.next);
}

function showEnd(node) {
  bag().step = "end";
  bag().flags.chapter_ended = true;
  if (player().chapter1) player().chapter1.ended = true;
  save();
  const root = document.getElementById("chapterEnding");
  if (!root) return;
  root.querySelector(".chapter-ending-title").textContent = L(node.title);
  root.querySelector(".chapter-ending-body").textContent = L(node.body);
  const btn = root.querySelector(".chapter-ending-ok");
  btn.textContent = L(book.ui.end_ok);
  btn.onclick = () => {
    root.classList.remove("active");
    root.setAttribute("aria-hidden", "true");
  };
  root.classList.add("active");
  root.setAttribute("aria-hidden", "false");
  const guide = document.getElementById("angelinaGuide");
  if (guide) guide.hidden = true;
}

function ensureLoc(node) {
  if (!node?.loc || player().location === node.loc) return;
  if (!portalAllowed(node.loc) && node.loc !== "room") {
    bag().flags.door_unlocked = true;
  }
  window.goLocation?.(node.loc);
}

export function refresh() {
  if (!owns() || !book) return;
  const node = step();
  const el = document.getElementById("angelinaGuide");
  if (!el) return;
  if (!node || bag().step === "cold" || bag().step === "end") {
    if (bag().step === "cold") el.hidden = true;
    return;
  }
  el.hidden = false;
  const choices = node.kind === "symbols" ? node.choices : node.choices;
  el.innerHTML = `<b>PUNK ME</b><span class="angelina-line">${esc(L(node.objective))}</span><span class="angelina-hint">${esc(L(book.ui.controls))}</span>`;
  if (node.action && node.kind !== "duel") {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn";
    btn.id = "msAct";
    btn.textContent = L(node.action);
    btn.onclick = () => act();
    el.appendChild(btn);
  }
  if (choices && node.kind !== "duel") {
    choices.forEach(c => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn secondary";
      btn.dataset.choice = c.id;
      btn.textContent = L(c.text);
      btn.onclick = () => {
        if (node.kind === "symbols") pickSymbol(c.id);
        else {
          applySets(c.set);
          goStep(c.next);
        }
      };
      el.appendChild(btn);
    });
  }
}

function act() {
  const node = step();
  if (!node || node.kind === "duel" || node.kind === "end") return;
  if (node.choices && !node.action) return;
  ensureLoc(node);
  const lines = node.lines || [];
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    applySets(node.set);
    if (node.clearBlackout) document.body.classList.remove("ms-blackout");
    goStep(node.next);
  };
  if (!lines.length) finish();
  else showDialog(node.speaker || "angelina", lines, finish);
}

export function handleInteract() {
  if (!owns() || !book) return false;
  const node = step();
  if (!node || bag().step === "cold" || bag().step === "end") return true;
  if (node.kind === "duel") return true;
  if (node.choices && !node.action) {
    showChoices(node, node.choices);
    return true;
  }
  act();
  return true;
}

function playCold() {
  if (coldStarted) return;
  coldStarted = true;
  const beats = book.coldOpen.beats;
  const root = document.getElementById("chapterCrawl");
  const body = root?.querySelector(".chapter-crawl-body");
  const skip = root?.querySelector(".chapter-crawl-skip");
  if (!root || !body) {
    document.body.classList.add("ms-cold-done");
    goStep("s1_phone");
    return;
  }
  document.body.classList.add("ms-cold-open");
  root.classList.add("active", "ms-card");
  root.setAttribute("aria-hidden", "false");
  let i = 0;
  let skipOn = false;
  const armSkip = () => {
    if (!skip) return;
    skip.textContent = L(book.ui.skip);
    skip.classList.toggle("is-locked", !skipOn);
    skip.onclick = () => {
      if (!skipOn) return;
      clearTimeout(coldTimer);
      finishCold();
    };
  };
  const paint = () => {
    const beat = beats[i];
    if (!beat) {
      finishCold();
      return;
    }
    if (beat.id === book.coldOpen.skipAfter) skipOn = true;
    armSkip();
    const text = L(beat.card || beat.text);
    body.innerHTML = beat.card
      ? `<h2>${esc(text)}</h2>`
      : `<p>${esc(text)}</p>`;
    window.__msColdBeat = beat.id;
    coldTimer = setTimeout(() => {
      i += 1;
      paint();
    }, beat.ms || 4000);
  };
  paint();
}

function finishCold() {
  clearTimeout(coldTimer);
  const root = document.getElementById("chapterCrawl");
  root?.classList.remove("active", "ms-card");
  if (root) root.setAttribute("aria-hidden", "true");
  window.__msColdDone = true;
  document.body.classList.add("ms-cold-done");
  if (!owns()) return;
  const st = bag();
  st.flags.signal_heard = true;
  st.flags.missing_card_seen = true;
  if (player().location !== "room") window.goLocation?.("room");
  goStep("s1_phone");
}

function pluck() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "triangle";
    o.frequency.value = 196;
    g.gain.value = 0.04;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    o.stop(ctx.currentTime + 0.85);
  } catch (_) {}
}

export async function boot() {
  if (!owns()) return;
  if (!book) {
    const res = await fetch("data/story/missing-signal/screenplay.json");
    if (!res.ok) throw new Error("screenplay " + res.status);
    book = await res.json();
  }
  const st = bag();
  document.body.classList.toggle("ms-blackout", !!step()?.blackout || !!step()?.lightsOut || st.step === "s6_twist");
  if (st.flags.companion) window.World3D?.setLocation?.(player().location);
  if (st.step === "cold" || !st.step) {
    st.step = "cold";
    if (window.__msColdDone) {
      st.flags.signal_heard = true;
      st.flags.missing_card_seen = true;
      goStep("s1_phone");
      return;
    }
    if (coldStarted) return;
    pluck();
    playCold();
    return;
  }
  if (st.step === "end" || st.flags.chapter_ended) {
    showEnd(book.steps.s6_end);
    return;
  }
  refresh();
}

export function debugState() {
  const st = owns() ? bag() : null;
  return {
    playId: player()?.chapter1?.playId || "",
    step: st?.step || "",
    flags: st?.flags || {},
    symbols: st?.symbols || 0,
    angelina: !!document.querySelector("[name='angelina'], .angelina-mesh, #stage3d") && showAngelina(),
    cold: window.__msColdBeat || "",
    card: document.querySelector(".chapter-crawl-body")?.innerText || "",
    objective: document.querySelector("#angelinaGuide .angelina-line")?.textContent || "",
    ending: document.querySelector(".chapter-ending-title")?.textContent || ""
  };
}

if (typeof window !== "undefined" && !new URLSearchParams(location.search).has("tutorial")) {
  fetch("data/story/missing-signal/screenplay.json")
    .then(r => r.ok ? r.json() : Promise.reject(new Error(String(r.status))))
    .then(data => {
      book = data;
      playCold();
    })
    .catch(() => {});
}

if (typeof window !== "undefined") {
  window.MissingSignal = {
    owns,
    boot,
    refresh,
    handleInteract,
    allowPortal,
    blockedPortal,
    showAngelina,
    onDuelEnd,
    debugState,
    PLAY_ID
  };
}
