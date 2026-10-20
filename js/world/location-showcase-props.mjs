import * as THREE from "three";

function mat(color, emi = 0, rough = 0.72) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: emi || color,
    emissiveIntensity: emi ? 0.55 : 0,
    roughness: rough,
    metalness: emi ? 0.2 : 0.1
  });
}

function box(w, h, d, m) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.castShadow = true;
  return mesh;
}

function tagged(tag, obj) {
  const g = obj.isGroup ? obj : new THREE.Group();
  if (!obj.isGroup) g.add(obj);
  g.userData.propTag = tag;
  return g;
}

function groundScatter(root, locId) {
  const g = new THREE.Group();
  g.name = "groundScatter";
  const isCem = locId === "cemetery";
  const isCity = locId === "city";
  if (!isCem && !isCity) return;
  for (let i = 0; i < 28; i++) {
    const x = (Math.random() - 0.5) * (isCity ? 16 : 18);
    const z = (Math.random() - 0.5) * (isCity ? 14 : 16);
    if (i % 5 === 0) {
      const puddle = new THREE.Mesh(
        new THREE.CircleGeometry(0.35 + Math.random() * 0.4, 12),
        mat(isCem ? 0x1a2830 : 0x1a2038, 0x223344, 0.15)
      );
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set(x, 0.012, z);
      g.add(tagged(isCem ? "puddle" : "puddle", puddle));
    } else if (i % 4 === 0) {
      const tuft = new THREE.Mesh(
        new THREE.ConeGeometry(0.08, 0.18 + Math.random() * 0.12, 5),
        mat(isCem ? 0x2a4a32 : 0x3a5a38)
      );
      tuft.position.set(x, 0.09, z);
      g.add(tagged("grass_tuft", tuft));
    } else if (i % 3 === 0) {
      const leaf = new THREE.Mesh(
        new THREE.PlaneGeometry(0.12, 0.08),
        mat(isCem ? 0x6a5030 : 0x8a6030)
      );
      leaf.rotation.x = -Math.PI / 2;
      leaf.rotation.z = Math.random() * 6;
      leaf.position.set(x, 0.015, z);
      g.add(tagged("leaf_litter", leaf));
    } else {
      const crack = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5 + Math.random(), 0.06),
        mat(0x1a1820)
      );
      crack.rotation.x = -Math.PI / 2;
      crack.rotation.z = Math.random() * 3;
      crack.position.set(x, 0.011, z);
      g.add(tagged("floor_crack", crack));
    }
  }
  if (isCem) {
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 8),
      mat(0x3a4038, 0, 0.9)
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.013, 1);
    g.add(tagged("gravel_path", path));
  }
  if (isCity) {
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(4, 10),
      mat(0x353540, 0, 0.88)
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.013, 2);
    g.add(tagged("sidewalk_path", path));
  }
  root.add(g);
}

function tombstone(tag, x, z, cross = false) {
  const g = new THREE.Group();
  const stone = box(0.42, 0.75, 0.14, mat(0x5a6268));
  stone.position.y = 0.375;
  g.add(stone);
  if (cross) {
    const v = box(0.08, 0.35, 0.06, mat(0x666e78));
    v.position.y = 0.95;
    const h = box(0.28, 0.08, 0.06, mat(0x666e78));
    h.position.y = 1.02;
    g.add(v, h);
  } else {
    const round = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x5a6268));
    round.position.y = 0.78;
    g.add(round);
  }
  g.position.set(x, 0, z);
  return tagged(tag, g);
}

function streetLamp(x, z, tag = "street_lamp") {
  const g = new THREE.Group();
  const pole = box(0.1, 3.1, 0.1, mat(0x444455, 0, 0.5));
  pole.position.y = 1.55;
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 10, 10),
    mat(0xffffcc, 0xffcc66)
  );
  bulb.position.y = 3.2;
  const glow = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.5, 0.08, 12),
    mat(0xffffaa, 0xffaa44)
  );
  glow.position.y = 3.05;
  g.add(pole, bulb, glow);
  g.position.set(x, 0, z);
  return tagged(tag, g);
}

function parkBench(x, z) {
  const g = new THREE.Group();
  const m = mat(0x5a4030);
  for (let i = 0; i < 4; i++) {
    const slat = box(1.6, 0.05, 0.12, m);
    slat.position.set(0, 0.48 + i * 0.06, -0.05 + (i % 2) * 0.1);
    g.add(slat);
  }
  const legL = box(0.08, 0.45, 0.45, m);
  legL.position.set(-0.7, 0.22, 0);
  const legR = legL.clone();
  legR.position.x = 0.7;
  g.add(legL, legR);
  g.position.set(x, 0, z);
  return tagged("park_bench", g);
}

function ironFence(x, z, len = 3) {
  const g = new THREE.Group();
  for (let i = 0; i <= len * 2; i++) {
    const spike = box(0.06, 0.85, 0.06, mat(0x3a4048, 0x224455, 0.4));
    spike.position.set(-len / 2 + i * 0.45, 0.42, 0);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), mat(0x4a5058));
    top.position.set(spike.position.x, 0.92, 0);
    g.add(spike, top);
  }
  const rail = box(len, 0.05, 0.05, mat(0x3a4048));
  rail.position.y = 0.55;
  g.add(rail);
  g.position.set(x, 0, z);
  return tagged("iron_fence", g);
}

function cemeteryCrypt(x, z) {
  const g = new THREE.Group();
  const base = box(2.8, 1.4, 2.2, mat(0x2a3835));
  base.position.y = 0.7;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(3, 0.35, 2.4), mat(0x1a2825));
  roof.position.y = 1.55;
  const door = box(0.9, 1.1, 0.12, mat(0x1a2018, 0x113322, 0.5));
  door.position.set(0, 0.55, 1.12);
  g.add(base, roof, door);
  g.position.set(x, 0, z);
  return tagged("cemetery_crypt", g);
}

function trashBin(x, z, tag = "fg_trash") {
  const g = new THREE.Group();
  g.add(box(0.34, 0.48, 0.34, mat(0x3a4048)).translateY(0.24));
  g.add(box(0.38, 0.05, 0.38, mat(0x2a3038)).translateY(0.5));
  g.position.set(x, 0, z);
  return tagged(tag, g);
}

