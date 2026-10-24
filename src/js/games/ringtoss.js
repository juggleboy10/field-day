  // ================================================================ LEVEL: RING TOSS (carnival)
  // A table packed with bottles. Toss ten rings: one that drops over a bottle's neck is a ringer. Green bottles
  // pay 3 tickets, red ones 6, and the gold bottle in the middle 15. Close isn't good enough: rings that clip a
  // neck clatter off.
  // VR: squeeze to take a ring and toss it underhand. Browser: aim with the mouse (fine aim; your hand wobbles),
  // hold Space to steady it and let go to toss.
  const ringtoss = (() => {
    const L = newLevel(45);
    const G = L.group;
    const rand = mulberry32(4545);
    L.grabless = true;
    L.chargeKick = true;
    L.bounds = { minX: -7, maxX: 7, minZ: -0.2, maxZ: 6 };
    L.env = CARNIVAL.env();
    const fair = CARNIVAL.backdrop(G, rand, { pathW: 13, pathD: 7, pathZ: 2.2, wheelX: -14 });
    const N = 3, PITCH = 3.6, BW = 3.0, BD = 2.8, BZ = -1.7, RINGS = 10;
    const boothX = (k) => (k - (N - 1) / 2) * PITCH;
    const TY = 0.9, NECK_Y = TY + 0.3, COLS = 5, ROWS_N = 4, GAP = 0.21, TZ = BZ - 0.2;
    const CATCH = 0.045, CLIP = 0.085, RR = 0.08;
    for (let k = 0; k < N; k++) CARNIVAL.booth(G, boothX(k), BZ, BW, BD, 'RING TOSS', ['#4a7ad8', '#e5453a', '#9a5ad8'][k], '#f4f2ec');
    // ---------------------------------------------------------------- tables and bottles
    const glass = [new THREE.MeshLambertMaterial({ color: 0x3a9a5a, transparent: true, opacity: 0.85 }), new THREE.MeshLambertMaterial({ color: 0xd83a3a, transparent: true, opacity: 0.85 }), new THREE.MeshLambertMaterial({ color: 0xffc83a, emissive: 0x5a3a00 })];
    const PAY = [3, 6, 15];
    const bottles = [];
    for (let k = 0; k < N; k++) {
      const x0 = boothX(k);
      addBox(G, COLS * GAP + 0.3, TY, ROWS_N * GAP + 0.3, lam(0x8a2a5a), x0, TY / 2, TZ);
      addBox(G, COLS * GAP + 0.34, 0.03, ROWS_N * GAP + 0.34, lam(0xf4f2ec), x0, TY + 0.015, TZ);
      const list = [];
      for (let r = 0; r < ROWS_N; r++) for (let c = 0; c < COLS; c++) {
        const x = x0 + (c - (COLS - 1) / 2) * GAP, z = TZ + (r - (ROWS_N - 1) / 2) * GAP;
        const type = r === 1 && c === 2 ? 2 : (r * COLS + c) % 4 === 1 ? 1 : 0;
        const g = new THREE.Group(); g.position.set(x, TY + 0.03, z); G.add(g);
        g.add(at(new THREE.Mesh(cyl(0.035, 0.035, 0.17, 10), glass[type]), 0, 0.085, 0), at(new THREE.Mesh(cyl(0.012, 0.035, 0.05, 10), glass[type]), 0, 0.195, 0), at(new THREE.Mesh(cyl(0.012, 0.012, 0.06, 8), glass[type]), 0, 0.25, 0));
        list.push({ x, z, type, g });
      }
      bottles.push(list);
    }
    // ---------------------------------------------------------------- rings
    const RING_COLS = [0xff4d8a, 0x4fc3f7, 0xffd23f, 0x8bd450, 0xff9a3a];
    function makeRing(i) { const m = new THREE.Mesh(new THREE.TorusGeometry(RR, 0.009, 8, 24), lam(RING_COLS[i % RING_COLS.length])); m.rotation.x = Math.PI / 2; m.visible = false; G.add(m); return m; }
    const rings = [];
    for (let i = 0; i < RINGS; i++) rings.push({ m: makeRing(i), st: 'none', p: new V3(), v: new V3(), spin: 0, bottle: null });
    const bucket = (k) => new V3(boothX(k) + BW / 2 - 0.35, 1.06, BZ + BD / 2 - 0.2);
    for (let k = 0; k < N; k++) { const b = bucket(k); addCyl(G, 0.13, 0.11, 0.18, 12, lam(0x6a6a7a), b.x, b.y + 0.06, b.z); }
    // ---------------------------------------------------------------- the game
    const T = { k: 0, ph: 'idle', thrown: 0, ringers: 0, tickets: 0, best: 0, held: null, flying: null };
    try { if (Number.isInteger(prefs.ringBest)) T.best = prefs.ringBest; } catch (e) { /* none */ }
    L.ring = T;
    function mySlot() { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); ids.sort(); return Math.max(0, ids.indexOf(state.myPeer)) % N; }
    function standAtBooth() {
      T.k = mySlot();
      const c = new V3(); camera.getWorldPosition(c);
      dolly.position.x += boothX(T.k) - c.x; dolly.position.z += 0.35 - c.z;
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.35; aim.last = null; aim.yaw = 0; aim.pitch = -0.35; }
    }
    function newGame() {
      Object.assign(T, { ph: 'play', thrown: 0, ringers: 0, tickets: 0, held: null, flying: null });
      for (const r of rings) { r.st = 'none'; r.m.visible = false; r.bottle = null; }
      sfx('coin', 0.7); showToast('Ten rings. Green 3 tickets, red 6, gold 15');
      forcePresence(); state.dirtyBoard = true;
    }
    L.newGame = newGame;
    function endGame() {
      T.ph = 'over';
      if (T.ringers > T.best) { T.best = T.ringers; prefs.ringBest = T.best; savePrefs(); }
      RECORDS.add(L, 'ringers', T.ringers); RECORDS.add(L, 'tickets', T.tickets);
      showToast(`${T.ringers} ringer${T.ringers === 1 ? '' : 's'} from ${RINGS} rings: ${T.tickets} tickets in all`);
      sfx(T.ringers >= 3 ? 'fanfare' : 'chime', 0.8);
      forcePresence(); state.dirtyBoard = true;
    }
    function launch(from, vel) {
      if (T.ph !== 'play') newGame();
      const r = rings[T.thrown]; T.thrown += 1;
      r.st = 'fly'; r.p.copy(from); r.v.copy(vel); r.spin = 8 + rand() * 6; r.m.visible = true; r.m.rotation.set(Math.PI / 2, 0, 0);
      T.flying = r; sfx('whoosh', 0.3);
      forcePresence();
    }
    L.launch = launch;
    const nearest = (p) => { let best = null, bd = 1e9; for (const b of bottles[T.k]) { const d = Math.hypot(b.x - p.x, b.z - p.z); if (d < bd) { bd = d; best = b; } } return [best, bd]; };
    function ringStep(r, dt) {
      if (r.st !== 'fly') return;
      const py = r.p.y;
      r.v.y -= 9.8 * dt; r.p.addScaledVector(r.v, dt);
      r.m.rotation.z += r.spin * dt;
      // coming down past the necks
      if (py >= NECK_Y && r.p.y < NECK_Y && r.v.y < 0) {
        const [b, d] = nearest(r.p);
        if (b && d < CATCH) { r.st = 'on'; r.bottle = b; r.p.set(b.x, NECK_Y - 0.12, b.z); ringer(b); return; }
        if (b && d < CLIP) { sfx('clang', 0.5); tone(1800, 1200, 0.08, 'triangle', 0.08); const dx = r.p.x - b.x, dz = r.p.z - b.z; r.v.x = dx / d * 0.6 + (rand() - 0.5) * 0.4; r.v.z = dz / d * 0.6 + (rand() - 0.5) * 0.4; r.v.y = 0.3; r.p.y = NECK_Y + 0.01; }
      }
      // the table, or the floor
      const onTable = Math.abs(r.p.x - boothX(T.k)) < COLS * GAP / 2 + 0.15 && Math.abs(r.p.z - TZ) < ROWS_N * GAP / 2 + 0.15;
      const floorY = onTable ? TY + 0.04 : 0.02;
      if (r.p.y <= floorY) { r.p.y = floorY; r.st = 'down'; sfx('wood', 0.3); missed(); }
      if (r.p.z < BZ - BD / 2 + 0.1) { r.p.z = BZ - BD / 2 + 0.1; r.v.z = 0.3; }
    }
    L.ringStep = ringStep;
    function ringer(b) {
      T.ringers += 1; const n = PAY[b.type]; T.tickets += n;
      spawnFloat(b.type === 2 ? 'GOLD RINGER!' : 'Ringer!', new V3(b.x, NECK_Y + 0.4, b.z + 0.2), b.type === 2 ? '#ffd23f' : '#8bd450');
      sfx(b.type === 2 ? 'fanfare' : 'chime', 0.8); tone(1320, 1760, 0.15, 'triangle', 0.15);
      CARNIVAL.tickets(n, new V3(b.x, NECK_Y + 0.7, b.z + 0.2));
      after();
    }
    function missed() { after(); }
    function after() { T.flying = null; forcePresence(); state.dirtyBoard = true; if (T.thrown >= RINGS) setTimeout(() => { if (T.ph === 'play' && T.thrown >= RINGS && !T.flying) endGame(); }, 600); }
    // ---------------------------------------------------------------- browser aiming: fine aim, a wobble, Space steadies
    const aim = { yaw: 0, pitch: -0.35, last: null, lastP: null };
    L.flatCamera = () => {
      if (aim.last === null) { aim.last = state.yaw; aim.lastP = state.pitch; }
      aim.yaw += (state.yaw - aim.last) * 0.3; aim.pitch += (state.pitch - aim.lastP) * 0.3;
      aim.last = state.yaw; aim.lastP = state.pitch;
      aim.yaw = clamp(aim.yaw, -0.7, 0.7); aim.pitch = clamp(aim.pitch, -0.9, 0.3);
      camera.position.set(0, 1.65, -0.55);
      camera.rotation.set(aim.pitch, aim.yaw, 0, 'YXZ');
      return true;
    };
    function wobble(now) {
      const held = state.charge !== null ? (now - state.charge) / 1000 : 0;
      const k = state.charge === null ? 1 : held < 1 ? 1 - 0.7 * held : Math.min(1.6, 0.3 + (held - 1) * 1.2);
      const t = now / 1000;
      return [k * (Math.sin(t * 1.6) * 0.035 + Math.sin(t * 2.9 + 1) * 0.02), k * (Math.sin(t * 1.2 + 2) * 0.03 + Math.sin(t * 2.5) * 0.02)];
    }
    const _cp = new V3(), _q = new Q4(), _f = new V3();
    function aimPoint(now) {
      camera.getWorldPosition(_cp); camera.getWorldQuaternion(_q); _f.set(0, 0, -1).applyQuaternion(_q);
      if (_f.y > -0.05) return null;
      const t = (NECK_Y - _cp.y) / _f.y, w = wobble(now);
      return new V3(_cp.x + _f.x * t + w[0], NECK_Y, _cp.z + _f.z * t + w[1]);
    }
    L.aimPoint = aimPoint;
    // a lob that comes down through the neck height at the spot
    function lobTo(from, to, apex) {
      const vy = Math.sqrt(2 * 9.8 * (apex - from.y)), T2 = vy / 9.8 + Math.sqrt(2 * (apex - to.y) / 9.8);
      return new V3((to.x - from.x) / T2, vy, (to.z - from.z) / T2);
    }
    L.lobTo = lobTo;
    const reticle = new THREE.Mesh(new THREE.RingGeometry(RR - 0.012, RR, 24), new THREE.MeshBasicMaterial({ color: 0x8bff6a, transparent: true, opacity: 0.8, depthTest: false })); reticle.rotation.x = -Math.PI / 2; reticle.renderOrder = 998; G.add(reticle);
    const canThrow = () => T.ph !== 'play' || (!T.flying && T.thrown < RINGS);
    L.kick = () => {
      if (!canThrow()) return;
      if (T.ph !== 'play') { newGame(); return; }
      const p = aimPoint(performance.now()); if (!p) return;
      camera.getWorldPosition(_cp);
      const from = _cp.clone().add(new V3(0.15, -0.35, -0.3));
      launch(from, lobTo(from, p, Math.max(NECK_Y, from.y) + 0.45));
    };
    L.throwLabel = () => (T.ph !== 'play' ? 'Start' : 'Toss');
    // VR: squeeze anywhere for a ring, toss it
    L.onVRGrab = (h) => {
      if (T.ph !== 'play') newGame();
      if (!canThrow() || T.held) return false;
      T.held = h.side; sfx('grab', 0.3);
      return true;
    };
    L.onVRRelease = (h, vel) => {
      if (T.held !== h.side) return;
      T.held = null;
      if (vel.length() < 0.8) return;
      launch(myHands[h.side].pos.clone(), vel.clone());
    };
    // ---------------------------------------------------------------- per frame
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      fair.tick(dt);
      prizes.tick();
      if (!here) { reticle.visible = false; return; }
      if (mySlot() !== T.k) standAtBooth();
      const n = Math.max(1, Math.ceil(dt / 0.004));
      for (const r of rings) for (let i = 0; i < n; i++) ringStep(r, dt / n);
      for (const r of rings) {
        if (r.st === 'none') continue;
        if (r.st === 'on') { r.p.y = Math.max(TY + 0.12, r.p.y - dt * 0.6); }
        r.m.position.copy(r.p);
      }
      // the ring in my hand (VR), and the stack still to throw in the bucket
      if (T.held) { const r = rings[T.thrown]; if (r) { r.m.visible = true; r.m.position.copy(myHands[T.held].pos).add(new V3(0, 0, -0.1).applyQuaternion(myHands[T.held].quat)); r.m.rotation.set(Math.PI / 2, 0, 0); } }
      const p = state.mode === 'flat' && T.ph === 'play' && canThrow() ? aimPoint(now) : null;
      reticle.visible = !!p; if (p) reticle.position.set(p.x, NECK_Y + 0.002, p.z);
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = T.ph === 'play' ? `Ring ${Math.min(RINGS, T.thrown + 1)} of ${RINGS}  ·  ${T.ringers} ringers  ·  ${T.tickets} tickets  ·  hold Space to steady` : `Ring Toss  ·  press Space to start  ·  best ${T.best} ringers`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.presence = () => ({ rt: [T.k, T.ringers, T.best, T.ph === 'play' ? 1 : 0] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.rt;
      if (!Array.isArray(a) || a.length !== 4 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e6) || a[0] >= N) { st.rt = null; return; }
      if (!st.rt || st.rt[1] !== a[1] || st.rt[2] !== a[2]) state.dirtyBoard = true;
      st.rt = a;
    };
    L.rowFor = (st, isMe) => { const b = isMe ? T.best : st.rt ? st.rt[2] : 0; return { best: b, text: `best ${b} ringer${b === 1 ? '' : 's'} of 10` }; };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, -6.3, 1.9, 2.6, Math.PI / 2);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#1a1020'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#8bd450'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Ringers', 36, 80);
      g.fillStyle = '#e8d8f0'; g.font = `400 24px ${BODY}`; g.fillText('Most ringers from ten rings', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 6.2, 4.8, -Math.PI * 0.75);
    RECORDS.def(L, [{ k: 'ringers', label: 'Most ringers from ten rings' }, { k: 'tickets', label: 'Most tickets in one game' }], { x: -6.3, z: 4.9, yaw: Math.PI / 2 });
    const prizes = CARNIVAL.prizeStand(L, 6.2, 1.6, -Math.PI / 2);   // spend your tickets here
    L.hudActions = [{ label: () => (T.ph === 'play' ? 'New game' : 'Start game'), run: () => newGame() }];
    L.hints = [['Grip', 'a ring appears in your hand'], ['Toss', 'underhand, a gentle lob'], ['Gold bottle', '15 tickets'], ['Prize stand', 'on the right: spend your tickets']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Mouse', 'aim (your hand wobbles)'], ['Hold Space', 'steady it, let go to toss'], ['Gold bottle', '15 tickets'], ['Prize stand', 'on the right: spend your tickets']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0.35); standAtBooth(); };
    L.onEnter = () => { aim.last = null; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; reticle.visible = false; T.held = null; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 3, 2.2, 4); camera.lookAt(0, 1.2, -2); };
    L.ringInternals = { T, rings, bottles, launch, ringStep, lobTo, aimPoint, newGame, NECK_Y, CATCH };
    MUSIC_THEMES.ringtoss = { gain: 0.7, bpm: 104, swing: 0.25, chords: ['G', 'Em', 'C', 'D'], comp: { inst: 'vibes', at: [0, 4, 8, 12], dur: 0.2 }, bass: { at: [0, 6, 8, 14] }, drums: { k: 'x.......x.......', h: '..o...o...o...o.' }, lead: { inst: 'musicbox', p: 0.3, up: 12 }, cut: 4000 };
    return L;
  })();
