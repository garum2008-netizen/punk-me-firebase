import * as THREE from "three";

/** Gothic castle courtyard + tower (Bell quest). */
export function addCastleScene(root, { wall, neonSign, tiledFloor, pushCollider, colliders }) {
  const stone = new THREE.MeshStandardMaterial({ color: 0x3a3548, roughness: 0.88, metalness: 0.12 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a1428, roughness: 0.9 });
  const gold = new THREE.MeshStandardMaterial({
    color: 0xc9a227,
    emissive: 0x886622,
    emissiveIntensity: 0.35,
    metalness: 0.6,
    roughness: 0.35
  });

  const floor = tiledFloor(28, 24, 0x2a2838, false);
  root.add(floor);

  // Perimeter walls
  root.add(wall(28, 5.5, 0.6, stone).translateZ(-11.5));
  root.add(wall(28, 5.5, 0.6, stone).translateZ(11.5));
  root.add(wall(0.6, 5.5, 24, stone).translateX(-13.5));
  root.add(wall(0.6, 5.5, 24, stone).translateX(13.5));

  // Main keep / tower (organ inside)
  const tower = new THREE.Group();
  tower.name = "castle_tower";
  const base = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 7), stone);
  base.position.set(-6, 2, -8);
  tower.add(base);
  pushCollider(colliders, -6, -8, 4, 3.5);
  const mid = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 5.5), stone);
  mid.position.set(-6, 6.5, -8);
  tower.add(mid);
  const spire = new THREE.Mesh(new THREE.ConeGeometry(3.2, 4.5, 4), dark);
  spire.position.set(-6, 11.2, -8);
  tower.add(spire);

  // Broken bell in spire
  const bell = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.35, 10, 24), gold);
  bell.rotation.x = Math.PI / 2;
  bell.position.set(-6, 9.2, -8);
  bell.name = "bell_cracked";
  tower.add(bell);

  // Organ facade (interactive zone)
  const organ = new THREE.Group();
  organ.name = "castle_organ";
  organ.userData.castleZone = "organ";
  const organBody = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.2, 1.2), dark);
  organBody.position.set(-6, 2.8, -10.2);
  organ.add(organBody);
  const keys = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.15, 0.8), new THREE.MeshStandardMaterial({ color: 0x111118 }));
  keys.position.set(-6, 1.35, -9.85);
  organ.add(keys);
  root.add(organ);
  pushCollider(colliders, -6, -10, 2.5, 1);

  // Candle + note slots (5)
  const candlePositions = [
    { x: -8.2, z: -6.5, note: "C" },
    { x: -7.2, z: -6.5, note: "E" },
    { x: -6.2, z: -6.5, note: "G" },
    { x: -5.2, z: -6.5, note: "C2" },
    { x: -4.2, z: -6.5, note: "E2" }
  ];
  const candleGroup = new THREE.Group();
  candleGroup.name = "castle_candles";
  candlePositions.forEach((c, i) => {
    const g = new THREE.Group();
    g.name = `candle_${i}`;
    g.userData.castleInteract = "candle";
    g.userData.noteId = c.note;
    g.userData.slot = i;
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.5, 8), new THREE.MeshStandardMaterial({ color: 0xddddcc }));
    stick.position.set(c.x, 0.25, c.z);
    g.add(stick);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xffaa44, emissive: 0xff6600, emissiveIntensity: 0.9 })
    );
    flame.name = "flame";
    flame.position.set(c.x, 0.55, c.z);
    flame.visible = false;
    g.add(flame);
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.35, 0.35),
      new THREE.MeshStandardMaterial({ color: 0x220044, emissive: 0xff00ff, emissiveIntensity: 0.4 })
    );
    label.rotation.x = -Math.PI / 2;
    label.position.set(c.x, 0.05, c.z);
    g.userData.noteLabel = c.note;
    candleGroup.add(g);
  });
  root.add(candleGroup);

  // Concert stage (hangout at castle)
  const stage = new THREE.Group();
  stage.name = "castle_concert_stage";
  stage.userData.castleZone = "stage";
  const deck = new THREE.Mesh(new THREE.BoxGeometry(10, 0.35, 5), new THREE.MeshStandardMaterial({ color: 0x442266 }));
  deck.position.set(4, 0.18, 2);
  stage.add(deck);
  const ampL = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.8), dark);
  ampL.position.set(0.5, 1.1, 2);
  stage.add(ampL);
  const ampR = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2, 0.8), dark);
  ampR.position.set(7.5, 1.1, 2);
  stage.add(ampR);
  root.add(stage);
  pushCollider(colliders, 4, 2, 5, 2.5);

  // Night shop gate (deal ending)
  const shop = new THREE.Group();
  shop.name = "castle_night_shop";
  shop.visible = false;
  const kiosk = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.4, 1.6), new THREE.MeshStandardMaterial({ color: 0x112233, emissive: 0x004466, emissiveIntensity: 0.5 }));
  kiosk.position.set(10, 1.2, -4);
  shop.add(kiosk);
  root.add(shop);

  // Courtyard decor (avoid flat grey-box look)
  const bannerMat = new THREE.MeshStandardMaterial({ color: 0x660044, emissive: 0xff00aa, emissiveIntensity: 0.25 });
  [-9, 9].forEach(x => {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 3.2), bannerMat);
    banner.position.set(x, 3.2, -10.8);
    root.add(banner);
  });
  for (let i = 0; i < 6; i++) {
    const torch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.16, 2.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a2030, emissive: 0xff6600, emissiveIntensity: 0.15 })
    );
    torch.position.set(-10 + i * 4, 1.2, 8.5);
    root.add(torch);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.35, 8, 16, Math.PI), gold);
  arch.position.set(0, 4.5, -11.2);
  arch.rotation.x = Math.PI / 2;
  root.add(arch);

  root.add(tower);
  const signLabel =
    typeof window.t === "function" ? String(window.t("door_castle") || "Castle").toUpperCase() : "CASTLE";
  root.add(neonSign(signLabel, 0xc9a227).translateY(4.2).translateZ(-11));
  root.userData.castleRefs = { candleGroup, shop, stage, bell };

  return { candleGroup, shop, stage, bell };
}

export function applyCastleEndingVisual(root, endingId) {
  const refs = root?.userData?.castleRefs;
  if (!refs) return;
  if (endingId === "ending_zombie_style") {
    refs.stage.children.forEach(c => {
      if (c.material?.emissive) {
        c.material.emissive.setHex(0xff00aa);
        c.material.emissiveIntensity = 0.6;
      }
    });
  }
  if (endingId === "ending_count_deal") {
    refs.shop.visible = true;
  }
  if (endingId === "ending_break_curse") {
    const bell = refs.bell;
    if (bell?.material) {
      bell.material.emissiveIntensity = 1.2;
      bell.material.emissive.setHex(0xffdd88);
    }
    root.traverse?.(o => {
      if (o.isMesh && o.material?.emissive) {
        o.material.emissiveIntensity = Math.min(1, (o.material.emissiveIntensity || 0) + 0.2);
      }
    });
  }
}
