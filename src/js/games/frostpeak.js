  // ---------------- Frostpeak Caverns: up a frozen mountain pass and into the ice caves, to the Frost King's heart-gem
  // New enemies (snow goblins, frost archers, yetis, ice bats, frost sprites and the Frost King) and a new projectile:
  // ice shards, glowing pale blue.
  PROJ.ice = { code: 4, speed: 11, gravity: 1.0, color: 0xcfefff, glow: 0x7ad8ff, size: 0.2, dmg: 1 };
  PROJ_BY_CODE.push(PROJ.ice);
  defEnemy('snowgob', { hp: 3, r: 0.42, h: 1.35, speed: 1.8, ai: 'melee', reach: 1.15, windup: 0.55, cool: 1.3, dmg: 1,
    mesh(g, arm, M) {
      const skin = M(0x9ac8e8), fur = M(0xf4f8ff), dark = M(0x4a6a8a);
      g.add(at(new THREE.Mesh(cyl(0.22, 0.3, 0.55), fur), 0, 0.62, 0));
      const head = at(new THREE.Mesh(sph(0.22), skin), 0, 1.07, 0); head.scale.set(1, 0.9, 1); g.add(head);
      const hood = at(new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), fur), 0, 1.1, 0.03); g.add(hood);
      for (const sx of [-1, 1]) {
        const ear = at(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.26, 6), skin), sx * 0.24, 1.12, 0.02); ear.rotation.z = -sx * 1.25;
        g.add(ear, at(new THREE.Mesh(sph(0.035, 6, 5), glowEye(0x7af0ff)), sx * 0.08, 1.08, -0.19), at(new THREE.Mesh(cyl(0.07, 0.06, 0.38, 6), dark), sx * 0.11, 0.19, 0));
      }
      arm.position.set(0.28, 0.82, 0);
      const fore = at(new THREE.Mesh(cyl(0.05, 0.05, 0.4, 6), skin), 0, -0.15, -0.05); fore.rotation.x = 0.4;
      const pick = at(new THREE.Mesh(cyl(0.03, 0.03, 0.6, 6), M(0x6b4a2a)), 0, -0.15, -0.42); pick.rotation.x = Math.PI / 2 - 0.3;
      const head2 = at(new THREE.Mesh(boxg(0.36, 0.05, 0.05), M(0xc8d8e8)), 0, -0.05, -0.7);
      arm.add(fore, pick, head2);
    } });
  defEnemy('frostarcher', { hp: 2, r: 0.36, h: 1.75, speed: 1.4, ai: 'ranged', proj: 'ice', windup: 0.75, cool: 2.6, keep: [4.5, 8.5],
    mesh(g, arm, M) {
      const robe = M(0x3a6aa8), trim = M(0xe8f4ff), skin = M(0xb8d8f0);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(cyl(0.07, 0.06, 0.55, 6), M(0x2a3a5a)), sx * 0.1, 0.28, 0));
      g.add(at(new THREE.Mesh(cyl(0.18, 0.3, 0.95), robe), 0, 0.98, 0), at(new THREE.Mesh(cyl(0.19, 0.19, 0.06), trim), 0, 1.38, 0), at(new THREE.Mesh(sph(0.18), skin), 0, 1.58, 0));
      const hood = at(new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 10), robe), 0, 1.78, 0.02); g.add(hood);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.03, 6, 5), glowEye(0x7af0ff)), sx * 0.07, 1.6, -0.16));
      arm.position.set(0.25, 1.25, 0);
      const bow = at(new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 5, 16, Math.PI), M(0xcfefff)), 0, 0, -0.3); bow.rotation.y = Math.PI / 2; arm.add(bow);
    } });
  defEnemy('yeti', { hp: 7, r: 0.65, h: 2.2, speed: 1.15, ai: 'melee', reach: 1.6, windup: 0.9, cool: 2.2, dmg: 2,
    mesh(g, arm, M) {
      const fur = M(0xf2f6fa), face = M(0x8ab0c8), dark = M(0x2a3a4a);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(cyl(0.2, 0.18, 0.7), fur), sx * 0.24, 0.35, 0));
      const body = at(new THREE.Mesh(sph(0.6), fur), 0, 1.25, 0); body.scale.set(1, 1.15, 0.85); g.add(body);
      g.add(at(new THREE.Mesh(sph(0.32), fur), 0, 2.0, 0), at(new THREE.Mesh(sph(0.2), face), 0, 1.95, -0.2));
      for (const sx of [-1, 1]) {
        g.add(at(new THREE.Mesh(sph(0.045, 6, 5), glowEye(0x7af0ff)), sx * 0.09, 2.02, -0.36));
        const horn = at(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.28, 6), dark), sx * 0.24, 2.25, 0); horn.rotation.z = -sx * 0.5; g.add(horn);
      }
      arm.position.set(0, 1.6, 0);
      for (const sx of [-1, 1]) arm.add(at(new THREE.Mesh(cyl(0.16, 0.14, 0.9), fur), sx * 0.7, -0.35, -0.1));
    } });
  defEnemy('icebat', { hp: 1, r: 0.32, h: 0.4, fly: 2.3, speed: 3.4, ai: 'flyer', reach: 0.95, windup: 0.3, cool: 1.6, dmg: 1,
    mesh(g, arm, M) {
      const body = new THREE.Mesh(sph(0.15), M(0x7ab8e8, 0x0a2a4a)); body.scale.set(1, 0.9, 1.2); g.add(body);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.03, 6, 5), glowEye(0xffffff)), sx * 0.06, 0.05, -0.14));
      for (const sx of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.03, 3), M(0xcfefff, 0x1a4a6a)); w.rotation.z = sx * Math.PI / 2; w.scale.set(1, 1, 1.6);
        const hold = new THREE.Group(); hold.position.x = sx * 0.1; w.position.x = sx * 0.18; hold.add(w); hold.userData.side = sx;
        arm.add(hold);
      }
      arm.userData.flap = true;
    } });
  defEnemy('sprite', { hp: 1, r: 0.32, h: 0.4, fly: 1.7, speed: 3.0, ai: 'kamikaze', reach: 1.1, windup: 0.5, cool: 1, dmg: 1, blast: 1.9,
    mesh(g, arm, M) {
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), M(0xe8faff, 0x4ac8ff)); g.add(core);
      for (let k = 0; k < 4; k++) { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.22, 5), M(0xcfefff, 0x2a8aca)); const a = (k / 4) * Math.PI * 2; sp.position.set(Math.cos(a) * 0.16, 0, Math.sin(a) * 0.16); sp.rotation.z = Math.PI / 2; sp.rotation.y = -a; arm.add(sp); }
      arm.userData.spin = true;
    } });
  defEnemy('frostking', { hp: 22, perPlayer: 8, r: 0.95, h: 3.0, speed: 0.95, ai: 'boss', reach: 3.2, windup: 1.2, cool: 3.8, dmg: 2, proj: 'ice', boss: { slam: true, barrage: 6, summon: 'snowgob', every: 11000 }, death: 'The Frost King shatters into snow!',
    mesh(g, arm, M) {
      const ice = M(0xbfe8ff, 0x1a4a6a), robe = M(0x2a4a8a), trim = M(0xf4f8ff), crown = M(0x9af0ff, 0x2a8aca);
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(cyl(0.2, 0.18, 0.9), robe), sx * 0.3, 0.45, 0));
      g.add(at(new THREE.Mesh(cyl(0.55, 0.85, 1.5), robe), 0, 1.6, 0), at(new THREE.Mesh(cyl(0.6, 0.6, 0.14), trim), 0, 2.32, 0));
      g.add(at(new THREE.Mesh(sph(0.42), ice), 0, 2.6, 0));
      const beard = at(new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.8, 8), trim), 0, 2.2, -0.18); beard.rotation.x = Math.PI; g.add(beard);
      for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2, sp = at(new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.4, 5), crown), Math.cos(a) * 0.32, 3.1, Math.sin(a) * 0.32); g.add(sp); }
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.06, 8, 6), glowEye(0x7af0ff)), sx * 0.15, 2.66, -0.38));
      arm.position.set(0, 2.1, 0);
      for (const sx of [-1, 1]) arm.add(at(new THREE.Mesh(cyl(0.18, 0.16, 1.1), robe), sx * 0.85, -0.45, 0));
      const staff = at(new THREE.Mesh(cyl(0.05, 0.05, 2.6, 8), M(0xcfefff)), 0.85, -0.6, -0.2); arm.add(staff);
      arm.add(at(new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), M(0x9af0ff, 0x4ac8ff)), 0.85, 0.75, -0.2));
    } });

  const frostpeak = makeQuest({
    idx: 30, seed: 30303,
    env: {
      sky: skyTexture([[0, '#5a7ab8'], [0.35, '#9ab8e0'], [0.48, '#dcebf8'], [0.5, '#f4f8ff'], [0.53, '#c8d8e8'], [1, '#8aa0b8']]),
      bg: 0xc8d8ea, fog: [0xdce8f4, 40, 190], hemi: [0xf4f8ff, 0x8aa0c0, 0.95],
      sun: [0xffffff, 0.8], sunDir: new V3(0.4, 0.7, -0.5), ambient: [0x8aa0c0, 0.4],
      sprite: { tex: paleSunTex, pos: new V3(160, 150, -280), scale: 60 },
    },
    rooms: [
      { name: 'Base camp', cx: 0, cz: 0, w: 12, d: 12, waves: [] },
      { name: 'Snowfield', cx: -12, cz: -26, w: 18, d: 16, waves: [[['snowgob', -4, -3], ['snowgob', 4, -3], ['snowgob', -2, 3], ['icebat', 2, 0]]] },
      { name: 'Frozen falls', cx: 12, cz: -52, w: 20, d: 16, waves: [[['frostarcher', -6, -5], ['frostarcher', 6, -5], ['snowgob', 0, 0]], [['snowgob', -5, 2], ['yeti', 0, 1], ['frostarcher', 0, -6], ['icebat', -3, -2], ['icebat', 3, -2]]] },
      { name: 'Crystal cave', cx: -10, cz: -78, w: 20, d: 16, waves: [[['snowgob', -5, -3], ['snowgob', 5, -3], ['sprite', -2, 3], ['sprite', 2, 3], ['frostarcher', -6, -6], ['frostarcher', 6, -6]], [['yeti', -3, 0], ['yeti', 3, 0], ['frostarcher', -6, -5], ['frostarcher', 6, -5], ['icebat', -2, 3], ['icebat', 2, 3]]] },
      { name: 'Glacier bridge', cx: 12, cz: -104, w: 22, d: 18, waves: [[['yeti', -4, -2], ['yeti', 4, -2], ['frostarcher', -8, -6], ['frostarcher', 0, -7], ['frostarcher', 8, -6]], [['snowgob', -6, 3], ['snowgob', 6, 3], ['sprite', -2, -3], ['sprite', 2, -3], ['icebat', -4, 0], ['icebat', 4, 0]], [['yeti', -5, 0], ['yeti', 0, -4], ['yeti', 5, 0], ['frostarcher', -8, -6], ['frostarcher', 8, -6]]] },
      { name: 'Frost King’s hall', cx: 0, cz: -132, w: 22, d: 20, waves: [[['frostking', 0, -4], ['frostarcher', -8, -7], ['frostarcher', 8, -7]]] },
      { name: 'Heart of the mountain', cx: 0, cz: -158, w: 10, d: 10, waves: [] },
    ],
    theme: {
      ground(g, rand) {
        g.fillStyle = '#eef4fa'; g.fillRect(0, 0, 256, 256);
        for (let k = 0; k < 50; k++) { g.fillStyle = rand() < 0.5 ? 'rgba(200,220,240,0.45)' : 'rgba(255,255,255,0.6)'; g.beginPath(); g.ellipse(rand() * 256, rand() * 256, 10 + rand() * 30, 5 + rand() * 12, rand() * 3, 0, Math.PI * 2); g.fill(); }
        speckle(g, rand, 2200, 'rgba(255,255,255,0.3)', 'rgba(120,150,190,0.12)');
      },
      floor(g, rand) {
        // packed ice with cracks
        g.fillStyle = '#bcdcf0'; g.fillRect(0, 0, 256, 256);
        for (let k = 0; k < 30; k++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(120,170,210,0.3)'; g.beginPath(); g.ellipse(rand() * 256, rand() * 256, 15 + rand() * 30, 8 + rand() * 14, rand() * 3, 0, Math.PI * 2); g.fill(); }
        g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5;
        for (let k = 0; k < 14; k++) { g.beginPath(); let x = rand() * 256, y = rand() * 256; g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (rand() - 0.5) * 60; y += (rand() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
      },
      path(g, rand) {
        g.fillStyle = '#d8e6f2'; g.fillRect(0, 0, 256, 256);
        for (let k = 0; k < 60; k++) { g.fillStyle = 'rgba(150,180,210,0.25)'; g.beginPath(); g.ellipse(rand() * 256, rand() * 256, 6 + rand() * 6, 10 + rand() * 8, 0, 0, Math.PI * 2); g.fill(); }
        speckle(g, rand, 900, 'rgba(255,255,255,0.3)', 'rgba(100,130,170,0.1)');
      },
      edgeStep: 1.9, lightEvery: 4, lightOff: -0.25,
      edgeProp(ctx, x, z, nx, nz, seg) {
        // snow banks and ice crystals, with the odd pine
        const r = ctx.rand(), h = 0.6 + ctx.rand() * 1.2;
        const col = new THREE.Color().setHSL(0.58, 0.25, 0.86 + ctx.rand() * 0.1).getHex();
        if (nx) ctx.inst('bank', unitBlob, lam(0xffffff), x + nx * 0.45, h * 0.3, z, 0.9, h * 0.6, seg * 0.66, ctx.rand() * 6, col);
        else ctx.inst('bank', unitBlob, lam(0xffffff), x, h * 0.3, z + nz * 0.45, seg * 0.66, h * 0.6, 0.9, ctx.rand() * 6, col);
        if (r > 0.82) { const s = 0.6 + ctx.rand() * 0.8; ctx.inst('crystal', unitCone, new THREE.MeshLambertMaterial({ color: 0x9adcff, emissive: 0x1a5a8a }), x + nx * 0.9, s, z + nz * 0.9, 0.25 * s, 2 * s, 0.25 * s, ctx.rand() * 6); }
        else if (r > 0.66) {
          const tx = x + nx * 2.2, tz = z + nz * 2.2, s = 0.8 + ctx.rand() * 0.6;
          ctx.inst('ptrunk', unitCyl, lam(0x5a4030), tx, 0.6 * s, tz, 0.25 * s, 1.2 * s, 0.25 * s);
          for (let k = 0; k < 3; k++) ctx.inst('pine', unitCone, lam(k === 2 ? 0xf4f8ff : 0x2f5a44), tx, (1.4 + k * 0.9) * s, tz, (1.3 - k * 0.35) * s, 1.4 * s, (1.3 - k * 0.35) * s);
        }
      },
      roomLight: 0xcfe8ff, vaultLight: 0x9af0ff, lightIntensity: 1.2, wallLight: 'lantern', wallLightColor: 0x9adcff, gate: 'bars', gateFrame: 0x6a8aa8, rackColor: 0x6a8aa8, pedestal: 0x8aa8c8,
    },
    racks: { west: ['sword', 'sword', 'sword', 'sword'], east: ['crossbow', 'crossbow', 'crossbow', 'crossbow', 'shield'] },
    decorate(ctx) {
      const { G, ROOMS, rand, VAULT, inst, torches, flameMat } = ctx;
      const iceM = new THREE.MeshLambertMaterial({ color: 0xa8dcff, emissive: 0x0a3050, transparent: true, opacity: 0.88 });
      const rock = lam(0x7a8a9a), snow = lam(0xf4f8ff);
      // frozen falls: a curtain of ice down a cliff at the back
      const r2 = ROOMS[2];
      for (let k = 0; k < 9; k++) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.5 + rand() * 0.4, 0.2, 6 + rand() * 3, 8), iceM); c.position.set(r2.cx - 7 + k * 1.8, 4, r2.z0 - 1.8); G.add(c); }
      addBox(G, r2.w + 6, 10, 2, rock, r2.cx, 5, r2.z0 - 3);
      // the crystal cave: rock all round, glowing crystals
      const r3 = ROOMS[3];
      for (let k = 0; k < 18; k++) { const a = (k / 18) * Math.PI * 2, s = 2.4 + rand() * 1.6; inst('cave', unitBlob, lam(0x5a6a7a), r3.cx + Math.cos(a) * (r3.w / 2 + 2.5), s * 0.5, r3.cz + Math.sin(a) * (r3.d / 2 + 2.5), s, s * 1.4, s, rand() * 6); }
      for (const [x, z] of [[-7, -5], [7, -4], [-6, 5], [6.5, 5]]) {
        for (let k = 0; k < 3; k++) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.4 + rand(), 6), new THREE.MeshLambertMaterial({ color: 0x9af0ff, emissive: 0x2a8aca })); c.position.set(r3.cx + x + (rand() - 0.5) * 0.8, 0.7, r3.cz + z + (rand() - 0.5) * 0.8); c.rotation.z = (rand() - 0.5) * 0.5; G.add(c); }
        const gl = new THREE.Sprite(flameMat.clone()); gl.material.color.setHex(0x7ad8ff); gl.position.set(r3.cx + x, 1.2, r3.cz + z); gl.scale.set(1.5, 1.5, 1); G.add(gl);
        torches.push({ glow: gl, core: null, phase: rand() * 100, big: true });
      }
      // the glacier bridge: ice cliffs dropping away on both sides
      const r4 = ROOMS[4];
      for (const sx of [-1, 1]) addBox(G, 1.6, 1.0, r4.d, iceM, r4.cx + sx * (r4.w / 2 + 1.2), 0.5, r4.cz);
      // the Frost King's hall: an ice throne and pillars
      const r5 = ROOMS[5];
      addBox(G, 2.6, 0.6, 1.8, iceM, r5.cx - 6, 0.3, r5.z0 + 1.3);
      addBox(G, 1.8, 3.0, 0.4, iceM, r5.cx - 6, 1.5, r5.z0 + 0.5);
      for (const sx of [-1, 1]) for (const z of [-4, 4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.55, 6, 10), iceM); p.position.set(r5.cx + sx * (r5.w / 2 - 1.2), 3, r5.cz + z); G.add(p); }
      // the heart of the mountain: crystals round the goal
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, c = new THREE.Mesh(new THREE.ConeGeometry(0.4, 2.6, 6), new THREE.MeshLambertMaterial({ color: 0x9af0ff, emissive: 0x2a8aca })); c.position.set(VAULT.cx + Math.cos(a) * 3.8, 1.3, VAULT.cz + Math.sin(a) * 3.8); G.add(c); }
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; inst('vault', unitBlob, lam(0x6a7a8a), VAULT.cx + Math.cos(a) * 7.2, 2.2, VAULT.cz + Math.sin(a) * 7.2, 2.6, 4.4, 2.6, rand() * 6); }
      // snowy mountains all round, and pines on the slopes
      ring(ctx, 28, 170, 250, -60, (x, z) => { const s = 40 + rand() * 50; inst('mtn', unitCone, lam(0x8a9ab0), x, s * 0.7, z, s, s * 1.4, s); inst('cap', unitCone, snow, x, s * 1.12, z, s * 0.42, s * 0.56, s * 0.42); });
      scatter(ctx, 120, -70, 70, 20, -175, 3, (x, z) => {
        const s = 0.8 + rand() * 0.9;
        inst('ftrunk', unitCyl, lam(0x5a4030), x, 0.6 * s, z, 0.3 * s, 1.2 * s, 0.3 * s);
        for (let k = 0; k < 3; k++) inst('fpine', unitCone, lam(k === 2 ? 0xf4f8ff : 0x2f5a44), x, (1.6 + k * 1.1) * s, z, (1.6 - k * 0.45) * s, 1.7 * s, (1.6 - k * 0.45) * s);
      });
      void snow;
    },
    goal: { name: 'Heart-gem', glow: 0x9af0ff, make: () => ({ mesh: new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshLambertMaterial({ color: 0x9af0ff, emissive: 0x2a8aca })) }) },
    text: {
      title: 'Frostpeak Caverns', claim: 'Claim the Heart-gem at the heart of the mountain', win: 'Quest complete! The Heart-gem is yours', summon: 'The Frost King calls his goblins', vaultOpen: 'The heart of the mountain is open!',
      howto: [
        ['In VR', 'Squeeze to take a sword or crossbow; squeeze again to put it down. Swing hard to hit. Trigger fires the crossbow. Your sword can knock ice shards away.'],
        ['In a browser', 'E takes or drops a weapon. Click or press Space to attack.'],
        ['Survive', 'Frost archers throw ice from range, sprites burst when they reach you, yetis hit hard. Red rings mean the Frost King is about to slam.'],
      ],
    },
    colors: { board: '#13202e', accent: '#9af0ff', sub: '#b8d4ea', text: '#eef6fc', label: '#7ad8ff', button: 0x7ad8ff },
  });
