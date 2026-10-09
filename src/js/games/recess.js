  // ================================================================ LEVEL: RECESS RUSH (a playground obstacle race)
  // A race down a schoolyard lane through seven playground games: hopscotch (light every square, and the paint
  // between them is lava), a tire run (step in the tires, the mud slows you), a sack race (you can only hop),
  // the ball pit (wade through), a crawl tunnel, monkey bars over lava, and the big slide to the finish.
  // The player physics follow Skyline Sprint: we move the dolly ourselves (noLocomotion). Bots run a fixed route.
  const recess = (() => {
    const L = newLevel(24);
    const G = L.group;
    L.noLocomotion = true;
    L.walkSpeed = 3;
    L.bounds = { minX: -30, maxX: 30, minZ: -130, maxZ: 30 };
    L.env = {
      sky: skyTexture([[0, '#4a9ae8'], [0.55, '#9ad0ff'], [0.62, '#d8f0ff'], [1, '#d8f0ff']]),
      bg: 0x9ad0ff, fog: [0xc8e8ff, 60, 220], hemi: [0xffffff, 0x6a8a4a, 0.9],
      sun: [0xfff2d8, 0.85], sunDir: new V3(0.5, 1, 0.3), ambient: [0x8090a0, 0.35],
      sprite: { tex: paleSunTex, pos: new V3(80, 90, -60), scale: 40 },
    };

    // ---------------------------------------------------------------- tuning and the layout (the lane runs down -z)
    const GRAV = 16, RUN = 4.8, JUMP_V = 6.2, STEP = 0.4, R = 0.28, LANE = 2.9, COUNT_MS = 4000;
    const Z = {
      hop: [-3.5, -11.5], gate: -12.6, tire: [-14.8, -27.2], sack: [-29, -45], pit: [-47.6, -56.4], tun: [-58.6, -67.4],
      barsStart: [-68.4, -70.4], bars: [-70.6, -78.6], barsEnd: [-77.8, -79.8], stairs: -102.4, tower: [-105.5, -107.6], slideEnd: -117, finish: -119.5,
    };
    const BAR_Y = 2.55, PLAT_Y = 0.7, TOWER_Y = 2.5;
    const _t = new V3(), _u = new V3(), _cp = new V3(), _cq = new Q4(), _fw = new V3();
    const rand = mulberry32(2424);

    // ---------------------------------------------------------------- the schoolyard
    const grassT = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#6aaa3a'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,255,180,0.08)' : 'rgba(20,60,10,0.12)'; g.fillRect(rand() * 256, rand() * 256, 2, 3); }
    }).tex;
    grassT.wrapS = grassT.wrapT = THREE.RepeatWrapping; grassT.repeat.set(30, 40);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 220), new THREE.MeshLambertMaterial({ map: grassT }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.01, -45); G.add(ground);
    // the lane: soft blue rubber matting, with white edge lines
    const matT = canvasTexture(128, 128, (g) => {
      g.fillStyle = '#4a8ad8'; g.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 600; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,40,0.08)'; g.fillRect(rand() * 128, rand() * 128, 2, 2); }
    }).tex;
    matT.wrapS = matT.wrapT = THREE.RepeatWrapping; matT.repeat.set(3, 55);
    const lane = new THREE.Mesh(new THREE.PlaneGeometry(LANE * 2 + 0.4, 136), new THREE.MeshLambertMaterial({ map: matT, polygonOffset: true, polygonOffsetFactor: -1 }));
    lane.rotation.x = -Math.PI / 2; lane.position.set(0, 0.002, -60); G.add(lane);
    const white = lam(0xffffff);
    for (const s of [-1, 1]) addBox(G, 0.08, 0.01, 136, white, s * (LANE + 0.16), 0.008, -60);
    // a low picket fence down both sides, in rainbow colours
    {
      const cols = [0xff5a5a, 0xffa23a, 0xffd23f, 0x6ad04a, 0x4ab0ff, 0xa07aff].map(lam);
      for (const s of [-1, 1]) for (let z = 5; z > -128; z -= 0.45) {
        const p = addBox(G, 0.1, 0.75, 0.06, cols[Math.floor((5 - z) / 0.45) % cols.length], s * (LANE + 0.45), 0.375, z);
        void p;
      }
      for (const s of [-1, 1]) for (const y of [0.25, 0.6]) addBox(G, 0.04, 0.06, 133, white, s * (LANE + 0.42), y, -61.5);
    }
    // the school, trees, a swing set and a seesaw out on the grass
    {
      const brick = lam(0xc8684a), trim = lam(0xf2ead8), roof = lam(0x5a6a7a), glass = lam(0x9ad0ff);
      addBox(G, 30, 8, 10, brick, -26, 4, -40);
      addBox(G, 30.6, 0.6, 10.6, roof, -26, 8.3, -40);
      for (let i = 0; i < 6; i++) for (const y of [2.4, 5.6]) { addBox(G, 2.2, 1.6, 0.1, glass, -38 + i * 4.8, y, -34.95); addBox(G, 2.5, 0.12, 0.14, trim, -38 + i * 4.8, y - 0.86, -34.92); }
      addBox(G, 2.4, 3, 0.1, lam(0x2a5a9a), -14, 1.5, -34.95);
      makePlate(G, 'MAPLE STREET SCHOOL', 7, 0.8, new V3(-26, 7.1, -34.88), 0, { bg: '#f2ead8', fg: '#7a2a1a', size: 0.6 });
      const trunk = lam(0x7a5a3a), leaves = [lam(0x4a9a3a), lam(0x5aaa44), lam(0x3a8a2a)];
      for (let k = 0; k < 28; k++) {
        const side = k % 2 ? 1 : -1, x = side * (8 + rand() * 30), z = 10 - rand() * 120;
        if (x < -9 && z < -32 && z > -48) continue;
        const h = 2.4 + rand() * 2;
        addCyl(G, 0.22, 0.3, h, 7, trunk, x, h / 2, z);
        const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + rand() * 1.2, 1), leaves[k % 3]); c.position.set(x, h + 1.3, z); G.add(c);
      }
      // swings
      const metal = lam(0xff5a5a);
      for (const s of [-1, 1]) for (const dz of [-1, 1]) { const leg = addBox(G, 0.1, 3.2, 0.1, metal, 12 + s * 3, 1.5, -20 + dz * 0.8); leg.rotation.x = dz * 0.25; }
      addBox(G, 6.4, 0.12, 0.12, metal, 12, 3.05, -20);
      for (const x of [10.6, 13.4]) { for (const s of [-1, 1]) addBox(G, 0.03, 2.2, 0.03, lam(0x444444), x + s * 0.3, 1.9, -20); addBox(G, 0.75, 0.06, 0.3, lam(0x3a3a4a), x, 0.8, -20); }
      // a seesaw
      addBox(G, 0.4, 0.5, 0.4, lam(0xffd23f), 12, 0.25, -52);
      const plank = addBox(G, 0.35, 0.08, 4.2, lam(0x4ab0ff), 12, 0.6, -52); plank.rotation.x = 0.18;
      // a sandbox
      addBox(G, 4, 0.25, 4, lam(0xe8d8a0), -12, 0.12, -8);
      for (const [x, z, w, d] of [[-12, -10, 4.2, 0.2], [-12, -6, 4.2, 0.2], [-14, -8, 0.2, 4], [-10, -8, 0.2, 4]]) addBox(G, w, 0.35, d, lam(0xa0703a), x, 0.17, z);
    }
    // bunting over the start
    {
      for (const s of [-1, 1]) addCyl(G, 0.07, 0.07, 3.6, 8, lam(0xf2ead8), s * (LANE + 0.6), 1.8, -0.5);
      const flagCols = [0xff5a5a, 0xffd23f, 0x4ab0ff, 0x6ad04a, 0xa07aff, 0xffa23a];
      const n = 14;
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n, x = -(LANE + 0.6) + t * (LANE + 0.6) * 2, y = 3.5 - Math.sin(t * Math.PI) * 0.5;
        const f = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 3), new THREE.MeshLambertMaterial({ color: flagCols[i % flagCols.length], side: THREE.DoubleSide }));
        f.rotation.x = Math.PI; f.position.set(x, y - 0.17, -0.5); G.add(f);
      }
      makePlate(G, 'RECESS RUSH', 3.6, 0.6, new V3(0, 4.15, -0.5), 0, { bg: '#ffd23f', fg: '#2a3a8a', size: 0.7 });
    }

    // ---------------------------------------------------------------- solids, the slide, holds (as in Skyline Sprint)
    const SOL = [], RAMPS = [], HOLDS = [];
    function solid(x0, x1, y0, y1, z0, z1, mat, extra) {
      const mesh = mat === null ? null : addBox(G, x1 - x0, y1 - y0, z1 - z0, mat, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      const s = Object.assign({ x0, x1, y0, y1, z0, z1, mesh }, extra || {});
      SOL.push(s);
      return s;
    }
    // station signs: a number and the game's name on a post at the side of the lane
    function stationSign(n, name, sub, z) {
      addCyl(G, 0.06, 0.06, 2.4, 8, lam(0xf2ead8), -LANE - 0.9, 1.2, z);
      makePlate(G, `${n}  ${name}`, 2.4, 0.42, new V3(-LANE - 0.9, 2.6, z + 0.04), 0, { bg: '#2a3a8a', fg: '#ffd23f', size: 0.62 });
      makePlate(G, sub, 2.4, 0.26, new V3(-LANE - 0.9, 2.24, z + 0.04), 0, { bg: '#f2ead8', fg: '#2a3a8a', size: 0.6 });
    }
    // a lava floor: bubbling orange paint, with LAVA written on it
    const lavaC = canvasTexture(256, 256, (g) => {
      const gr = g.createRadialGradient(128, 128, 10, 128, 128, 180); gr.addColorStop(0, '#ffb03a'); gr.addColorStop(1, '#e8402a');
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,${200 + rand() * 55},80,0.35)`; g.beginPath(); g.arc(rand() * 256, rand() * 256, 6 + rand() * 18, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = 'rgba(120,20,10,0.4)'; g.font = `800 48px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LAVA', 128, 128);
    });
    lavaC.tex.wrapS = lavaC.tex.wrapT = THREE.RepeatWrapping;
    const lavaMat = (rx, rz) => { const t = lavaC.tex.clone(); t.needsUpdate = true; t.repeat.set(rx, rz); return new THREE.MeshLambertMaterial({ map: t, emissive: 0x401000, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); };
    const lavaMats = [];
    function lavaFloor(x0, x1, z0, z1) {
      const m = lavaMat((x1 - x0) / 2, (z0 - z1) / 2); lavaMats.push(m);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z0 - z1), m);
      p.rotation.x = -Math.PI / 2; p.position.set((x0 + x1) / 2, 0.006, (z0 + z1) / 2); G.add(p);
    }

    // 1. hopscotch: ten chalk squares; stepping on the lava between them sends you back
    stationSign(1, 'HOPSCOTCH', 'Step on every square', -2.6);
    lavaFloor(-LANE, LANE, Z.hop[0], Z.hop[1]);
    const HOP_ROWS = [[1], [2], [3], [4, 5], [6], [7, 8], [9], [10]];
    const SQ = 0.95;
    const squares = [];
    HOP_ROWS.forEach((row, i) => {
      const z = -4 - i * 1.0;
      row.forEach((n, j) => {
        const x = row.length === 1 ? 0 : (j ? SQ / 2 : -SQ / 2);
        const ct = canvasTexture(128, 128, (g) => {
          g.fillStyle = '#3a6ad0'; g.fillRect(0, 0, 128, 128);
          g.strokeStyle = '#ffffff'; g.lineWidth = 8; g.strokeRect(6, 6, 116, 116);
          g.fillStyle = '#ffffff'; g.font = `800 64px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 64, 70);
        });
        const mat = new THREE.MeshBasicMaterial({ map: ct.tex, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 });
        const m = new THREE.Mesh(new THREE.PlaneGeometry(SQ - 0.03, SQ - 0.03), mat);
        m.rotation.x = -Math.PI / 2; m.position.set(x, 0.012, z); G.add(m);
        squares.push({ n, x, z, w: SQ / 2, mat, lit: false });
      });
    });
    // the ribbon gate at the end of the hopscotch: it opens once every square is lit
    const gate = solid(-LANE, LANE, 0, 2.2, Z.gate - 0.08, Z.gate + 0.08, null);
    const ribbon = new THREE.Group(); G.add(ribbon);
    { const rm = new THREE.MeshLambertMaterial({ color: 0xff3a6a });
      for (const y of [0.55, 1.05]) { const b = addBox(ribbon, LANE * 2, 0.12, 0.03, rm, 0, y, Z.gate); void b; }
      for (const s of [-1, 1]) addCyl(G, 0.08, 0.08, 2.2, 8, lam(0xffd23f), s * (LANE + 0.1), 1.1, Z.gate); }
    const gateSign = makePlate(G, '0 / 10', 1.2, 0.34, new V3(0, 1.6, Z.gate + 0.03), 0, { bg: '#ff3a6a', fg: '#ffffff', size: 0.7 });
    const onSquare = (x, z) => squares.find((s) => Math.abs(x - s.x) <= s.w + 0.04 && Math.abs(z - s.z) <= SQ / 2 + 0.04);

    // 2. the tire run: step in the tires, the mud between them is slow going
    stationSign(2, 'TIRE RUN', 'Step in the tires, not the mud', -14.2);
    {
      const mud = new THREE.Mesh(new THREE.PlaneGeometry(LANE * 2, Z.tire[0] - Z.tire[1]), new THREE.MeshLambertMaterial({ map: canvasTexture(128, 128, (g) => {
        g.fillStyle = '#6a4a2a'; g.fillRect(0, 0, 128, 128);
        for (let i = 0; i < 300; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(40,25,10,0.3)' : 'rgba(150,110,70,0.25)'; g.beginPath(); g.arc(rand() * 128, rand() * 128, 1 + rand() * 4, 0, Math.PI * 2); g.fill(); }
      }).tex, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
      mud.material.map.wrapS = mud.material.map.wrapT = THREE.RepeatWrapping; mud.material.map.repeat.set(3, 6);
      mud.rotation.x = -Math.PI / 2; mud.position.set(0, 0.006, (Z.tire[0] + Z.tire[1]) / 2); G.add(mud);
    }
    const TIRES = [];
    { const tm = lam(0x26262c), rim = lam(0xffd23f);
      for (let i = 0; i < 12; i++) for (const x of [-0.8, 0.8]) {
        const z = -15.5 - i * 1.0, xx = x + (i % 2 ? 0.1 : -0.1);
        const t = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.1, 8, 18), tm); t.rotation.x = Math.PI / 2; t.position.set(xx, 0.1, z); G.add(t);
        const r = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.025, 6, 18), rim); r.rotation.x = Math.PI / 2; r.position.set(xx, 0.2, z); G.add(r);
        TIRES.push([xx, z]);
      } }
    const inTire = (x, z) => TIRES.some(([tx, tz]) => Math.hypot(x - tx, z - tz) < 0.44);

    // 3. the sack race: you can only hop
    stationSign(3, 'SACK RACE', 'Hop! (jump to hop along)', -28.4);
    const sackT = canvasTexture(128, 128, (g) => {
      g.fillStyle = '#c8a26a'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = 'rgba(90,60,30,0.35)'; g.lineWidth = 1;
      for (let i = 0; i < 128; i += 4) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 128); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(128, i); g.stroke(); }
      g.fillStyle = 'rgba(180,40,40,0.8)'; g.font = `800 30px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('FARM', 64, 64);
    }).tex;
    const sackMat = new THREE.MeshLambertMaterial({ map: sackT, side: THREE.DoubleSide });
    const sackGeo = new THREE.CylinderGeometry(0.3, 0.26, 0.85, 14, 1, true);
    const makeSack = () => { const m = new THREE.Mesh(sackGeo, sackMat); m.visible = false; G.add(m); return m; };
    // bins of sacks at both ends
    for (const z of [-28.6, -45.4]) {
      addCyl(G, 0.45, 0.4, 0.7, 14, lam(0x8a5a3a), LANE - 0.6, 0.35, z);
      for (let k = 0; k < 4; k++) { const s = new THREE.Mesh(sackGeo, sackMat); s.scale.set(0.5, 0.5, 0.5); s.position.set(LANE - 0.6 + (k - 1.5) * 0.15, 0.85, z + (k % 2 ? 0.1 : -0.1)); s.rotation.z = (k - 1.5) * 0.3; G.add(s); }
    }
    for (const z of [Z.sack[0], Z.sack[1]]) addBox(G, LANE * 2, 0.012, 0.12, white, 0, 0.01, z);

    // 4. the ball pit: wade through (it's slow), the balls get pushed about
    stationSign(4, 'BALL PIT', 'Wade on through', -46.9);
    {
      const rimM = lam(0xffd23f);
      for (const z of [Z.pit[0], Z.pit[1]]) solid(-LANE, LANE, 0, 0.3, z - 0.1, z + 0.1, rimM);
      const floorP = new THREE.Mesh(new THREE.PlaneGeometry(LANE * 2, Z.pit[0] - Z.pit[1]), new THREE.MeshLambertMaterial({ color: 0x2a3a7a, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); floorP.rotation.x = -Math.PI / 2; floorP.position.set(0, 0.008, (Z.pit[0] + Z.pit[1]) / 2); G.add(floorP);
      for (const s of [-1, 1]) addBox(G, 0.14, 0.75, Z.pit[0] - Z.pit[1], lam(0x4ab0ff), s * (LANE + 0.05), 0.375, (Z.pit[0] + Z.pit[1]) / 2);
    }
    const BALL_R = 0.1, NB = 900;
    const ballHome = new Float32Array(NB * 3), ballOff = new Float32Array(NB * 3);
    const balls = new THREE.InstancedMesh(new THREE.SphereGeometry(BALL_R, 8, 6), new THREE.MeshLambertMaterial({ color: 0xffffff }), NB);
    { const cols = [0xff4a4a, 0xffd23f, 0x4ab0ff, 0x6ad04a, 0xff8ad0, 0xffa23a].map((c) => new THREE.Color(c));
      for (let i = 0; i < NB; i++) {
        ballHome[i * 3] = (rand() * 2 - 1) * (LANE - 0.12);
        ballHome[i * 3 + 1] = BALL_R + (i / NB) * 0.48 + rand() * 0.05;
        ballHome[i * 3 + 2] = Z.pit[1] + 0.2 + rand() * (Z.pit[0] - Z.pit[1] - 0.4);
        balls.setColorAt(i, cols[i % cols.length]);
      }
      balls.frustumCulled = false; G.add(balls); }
    const _bm = new THREE.Object3D();
    function updateBalls(dt, pushers) {
      let moved = false;
      const decay = Math.exp(-dt * 1.6);
      for (let i = 0; i < NB; i++) {
        const hx = ballHome[i * 3], hy = ballHome[i * 3 + 1], hz = ballHome[i * 3 + 2];
        let ox = ballOff[i * 3] * decay, oy = ballOff[i * 3 + 1] * decay, oz = ballOff[i * 3 + 2] * decay;
        for (const p of pushers) {
          const dx = hx + ox - p.x, dz = hz + oz - p.z, d = Math.hypot(dx, dz);
          if (d < 0.5 && d > 1e-4) { const k = (0.5 - d) / d; ox += dx * k * 0.5; oz += dz * k * 0.5; oy += (0.5 - d) * 0.45 + (p.up || 0) * (0.5 - d); }
        }
        if (Math.abs(ox - ballOff[i * 3]) + Math.abs(oy - ballOff[i * 3 + 1]) + Math.abs(oz - ballOff[i * 3 + 2]) > 1e-4) moved = true;
        ballOff[i * 3] = ox; ballOff[i * 3 + 1] = Math.min(oy, 0.9); ballOff[i * 3 + 2] = oz;
      }
      if (!moved && balls.userData.init) return;
      balls.userData.init = true;
      for (let i = 0; i < NB; i++) {
        _bm.position.set(clamp(ballHome[i * 3] + ballOff[i * 3], -LANE + 0.1, LANE - 0.1), ballHome[i * 3 + 1] + ballOff[i * 3 + 1], clamp(ballHome[i * 3 + 2] + ballOff[i * 3 + 2], Z.pit[1] + 0.12, Z.pit[0] - 0.12));
        _bm.updateMatrix(); balls.setMatrixAt(i, _bm.matrix);
      }
      balls.instanceMatrix.needsUpdate = true;
    }
    const inPit = (x, z) => z < Z.pit[0] - 0.1 && z > Z.pit[1] + 0.1;

    // 5. the crawl tunnel through a grassy hill: you have to get down low
    stationSign(5, 'CRAWL TUNNEL', 'Get down low!', -57.9);
    const TUN_HALF = 0.78, TUN_CEIL = 0.95;
    {
      const hillM = new THREE.MeshLambertMaterial({ map: grassT.clone() });
      hillM.map.repeat.set(4, 4); hillM.map.needsUpdate = true;
      const len = Z.tun[0] - Z.tun[1], zc = (Z.tun[0] + Z.tun[1]) / 2;
      for (const s of [-1, 1]) {
        const h = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), hillM);
        h.scale.set(1.35, 2.0, len / 2 + 0.2); h.position.set(s * (0.98 + 1.33), 0, zc); G.add(h);
        solid(s > 0 ? TUN_HALF + 0.02 : -LANE - 0.5, s > 0 ? LANE + 0.5 : -TUN_HALF - 0.02, 0, 2.1, Z.tun[1], Z.tun[0], null);
      }
      solid(-TUN_HALF - 0.1, TUN_HALF + 0.1, TUN_CEIL, 2.1, Z.tun[1], Z.tun[0], null);
      // the tube, striped, open at both ends
      const tubeT = canvasTexture(256, 64, (g) => { const c = ['#ff5a5a', '#ffd23f', '#4ab0ff', '#6ad04a']; for (let i = 0; i < 8; i++) { g.fillStyle = c[i % 4]; g.fillRect(i * 32, 0, 32, 64); } }).tex;
      tubeT.wrapS = tubeT.wrapT = THREE.RepeatWrapping; tubeT.repeat.set(1, 3);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.98, len + 0.6, 24, 1, true, Math.PI / 2, Math.PI), new THREE.MeshLambertMaterial({ map: tubeT, side: THREE.DoubleSide }));
      tube.rotation.x = Math.PI / 2; tube.position.set(0, 0.02, zc); G.add(tube);
      for (const z of [Z.tun[0] + 0.3, Z.tun[1] - 0.3]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.07, 8, 24, Math.PI), lam(0xffd23f)); r.position.set(0, 0.02, z); G.add(r); }
    }
    const tunnelZone = (x, z) => z < Z.tun[0] + 0.9 && z > Z.tun[1] - 0.4 && Math.abs(x) < TUN_HALF + 0.3;

    // 6. monkey bars over lava, between two platforms
    stationSign(6, 'MONKEY BARS', 'Don’t touch the lava!', -67.8);
    {
      const plat = lam(0x6ad04a), step = lam(0x4ab0ff);
      solid(-LANE, LANE, 0, 0.35, Z.barsStart[0], Z.barsStart[0] + 0.5, step);
      solid(-LANE, LANE, 0, PLAT_Y, Z.barsStart[1], Z.barsStart[0], plat);
      solid(-LANE, LANE, 0, PLAT_Y, Z.barsEnd[1], Z.barsEnd[0], plat);
      solid(-LANE, LANE, 0, 0.35, Z.barsEnd[1] - 0.5, Z.barsEnd[1], step);
      lavaFloor(-LANE, LANE, Z.barsStart[1], Z.barsEnd[0]);
      const steel = lam(0xff5a5a);
      for (let z = Z.bars[0]; z >= Z.bars[1] - 0.01; z -= 0.5) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.2, 8), lam(0xd8dce4)); m.rotation.z = Math.PI / 2; m.position.set(0, BAR_Y, z); G.add(m);
        HOLDS.push({ a: new V3(-0.6, BAR_Y, z), b: new V3(0.6, BAR_Y, z), r: 0.05 });
      }
      for (const s of [-1, 1]) addBox(G, 0.08, 0.08, Z.bars[0] - Z.bars[1] + 0.8, steel, s * 0.65, BAR_Y + 0.02, (Z.bars[0] + Z.bars[1]) / 2);
      for (const z of [Z.bars[0] + 0.4, Z.bars[1] - 0.4]) for (const s of [-1, 1]) addBox(G, 0.1, BAR_Y - PLAT_Y + 0.1, 0.1, steel, s * 0.65, PLAT_Y + (BAR_Y - PLAT_Y) / 2, z);
    }
    const BARS = { y: BAR_Y, z0: Z.bars[0], z1: Z.bars[1], xHalf: 0.55 };
    const overLava = (x, z) => z < Z.barsStart[1] && z > Z.barsEnd[0];

    // 7. stairs up the tower, and the big slide down to the finish
    stationSign(10, 'THE BIG SLIDE', 'Up the stairs and down you go', Z.stairs + 0.4);
    const SLIDE = { x0: -0.62, x1: 0.62, zTop: Z.tower[1], zBot: Z.slideEnd, yTop: TOWER_Y, yBot: 0.08 };
    RAMPS.push(SLIDE);
    {
      const wood = lam(0xffa23a), post = lam(0x4ab0ff);
      const n = 7;
      for (let i = 0; i < n; i++) {
        const z0 = Z.stairs - i * 0.45;
        solid(-0.8, 0.8, 0, (i + 1) * (TOWER_Y / n), z0 - 0.45, z0, wood);
      }
      for (const s of [-1, 1]) { const rail = addBox(G, 0.06, 0.06, 3.6, post, s * 0.85, TOWER_Y / 2 + 0.9, Z.stairs - 1.6); rail.rotation.x = Math.atan2(TOWER_Y, 3.15); }
      solid(-1.2, 1.2, 0, TOWER_Y, Z.tower[1], Z.tower[0], lam(0x6ad04a));
      for (const sx of [-1, 1]) for (const z of [Z.tower[0], Z.tower[1]]) addBox(G, 0.12, 2.2, 0.12, post, sx * 1.15, TOWER_Y + 1.1, z);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.2, 4), lam(0xff5a5a)); roof.rotation.y = Math.PI / 4; roof.position.set(0, TOWER_Y + 2.8, (Z.tower[0] + Z.tower[1]) / 2); G.add(roof);
      for (const s of [-1, 1]) solid(s > 0 ? 1.15 : -1.25, s > 0 ? 1.25 : -1.15, TOWER_Y, TOWER_Y + 1.0, Z.tower[1], Z.tower[0], post);
      // hedges either side of the tower and the slide, so the only way on is up the stairs and down the slide
      const hedgeT = canvasTexture(128, 128, (g) => { g.fillStyle = '#2f6a22'; g.fillRect(0, 0, 128, 128); for (let i = 0; i < 260; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(120,200,80,0.45)' : 'rgba(10,40,10,0.4)'; g.beginPath(); g.ellipse(rand() * 128, rand() * 128, 3 + rand() * 4, 2 + rand() * 3, rand() * 3, 0, Math.PI * 2); g.fill(); } }).tex;
      hedgeT.wrapS = hedgeT.wrapT = THREE.RepeatWrapping; hedgeT.repeat.set(4, 2);
      const hedge = new THREE.MeshLambertMaterial({ map: hedgeT });
      for (const s of [-1, 1]) {
        solid(s > 0 ? 1.2 : -LANE - 0.5, s > 0 ? LANE + 0.5 : -1.2, 0, 2.0, Z.tower[1], Z.tower[0] + 0.1, hedge);
        solid(s > 0 ? 0.95 : -LANE - 0.5, s > 0 ? LANE + 0.5 : -0.95, 0, 2.0, Z.slideEnd + 0.6, Z.tower[1], hedge);
      }
      // the slide, with rails
      const len = Math.hypot(SLIDE.zTop - SLIDE.zBot, SLIDE.yTop - SLIDE.yBot), ang = Math.atan2(SLIDE.yTop - SLIDE.yBot, SLIDE.zTop - SLIDE.zBot);
      const m = new THREE.Mesh(new THREE.BoxGeometry(SLIDE.x1 - SLIDE.x0, 0.12, len), lam(0xffd23f));
      m.position.set(0, (SLIDE.yTop + SLIDE.yBot) / 2 - 0.06 / Math.cos(ang), (SLIDE.zTop + SLIDE.zBot) / 2); m.rotation.x = -ang; G.add(m);
      const rampY = (z) => SLIDE.yBot + (SLIDE.yTop - SLIDE.yBot) * (z - SLIDE.zBot) / (SLIDE.zTop - SLIDE.zBot);
      for (let z = SLIDE.zBot; z < SLIDE.zTop - 0.1; z += 2) for (const sx of [-1, 1]) {
        const zl = z, zh = Math.min(z + 2, SLIDE.zTop);
        solid(sx > 0 ? SLIDE.x1 : SLIDE.x0 - 0.12, sx > 0 ? SLIDE.x1 + 0.12 : SLIDE.x0, rampY(zl) - 0.1, rampY(zh) + 0.45, zl, zh, null);
      }
      for (const sx of [-1, 1]) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.32, len), lam(0x4ab0ff));
        r.position.set(sx * (SLIDE.x1 + 0.05), (SLIDE.yTop + SLIDE.yBot) / 2 + 0.16, (SLIDE.zTop + SLIDE.zBot) / 2); r.rotation.x = -ang; G.add(r);
      }
    }
    // the finish arch
    {
      const c = lam(0xff5a5a);
      for (const s of [-1, 1]) addBox(G, 0.3, 3.4, 0.3, c, s * (LANE + 0.2), 1.7, Z.finish);
      addBox(G, LANE * 2 + 0.7, 0.4, 0.3, c, 0, 3.4, Z.finish);
      makePlate(G, 'FINISH!', 2.6, 0.5, new V3(0, 3.4, Z.finish + 0.17), 0, { bg: '#ffd23f', fg: '#c82a2a', size: 0.75 });
      const chk = canvasTexture(128, 32, (g) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { g.fillStyle = (i + j) % 2 ? '#fff' : '#222'; g.fillRect(i * 8, j * 8, 8, 8); } }).tex;
      const fl = new THREE.Mesh(new THREE.PlaneGeometry(LANE * 2, 0.5), new THREE.MeshBasicMaterial({ map: chk, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 })); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0.012, Z.finish); G.add(fl);
    }
    // checkpoints: where R (or touching lava) puts you back
    const CPS = [
      { x: 0, y: 0, z: 2, from: 99, name: 'the start' },
      { x: 0, y: 0, z: -13.6, from: Z.gate - 0.2, name: 'the tire run' },
      { x: 0, y: 0, z: -28, from: Z.tire[1] - 0.3, name: 'the sack race' },
      { x: 0, y: 0, z: -46.5, from: Z.sack[1] - 0.3, name: 'the ball pit' },
      { x: 0, y: 0, z: -57.6, from: Z.pit[1] - 0.3, name: 'the tunnel' },
      { x: 0, y: PLAT_Y, z: -69.6, from: Z.barsStart[0] - 0.2, name: 'the monkey bars' },
      { x: 0, y: 0, z: -81.0, from: Z.barsEnd[1] - 0.6, name: 'the trick shot' },
      { x: 0, y: 0, z: -89.3, from: -88.9, name: 'the bottle flip' },
      { x: 0, y: 0, z: -95.4, from: -95.0, name: 'double dutch' },
      { x: 0, y: 0, z: -101.9, from: -101.6, name: 'the big slide' },
    ];
    const HOP_START = { x: 0, y: 0, z: -2.6 };

    // ---------------------------------------------------------------- the player
    const P = {
      vel: new V3(), grounded: false, support: null, eye: 1.6, jumpPrev: false, cpIdx: 0, hang: false, hp: new V3(),
      hand: { left: { hold: null }, right: { hold: null } }, hist: [], wasHang: false, crawl: false, sack: false, duck: 0,
      headY: 1.6, headVy: 0, hopCool: 0, lit: 0, lavaT: 0, gateOpen: false, slow: 1, inPit: false, crawlHintT: 0,
      in: { fwd: 0, side: 0, jump: false, duck: false },
    };
    L.P = P;
    const bodyXZ = () => (state.mode === 'vr' ? [myHead.pos.x, myHead.pos.z] : [dolly.position.x, dolly.position.z]);
    const rampAt = (x, z) => {
      for (const r of RAMPS) if (x > r.x0 - 0.1 && x < r.x1 + 0.1 && z <= r.zTop && z >= r.zBot) return r.yBot + (r.yTop - r.yBot) * (z - r.zBot) / (r.zTop - r.zBot);
      return null;
    };
    function supportAt(bx, bz, feetY, slack) {
      let best = 0, ref = { ground: true };                       // the ground is everywhere
      for (const s of SOL) if (!s.off && bx > s.x0 - 0.1 && bx < s.x1 + 0.1 && bz > s.z0 - 0.1 && bz < s.z1 + 0.1 && s.y1 <= feetY + slack && s.y1 > best) { best = s.y1; ref = s; }
      const ry = rampAt(bx, bz);
      if (ry !== null && ry <= feetY + slack + 0.2 && ry > best) { best = ry; ref = SLIDE; }
      return best <= feetY + slack ? { y: best, ref } : null;
    }
    const bodyH = () => (P.crawl ? 0.85 : 1.6);
    function pushOut() {
      const [bx, bz] = bodyXZ(), fy = dolly.position.y + P.duck;
      for (const s of SOL) {
        if (s.off || !(s.y1 > fy + STEP && s.y0 < fy + bodyH())) continue;
        if (!(bx > s.x0 - R && bx < s.x1 + R && bz > s.z0 - R && bz < s.z1 + R)) continue;
        const dl = bx - (s.x0 - R), dr = (s.x1 + R) - bx, dn = bz - (s.z0 - R), df = (s.z1 + R) - bz, m = Math.min(dl, dr, dn, df);
        if (m === dl) dolly.position.x -= dl; else if (m === dr) dolly.position.x += dr; else if (m === dn) dolly.position.z -= dn; else dolly.position.z += df;
        if (m === dl || m === dr) P.vel.x = 0; else P.vel.z = 0;
        // bumping the tunnel roof standing up: a hint
        if (s.y0 === TUN_CEIL && performance.now() - P.crawlHintT > 3000) { P.crawlHintT = performance.now(); showToast(state.mode === 'vr' ? 'Duck down low (or hold B / Y) to crawl through' : 'Crawl! Walk into the tunnel and you’ll get down'); }
      }
      // stay in the lane
      const [cx] = bodyXZ();
      if (cx > LANE - 0.2) dolly.position.x -= cx - (LANE - 0.2);
      if (cx < -LANE + 0.2) dolly.position.x -= cx + LANE - 0.2;
    }
    const _rwd = { x: 0, z: 0 };
    function moveDirFromInput() {
      let fwd = P.in.fwd, side = P.in.side;
      const len = Math.hypot(fwd, side);
      if (len > 1) { fwd /= len; side /= len; }
      if (state.mode === 'vr') { camera.getWorldQuaternion(_cq); _fw.set(0, 0, -1).applyQuaternion(_cq); _fw.y = 0; if (_fw.lengthSq() < 1e-4) _fw.set(0, 0, -1); _fw.normalize(); _rwd.x = _fw.x * fwd - _fw.z * side; _rwd.z = _fw.z * fwd + _fw.x * side; }
      else { const yaw = state.yaw; _rwd.x = -Math.sin(yaw) * fwd + Math.cos(yaw) * side; _rwd.z = -Math.cos(yaw) * fwd - Math.sin(yaw) * side; }
      return _rwd;
    }
    function facingXZ() {
      camera.getWorldQuaternion(_cq); _fw.set(0, 0, -1).applyQuaternion(_cq); _fw.y = 0;
      if (_fw.lengthSq() < 1e-4) _fw.set(0, 0, -1);
      return _fw.normalize();
    }

    // ---------------------------------------------------------------- the race
    const RACE = { id: 0, state: 'idle', startAt: 0, botsOn: false, botsN: 0, myFinish: 0 };
    L.race = RACE;
    const BOT_DEF = [
      { name: 'Little Lily', color: '#ff8ad0', f: 0.78, hat: 3, face: 1 },
      { name: 'Speedy Sam', color: '#4ab0ff', f: 0.88, hat: 1, face: 2 },
      { name: 'Jumping Jo', color: '#ffd23f', f: 0.96, hat: 2, face: 3 },
      { name: 'Tiny Tim', color: '#8bd450', f: 0.82, hat: 0, face: 0 },
      { name: 'Bouncy Bea', color: '#ff8a4a', f: 0.9, hat: 1, face: 2 },
    ];
    // the bots' route: [x, y, z, speed getting there, how they move]
    const ROUTE = [
      [0, 0, 2, 0, 'run'], [0, 0, -3.3, 4.2, 'run'],
      [0, 0, -4, 2.6, 'hop'], [0, 0, -5, 2.6, 'hop'], [0, 0, -6, 2.6, 'hop'], [-0.5, 0, -7, 2.4, 'hop'], [0.5, 0, -7.1, 2.4, 'hop'], [0, 0, -8, 2.4, 'hop'],
      [-0.5, 0, -9, 2.4, 'hop'], [0.5, 0, -9.1, 2.4, 'hop'], [0, 0, -10, 2.4, 'hop'], [0, 0, -11, 2.4, 'hop'], [0, 0, -14.6, 4.2, 'run'],
    ];
    for (let i = 0; i < 12; i++) { const [x, z] = TIRES[i * 2 + (i % 2)]; ROUTE.push([x, 0, z, 3.0, 'hop']); }
    ROUTE.push([0, 0, -28.9, 4, 'run'], [0, 0, -45.1, 2.2, 'sack'], [0, 0, -47.4, 4, 'run'], [0, 0, -56.6, 2.0, 'wade'], [0, 0, -58.4, 4, 'run'],
      [0, 0, -67.6, 1.8, 'crawl'], [0, 0.35, -68.1, 3, 'run'], [0, PLAT_Y, -70.4, 3, 'run'], [0, PLAT_Y, -78.6, 1.7, 'bars'], [0, PLAT_Y, -79.6, 3, 'run'],
      [0, 0, -80.3, 3, 'run'], [0, 0, -82.2, 3, 'run', 2.6, 'throw'], [1.3, 0, -87.6, 3.5, 'run'], [0, 0, -91.5, 3.5, 'run', 2.8, 'flip'],
      [1.4, 0, -92.6, 3, 'run'], [0, 0, -95, 3, 'run'], [0, 0, -99.6, 3, 'run', 3.8, 'skip'], [0, 0, -102.3, 3.5, 'run'],
      [0, TOWER_Y, -105.7, 2.0, 'run'], [0, TOWER_Y, -107.5, 3, 'run'], [0, 0.1, -117, 6.5, 'slide'], [0, 0, -121.5, 4.5, 'run']);
    // ROUTE_T[i]: when a bot leaves point i (it arrives, then waits there if the point has a wait: [5] seconds doing [6])
    const ROUTE_T = [0], ARRIVE = [0];
    for (let i = 1; i < ROUTE.length; i++) { const a = ROUTE[i - 1], b = ROUTE[i]; ARRIVE.push(ROUTE_T[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / b[3]); ROUTE_T.push(ARRIVE[i] + (b[5] || 0)); }
    const FIN_I = ROUTE.findIndex((r) => r[2] <= Z.finish);
    const FIN_T = ROUTE_T[FIN_I - 1] + (ARRIVE[FIN_I] - ROUTE_T[FIN_I - 1]) * (ROUTE[FIN_I - 1][2] - Z.finish) / (ROUTE[FIN_I - 1][2] - ROUTE[FIN_I][2]);
    function routeAt(t, f, out) {
      const tt = t * f;
      if (tt <= 0) { out.set(ROUTE[0][0], ROUTE[0][1], ROUTE[0][2]); return 'stand'; }
      if (tt >= ROUTE_T[ROUTE_T.length - 1]) { const e = ROUTE[ROUTE.length - 1]; out.set(e[0], e[1], e[2]); return 'done'; }
      let i = 1; while (ROUTE_T[i] < tt) i++;
      const a = ROUTE[i - 1], b = ROUTE[i];
      if (tt > ARRIVE[i]) { out.set(b[0], b[1], b[2]); return b[6] || 'stand'; }
      const k = (tt - ROUTE_T[i - 1]) / Math.max(1e-6, ARRIVE[i] - ROUTE_T[i - 1]);
      out.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
      return b[4];
    }
    const bots = BOT_DEF.map((d) => {
      const g = buildAvatar(d.color, d.hat, d.face, true, 2, 1);
      g.scale.setScalar(0.85);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = '#fff'; c.font = `700 28px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(d.name, 128, 33, 230); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.9, 0.225, 1); tag.position.y = 0.5; g.add(tag); g.visible = false; G.add(g);
      return Object.assign({ g, sack: makeSack(), finishT: FIN_T / d.f, pos: new V3(), lane: 0 }, d);
    });
    const LANES = [-0.9, 0, 0.9, -1.8, 1.8];
    bots.forEach((b, i) => { b.bi = i; b.lane = LANES[i % LANES.length]; });
    const raceNow = () => (RACE.state === 'idle' ? 0 : Date.now() - RACE.startAt);
    const myProgress = () => { const [, bz] = bodyXZ(); return clamp(2 - bz, 0, 99.5); };
    function standings() {
      const rows = [{ name: state.name || 'You', me: true, fin: RACE.myFinish, prog: myProgress() }];
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.rk && st.rk[0] === RACE.id) rows.push({ name: rec.name, fin: st.rk[2], prog: st.rk[4] / 10 }); }
      if (RACE.botsOn) { const t = Math.max(0, raceNow()) / 1000; for (const b of bots.slice(0, RACE.botsN)) rows.push({ name: b.name, bot: true, fin: t >= b.finishT ? Math.round(b.finishT * 1000) : 0, prog: clamp(2 - routeAtZ(t, b.f), 0, 99.5) }); }
      rows.sort((a, b) => (a.fin && b.fin ? a.fin - b.fin : a.fin ? -1 : b.fin ? 1 : b.prog - a.prog));
      return rows;
    }
    const _rz = new V3();
    const routeAtZ = (t, f) => { routeAt(t, f, _rz); return _rz.z; };
    // the results board by the start
    const boardC = canvasTexture(512, 288);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.24), new THREE.MeshBasicMaterial({ map: boardC.tex }));
    board.position.set(-LANE - 0.9, 1.7, 2.6); board.rotation.y = Math.PI / 2; G.add(board);
    addBox(G, 0.08, 1.1, 0.08, lam(0xf2ead8), -LANE - 0.93, 0.55, 2.6);
    let boardKey = '';
    function drawBoard(rows) {
      const key = JSON.stringify([rows.map((r) => [r.name, r.fin, Math.round(r.prog / 5)]), RACE.state]);
      if (key === boardKey) return; boardKey = key;
      const g = boardC.g;
      g.fillStyle = '#2a3a8a'; g.fillRect(0, 0, 512, 288); g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.textAlign = 'center'; g.font = `800 34px ${DISPLAY}`; g.fillText('RECESS RUSH', 256, 28);
      rows.slice(0, 5).forEach((r, i) => {
        g.textAlign = 'left'; g.fillStyle = r.me ? '#8bff6a' : r.bot ? '#c8d0ff' : '#ffffff'; g.font = `700 30px ${BODY}`; g.fillText(`${i + 1}  ${r.name}`, 24, 78 + i * 44, 300);
        g.textAlign = 'right'; g.fillText(r.fin ? (r.fin / 1000).toFixed(1) + ' s' : (RACE.state === 'run' ? Math.round(r.prog) + '%' : '-'), 490, 78 + i * 44);
      });
      boardC.tex.needsUpdate = true;
    }
    function resetCourse() {
      for (const s of squares) { s.lit = false; s.mat.color.setHex(0xffffff); }
      P.lit = 0; P.gateOpen = false; gate.off = false; ribbon.visible = true; gateSign.userData.draw('0 / 10');
      stationsReset();
    }
    function toStart() {
      dolly.position.set((Math.random() - 0.5) * 2, 0, 2); dolly.rotation.y = 0; state.yaw = 0; state.pitch = 0;
      P.vel.set(0, 0, 0); P.hang = false; P.cpIdx = 0; P.hand.left.hold = P.hand.right.hold = null; P.sack = false; P.crawl = false; P.duck = 0;
    }
    function startRace() {
      RACE.id = Math.floor(Date.now() / 1000); RACE.startAt = Date.now() + COUNT_MS; RACE.state = 'count'; RACE.myFinish = 0;
      const others = [...remotes.values()].filter((r) => r.lv === L.idx && r.inGame).length;
      RACE.botsN = clamp(L.picker.n - 1 - others, 0, bots.length); RACE.botsOn = RACE.botsN > 0;
      resetCourse(); toStart(); boardKey = '';
      showToast(RACE.botsOn ? 'Race the playground gang! Get ready…' : 'Race! Get ready…');
      forcePresence();
    }
    function finishRace() {
      RACE.myFinish = Math.round(raceNow()); RACE.state = 'over';
      const rank = standings().findIndex((r) => r.me) + 1;
      showToast(`Finished in ${(RACE.myFinish / 1000).toFixed(1)} s! ${rank === 1 ? '1st place!' : `Place ${rank}`} \u00B7 Race again or head home just ahead`);
      sfx('fanfare', 1); setTimeout(() => sfx('cheer', 0.8), 250);
      forcePresence();
    }
    makeButton(L, new V3(2.2, 1.0, 1.4), 0x8bd450, 'START race', () => startRace(), { faceYaw: 0 });
    makeButton(L, new V3(2.2, 1.0, 3.0), 0xff7a3a, 'Back to start', () => { toStart(); showToast('Back at the start'); }, { faceYaw: 0 });
    makeKiosk(L, -LANE + 0.6, 4.2, Math.atan2(LANE - 0.6, -2.2));
    makePlayerPicker(L, { min: 1, max: 1 + BOT_DEF.length, def: 4, label: 'Racers', note: 'from the next race', x: -2.2, z: 0.9, yaw: 0 });
    // past the finish: race again, the results, the way back to the clubhouse, and a wall at the end of the lane
    {
      const FZ = Z.finish - 3.2;
      makeButton(L, new V3(1.3, 1.0, FZ), 0x8bd450, 'Race again', () => { startRace(); }, { faceYaw: 0 });
      makeKiosk(L, -1.3, FZ, 0);
      const res = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.24), new THREE.MeshBasicMaterial({ map: boardC.tex }));
      res.position.set(0, 2.5, FZ - 1.6); G.add(res);
      for (const sx of [-1, 1]) addBox(G, 0.08, 2.5, 0.08, lam(0xf2ead8), sx * 1.1, 1.25, FZ - 1.65);
      solid(-LANE - 0.5, LANE + 0.5, 0, 1.4, FZ - 2.3, FZ - 2.1, lam(0xff5a5a));
    }
    const countSign = makePlate(G, 'Press START', 2.2, 0.42, new V3(0, 2.6, -0.45), 0, { bg: '#2a3a8a', fg: '#8bff6a', size: 0.6 });

    // ---------------------------------------------------------------- holds: the monkey bars
    function nearestOnSeg(a, b, p, out) {
      _u.subVectors(b, a); const l2 = _u.lengthSq();
      const k = l2 < 1e-8 ? 0 : clamp(_t.subVectors(p, a).dot(_u) / l2, 0, 1);
      return out.copy(a).addScaledVector(_u, k);
    }
    const _np = new V3();
    function findHold(p) {
      let best = null, bd = 1e9;
      for (const h of HOLDS) { nearestOnSeg(h.a, h.b, p, _np); const d = _np.distanceTo(p); if (d < h.r + 0.14 && d < bd) { bd = d; best = h; } }
      return best;
    }
    // browser: E grabs the bars when you're under them (or on the platform at their start)
    function grabFlat() {
      const [bx, bz] = bodyXZ(), fy = dolly.position.y, up = BAR_Y - fy;
      if (!(up > 1.2 && up < 2.4 && bz < BARS.z0 + 1.6 && bz > BARS.z1 - 0.4 && Math.abs(bx) < 1.4)) return false;
      P.hang = true; P.vel.set(0, 0, 0); P.grounded = false; P.sack = false;
      P.hp.set(clamp(bx, -BARS.xHalf, BARS.xHalf), BAR_Y, clamp(bz, BARS.z1, BARS.z0));
      sfx('click', 0.8);
      return true;
    }
    function letGo() { if (!P.hang) return; P.hang = false; P.vel.set(0, 0, 0); }
    function barsHangFlat(dt) {
      const I = P.in;
      P.hp.z = clamp(P.hp.z - I.fwd * 1.9 * dt, BARS.z1, BARS.z0); P.hp.x = clamp(P.hp.x + I.side * 1.0 * dt, -BARS.xHalf, BARS.xHalf);
      dolly.position.set(P.hp.x, BAR_Y - 2.15, P.hp.z);
      // swinging along: a little creak every rung
      if (Math.floor(P.hp.z * 2) !== P.rung) { P.rung = Math.floor(P.hp.z * 2); tone(500 + rand() * 80, 0, 0.04, 'triangle', 0.06); }
      // the far end: drop onto the platform
      if (P.hp.z <= BARS.z1 + 0.01 && I.fwd > 0) { P.hang = false; dolly.position.set(P.hp.x, PLAT_Y, BARS.z1 - 0.1); P.vel.set(0, 0, 0); P.grounded = true; sfx('whoosh', 0.5); }
    }
    // VR: grip a bar and pull; let go and you carry the motion
    function vrHang(dt) {
      const deltas = [];
      for (const side of SIDES) {
        const mh = myHands[side], H = P.hand[side], gp = vrHands[side].source && vrHands[side].source.gamepad;
        const grip = !!(gp && gp.buttons && gp.buttons[1] && gp.buttons[1].pressed);
        if (!mh.ok || !grip) { H.hold = null; continue; }
        if (!H.hold) { const hold = findHold(mh.pos); if (hold) { H.hold = { hold, anchor: mh.pos.clone() }; haptic(vrHands[side], 0.5, 40); sfx('click', 0.6); } }
        if (H.hold) deltas.push(H.hold.anchor.clone().sub(mh.pos));
      }
      if (!deltas.length) return false;
      const d = new V3(); for (const x of deltas) d.add(x); d.multiplyScalar(1 / deltas.length);
      dolly.position.add(d);
      P.hist.push({ d, dt }); while (P.hist.length > 5) P.hist.shift();
      P.vel.set(0, 0, 0); P.sack = false;
      return true;
    }
    function readVR(dt) {
      const la = stickAxes(vrHands.left), ra = stickAxes(vrHands.right);
      P.in.fwd = la && Math.hypot(la[0], la[1]) > 0.15 ? -la[1] : 0; P.in.side = la && Math.hypot(la[0], la[1]) > 0.15 ? la[0] : 0;
      const gl = vrHands.left.source && vrHands.left.source.gamepad, gr = vrHands.right.source && vrHands.right.source.gamepad;
      const btn = (gp, i) => !!(gp && gp.buttons && gp.buttons[i] && gp.buttons[i].pressed);
      P.in.jump = btn(gl, 4) || btn(gr, 4);
      P.in.duck = btn(gl, 5) || btn(gr, 5);
      if (ra) {
        const x = ra[0], rh = vrHands.right;
        if (prefs.smoothTurn) { if (Math.abs(x) > 0.15) snapTurn(-Math.sign(x) * ((Math.abs(x) - 0.15) / 0.85) * 2.4 * dt); }
        else if (rh.turnArmed && Math.abs(x) > 0.7) { snapTurn(x > 0 ? -Math.PI / 6 : Math.PI / 6); rh.turnArmed = false; }
        else if (Math.abs(x) < 0.3) rh.turnArmed = true;
      }
      // a real hop: your head jumping up fast
      const hy = camera.position.y, vy = (hy - P.headY) / Math.max(dt, 1e-3);
      P.headVy = P.headVy * 0.5 + vy * 0.5; P.headY = hy;
      if (P.headVy > 1.1 && (P.sack || inCircle(myHead.pos.x, myHead.pos.z))) P.in.jump = true;
    }

    // ================================================================ stations 7-9: trick shot, bottle flip, double dutch
    // Each one has a ribbon across the lane that drops when you've done it. Your ball and bottle are yours alone
    // (nobody else sees them), so the physics are simple and local.
    const TS = { line: -82.6, can: new V3(0, 0, -87.6), CR: 0.48, CH: 0.75, R: 0.11, E: 0.72 };
    const BF = { table: -92.6, top: 0.75, half: [0.95, 0.45], gate: -94.2, tol: 0.5 };
    const DD = { c: new V3(0, 0, -99.6), r: 0.7, gate: -101.4, need: 6, T: 1.4, hand: 2.35, y: 0.95, ropeR: 0.92 };
    function ribbonGate(z, text) {
      const sol = solid(-LANE, LANE, 0, 2.2, z - 0.08, z + 0.08, null);
      const grp = new THREE.Group(); G.add(grp);
      const rm = new THREE.MeshLambertMaterial({ color: 0xff3a6a });
      for (const y of [0.55, 1.05]) addBox(grp, LANE * 2, 0.12, 0.03, rm, 0, y, z);
      for (const s of [-1, 1]) addCyl(G, 0.08, 0.08, 2.2, 8, lam(0xffd23f), s * (LANE + 0.1), 1.1, z);
      const sign = makePlate(G, text, 1.5, 0.3, new V3(-LANE + 0.95, 1.45, z + 0.03), 0, { bg: '#ff3a6a', fg: '#ffffff', size: 0.6 });
      const g = { sol, grp, sign, text, open: false };
      g.setOpen = (o, label) => { g.open = o; sol.off = o; grp.visible = !o; sign.userData.draw(label || (o ? 'GO!' : g.text)); };
      return g;
    }

    // ---------------------------------------------------------------- 7. the trick shot: bounce it into the can
    stationSign(7, 'TRICK SHOT', 'One bounce, then in the can', -80.7);
    addBox(G, LANE * 2, 0.012, 0.12, white, 0, 0.01, TS.line + 0.25);          // the throwing line
    const trickGate = ribbonGate(TS.line, 'Bounce it in!');
    {
      const canM = lam(0x3a8a5a), rimM = lam(0xd8dce4);
      const can = new THREE.Mesh(new THREE.CylinderGeometry(TS.CR, TS.CR * 0.9, TS.CH, 20, 1, true), new THREE.MeshLambertMaterial({ color: 0x3a8a5a, side: THREE.DoubleSide }));
      can.position.set(TS.can.x, TS.CH / 2, TS.can.z); G.add(can);
      const bot = new THREE.Mesh(new THREE.CircleGeometry(TS.CR * 0.9, 20), canM); bot.rotation.x = -Math.PI / 2; bot.position.set(TS.can.x, 0.02, TS.can.z); G.add(bot);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(TS.CR, 0.03, 8, 24), rimM); rim.rotation.x = Math.PI / 2; rim.position.set(TS.can.x, TS.CH, TS.can.z); G.add(rim);
      solid(TS.can.x - TS.CR, TS.can.x + TS.CR, 0, TS.CH, TS.can.z - TS.CR, TS.can.z + TS.CR, null);
      // the ball basket by the line
      addCyl(G, 0.3, 0.26, 0.5, 14, lam(0xb86a3a), 1.7, 0.25, TS.line + 1.0);
    }
    const ballM = new THREE.Mesh(new THREE.SphereGeometry(TS.R, 16, 12), new THREE.MeshLambertMaterial({ map: canvasTexture(64, 32, (g) => { g.fillStyle = '#e8453c'; g.fillRect(0, 0, 64, 32); g.fillStyle = '#ffd23f'; g.fillRect(0, 13, 64, 6); }).tex }));
    G.add(ballM);
    const RACK = new V3(1.7, 0.5 + TS.R, TS.line + 1.0);
    const TB = { st: 'rack', pos: RACK.clone(), vel: new V3(), bounces: 0, t: 0, hand: null, done: false, prevY: 0 };
    function ballToRack() { TB.st = 'rack'; TB.pos.copy(RACK); TB.vel.set(0, 0, 0); TB.bounces = 0; TB.hand = null; }
    // the browser throw: a lob aimed at the can (if you're roughly facing it), as hard as the charge says
    function trickVel(p, from, out) {
      const q = 0.6 * p, dx = TS.can.x - from.x, dz = TS.can.z - from.z, D = Math.hypot(dx, dz) || 1;
      const f = facingXZ(); let ax = f.x, az = f.z;
      if (Math.acos(clamp((ax * dx + az * dz) / D, -1, 1)) < 0.25) { ax = dx / D; az = dz / D; }
      const h = (1.6 + 3.4 * q) * (D / 5.2);
      return out.set(ax * h, 4.2 + 2.6 * q, az * h);
    }
    function throwBall(vel) {
      TB.st = 'fly'; TB.vel.copy(vel); TB.bounces = 0; TB.t = 0; TB.hand = null;
      sfx('whoosh', 0.5);
    }
    function trickStep(dt) {
      if (TB.st === 'miss-in') { TB.wait -= dt; if (TB.wait <= 0) ballToRack(); return; }
      if (TB.st === 'held' || TB.st === 'rack' || TB.st === 'in') return;
      TB.t += dt;
      const p = TB.pos, v = TB.vel, R = TS.R, n = 3, h = dt / n;
      for (let i = 0; i < n; i++) {
        const py = p.y;
        p.addScaledVector(v, h); v.y -= 9.8 * h;
        if (p.y < R) { p.y = R; if (v.y < 0) { if (v.y < -1.2) { TB.bounces++; tone(220, 140, 0.06, 'sine', 0.2); } v.y = -v.y * TS.E; v.x *= 0.88; v.z *= 0.88; } }
        if (Math.abs(p.x) > LANE - R) { p.x = Math.sign(p.x) * (LANE - R); v.x *= -0.6; }
        const dx = p.x - TS.can.x, dz = p.z - TS.can.z, d = Math.hypot(dx, dz);
        // in: dropping through the top, inside the rim
        if (py > TS.CH && p.y <= TS.CH && d < TS.CR - R * 0.5) {
          if (TB.bounces > 0) { TB.st = 'in'; p.set(TS.can.x + dx * 0.5, 0.3, TS.can.z + dz * 0.5); trickMade(); return; }
          showToast('In! But it has to bounce first. Try again'); sfx('click', 0.5);
          TB.st = 'miss-in'; p.set(TS.can.x, 0.3, TS.can.z); TB.wait = 1.2; return;
        }
        // the can's side (and the rim from outside)
        if (p.y < TS.CH + R * 0.3 && d < TS.CR + R && d > TS.CR - R) {
          const nx = dx / (d || 1), nz = dz / (d || 1), vn = v.x * nx + v.z * nz;
          p.x = TS.can.x + nx * (TS.CR + R); p.z = TS.can.z + nz * (TS.CR + R);
          if (vn < 0) { v.x -= 1.6 * vn * nx; v.z -= 1.6 * vn * nz; if (-vn > 1) tone(500, 300, 0.05, 'triangle', 0.12); }
        }
      }
      // stopped, or gone: back to the basket
      const slow = v.length() < 0.4 && p.y < R + 0.02;
      if (slow || TB.t > 6 || p.z > TS.line + 2.5 || p.z < BF.table) ballToRack();
    }
    function trickMade() {
      TB.done = true; trickGate.setOpen(true);
      sfx('chime', 0.9); sfx('cheer', 0.5); showToast('Trick shot! One bounce and in');
      for (const s of SIDES) haptic(vrHands[s], 0.6, 120);
    }

    // ---------------------------------------------------------------- 8. the bottle flip: land it standing up on the table
    stationSign(8, 'BOTTLE FLIP', 'Land it standing on the table', -89.0);
    const flipGate = ribbonGate(BF.gate, 'Land the flip!');
    {
      const wood = lam(0xc8864a), leg = lam(0x7a5a3a);
      solid(-BF.half[0], BF.half[0], BF.top - 0.06, BF.top, BF.table - BF.half[1], BF.table + BF.half[1], wood);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) addBox(G, 0.07, BF.top - 0.06, 0.07, leg, sx * (BF.half[0] - 0.1), (BF.top - 0.06) / 2, BF.table + sz * (BF.half[1] - 0.1));
      // the table's legs and skirt block you walking through it
      solid(-BF.half[0], BF.half[0], 0, BF.top - 0.06, BF.table - BF.half[1], BF.table + BF.half[1], null);
      // a target spot on the table
      const spot = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.14, 24), new THREE.MeshBasicMaterial({ color: 0xffd23f })); spot.rotation.x = -Math.PI / 2; spot.position.set(0, BF.top + 0.003, BF.table); G.add(spot);
    }
    const bottle = new THREE.Group();
    {
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.038, 0.2, 14), new THREE.MeshLambertMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.55 }));
      const water = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.034, 0.07, 14), lam(0x3a9ae8)); water.position.y = -0.06;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.04, 10), lam(0x2a6ad0)); cap.position.y = 0.12;
      const label = new THREE.Mesh(new THREE.CylinderGeometry(0.0375, 0.0385, 0.06, 14, 1, true), lam(0xff5a5a)); label.position.y = 0.02;
      body.position.y = 0; bottle.add(body, water, cap, label);
    }
    G.add(bottle);
    const BH = 0.11;                                        // half the bottle's height (its centre sits this high when standing)
    const BHOME = new V3(0, BF.top + BH, BF.table + BF.half[1] - 0.15);
    const BT = { st: 'table', pos: BHOME.clone(), vel: new V3(), ang: 0, w: 0, t: 0, back: 0, hand: null, done: false };
    function bottleHome() { BT.st = 'table'; BT.pos.copy(BHOME); BT.vel.set(0, 0, 0); BT.ang = 0; BT.w = 0; BT.hand = null; }
    // the browser flip: from your hand, straight up and over toward the middle of the table; the charge sets how
    // high and how fast it turns. About half is right.
    function flipFrom(p, from) {
      const vy = 2.2 + 1.8 * p, w = 6 + 5 * p;
      const t = (vy + Math.sqrt(vy * vy + 2 * 9.8 * Math.max(0, from.y - (BF.top + BH)))) / 9.8;
      return { vel: new V3((0 - from.x) / t, vy, (BF.table - from.z) / t), w };
    }
    function flipBottle(vel, w) { BT.st = 'fly'; BT.vel.copy(vel); BT.w = w; BT.ang = 0; BT.t = 0; BT.hand = null; sfx('whoosh', 0.4); }
    const angOff = (a) => { const k = ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2); return Math.min(k, Math.PI * 2 - k); };
    function flipStep(dt) {
      if (BT.st === 'fly') {
        BT.t += dt;
        BT.pos.addScaledVector(BT.vel, dt); BT.vel.y -= 9.8 * dt; BT.ang += BT.w * dt;
        const onTable = Math.abs(BT.pos.x) < BF.half[0] && Math.abs(BT.pos.z - BF.table) < BF.half[1];
        const floorY = onTable ? BF.top : 0;
        if (BT.vel.y < 0 && BT.pos.y <= floorY + BH) {
          if (onTable && angOff(BT.ang) < BF.tol) {
            BT.st = 'stood'; BT.pos.y = BF.top + BH; BT.ang = 0;
            if (!BT.done) { BT.done = true; flipGate.setOpen(true); sfx('chime', 0.9); sfx('cheer', 0.6); showToast('Bottle flip! It landed standing up'); for (const s of SIDES) haptic(vrHands[s], 0.6, 120); }
          } else {
            const turned = BT.ang;
            BT.st = 'fallen'; BT.pos.y = floorY + 0.04; BT.ang = Math.PI / 2; BT.wait = 1.3;
            tone(180, 120, 0.08, 'sine', 0.2);
            showToast(!onTable ? 'Missed the table!' : turned < Math.PI * 2 - BF.tol ? 'Not enough flip: a little more power' : turned < Math.PI * 4 - BF.tol ? 'Too much flip: a little less power' : 'Wild! Try a gentler flip');
          }
        }
        if (BT.t > 4) bottleHome();
      } else if (BT.st === 'fallen') { BT.wait -= dt; if (BT.wait <= 0) bottleHome(); }
    }

    // ---------------------------------------------------------------- 9. double dutch: jump the ropes six times
    stationSign(9, 'DOUBLE DUTCH', 'Stand in the circle, jump 6', -95.6);
    const ddGate = ribbonGate(DD.gate, 'Jump 6 ropes!');
    {
      const ring = new THREE.Mesh(new THREE.RingGeometry(DD.r - 0.06, DD.r, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(DD.c.x, 0.012, DD.c.z); G.add(ring);
    }
    // the two kids turning the ropes
    const turners = [-1, 1].map((s, i) => {
      const g = buildAvatar(i ? '#ff8ad0' : '#8bd450', i ? 2 : 0, i + 1, true, i + 2, i ? 3 : 5);
      g.scale.setScalar(0.85); g.position.set(s * (DD.hand + 0.35), 1.3, DD.c.z); g.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2; G.add(g);
      return g;
    });
    const ROPE_N = 18, ropeMat = [lam(0xffd23f), lam(0x4ab0ff)];
    const ropeGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 6); ropeGeo.rotateX(Math.PI / 2); ropeGeo.translate(0, 0, 0.5);
    const ropes = [0, 1].map((k) => { const segs = []; for (let i = 0; i < ROPE_N; i++) { const m = new THREE.Mesh(ropeGeo, ropeMat[k]); G.add(m); segs.push(m); } return segs; });
    const DDS = { t: 0, k: -1, clears: 0, pause: 0, done: false };
    const _r0 = new V3(), _r1 = new V3();
    function ropePoint(k, s, ph, out) {
      const r = DD.ropeR * Math.sin(Math.PI * s), a = k ? -ph + Math.PI : ph;
      return out.set(-DD.hand + 2 * DD.hand * s, Math.max(0.02, DD.y + r * Math.cos(a)), DD.c.z + (k ? 0.04 : -0.04) + r * Math.sin(a));
    }
    function drawRopes() {
      const ph = (2 * Math.PI * DDS.t) / DD.T;
      for (let k = 0; k < 2; k++) for (let i = 0; i < ROPE_N; i++) {
        ropePoint(k, i / ROPE_N, ph, _r0); ropePoint(k, (i + 1) / ROPE_N, ph, _r1);
        const m = ropes[k][i]; m.position.copy(_r0); m.lookAt(_r1); m.scale.set(1, 1, _r0.distanceTo(_r1));
      }
      turners.forEach((g, i) => { g.rotation.z = Math.sin(ph + i * Math.PI) * 0.08; });
    }
    const inCircle = (x, z) => Math.hypot(x - DD.c.x, z - DD.c.z) < DD.r;
    function ddStep(dt, now) {
      if (DDS.pause > 0) { DDS.pause -= dt; drawRopes(); return; }
      DDS.t += dt;
      // every half turn one of the two ropes sweeps along the ground
      const k = Math.floor((2 * DDS.t) / DD.T);
      if (k !== DDS.k) {
        const first = DDS.k < 0;
        DDS.k = k;
        if (!first) {
          const [bx, bz] = bodyXZ();
          if (Math.abs(bz - DD.c.z) < 8) tone(330, 260, 0.04, 'triangle', 0.1);
          if (!DDS.done && inCircle(bx, bz)) {
            if (dolly.position.y + P.duck > 0.06) {
              DDS.clears += 1; tone(600 + DDS.clears * 60, 0, 0.08, 'sine', 0.16);
              ddGate.sign.userData.draw(`${DDS.clears} / ${DD.need}`);
              if (DDS.clears >= DD.need) { DDS.done = true; ddGate.setOpen(true); sfx('chime', 0.9); sfx('cheer', 0.6); showToast('Double dutch! Six in a row'); }
            } else {
              // caught by the rope: start the count again
              if (DDS.clears > 0 || !DDS.warned) showToast(DDS.clears ? `Tripped at ${DDS.clears}! Jump as the rope comes under you` : 'Jump as the rope swings under your feet');
              DDS.warned = true; DDS.clears = 0; DDS.pause = 0.7;
              ddGate.sign.userData.draw(`0 / ${DD.need}`);
              sfx('thump', 0.5); for (const s of SIDES) haptic(vrHands[s], 0.5, 80);
            }
          }
        }
      }
      drawRopes();
    }
    // when the next rope reaches the ground (for the tests' autopilot)
    const ddNext = () => (DD.T / 2) * (Math.floor((2 * DDS.t) / DD.T) + 1) - DDS.t;

    // ---------------------------------------------------------------- holding: the ball and the bottle
    // In a browser you pick them up just by walking up (the ball behind the line, the bottle at the table), and
    // hold Space for power. In VR you grip them and throw (or flip with a flick of the wrist) for real.
    const STN = { charge: 0, holding: '', qPrev: [new Q4(), new Q4()], spin: [0, 0], marker: null };
    const inTrick = (bx, bz) => !TB.done && bz > TS.line && bz < TS.line + 2.4;
    const atTable = (bx, bz) => !BT.done && bz > BF.table + BF.half[1] - 0.1 && bz < BF.table + BF.half[1] + 1.4 && Math.abs(bx) < BF.half[0] + 0.6;
    const _hp2 = new V3(), _hv2 = new V3();
    function holdPos(out) {
      if (state.mode === 'vr') return out;
      camera.getWorldQuaternion(_cq); camera.getWorldPosition(_cp);
      return out.set(0.26, -0.34, -0.6).applyQuaternion(_cq).add(_cp);
    }
    function stationsInput(dt) {
      const [bx, bz] = bodyXZ(), vr = state.mode === 'vr';
      if (!vr) {
        // pick up by walking up
        if (!STN.holding && inTrick(bx, bz) && TB.st === 'rack') { STN.holding = 'ball'; TB.st = 'held'; }
        if (!STN.holding && atTable(bx, bz) && BT.st === 'table') { STN.holding = 'bottle'; BT.st = 'held'; }
        if (STN.holding === 'ball' && !inTrick(bx, bz)) { STN.holding = ''; ballToRack(); }
        if (STN.holding === 'bottle' && !atTable(bx, bz)) { STN.holding = ''; bottleHome(); }
        if (!STN.holding) { STN.charge = 0; return false; }
        // Space: charge, then let go to throw or flip
        if (P.in.jump) STN.charge = Math.min(1.2, STN.charge + dt);
        else if (STN.charge > 0) {
          const p = Math.min(1, STN.charge / 1.0); STN.charge = 0;
          holdPos(_hp2);
          // (from a set height, so the same charge always does the same thing)
          if (STN.holding === 'ball') { _hp2.y = 1.3; TB.pos.copy(_hp2); throwBall(trickVel(p, _hp2, new V3())); }
          else { _hp2.y = 1.15; BT.pos.copy(_hp2); const f = flipFrom(p, _hp2); flipBottle(f.vel, f.w); }
          STN.holding = '';
        }
        return true;     // (Space charges instead of jumping while you hold something)
      }
      // VR: grip near the ball or bottle to pick it up; let go to throw
      let busy = false;
      for (let si = 0; si < 2; si++) {
        const side = SIDES[si], mh = myHands[side], gp = vrHands[side].source && vrHands[side].source.gamepad;
        const grip = !!(gp && gp.buttons && gp.buttons[1] && gp.buttons[1].pressed);
        if (!mh.ok) continue;
        // how fast the hand is turning (for the bottle's spin)
        const dq = Math.abs(STN.qPrev[si].dot(mh.quat));
        const ang = 2 * Math.acos(Math.min(1, dq)) / Math.max(dt, 1e-3);
        STN.spin[si] = STN.spin[si] * 0.6 + ang * 0.4; STN.qPrev[si].copy(mh.quat);
        if (grip && !STN.holding) {
          if ((TB.st === 'rack' || (TB.st === 'fly' && TB.pos.y < 0.3)) && !TB.done && mh.pos.distanceTo(TB.pos) < 0.22) { STN.holding = 'ball'; STN.hand = side; TB.st = 'held'; haptic(vrHands[side], 0.4, 30); }
          else if ((BT.st === 'table' || BT.st === 'fallen') && !BT.done && mh.pos.distanceTo(BT.pos) < 0.2) { STN.holding = 'bottle'; STN.hand = side; BT.st = 'held'; haptic(vrHands[side], 0.4, 30); }
        }
        if (STN.holding && STN.hand === side) {
          busy = true;
          if (STN.holding === 'ball') TB.pos.copy(mh.pos); else BT.pos.copy(mh.pos);
          if (!grip) {
            handVelocity(vrHands[side], _hv2);
            if (STN.holding === 'ball') { if (_hv2.length() > 1.2) throwBall(_hv2.clone().multiplyScalar(1.1)); else ballToRack(); }
            else { if (_hv2.y > 0.6) flipBottle(_hv2.clone(), clamp(STN.spin[si], 0, 25)); else bottleHome(); }
            STN.holding = '';
          }
        }
      }
      return busy;
    }
    function stationsStep(dt, now) {
      trickStep(dt); flipStep(dt); ddStep(dt, now);
    }
    function stationsDraw() {
      if (STN.holding && state.mode !== 'vr') holdPos(STN.holding === 'ball' ? TB.pos : BT.pos);
      ballM.position.copy(TB.pos);
      if (TB.st === 'fly') { ballM.rotation.x += 0.2; ballM.rotation.z += 0.13; }
      bottle.position.copy(BT.pos); bottle.rotation.set(BT.ang, 0, 0);
      // the power meter (browser), with the sweet spot marked
      if (state.mode === 'flat' && ui.power) {
        const on = STN.holding && STN.charge > 0;
        if (!STN.marker) { STN.marker = document.createElement('div'); Object.assign(STN.marker.style, { position: 'absolute', top: '-3px', bottom: '-3px', width: '8%', background: 'rgba(139,255,106,0.45)', border: '2px solid #8bff6a', borderRadius: '4px', pointerEvents: 'none' }); ui.power.style.position = ui.power.style.position || 'relative'; ui.power.appendChild(STN.marker); }
        if (on) { ui.power.hidden = false; ui.powerFill.style.width = `${Math.round(Math.min(1, STN.charge / 1.0) * 100)}%`; STN.marker.style.display = 'block'; STN.marker.style.left = `${Math.round((STN.holding === 'ball' ? SWEET.ball : SWEET.bottle) * 100 - 4)}%`; }
        else if (STN.wasOn) { ui.power.hidden = true; STN.marker.style.display = 'none'; }
        STN.wasOn = on;
      }
    }
    function stationsReset() {
      TB.done = false; ballToRack(); trickGate.setOpen(false);
      BT.done = false; bottleHome(); flipGate.setOpen(false);
      DDS.done = false; DDS.clears = 0; ddGate.setOpen(false); ddGate.sign.userData.draw(ddGate.text);
      STN.holding = ''; STN.charge = 0;
    }
    // where the browser charge lands best (worked out once by trying every charge, from a typical spot)
    const SWEET = (() => {
      const best = (f) => { let lo = -1, hi = -1; for (let p = 0; p <= 1.0001; p += 0.01) { if (f(p)) { if (lo < 0) lo = p; hi = p; } } return lo < 0 ? 0.5 : (lo + hi) / 2; };
      const ballIn = (p) => {
        const from = new V3(0.15, 1.3, TS.line + 0.45), v = new V3();
        const q = 0.6 * p, D = Math.hypot(TS.can.x - from.x, TS.can.z - from.z), h = (1.6 + 3.4 * q) * (D / 5.2);
        v.set((TS.can.x - from.x) / D * h, 4.2 + 2.6 * q, (TS.can.z - from.z) / D * h);
        const pos = from.clone(); let bounces = 0;
        for (let i = 0; i < 1200; i++) {
          const dt = 1 / 240, py = pos.y; pos.addScaledVector(v, dt); v.y -= 9.8 * dt;
          if (pos.y < TS.R) { pos.y = TS.R; if (v.y < 0) { if (v.y < -1.2) bounces++; v.y = -v.y * TS.E; v.x *= 0.88; v.z *= 0.88; } }
          const d = Math.hypot(pos.x - TS.can.x, pos.z - TS.can.z);
          if (py > TS.CH && pos.y <= TS.CH && d < TS.CR - TS.R * 0.5) return bounces > 0;
          if (pos.y < TS.CH && d < TS.CR + TS.R) return false;
        }
        return false;
      };
      const flipIn = (p) => { const from = new V3(0, 1.15, BF.table + BF.half[1] + 0.35), f = flipFrom(p, from); const t = (f.vel.y + Math.sqrt(f.vel.y * f.vel.y + 2 * 9.8 * (from.y - BF.top - BH))) / 9.8; return angOff(f.w * t) < BF.tol; };
      return { ball: best(ballIn), bottle: best(flipIn) };
    })();

    // ---------------------------------------------------------------- one step of the player
    function backTo(c, why) {
      dolly.position.set(c.x + (Math.random() - 0.5) * 0.6, c.y, c.z); dolly.rotation.y = 0; state.yaw = 0;
      P.vel.set(0, 0, 0); P.hang = false; P.hand.left.hold = P.hand.right.hold = null; P.grounded = true; P.duck = 0;
      if (why) showToast(why);
    }
    function respawn() { const c = CPS[P.cpIdx]; backTo(c, `Back to ${c.name}`); sfx('poof', 0.5); }
    function lava(where) {
      P.lavaN = (P.lavaN || 0) + 1;
      sfx('poof', 0.8); tone(200, 90, 0.3, 'sawtooth', 0.15);
      for (const s of SIDES) haptic(vrHands[s], 0.8, 120);
      if (ui.hurt && state.mode === 'flat') { ui.hurt.style.opacity = '0.4'; setTimeout(() => { ui.hurt.style.opacity = '0'; }, 350); }
      backTo(where, 'Hot hot hot! You touched the lava');
    }
    function step(dt) {
      dt = Math.min(dt, 1 / 30);
      const vr = state.mode === 'vr';
      // undo last frame's duck before any physics (the duck only moves the view)
      dolly.position.y += P.duck; P.duck = 0;
      if (vr) readVR(dt);
      if (RACE.state === 'count') { P.vel.set(0, 0, 0); P.jumpPrev = P.in.jump; return; }
      const busy = stationsInput(dt);
      const jumpEdge = !busy && P.in.jump && !P.jumpPrev; P.jumpPrev = P.in.jump;
      if (P.hopCool > 0) P.hopCool -= dt;
      const [bx0, bz0] = bodyXZ();
      // where you are decides how you move
      P.sack = !P.hang && bz0 < Z.sack[0] && bz0 > Z.sack[1];
      const inTun = tunnelZone(bx0, bz0);
      P.crawl = inTun && (!vr || camera.position.y < 1.15 || P.in.duck);
      P.inPit = inPit(bx0, bz0) && dolly.position.y < 0.35;
      const mud = bz0 < Z.tire[0] && bz0 > Z.tire[1] && !inTire(bx0, bz0);
      // hanging on the bars
      let hanging = false;
      if (vr) hanging = vrHang(dt);
      else if (P.hang) { if (jumpEdge) letGo(); else { barsHangFlat(dt); hanging = P.hang; } }
      if (hanging) { P.wasHang = true; P.grounded = false; pushOut(); }
      else {
        if (P.wasHang) {
          P.wasHang = false;
          if (vr && P.hist.length) { let sx = 0, sy = 0, sz = 0, st = 0; for (const h of P.hist) { sx += h.d.x; sy += h.d.y; sz += h.d.z; st += h.dt; } const f = 1 / Math.max(st, 0.02); P.vel.set(sx * f, sy * f, sz * f); const sp = P.vel.length(); if (sp > 8) P.vel.multiplyScalar(8 / sp); }
          P.hist.length = 0;
        }
        const dir = moveDirFromInput();
        const onRamp = P.grounded && P.support && P.support.ref === SLIDE;
        let spd = RUN;
        if (P.crawl) spd *= 0.38; else if (P.inPit) spd *= 0.5; else if (mud) spd *= 0.35;
        P.slow = spd / RUN;
        if (P.grounded) {
          if (onRamp) {
            const sl = (SLIDE.yTop - SLIDE.yBot) / (SLIDE.zTop - SLIDE.zBot), a = GRAV * sl / Math.sqrt(1 + sl * sl) * 0.9;
            P.vel.z -= a * dt; P.vel.x += dir.x * 4 * dt;
            const f = Math.max(0, 1 - 0.15 * dt); P.vel.x *= f; P.vel.z *= f;
            const sp = Math.hypot(P.vel.x, P.vel.z); if (sp > 11) { P.vel.x *= 11 / sp; P.vel.z *= 11 / sp; }
            if (!P.wasSliding) { P.wasSliding = true; sfx('whoosh', 0.7); }
          } else if (P.sack) {
            // in a sack: you shuffle, or you hop
            const k = 1 - Math.exp(-dt * 10);
            P.vel.x += (dir.x * RUN * 0.12 - P.vel.x) * k; P.vel.z += (dir.z * RUN * 0.12 - P.vel.z) * k;
            if (jumpEdge && P.hopCool <= 0) {
              let hx = dir.x, hz = dir.z;
              if (Math.hypot(hx, hz) < 0.2) { const f = facingXZ(); hx = f.x; hz = f.z; }
              const l = Math.hypot(hx, hz) || 1;
              P.vel.set(hx / l * 3.4, 4.0, hz / l * 3.4); P.grounded = false; P.support = null; P.hopCool = 0.12;
              tone(260, 180, 0.06, 'sine', 0.12);
            }
          } else {
            P.wasSliding = false;
            const k = 1 - Math.exp(-dt * 14);
            P.vel.x += (dir.x * spd - P.vel.x) * k; P.vel.z += (dir.z * spd - P.vel.z) * k;
            if (jumpEdge && !P.crawl) { P.vel.y = inCircle(bx0, bz0) ? 3.4 : P.inPit ? JUMP_V * 0.7 : mud ? JUMP_V * 0.75 : JUMP_V; P.grounded = false; P.support = null; sfx('whoosh', 0.35); }
          }
        } else if (!P.sack) {
          const k = 1 - Math.exp(-dt * 2);
          P.vel.x += (dir.x * spd - P.vel.x) * k * 0.6; P.vel.z += (dir.z * spd - P.vel.z) * k * 0.6;
        }
        const wasGrounded = P.grounded;
        if (!(P.grounded && onRamp)) P.vel.y -= GRAV * dt;
        for (let i = 0; i < 2; i++) {
          dolly.position.x += P.vel.x * dt / 2; dolly.position.z += P.vel.z * dt / 2; dolly.position.y += P.vel.y * dt / 2;
          pushOut();
          const [bx, bz] = bodyXZ(), fy = dolly.position.y;
          const sup = supportAt(bx, bz, fy, (wasGrounded || P.grounded || P.vel.y <= 0) ? STEP : Math.max(0.06, -P.vel.y * dt / 2 + 0.06));
          if (sup && P.vel.y <= 0.001 && fy <= sup.y + 0.03) {
            if (!P.grounded && P.vel.y < -3) { sfx(P.inPit ? 'ball' : 'thump', 0.4); haptic(vrHands.left, 0.3, 40); haptic(vrHands.right, 0.3, 40); if (P.sack) P.vel.x *= 0.2, P.vel.z *= 0.2; }
            dolly.position.y = sup.y; P.grounded = true; P.support = sup;
            if (sup.ref === SLIDE) { const sl = (SLIDE.yTop - SLIDE.yBot) / (SLIDE.zTop - SLIDE.zBot); P.vel.y = sl * P.vel.z; } else P.vel.y = 0;
          } else if (!sup || fy > sup.y + 0.06) { P.grounded = false; P.support = null; }
        }
      }
      const [bx, bz] = bodyXZ(), fy = dolly.position.y;
      // hopscotch: light the squares; the lava between them sends you back
      if (P.grounded && fy < 0.05 && bz < Z.hop[0] && bz > Z.hop[1]) {
        const sq = onSquare(bx, bz);
        if (sq && !sq.lit) {
          sq.lit = true; sq.mat.color.setHex(0x8bff6a); P.lit += 1;
          tone(520 + sq.n * 60, 0, 0.12, 'sine', 0.18);
          gateSign.userData.draw(`${P.lit} / 10`);
          if (P.lit === 10) { P.gateOpen = true; gate.off = true; ribbon.visible = false; gateSign.userData.draw('GO!'); sfx('chime', 0.8); showToast('All ten! The ribbon’s down'); }
        } else if (!sq) lava(HOP_START);
      }
      if (!P.gateOpen && bz < Z.hop[1] && bz > Z.gate && P.grounded && fy < 0.05 && performance.now() - (P.gateHintT || 0) > 2500) {
        P.gateHintT = performance.now(); showToast(`Light all ten squares to open the ribbon (${P.lit} / 10)`);
      }
      // the lava under the monkey bars
      if (!hanging && P.grounded && fy < 0.05 && overLava(bx, bz)) lava(CPS[5]);
      // checkpoints (furthest one you've passed, standing on the ground)
      if (P.grounded) for (let i = P.cpIdx + 1; i < CPS.length; i++) if (bz < CPS[i].from && bz > CPS[i].from - 2.5) { P.cpIdx = i; sfx('chime', 0.4); }
      if (fy < -3) respawn();
      stationsStep(dt, performance.now());
      if (RACE.state === 'run' && bz < Z.finish) finishRace();
      // VR: duck the view for a seated crawler holding B / Y
      if (vr && P.crawl && P.in.duck && camera.position.y > 0.75) { P.duck = camera.position.y - 0.7; dolly.position.y -= P.duck; }
    }

    // ---------------------------------------------------------------- per frame
    const hudPlate = makePlate(camera, 'Ready', 0.5, 0.1, new V3(0, -0.2, -0.6), 0, { bg: '#2a3a8a', fg: '#ffffff', size: 0.55 });
    hudPlate.material.depthTest = false; hudPlate.renderOrder = 999; hudPlate.visible = false;
    const mySack = makeSack();
    const remoteSacks = new Map();
    let hudKey = '', lastCount = -1;
    function hudText() {
      const parts = [];
      if (RACE.state === 'run') parts.push(`${(raceNow() / 1000).toFixed(1)} s`);
      else if (RACE.state === 'over') parts.push(`Done ${(RACE.myFinish / 1000).toFixed(1)} s`);
      if (RACE.state === 'run' || RACE.state === 'over') { const rows = standings(); parts.push(`Place ${rows.findIndex((r) => r.me) + 1}/${rows.length}`); }
      const [, bz] = bodyXZ();
      if (bz < Z.hop[0] + 0.6 && bz > Z.gate) parts.push(`Squares ${P.lit}/10`);
      else if (P.sack) parts.push(state.mode === 'vr' ? 'Hop! (jump, or press A / X)' : 'Hop! (Space)');
      else if (P.crawl) parts.push('Crawling');
      else if (P.hang) parts.push('W to swing along');
      else if (P.inPit) parts.push('Wading');
      else if (P.slow < 0.5 && bz < Z.tire[0]) parts.push('Muddy! Step in the tires');
      else if (inTrick(0, bz)) parts.push(state.mode === 'vr' ? 'Grab the ball: one bounce, then in the can' : 'One bounce into the can: hold Space for power');
      else if (atTable(0, bz)) parts.push(state.mode === 'vr' ? 'Grab the bottle and flip it onto the table' : 'Flip it onto the table: hold Space for power');
      else if (!DDS.done && Math.abs(bz - DD.c.z) < 2.2) parts.push(`Double dutch ${DDS.clears} / ${DD.need}: jump as each rope comes under you`);
      return parts.join('  ·  ') || 'Recess Rush';
    }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (RACE.state === 'count') {
        const left = RACE.startAt - Date.now(), n = Math.ceil(left / 1000);
        if (left <= 0) { RACE.state = 'run'; countSign.userData.draw('GO!'); sfx('whistle', 1); showToast('GO!'); }
        else if (n !== lastCount) { lastCount = n; countSign.userData.draw(String(n)); tone(660, 660, 0.15, 'square', 0.15); }
      } else if (RACE.state === 'run' && raceNow() > 4000) { if (countSign.userData.text !== 'RACE ON') { countSign.userData.text = 'RACE ON'; countSign.userData.draw('RACE ON'); } }
      else if (RACE.state === 'idle' && countSign.userData.text !== 'Press START') { countSign.userData.text = 'Press START'; countSign.userData.draw('Press START'); }
      if (here && !L.paused) step(dt);
      // the lava shimmers
      for (const m of lavaMats) { m.emissive.setRGB(0.25 + 0.08 * Math.sin(now * 0.004), 0.06, 0); if (m.map) m.map.offset.y = (now * 0.00003) % 1; }
      // bots
      const pushers = [];
      for (const b of bots) {
        b.g.visible = here && RACE.botsOn && b.bi < RACE.botsN && (RACE.state === 'count' || RACE.state === 'run' || RACE.state === 'over');
        b.sack.visible = false;
        if (!b.g.visible) continue;
        const t = Math.max(0, raceNow()) / 1000, mode = routeAt(t, b.f, b.pos);
        const x = clamp(b.pos.x + (mode === 'run' || mode === 'wade' || mode === 'sack' ? b.lane : mode === 'stand' || mode === 'done' ? b.lane * 1.4 : 0), -LANE + 0.3, LANE - 0.3);
        const ph = t * 7 + b.f * 10;
        let y = b.pos.y + 1.3, tilt = 0;
        if (mode === 'run') y += Math.abs(Math.sin(ph)) * 0.06;
        else if (mode === 'hop') y += Math.abs(Math.sin(ph * 0.8)) * 0.3;
        else if (mode === 'sack') { y += Math.abs(Math.sin(ph * 0.75)) * 0.4; b.sack.visible = true; b.sack.position.set(x, y - 1.05, b.pos.z); }
        else if (mode === 'wade') y += Math.sin(ph) * 0.04;
        else if (mode === 'skip') y += Math.abs(Math.sin(ph * 1.6)) * 0.32;
        else if (mode === 'throw' || mode === 'flip') y += Math.max(0, Math.sin(ph * 0.9)) * 0.05;
        else if (mode === 'crawl') { y = 0.5; tilt = 0.9; }
        else if (mode === 'bars') { y = BAR_Y - 0.55 + Math.sin(ph) * 0.04; }
        else if (mode === 'slide') { y = b.pos.y + 0.8; tilt = -0.4; }
        b.g.position.set(x, y, b.pos.z); b.g.rotation.set(tilt, 0, 0);
        if (mode === 'wade') pushers.push({ x, z: b.pos.z });
      }
      // you, in your sack (seen by you looking down, or in a browser)
      const [bx, bz] = bodyXZ();
      mySack.visible = here && P.sack;
      if (mySack.visible) mySack.position.set(bx, dolly.position.y + P.duck + 0.42, bz);
      if (here) stationsDraw();
      if (here && P.inPit) pushers.push({ x: bx, z: bz, up: P.grounded ? 0 : 0.4 });
      // other players: their sacks, and the balls they push
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id], on = rec.lv === L.idx && rec.hasH && st && st.rk && (st.rk[6] & 1);
        let s = remoteSacks.get(rec.peer);
        if (on && !s) { s = makeSack(); remoteSacks.set(rec.peer, s); }
        if (s) { s.visible = !!on && here; if (s.visible) s.position.set(rec.cur.h.pos.x, Math.max(0, rec.cur.h.pos.y - 1.5) + 0.42, rec.cur.h.pos.z); }
        if (here && rec.lv === L.idx && rec.hasH && inPit(rec.cur.h.pos.x, rec.cur.h.pos.z)) pushers.push({ x: rec.cur.h.pos.x, z: rec.cur.h.pos.z });
      }
      if (here) updateBalls(Math.min(dt, 0.05), pushers);
      if (here) {
        drawBoard(standings());
        const txt = hudText();
        if (state.mode === 'vr') { hudPlate.visible = true; if (txt !== hudKey) { hudKey = txt; hudPlate.userData.draw(txt); } }
        else { hudPlate.visible = false; if (ui.status) { ui.status.hidden = false; if (txt !== hudKey) { hudKey = txt; ui.status.textContent = txt; } } }
      } else hudPlate.visible = false;
    };
    L.flatCamera = (dt) => {
      const k = state.keys, st = typeof stick !== 'undefined' ? stick : { x: 0, y: 0 };
      P.in.fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - (st.y || 0);
      P.in.side = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0) + (st.x || 0);
      P.in.jump = !!k.Space || !!P.jumpPulse; P.jumpPulse = false;
      const targetEye = P.crawl ? 0.6 : P.sack ? 1.5 : 1.6;
      P.eye += (targetEye - P.eye) * (1 - Math.exp(-dt * 10));
      camera.position.set(0, P.eye, 0);
      camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
      return true;
    };
    L.eyeHeight = () => P.eye;
    L.rowFor = (st, isMe) => {
      const rk = !isMe && st && st.rk && st.rk[0] === RACE.id ? st.rk : null;
      const fin = isMe ? RACE.myFinish : rk ? rk[2] : 0, prog = isMe ? myProgress() : rk ? rk[4] / 10 : 0;
      return { fin, prog, text: fin ? `${(fin / 1000).toFixed(1)} s` : RACE.state === 'run' ? `${Math.round(prog)}%` : '-' };
    };
    L.sortRows = (a, b) => (a.fin && b.fin ? a.fin - b.fin : a.fin ? -1 : b.fin ? 1 : (b.prog || 0) - (a.prog || 0));
    L.clampPlayer = () => [0, 0];
    L.onUse = () => {
      if (state.mode !== 'flat') return false;
      if (state.keys.KeyE) { if (P.hang) { letGo(); return true; } if (grabFlat()) return true; }
      return !!state.keys.Space;
    };
    L.onKey = (code) => {
      if (state.mode === 'flat' && code === 'KeyR') { respawn(); return; }
      if (/^Digit[1-9]$/.test(code) && Number(code.slice(5)) <= LEVEL_META.length) switchLevel(Number(code.slice(5)) - 1);
    };
    L.hudActions = [
      { label: () => (RACE.state === 'idle' || RACE.state === 'over' ? 'Start race' : 'Restart race'), run: () => startRace() },
      { label: () => (P.hang ? 'Let go' : 'Grab bars'), run: () => { if (P.hang) letGo(); else if (!grabFlat()) showToast('Stand under the monkey bars to grab them'); } },
      { label: () => (P.sack ? 'Hop' : 'Jump'), run: () => { P.jumpPulse = true; } },
      { label: () => 'Back to checkpoint', run: () => respawn() },
    ];
    L.hintsFor = () => (state.mode === 'flat' ? [['WASD', 'run'], ['Space', 'jump / hop / hold to throw'], ['E', 'grab the monkey bars'], ['R', 'back to checkpoint']] : L.hints);
    L.hints = [['Stick', 'run'], ['A / X', 'jump (or really hop in the sack)'], ['Grip', 'the monkey bars'], ['Duck', 'crawl the tunnel (or hold B / Y)']];
    L.spawn = () => { toStart(); };
    L.onEnter = () => { RACE.state = 'idle'; RACE.myFinish = 0; resetCourse(); toStart(); hudKey = ''; boardKey = ''; };
    L.onExit = () => {
      dolly.position.y = 0; P.duck = 0;
      hudPlate.visible = false; mySack.visible = false; if (ui.status) ui.status.hidden = true;
      for (const b of bots) { b.g.visible = false; b.sack.visible = false; }
      for (const s of remoteSacks.values()) s.visible = false;
    };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.00015); camera.position.set(5 + a * 2, 5, 6); camera.lookAt(0, 0.5, -30); };

    // ---------------------------------------------------------------- network
    L.presence = () => ({ rk: [RACE.id, Math.floor(RACE.startAt / 100) % 1e9, RACE.myFinish, P.cpIdx, Math.round(myProgress() * 10), RACE.botsN, (P.sack ? 1 : 0) | (P.crawl ? 2 : 0)] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.rk;
      if (!(Array.isArray(a) && a.length === 7 && a.every((x) => typeof x === 'number' && isFinite(x)))) { st.rk = null; return; }
      st.rk = a;
      // someone started a race: join it if the countdown hasn't finished
      if (a[0] > RACE.id && state.level === L.idx) {
        const startAt = a[1] * 100 + Math.floor(Date.now() / 1e11) * 1e11;
        if (startAt > Date.now() - 500) {
          RACE.id = a[0]; RACE.startAt = startAt; RACE.state = 'count'; RACE.myFinish = 0; RACE.botsN = clamp(Math.round(a[5]), 0, bots.length); RACE.botsOn = RACE.botsN > 0;
          resetCourse(); toStart(); boardKey = ''; showToast(`${rec.name} started a race! Get ready…`);
        }
      }
    };
    L.recessInternals = { P, RACE, Z, CPS, SOL, HOLDS, squares, TIRES, BARS, bots, ROUTE, ROUTE_T, FIN_T, startRace, step, grabFlat, letGo, respawn, standings, routeAt, supportAt, inTire, onSquare, tunnelZone, finishRace, resetCourse, gate, ballOff, NB, vr: () => ({ myHands, vrHands, myHead }), TB, BT, DDS, DD, TS, BF, SWEET, STN, throwBall, trickVel, flipFrom, flipBottle, ddNext, inCircle, gates: () => [trickGate, flipGate, ddGate] };
    return L;
  })();
