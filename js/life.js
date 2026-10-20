/* Живая сцена PUNK ME — дыхание, неон, частицы, пёс, ночные существа */
const LifeEngine = (() => {
  let raf = 0;
  let canvas, ctx;
  let particles = [];
  let ambients = [];
  let dog = null;
  let cats = [];
  let lastT = 0;
  let playerStillMs = 0;
  let lastPx = 0;
  let lastPy = 0;
  let audioCtx = null;
  let hooks = {};

  const DOG_STATES = ["follow", "wander", "sit", "sleep", "chase", "jump"];

  function init(h) {
    hooks = h;
    canvas = document.getElementById("lifeCanvas");
    if (canvas) {
      ctx = canvas.getContext("2d");
      resizeCanvas();
      window.addEventListener("resize", resizeCanvas);
    }
    document.addEventListener("pointerdown", unlockAudio, { once: true });
    document.addEventListener("mousemove", onParallax);
    loop();
  }

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function unlockAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === "suspended") audioCtx.resume();
  }

  function playBark() {
    unlockAudio();
    if (!audioCtx) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(90, t + 0.08);
    osc.frequency.setValueAtTime(220, t + 0.1);
    osc.frequency.exponentialRampToValueAtTime(100, t + 0.18);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.25);
  }

  function getMe() {
    return hooks.getMe ? hooks.getMe() : null;
  }

  function onLocationChange(isNight) {
    clearAmbients();
    spawnFogBurst();
    if (isNight) spawnNightCreatures();
    resetDogBehavior();
  }

  function onSceneRender(loc) {
    const bg = document.getElementById("bg");
    const dup = document.getElementById("bgDup");
    if (bg && dup && loc) {
      dup.src = loc.bg || bg.src;
      bg.classList.add("bg-breathe");
      dup.classList.add("bg-breathe", "bg-drift");
    }
    document.body.classList.toggle("night-scene", !!loc?.night);
  }

  function clearAmbients() {
    ambients.forEach(a => a.el?.remove());
    ambients = [];
    cats = [];
    const layer = document.getElementById("ambients");
    if (layer) layer.innerHTML = "";
  }

  function spawnNightCreatures() {
    const layer = document.getElementById("ambients");
    if (!layer) return;
    const specs = [
      { type: "cat", emoji: "🐈", y: 28 + Math.random() * 35 },
      { type: "cat", emoji: "🐈‍⬛", y: 40 + Math.random() * 25 },
      { type: "police", emoji: "🚓", y: 55 + Math.random() * 15 },
      { type: "trash", emoji: "🗑️", y: 62 + Math.random() * 20 },
      { type: "light", emoji: "💡", y: 18 + Math.random() * 25 },
      { type: "light", emoji: "✨", y: 22 + Math.random() * 30 }
    ];
    specs.forEach((s, i) => {
      const el = document.createElement("div");
      el.className = `ambient-life ambient-${s.type}`;
      el.innerHTML = `<span class="amb-sprite">${s.emoji}</span>` +
        (s.type === "police" ? '<span class="police-flash"></span>' : "") +
        (s.type === "light" ? '<span class="light-glow"></span>' : "");
      el.style.top = s.y + "%";
      layer.appendChild(el);
      const a = {
        type: s.type,
        x: 8 + (i * 17) % 75,
        y: s.y,
        vx: s.type === "police" ? 0.11 + Math.random() * 0.06 : (Math.random() > 0.5 ? 1 : -1) * (0.03 + Math.random() * 0.04),
        vy: 0,
        jumpT: 0,
        el
      };
      ambients.push(a);
      if (s.type === "cat") cats.push(a);
      el.style.left = a.x + "%";
      if (s.type === "trash") {
        el.onclick = (e) => {
          e.stopPropagation();
          el.classList.add("rustle");
          setTimeout(() => el.classList.remove("rustle"), 600);
          hooks.onTrashKick?.();
        };
      }
      if (s.type === "cat") {
        el.onclick = (e) => {
          e.stopPropagation();
          a.jumpT = 1;
          hooks.onCatPet?.();
        };
      }
    });
  }

  function spawnFogBurst() {
    for (let i = 0; i < 24; i++) {
      particles.push({
        x: Math.random(),
        y: Math.random(),
        r: 2 + Math.random() * 5,
        vx: (Math.random() - 0.5) * 0.0004,
        vy: -0.0002 - Math.random() * 0.0005,
        a: 0.08 + Math.random() * 0.12,
        hue: Math.random() > 0.5 ? 300 : 180
      });
    }
  }

  function resetDogBehavior() {
    if (!dog) return;
    dog.state = "follow";
    dog.stateT = 0;
    dog.bubbleT = 0;
  }

  function ensureDog() {
    const me = getMe();
    if (!hooks.hasDog?.() || !me) {
      if (dog?.el) dog.el.remove();
      dog = null;
      return;
    }
    let el = document.getElementById("dogEntity");
    if (!el) {
      el = document.createElement("div");
      el.id = "dogEntity";
      el.className = "entity dog life-dog";
      el.innerHTML = `<div class="speech-bubble" id="dogBubble"></div>
        <div class="sprite-wrap"><img class="avatar" src="imagine_images/sgz0l.jpg" alt="пёс"></div>
        <div class="tag" id="dogTag">пёс</div>`;
      el.onclick = (e) => {
        e.stopPropagation();
        barkAndPet();
      };
      document.getElementById("entities")?.appendChild(el);
    }
    if (!dog) {
      dog = {
        x: me.dog?.x ?? me.x - 5,
        y: me.dog?.y ?? me.y + 3,
        state: "follow",
        stateT: 0,
        wanderX: me.x,
        wanderY: me.y,
        bubbleT: 0,
        el
      };
    }
    dog.el = el;
  }

  function barkAndPet() {
    if (!dog) return;
    dog.state = "jump";
    dog.stateT = 0;
    dog.bubbleT = 2.2;
    showBubble("Гав!");
    playBark();
    dog.el.classList.add("dog-wag");
    setTimeout(() => dog.el?.classList.remove("dog-wag"), 800);
    hooks.onPetDog?.();
  }

  function showBubble(text) {
    const b = document.getElementById("dogBubble");
    if (!b) return;
    b.textContent = text;
    b.classList.add("show");
    setTimeout(() => b.classList.remove("show"), 1800);
  }

  function updateDog(dt, me) {
    ensureDog();
    if (!dog || !me) return;
    dog.stateT += dt;
    const dist = Math.hypot(me.x - dog.x, me.y - dog.y);
    let targetX = me.x - 4;
    let targetY = me.y + 2;
    let speed = 0.16;

    const nearestCat = cats.reduce((best, c) => {
      const d = Math.hypot(c.x - dog.x, c.y - dog.y);
      return d < (best?.d ?? 999) ? { c, d } : best;
    }, null);

    if (nearestCat && nearestCat.d < 18 && document.body.classList.contains("night-scene")) {
      dog.state = "chase";
      targetX = nearestCat.c.x;
      targetY = nearestCat.c.y;
      speed = 0.22;
      if (nearestCat.d < 4 && dog.stateT > 0.5) {
        barkAndPet();
        nearestCat.c.x += 8;
      }
    } else if (dog.state === "chase") {
      dog.state = "follow";
      dog.stateT = 0;
    } else if (dog.state === "jump") {
      speed = 0.2;
      if (dog.stateT > 0.45) dog.state = "follow";
    } else if (dog.state === "sleep") {
      speed = 0.02;
      if (dog.stateT > 6) dog.state = "wander";
      dog.el.classList.add("dog-sleep");
    } else if (dog.state === "sit") {
      speed = 0.04;
      dog.el.classList.add("dog-sit");
      if (dog.stateT > 4) dog.state = "follow";
    } else if (dog.state === "wander") {
      dog.el.classList.remove("dog-sleep", "dog-sit");
      if (Math.hypot(dog.wanderX - dog.x, dog.wanderY - dog.y) < 2 || dog.stateT > 5) {
        dog.wanderX = 15 + Math.random() * 70;
        dog.wanderY = 35 + Math.random() * 45;
        dog.stateT = 0;
      }
      targetX = dog.wanderX;
      targetY = dog.wanderY;
      speed = 0.09;
      if (dist > 25) dog.state = "follow";
    } else {
      dog.el.classList.remove("dog-sleep", "dog-sit");
      if (playerStillMs > 4000 && dist < 8 && Math.random() < 0.002) {
        dog.state = Math.random() > 0.5 ? "sit" : "sleep";
        dog.stateT = 0;
      } else if (playerStillMs > 6000 && dist < 6 && Math.random() < 0.003) {
        dog.state = "wander";
        dog.stateT = 0;
        dog.wanderX = dog.x + (Math.random() - 0.5) * 20;
        dog.wanderY = dog.y + (Math.random() - 0.5) * 15;
      } else if (dist > 12) {
        speed = 0.2;
        dog.el.classList.add("dog-run");
      } else {
        dog.el.classList.remove("dog-run");
      }
    }

    dog.x += (targetX - dog.x) * speed;
    dog.y += (targetY - dog.y) * speed;
    dog.bubbleT = Math.max(0, dog.bubbleT - dt);

    dog.el.style.left = dog.x + "%";
    dog.el.style.top = dog.y + "%";
    const runClass = speed > 0.17 ? "dog-run" : "";
    dog.el.classList.toggle("dog-run", runClass === "dog-run" && dog.state !== "sleep");
    me.dog = { x: dog.x, y: dog.y };
  }

  function updateAmbients(dt) {
    ambients.forEach(a => {
      if (a.type === "police") {
        a.x += a.vx;
        if (a.x > 95 || a.x < -5) a.vx *= -1;
      } else if (a.type === "cat") {
        a.x += a.vx * dt * 60;
        if (a.x > 88 || a.x < 5) a.vx *= -1;
        a.jumpT = Math.max(0, a.jumpT - dt);
        if (Math.random() < 0.004) a.jumpT = 1;
      } else if (a.type === "trash") {
        if (Math.random() < 0.008) a.el.classList.add("rustle");
        setTimeout(() => a.el.classList.remove("rustle"), 400);
      }
      a.el.style.left = a.x + "%";
      a.el.classList.toggle("cat-jump", a.type === "cat" && a.jumpT > 0);
    });
  }

  function drawParticles(dt) {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -0.05) p.y = 1.05;
      if (p.x < -0.05) p.x = 1.05;
      if (p.x > 1.05) p.x = -0.05;
      const px = p.x * canvas.width;
      const py = p.y * canvas.height;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, 90%, 65%, ${p.a})`;
      ctx.arc(px, py, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    if (particles.length < 40 && Math.random() < 0.08) spawnFogBurst();
  }

  function onParallax(e) {
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    const stack = document.querySelector(".bg-stack");
    if (stack) {
      stack.style.setProperty("--px", nx * 6 + "px");
      stack.style.setProperty("--py", ny * 4 + "px");
    }
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    const me = getMe();
    if (me) {
      const moved = Math.hypot(me.x - lastPx, me.y - lastPy);
      if (moved > 0.15) playerStillMs = 0;
      else playerStillMs += dt * 1000;
      lastPx = me.x;
      lastPy = me.y;
      updateDog(dt, me);
    }
    updateAmbients(dt);
    drawParticles(dt);
    const flicker = document.querySelector(".neon-flicker");
    if (flicker) {
      flicker.style.opacity = String(0.35 + Math.sin(t * 0.01) * 0.15 + Math.random() * 0.08);
    }
    raf = requestAnimationFrame(loop);
  }

  function decorateEntities() {
    document.querySelectorAll(".entity.me .sprite-wrap, .entity.me > .avatar").forEach(el => {
      const wrap = el.classList.contains("sprite-wrap") ? el : el.parentElement;
      if (wrap && !wrap.classList.contains("sprite-wrap")) {
        const img = el;
        const w = document.createElement("div");
        w.className = "sprite-wrap breathe sway";
        img.replaceWith(w);
        w.appendChild(img);
        const blink = document.createElement("span");
        blink.className = "blink-overlay";
        w.appendChild(blink);
      }
    });
    document.querySelectorAll(".entity.npc").forEach((el, i) => {
      el.classList.add("breathe", "sway");
      el.style.animationDelay = (i * 0.35) + "s";
      if (!el.querySelector(".blink-overlay")) {
        const b = document.createElement("span");
        b.className = "blink-overlay npc-blink";
        el.querySelector(".sprite-wrap")?.appendChild(b) || el.appendChild(b);
      }
    });
  }

  function afterEntityRender() {
    ensureDog();
  }

  return {
    init,
    onLocationChange,
    onSceneRender,
    decorateEntities,
    afterEntityRender,
    barkAndPet,
    playBark
  };
})();

window.LifeEngine = LifeEngine;
