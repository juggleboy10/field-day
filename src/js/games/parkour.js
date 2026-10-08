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
    const KILL_Y = -6, FINISH_Z = -169.5, FINISH_Y = 7.9, COUNT_MS = 4000;
    const _t = new V3(), _u = new V3(), _cp = new V3(), _cq = new Q4(), _fw = new V3();

    // ---------------------------------------------------------------- the course
    const concrete = lam(0x8a8274), darkc = lam(0x6b5a8a), steel = lam(0xc8ccd6), slideMat = lam(0x3fc8ff);
    const SOL = [], RAMPS = [], HOLDS = [], ZONES = [], MOVERS = [];
    function solid(x0, x1, y0, y1, z0, z1, mat, extra) {
      const mesh = addBox(G, x1 - x0, y1 - y0, z1 - z0, mat || concrete, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      const s = Object.assign({ x0, x1, y0, y1, z0, z1, mesh }, extra || {});
      SOL.push(s);
      return s;
    }
    const plat = (cx, cz, w, d, top, mat) => solid(cx - w / 2, cx + w / 2, top - 0.7, top, cz - d / 2, cz + d / 2, mat);
    // the water far below
    const water = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ color: 0x2a74b0 }));
    water.rotation.x = -Math.PI / 2; water.position.set(0, -8, -80); G.add(water);
    // a skyline
    { const r = mulberry32(77);
      for (let i = 0; i < 46; i++) {
        const x = (r() < 0.5 ? -1 : 1) * (22 + r() * 70), z = 20 - r() * 230, h = 14 + r() * 60, w = 6 + r() * 12;
        addBox(G, w, h, w, lam(new THREE.Color().setHSL(0.72, 0.25, 0.16 + r() * 0.12).getHex()), x, h / 2 - 10, z);
      } }
    // 1. the start, and stepping stones
    plat(0, -1, 8, 14, 0, concrete);
    [[1.4, -12, 0], [-1.4, -17, 0.3], [1.2, -22, 0.6], [-1.2, -27, 0.3]].forEach(([x, z, y]) => plat(x, z, 2.4, 2.4, y, darkc));
    // 2. the climbing wall (and the base in front of it)
    plat(0, -35.7, 8, 11.4, 0, concrete);
    solid(-4, 4, -0.7, 7, -42.2, -41.4, lam(0x8a7ab0));
    plat(0, -47.1, 8, 9.8, 7, concrete);
    // 3. monkey bars over the gap, and the platform after
    plat(0, -68.3, 8, 7.4, 7, concrete);
    // 4. the slide, and the platform it lands on
    const SLIDE = { x0: -1.7, x1: 1.7, zTop: -72, zBot: -96, yTop: 7, yBot: 0.2 };
    RAMPS.push(SLIDE);
    plat(0, -100, 8, 8, 0.2, concrete);
    // 5. moving platforms
    [[-108.5, 0], [-113, 0.37], [-117.5, 0.71]].forEach(([z, ph]) => {
      const s = solid(-1.3, 1.3, -0.5, 0.2, z - 1.3, z + 1.3, lam(0xff9a3a), { mover: { z, ph } });
      MOVERS.push(s);
    });
    plat(0, -122.2, 8, 3.6, 0.2, concrete);
    // 6. poles, and the platform after
    plat(0, -147.8, 8, 4.4, 0.2, concrete);
    // 7. the beam, the foot of the tower, and the tower
    solid(-0.3, 0.3, -0.2, 0.2, -160, -150, lam(0xe8b54a));
    plat(0, -164, 8, 8, 0.2, concrete);
    solid(-4, 4, -0.7, 8.2, -169, -168, lam(0x8a7ab0));
    plat(0, -174, 8, 10, 8.2, concrete);
    // checkpoints: where you come back after a fall
    const CPS = [
      { x: 0, y: 0, z: 3, rect: null }, { x: 0, y: 0, z: -33, rect: [-4, 4, -41, -30.5] }, { x: 0, y: 7, z: -46, rect: [-4, 4, -52, -42.5] },
      { x: 0, y: 0.2, z: -100, rect: [-4, 4, -104, -96.2] }, { x: 0, y: 0.2, z: -122, rect: [-4, 4, -124, -120.4] },
      { x: 0, y: 0.2, z: -148, rect: [-4, 4, -150, -145.6] }, { x: 0, y: 0.2, z: -164, rect: [-4, 4, -168, -160.2] },
    ];
    // the slide itself, with rails
    { const len = Math.hypot(SLIDE.zTop - SLIDE.zBot, SLIDE.yTop - SLIDE.yBot), ang = Math.atan2(SLIDE.yTop - SLIDE.yBot, SLIDE.zTop - SLIDE.zBot);
      const m = new THREE.Mesh(boxg(SLIDE.x1 - SLIDE.x0, 0.3, len), slideMat);
      m.position.set(0, (SLIDE.yTop + SLIDE.yBot) / 2 - 0.15 / Math.cos(ang), (SLIDE.zTop + SLIDE.zBot) / 2); m.rotation.x = -ang; G.add(m);
      const rampY = (z) => SLIDE.yBot + (SLIDE.yTop - SLIDE.yBot) * (z - SLIDE.zBot) / (SLIDE.zTop - SLIDE.zBot);
      for (let z = SLIDE.zBot; z < SLIDE.zTop - 0.1; z += 3) for (const sx of [-1, 1]) {
        const zl = z, zh = Math.min(z + 3, SLIDE.zTop);
        solid(sx > 0 ? SLIDE.x1 : SLIDE.x0 - 0.2, sx > 0 ? SLIDE.x1 + 0.2 : SLIDE.x0, rampY(zl) - 0.3, rampY(zh) + 0.9, zl, zh, lam(0xff4d8a));
      } }
    // holds: climbing walls (pegs), the monkey bars, the poles
    const pegGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.26, 8); pegGeo.rotateX(Math.PI / 2);
    const pegPts = [];
    function climbWall(x0, x1, zFace, yBase, yTop, wallTopY, mantleZ, seed) {
      const r = mulberry32(seed);
      const Z = { kind: 'wall', z: zFace, nz: 1, x0, x1, y0: yBase, y1: wallTopY, topY: wallTopY, mantleZ };
      for (let row = 0, y = yBase; y <= yTop; row++, y += 0.7) for (let x = x0 + 0.3 + (row % 2) * 0.45; x <= x1 - 0.3; x += 0.9) {
        const p = new V3(x + (r() - 0.5) * 0.2, y + (r() - 0.5) * 0.15, zFace + 0.12);
        pegPts.push(p); HOLDS.push({ a: p, b: p, r: 0.1, wall: Z });
      }
      HOLDS.push({ a: new V3(x0, wallTopY, zFace), b: new V3(x1, wallTopY, zFace), r: 0.12, wall: Z, lip: true });   // the lip at the top
      // a bright strip along the lip, so it reads as something to grab
      addBox(G, x1 - x0, 0.07, 0.1, lam(0xffd23f), (x0 + x1) / 2, wallTopY - 0.04, zFace + 0.055);
      ZONES.push(Z);
    }
    climbWall(-2.7, 2.7, -41.4, 0.9, 6.6, 7, -43.2, 11);
    climbWall(-2.7, 2.7, -168, 0.9, 7.95, 8.2, -170, 12);    // top row at 7.9, just under the lip
    { const im = new THREE.InstancedMesh(pegGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), pegPts.length), d = new THREE.Object3D(), c = new THREE.Color();
      pegPts.forEach((p, i) => { d.position.set(p.x, p.y, p.z - 0.06 + 0.0); d.updateMatrix(); im.setMatrixAt(i, d.matrix); im.setColorAt(i, c.setHSL((i * 0.137) % 1, 0.8, 0.6)); });
      im.frustumCulled = false; G.add(im); }
    // monkey bars: rungs every metre, between two frames
    { const BAR_Y = 9.2, rungs = [];
      for (let z = -53; z >= -65.01; z -= 1) {
        const m = new THREE.Mesh(cyl(0.04, 0.04, 1.8, 8), steel); m.rotation.z = Math.PI / 2; m.position.set(0, BAR_Y, z); G.add(m);
        HOLDS.push({ a: new V3(-0.9, BAR_Y, z), b: new V3(0.9, BAR_Y, z), r: 0.05 });
      }
      for (const z of [-52.6, -65.4]) for (const sx of [-1, 1]) addBox(G, 0.14, 12, 0.14, darkc, sx * 1.0, BAR_Y - 5.5, z);
      for (const sx of [-1, 1]) addBox(G, 0.1, 0.1, 13, darkc, sx * 1.0, BAR_Y + 0.4, -59);
      ZONES.push({ kind: 'bars', y: BAR_Y, z0: -53, z1: -65, xHalf: 0.9 }); }
    // poles
    const POLES = [[1.3, -128.5], [-1.3, -133], [1.3, -137.5], [-1.3, -142]];
    POLES.forEach(([x, z]) => {
      const m = new THREE.Mesh(cyl(0.1, 0.1, 14, 10), lam(0xff9a3a)); m.position.set(x, -2.5, z); G.add(m);
      const cap = new THREE.Mesh(sph(0.16, 10, 8), lam(0xffd23f)); cap.position.set(x, 4.55, z); G.add(cap);
      HOLDS.push({ a: new V3(x, -9, z), b: new V3(x, 4.5, z), r: 0.1 });
      ZONES.push({ kind: 'pole', x, z, y0: -8, y1: 4.5 });
    });
    // signs and gates
    makePlate(G, 'SKYLINE SPRINT', 4.4, 0.7, new V3(0, 3.8, -7.4), 0, { bg: '#3a2a6a', fg: '#ffd23f', size: 0.7 });
    const gateSign = makePlate(G, 'Press START', 2.6, 0.5, new V3(0, 2.5, -7.3), 0, { bg: '#16142e', fg: '#8bd450', size: 0.6 });
    makePlate(G, 'FINISH', 4, 0.8, new V3(0, 11.2, -172.5), 0, { bg: '#d8f43a', fg: '#16142e', size: 0.75 });
    for (const sx of [-1, 1]) addBox(G, 0.3, 4, 0.3, lam(0xd8f43a), sx * 3.2, 10.2, -172.5);
    addBox(G, 6.9, 0.3, 0.3, lam(0xd8f43a), 0, 12.1, -172.5);

    // ---------------------------------------------------------------- the drinks
    const DRINK = {
      speed: { name: 'Zoom Fizz', color: 0xffd23f, secs: 7, line: 'faster' },
      jump: { name: 'Bounce Cola', color: 0x4fc3f7, secs: 7, line: 'super jumps' },
      grip: { name: 'Grip Gulp', color: 0xff5c8a, secs: 9, line: 'stronger climbing and flings' },
    };
    const DRINK_AT = [['speed', -2.4, 0, -5], ['grip', 2.4, 0, -37], ['jump', -2.4, 7, -46], ['speed', -1.4, 0.2, -101], ['jump', 1.4, 0.2, -101], ['jump', -2.4, 0.2, -122], ['grip', 2.4, 0.2, -163]];
    const glow = new THREE.SpriteMaterial({ map: warmGlowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, color: 0xffffff });
    const bottles = DRINK_AT.map(([k, x, y, z]) => {
      const g = new THREE.Group();
      const body = new THREE.Mesh(cyl(0.05, 0.055, 0.2, 12), new THREE.MeshLambertMaterial({ color: DRINK[k].color, emissive: DRINK[k].color, emissiveIntensity: 0.3 }));
      const neck = new THREE.Mesh(cyl(0.022, 0.04, 0.08, 10), lam(0xf4f2ec)); neck.position.y = 0.14;
      const cap = new THREE.Mesh(cyl(0.026, 0.026, 0.03, 10), lam(0x232640)); cap.position.y = 0.2;
      const gl = new THREE.Sprite(glow.clone()); gl.material.color.setHex(DRINK[k].color); gl.scale.set(0.7, 0.7, 1);
      g.add(body, neck, cap, gl); g.scale.setScalar(1.35);
      addBox(G, 0.3, 0.9, 0.3, darkc, x, y + 0.45, z);
      g.position.set(x, y + 1.15, z); G.add(g);
      return { k, g, home: new V3(x, y + 1.15, z), taken: false, held: null };
    });

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
    const rampAt = (x, z) => {
      for (const r of RAMPS) if (x > r.x0 - 0.1 && x < r.x1 + 0.1 && z <= r.zTop && z >= r.zBot) return r.yBot + (r.yTop - r.yBot) * (z - r.zBot) / (r.zTop - r.zBot);
      return null;
    };
    // the highest thing under your feet that you can stand on
    function supportAt(bx, bz, feetY, slack) {
      let best = -Infinity, ref = null;
      for (const s of SOL) if (bx > s.x0 - 0.12 && bx < s.x1 + 0.12 && bz > s.z0 - 0.12 && bz < s.z1 + 0.12 && s.y1 <= feetY + slack && s.y1 > best) { best = s.y1; ref = s; }
      const ry = rampAt(bx, bz);
      if (ry !== null && ry <= feetY + slack + 0.2 && ry > best) { best = ry; ref = RAMPS[0]; }
      return ref ? { y: best, ref } : null;
    }
    function pushOut() {
      const [bx, bz] = bodyXZ(), fy = dolly.position.y;
      for (const s of SOL) {
        if (!(s.y1 > fy + STEP && s.y0 < fy + 1.6)) continue;
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
    const RACE = { id: 0, state: 'idle', startAt: 0, botsOn: false, myFinish: 0, over: false, seqShown: -1, goneT: 0 };
    L.race = RACE;
    const BOT_DEF = [{ name: 'Parkour Pete', color: '#ff8a4a', f: 0.66, hat: 1, face: 1 }, { name: 'Vault Val', color: '#8bd450', f: 0.76, hat: 2, face: 2 }, { name: 'Rooftop Rex', color: '#b388ff', f: 0.86, hat: 0, face: 3 }];
    const ROUTE = [
      [0, 0, 3, 0], [1.4, 0, -12, 5.2], [-1.4, 0.3, -17, 4.4], [1.2, 0.6, -22, 4.4], [-1.2, 0.3, -27, 4.4], [0, 0, -32, 4.4], [0, 0, -40.6, 5.2],
      [0, 7, -41.2, 1.25], [0, 7, -48, 5], [0, 7, -53, 3], [0, 7, -65, 1.7], [0, 7, -71, 4.5], [0, 0.2, -96, 8], [0, 0.2, -103, 5],
      [0, 0.2, -120, 3.4], [0, 0.2, -124, 4.6], [0, 0.2, -145.6, 3.6], [0, 0.2, -150, 4.6], [0, 0.2, -166, 3], [0, 8.2, -168, 1.15], [0, 8.2, -176, 5],
    ];
    const ROUTE_T = [0];
    for (let i = 1; i < ROUTE.length; i++) { const a = ROUTE[i - 1], b = ROUTE[i]; ROUTE_T.push(ROUTE_T[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) / b[3]); }
    function routeAt(t, f, out) {      // where a bot is, t seconds into the race, at pace f
      const tt = t * f;
      if (tt <= 0) { out.set(ROUTE[0][0], ROUTE[0][1], ROUTE[0][2]); return 0; }
      if (tt >= ROUTE_T[ROUTE_T.length - 1]) { const e = ROUTE[ROUTE.length - 1]; out.set(e[0], e[1], e[2]); return 1; }
      let i = 1; while (ROUTE_T[i] < tt) i++;
      const k = (tt - ROUTE_T[i - 1]) / (ROUTE_T[i] - ROUTE_T[i - 1]), a = ROUTE[i - 1], b = ROUTE[i];
      out.set(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k);
      return 0;
    }
    const bots = BOT_DEF.map((d) => {
      const g = buildAvatar(d.color, d.hat, d.face, true, 1, 2);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = '#fff'; c.font = `700 28px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(d.name, 128, 33, 230); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.9, 0.225, 1); tag.position.y = 0.42; g.add(tag); g.visible = false; G.add(g);
      return Object.assign({ g, finishT: ROUTE_T[ROUTE_T.length - 1] / d.f, pos: new V3() }, d);
    });
    const raceNow = () => (RACE.state === 'idle' ? 0 : Date.now() - RACE.startAt);
    const myProgress = () => { const [, bz] = bodyXZ(); return clamp(3 - bz, 0, 180) + Math.max(0, dolly.position.y) * 0.4; };
    function standings() {
      const rows = [];
      rows.push({ name: state.name || 'You', me: true, fin: RACE.myFinish, prog: myProgress() });
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.pk && st.pk[0] === RACE.id) rows.push({ name: rec.name, fin: st.pk[2], prog: st.pk[4] / 10 }); }
      if (RACE.botsOn) { const t = Math.max(0, raceNow()) / 1000; for (const b of bots) rows.push({ name: b.name, bot: true, fin: t >= b.finishT ? Math.round(b.finishT * 1000) : 0, prog: Math.min(180, (t * b.f / ROUTE_T[ROUTE_T.length - 1]) * 180) }); }
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
      RACE.id = Math.floor(Date.now() / 1000); RACE.startAt = Date.now() + COUNT_MS; RACE.state = 'count'; RACE.myFinish = 0; RACE.over = false; RACE.seqShown = -1;
      const others = [...remotes.values()].filter((r) => r.lv === L.idx && r.inGame).length;
      RACE.botsOn = others === 0;
      resetDrinks(); toStart(); boardKey = '';
      showToast(RACE.botsOn ? 'Race against the bots! Get ready\u2026' : 'Race! Get ready\u2026');
      forcePresence();
    }
    function finishRace() {
      RACE.myFinish = Math.round(raceNow()); RACE.state = 'over'; RACE.over = true;
      const rank = standings().findIndex((r) => r.me) + 1;
      showToast(`Finished in ${(RACE.myFinish / 1000).toFixed(1)} s! ${rank === 1 ? '1st place!' : `Place ${rank}`}`);
      sfx('fanfare', 1); setTimeout(() => sfx('cheer', 0.8), 250);
      forcePresence();
    }
    makeButton(L, new V3(2.4, 1.0, -1.6), 0x8bd450, 'START race', () => startRace(), { faceYaw: 0 });
    makeButton(L, new V3(2.4, 1.0, 0.2), 0xff7a3a, 'Back to start', () => { toStart(); showToast('Back at the start'); }, { faceYaw: 0 });
    makeKiosk(L, -3.4, 2.4, Math.PI / 2);

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
      dt = Math.min(dt, 1 / 30);
      updateMovers(Date.now());
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
        const onRamp = P.grounded && P.support && P.support.ref === RAMPS[0];
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
            if (sup.ref === RAMPS[0]) { const sl = (SLIDE.yTop - SLIDE.yBot) / (SLIDE.zTop - SLIDE.zBot); P.vel.y = sl * P.vel.z; } else P.vel.y = 0;
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
      return parts.join('  \u00b7  ') || 'Skyline Sprint';
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
        b.g.visible = here && RACE.botsOn && (RACE.state === 'count' || RACE.state === 'run' || RACE.state === 'over');
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
    L.presence = () => ({ pk: [RACE.id, Math.floor(RACE.startAt / 100) % 1e9, RACE.myFinish, P.cpIdx, Math.round(myProgress() * 10), RACE.botsOn ? 1 : 0] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.pk;
      if (!(Array.isArray(a) && a.length === 6 && a.every((x) => typeof x === 'number' && isFinite(x)))) { st.pk = null; return; }
      st.pk = a;
      // someone started a race: join it if the countdown hasn't finished
      if (a[0] > RACE.id && state.level === L.idx) {
        const startAt = a[1] * 100 + Math.floor(Date.now() / 1e11) * 1e11;
        if (startAt > Date.now() - 500) {
          RACE.id = a[0]; RACE.startAt = startAt; RACE.state = 'count'; RACE.myFinish = 0; RACE.over = false; RACE.botsOn = a[5] === 1;
          resetDrinks(); toStart(); boardKey = ''; showToast(`${rec.name} started a race! Get ready\u2026`);
        }
      }
    };
    L.parkourInternals = { SOL, RAMPS, HOLDS, ZONES, CPS, bottles, DRINK, startRace, step, grabFlat, releaseFlat, drinkNow, findHold, rampAt, supportAt, standings, ROUTE_T, bots, respawn, finishRace, routeAt, tryMantle };
    return L;
  })();

