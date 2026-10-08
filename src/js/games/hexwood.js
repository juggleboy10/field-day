  // ---------------- Hexwood Hollow: clearings in a moonlit forest, joined by dirt trails
  const hexwood = makeQuest({
    helpers: true,
    idx: 11, seed: 13131,
    env: {
      sky: skyTexture([[0, '#0a0820'], [0.35, '#1e1648'], [0.48, '#4a3a7a'], [0.5, '#6a5a8a'], [0.53, '#1a1430'], [1, '#0a0818']]),
      bg: 0x120e26, fog: [0x1a1430, 22, 120], hemi: [0x9a8ad8, 0x1a1420, 0.65],
      sun: [0xb0c0ff, 0.4], sunDir: new V3(-0.3, 1, -0.4), ambient: [0x403a60, 0.42],
      sprite: { tex: paleSunTex, pos: new V3(-120, 200, -300), scale: 46 },
    },
    rooms: [
      { name: 'Mossy clearing', cx: 0, cz: 0, w: 12, d: 12, waves: [] },
      { name: 'Ghoul mire', cx: -14, cz: -26, w: 18, d: 16, waves: [[['ghoul', -4, -3], ['ghoul', 4, -3], ['imp', 0, 4]], [['ghoul', 0, 0], ['wisp', -4, 3], ['wisp', 4, 3], ['imp', -5, -5]]] },
      { name: 'Whispering grove', cx: 10, cz: -52, w: 20, d: 16, waves: [[['imp', -6, -4], ['imp', 6, -4], ['wisp', -2, 0], ['wisp', 2, 0]], [['ghoul', -5, 2], ['ghoul', 5, 2], ['imp', 0, -5], ['wisp', 0, 4]]] },
      { name: 'Bramble hollow', cx: -10, cz: -78, w: 20, d: 16, waves: [[['ghoul', -4, -3], ['ghoul', 4, -3], ['imp', -6, 2], ['imp', 6, 2], ['wisp', -2, -5], ['wisp', 2, -5]], [['ghoul', -5, 0], ['ghoul', 0, -3], ['ghoul', 5, 0], ['imp', -3, 4], ['imp', 3, 4]]] },
      { name: 'Witchlight fen', cx: 12, cz: -104, w: 22, d: 18, waves: [[['imp', -6, -4], ['imp', 6, -4], ['imp', -2, 2], ['imp', 2, 2], ['wisp', -4, -6], ['wisp', 4, -6]], [['ghoul', -5, 2], ['ghoul', 5, 2], ['wisp', -2, -4], ['wisp', 2, -4], ['wisp', 0, 4], ['imp', -7, -2], ['imp', 7, -2]], [['imp', -6, 0], ['imp', 0, -5], ['imp', 6, 0], ['ghoul', -3, 4], ['ghoul', 0, 2], ['ghoul', 3, 4]]] },
      { name: 'Hexwarden\u2019s circle', cx: -4, cz: -132, w: 22, d: 20, waves: [[['hexwarden', 0, -4], ['wisp', -8, -7], ['wisp', 8, -7]]] },
      { name: 'Moonlit altar', cx: 0, cz: -158, w: 10, d: 10, waves: [] },
    ],
    theme: {
      ground(g, rand) {
        g.fillStyle = '#1a2614'; g.fillRect(0, 0, 256, 256);
        for (let k = 0; k < 60; k++) { g.fillStyle = rand() < 0.5 ? 'rgba(40,60,30,0.5)' : 'rgba(14,20,10,0.5)'; g.beginPath(); g.arc(rand() * 256, rand() * 256, 6 + rand() * 22, 0, Math.PI * 2); g.fill(); }
        speckle(g, rand, 2500, 'rgba(120,160,90,0.08)', 'rgba(0,0,0,0.15)');
      },
      floor(g, rand) {
        g.fillStyle = '#2e4424'; g.fillRect(0, 0, 256, 256);
        for (let k = 0; k < 40; k++) { g.fillStyle = rand() < 0.5 ? 'rgba(70,100,50,0.5)' : 'rgba(24,34,18,0.4)'; g.beginPath(); g.arc(rand() * 256, rand() * 256, 6 + rand() * 20, 0, Math.PI * 2); g.fill(); }
        speckle(g, rand, 2500, 'rgba(160,220,120,0.08)', 'rgba(0,0,0,0.15)');
        for (let k = 0; k < 18; k++) { g.fillStyle = rand() < 0.5 ? 'rgba(220,200,255,0.7)' : 'rgba(255,240,180,0.6)'; g.fillRect(rand() * 256, rand() * 256, 3, 3); }
      },
      path(g, rand) {
        g.fillStyle = '#4a3a2a'; g.fillRect(0, 0, 256, 256);
        for (let k = 0; k < 50; k++) { g.fillStyle = rand() < 0.5 ? 'rgba(90,70,50,0.5)' : 'rgba(40,30,20,0.5)'; g.beginPath(); g.ellipse(rand() * 256, rand() * 256, 6 + rand() * 16, 4 + rand() * 8, rand() * 3, 0, Math.PI * 2); g.fill(); }
        speckle(g, rand, 1500, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.15)');
      },
      edgeStep: 1.6, lightEvery: 5, lightOff: -0.55,
      edgeProp(ctx, x, z, nx, nz) {
        const r = ctx.rand, s = 0.8 + r() * 0.7, d = 0.9 + r() * 1.6;
        const tx = x + nx * d + (r() - 0.5) * 0.8, tz = z + nz * d + (r() - 0.5) * 0.8;
        ctx.inst('trunk', unitCyl, lam(0x2a1e18), tx, 2.5 * s, tz, 0.45 * s, 5 * s, 0.45 * s);
        const hue = 0.36 + r() * 0.08;
        ctx.inst('crown', unitCone, lam(0xffffff), tx, 5.2 * s, tz, 1.7 * s, 4.2 * s, 1.7 * s, r() * 6, new THREE.Color().setHSL(hue, 0.4, 0.14 + r() * 0.06).getHex());
        ctx.inst('crown', unitCone, lam(0xffffff), tx, 7.4 * s, tz, 1.2 * s, 3.0 * s, 1.2 * s, r() * 6, new THREE.Color().setHSL(hue, 0.4, 0.17 + r() * 0.06).getHex());
        ctx.inst('bush', unitBlob, lam(0xffffff), x + nx * 0.2, 0.45, z + nz * 0.2, 0.8 + r() * 0.3, 0.6 + r() * 0.3, 0.8 + r() * 0.3, r() * 6, new THREE.Color().setHSL(0.33 + r() * 0.06, 0.4, 0.15 + r() * 0.05).getHex());
      },
      roomLight: 0xa08aff, vaultLight: 0x8affc0, lightIntensity: 1.4, wallLight: 'lantern', wallLightColor: 0xb06aff, gate: 'ward', gateColor: 0xb06aff, gateFrame: 0x5a5a6a, rackColor: 0x3a2a24, pedestal: 0x5a5a6a,
    },
    racks: { west: ['wand', 'wand', 'wand', 'wand'], east: ['wand', 'wand', 'sword', 'sword', 'shield'] },
    decorate(ctx) {
      const { G, ROOMS, rand, torches, flameMat, VAULT, inst } = ctx;
      const capMats = [new THREE.MeshBasicMaterial({ color: 0x8affc0 }), new THREE.MeshBasicMaterial({ color: 0xb06aff }), new THREE.MeshBasicMaterial({ color: 0x6ad0ff })];
      const capGeo = new THREE.SphereGeometry(0.1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
      for (const r of ROOMS) for (let k = 0; k < 8; k++) {
        const x = r.cx + (k % 2 ? 1 : -1) * (r.w / 2 - 0.4), z = r.cz - r.d / 2 + 0.8 + rand() * (r.d - 1.6);
        inst('stem', unitCyl, lam(0xe8e0c8), x, 0.1, z, 0.07, 0.2, 0.07);
        const cap = new THREE.Mesh(capGeo, capMats[k % 3]); cap.position.set(x, 0.2, z); G.add(cap);
      }
      // a bubbling cauldron in the clearing
      const caul = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 10, 0, Math.PI * 2, Math.PI * 0.35, Math.PI * 0.65), new THREE.MeshLambertMaterial({ color: 0x1a1a22, side: THREE.DoubleSide }));
      caul.position.set(-2.6, 0.6, -2.4); G.add(caul);
      const brew = new THREE.Mesh(new THREE.CircleGeometry(0.44, 18), new THREE.MeshBasicMaterial({ color: 0x6aff8a }));
      brew.rotation.x = -Math.PI / 2; brew.position.set(-2.6, 0.86, -2.4); G.add(brew);
      const steam = new THREE.Sprite(flameMat.clone()); steam.material.color.setHex(0x6aff8a);
      steam.position.set(-2.6, 1.2, -2.4); steam.scale.set(1.2, 1.2, 1); G.add(steam);
      torches.push({ glow: steam, core: null, phase: 1, big: true });
      // standing stones in the Hexwarden's circle and at the altar
      const r3 = ROOMS[ROOMS.length - 2];   // the boss's arena
      for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; inst('stone', unitBox, lam(0x6a6a7a), r3.cx + Math.cos(a) * 9.6, 1.3, r3.cz + Math.sin(a) * 8.6, 0.8, 2.4 + rand() * 0.8, 0.5, -a); }
      for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) inst('stone', unitBox, lam(0x6a6a7a), VAULT.cx + x, 0.9, VAULT.cz + z, 0.5, 1.8, 0.35, rand());
      // the ancient glowing tree behind the altar
      const ax = 0, az = ROOMS[ROOMS.length - 1].cz - 24;
      addCyl(G, 2.4, 4.0, 22, 12, lam(0x3a2a24), ax, 11, az);
      for (const [dx, dy, dz, s] of [[0, 26, 0, 9], [-6, 22, 3, 6], [6, 23, -2, 6.5], [0, 20, -6, 6]]) {
        const c = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), new THREE.MeshLambertMaterial({ color: 0x3a6a8a, emissive: 0x1a4a5a }));
        c.position.set(ax + dx, dy, az + dz); G.add(c);
      }
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: 0x8affe0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      halo.position.set(ax, 24, az); halo.scale.set(40, 40, 1); G.add(halo);
      // the deep forest all around
      scatter(ctx, 340, -80, 80, 30, -200, 3.5, (x, z) => {
        const s = 0.9 + rand() * 0.9, hue = 0.36 + rand() * 0.1;
        inst('trunk', unitCyl, lam(0x2a1e18), x, 2.5 * s, z, 0.45 * s, 5 * s, 0.45 * s);
        inst('crown', unitCone, lam(0xffffff), x, 5.2 * s, z, 1.8 * s, 4.4 * s, 1.8 * s, rand() * 6, new THREE.Color().setHSL(hue, 0.4, 0.12 + rand() * 0.06).getHex());
        inst('crown', unitCone, lam(0xffffff), x, 7.6 * s, z, 1.2 * s, 3.2 * s, 1.2 * s, rand() * 6, new THREE.Color().setHSL(hue, 0.4, 0.15 + rand() * 0.06).getHex());
      });
      ring(ctx, 24, 170, 240, -60, (x, z) => { const s = 40 + rand() * 40; inst('hill', unitBlob, lam(0x141a24), x, 0, z, s, s * 0.5, s); });
      // fireflies
      const fly = new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xd0ff8a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
      for (const r of ROOMS) for (let k = 0; k < 6; k++) {
        const s = new THREE.Sprite(fly); s.position.set(r.cx + (rand() - 0.5) * r.w, 1 + rand() * 2.5, r.cz + (rand() - 0.5) * r.d); s.scale.set(0.25, 0.25, 1); G.add(s);
        torches.push({ glow: s, core: null, phase: rand() * 100, firefly: true, x0: s.position.x, y0: s.position.y, z0: s.position.z });
      }
    },
    goal: { name: 'Moonstone Heart', glow: 0x8affc0, make: () => ({ mesh: new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 1), new THREE.MeshLambertMaterial({ color: 0xc8fff0, emissive: 0x2a8a6a })) }) },
    text: {
      title: 'Hexwood Hollow', begin: 'Enter the woods', claim: 'Claim the Moonstone Heart', win: 'The Moonstone Heart is yours! The hollow is safe', summon: 'The Hexwarden summons wisps!', vaultOpen: 'The altar glade is open!',
      howto: [
        ['Your wand', 'Trigger casts. Fireball: hold to charge a bigger blast. Frost shard: slows enemies down. Chain lightning: jumps between foes.'],
        ['Switch spells', 'Press A or X in VR, or R in a browser.'],
        ['Watch out', 'Ghouls burst into two bog crawlers when they fall. Wisps explode when they reach you, so hit them early.'],
        ['Helpers', 'Press Blob helpers by the start to bring up to three friendly blobs. They follow you and bonk what\u2019s close.'],
      ],
    },
    colors: { board: '#1a1430', accent: '#b06aff', sub: '#c8b8e8', text: '#ece4f4', label: '#8affc0', button: 0x8affc0 },
  });

