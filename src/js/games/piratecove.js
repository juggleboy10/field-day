  // ---------------- Pirate Cove: a jungle island, a wrecked ship, smugglers' caves, and Captain Saltbeard's treasure
  // Its crew are new enemies, and the gunners fire a new projectile: lead shot, with a puff of a muzzle flash.
  PROJ.shot = { code: 3, speed: 12, gravity: 1.6, color: 0x2a2a2a, glow: 0xffd890, size: 0.18, dmg: 1 };
  PROJ_BY_CODE.push(PROJ.shot);
  defEnemy('pirate', { hp: 3, r: 0.4, h: 1.65, speed: 1.8, ai: 'melee', reach: 1.2, windup: 0.5, cool: 1.3, dmg: 1,
    mesh(g, arm, M) {
      const skin = M(0xd8a878), shirt = M(0xf2ece0), sash = M(0xc23a3a), pants = M(0x3a3a52), band = M(0xd83a3a);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(cyl(0.08, 0.07, 0.6, 6), pants), sx * 0.11, 0.3, 0));
      g.add(at(new THREE.Mesh(cyl(0.22, 0.26, 0.6), shirt), 0, 0.92, 0), at(new THREE.Mesh(cyl(0.27, 0.27, 0.1), sash), 0, 0.66, 0));
      for (let k = 0; k < 3; k++) g.add(at(new THREE.Mesh(cyl(0.232, 0.232, 0.05), M(0x2a4a8a)), 0, 0.8 + k * 0.14, 0));
      g.add(at(new THREE.Mesh(sph(0.2), skin), 0, 1.42, 0));
      const bandana = at(new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), band), 0, 1.46, 0); g.add(bandana);
      g.add(at(new THREE.Mesh(sph(0.035, 6, 5), glowEye(0xfff0c0)), 0.07, 1.44, -0.18), at(new THREE.Mesh(boxg(0.08, 0.06, 0.02), M(0x111111)), -0.07, 1.45, -0.19));
      arm.position.set(0.3, 1.0, 0);
      arm.add(at(new THREE.Mesh(cyl(0.05, 0.05, 0.38, 6), skin), 0, -0.12, -0.08));
      const blade = at(new THREE.Mesh(boxg(0.04, 0.08, 0.7), M(0xd8dce8)), 0, -0.15, -0.5); blade.rotation.x = -0.15;
      arm.add(blade, at(new THREE.Mesh(boxg(0.16, 0.04, 0.06), M(0xe8b54a)), 0, -0.15, -0.16));
    } });
  defEnemy('gunner', { hp: 2, r: 0.38, h: 1.75, speed: 1.4, ai: 'ranged', proj: 'shot', windup: 0.8, cool: 2.7, keep: [5, 9],
    mesh(g, arm, M) {
      const skin = M(0xc89870), coat = M(0x2a3a6a), trim = M(0xe8b54a), pants = M(0xe8e0c8), dark = M(0x1a1a22);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(cyl(0.08, 0.07, 0.6, 6), pants), sx * 0.11, 0.3, 0));
      g.add(at(new THREE.Mesh(cyl(0.2, 0.32, 0.85), coat), 0, 0.95, 0), at(new THREE.Mesh(cyl(0.205, 0.205, 0.06), trim), 0, 1.3, 0), at(new THREE.Mesh(sph(0.19), skin), 0, 1.55, 0));
      const hat = at(new THREE.Mesh(cyl(0.3, 0.3, 0.05, 3), dark), 0, 1.72, 0); hat.rotation.y = Math.PI; g.add(hat, at(new THREE.Mesh(cyl(0.14, 0.17, 0.16, 10), dark), 0, 1.8, 0));
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.03, 6, 5), glowEye(0xfff0c0)), sx * 0.07, 1.57, -0.17));
      arm.position.set(0.28, 1.25, 0);
      arm.add(at(new THREE.Mesh(boxg(0.06, 0.07, 0.42), M(0x5a3a22)), 0, 0, -0.25), at(new THREE.Mesh(cyl(0.025, 0.025, 0.3, 8), dark), 0, 0.03, -0.45));
      arm.children[1].rotation.x = Math.PI / 2;
    } });
  defEnemy('parrot', { hp: 1, r: 0.3, h: 0.4, fly: 2.4, speed: 3.6, ai: 'flyer', reach: 0.95, windup: 0.3, cool: 1.5, dmg: 1,
    mesh(g, arm, M) {
      const body = new THREE.Mesh(sph(0.13), M(0x2ab84a)); body.scale.set(0.9, 1, 1.3); g.add(body);
      g.add(at(new THREE.Mesh(sph(0.09), M(0xe83a3a)), 0, 0.1, -0.12), at(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 6), M(0xffd23f)), 0, 0.08, -0.22));
      g.children[2].rotation.x = -Math.PI / 2;
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.02, 6, 5), glowEye(0x111111)), sx * 0.05, 0.13, -0.17));
      g.add(at(new THREE.Mesh(boxg(0.06, 0.02, 0.26), M(0x2a6ae8)), 0, -0.02, 0.22));
      for (const sx of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.04, 3), M(sx < 0 ? 0x2a6ae8 : 0xffd23f)); w.rotation.z = sx * Math.PI / 2; w.scale.set(1, 1, 2);
        const hold = new THREE.Group(); hold.position.x = sx * 0.1; w.position.x = sx * 0.15; hold.add(w); hold.userData.side = sx;
        arm.add(hold);
      }
      arm.userData.flap = true;
    } });
  defEnemy('crab', { hp: 1, r: 0.32, h: 0.4, speed: 2.2, ai: 'melee', reach: 0.8, windup: 0.4, cool: 1.2, dmg: 1,
    mesh(g, arm, M) {
      const shell = M(0xe8582a), dark = M(0xb83a1a);
      const body = new THREE.Mesh(sph(0.22), shell); body.scale.set(1.3, 0.55, 1); body.position.y = 0.2; g.add(body);
      for (const sx of [-1, 1]) {
        g.add(at(new THREE.Mesh(cyl(0.015, 0.015, 0.12, 5), dark), sx * 0.07, 0.34, -0.12), at(new THREE.Mesh(sph(0.035, 6, 5), glowEye(0x111111)), sx * 0.07, 0.41, -0.12));
        for (let k = 0; k < 3; k++) { const leg = at(new THREE.Mesh(cyl(0.02, 0.015, 0.26, 5), dark), sx * 0.3, 0.1, -0.08 + k * 0.1); leg.rotation.z = sx * 0.9; g.add(leg); }
      }
      arm.position.set(0, 0.22, -0.22);
      for (const sx of [-1, 1]) { const claw = at(new THREE.Mesh(sph(0.09), shell), sx * 0.2, 0, -0.08); claw.scale.set(1, 0.7, 1.3); arm.add(claw); }
    } });
  defEnemy('bosun', { hp: 7, r: 0.62, h: 2.1, speed: 1.15, ai: 'melee', reach: 1.6, windup: 0.9, cool: 2.2, dmg: 2,
    mesh(g, arm, M) {
      const skin = M(0xb8885a), vest = M(0x5a3a22), pants = M(0x2a3a5a), dark = M(0x2a2a30);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(cyl(0.16, 0.14, 0.7), pants), sx * 0.22, 0.35, 0));
      g.add(at(new THREE.Mesh(cyl(0.42, 0.5, 0.9), vest), 0, 1.15, 0), at(new THREE.Mesh(cyl(0.3, 0.3, 0.92), skin), 0, 1.15, -0.12), at(new THREE.Mesh(sph(0.28), skin), 0, 1.85, 0));
      g.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 6, 12), M(0xe8b54a)), 0.27, 1.85, 0));
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.04, 6, 5), glowEye(0xffd04a)), sx * 0.1, 1.9, -0.25));
      arm.position.set(0.55, 1.55, 0);
      arm.add(at(new THREE.Mesh(cyl(0.12, 0.1, 0.6), skin), 0, -0.25, -0.1));
      const shaft = at(new THREE.Mesh(cyl(0.05, 0.05, 1.0, 8), dark), 0, -0.3, -0.65); shaft.rotation.x = Math.PI / 2 - 0.2;
      const fluke = at(new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.05, 6, 14, Math.PI), dark), 0, -0.4, -1.12); fluke.rotation.x = Math.PI / 2;
      arm.add(shaft, fluke);
    } });
  defEnemy('captain', { hp: 22, perPlayer: 8, r: 0.95, h: 2.9, speed: 1.0, ai: 'boss', reach: 3.2, windup: 1.2, cool: 3.8, dmg: 2, proj: 'shot', boss: { slam: true, barrage: 5, summon: 'pirate', every: 11000 }, death: 'Captain Saltbeard walks the plank!',
    mesh(g, arm, M) {
      const coat = M(0x9a1e2a), trim = M(0xe8b54a), skin = M(0xd8a878), beard = M(0x6a4a3a), dark = M(0x1a1a22), boot = M(0x2a1a14);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(cyl(0.2, 0.18, 0.9), boot), sx * 0.3, 0.45, 0));
      g.add(at(new THREE.Mesh(cyl(0.6, 0.8, 1.4), coat), 0, 1.55, 0), at(new THREE.Mesh(cyl(0.62, 0.62, 0.12), trim), 0, 1.0, 0));
      for (let k = 0; k < 4; k++) g.add(at(new THREE.Mesh(sph(0.05, 6, 5), trim), 0, 1.2 + k * 0.22, -0.62));
      g.add(at(new THREE.Mesh(sph(0.42), skin), 0, 2.5, 0));
      const b = at(new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.7, 10), beard), 0, 2.18, -0.16); b.rotation.x = Math.PI; g.add(b);
      const brim = at(new THREE.Mesh(cyl(0.75, 0.75, 0.08, 3), dark), 0, 2.85, 0); brim.rotation.y = Math.PI; g.add(brim, at(new THREE.Mesh(cyl(0.34, 0.4, 0.34, 12), dark), 0, 3.05, 0));
      g.add(at(new THREE.Mesh(boxg(0.2, 0.2, 0.02), M(0xf2ece0)), 0, 3.05, -0.36));
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.06, 8, 6), glowEye(0xff6a3a)), sx * 0.15, 2.58, -0.38));
      arm.position.set(0, 2.0, 0);
      for (const sx of [-1, 1]) arm.add(at(new THREE.Mesh(cyl(0.18, 0.16, 1.1), coat), sx * 0.85, -0.45, 0));
      arm.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.04, 6, 14, Math.PI * 1.3), M(0xc8ccd8)), 0.85, -1.1, -0.1));
      const blade = at(new THREE.Mesh(boxg(0.06, 0.12, 1.3), M(0xd8dce8)), -0.85, -1.05, -0.6); blade.rotation.x = -0.3; arm.add(blade);
    } });

  const piratecove = makeQuest({
    idx: 22, seed: 22022,
    env: {
      sky: skyTexture([[0, '#2a7ad8'], [0.38, '#6ab8f0'], [0.49, '#c8ecfa'], [0.5, '#f0e4c0'], [0.53, '#4aa8c8'], [1, '#1a6a9a']]),
      bg: 0x8acbea, fog: [0xb8e0f0, 50, 230], hemi: [0xfff8e8, 0xc8a870, 0.85],
      sun: [0xfff0d0, 0.9], sunDir: new V3(-0.4, 0.8, 0.3), ambient: [0x8aa0b0, 0.3],
      sprite: { tex: paleSunTex, pos: new V3(-160, 180, -260), scale: 60 },
    },
    rooms: [
      { name: 'Landing beach', cx: 0, cz: 0, w: 12, d: 12, waves: [] },
      { name: 'Tide pools', cx: 13, cz: -26, w: 18, d: 16, waves: [[['crab', -4, -2], ['crab', 4, -2], ['crab', 0, 3], ['pirate', -3, -5], ['pirate', 3, -5]]] },
      { name: 'Shipwreck', cx: -12, cz: -52, w: 20, d: 16, waves: [[['gunner', -6, -5], ['gunner', 6, -5], ['pirate', 0, 0]], [['pirate', -5, 2], ['bosun', 0, 1], ['gunner', 0, -6], ['parrot', -3, -2], ['parrot', 3, -2]]] },
      { name: 'Smugglers’ cave', cx: 10, cz: -78, w: 20, d: 16, waves: [[['pirate', -5, -3], ['pirate', 5, -3], ['crab', -2, 3], ['crab', 2, 3], ['gunner', -6, -6], ['gunner', 6, -6]], [['bosun', -3, 0], ['bosun', 3, 0], ['gunner', -6, -5], ['gunner', 6, -5], ['parrot', -2, 3], ['parrot', 2, 3]]] },
      { name: 'Cliff fort', cx: -10, cz: -104, w: 22, d: 18, waves: [[['bosun', -4, -2], ['bosun', 4, -2], ['gunner', -8, -6], ['gunner', 0, -7], ['gunner', 8, -6]], [['pirate', -6, 3], ['pirate', 6, 3], ['pirate', -2, -3], ['pirate', 2, -3], ['parrot', -4, 0], ['parrot', 4, 0], ['parrot', 0, 4]], [['bosun', -5, 0], ['bosun', 0, -4], ['bosun', 5, 0], ['gunner', -8, -6], ['gunner', 8, -6]]] },
      { name: 'Captain’s deck', cx: 2, cz: -132, w: 22, d: 20, waves: [[['captain', 0, -4], ['gunner', -8, -7], ['gunner', 8, -7]]] },
      { name: 'Treasure grotto', cx: 0, cz: -158, w: 10, d: 10, waves: [] },
    ],
    theme: {
      ground(g, rand) {
        g.fillStyle = '#e8d4a0'; g.fillRect(0, 0, 256, 256);
        for (let k = 0; k < 40; k++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,245,210,0.4)' : 'rgba(200,170,110,0.3)'; g.beginPath(); g.ellipse(rand() * 256, rand() * 256, 10 + rand() * 30, 4 + rand() * 8, rand() * 3, 0, Math.PI * 2); g.fill(); }
        speckle(g, rand, 2600, 'rgba(255,255,255,0.12)', 'rgba(120,90,50,0.12)');
      },
      floor(g, rand) {
        // deck planks, weathered
        g.fillStyle = '#8a6440'; g.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 8; y++) { const s = 110 + Math.floor(rand() * 30); g.fillStyle = `rgb(${s + 20},${s - 10},${s - 50})`; g.fillRect(0, y * 32 + 1, 256, 29); g.fillStyle = 'rgba(40,20,5,0.5)'; g.fillRect(Math.floor(rand() * 256), y * 32, 2, 32); }
        for (let k = 0; k < 30; k++) { g.fillStyle = 'rgba(40,25,10,0.6)'; g.fillRect(rand() * 256, rand() * 256, 3, 3); }
        speckle(g, rand, 900, 'rgba(255,240,200,0.05)', 'rgba(0,0,0,0.1)');
      },
      path(g, rand) {
        // a boardwalk across the sand
        g.fillStyle = '#b8945a'; g.fillRect(0, 0, 256, 256);
        for (let x = 0; x < 8; x++) { const s = 120 + Math.floor(rand() * 30); g.fillStyle = `rgb(${s + 30},${s},${s - 40})`; g.fillRect(x * 32 + 2, 0, 28, 256); }
        speckle(g, rand, 700, 'rgba(255,240,200,0.06)', 'rgba(0,0,0,0.1)');
      },
      edgeStep: 1.9, lightEvery: 4, lightOff: -0.25,
      edgeProp(ctx, x, z, nx, nz, seg) {
        // rope posts and rocks along the edge, with the odd barrel, palm or pile of crates
        const r = ctx.rand(), px = x + nx * 0.25, pz = z + nz * 0.25;
        const rock = new THREE.Color().setHSL(0.08, 0.12, 0.38 + ctx.rand() * 0.12).getHex();
        const h = 0.7 + ctx.rand() * 1.4, th = 0.8 + ctx.rand() * 0.1;
        if (nx) ctx.inst('rock', unitBlob, lam(0xffffff), px + nx * 0.2, h * 0.35, z, th, h * 0.7, seg * 0.62, ctx.rand() * 6, rock);
        else ctx.inst('rock', unitBlob, lam(0xffffff), x, h * 0.35, pz + nz * 0.2, seg * 0.62, h * 0.7, th, ctx.rand() * 6, rock);
        ctx.inst('rpost', unitCyl, lam(0x6a4a2a), x - nx * 0.15, 0.55, z - nz * 0.15, 0.12, 1.1, 0.12);
        if (nx) ctx.inst('rope', unitBox, lam(0xc8a868), x - nx * 0.15, 0.95, z, 0.04, 0.04, seg); else ctx.inst('rope', unitBox, lam(0xc8a868), x, 0.95, z - nz * 0.15, seg, 0.04, 0.04);
        if (r > 0.86) { ctx.inst('barrel', unitCyl, lam(0x8a5a30), x + nx * 1.1, 0.45, z + nz * 1.1, 0.6, 0.9, 0.6); ctx.inst('hoop', unitCyl, lam(0x2a2a30), x + nx * 1.1, 0.45, z + nz * 1.1, 0.62, 0.08, 0.62); }
        else if (r > 0.74) {
          const tx = x + nx * 2.2, tz = z + nz * 2.2, h2 = 4 + ctx.rand() * 2.5;
          ctx.inst('palm', unitCyl, lam(0x8a6a44), tx, h2 / 2, tz, 0.32, h2, 0.32, 0);
          for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + ctx.rand(); ctx.inst('frond', unitBox, lam(0x3a9a3a), tx + Math.cos(a) * 1.1, h2 + 0.1 - 0.25, tz + Math.sin(a) * 1.1, 2.2, 0.05, 0.5, -a); }
        } else if (r > 0.66) ctx.inst('crate', unitBox, lam(0x9a7448), x + nx * 1.2, 0.35, z + nz * 1.2, 0.7, 0.7, 0.7, ctx.rand() * 0.6);
      },
      roomLight: 0xffe0b0, vaultLight: 0xffd060, lightIntensity: 1.2, wallLight: 'lantern', wallLightColor: 0xffc070, gate: 'bars', gateFrame: 0x6a4a2a, rackColor: 0x6a4a2a,
    },
    racks: { west: ['sword', 'sword', 'sword', 'sword'], east: ['crossbow', 'crossbow', 'crossbow', 'crossbow', 'shield'] },
    decorate(ctx) {
      const { G, ROOMS, rand, VAULT, inst, torches, flameMat, woodMat } = ctx;
      // the sea all round the island, with a little surf at the edges
      const sea = lam(0x2a8ab8), surf = new THREE.MeshBasicMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.6, depthWrite: false });
      for (const [x, z, w, d] of [[-185, -50, 300, 600], [185, -50, 300, 600], [0, -330, 70, 300]]) {
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), sea); m.rotation.x = -Math.PI / 2; m.position.set(x, 0.03, z); G.add(m);
      }
      for (const sx of [-1, 1]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 600), surf); f.rotation.x = -Math.PI / 2; f.position.set(sx * 35.5, 0.04, -50); G.add(f); }
      // the wreck: a broken hull on its side in the shipwreck clearing, with a snapped mast
      const r2 = ROOMS[2], hullM = lam(0x6a4428), darkW = lam(0x4a2e1a);
      for (let k = 0; k < 7; k++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(2.6, 0.12, 6, 14, Math.PI), darkW); rib.position.set(r2.cx - r2.w / 2 - 1.2, 0, r2.cz - 5 + k * 1.6); rib.rotation.y = Math.PI / 2; G.add(rib); }
      addBox(G, 1.2, 1.4, 11, hullM, r2.cx - r2.w / 2 - 3.6, 0.7, r2.cz);
      const mast = addCyl(G, 0.22, 0.26, 9, 10, darkW, r2.cx + 4, 0.4, r2.cz - r2.d / 2 - 2.4); mast.rotation.z = 1.3;
      for (const [x, z] of [[-5, -3], [5, 2], [-2, 5]]) { addCyl(G, 0.35, 0.35, 0.9, 12, lam(0x8a5a30), r2.cx + x, 0.45, r2.cz + z); }
      // the smugglers' cave: dark rock all round, crates and a lantern or two
      const r3 = ROOMS[3], caveM = lam(0x4a4440);
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * Math.PI * 2, rx = r3.w / 2 + 2.5, rz = r3.d / 2 + 2.5, s = 2.4 + rand() * 1.6;
        inst('cave', unitBlob, caveM, r3.cx + Math.cos(a) * rx, s * 0.5, r3.cz + Math.sin(a) * rz, s, s * 1.4, s, rand() * 6);
      }
      for (const [x, z] of [[-7, -5], [-6.2, -5.4], [7, 4], [6.4, 4.6]]) addBox(G, 0.8, 0.8, 0.8, lam(0x9a7448), r3.cx + x, 0.4, r3.cz + z);
      // the cliff fort: a stone parapet with cannons pointing out to sea
      const r4 = ROOMS[4], stone = lam(0x8a8478), iron = lam(0x2a2a30);
      for (const sx of [-1, 1]) {
        addBox(G, 1.2, 1.4, r4.d, stone, r4.cx + sx * (r4.w / 2 + 1.4), 0.7, r4.cz);
        for (const z of [-5, 0, 5]) { const c = addCyl(G, 0.22, 0.28, 1.6, 12, iron, r4.cx + sx * (r4.w / 2 + 1.6), 1.6, r4.cz + z); c.rotation.z = sx * Math.PI / 2; }
      }
      // the captain's deck is a ship's deck: rails, a wheel, a mast with a black flag
      const r5 = ROOMS[5];
      for (const sx of [-1, 1]) addBox(G, 0.15, 0.15, r5.d, woodMat, r5.cx + sx * (r5.w / 2 + 0.4), 1.0, r5.cz);
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.06, 6, 18), woodMat); wheel.position.set(r5.cx + 6, 1.4, r5.z0 + 1.0); G.add(wheel);
      addCyl(G, 0.08, 0.08, 1.4, 6, woodMat, r5.cx + 6, 0.7, r5.z0 + 1.0);
      addCyl(G, 0.3, 0.35, 14, 10, lam(0x4a2e1a), r5.cx - 8, 7, r5.z0 + 1.5);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshLambertMaterial({ color: 0x1a1a1a, side: THREE.DoubleSide })); flag.position.set(r5.cx - 6.8, 12.8, r5.z0 + 1.5); G.add(flag);
      const skull = new THREE.Mesh(new THREE.CircleGeometry(0.35, 16), new THREE.MeshBasicMaterial({ color: 0xf2ece0, side: THREE.DoubleSide })); skull.position.set(r5.cx - 6.8, 12.9, r5.z0 + 1.49); G.add(skull);
      for (const sx of [-1, 1]) {
        const f = new THREE.Sprite(flameMat); f.position.set(r5.cx + sx * (r5.w / 2 - 1.5), 1.6, r5.z0 + 1.5); f.scale.set(1.4, 1.6, 1); G.add(f);
        addCyl(G, 0.3, 0.22, 1.0, 10, lam(0x2a2a30), r5.cx + sx * (r5.w / 2 - 1.5), 0.5, r5.z0 + 1.5);
        torches.push({ glow: f, core: null, phase: rand() * 100, big: true });
      }
      // the treasure grotto: chests of gold round the goal
      const goldMat = new THREE.MeshLambertMaterial({ color: 0xe8b54a, emissive: 0x3a2400 });
      for (const [x, z] of [[-2.6, -2.4], [2.6, -2.4], [-2.6, 2.4], [2.6, 2.4]]) { addBox(G, 1.0, 0.6, 0.65, woodMat, VAULT.cx + x, 0.3, VAULT.cz + z); addBox(G, 0.9, 0.14, 0.55, goldMat, VAULT.cx + x, 0.66, VAULT.cz + z); }
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; inst('grotto', unitBlob, caveM, VAULT.cx + Math.cos(a) * 7.2, 2.2, VAULT.cz + Math.sin(a) * 7.2, 2.6, 4.4, 2.6, rand() * 6); }
      // a pirate ship at anchor out at sea, sea stacks, and palms on the sand
      const sx0 = 70, sz0 = -60;
      addBox(G, 7, 3.2, 26, lam(0x5a3a22), sx0, 1.2, sz0);
      addBox(G, 7.4, 0.4, 26.4, lam(0xe8b54a), sx0, 2.9, sz0);
      for (const [z, h] of [[-7, 16], [2, 20], [9, 14]]) {
        addCyl(G, 0.3, 0.4, h, 8, lam(0x4a2e1a), sx0, h / 2 + 2.8, sz0 + z);
        const sail = new THREE.Mesh(new THREE.PlaneGeometry(6, h * 0.45), new THREE.MeshLambertMaterial({ color: 0xf2ece0, side: THREE.DoubleSide })); sail.position.set(sx0, h * 0.62 + 2.8, sz0 + z + 0.3); sail.rotation.y = Math.PI / 2; G.add(sail);
      }
      ring(ctx, 16, 110, 170, -60, (x, z) => { if (Math.abs(x) < 40) return; const s = 6 + rand() * 12; inst('stack', unitBlob, lam(0x7a7066), x, s * 0.6, z, s * 0.6, s * 1.6, s * 0.6, rand() * 6); });
      scatter(ctx, 70, -32, 32, 18, -175, 3, (x, z) => {
        const h = 4 + rand() * 3;
        inst('ptrunk', unitCyl, lam(0x8a6a44), x, h / 2, z, 0.3, h, 0.3);
        for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + rand(); inst('pfrond', unitBox, lam(0x3a9a3a), x + Math.cos(a) * 1.1, h - 0.2, z + Math.sin(a) * 1.1, 2.3, 0.05, 0.55, -a); }
      });
    },
    goal: { name: 'Golden Doubloon', glow: 0xffd060, make: () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 24), new THREE.MeshLambertMaterial({ color: 0xffc23a, emissive: 0xb86a00 })); m.rotation.x = Math.PI / 2; const g = new THREE.Group(); g.add(m); return { mesh: g }; } },
    text: {
      title: 'Pirate Cove', claim: 'Claim the Golden Doubloon in the grotto', win: 'Quest complete! The Golden Doubloon is yours', summon: 'Captain Saltbeard calls the crew', vaultOpen: 'The treasure grotto is open!',
      howto: [
        ['In VR', 'Squeeze to take a cutlass or crossbow; squeeze again to put it down. Swing hard to hit. Trigger fires the crossbow. Your blade can knock shots away.'],
        ['In a browser', 'E takes or drops a weapon. Click or press Space to attack.'],
        ['Survive', 'Gunners fire from range, parrots dive from above, crabs are quick and the bosun hits hard. Red rings mean the Captain is about to slam.'],
      ],
    },
    colors: { board: '#14222c', accent: '#e8b54a', sub: '#a8c8d8', text: '#eef4f8', label: '#ffb060', button: 0xe8b54a },
  });
