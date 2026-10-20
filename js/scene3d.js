/* Three.js cartoon stage — крупные персонажи в сцене */
const Scene3D = (() => {
  let renderer, scene, camera, clock, raycaster, pointer;
  let ground, actors = new Map(), car = null, dog3d = null;
  let hooks = {};
  let lastPlayer = { x: 50, y: 60 };
  let animT = 0;

  function init(h) {
    hooks = h;
    const canvas = document.getElementById("stage3d");
    if (!canvas || typeof THREE === "undefined") return false;
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    resize();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(42, canvas.clientWidth / canvas.clientHeight, 0.1, 120);
    camera.position.set(0, 5.2, 11);
    camera.lookAt(0, 1.2, 0);
    clock = new THREE.Clock();
    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    const amb = new THREE.AmbientLight(0x8866cc, 0.85);
    const dir = new THREE.DirectionalLight(0xff66ff, 1.1);
    dir.position.set(4, 8, 6);
    const rim = new THREE.DirectionalLight(0x00ffff, 0.45);
    rim.position.set(-5, 3, -2);
    scene.add(amb, dir, rim);

    const gmat = new THREE.MeshToonMaterial({ color: 0x1a0a28, transparent: true, opacity: 0.35 });
    ground = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), gmat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    canvas.addEventListener("pointerdown", onPointer);
    window.addEventListener("resize", resize);
    document.body.classList.add("mode-3d");
    loop();
    return true;
  }

  function resize() {
    const canvas = document.getElementById("stage3d");
    if (!canvas || !renderer) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    if (camera) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
  }

  function gameToWorld(gx, gy) {
    return {
      x: (gx / 100 - 0.5) * 16,
      z: (gy / 100 - 0.55) * 10,
    };
  }

  function worldToGame(x, z) {
    return {
      x: Math.max(5, Math.min(95, (x / 16 + 0.5) * 100)),
      y: Math.max(22, Math.min(92, (z / 10 + 0.55) * 100))
    };
  }

  function makeActor(id, texUrl, scale, color) {
    const group = new THREE.Group();
    const tex = new THREE.TextureLoader().load(texUrl);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.scale.set(scale, scale * 1.35, 1);
    sprite.position.y = scale * 0.7;
    group.add(sprite);

    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(scale * 0.22, scale * 0.55, 4, 8),
      new THREE.MeshToonMaterial({ color: color || 0xff00ff })
    );
    body.position.y = scale * 0.35;
    group.add(body);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(scale * 0.35, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    group.add(shadow);

    group.userData = { sprite, body, shadow, scale, vx: 0, phase: Math.random() * 6 };
    scene.add(group);
    actors.set(id, group);
    return group;
  }

  function ensureCar(show) {
    if (!show) {
      if (car) { scene.remove(car); car = null; }
      return;
    }
    if (car) return;
    car = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.55, 0.9),
      new THREE.MeshToonMaterial({ color: 0x2244aa })
    );
    body.position.y = 0.45;
    car.add(body);
    const lightL = new THREE.PointLight(0x3b82f6, 2, 4);
    lightL.position.set(-0.6, 0.7, 0);
    const lightR = new THREE.PointLight(0xef4444, 2, 4);
    lightR.position.set(0.6, 0.7, 0);
    car.add(lightL, lightR);
    const wheels = [];
    for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 12), new THREE.MeshToonMaterial({ color: 0x111111 }));
      w.rotation.z = Math.PI / 2;
      w.position.set(i < 2 ? -0.65 : 0.65, 0.18, i % 2 ? 0.38 : -0.38);
      car.add(w);
      wheels.push(w);
    }
    car.userData = { wheels, x: -7, dir: 1, flash: 0 };
    car.position.set(-7, 0, 1.5);
    scene.add(car);
  }

  function ensureDog(texUrl) {
    if (!texUrl) {
      if (dog3d) { scene.remove(dog3d); dog3d = null; actors.delete("dog"); }
      return;
    }
    if (dog3d) return;
    dog3d = makeActor("dog", texUrl, 0.95, 0xfbbf24);
    dog3d.userData.isDog = true;
  }

  function sync(data) {
    if (!scene) return;
    const { player, others, npcs, location, hasDog, carVisible } = data;

    if (player) {
      lastPlayer = { x: player.x, y: player.y };
      let a = actors.get("player");
      if (!a) a = makeActor("player", player.avatar, 1.65, 0x00ffff);
      else a.userData.sprite.material.map = new THREE.TextureLoader().load(player.avatar);
      placeActor(a, player.x, player.y, true);
    }

    const keep = new Set(["player", "dog"]);
    Object.entries(others || {}).forEach(([id, p]) => {
      keep.add(id);
      let a = actors.get(id);
      if (!a) a = makeActor(id, p.avatar || "imagine_images/Lix06.jpg", 1.45, 0xaa55ff);
      placeActor(a, p.x, p.y, false);
    });

    (npcs || []).forEach((n, i) => {
      const id = "npc_" + n.id;
      keep.add(id);
      let a = actors.get(id);
      if (!a) a = makeActor(id, n.img, 1.55, 0xa855f7);
      const px = n.x ?? (18 + i * 16);
      const py = n.y ?? (58 + (i % 2) * 6);
      placeActor(a, px, py, false, true);
    });

    actors.forEach((g, id) => {
      if (!keep.has(id)) { scene.remove(g); actors.delete(id); }
    });

    ensureDog(hasDog ? "imagine_images/sgz0l.jpg" : null);
    if (hasDog && dog3d && player) {
      const d = actors.get("dog");
      if (d) placeActor(d, player.x - 4, player.y + 3, false);
    }

    ensureCar(!!carVisible);
    document.getElementById("streetCover")?.classList.toggle("visible", location === "street");
  }

  function placeActor(group, gx, gy, isPlayer, isNpc) {
    const w = gameToWorld(gx, gy);
    group.position.x += (w.x - group.position.x) * (isPlayer ? 0.35 : 0.22);
    group.position.z += (w.z - group.position.z) * (isPlayer ? 0.35 : 0.22);
    group.userData.gx = gx;
    group.userData.gy = gy;
    group.userData.isNpc = !!isNpc;
    group.userData.isPlayer = !!isPlayer;
  }

  function onPointer(e) {
    const canvas = document.getElementById("stage3d");
    if (!canvas || e.target !== canvas) return;
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(ground);
    if (hits[0]) {
      const g = worldToGame(hits[0].point.x, hits[0].point.z);
      hooks.onMove?.(g.x, g.y);
    }
    const npcHits = [];
    actors.forEach((g, id) => {
      if (id.startsWith("npc_")) {
        const dist = Math.hypot(g.position.x - hits[0]?.point.x, g.position.z - hits[0]?.point.z);
        if (dist < 1.2) npcHits.push(id.replace("npc_", ""));
      }
    });
    if (npcHits[0]) hooks.onNpcClick?.(npcHits[0]);
  }

  function loop() {
    requestAnimationFrame(loop);
    if (!renderer) return;
    const dt = clock.getDelta();
    animT += dt;

    actors.forEach((g, id) => {
      const ud = g.userData;
      const speed = ud.isPlayer ? Math.hypot(
        (ud.gx || 0) - lastPlayer.x,
        (ud.gy || 0) - lastPlayer.y
      ) : ud.isNpc ? 0.4 : 0.6;
      const walk = speed > 0.3 || id === "dog";
      const bob = walk ? Math.sin(animT * 14 + ud.phase) * 0.12 : Math.sin(animT * 2 + ud.phase) * 0.04;
      g.position.y = bob;
      if (ud.sprite) {
        ud.sprite.position.y = ud.scale * 0.7 + bob * 0.5;
        const sx = (ud.lastX && g.position.x < ud.lastX) ? -1 : 1;
        ud.sprite.scale.x = Math.abs(ud.sprite.scale.x) * sx;
        ud.lastX = g.position.x;
      }
      if (ud.isNpc) {
        g.position.x += Math.sin(animT * 0.5 + ud.phase) * 0.008;
        g.rotation.y = Math.sin(animT * 0.8 + ud.phase) * 0.15;
      }
      if (id === "dog") {
        g.position.x += Math.sin(animT * 3) * 0.01;
      }
    });

    if (car) {
      const ud = car.userData;
      ud.x += ud.dir * dt * 2.2;
      if (ud.x > 8 || ud.x < -8) ud.dir *= -1;
      car.position.x = ud.x;
      car.rotation.y = ud.dir > 0 ? 0 : Math.PI;
      ud.flash += dt;
      car.children[1].intensity = 1 + Math.sin(ud.flash * 12) * 0.8;
      car.children[2].intensity = 1 + Math.cos(ud.flash * 12) * 0.8;
      ud.wheels.forEach(w => { w.rotation.x += dt * 8 * ud.dir; });
    }

    renderer.render(scene, camera);
  }

  return { init, sync, resize };
})();

window.Scene3D = Scene3D;
