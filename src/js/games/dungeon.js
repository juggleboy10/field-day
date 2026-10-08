  // ---------------- Sunstone Keep: ruined castle grounds at dusk
  const dungeon = makeQuest({
    idx: 3, seed: 31337,
    env: {
      sky: skyTexture([[0, '#1a1430'], [0.3, '#4a2a5a'], [0.44, '#b0584a'], [0.5, '#f2a05a'], [0.52, '#3a2a2a'], [1, '#1a1418']]),
      bg: 0x2a1a24, fog: [0x3a2430, 30, 150], hemi: [0xffb890, 0x2a2018, 0.7],
      sun: [0xffa070, 0.65], sunDir: new V3(0.6, 0.35, -0.7), ambient: [0x4a3a50, 0.42],
      sprite: { tex: paleSunTex, pos: new V3(220, 40, -320), scale: 70 },
    },
    rooms: [
      { name: 'Armory', cx: 0, cz: 0, w: 12, d: 12, waves: [] },
      { name: 'Guard yard', cx: -12, cz: -26, w: 18, d: 16, waves: [[['goblin', -4, -3], ['goblin', 4, -3], ['goblin', -2, 3], ['goblin', 3, 4]]] },
      { name: 'Bone garden', cx: 12, cz: -52, w: 20, d: 16, waves: [[['archer', -6, -5], ['archer', 6, -5], ['goblin', 0, 0]], [['goblin', -5, 2], ['brute', 0, 1], ['archer', 0, -6], ['bat', -3, -2], ['bat', 3, -2]]] },
      { name: 'Crypt stairs', cx: -10, cz: -78, w: 20, d: 16, waves: [[['goblin', -5, -3], ['goblin', 5, -3], ['goblin', 0, 3], ['archer', -6, -6], ['archer', 6, -6]], [['brute', -3, 0], ['brute', 3, 0], ['archer', -6, -5], ['archer', 6, -5], ['bat', -2, 3], ['bat', 2, 3]]] },
      { name: 'Gatehouse', cx: 12, cz: -104, w: 22, d: 18, waves: [[['brute', -4, -2], ['brute', 4, -2], ['archer', -8, -6], ['archer', 0, -7], ['archer', 8, -6]], [['goblin', -6, 3], ['goblin', 6, 3], ['goblin', -2, -3], ['goblin', 2, -3], ['bat', -4, 0], ['bat', 4, 0], ['bat', 0, 4]], [['brute', -5, 0], ['brute', 0, -4], ['brute', 5, 0], ['archer', -8, -6], ['archer', 8, -6]]] },
      { name: 'Warden\u2019s ruin', cx: 0, cz: -132, w: 22, d: 20, waves: [[['warden', 0, -4], ['archer', -8, -7], ['archer', 8, -7]]] },
      { name: 'Chapel vault', cx: 0, cz: -158, w: 10, d: 10, waves: [] },
    ],
    theme: {
      ground(g, rand) {
        g.fillStyle = '#3a4228'; g.fillRect(0, 0, 256, 256);
        for (let k = 0; k < 50; k++) { g.fillStyle = rand() < 0.5 ? 'rgba(80,90,50,0.45)' : 'rgba(30,34,20,0.4)'; g.beginPath(); g.arc(rand() * 256, rand() * 256, 8 + rand() * 24, 0, Math.PI * 2); g.fill(); }
        speckle(g, rand, 2500, 'rgba(160,170,100,0.1)', 'rgba(0,0,0,0.12)');
      },
      floor(g, rand) {
        g.fillStyle = '#2a2630'; g.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { const s = 70 + Math.floor(rand() * 30); g.fillStyle = `rgb(${s},${s - 4},${s + 6})`; g.fillRect(x * 64 + 3, y * 64 + 3, 58, 58); }
        speckle(g, rand, 1800, 'rgba(255,255,255,0.05)', 'rgba(0,0,0,0.12)');
        for (let k = 0; k < 8; k++) { g.fillStyle = 'rgba(70,90,50,0.35)'; g.beginPath(); g.arc(rand() * 256, rand() * 256, 6 + rand() * 10, 0, Math.PI * 2); g.fill(); }
      },
      path(g, rand) {
        g.fillStyle = '#3a342e'; g.fillRect(0, 0, 256, 256);
        for (let k = 0; k < 90; k++) { const s = 80 + Math.floor(rand() * 40); g.fillStyle = `rgb(${s},${s - 6},${s - 12})`; g.beginPath(); g.ellipse(rand() * 256, rand() * 256, 10 + rand() * 8, 7 + rand() * 6, rand() * 3, 0, Math.PI * 2); g.fill(); }
      },
      edgeStep: 1.8, lightEvery: 4, lightOff: -0.25,
      edgeProp(ctx, x, z, nx, nz, seg) {
        const r = ctx.rand();
        const h = r < 0.15 ? 0.5 + ctx.rand() * 0.5 : 1.6 + ctx.rand() * 1.8;
        const s = 0.6 + ctx.rand() * 0.25;
        const col = new THREE.Color().setHSL(0.72, 0.06, 0.32 + ctx.rand() * 0.1).getHex();
        // tiny random differences, so no two blocks ever share a face (shared faces flicker)
        const th = 0.78 + ctx.rand() * 0.06, off = 0.18 + ctx.rand() * 0.05, ln = seg + 0.02 + ctx.rand() * 0.04;
        if (nx) ctx.inst('wall', unitBox, lam(0xffffff), x + nx * off, h / 2, z, th, h, ln, 0, col);
        else ctx.inst('wall', unitBox, lam(0xffffff), x, h / 2, z + nz * off, ln, h, th, 0, col);
        if (r > 0.93) ctx.inst('tower', unitCyl, lam(0x5a5462), x + nx * 0.8, 2.6, z + nz * 0.8, 2.0, 5.2, 2.0);
        if (ctx.rand() < 0.2) ctx.inst('rubble', unitBlob, lam(0x4a4552), x - nz * 0.6 + nx * 0.2, 0.15, z + nx * 0.6 + nz * 0.2, 0.3 * s, 0.25 * s, 0.3 * s, ctx.rand() * 6);
      },
      roomLight: 0xffb070, vaultLight: 0xffd27a, lightIntensity: 1.3, wallLight: 'torch', wallLightColor: 0xffb060, gate: 'bars', gateFrame: 0x5a5462,
    },
    racks: { west: ['sword', 'sword', 'sword', 'sword'], east: ['crossbow', 'crossbow', 'crossbow', 'crossbow', 'shield'] },
    decorate(ctx) {
      const { G, ROOMS, rand, torches, flameMat, ironMat, woodMat, VAULT, inst } = ctx;
      const boneMat = lam(0xd8d2c0);
      const r2 = ROOMS[2];
      for (let k = 0; k < 16; k++) inst('bone', unitBlob, boneMat, r2.cx + (k % 2 ? 1 : -1) * (r2.w / 2 - 0.4 - rand() * 0.6), 0.1, r2.z0 + 1 + rand() * (r2.d - 2), 0.12, 0.1, 0.12, rand() * 6);
      for (const [x, z] of [[-4, -2], [4, 2], [0, 5]]) { addCyl(G, 0.3, 0.35, 2.2, 8, lam(0x5a5462), r2.cx + x, 1.1, r2.cz + z); }
      const r3 = ROOMS[ROOMS.length - 2];   // the boss's arena
      // the Warden's throne sits off to one side, clear of the way out to the vault
      addBox(G, 2.4, 0.5, 1.6, lam(0x2a2630), r3.cx - 5.5, 0.25, r3.z0 + 1.2);
      addBox(G, 1.6, 2.6, 0.4, lam(0x3a3442), r3.cx - 5.5, 1.3, r3.z0 + 0.5);
      for (const sx of [-1, 1]) {
        addCyl(G, 0.35, 0.25, 1.0, 10, ironMat, r3.cx + sx * (r3.w / 2 - 1.5), 0.5, r3.z0 + 1.5);
        const f = new THREE.Sprite(flameMat); f.position.set(r3.cx + sx * (r3.w / 2 - 1.5), 1.4, r3.z0 + 1.5); f.scale.set(1.6, 1.8, 1); G.add(f);
        torches.push({ glow: f, core: null, phase: rand() * 100, big: true });
      }
      // a ruined chapel around the vault
      for (const sx of [-1, 1]) for (const z of [-3, 0, 3]) addCyl(G, 0.35, 0.4, 4.5, 10, lam(0x6a6472), VAULT.cx + sx * 4.2, 2.25, VAULT.cz + z);
      for (const sx of [-1, 1]) addBox(G, 0.8, 0.5, 7.0, lam(0x6a6472), VAULT.cx + sx * 4.2, 4.6, VAULT.cz);
      const goldMat = new THREE.MeshLambertMaterial({ color: 0xe8b54a, emissive: 0x3a2400 });
      for (const [x, z] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) { addBox(G, 0.9, 0.55, 0.6, woodMat, VAULT.cx + x, 0.28, VAULT.cz + z); addBox(G, 0.8, 0.12, 0.5, goldMat, VAULT.cx + x, 0.6, VAULT.cz + z); }
      // the great keep on the horizon, with towers
      const keepMat = lam(0x4a4452), roofMat = lam(0x3a1d2a);
      const kx = 34, kz = -150;
      addBox(G, 18, 30, 16, keepMat, kx, 15, kz);
      for (let i = 0; i < 9; i++) addBox(G, 1.4, 1.6, 16.4, keepMat, kx - 8 + i * 2, 30.8, kz);
      for (const [dx, dz, h] of [[-11, 9, 38], [11, 9, 36], [-11, -9, 40], [11, -9, 34]]) {
        addCyl(G, 3, 3.2, h, 14, keepMat, kx + dx, h / 2, kz + dz);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(3.8, 8, 14), roofMat); roof.position.set(kx + dx, h + 4, kz + dz); G.add(roof);
      }
      for (let i = 0; i < 6; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), new THREE.MeshBasicMaterial({ color: 0xffb060 })); w.position.set(kx - 6 + i * 2.4, 14 + (i % 2) * 6, kz + 8.05); G.add(w); }
      // outer walls of the old castle, mountains, and dark trees
      for (let i = 0; i < 26; i++) { const a = -0.3 + (i / 25) * (Math.PI + 0.6); const x = Math.cos(a) * 75, z = -50 - Math.sin(a) * 85; inst('curtain', unitBox, lam(0x4e4858), x, 4, z, 10, 8 + rand() * 3, 2.5, -a); }
      ring(ctx, 30, 190, 260, -60, (x, z) => { const s = 30 + rand() * 50; inst('mount', unitCone, lam(0x2a2236), x, s * 0.7, z, s, s * 1.4, s); });
      scatter(ctx, 140, -70, 70, 20, -140, 3, (x, z) => {
        const s = 0.7 + rand() * 0.8;
        inst('dtrunk', unitCyl, lam(0x2a1e18), x, 2.5 * s, z, 0.4 * s, 5 * s, 0.4 * s);
        inst('dcrown', unitBlob, lam(0xffffff), x, 5.6 * s, z, 2.0 * s, 1.8 * s, 2.0 * s, rand() * 6, new THREE.Color().setHSL(0.22 + rand() * 0.05, 0.3, 0.16 + rand() * 0.06).getHex());
      });
    },
    goal: { name: 'Sunstone', glow: 0xffd060, make: () => ({ mesh: new THREE.Mesh(new THREE.IcosahedronGeometry(0.17, 0), new THREE.MeshLambertMaterial({ color: 0xffc23a, emissive: 0xb86a00 })) }) },
    text: {
      title: 'Sunstone Keep', claim: 'Claim the Sunstone in the chapel', win: 'Quest complete! The Sunstone is yours', summon: 'The Warden calls for guards', vaultOpen: 'The chapel is open!',
      howto: [
        ['In VR', 'Squeeze to take a sword or crossbow; squeeze again to put it down. Swing hard to hit. Trigger fires the crossbow. Your sword can knock arrows away.'],
        ['In a browser', 'E takes or drops a weapon. Click or press Space to attack.'],
        ['Survive', 'Five hearts. Red rings mean the Warden is about to slam. Bats swoop from above and brutes hit twice as hard.'],
      ],
    },
    colors: { board: '#17121c', accent: '#e8b54a', sub: '#c9b8d8', text: '#ece4f4', label: '#e8a24a', button: 0xe8b54a },
  });