function bikeProp(x, z, tag = "fg_bike") {
  const g = new THREE.Group();
  const frame = box(0.9, 0.08, 0.18, mat(0xcc2222));
  frame.position.y = 0.35;
  g.add(frame);
  const w1 = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 16), mat(0x333344));
  w1.rotation.x = Math.PI / 2;
  w1.position.set(-0.28, 0.22, 0);
  const w2 = w1.clone();
  w2.position.set(0.28, 0.22, 0);
  g.add(w1, w2);
  g.position.set(x, 0, z);
  return tagged(tag, g);
}

function graffitiWall(x, z, tag) {
  const g = new THREE.Group();
  const wall = box(2.8, 1.8, 0.12, mat(0x3a3540));
  wall.position.y = 0.9;
  g.add(wall);
  g.add(box(1.6, 0.9, 0.02, mat(0x662244, 0xff00ff)).translateY(1.05).translateZ(0.07));
  g.add(box(0.8, 0.35, 0.02, mat(0x00ffff, 0x00ffff)).translateY(1.35).translateX(-0.5).translateZ(0.07));
  g.position.set(x, 0, z);
  return tagged(tag, g);
}

/** Perimeter props only — never in the camera–player foreground arc (z > 1.2 near center). */
function addPerimeterDressing(locId, root) {
  const zBack = -5.5;
  const zSide = -3.4;
  if (locId === "street") {
    root.add(graffitiWall(-5.2, zBack, "fg_street_graffiti"));
    root.add(streetLamp(-5.5, -3.5, "fg_street_lamp_w"));
    root.add(streetLamp(5.2, -3.2, "fg_street_lamp_e"));
    root.add(parkBench(-4.8, zSide));
    root.add(trashBin(4.6, zSide, "fg_street_trash"));
    root.add(bikeProp(3.8, -2.2, "fg_street_bike"));
    const pump = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat(0xff6600, 0xff4400));
    pump.position.set(-3.8, 0.2, -2.5);
    root.add(tagged("fg_street_pumpkin", pump));
    root.add(tagged("fg_street_crate", box(0.55, 0.55, 0.55, mat(0x6a5030)).translateY(0.28).translateX(5.5).translateZ(-1.5)));
    root.add(tagged("fg_street_fence", ironFence(-6, 0.5, 3)));
    return;
  }
  if (locId === "room") {
    root.add(streetLamp(-4.5, zBack, "fg_room_lamp"));
    root.add(tagged("fg_room_poster", box(0.9, 1.2, 0.03, mat(0x442266, 0x220044)).translateY(1.4).translateX(5).translateZ(zBack)));
    root.add(tagged("fg_room_guitar", box(0.35, 0.12, 0.1, mat(0xcc2222)).translateY(0.55).translateX(-5).translateZ(-2)));
    root.add(trashBin(5.2, 2.5, "fg_room_trash"));
    return;
  }
  if (locId === "construction") {
    root.add(tagged("fg_con_barrel", new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.55, 10), mat(0x553322)).translateY(0.28).translateX(-5.5).translateZ(zBack)));
    root.add(tagged("fg_con_crate", box(0.9, 0.5, 0.7, mat(0x6a5030)).translateY(0.25).translateX(5.2).translateZ(-3)));
    root.add(streetLamp(-5, 2.8, "fg_con_lamp"));
    return;
  }
  if (locId === "parkour") {
    root.add(parkBench(-5, zBack));
    root.add(trashBin(5, -2.5, "fg_park_trash"));
    root.add(streetLamp(5.5, 2.5, "fg_park_lamp"));
    return;
  }
  if (locId === "kitchen") {
    root.add(tagged("fg_kitchen_crate", box(0.5, 0.5, 0.5, mat(0x6a5030)).translateY(0.25).translateX(-5).translateZ(zBack)));
    root.add(trashBin(5, -2, "fg_kitchen_trash"));
  }
}

function addForegroundCluster(locId, root) {
  if (["street", "room", "construction", "parkour", "kitchen"].includes(locId)) {
    addPerimeterDressing(locId, root);
    return;
  }
  if (locId === "elevator") {
    for (let i = 0; i < 22; i++) {
      const g = tagged(
        `elev_fg_detail_${i}`,
        box(0.07, 0.1, 0.04, mat(i % 2 ? 0xff00ff : 0x00ffff, i % 2 ? 0xff00ff : 0x00ffff))
      );
      g.position.set(-0.55 + (i % 7) * 0.17, 0.55 + Math.floor(i / 7) * 0.22, -0.9 + (i % 3) * 0.35);
      root.add(g);
    }
    return;
  }
  if (locId === "city") {
    for (let i = 0; i < 24; i++) {
      const g = tagged(
        `city_fg_sidewalk_${i}`,
        i % 3 === 0
          ? new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 5), mat(0x3a5a38))
          : box(0.12, 0.08, 0.12, mat(0x8a6030))
      );
      g.position.set(-3.5 + i * 0.45, i % 3 === 0 ? 0.08 : 0.04, 1.8 + (i % 4) * 0.55);
      root.add(g);
    }
  }
  const z = -4.8;
  root.add(parkBench(-4, z));
  root.add(streetLamp(4.5, z - 0.5, `fg_lamp_${locId}`));
  root.add(ironFence(-5.5, z + 1, 2));
  root.add(cemeteryCrypt(5, z - 0.5));
  root.add(tombstone(`fg_cross_${locId}`, -2, z + 0.5, true));
  root.add(tombstone(`fg_round_${locId}`, 2.5, z, false));
  root.add(trashBin(-3, z + 1.2, `fg_trash_${locId}`));
}

