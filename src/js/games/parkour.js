  // ================================================================ LEVEL: SKYLINE SPRINT (parkour race)
  // A race up and across a sunset skyline. In VR you grab holds and pull yourself along (let go and you fling);
  // in a browser E grabs the nearest wall, bar or pole and WASD climb it. Slides, moving platforms, power-up drinks.
  const parkour = (() => {
    const L = newLevel(16);
    const G = L.group;
    L.noLocomotion = true;
    L.walkSpeed = 3;
    L.bounds = { minX: -40, maxX: 40, minZ: -200, maxZ: 30 };
    L.env = {
      sky: skyTexture([[0, '#3a2a6a'], [0.5, '#e8826a'], [0.78, '#ffd08a'], [1, '#ffd08a']]),
      bg: 0x3a2a6a, fog: [0xe8a68a, 70, 300], hemi: [0xffe6cc, 0x4a3a50, 0.8],
      sun: [0xffd8a8, 0.85], sunDir: new V3(-0.4, 1, 0.5), ambient: [0x6a5060, 0.4], sprite: null,
    };

    // ---------------------------------------------------------------- tuning
    const GRAV = 16, RUN = 5.6, JUMP_V = 6.7, STEP = 0.4, R = 0.3;
    const KILL_Y = -6, COUNT_MS = 4000;
    const _t = new V3(), _u = new V3(), _cp = new V3(), _cq = new Q4(), _fw = new V3();

    // ---------------------------------------------------------------- the course
    const concrete = lam(0x8a8274), darkc = lam(0x6b5a8a), steel = lam(0xc8ccd6), slideMat = lam(0x3fc8ff);
    // Three courses share the start pad, the buttons and the race; each has its own pieces, holds, checkpoints,
    // drinks and a route for the bots. Only the chosen one is shown and solid.
    const COURSES = [];
    let C = null, CG = G, SOL = [], RAMPS = [], HOLDS = [], ZONES = [], MOVERS = [], CPS = [], bottles = [], ROUTE = [], ROUTE_T = [0];
    let FINISH_Z = -169.5, FINISH_Y = 7.9, CLEN = 180, pegPts = [];
    function beginCourse(def) {
      const g = new THREE.Group(); G.add(g);
      const c = Object.assign({ g, SOL: [], RAMPS: [], HOLDS: [], ZONES: [], MOVERS: [], pegPts: [], bottles: [] }, def);
      COURSES.push(c);
      CG = g; SOL = c.SOL; RAMPS = c.RAMPS; HOLDS = c.HOLDS; ZONES = c.ZONES; MOVERS = c.MOVERS; pegPts = c.pegPts;
      // the shared start pad is part of every course
      plat(0, -1, 8, 14, 0, concrete).shared = true;
      makePlate(CG, c.name.toUpperCase(), 4.4, 0.7, new V3(0, 3.8, -7.4), 0, { bg: '#3a2a6a', fg: '#ffd23f', size: 0.7 });
      return c;
    }
    function endCourse(c) {
      const im = new THREE.InstancedMesh(pegGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), Math.max(1, c.pegPts.length)), d = new THREE.Object3D(), col = new THREE.Color();
      im.count = c.pegPts.length;
      c.pegPts.forEach((p, i) => { d.position.set(p.x, p.y, p.z - 0.06); d.updateMatrix(); im.setMatrixAt(i, d.matrix); im.setColorAt(i, col.setHSL((i * 0.137) % 1, 0.8, 0.6)); });
      im.frustumCulled = false; c.g.add(im);
      c.ROUTE_T = [0];
      for (let i = 1; i < c.ROUTE.length; i++) { const a = c.ROUTE[i - 1], b = c.ROUTE[i]; c.ROUTE_T.push(c.ROUTE_T[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / b[3]); }
      c.len = 3 - c.finishZ;
      // a finish arch, and buttons on the finish platform: race again, or back to the start
      finishArch(c);
      c.bottles = c.drinks.map(([k, x, y, z]) => makeBottle(k, x, y, z));
      c.g.visible = false;
    }
    function solid(x0, x1, y0, y1, z0, z1, mat, extra) {
      const mesh = addBox(CG, x1 - x0, y1 - y0, z1 - z0, mat || concrete, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      const s = Object.assign({ x0, x1, y0, y1, z0, z1, mesh, my: (y0 + y1) / 2 }, extra || {});
      SOL.push(s);
      return s;
    }
    const plat = (cx, cz, w, d, top, mat) => solid(cx - w / 2, cx + w / 2, top - 0.7, top, cz - d / 2, cz + d / 2, mat);
    // a trampoline: land on it and it throws you high
    const trampMat = lam(0x2b2d42), trampTop = new THREE.MeshLambertMaterial({ color: 0x8bd450, emissive: 0x1a3a0a });
    function trampoline(cx, cz, w, top, bounce) {
      const s = solid(cx - w / 2, cx + w / 2, top - 0.5, top, cz - w / 2, cz + w / 2, trampMat, { bounce });
      const pad = new THREE.Mesh(new THREE.BoxGeometry(w - 0.3, 0.06, w - 0.3), trampTop); pad.position.set(cx, top + 0.03, cz); CG.add(pad);
      s.pad = pad;
      return s;
    }
    // a tile that gives way a moment after you land on it (and comes back a few seconds later)
    const crumbleMat = () => new THREE.MeshLambertMaterial({ color: 0xc8a070, emissive: 0x000000 });
    const crumble = (cx, cz, w, top) => solid(cx - w / 2, cx + w / 2, top - 0.5, top, cz - w / 2, cz + w / 2, crumbleMat(), { crumble: true });
    // the water far below
    const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: 0x2a74b0 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, -8, -80); G.add(water);
    // a skyline
    { const r = mulberry32(77);
      for (let i = 0; i < 46; i++) {
        const x = (r() < 0.5 ? -1 : 1) * (22 + r() * 70), z = 20 - r() * 230, h = 14 + r() * 60, w = 6 + r() * 12;
        addBox(G, w, h, w, lam(new THREE.Color().setHSL(0.72, 0.25, 0.16 + r() * 0.12).getHex()), x, h / 2 - 10, z);
      } }
    // slides: a ramp down toward -z, with rails
    function slide(S) {
      S.ramp = true;
      RAMPS.push(S);
      const len = Math.hypot(S.zTop - S.zBot, S.yTop - S.yBot), ang = Math.atan2(S.yTop - S.yBot, S.zTop - S.zBot);
      const m = new THREE.Mesh(boxg(S.x1 - S.x0, 0.3, len), slideMat);
      m.position.set((S.x0 + S.x1) / 2, (S.yTop + S.yBot) / 2 - 0.15 / Math.cos(ang), (S.zTop + S.zBot) / 2); m.rotation.x = -ang; CG.add(m);
      const rampY = (z) => S.yBot + (S.yTop - S.yBot) * (z - S.zBot) / (S.zTop - S.zBot);
      for (let z = S.zBot; z < S.zTop - 0.1; z += 3) for (const sx of [-1, 1]) {
        const zl = z, zh = Math.min(z + 3, S.zTop);
        solid(sx > 0 ? S.x1 : S.x0 - 0.2, sx > 0 ? S.x1 + 0.2 : S.x0, rampY(zl) - 0.3, rampY(zh) + 0.9, zl, zh, lam(0xff4d8a));
      }
      return S;
    }
    // holds: climbing walls (pegs), monkey bars, poles
    const pegGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.26, 8); pegGeo.rotateX(Math.PI / 2);
    function climbWall(x0, x1, zFace, yBase, yTop, wallTopY, mantleZ, seed) {
      const r = mulberry32(seed);
      const Z = { kind: 'wall', z: zFace, nz: 1, x0, x1, y0: yBase, y1: wallTopY, topY: wallTopY, mantleZ };
      for (let row = 0, y = yBase; y <= yTop; row++, y += 0.7) for (let x = x0 + 0.3 + (row % 2) * 0.45; x <= x1 - 0.3; x += 0.9) {
        const p = new V3(x + (r() - 0.5) * 0.2, y + (r() - 0.5) * 0.15, zFace + 0.12);
        pegPts.push(p); HOLDS.push({ a: p, b: p, r: 0.1, wall: Z });
      }
      HOLDS.push({ a: new V3(x0, wallTopY, zFace), b: new V3(x1, wallTopY, zFace), r: 0.12, wall: Z, lip: true });   // the lip at the top
      // a bright strip along the lip, so it reads as something to grab
      addBox(CG, x1 - x0, 0.07, 0.1, lam(0xffd23f), (x0 + x1) / 2, wallTopY - 0.04, zFace + 0.055);
      ZONES.push(Z);
    }
    // monkey bars: rungs every metre from z0 down to z1, between two frames
    function monkeyBars(BAR_Y, z0, z1) {
      for (let z = z0; z >= z1 - 0.01; z -= 1) {
        const m = new THREE.Mesh(cyl(0.04, 0.04, 1.8, 8), steel); m.rotation.z = Math.PI / 2; m.position.set(0, BAR_Y, z); CG.add(m);
        HOLDS.push({ a: new V3(-0.9, BAR_Y, z), b: new V3(0.9, BAR_Y, z), r: 0.05 });
      }
      for (const z of [z0 + 0.4, z1 - 0.4]) for (const sx of [-1, 1]) addBox(CG, 0.14, 12, 0.14, darkc, sx * 1.0, BAR_Y - 5.5, z);
      for (const sx of [-1, 1]) addBox(CG, 0.1, 0.1, Math.abs(z0 - z1) + 1, darkc, sx * 1.0, BAR_Y + 0.4, (z0 + z1) / 2);
      ZONES.push({ kind: 'bars', y: BAR_Y, z0, z1, xHalf: 0.9 });
    }
    function poles(list, topY) {
      for (const [x, z] of list) {
        const m = new THREE.Mesh(cyl(0.1, 0.1, topY + 9.5, 10), lam(0xff9a3a)); m.position.set(x, (topY - 9.5) / 2 + 0.05, z); CG.add(m);
        const cap = new THREE.Mesh(sph(0.16, 10, 8), lam(0xffd23f)); cap.position.set(x, topY + 0.05, z); CG.add(cap);
        HOLDS.push({ a: new V3(x, -9, z), b: new V3(x, topY, z), r: 0.1 });
        ZONES.push({ kind: 'pole', x, z, y0: -8, y1: topY });
      }
    }
    function finishArch(c) {
      const z = c.finishZ - 3, y = c.finishY + 0.3;
      makePlate(c.g, 'FINISH', 4, 0.8, new V3(0, y + 3, z), 0, { bg: '#d8f43a', fg: '#16142e', size: 0.75 });
      for (const sx of [-1, 1]) addBox(c.g, 0.3, 4, 0.3, lam(0xd8f43a), sx * 3.2, y + 2, z);
      addBox(c.g, 6.9, 0.3, 0.3, lam(0xd8f43a), 0, y + 3.9, z);
      const LB = Object.create(L); LB.group = c.g;
      for (const [x, col, label, fn] of [[1.3, 0x8bd450, 'Race again', () => startRace()], [-1.3, 0xff7a3a, 'Back to start', () => { toStart(); showToast('Back at the start'); }]]) {
        addCyl(c.g, 0.12, 0.16, 0.97, 14, lam(0x6a6a7a), x, y - 0.3 + 0.485, z - 3);
        (c.buttons = c.buttons || []).push(makeButton(LB, new V3(x, y + 0.7, z - 3), col, label, () => { if (C === c) fn(); }, { faceYaw: 0, pedestal: false }));
      }
    }

    // ---------------------------------------------------------------- the drinks
    const DRINK = {
      speed: { name: 'Zoom Fizz', color: 0xffd23f, secs: 7, line: 'faster' },
      jump: { name: 'Bounce Cola', color: 0x4fc3f7, secs: 7, line: 'super jumps' },
      grip: { name: 'Grip Gulp', color: 0xff5c8a, secs: 9, line: 'stronger climbing and flings' },
    };
    const glow = new THREE.SpriteMaterial({ map: warmGlowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: 0xffffff });

    // ---------------------------------------------------------------- course 1: Skyline Sprint
    beginCourse({ name: 'Skyline Sprint', finishZ: -169.5, finishY: 7.9 });
    [[1.4, -12, 0], [-1.4, -17, 0.3], [1.2, -22, 0.6], [-1.2, -27, 0.3]].forEach(([x, z, y]) => plat(x, z, 2.4, 2.4, y, darkc));
    // the climbing wall (and the base in front of it)
    plat(0, -35.7, 8, 11.4, 0, concrete);
    solid(-4, 4, -0.7, 7, -42.2, -41.4, lam(0x8a7ab0));
    plat(0, -47.1, 8, 9.8, 7, concrete);
    // monkey bars over the gap, and the platform after
    plat(0, -68.3, 8, 7.4, 7, concrete);
    // the slide, and the platform it lands on
    slide({ x0: -1.7, x1: 1.7, zTop: -72, zBot: -96, yTop: 7, yBot: 0.2 });
    plat(0, -100, 8, 8, 0.2, concrete);
    // moving platforms
    [[-108.5, 0], [-113, 0.37], [-117.5, 0.71]].forEach(([z, ph]) => {
      const s = solid(-1.3, 1.3, -0.5, 0.2, z - 1.3, z + 1.3, lam(0xff9a3a), { mover: { z, ph } });
      MOVERS.push(s);
    });
    plat(0, -122.2, 8, 3.6, 0.2, concrete);
    // poles, and the platform after
    plat(0, -147.8, 8, 4.4, 0.2, concrete);
    // the beam, the foot of the tower, and the tower
    solid(-0.3, 0.3, -0.2, 0.2, -160, -150, lam(0xe8b54a));
    plat(0, -164, 8, 8, 0.2, concrete);
    solid(-4, 4, -0.7, 8.2, -169, -168, lam(0x8a7ab0));
    plat(0, -174, 8, 10, 8.2, concrete);
    climbWall(-2.7, 2.7, -41.4, 0.9, 6.6, 7, -43.2, 11);
    climbWall(-2.7, 2.7, -168, 0.9, 7.95, 8.2, -170, 12);    // top row at 7.9, just under the lip
    monkeyBars(9.2, -53, -65);
    poles([[1.3, -128.5], [-1.3, -133], [1.3, -137.5], [-1.3, -142]], 4.5);
    endCourse(Object.assign(COURSES[0], {
      CPS: [
        { x: 0, y: 0, z: 3, rect: null }, { x: 0, y: 0, z: -33, rect: [-4, 4, -41, -30.5] }, { x: 0, y: 7, z: -46, rect: [-4, 4, -52, -42.5] },
        { x: 0, y: 0.2, z: -100, rect: [-4, 4, -104, -96.2] }, { x: 0, y: 0.2, z: -122, rect: [-4, 4, -124, -120.4] },
        { x: 0, y: 0.2, z: -148, rect: [-4, 4, -150, -145.6] }, { x: 0, y: 0.2, z: -164, rect: [-4, 4, -168, -160.2] },
      ],
      ROUTE: [
        [0, 0, 3, 0], [1.4, 0, -12, 5.2], [-1.4, 0.3, -17, 4.4], [1.2, 0.6, -22, 4.4], [-1.2, 0.3, -27, 4.4], [0, 0, -32, 4.4], [0, 0, -40.6, 5.2],
        [0, 7, -41.2, 1.25], [0, 7, -48, 5], [0, 7, -53, 3], [0, 7, -65, 1.7], [0, 7, -71, 4.5], [0, 0.2, -96, 8], [0, 0.2, -103, 5],
        [0, 0.2, -120, 3.4], [0, 0.2, -124, 4.6], [0, 0.2, -145.6, 3.6], [0, 0.2, -150, 4.6], [0, 0.2, -166, 3], [0, 8.2, -168, 1.15], [0, 8.2, -176, 5],
      ],
      drinks: [['speed', -2.4, 0, -5], ['grip', 2.4, 0, -37], ['jump', -2.4, 7, -46], ['speed', -1.4, 0.2, -101], ['jump', 1.4, 0.2, -101], ['jump', -2.4, 0.2, -122], ['grip', 2.4, 0.2, -163]],
    }));

    // ---------------------------------------------------------------- course 2: Rooftop Rush
    // hop across the rooftops, bounce on a trampoline, climb, slide, cross the crumbling tiles, swing the bars,
    // and one last trampoline up to the finish
    beginCourse({ name: 'Rooftop Rush', finishZ: -133, finishY: 4.4 });
    {
      const roofA = lam(0xb86a5a), roofB = lam(0x5a8ab8);
      plat(0, -12, 6, 6, 0.6, roofA);
      plat(-1.5, -20.5, 5, 5, 1.2, roofB);
      trampoline(1.5, -27.5, 3, 0.4, 11);
      plat(1, -35.2, 6, 8.4, 3.4, roofA);
      solid(-2, 4, 2.7, 8, -40.2, -39.4, lam(0x8a7ab0));
      climbWall(-1.7, 3.7, -39.4, 4.3, 7.6, 8, -41.2, 21);
      plat(1, -45, 6, 9.6, 8, roofB);
      slide({ x0: -0.7, x1: 2.7, zTop: -49.8, zBot: -70, yTop: 8, yBot: 1 });
      plat(1, -74, 8, 8, 1, concrete);
      [[0, -81.5], [2, -86], [0, -90.5], [2, -95]].forEach(([x, z]) => crumble(x, z, 2.4, 1));
      plat(0, -101, 8, 7, 1, concrete);
      monkeyBars(3.2, -105.5, -116.5);
      plat(0, -120.5, 8, 8.8, 1, concrete);
      trampoline(0, -126.4, 3, 1, 12.5);
      plat(0, -135.5, 8, 8, 4.6, roofA);
      // chimneys and aerials, for the look of it
      for (const [x, z, h] of [[-2.4, -12.8, 1.2], [2.6, -33, 1.6], [-1.4, -47, 1.4], [3.2, -73, 1.0], [-3, -137.5, 1.4]]) addBox(CG, 0.6, h, 0.6, lam(0x7a4a3a), x, (z < -130 ? 4.6 : z < -60 ? 1 : z < -40 ? 8 : z < -30 ? 3.4 : 0.6) + h / 2, z);
    }
    endCourse(Object.assign(COURSES[1], {
      CPS: [
        { x: 0, y: 0, z: 3, rect: null }, { x: 1, y: 3.4, z: -33, rect: [-2, 4, -39.4, -31] }, { x: 1, y: 8, z: -43, rect: [-2, 4, -49.8, -40.2] },
        { x: 1, y: 1, z: -73, rect: [-3, 5, -78, -70] }, { x: 0, y: 1, z: -100, rect: [-4, 4, -104.5, -97.5] }, { x: 0, y: 1, z: -120, rect: [-4, 4, -124.9, -116.1] },
      ],
      ROUTE: [
        [0, 0, 3, 0], [0, 0.6, -12, 5], [-1.5, 1.2, -20.5, 4.5], [1.5, 0.4, -27.5, 4.5], [1.5, 3.4, -33, 3], [1, 3.4, -39, 4.5], [1, 8, -40.6, 1.2],
        [1, 8, -49.8, 5], [1, 1, -70, 8], [1, 1, -77, 4], [0, 1, -81.5, 4], [2, 1, -86, 4], [0, 1, -90.5, 4], [2, 1, -95, 4], [0, 1, -104, 4.5],
        [0, 1, -116.5, 1.8], [0, 1, -125, 4.5], [0, 4.6, -132, 2.5], [0, 4.6, -137, 4.5],
      ],
      drinks: [['speed', 2.4, 0, -5], ['jump', -2.0, 0.6, -12], ['grip', 3.2, 3.4, -36], ['speed', -2.5, 1, -73], ['jump', 2.5, 1, -101]],
    }));

    // ---------------------------------------------------------------- course 3: Crane Yard
    // a building site: balance beam, moving pallets, a wall, poles high over the water, crumbling planks,
    // a long slide, and a trampoline to the top
    beginCourse({ name: 'Crane Yard', finishZ: -148, finishY: 3.6 });
    {
      const yellow = lam(0xffc23a), steelD = lam(0x5a6070);
      solid(-0.3, 0.3, -0.4, 0, -18, -8, yellow);
      plat(0, -21, 6, 6, 0, steelD);
      [[-27.3, 0.1], [-31.8, 0.45], [-36.3, 0.8]].forEach(([z, ph]) => MOVERS.push(solid(-1.3, 1.3, -0.5, 0, z - 1.3, z + 1.3, lam(0xff9a3a), { mover: { z, ph } })));
      plat(0, -41, 8, 6, 0, steelD);
      solid(-4, 4, -0.7, 7, -44.8, -44, lam(0x8a7ab0));
      climbWall(-2.7, 2.7, -44, 0.9, 6.6, 7, -45.8, 31);
      plat(0, -49.6, 8, 9.6, 7, steelD);
      poles([[1.3, -58.9], [-1.3, -63.4], [1.3, -67.9], [-1.3, -72.4]], 11.5);
      plat(0, -79, 8, 6, 7, steelD);
      [[-1.4, -85.5], [1.4, -90], [-1.4, -94.5], [1.4, -99]].forEach(([x, z]) => crumble(x, z, 2.4, 7));
      plat(0, -105, 8, 8, 7, steelD);
      slide({ x0: -1.7, x1: 1.7, zTop: -109, zBot: -133, yTop: 7, yBot: 0.2 });
      plat(0, -137, 8, 8, 0.2, steelD);
      trampoline(0, -142.5, 3, 0.2, 12.5);
      plat(0, -151, 8, 8, 3.8, steelD);
      // a crane over it all
      addBox(CG, 1.2, 30, 1.2, yellow, 9, 7, -90);
      addBox(CG, 1.0, 1.0, 34, yellow, 9, 22, -80);
      addBox(CG, 0.08, 10, 0.08, lam(0x2b2d42), 9, 17, -66);
      addBox(CG, 1.4, 0.8, 1.4, lam(0xff9a3a), 9, 11.6, -66);
      for (const [x, z] of [[-3.4, -21], [3.2, -41], [-3.2, -137]]) { addBox(CG, 0.5, 0.9, 0.5, lam(0xff7a3a), x, 0.45 + (z < -130 ? 0.2 : 0), z); addBox(CG, 0.6, 0.08, 0.6, lam(0xffffff), x, 0.6 + (z < -130 ? 0.2 : 0), z); }
    }
    endCourse(Object.assign(COURSES[2], {
      CPS: [
        { x: 0, y: 0, z: 3, rect: null }, { x: 0, y: 0, z: -21, rect: [-3, 3, -24, -18] }, { x: 0, y: 0, z: -41, rect: [-4, 4, -44, -38] },
        { x: 0, y: 7, z: -48, rect: [-4, 4, -54.4, -44.8] }, { x: 0, y: 7, z: -79, rect: [-4, 4, -82, -76] }, { x: 0, y: 7, z: -105, rect: [-4, 4, -109, -101] },
        { x: 0, y: 0.2, z: -137, rect: [-4, 4, -141, -133] },
      ],
      ROUTE: [
        [0, 0, 3, 0], [0, 0, -8, 5], [0, 0, -18, 3.5], [0, 0, -24, 5], [0, 0, -27.3, 3], [0, 0, -31.8, 3], [0, 0, -36.3, 3], [0, 0, -43.5, 4],
        [0, 7, -44.6, 1.2], [0, 7, -54, 5], [1.3, 7, -58.9, 2], [-1.3, 7, -63.4, 2], [1.3, 7, -67.9, 2], [-1.3, 7, -72.4, 2], [0, 7, -77, 4],
        [-1.4, 7, -85.5, 4], [1.4, 7, -90, 4], [-1.4, 7, -94.5, 4], [1.4, 7, -99, 4], [0, 7, -108, 4.5], [0, 0.2, -133, 8], [0, 0.2, -142, 4.5],
        [0, 3.8, -148, 2.5], [0, 3.8, -153, 4.5],
      ],
      drinks: [['jump', -2.4, 0, -5], ['speed', 2.2, 0, -21], ['grip', -2.6, 0, -40], ['grip', 2.6, 7, -78], ['jump', 2.4, 0.2, -137]],
    }));

    // signs and the start gate (shared)
    const gateSign = makePlate(G, 'Press START', 2.6, 0.5, new V3(0, 2.5, -7.3), 0, { bg: '#16142e', fg: '#8bd450', size: 0.6 });

    // ---------------------------------------------------------------- the drinks
    function makeBottle(k, x, y, z) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(cyl(0.05, 0.055, 0.2, 12), new THREE.MeshLambertMaterial({ color: DRINK[k].color, emissive: DRINK[k].color, emissiveIntensity: 0.3 }));
      const neck = new THREE.Mesh(cyl(0.022, 0.04, 0.08, 10), lam(0xf4f2ec)); neck.position.y = 0.14;
      const cap = new THREE.Mesh(cyl(0.026, 0.026, 0.03, 10), lam(0x232640)); cap.position.y = 0.2;
      const gl = new THREE.Sprite(glow.clone()); gl.material.color.setHex(DRINK[k].color); gl.scale.set(0.7, 0.7, 1);
      g.add(body, neck, cap, gl); g.scale.setScalar(1.35);
      addBox(CG, 0.3, 0.9, 0.3, darkc, x, y + 0.45, z);
      g.position.set(x, y + 1.15, z); CG.add(g);
      return { k, g, home: new V3(x, y + 1.15, z), taken: false, held: null };
    }
    // the crumbling tiles and trampolines, over time
    function updateTiles(t) {
      for (const s of SOL) {
        if (s.crumble) {
          if (s.fallAt && !s.down && t > s.fallAt) { s.down = true; sfx('thump', 0.4); }
          if (s.down && t > s.fallAt + 3200) { s.down = false; s.fallAt = 0; }
          const shake = s.fallAt && !s.down ? Math.sin(t * 0.08) * 0.03 : 0;
          s.mesh.position.set((s.x0 + s.x1) / 2 + shake, s.down ? s.my - Math.min(9, (t - s.fallAt) * 0.012) : s.my, (s.z0 + s.z1) / 2);
          s.mesh.visible = !s.down || t - s.fallAt < 900;
          s.mesh.material.emissive.setHex(s.fallAt && !s.down ? 0x5a2a00 : 0x000000);
        } else if (s.pad) {
          const k = s.boingT ? Math.max(0, 1 - (t - s.boingT) / 300) : 0;
          s.pad.scale.y = 1 + k * 3; s.pad.position.y = s.y1 + 0.03 - k * 0.05;
        }
      }
    }
    function useCourse(i) {
      i = clamp(i | 0, 0, COURSES.length - 1);
      if (C) C.g.visible = false;
      C = COURSES[i];
      C.g.visible = true;
      for (const c of COURSES) for (const b of c.buttons || []) b.off = c !== C;
      SOL = C.SOL; RAMPS = C.RAMPS; HOLDS = C.HOLDS; ZONES = C.ZONES; MOVERS = C.MOVERS; CPS = C.CPS; bottles = C.bottles;
      ROUTE = C.ROUTE; ROUTE_T = C.ROUTE_T; FINISH_Z = C.finishZ; FINISH_Y = C.finishY; CLEN = C.len;
      for (const s of SOL) if (s.crumble) { s.down = false; s.fallAt = 0; }
      for (const b of (L.pkBots || [])) b.finishT = ROUTE_T[ROUTE_T.length - 1] / b.f;
      L.courseIdx = i;
      state.hudDirty = true; state.dirtyBoard = true;
    }
    useCourse(0);

    // ---------------------------------------------------------------- the player
    const P = {
      vel: new V3(), grounded: false, support: null, slideT: 0, eye: 1.6, jumpPrev: false, cpIdx: 0,
      zone: null, hp: new V3(), poleOff: new V3(), hand: { left: { hold: null, bottle: null }, right: { hold: null, bottle: null } },
      hist: [], wasHang: false, drink: null, fx: { speed: 0, jump: 0, grip: 0 },
      in: { fwd: 0, side: 0, jump: false, slide: false },
    };
    L.P = P;
    const fxOn = (k) => P.fx[k] > 0;
    const bodyXZ = () => (state.mode === 'vr' ? [myHead.pos.x, myHead.pos.z] : [dolly.position.x, dolly.position.z]);
    let rampHit = null;
    const rampAt = (x, z) => {
      for (const r of RAMPS) if (x > r.x0 - 0.1 && x < r.x1 + 0.1 && z <= r.zTop && z >= r.zBot) { rampHit = r; return r.yBot + (r.yTop - r.yBot) * (z - r.zBot) / (r.zTop - r.zBot); }
      return null;
    };
    // the highest thing under your feet that you can stand on
    function supportAt(bx, bz, feetY, slack) {
      let best = -Infinity, ref = null;
      for (const s of SOL) if (!s.down && bx > s.x0 - 0.12 && bx < s.x1 + 0.12 && bz > s.z0 - 0.12 && bz < s.z1 + 0.12 && s.y1 <= feetY + slack && s.y1 > best) { best = s.y1; ref = s; }
      const ry = rampAt(bx, bz);
      if (ry !== null && ry <= feetY + slack + 0.2 && ry > best) { best = ry; ref = rampHit; }
      return ref ? { y: best, ref } : null;
    }
    function pushOut() {
      const [bx, bz] = bodyXZ(), fy = dolly.position.y;
      for (const s of SOL) {
        if (s.down || !(s.y1 > fy + STEP && s.y0 < fy + 1.6)) continue;
        if (!(bx > s.x0 - R && bx < s.x1 + R && bz > s.z0 - R && bz < s.z1 + R)) continue;
        const dl = bx - (s.x0 - R), dr = (s.x1 + R) - bx, dn = bz - (s.z0 - R), df = (s.z1 + R) - bz, m = Math.min(dl, dr, dn, df);
        if (m === dl) dolly.position.x -= dl; else if (m === dr) dolly.position.x += dr; else if (m === dn) dolly.position.z -= dn; else dolly.position.z += df;
        if (m === dl || m === dr) P.vel.x = 0; else P.vel.z = 0;
      }
    }
    const _rwd = { x: 0, z: 0 };
    function moveDirFromInput() {
      // stick or keys, relative to where you're facing
      let fwd = P.in.fwd, side = P.in.side;
      const len = Math.hypot(fwd, side);
      if (len > 1) { fwd /= len; side /= len; }
      let yaw;
      if (state.mode === 'vr') { camera.getWorldQuaternion(_cq); _fw.set(0, 0, -1).applyQuaternion(_cq); _fw.y = 0; if (_fw.lengthSq() < 1e-4) _fw.set(0, 0, -1); _fw.normalize(); _rwd.x = _fw.x * fwd - _fw.z * side; _rwd.z = _fw.z * fwd + _fw.x * side; }
      else { yaw = state.yaw; _rwd.x = -Math.sin(yaw) * fwd + Math.cos(yaw) * side; _rwd.z = -Math.cos(yaw) * fwd - Math.sin(yaw) * side; }
      return _rwd;
    }

    // ---------------------------------------------------------------- the race
    const RACE = { id: 0, state: 'idle', startAt: 0, botsOn: false, botsN: 0, myFinish: 0, over: false, seqShown: -1, goneT: 0 };
    L.race = RACE;
    const BOT_DEF = [{ name: 'Parkour Pete', color: '#ff8a4a', f: 0.66, hat: 1, face: 1 }, { name: 'Vault Val', color: '#8bd450', f: 0.76, hat: 2, face: 2 }, { name: 'Rooftop Rex', color: '#b388ff', f: 0.86, hat: 0, face: 3 }, { name: 'Leap Lena', color: '#4fc3f7', f: 0.71, hat: 3, face: 0 }, { name: 'Flip Finn', color: '#ffd23f', f: 0.81, hat: 1, face: 3 }];
    function routeAt(t, f, out) {      // where a bot is, t seconds into the race, at pace f
      const tt = t * f;
      if (tt <= 0) { out.set(ROUTE[0][0], ROUTE[0][1], ROUTE[0][2]); return 0; }
      if (tt >= ROUTE_T[ROUTE_T.length - 1]) { const e = ROUTE[ROUTE.length - 1]; out.set(e[0], e[1], e[2]); return 1; }
      let i = 1; while (ROUTE_T[i] < tt) i++;
      const k = (tt - ROUTE_T[i - 1]) / (ROUTE_T[i] - ROUTE_T[i - 1]), a = ROUTE[i - 1], b = ROUTE[i];
      out.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
      return 0;
    }
    const bots = BOT_DEF.map((d, bi) => {
      const g = buildAvatar(d.color, d.hat, d.face, true, 1, 2);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = '#fff'; c.font = `700 28px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(d.name, 128, 33, 230); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.9, 0.225, 1); tag.position.y = 0.42; g.add(tag); g.visible = false; G.add(g);
      return Object.assign({ g, bi, finishT: ROUTE_T[ROUTE_T.length - 1] / d.f, pos: new V3() }, d);
    });
    // the Bots level: everyone's pace (and so their finish time) a little slower or faster
    BOTLV.on(L, { note: 'The racers run at that pace from now' });
    bots.forEach((b) => { const f0 = b.f; delete b.f; delete b.finishT; Object.defineProperty(b, 'f', { get: () => f0 * BOTLV.pick(L, [0.86, 1, 1.14]), enumerable: true }); Object.defineProperty(b, 'finishT', { get: () => ROUTE_T[ROUTE_T.length - 1] / b.f, set: () => {}, enumerable: true }); });
    L.pkBots = bots;
    const raceNow = () => (RACE.state === 'idle' ? 0 : Date.now() - RACE.startAt);
    const myProgress = () => { const [, bz] = bodyXZ(); return clamp((3 - bz) / CLEN * 180, 0, 180) + Math.max(0, dolly.position.y) * 0.4; };
    function standings() {
      const rows = [];
      rows.push({ name: state.name || 'You', me: true, fin: RACE.myFinish, prog: myProgress() });
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.pk && st.pk[0] === RACE.id) rows.push({ name: rec.name, fin: st.pk[2], prog: st.pk[4] / 10 }); }
      if (RACE.botsOn) { const t = Math.max(0, raceNow()) / 1000; for (const b of bots.slice(0, RACE.botsN)) rows.push({ name: b.name, bot: true, fin: t >= b.finishT ? Math.round(b.finishT * 1000) : 0, prog: Math.min(180, (t * b.f / ROUTE_T[ROUTE_T.length - 1]) * 180) }); }
      rows.sort((a, b) => (a.fin && b.fin ? a.fin - b.fin : a.fin ? -1 : b.fin ? 1 : b.prog - a.prog));
      return rows;
    }
    // a results board by the start
    const boardC = canvasTexture(512, 288);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.24), new THREE.MeshBasicMaterial({ map: boardC.tex }));
    board.position.set(-3.9, 2.0, -1); board.rotation.y = Math.PI / 2; G.add(board);
    addBox(G, 0.08, 2.0, 0.08, darkc, -3.95, 1.0, -1);
    let boardKey = '';
    function drawBoard(rows) {
      const key = JSON.stringify(rows.map((r) => [r.name, r.fin, Math.round(r.prog / 5)]));
      if (key === boardKey) return; boardKey = key;
      const g = boardC.g;
      g.fillStyle = '#16142e'; g.fillRect(0, 0, 512, 288); g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.textAlign = 'center'; g.font = `800 34px ${DISPLAY}`; g.fillText('RACE', 256, 28);
      rows.slice(0, 5).forEach((r, i) => {
        g.textAlign = 'left'; g.fillStyle = r.me ? '#8bd450' : r.bot ? '#a9a3cf' : '#ffffff'; g.font = `700 30px ${BODY}`; g.fillText(`${i + 1}  ${r.name}`, 24, 78 + i * 44, 300);
        g.textAlign = 'right'; g.fillText(r.fin ? (r.fin / 1000).toFixed(1) + ' s' : (RACE.state === 'run' ? Math.round(r.prog / 1.8) + '%' : '-'), 490, 78 + i * 44);
      });
      boardC.tex.needsUpdate = true;
    }
    function resetDrinks() { for (const b of bottles) { b.taken = false; b.held = null; b.g.visible = true; b.g.position.copy(b.home); } P.drink = null; P.fx.speed = P.fx.jump = P.fx.grip = 0; }
    function toStart() {
      dolly.position.set((Math.random() - 0.5) * 3, 0, 3); dolly.rotation.y = 0; state.yaw = 0; state.pitch = 0;
      P.vel.set(0, 0, 0); P.zone = null; P.cpIdx = 0; P.hand.left.hold = P.hand.right.hold = null; P.slideT = 0;
    }
    function startRace(fromPeer) {
      for (const s of SOL) if (s.crumble) { s.down = false; s.fallAt = 0; }
      RACE.id = Math.floor(Date.now() / 1000); RACE.startAt = Date.now() + COUNT_MS; RACE.state = 'count'; RACE.myFinish = 0; RACE.over = false; RACE.seqShown = -1;
      const others = [...remotes.values()].filter((r) => r.lv === L.idx && r.inGame).length;
      RACE.botsN = clamp(L.picker.n - 1 - others, 0, bots.length); RACE.botsOn = RACE.botsN > 0;
      resetDrinks(); toStart(); boardKey = '';
      showToast(RACE.botsOn ? `Race against ${RACE.botsN === 1 ? 'a bot' : `${RACE.botsN} bots`}! Get ready\u2026` : 'Race! Get ready\u2026');
      forcePresence();
    }
    function finishRace() {
      RACE.myFinish = Math.round(raceNow()); RACE.state = 'over'; RACE.over = true;
      RECORDS.add(L, `c${L.courseIdx || 0}`, RACE.myFinish / 1000);
      const rank = standings().findIndex((r) => r.me) + 1;
      showToast(`Finished in ${(RACE.myFinish / 1000).toFixed(1)} s! ${rank === 1 ? '1st place!' : `Place ${rank}`} \u00B7 Race again from the buttons just ahead`);
      sfx('fanfare', 1); setTimeout(() => sfx('cheer', 0.8), 250);
      forcePresence();
    }
    makeButton(L, new V3(2.4, 1.0, -1.6), 0x8bd450, 'START race', () => startRace(), { faceYaw: 0 });
    makeButton(L, new V3(2.4, 1.0, 0.2), 0xff7a3a, 'Back to start', () => { toStart(); showToast('Back at the start'); }, { faceYaw: 0 });
    makeKiosk(L, -3.4, 2.4, Math.PI / 2);
    RECORDS.def(L, ['Skyline Sprint', 'Rooftop Rush', 'Crane Yard'].map((n, i) => ({ k: `c${i}`, label: `Fastest: ${n}`, low: true, fmt: 'time' })));
    // choose a course (not mid-race)
    function nextCourse() {
      if (RACE.state === 'count' || RACE.state === 'run') { showToast('Finish or restart the race first'); return; }
      useCourse((L.courseIdx + 1) % COURSES.length);
      RACE.state = 'idle'; RACE.myFinish = 0; resetDrinks(); toStart(); boardKey = '';
      showToast(`Course: ${C.name}`); sfx('chime', 0.6); forcePresence();
    }
    L.nextCourse = nextCourse;
    makeButton(L, new V3(2.4, 1.0, 2.0), 0x4fc3f7, 'Change course', () => nextCourse(), { faceYaw: 0 });
    makePlayerPicker(L, { min: 1, max: 1 + BOT_DEF.length, def: 4, label: 'Racers', note: 'from the next race' });

    // ---------------------------------------------------------------- drinks in use
    function takeBottle(b, hand) { b.taken = true; b.held = hand || null; if (!hand) b.g.visible = false; }
    function drinkNow(kind) {
      const D = DRINK[kind || P.drink]; if (!D) return;
      const k = kind || P.drink;
      P.fx[k] = D.secs; P.drink = null;
      sfx('potion', 1); tone(500, 900, 0.18, 'sine', 0.2);
      showToast(`${D.name}! ${D.secs} seconds of ${D.line}`);
      state.hudDirty = true;
    }
    function pickupBottles(dt) {
      if (state.mode === 'vr') return;
      if (P.drink) return;
      for (const b of bottles) if (!b.taken && b.g.position.distanceTo(_t.set(dolly.position.x, dolly.position.y + 1.2, dolly.position.z)) < 1.3) {
        takeBottle(b); P.drink = b.k; sfx('click', 0.6); showToast(`Got ${DRINK[b.k].name}: press Q to drink`); state.hudDirty = true; break;
      }
    }

    // ---------------------------------------------------------------- holds
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
    // browser: grab the nearest wall, bar or pole in reach
    function grabFlat() {
      camera.getWorldPosition(_cp);
      const fy = dolly.position.y, ey = _cp.y;
      let best = null, bd = 1e9;
      for (const Z of ZONES) {
        let d = 1e9;
        if (Z.kind === 'wall') { const dist = (_cp.z - Z.z) * Z.nz; if (dist > 0.1 && dist < 2.4 && _cp.x > Z.x0 - 0.8 && _cp.x < Z.x1 + 0.8 && ey > Z.y0 - 1.2 && ey < Z.y1 + 0.8) d = dist; }
        else if (Z.kind === 'bars') { const up = Z.y - fy; if (up > 1.3 && up < 3.2 && _cp.z < Z.z0 + 2 && _cp.z > Z.z1 - 1.5 && Math.abs(_cp.x) < Z.xHalf + 1) d = up - 1.3; }
        else if (Z.kind === 'pole') { const h = Math.hypot(_cp.x - Z.x, _cp.z - Z.z); if (h < 1.6 && ey > Z.y0 && ey < Z.y1 + 1) d = h; }
        if (d < bd) { bd = d; best = Z; }
      }
      if (!best) return false;
      P.zone = best; P.vel.set(0, 0, 0); P.grounded = false;
      if (best.kind === 'wall') P.hp.set(clamp(_cp.x, best.x0, best.x1), clamp(ey + 0.2, best.y0, best.y1), best.z);
      else if (best.kind === 'bars') P.hp.set(clamp(_cp.x, -best.xHalf, best.xHalf), best.y, clamp(_cp.z, best.z1, best.z0));
      else { P.hp.set(best.x, clamp(fy + 1.4, best.y0, best.y1), best.z); P.poleOff.set(_cp.x - best.x, 0, _cp.z - best.z); if (P.poleOff.lengthSq() < 1e-4) P.poleOff.set(0, 0, 1); P.poleOff.normalize().multiplyScalar(0.42); }
      sfx('click', 0.8);
      return true;
    }
    function releaseFlat(launch) {
      const Z = P.zone; if (!Z) return;
      P.zone = null;
      if (launch) {
        camera.getWorldQuaternion(_cq); _fw.set(0, 0, -1).applyQuaternion(_cq); _fw.y = 0; if (_fw.lengthSq() < 1e-4) _fw.set(0, 0, -1); _fw.normalize();
        const jv = fxOn('jump') ? 1.35 : 1;
        P.vel.set(_fw.x * 5.8, 5.8 * jv, _fw.z * 5.8);
      }
    }
    function zoneHang(dt) {
      const Z = P.zone, I = P.in, g = fxOn('grip') ? 1.8 : 1;
      if (Z.kind === 'wall') {
        P.hp.y = clamp(P.hp.y + I.fwd * 1.5 * g * dt, Z.y0, Z.y1 + 0.3); P.hp.x = clamp(P.hp.x + I.side * 1.4 * g * dt, Z.x0, Z.x1);
        dolly.position.set(P.hp.x, P.hp.y - 1.5, Z.z + Z.nz * 0.42);
        if (P.hp.y >= Z.y1 - 0.02 && I.fwd > 0) { dolly.position.set(P.hp.x, Z.topY, Z.mantleZ); P.zone = null; P.vel.set(0, 0, 0); sfx('whoosh', 0.6); }
      } else if (Z.kind === 'bars') {
        P.hp.z = clamp(P.hp.z - I.fwd * 2.0 * g * dt, Z.z1, Z.z0); P.hp.x = clamp(P.hp.x + I.side * 1.2 * dt, -Z.xHalf, Z.xHalf);
        dolly.position.set(P.hp.x, Z.y - 2.2, P.hp.z);
        if (P.hp.z <= Z.z1 + 0.01 && I.fwd > 0) { P.zone = null; P.vel.set(0, 0, 0); }
      } else {
        P.hp.y = clamp(P.hp.y + I.fwd * 1.6 * g * dt, Z.y0, Z.y1);
        dolly.position.set(Z.x + P.poleOff.x, P.hp.y - 1.4, Z.z + P.poleOff.z);
      }
      P.vel.set(0, 0, 0);
    }
    // VR: hanging from a wall's top row (or its lip) and pulling up until your eyes clear the top climbs you over,
    // the way holding W at the top does in a browser
    function tryMantle(head) {
      let Z = null;
      for (const side of SIDES) { const h = P.hand[side].hold; if (h && h.hold.wall && h.hold.a.y >= h.hold.wall.topY - 0.8) Z = h.hold.wall; }
      if (!Z || head.y < Z.topY - 0.15) return false;
      const dx = clamp(head.x, Z.x0 + 0.4, Z.x1 - 0.4) - head.x, dz = Z.mantleZ - head.z, dy = Z.topY - dolly.position.y;
      dolly.position.x += dx; dolly.position.z += dz; dolly.position.y = Z.topY;
      myHead.pos.x += dx; myHead.pos.y += dy; myHead.pos.z += dz;
      // let go, and don't grab the lip again until the grip has been released
      for (const side of SIDES) { P.hand[side].hold = null; P.hand[side].regrip = true; }
      P.hist.length = 0; P.vel.set(0, 0, 0); P.wasHang = false; P.grounded = true; P.support = null;
      sfx('whoosh', 0.6);
      for (const side of SIDES) haptic(vrHands[side], 0.5, 60);
      return true;
    }
    // VR: hands. Grip a hold and pull; let go and you carry the motion.
    function vrHang(dt) {
      const deltas = [];
      for (const side of SIDES) {
        const mh = myHands[side], H = P.hand[side], gp = vrHands[side].source && vrHands[side].source.gamepad;
        const grip = !!(gp && gp.buttons && gp.buttons[1] && gp.buttons[1].pressed);
        if (!mh.ok) { H.hold = null; continue; }
        if (!grip) { if (H.bottle) { const b = H.bottle; b.held = null; b.taken = false; b.g.position.copy(b.home); H.bottle = null; } H.hold = null; H.regrip = false; continue; }
        if (H.regrip) continue;
        if (!H.hold && !H.bottle) {
          // a bottle first, if one is in your hand's reach
          const bt = bottles.find((b) => !b.taken && b.g.position.distanceTo(mh.pos) < 0.28);
          if (bt) { takeBottle(bt, side); H.bottle = bt; haptic(vrHands[side], 0.4, 30); sfx('click', 0.6); continue; }
          const hold = findHold(mh.pos);
          if (hold) { H.hold = { hold, anchor: mh.pos.clone() }; haptic(vrHands[side], 0.5, 40); sfx('click', 0.6); }
        }
        if (H.bottle) {
          H.bottle.g.position.copy(mh.pos);
          if (H.bottle.g.position.distanceTo(_t.set(myHead.pos.x, myHead.pos.y - 0.12, myHead.pos.z)) < 0.3) { const k = H.bottle.k; H.bottle.g.visible = false; H.bottle.held = null; H.bottle = null; drinkNow(k); }
        }
        if (H.hold) deltas.push(H.hold.anchor.clone().sub(mh.pos));
      }
      if (!deltas.length) return false;
      const d = new V3(); for (const x of deltas) d.add(x); d.multiplyScalar((fxOn('grip') ? 1.6 : 1) / deltas.length);
      dolly.position.add(d);
      P.hist.push({ d, dt }); while (P.hist.length > 5) P.hist.shift();
      P.vel.set(0, 0, 0);
      camera.getWorldPosition(_cp);
      if (tryMantle(_cp)) return false;
      return true;
    }
    function readVR(dt) {
      const la = stickAxes(vrHands.left), ra = stickAxes(vrHands.right);
      P.in.fwd = la && Math.hypot(la[0], la[1]) > 0.15 ? -la[1] : 0; P.in.side = la && Math.hypot(la[0], la[1]) > 0.15 ? la[0] : 0;
      const gl = vrHands.left.source && vrHands.left.source.gamepad, gr = vrHands.right.source && vrHands.right.source.gamepad;
      P.in.jump = !!((gl && gl.buttons && gl.buttons[4] && gl.buttons[4].pressed) || (gr && gr.buttons && gr.buttons[4] && gr.buttons[4].pressed));
      P.in.slide = !!((gr && gr.buttons && gr.buttons[5] && gr.buttons[5].pressed) || (gl && gl.buttons && gl.buttons[5] && gl.buttons[5].pressed));
      if (ra) {
        const x = ra[0], rh = vrHands.right;
        if (prefs.smoothTurn) { if (Math.abs(x) > 0.15) snapTurn(-Math.sign(x) * ((Math.abs(x) - 0.15) / 0.85) * 2.4 * dt); }
        else if (rh.turnArmed && Math.abs(x) > 0.7) { snapTurn(x > 0 ? -Math.PI / 6 : Math.PI / 6); rh.turnArmed = false; }
        else if (Math.abs(x) < 0.3) rh.turnArmed = true;
      }
    }

    // ---------------------------------------------------------------- one step of the player
    function respawn() {
      const c = CPS[P.cpIdx];
      dolly.position.set(c.x, c.y, c.z); dolly.rotation.y = 0; state.yaw = 0;
      P.vel.set(0, 0, 0); P.zone = null; P.hand.left.hold = P.hand.right.hold = null;
      sfx('poof', 0.8); tone(300, 120, 0.3, 'sine', 0.2); showToast(P.cpIdx ? 'Splash! Back to your last checkpoint' : 'Splash! Back to the start');
    }
    function updateMovers(now) {
      const t = now / 1000;
      for (const s of MOVERS) {
        const x = 3.2 * Math.sin((t / 8 + s.mover.ph) * Math.PI * 2), w = s.x1 - s.x0;
        s.dx = (x - w / 2) - s.x0; s.x0 = x - w / 2; s.x1 = x + w / 2; s.mesh.position.x = x;
      }
    }
    function step(dt, now) {
      // a long frame is played as a few short steps, so a slower headset runs at the same speed (not in slow motion)
      if (dt > 1 / 30 + 1e-6) { const n = Math.min(4, Math.ceil(dt * 30)); for (let i = 0; i < n; i++) step(dt / n, now); return; }
      updateMovers(Date.now()); updateTiles(Date.now());
      const vr = state.mode === 'vr';
      if (vr) readVR(dt);
      const frozen = RACE.state === 'count' || (RACE.state === 'over' && false);
      if (frozen) { P.vel.set(0, 0, 0); return; }
      for (const k of ['speed', 'jump', 'grip']) if (P.fx[k] > 0) P.fx[k] = Math.max(0, P.fx[k] - dt);
      const jumpEdge = P.in.jump && !P.jumpPrev; P.jumpPrev = P.in.jump;
      // hanging on something
      let hanging = false;
      if (vr) hanging = vrHang(dt);
      else if (P.zone) { if (jumpEdge) releaseFlat(true); else { zoneHang(dt); hanging = !!P.zone; } }
      if (hanging) { P.wasHang = true; P.grounded = false; pushOut(); }
      else {
        if (P.wasHang) {
          P.wasHang = false;
          if (vr && P.hist.length) { let sx = 0, sy = 0, sz = 0, st = 0; for (const h of P.hist) { sx += h.d.x; sy += h.d.y; sz += h.d.z; st += h.dt; } const f = (fxOn('grip') ? 1.5 : 1) / Math.max(st, 0.02); P.vel.set(sx * f, sy * f, sz * f); const sp = P.vel.length(); if (sp > 12) P.vel.multiplyScalar(12 / sp); }
          P.hist.length = 0;
        }
        const dir = moveDirFromInput(), spd = RUN * (fxOn('speed') ? 1.6 : 1), g = GRAV * (fxOn('jump') ? 0.62 : 1);
        const onRamp = P.grounded && P.support && P.support.ref.ramp, SLIDE = onRamp ? P.support.ref : null;
        // sliding on the flat: a burst of speed, then you skid
        if (P.in.slide && P.grounded && !onRamp && P.slideT <= 0 && Math.hypot(P.vel.x, P.vel.z) > 3) { P.slideT = 0.9; P.vel.x *= 1.25; P.vel.z *= 1.25; sfx('whoosh', 0.5); }
        if (P.slideT > 0) P.slideT -= dt;
        if (P.grounded) {
          if (onRamp) {
            const sl = (SLIDE.yTop - SLIDE.yBot) / (SLIDE.zTop - SLIDE.zBot), a = GRAV * sl / Math.sqrt(1 + sl * sl) * 0.9;
            P.vel.z -= a * dt; P.vel.x += dir.x * 7 * dt; P.vel.z += dir.z * 3 * dt;
            const f = Math.max(0, 1 - 0.18 * dt); P.vel.x *= f; P.vel.z *= f;
            const sp = Math.hypot(P.vel.x, P.vel.z); if (sp > 14) { P.vel.x *= 14 / sp; P.vel.z *= 14 / sp; }
          } else if (P.slideT > 0) { const f = Math.max(0, 1 - 1.5 * dt); P.vel.x *= f; P.vel.z *= f; }
          else {
            const k = 1 - Math.exp(-dt * 14);
            P.vel.x += (dir.x * spd - P.vel.x) * k; P.vel.z += (dir.z * spd - P.vel.z) * k;
          }
          if (jumpEdge && P.slideT <= 0.5) { P.vel.y = fxOn('jump') ? 9.6 : JUMP_V; P.grounded = false; P.support = null; sfx('whoosh', 0.4); }
        } else {
          const k = 1 - Math.exp(-dt * (fxOn('speed') ? 3 : 2));
          P.vel.x += (dir.x * spd - P.vel.x) * k * 0.6; P.vel.z += (dir.z * spd - P.vel.z) * k * 0.6;
        }
        // ride a moving platform
        if (P.grounded && P.support && P.support.ref.mover) dolly.position.x += P.support.ref.dx || 0;
        // fall, move, and land
        const wasGrounded = P.grounded, fy0 = dolly.position.y;
        if (!(P.grounded && onRamp)) P.vel.y -= g * dt;
        const n = 2;
        for (let i = 0; i < n; i++) {
          dolly.position.x += P.vel.x * dt / n; dolly.position.z += P.vel.z * dt / n; dolly.position.y += P.vel.y * dt / n;
          pushOut();
          const [bx, bz] = bodyXZ(), fy = dolly.position.y;
          // on the way down, a top you've just dipped below (coming in low over an edge) still catches you,
          // the same step-up you get walking; otherwise you'd sink into the block and drop through it
          const sup = supportAt(bx, bz, fy, (wasGrounded || P.grounded || P.vel.y <= 0) ? STEP : Math.max(0.06, -P.vel.y * dt / n + 0.06));
          if (sup && P.vel.y <= 0.001 && fy <= sup.y + 0.03) {
            if (!P.grounded && P.vel.y < -4) { sfx('slam', Math.min(0.5, -P.vel.y * 0.04)); haptic(vrHands.left, 0.3, 40); haptic(vrHands.right, 0.3, 40); }
            dolly.position.y = sup.y; P.grounded = true; P.support = sup;
            if (sup.ref.ramp) { const S = sup.ref, sl = (S.yTop - S.yBot) / (S.zTop - S.zBot); P.vel.y = sl * P.vel.z; } else P.vel.y = 0;
            if (sup.ref.bounce) {
              // boing
              P.vel.y = sup.ref.bounce * (fxOn('jump') ? 1.1 : 1); P.grounded = false; P.support = null; sup.ref.boingT = Date.now();
              tone(180, 620, 0.25, 'sine', 0.3); if (vr) { haptic(vrHands.left, 0.5, 60); haptic(vrHands.right, 0.5, 60); }
              break;
            }
            if (sup.ref.crumble && !sup.ref.fallAt) { sup.ref.fallAt = Date.now() + 650; tone(240, 140, 0.4, 'sawtooth', 0.08); }
          } else if (!sup || fy > sup.y + 0.06) { P.grounded = false; P.support = null; }
        }
        void fy0;
      }
      // checkpoints, the water, the finish
      if (P.grounded) {
        const [bx, bz] = bodyXZ();
        for (let i = P.cpIdx + 1; i < CPS.length; i++) { const r = CPS[i].rect; if (r && bx > r[0] && bx < r[1] && bz > r[2] && bz < r[3] && Math.abs(dolly.position.y - CPS[i].y) < 0.5) { P.cpIdx = i; showToast('Checkpoint!'); sfx('chime', 0.6); } }
      }
      if (dolly.position.y < KILL_Y) respawn();
      const [fbx, fbz] = bodyXZ();
      if (RACE.state === 'run' && fbz < FINISH_Z && dolly.position.y > FINISH_Y) finishRace();
      pickupBottles(dt);
    }

    // ---------------------------------------------------------------- per frame
    const hudPlate = makePlate(camera, 'Ready', 0.5, 0.1, new V3(0, -0.2, -0.6), 0, { bg: '#16142e', fg: '#ffffff', size: 0.55 });
    hudPlate.material.depthTest = false; hudPlate.renderOrder = 999; hudPlate.visible = false;
    let hudKey = '', lastCount = -1;
    function hudText() {
      const parts = [];
      if (RACE.state === 'run') parts.push(`${(raceNow() / 1000).toFixed(1)} s`);
      else if (RACE.state === 'over') parts.push(`Done ${(RACE.myFinish / 1000).toFixed(1)} s`);
      if (RACE.state === 'run' || RACE.state === 'over') { const rows = standings(); parts.push(`Place ${rows.findIndex((r) => r.me) + 1}/${rows.length}`); }
      if (P.drink) parts.push(`${DRINK[P.drink].name} (Q)`);
      for (const k of ['speed', 'jump', 'grip']) if (P.fx[k] > 0) parts.push(`${DRINK[k].name} ${Math.ceil(P.fx[k])}`);
      return parts.join('  \u00b7  ') || C.name;
    }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      // the race clock
      if (RACE.state === 'count') {
        const left = RACE.startAt - Date.now(), n = Math.ceil(left / 1000);
        if (left <= 0) { RACE.state = 'run'; gateSign.userData.draw('GO!'); sfx('whistle', 1); tone(1200, 1200, 0.4, 'square', 0.2); showToast('GO!'); }
        else if (n !== lastCount) { lastCount = n; gateSign.userData.draw(String(n)); tone(660, 660, 0.15, 'square', 0.15); }
      } else if (RACE.state === 'run' && raceNow() > 4000) { if (gateSign.userData.text !== 'RACE ON') { gateSign.userData.text = 'RACE ON'; gateSign.userData.draw('RACE ON'); } }
      else if (RACE.state === 'idle' && gateSign.userData.text !== 'Press START') { gateSign.userData.text = 'Press START'; gateSign.userData.draw('Press START'); }
      if (here) step(dt, now);
      for (const b of bottles) if (!b.taken && b.g.visible) { b.g.position.y = b.home.y + Math.sin(now * 0.003 + b.home.x) * 0.05; b.g.rotation.y += dt * 1.2; }
      // bots
      for (const b of bots) {
        b.g.visible = here && RACE.botsOn && b.bi < RACE.botsN && (RACE.state === 'count' || RACE.state === 'run' || RACE.state === 'over');
        if (!b.g.visible) continue;
        const t = Math.max(0, raceNow()) / 1000, done = routeAt(t, b.f, b.pos);
        const ph = t * 6 + b.f * 10, bob = done || t <= 0 ? 0 : Math.abs(Math.sin(ph)) * 0.05;
        b.g.position.set(b.pos.x, b.pos.y + 1.5 + bob, b.pos.z);
        b.g.rotation.y = 0;
      }
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
      P.in.jump = !!k.Space || !!P.jumpPulse; P.jumpPulse = false; P.in.slide = !!(k.KeyC || k.ControlLeft);
      const targetEye = P.slideT > 0 ? 0.9 : 1.6;
      P.eye += (targetEye - P.eye) * (1 - Math.exp(-dt * 12));
      camera.position.set(0, P.eye, 0);
      camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
      return true;
    };
    L.eyeHeight = () => P.eye;
    // the player list in the HUD: finish times, or how far along each racer is
    L.rowFor = (st, isMe) => {
      const pk = !isMe && st && st.pk && st.pk[0] === RACE.id ? st.pk : null;
      const fin = isMe ? RACE.myFinish : pk ? pk[2] : 0, prog = isMe ? myProgress() : pk ? pk[4] / 10 : 0;
      return { fin, prog, text: fin ? `${(fin / 1000).toFixed(1)} s` : RACE.state === 'run' ? `${Math.round(prog / 1.8)}%` : '-' };
    };
    L.sortRows = (a, b) => (a.fin && b.fin ? a.fin - b.fin : a.fin ? -1 : b.fin ? 1 : (b.prog || 0) - (a.prog || 0));
    L.clampPlayer = () => [0, 0];
    L.onUse = () => {
      if (state.mode !== 'flat') return false;
      if (state.keys.KeyE) { if (P.zone) { releaseFlat(false); return true; } if (!P.grounded || true) { if (grabFlat()) return true; } }
      return state.keys.Space ? true : false;
    };
    L.onKey = (code) => {
      if (state.mode === 'flat') {
        if (code === 'KeyQ' || code === 'KeyF') { if (P.drink) drinkNow(); else showToast('No drink: walk onto a bottle first'); return; }
        if (code === 'KeyR') { respawn(); return; }
      }
      if (/^Digit[1-9]$/.test(code) && Number(code.slice(5)) <= LEVEL_META.length) switchLevel(Number(code.slice(5)) - 1);
    };
    L.hudActions = [
      { label: () => (RACE.state === 'idle' || RACE.state === 'over' ? 'Start race' : 'Restart race'), run: () => startRace() },
      { label: () => 'Drink', run: () => { if (P.drink) drinkNow(); } },
      { label: () => `Course: ${C.name}`, run: () => nextCourse() },
      { label: () => (P.zone ? 'Let go' : 'Grab'), run: () => { if (P.zone) releaseFlat(false); else grabFlat(); } },
      { label: () => 'Jump', run: () => { if (P.zone) releaseFlat(true); else P.jumpPulse = true; } },
    ];
    L.hintsFor = () => (state.mode === 'flat' ? [['WASD', 'run'], ['Space', 'jump'], ['E', 'grab or let go'], ['C', 'slide'], ['Q', 'drink'], ['R', 'back to checkpoint']] : L.hints);
    L.hints = [['Grip', 'grab holds and pull'], ['Stick', 'run'], ['A / X', 'jump'], ['Sip a bottle', 'power-up']];
    L.spawn = () => { toStart(); };
    L.onEnter = () => { RACE.state = 'idle'; RACE.myFinish = 0; resetDrinks(); toStart(); hudKey = ''; boardKey = ''; };
    L.onExit = () => { hudPlate.visible = false; if (ui.status) ui.status.hidden = true; for (const b of bots) b.g.visible = false; };
    L.attract = (now) => { camera.position.set(Math.sin(now * 0.0002) * 3, 3, 8); camera.lookAt(0, 4, -40); };

    // ---------------------------------------------------------------- network
    L.presence = () => ({ pk: [RACE.id, Math.floor(RACE.startAt / 100) % 1e9, RACE.myFinish, P.cpIdx, Math.round(myProgress() * 10), RACE.botsN, L.courseIdx] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.pk;
      if (!(Array.isArray(a) && (a.length === 6 || a.length === 7) && a.every((x) => typeof x === 'number' && isFinite(x)))) { st.pk = null; return; }
      st.pk = a;
      // someone started a race: join it if the countdown hasn't finished
      if (a[0] > RACE.id && state.level === L.idx) {
        const startAt = a[1] * 100 + Math.floor(Date.now() / 1e11) * 1e11;
        if (startAt > Date.now() - 500) {
          if (a.length === 7 && a[6] !== L.courseIdx) useCourse(a[6]);
          RACE.id = a[0]; RACE.startAt = startAt; RACE.state = 'count'; RACE.myFinish = 0; RACE.over = false; RACE.botsN = clamp(Math.round(a[5]), 0, bots.length); RACE.botsOn = RACE.botsN > 0;
          resetDrinks(); toStart(); boardKey = ''; showToast(`${rec.name} started a race on ${C.name}! Get ready\u2026`);
        }
      }
    };
    L.parkourInternals = { P, RACE, DRINK, startRace, step, grabFlat, releaseFlat, drinkNow, findHold, rampAt, supportAt, standings, bots, respawn, finishRace, routeAt, tryMantle, useCourse, COURSES };
    // the course's own pieces, whichever course is chosen
    for (const [k, get] of Object.entries({ SOL: () => SOL, RAMPS: () => RAMPS, HOLDS: () => HOLDS, ZONES: () => ZONES, CPS: () => CPS, bottles: () => bottles, ROUTE_T: () => ROUTE_T, C: () => C })) Object.defineProperty(L.parkourInternals, k, { get, enumerable: true });
    ENDGAME.on(L, { shared: true, active: () => RACE.state !== 'idle', end: () => { RACE.state = 'idle'; RACE.myFinish = 0; resetDrinks(); toStart(); hudKey = ''; boardKey = ''; state.dirtyBoard = true; forcePresence(); return 'Start a race when everyone’s ready.'; } });
    return L;
  })();

