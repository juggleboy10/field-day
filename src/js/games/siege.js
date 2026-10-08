  // ---------------- Skyline Siege: rooftops and bridges high above a city at night
  const siege = makeQuest({
    idx: 10, seed: 70707,
    env: {
      sky: skyTexture([[0, '#04060e'], [0.38, '#0c1430'], [0.48, '#2a3a6a'], [0.5, '#4a4a7a'], [0.53, '#0a0e1a'], [1, '#05070c']]),
      bg: 0x060a14, fog: [0x0a1226, 70, 300], hemi: [0x8ab4ff, 0x1a1420, 0.65],
      sun: [0x9ab4ff, 0.35], sunDir: new V3(0.2, 1, 0.3), ambient: [0x30405a, 0.48],
      sprite: { tex: paleSunTex, pos: new V3(-160, 220, -380), scale: 34 },
    },
    rooms: [
      { name: 'Landing pad', cx: 0, cz: 0, w: 12, d: 12, waves: [] },
      { name: 'Server roof', cx: 14, cz: -26, w: 18, d: 16, waves: [[['trooper', -4, -4], ['trooper', 4, -4], ['drone', -2, 2], ['drone', 2, 2]], [['crusher', 0, 0], ['drone', -4, -4], ['drone', 4, -4]]] },
      { name: 'Turbine roof', cx: -12, cz: -52, w: 20, d: 16, waves: [[['turret', -8.4, -6.4], ['turret', 8.4, -6.4], ['trooper', 0, -3], ['crusher', -2, 2]], [['drone', -5, 0], ['drone', 5, 0], ['trooper', -6, 4], ['trooper', 6, 4], ['crusher', 0, -4]]] },
      { name: 'Antenna roof', cx: 12, cz: -78, w: 20, d: 16, waves: [[['trooper', -5, -4], ['trooper', 5, -4], ['trooper', 0, 2], ['drone', -3, 0], ['drone', 3, 0]], [['crusher', -3, 0], ['crusher', 3, 0], ['turret', -8.4, -6.4], ['turret', 8.4, -6.4], ['drone', 0, -4]]] },
      { name: 'Reactor roof', cx: -10, cz: -104, w: 22, d: 18, waves: [[['trooper', -6, -4], ['trooper', 6, -4], ['trooper', -2, 2], ['trooper', 2, 2], ['crusher', 0, -2]], [['drone', -6, 0], ['drone', 6, 0], ['drone', -2, -5], ['drone', 2, -5], ['turret', -9.4, -7.4], ['turret', 9.4, -7.4]], [['crusher', -4, 0], ['crusher', 4, 0], ['trooper', -7, -5], ['trooper', 7, -5], ['trooper', 0, -6]]] },
      { name: 'Control deck', cx: 4, cz: -132, w: 22, d: 20, waves: [[['overseer', 0, -4], ['trooper', -8, -7], ['trooper', 8, -7]]] },
      { name: 'Core platform', cx: 0, cz: -158, w: 10, d: 10, waves: [] },
    ],
    theme: {
      groundY: -42, slab: 0x2a3040,
      ground(g, rand) {
        g.fillStyle = '#0c0e16'; g.fillRect(0, 0, 256, 256);
        g.fillStyle = '#1a1c26'; g.fillRect(0, 120, 256, 16); g.fillRect(120, 0, 16, 256);
        for (let k = 0; k < 60; k++) { g.fillStyle = rand() < 0.7 ? '#ffd08a' : '#ff6a6a'; g.fillRect(rand() < 0.5 ? 120 + rand() * 16 : rand() * 256, rand() < 0.5 ? 120 + rand() * 16 : rand() * 256, 2, 2); }
      },
      floor(g, rand) {
        g.fillStyle = '#1a1e28'; g.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 8) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y, 256, 2); }
        for (let x = 0; x < 256; x += 8) { g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(x, 0, 2, 256); }
        g.strokeStyle = 'rgba(79,195,247,0.35)'; g.lineWidth = 3; g.strokeRect(2, 2, 252, 252);
        speckle(g, rand, 800, 'rgba(255,255,255,0.04)', 'rgba(0,0,0,0.1)');
      },
      path(g) {
        g.fillStyle = '#2a3040'; g.fillRect(0, 0, 256, 256);
        for (let y = 0; y < 256; y += 32) { g.fillStyle = '#20262f'; g.fillRect(0, y, 256, 3); }
        g.fillStyle = '#ffb020'; for (let y = 0; y < 256; y += 32) { g.fillRect(4, y + 8, 10, 14); g.fillRect(242, y + 8, 10, 14); }
      },
      edgeStep: 1.5, lightEvery: 5,
      edgeProp(ctx, x, z, nx, nz, seg) {
        const px = x - nx * 0.25, pz = z - nz * 0.25;
        ctx.inst('rpost', unitBox, lam(0x8a90a0), px, 0.55, pz, 0.07, 1.1, 0.07);
        if (nx) { ctx.inst('rail', unitBox, lam(0xc8ccd8), px, 1.1, pz, 0.06, 0.06, seg); ctx.inst('glass', unitBox, RAIL_GLASS, px, 0.55, pz, 0.02, 0.9, seg - 0.05); }
        else { ctx.inst('rail', unitBox, lam(0xc8ccd8), px, 1.1, pz, seg, 0.06, 0.06); ctx.inst('glass', unitBox, RAIL_GLASS, px, 0.55, pz, seg - 0.05, 0.9, 0.02); }
      },
      roomLight: 0x9ad0ff, vaultLight: 0xff4a8a, lightIntensity: 1.5, wallLight: 'neon', wallLightColor: 0x4fc3f7, gate: 'door', gateColor: 0x3a4458, gateFrame: 0x2a3040, rackColor: 0x3a4052, pedestal: 0x2a3040,
    },
    racks: { west: ['pistol', 'scatter', 'rail', 'plasma'], east: ['pistol', 'scatter', 'rail', 'plasma', 'shield'] },
    decorate(ctx) {
      const { G, ROOMS, rand, VAULT, inst, groundY, torches } = ctx;
      const rackMat = lam(0x1c2230), led = [new THREE.MeshBasicMaterial({ color: 0x4fc3f7 }), new THREE.MeshBasicMaterial({ color: 0x8bd450 }), new THREE.MeshBasicMaterial({ color: 0xff4a8a })];
      const r1 = ROOMS[1];
      for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) {
        const z = r1.cz - 4 + k * 4, x = r1.cx + sx * (r1.w / 2 - 1.0);
        addBox(G, 0.8, 2.2, 1.2, rackMat, x, 1.1, z);
        for (let j = 0; j < 6; j++) G.add(at(new THREE.Mesh(boxg(0.02, 0.05, 0.05), led[Math.floor(rand() * 3)]), x - sx * 0.41, 0.4 + j * 0.3, z - 0.4 + rand() * 0.8));
      }
      const r2 = ROOMS[2];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        addCyl(G, 1.1, 1.2, 1.6, 20, lam(0x2e3646), r2.cx + sx * (r2.w / 2 - 2.0), 0.8, r2.cz + sz * 4.5);
        addCyl(G, 1.0, 1.0, 0.06, 20, new THREE.MeshBasicMaterial({ color: 0x4fc3f7 }), r2.cx + sx * (r2.w / 2 - 2.0), 1.64, r2.cz + sz * 4.5);
      }
      const r3 = ROOMS[ROOMS.length - 2];   // the boss's arena
      for (const sx of [-1, 0, 1]) {
        addBox(G, 2.2, 1.0, 0.8, lam(0x2a3040), r3.cx + sx * 5, 0.5, r3.z0 + 1.5);
        G.add(at(new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), new THREE.MeshBasicMaterial({ color: 0x1a6aa0 })), r3.cx + sx * 5, 1.25, r3.z0 + 1.91));
      }
      for (const [x, z] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) addCyl(G, 0.2, 0.25, 2.6, 10, new THREE.MeshLambertMaterial({ color: 0x2a3040, emissive: 0x0a1a30 }), VAULT.cx + x, 1.3, VAULT.cz + z);
      // a helipad marking on the landing pad
      const pad = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.5, 40), new THREE.MeshBasicMaterial({ color: 0xffb020 })); pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.02, 0.5); G.add(pad);
      // the city: towers in every direction, lit windows, rooftop beacons
      const winTex = canvasTexture(64, 128, (g) => { g.fillStyle = '#10162a'; g.fillRect(0, 0, 64, 128); for (let y = 3; y < 128; y += 7) for (let x = 2; x < 64; x += 6) { const v = rand(); g.fillStyle = v < 0.32 ? '#ffd08a' : v < 0.4 ? '#7ad8ff' : '#182040'; g.fillRect(x, y, 3, 4); } }).tex;
      winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
      const towerMat = new THREE.MeshBasicMaterial({ map: winTex, color: 0xb8c4ff });
      const beaconMat = new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xff3a4a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
      const towers = [];
      scatter(ctx, 90, -150, 150, 70, -260, 9, (x, z) => towers.push([x, z]));
      ring(ctx, 40, 170, 260, -80, (x, z) => towers.push([x, z]));
      for (const [x, z] of towers) {
        const w = 8 + rand() * 12, d = 8 + rand() * 12, h = 20 + rand() * 90;
        const geo = new THREE.BoxGeometry(w, h, d);
        const uv = geo.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 10, uv.getY(i) * h / 20);
        const m = new THREE.Mesh(geo, towerMat);
        m.position.set(x, groundY + h / 2, z);
        G.add(m);
        if (rand() < 0.3) { const b = new THREE.Sprite(beaconMat); b.position.set(x, groundY + h + 1, z); b.scale.set(3, 3, 1); G.add(b); torches.push({ glow: b, core: null, phase: rand() * 100, blink: true }); }
      }
      // the beacon spire behind the core
      addCyl(G, 2.5, 6, 160, 12, lam(0x1a2030), 30, groundY + 80, -160);
      const spire = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: 0x4fc3f7, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      spire.position.set(30, groundY + 164, -160); spire.scale.set(26, 26, 1); G.add(spire);
      torches.push({ glow: spire, core: null, phase: 0, beacon: true });
      void inst;
    },
    goal: { name: 'Command Core', glow: 0x4fc3f7, make: () => ({ mesh: new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshLambertMaterial({ color: 0x8adfff, emissive: 0x1a6aa0 })) }) },
    text: {
      title: 'Skyline Siege', begin: 'Begin assault', claim: 'Shut down the Command Core', win: 'Mission complete! The Command Core is yours', summon: 'The Overseer launches drones!', vaultOpen: 'The core platform is open!',
      howto: [
        ['Four laser guns', 'Blaster fires fast. Scatter sprays at short range. Rail charges while you hold, then pierces everything in a line. Plasma lobs an explosive glob.'],
        ['In VR', 'Squeeze to take a gun, trigger to fire, squeeze again to put it down. Hold one in each hand.'],
        ['In a browser', 'E takes a gun, click to fire, hold Space to charge the rail.'],
      ],
    },
    colors: { board: '#0d1424', accent: '#4fc3f7', sub: '#9ab4d8', text: '#e4eefa', label: '#ff6ab0', button: 0x4fc3f7 },
  });