export function addShowcaseProps(locId, root) {
  groundScatter(root, locId);
  if (locId === "toilet") {
    root.add(tagged("stall_partition", box(0.08, 2, 1.2, mat(0x4a5868)).translateX(-1.5).translateY(1).translateZ(1.2)));
    root.add(tagged("stall_door", box(0.06, 1.8, 0.6, mat(0x5a6878)).translateX(-0.8).translateY(0.9).translateZ(1.6)));
    root.add(tagged("mirror_frame_prop", box(1.15, 1.4, 0.06, mat(0x334455)).translateX(-3.2).translateY(1.75).translateZ(-3.85)));
    root.add(tagged("sink_basin", box(0.8, 0.15, 0.45, mat(0x99aabb, 0, 0.35)).translateX(-3.2).translateY(0.95).translateZ(-2.8)));
    root.add(tagged("hand_dryer_prop", box(0.32, 0.5, 0.2, mat(0x8899aa)).translateX(3.5).translateY(1.35).translateZ(-2.5)));
    root.add(tagged("trash_can", box(0.32, 0.55, 0.32, mat(0x3a4048)).translateX(3.8).translateY(0.275).translateZ(2.2)));
    root.add(tagged("potted_plant", box(0.22, 0.5, 0.22, mat(0x228844)).translateX(-4.5).translateY(0.25).translateZ(2.8)));
    root.add(tagged("soap_dispenser", box(0.12, 0.2, 0.1, mat(0xccddee)).translateX(-2.8).translateY(1.05).translateZ(-2.9)));
    root.add(tagged("paper_towel", box(0.25, 0.35, 0.12, mat(0xeeeeff)).translateX(3.2).translateY(1.1).translateZ(-2.4)));
    root.add(tagged("toilet_paper_roll", box(0.14, 0.14, 0.14, mat(0xffffff)).translateX(2.6).translateY(0.55).translateZ(1.5)));
    root.add(tagged("grab_bar", box(0.05, 0.6, 0.05, mat(0x99aabb, 0, 0.3)).translateX(-2.2).translateY(1.1).translateZ(1.3)));
    root.add(tagged("neon_toilet_sign", box(0.8, 0.25, 0.05, mat(0xff00ff, 0xff00ff)).translateY(2.5).translateZ(-3.8)));
    const drain = new THREE.Mesh(new THREE.CircleGeometry(0.12, 10), mat(0x333344));
    drain.rotation.x = -Math.PI / 2;
    drain.position.set(0, 0.01, 0);
    root.add(tagged("floor_drain", drain));
    root.getObjectByName && root.add(tagged("urinal_fixture", box(0.35, 0.55, 0.25, mat(0xdde2e8)).translateX(-4).translateY(0.5).translateZ(-1)));
    root.add(tagged("hook_shelf", box(0.5, 0.08, 0.2, mat(0x5a6878)).translateX(4).translateY(1.6).translateZ(0.5)));
    root.add(tagged("air_freshener", box(0.08, 0.2, 0.08, mat(0x88ffcc, 0x44ffaa)).translateX(1.2).translateY(2.2).translateZ(-3.7)));
    root.add(tagged("bench_stool", box(0.35, 0.45, 0.35, mat(0x5a4030)).translateX(0.5).translateY(0.225).translateZ(2.5)));
    root.add(tagged("wall_tile_panel", box(2, 1.2, 0.02, mat(0x8899aa)).translateX(0).translateY(1.3).translateZ(-3.86)));
    root.add(tagged("graffiti_tag", box(1.2, 0.5, 0.02, mat(0x662244, 0xff00ff)).translateX(4.2).translateY(1.4).translateZ(-3.85)));
    root.add(tagged("sticker_cluster", box(0.3, 0.3, 0.02, mat(0x00ffff, 0x00ffff)).translateX(-4.8).translateY(1.5).translateZ(-3.84)));
    const bowl = new THREE.Group();
    bowl.add(box(0.24, 0.35, 0.28, mat(0xe8ecef)).translateY(0.2));
    const seat = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 8, 16), mat(0xdde2e8));
    seat.rotation.x = Math.PI / 2;
    seat.position.y = 0.38;
    bowl.add(seat);
    bowl.position.set(2.4, 0, 1.6);
    root.add(tagged("toilet_bowl_lid", bowl));
  } else if (locId === "elevator") {
    root.add(tagged("elev_door_left", box(0.5, 2, 0.05, mat(0xc8dcf0, 0x224466, 0.2)).translateY(1).translateZ(-1.38).translateX(-0.27)));
    root.add(tagged("elev_door_right", box(0.5, 2, 0.05, mat(0xc8dcf0, 0x224466, 0.2)).translateY(1).translateZ(-1.38).translateX(0.27)));
    root.add(tagged("elev_floor_panel", box(0.5, 0.3, 0.02, mat(0x00ffcc, 0x00ffcc)).translateY(2.15).translateZ(-1.35)));
    root.add(tagged("elev_button_panel", box(0.25, 0.75, 0.05, mat(0x1a1a22)).translateX(1.35).translateY(1.1).translateZ(0.45)));
    root.add(tagged("elev_mirror_wall", box(1.2, 1.5, 0.02, mat(0xb8d0e8, 0, 0.1)).translateX(-1.4).translateY(1.2).translateZ(0.15)));
    root.add(tagged("elev_handrail", box(2, 0.05, 0.05, mat(0x99aabb, 0, 0.3)).translateY(0.9).translateZ(-1.38)));
    root.add(tagged("elev_ceiling_light", new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat(0xffeedd, 0xffddaa)).rotateX(Math.PI / 2).translateY(2.35)));
    root.add(tagged("elev_corner_post", box(0.08, 2.2, 0.08, mat(0x666677)).translateX(-1.1).translateY(1.1).translateZ(-1.1)));
    root.add(tagged("elev_vent_grille", box(0.4, 0.15, 0.02, mat(0x444455)).translateY(2.25).translateZ(1.1)));
    root.add(tagged("elev_sticker_punk", box(0.35, 0.18, 0.02, mat(0xff00ff, 0xff00ff)).translateX(-1.35).translateY(0.95).translateZ(-1.42)));
    root.add(tagged("elev_sticker_13", box(0.2, 0.2, 0.02, mat(0x00ffff, 0x00ffff)).translateX(-1).translateY(1.35).translateZ(-1.42)));
    root.add(tagged("elev_cabinet", box(0.35, 0.9, 0.2, mat(0x3a3a48)).translateX(1.2).translateY(0.45).translateZ(-0.8)));
    root.add(tagged("elev_fire_ext", box(0.15, 0.45, 0.12, mat(0xcc2222, 0xff0000)).translateX(-1.25).translateY(0.8).translateZ(1.15)));
    root.add(tagged("elev_floor_mat", new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.8), mat(0x2a3040)).rotateX(-Math.PI / 2).translateY(0.01)));
    root.add(tagged("elev_call_button", new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.03, 12), mat(0xffcc00, 0xffaa00)).rotateX(Math.PI / 2).translateX(1.32).translateY(1.35).translateZ(0.32)));
    root.add(tagged("elev_info_card", box(0.22, 0.14, 0.01, mat(0xffffff)).translateX(1.33).translateY(0.85).translateZ(0.46)));
    root.add(tagged("elev_bumper_rail", box(0.05, 0.4, 1.5, mat(0x888899)).translateX(-1.05).translateY(0.2).translateZ(0)));
    root.add(tagged("elev_led_strip", box(1.8, 0.04, 0.04, mat(0x00ffcc, 0x00ffcc)).translateY(0.05).translateZ(-1.42)));
    root.add(tagged("elev_speaker", box(0.12, 0.18, 0.08, mat(0x222228)).translateY(2.2).translateX(0.5)));
    root.add(tagged("elev_camera_dome", new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), mat(0x111118)).translateY(2.28).translateX(-0.4)));
    root.add(tagged("elev_scuff_mark", new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), mat(0x1a1820)).rotateX(-Math.PI / 2).translateY(0.012).translateZ(0.3)));
  } else if (locId === "kitchen") {
    root.add(tagged("kitchen_stove", box(0.7, 0.9, 0.55, mat(0x3a3a40)).translateY(0.45).translateZ(-4.1)));
    root.add(tagged("kitchen_fridge", box(0.85, 2, 0.7, mat(0xe8ecef)).translateY(1).translateX(-4.3).translateZ(-4)));
    root.add(tagged("kitchen_sink", box(0.7, 0.2, 0.45, mat(0x99aabb, 0, 0.35)).translateY(0.9).translateX(-2.5).translateZ(-4.05)));
    root.add(tagged("kitchen_microwave", box(0.45, 0.32, 0.38, mat(0x2a2a30)).translateY(1.05).translateX(2.5).translateZ(-4.2)));
    root.add(tagged("kitchen_hood", box(0.9, 0.35, 0.5, mat(0x555560)).translateY(1.35).translateZ(-4.45)));
    root.add(tagged("kitchen_pot", new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.2, 10), mat(0x888899)).translateY(1.02).translateZ(-4.15)));
    root.add(tagged("kitchen_kettle", box(0.2, 0.22, 0.18, mat(0xcc2222, 0xff4444)).translateY(1.02).translateZ(-4)));
    root.add(tagged("kitchen_jar_row", box(0.9, 0.25, 0.15, mat(0xffcc88)).translateY(2.35).translateZ(-4.55)));
    root.add(tagged("kitchen_cabinet", box(1, 0.8, 0.35, mat(0x5a4030)).translateY(2.35).translateX(-3.5).translateZ(-4.55)));
    root.add(tagged("kitchen_neon_punk", box(1.2, 0.35, 0.05, mat(0xff3399, 0xff3399)).translateY(2.15).translateZ(-4.85)));
    root.add(tagged("kitchen_rug", new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), mat(0x5a2040)).rotateX(-Math.PI / 2).translateY(0.01).translateZ(1.2)));
    root.add(tagged("kitchen_jukebox", box(0.55, 1.05, 0.4, mat(0x331144, 0xff00ff)).translateY(0.52).translateX(4.2).translateZ(2.8)));
    root.add(tagged("kitchen_chair", box(0.35, 0.45, 0.35, mat(0x4a3048)).translateY(0.225).translateX(1.5).translateZ(0.5)));
    root.add(tagged("kitchen_table", box(1.2, 0.08, 0.7, mat(0x5a4030)).translateY(0.75).translateX(0).translateZ(1.8)));
    root.add(tagged("kitchen_bottle", box(0.08, 0.28, 0.08, mat(0x88aa44)).translateY(0.14).translateX(3.5).translateZ(2.5)));
    root.add(tagged("kitchen_can", box(0.1, 0.14, 0.1, mat(0xff6600)).translateY(0.07).translateX(-3).translateZ(1)));
    root.add(tagged("kitchen_poster", box(1.5, 1, 0.02, mat(0x442266, 0x220044)).translateY(1.55).translateX(0).translateZ(-4.88)));
    root.add(tagged("kitchen_utensil_rack", box(0.6, 0.05, 0.08, mat(0x888888)).translateY(1.15).translateX(3).translateZ(-4.5)));
    root.add(tagged("kitchen_cutting_board", box(0.35, 0.04, 0.25, mat(0x8a6040)).translateY(0.98).translateZ(-4.12)));
    root.add(tagged("kitchen_trash_bin", box(0.28, 0.4, 0.28, mat(0x333344)).translateY(0.2).translateX(4.5).translateZ(-2)));
    root.add(tagged("kitchen_clock", new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 16), mat(0xffffff, 0xffffcc)).rotateX(Math.PI / 2).translateY(2.5).translateX(-5.5)));
    root.add(tagged("kitchen_spice_rack", box(0.35, 0.4, 0.12, mat(0x664422)).translateY(1.1).translateX(-5).translateZ(-4.4)));
    for (let i = 0; i < 12; i++) {
      const g = tagged(
        `kitchen_mobile_fg_${i}`,
        box(0.14, 0.1 + (i % 3) * 0.06, 0.14, mat(0xff6600 + (i * 11_371) % 0x222222))
      );
      g.position.set(-2.8 + (i % 6) * 0.55, 0.05 + (i % 2) * 0.08, 0.4 + Math.floor(i / 6) * 0.65);
      root.add(g);
    }
    root.add(tagged("kitchen_pumpkin_fg", new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(0xff6600, 0xff4400)).translateY(0.22).translateX(-1.2).translateZ(1.1)));
    root.add(tagged("kitchen_graffiti_fg", box(1.4, 0.9, 0.03, mat(0x442266, 0xff00ff)).translateY(1.35).translateX(2.2).translateZ(0.8)));
    root.add(tagged("kitchen_bike_fg", box(0.9, 0.45, 0.2, mat(0x666677)).translateY(0.22).translateX(-0.5).translateZ(1.6)));
    for (let i = 0; i < 10; i++) {
      const g = tagged(
        `kitchen_portrait_fg_${i}`,
        box(0.16, 0.12 + (i % 2) * 0.08, 0.16, mat(0xff6600 + (i * 17_371) % 0x222222))
      );
      g.position.set(-2.2 + (i % 5) * 0.48, 0.06 + (i % 2) * 0.06, -1.2 + Math.floor(i / 5) * 0.85);
      root.add(g);
    }
    root.add(tagged("kitchen_portrait_bin", box(0.3, 0.45, 0.3, mat(0x333344)).translateY(0.22).translateX(1.8).translateZ(-0.6)));
    root.add(tagged("kitchen_portrait_lamp", box(0.12, 0.9, 0.12, mat(0xffcc00, 0xffaa00)).translateY(0.45).translateX(-1.5).translateZ(-0.2)));
    root.add(tagged("kitchen_portrait_poster", box(0.9, 0.7, 0.03, mat(0x442266, 0xff00ff)).translateY(1.35).translateX(0.5).translateZ(-0.4)));
  } else if (locId === "room") {
    root.add(tagged("room_graffiti_wall", box(2.4, 1.6, 0.04, mat(0x331144, 0xff00ff)).translateY(1.45).translateZ(-5.7)));
    root.add(tagged("room_neon_punk", box(1.4, 0.35, 0.05, mat(0x00ffff, 0x00ffff)).translateY(2.35).translateZ(-5.65)));
    root.add(tagged("room_poster_punk", box(1.1, 1.5, 0.03, mat(0x552266, 0x220044)).translateY(1.55).translateX(-5.5).translateZ(-2)));
    root.add(tagged("room_beanbag_fg", box(0.9, 0.35, 0.9, mat(0x5a2048)).translateY(0.18).translateX(-5.2).translateZ(-1.5)));
    root.add(tagged("room_sofa_fg", box(1.3, 0.38, 0.6, mat(0x4a2848)).translateY(0.2).translateX(5.2).translateZ(-0.8)));
    root.add(tagged("room_guitar_stand", box(0.35, 0.12, 0.1, mat(0xcc2222)).translateY(0.55).translateX(-5.5).translateZ(0.5)));
    root.add(tagged("room_amp_stack", box(0.5, 0.75, 0.4, mat(0x111122, 0x00ffff)).translateY(0.38).translateX(5.5).translateZ(1.2)));
    root.add(tagged("room_tv_crt", box(0.75, 0.5, 0.08, mat(0x111118, 0x224466)).translateY(1.05).translateX(-3.5).translateZ(-5.5)));
    root.add(tagged("room_bookshelf_fg", box(0.9, 1.35, 0.28, mat(0x5a4030)).translateY(0.68).translateX(-5).translateZ(1.5)));
    root.add(tagged("room_rug_fg", new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), mat(0x5a2040)).rotateX(-Math.PI / 2).translateY(0.015).translateZ(1.5)));
    root.add(tagged("room_skull_lamp", box(0.2, 0.32, 0.2, mat(0xddddcc, 0xaaccaa)).translateY(1.6).translateX(-2).translateZ(-5.5)));
    root.add(tagged("room_pumpkin", new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), mat(0xff6600, 0xff4400)).translateY(0.24).translateX(-4.8).translateZ(-2.8)));
    root.add(tagged("room_trash_bin", box(0.32, 0.55, 0.32, mat(0x3a4048)).translateY(0.275).translateX(4.8).translateZ(-2.5)));
    root.add(tagged("room_plant_pot", box(0.28, 0.55, 0.28, mat(0x228844)).translateY(0.28).translateX(-4.5).translateZ(1.8)));
    root.add(tagged("room_chain_lamp", box(0.08, 1.2, 0.08, mat(0x888899, 0xffcc00)).translateY(1.8).translateX(1.5).translateZ(0.5)));
    root.add(streetLamp(-5.5, -2.5, "room_floor_lamp_w"));
    root.add(streetLamp(5.5, -1.8, "room_floor_lamp_e"));
    root.add(parkBench(-4.8, -3.5));
    root.add(tagged("room_sticker_cluster", box(0.4, 0.35, 0.02, mat(0xff00ff, 0xff00ff)).translateY(1.7).translateX(5.2).translateZ(-5.6)));
    for (let i = 0; i < 8; i++) {
      const g = tagged(`room_floor_clutter_${i}`, box(0.12, 0.08, 0.12, mat(0x8a6030 + (i * 9137) % 0x111111)));
      g.position.set(-3.5 + i * 0.42, 0.04, -3.8 + (i % 3) * 0.35);
      root.add(g);
    }
    for (let i = 0; i < 12; i++) {
      const g = tagged(`room_wall_tag_${i}`, box(0.22, 0.28, 0.03, mat(0x442266 + (i * 11_371) % 0x111111)));
      g.position.set(-5.2 + (i % 6) * 0.55, 0.9 + Math.floor(i / 6) * 0.65, -5.68);
      root.add(g);
    }
  } else if (locId === "street") {
    root.add(tagged("street_graffiti_mural", box(3.2, 2, 0.05, mat(0x442266, 0xff00ff)).translateY(1.5).translateX(-1).translateZ(-6.5)));
    root.add(tagged("street_neon_gang", box(2.2, 0.45, 0.05, mat(0xff00ff, 0xff00ff)).translateY(3.2).translateZ(-5.8)));
    root.add(tagged("street_neon_shop", box(1.8, 0.35, 0.05, mat(0x00ffff, 0x00ffff)).translateY(2.8).translateX(4.5).translateZ(-4.2)));
    root.add(streetLamp(-5.2, -2.5, "street_lamp_sw"));
    root.add(streetLamp(5.2, -1.8, "street_lamp_se"));
    root.add(streetLamp(-1.2, -4.2, "street_lamp_n"));
    root.add(parkBench(-2.8, -3.5));
    root.add(tagged("street_dumpster", box(1.1, 0.95, 0.75, mat(0x3a4048)).translateY(0.48).translateX(-5.8).translateZ(-3.2)));
    root.add(tagged("street_hydrant", box(0.35, 0.55, 0.35, mat(0xcc2222, 0xff0000)).translateY(0.28).translateX(5.5).translateZ(-2.8)));
    root.add(tagged("street_trash_can", box(0.45, 0.75, 0.45, mat(0x3a4048)).translateY(0.38).translateX(-4.2).translateZ(-4.5)));
    root.add(tagged("street_bike_rack", box(1.2, 0.5, 0.15, mat(0x666677)).translateY(0.25).translateX(3.8).translateZ(-3.8)));
    root.add(bikeProp(3.9, -3.9, "street_bike_prop"));
    root.add(tagged("street_pumpkin_row", new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(0xff6600, 0xff4400)).translateY(0.22).translateX(-3).translateZ(-2.5)));
    root.add(tagged("street_news_stand", box(0.9, 1.2, 0.6, mat(0x553366)).translateY(0.6).translateX(5.2).translateZ(-1.2)));
    root.add(tagged("street_vending", box(0.65, 1.65, 0.55, mat(0x223344, 0x004466)).translateY(0.82).translateX(-5.5).translateZ(-0.5)));
    root.add(tagged("street_mailbox", box(0.35, 1.1, 0.25, mat(0x2255aa, 0x0033aa)).translateY(0.55).translateX(5.8).translateZ(-3.2)));
    root.add(tagged("street_crate_stack", box(0.5, 0.8, 0.5, mat(0x6a5030)).translateY(0.4).translateX(-5.8).translateZ(-4.8)));
    root.add(tagged("street_parking_meter", box(0.12, 1.1, 0.12, mat(0x888899)).translateY(0.55).translateX(2.5).translateZ(-2.2)));
    root.add(tagged("street_poster_band", box(0.9, 1.2, 0.03, mat(0x662244, 0xff00ff)).translateY(1.4).translateX(-5.5).translateZ(-3.5)));
    root.add(tagged("street_scaffold", box(0.12, 2.8, 0.12, mat(0x888888)).translateY(1.4).translateX(6).translateZ(-2)));
    root.add(tagged("street_brick_pile", box(1.2, 0.45, 0.8, mat(0x884422)).translateY(0.22).translateX(-2.5).translateZ(-1.5)));
    root.add(tagged("street_barrel", new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.55, 10), mat(0x553322)).translateY(0.28).translateX(3.5).translateZ(-0.5)));
    for (let i = 0; i < 6; i++) {
      const g = tagged(`street_litter_${i}`, box(0.1, 0.06, 0.14, mat(0x8a6030)));
      g.position.set(-2 + i * 0.55, 0.03, -3.5 + (i % 2) * 0.4);
      root.add(g);
    }
    for (let i = 0; i < 10; i++) {
      const g = tagged(`street_back_detail_${i}`, box(0.22, 0.35 + (i % 3) * 0.08, 0.22, mat(0x445566 + (i * 12_371) % 0x111111)));
      g.position.set(-5 + (i % 5) * 2.2, 0.18, -5.2 - Math.floor(i / 5) * 0.8);
      root.add(g);
    }
    root.add(tagged("street_fence_back", ironFence(0, -5.8, 5)));
    root.add(tagged("street_extra_bench", parkBench(-2.5, -4.8)));
    const exHyd = box(0.35, 0.55, 0.35, mat(0xcc2222, 0xff0000));
    exHyd.position.set(3.8, 0.28, -4.5);
    root.add(tagged("street_extra_hydrant", exHyd));
  } else if (locId === "construction") {
    root.add(tagged("con_scaffold_tower", box(0.15, 3.2, 0.15, mat(0x888888)).translateY(1.6).translateX(-3).translateZ(2.5)));
    root.add(tagged("con_scaffold_beam", box(2.5, 0.12, 0.12, mat(0x999999)).translateY(2.4).translateX(-2).translateZ(2.5)));
    root.add(tagged("con_brick_pile_a", box(1.4, 0.5, 0.9, mat(0x884422)).translateY(0.25).translateX(2.2).translateZ(1.8)));
    root.add(tagged("con_brick_pile_b", box(1.1, 0.4, 0.7, mat(0x774422)).translateY(0.2).translateX(2.8).translateZ(2.6)));
    root.add(tagged("con_tool_crate", box(0.55, 0.45, 0.45, mat(0xcc2222)).translateY(0.22).translateX(-1.5).translateZ(3.2)));
    root.add(tagged("con_barrel", new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.6, 10), mat(0x553322)).translateY(0.3).translateX(0.8).translateZ(3.5)));
    root.add(tagged("con_caution_sign", box(0.5, 0.65, 0.05, mat(0xffcc00, 0xffaa00)).translateY(0.35).translateX(-2.8).translateZ(1.2)));
    root.add(tagged("con_neon_site", box(1.6, 0.35, 0.05, mat(0xff8800, 0xff6600)).translateY(2.5).translateZ(-3.5)));
    root.add(tagged("con_pumpkin", new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), mat(0xff6600, 0xff4400)).translateY(0.24).translateX(-4).translateZ(2.8)));
    root.add(tagged("con_graffiti", box(2, 1.2, 0.04, mat(0x442266, 0xff00ff)).translateY(1.3).translateX(4.5).translateZ(-2.8)));
    root.add(streetLamp(-4.5, 3.5, "con_lamp_w"));
    root.add(streetLamp(4, 2.8, "con_lamp_e"));
    root.add(parkBench(0, 4));
    root.add(tagged("con_dumpster", box(1.1, 0.95, 0.75, mat(0x3a4048)).translateY(0.48).translateX(-5).translateZ(0.5)));
    root.add(tagged("con_wood_pallet", box(1.2, 0.12, 1, mat(0x6a5030)).translateY(0.06).translateX(1.5).translateZ(-1.2)));
    root.add(tagged("con_cement_bags", box(0.9, 0.35, 0.5, mat(0xaaaaaa)).translateY(0.18).translateX(-0.5).translateZ(-2)));
    root.add(tagged("con_hard_hat", box(0.35, 0.18, 0.35, mat(0xffcc00, 0xffaa00)).translateY(0.5).translateX(3.2).translateZ(0.8)));
    root.add(tagged("con_chain_fence", box(2.2, 0.9, 0.06, mat(0x666677)).translateY(0.45).translateX(-3.5).translateZ(-1.5)));
    for (let i = 0; i < 8; i++) {
      const g = tagged(`con_debris_${i}`, box(0.15, 0.1, 0.15, mat(0x555566 + (i * 9973) % 0x111111)));
      g.position.set(-2.5 + i * 0.45, 0.05, 1.2 + (i % 3) * 0.5);
      root.add(g);
    }
  } else if (locId === "parkour") {
    root.add(tagged("park_ramp_a", box(2.2, 0.35, 1.2, mat(0x666677)).translateY(0.18).translateX(-2).translateZ(2.5).rotateY(0.2)));
    root.add(tagged("park_ramp_b", box(1.8, 0.28, 1, mat(0x555566)).translateY(0.14).translateX(2.5).translateZ(1.8).rotateY(-0.15)));
    root.add(tagged("park_neon_finish", box(1.6, 0.35, 0.05, mat(0x00ffff, 0x00ffff)).translateY(2.4).translateZ(-4.5)));
    root.add(tagged("park_graffiti", box(2.4, 1.5, 0.04, mat(0x442266, 0xff00ff)).translateY(1.4).translateX(-4).translateZ(-5.5)));
    root.add(tagged("park_pumpkin", new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), mat(0xff6600, 0xff4400)).translateY(0.22).translateX(3.5).translateZ(3.2)));
    root.add(streetLamp(-3, 3.5, "park_lamp_w"));
    root.add(streetLamp(3.5, 2.8, "park_lamp_e"));
    root.add(parkBench(-1, 4.2));
    root.add(tagged("park_trash", box(0.32, 0.55, 0.32, mat(0x3a4048)).translateY(0.275).translateX(1.2).translateZ(4.2)));
    root.add(tagged("park_bike", box(0.9, 0.45, 0.2, mat(0xcc2222)).translateY(0.22).translateX(-4).translateZ(1.5)));
    root.add(tagged("park_crate", box(0.55, 0.55, 0.55, mat(0x6a5030)).translateY(0.275).translateX(4.2).translateZ(0.5)));
    root.add(tagged("park_barrel", new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.55, 10), mat(0x553322)).translateY(0.28).translateX(0.5).translateZ(-2.5)));
    root.add(tagged("park_poster", box(1, 1.3, 0.03, mat(0x662244, 0xff00ff)).translateY(1.45).translateX(5).translateZ(-3)));
    root.add(tagged("park_chain_rail", box(2.5, 0.08, 0.08, mat(0x00ffff, 0x00ffff)).translateY(1.05).translateX(0).translateZ(5.5)));
    for (let i = 0; i < 10; i++) {
      const g = tagged(`park_obstacle_${i}`, box(0.35, 0.25 + (i % 3) * 0.12, 0.35, mat(0x445566 + (i * 12_371) % 0x111111)));
      g.position.set(-3.5 + (i % 5) * 1.1, 0.12 + (i % 3) * 0.12, -1 + Math.floor(i / 5) * 2.2);
      root.add(g);
    }
  } else if (locId === "city") {
    for (let i = 0; i < 22; i++) {
      const g = tagged(
        `city_view_row_${i}`,
        box(0.22, 0.45, 0.22, mat(0x445566 + (i * 97_391) % 0x111111))
      );
      g.position.set(-3.2 + (i % 11) * 0.62, 0.22, 0.4 + Math.floor(i / 11) * 0.75);
      root.add(g);
    }
    root.add(streetLamp(-2, 3, "street_lamp_n"));
    root.add(streetLamp(2, 3, "street_lamp_e"));
    root.add(streetLamp(-5, -1, "street_lamp_w"));
    root.add(parkBench(4, 2.2));
    root.add(tagged("shopfront_bodega", box(3.5, 1.2, 0.2, mat(0x3a3548, 0x220044)).translateY(0.6).translateX(-5).translateZ(-8.1)));
    root.add(tagged("shopfront_pizza", box(3.2, 1, 0.15, mat(0xff3366, 0xff2244)).translateY(0.55).translateX(5).translateZ(-7.8)));
    root.add(tagged("vending_machine", box(0.65, 1.65, 0.55, mat(0x223344, 0x004466)).translateY(0.82).translateX(2.8).translateZ(4.2)));
    root.add(tagged("bus_stop_shelter", box(2.2, 2.4, 0.12, mat(0x3a4050)).translateY(1.2).translateX(-3.5).translateZ(4.5)));
    root.add(tagged("traffic_light", box(0.25, 3, 0.25, mat(0x2a2a30)).translateY(1.5).translateX(2.2).translateZ(3.2)));
    root.add(tagged("hydrant_city", box(0.35, 0.55, 0.35, mat(0xcc2222, 0xff0000)).translateY(0.28).translateX(-3).translateZ(1.5)));
    root.add(tagged("trash_can_city", box(0.45, 0.75, 0.45, mat(0x3a4048)).translateY(0.38).translateX(-1.5).translateZ(3.8)));
    root.add(tagged("mailbox", box(0.35, 1.1, 0.25, mat(0x2255aa, 0x0033aa)).translateY(0.55).translateX(6).translateZ(2)));
    root.add(tagged("news_stand", box(0.9, 1.2, 0.6, mat(0x553366)).translateY(0.6).translateX(-6).translateZ(5)));
    root.add(tagged("bike_rack", box(1.2, 0.5, 0.15, mat(0x666677)).translateY(0.25).translateX(0).translateZ(5.5)));
    root.add(tagged("awning_striped", box(2.5, 0.08, 1, mat(0xff00ff, 0xff00ff)).translateY(2.2).translateX(-5).translateZ(-8)));
    root.add(tagged("window_display", box(1.2, 0.9, 0.05, mat(0xffffcc, 0xffaa66)).translateY(0.95).translateX(0).translateZ(-8.1)));
    root.add(tagged("city_planter", box(0.6, 0.45, 0.6, mat(0x5a4030)).translateY(0.225).translateX(1).translateZ(4)));
    root.add(tagged("city_planter_tree", box(0.15, 1.2, 0.15, mat(0x2a2018)).translateY(0.6).translateX(1).translateZ(4)));
    root.add(tagged("parking_meter", box(0.12, 1.1, 0.12, mat(0x888899)).translateY(0.55).translateX(5.5).translateZ(3.5)));
    root.add(tagged("crate_stack", box(0.5, 0.8, 0.5, mat(0x6a5030)).translateY(0.4).translateX(-7).translateZ(5)));
    root.add(tagged("neon_arrow", box(1.5, 0.2, 0.05, mat(0x00ffff, 0x00ffff)).translateY(3).translateZ(-7.5)));
    root.add(tagged("city_dumpster", box(1.1, 0.95, 0.75, mat(0x3a4048)).translateY(0.48).translateX(-8).translateZ(2)));
    root.add(tagged("city_fire_escape", box(0.12, 2.8, 0.5, mat(0x555566)).translateY(1.4).translateX(7.5).translateZ(-6)));
    root.add(tagged("city_mural", box(2.2, 1.6, 0.05, mat(0x442266, 0x220044)).translateY(1.2).translateX(-2).translateZ(-8.05)));
  } else if (locId === "cemetery") {
    root.add(cemeteryCrypt(5, -2));
    root.add(ironFence(-4, 5, 4));
    root.add(ironFence(4, -4, 3));
    root.add(tombstone("tomb_round_1", -3, -2, false));
    root.add(tombstone("tomb_round_2", 1, -3, false));
    root.add(tombstone("tomb_cross_1", -1, 1, true));
    root.add(tombstone("tomb_cross_2", 3, 2, true));
    root.add(tombstone("tomb_round_3", -5, 3, false));
    root.add(streetLamp(-2, 4, "cemetery_lamp_w"));
    root.add(streetLamp(2, -1, "cemetery_lamp_e"));
    for (let i = 0; i < 5; i++) {
      const c = new THREE.Group();
      c.add(box(0.05, 0.22, 0.05, mat(0x442211)));
      const flame = box(0.05, 0.07, 0.05, mat(0xffaa22, 0xff6600));
      flame.position.y = 0.26;
      c.add(flame);
      c.position.set(-2.5 + i * 1.1, 0, -1.5 + (i % 2));
      root.add(tagged(`candle_row_${i}`, c));
    }
    root.add(tagged("cemetery_gate_arch", box(2.5, 0.15, 0.2, mat(0x3a4a40)).translateY(2.3).translateZ(-7.8)));
    root.add(tagged("cemetery_pumpkin", new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 8), mat(0xff6600, 0xff4400)).translateY(0.25).translateX(-5).translateZ(4)));
    root.add(tagged("cemetery_ghost_float", box(0.35, 0.5, 0.15, mat(0xaaddff, 0x88ccff)).translateY(1).translateX(2).translateZ(3)));
    const deadTree = new THREE.Group();
    deadTree.add(box(0.22, 2.5, 0.22, mat(0x2a1810)).translateY(1.25));
    deadTree.add(box(1.4, 0.08, 0.08, mat(0x1a1010)).translateY(2.6).rotateZ(0.5));
    deadTree.position.set(-2, 0, 4);
    root.add(tagged("dead_tree", deadTree));
    const bench = parkBench(-3, 0);
    bench.userData.propTag = "cemetery_bench";
    root.add(bench);
    root.add(streetLamp(0, 2, "cemetery_lantern_post"));
    root.add(tagged("cemetery_fence_gate", box(1.2, 1, 0.08, mat(0x3a4048)).translateY(0.5).translateZ(-7.5)));
  } else if (locId === "roof") {
    root.add(tagged("roof_ac_unit", box(1.2, 0.8, 1, mat(0x666677)).translateY(0.4).translateX(-4).translateZ(2)));
    root.add(tagged("roof_satellite", new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.35, 0.25, 12), mat(0x888899)).rotateX(0.4).translateY(1.2).translateX(3).translateZ(-3)));
    root.add(tagged("roof_chimney_pot", box(0.6, 1.2, 0.6, mat(0x553333)).translateY(0.6).translateX(3).translateZ(-6)));
    root.add(tagged("roof_neon_sign", box(2, 0.4, 0.05, mat(0xff66ff, 0xff66ff)).translateY(3.5).translateZ(-7)));
    root.add(tagged("roof_vent_pipe", new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.8, 8), mat(0x777788)).translateY(0.9).translateX(-2).translateZ(-4)));
    root.add(tagged("roof_solar_panel", box(1.4, 0.06, 0.9, mat(0x1a2848, 0x003366)).translateY(0.5).translateX(0).translateZ(3)));
    root.add(tagged("roof_railing_section", box(2, 0.08, 0.08, mat(0x00ffff, 0x00ffff)).translateY(1.05).translateX(0).translateZ(7.5)));
    root.add(tagged("roof_water_tank", new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 14), mat(0x667788)).translateY(0.6).translateX(-7).translateZ(-5)));
    root.add(tagged("roof_antenna", box(0.05, 2.5, 0.05, mat(0x999999)).translateY(1.25).translateX(5).translateZ(-8)));
    root.add(tagged("roof_crate", box(0.55, 0.55, 0.55, mat(0x5a4030)).translateY(0.275).translateX(2).translateZ(4)));
    root.add(tagged("roof_skylight", box(1.2, 0.08, 1.2, mat(0x88ccff, 0x4488ff)).translateY(0.04).translateX(-1).translateZ(0)));
    root.add(tagged("roof_pigeon_coop", box(0.7, 0.5, 0.7, mat(0x6a5040)).translateY(0.25).translateX(6).translateZ(1)));
    root.add(tagged("roof_lounge_chair", box(0.5, 0.15, 1.2, mat(0xff00aa, 0xff0066)).translateY(0.4).translateZ(5)));
    root.add(tagged("roof_potted_plant", box(0.35, 0.5, 0.35, mat(0x228844)).translateY(0.25).translateX(-5).translateZ(5)));
    root.add(tagged("roof_string_lights", box(3, 0.04, 0.04, mat(0xffff88, 0xffff00)).translateY(2.8).translateZ(6)));
    root.add(tagged("roof_ladder", box(0.35, 2.2, 0.08, mat(0x888888)).translateY(1.1).translateX(8).translateZ(0)));
    root.add(tagged("roof_helipad_mark", new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 16), mat(0xffff00, 0xffcc00)).rotateX(-Math.PI / 2).translateY(0.015).translateZ(-2)));
    root.add(tagged("roof_billboard", box(2.5, 1.4, 0.1, mat(0x2a1848, 0xff00ff)).translateY(2).translateX(-6).translateZ(-10)));
    root.add(tagged("roof_pipe_cluster", box(0.4, 0.6, 0.4, mat(0x555566)).translateY(0.3).translateX(1).translateZ(-5)));
    root.add(tagged("roof_toolbox", box(0.35, 0.22, 0.22, mat(0xcc2222)).translateY(0.11).translateX(4).translateZ(2)));
    root.add(tagged("roof_gutter", box(4, 0.08, 0.15, mat(0x666677)).translateY(1.08).translateX(0).translateZ(-7.8)));
  }
  if (["toilet", "elevator", "kitchen", "city", "cemetery", "roof", "room", "street", "construction", "parkour"].includes(locId)) {
    addForegroundCluster(locId, root);
  }
}
