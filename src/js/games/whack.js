  // ================================================================ LEVEL: WHACK-A-MOLE (carnival)
  // Nine holes, 45 seconds, and moles that pop up faster and faster. Bop one while it's up: 1 point, a golden mole
  // 3. Points pay out tickets for the Skee-Ball prize counter.
  // VR: a mallet in each hand; bop them. Browser: the keys Q W E / A S D / Z X C are the holes (in the same layout),
  // or aim at a mole and click.
  const whack = (() => {
    const L = newLevel(46);
    const G = L.group;
    const rand = mulberry32(4646);
    L.grabless = true;
    L.bounds = { minX: -7, maxX: 7, minZ: -3, maxZ: 6 };
    L.env = CARNIVAL.env();
    const fair = CARNIVAL.backdrop(G, rand, { pathW: 13, pathD: 7, pathZ: 2, wheelX: 16 });
    const N = 3, PITCH = 2.6, TOPY = 0.86, CZ = -0.35, HOLE = 0.24, ROUND = 45;
    const cabX = (k) => (k - (N - 1) / 2) * PITCH;
    const KEYS = ['KeyQ', 'KeyW', 'KeyE', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyX', 'KeyC'];
    // hole i: row 0 is the far row
    const holePos = (k, i, out) => out.set(cabX(k) + ((i % 3) - 1) * HOLE, TOPY, CZ + (Math.floor(i / 3) - 1) * HOLE);

    // ---------------------------------------------------------------- the cabinets
    const moles = [];
    for (let k = 0; k < N; k++) {
      const x = cabX(k);
      addBox(G, 0.95, TOPY, 0.95, lam(0x3a7a3a), x, TOPY / 2, CZ);
      const topTex = canvasTexture(256, 256, (g) => { g.fillStyle = '#5aa84a'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 9; i++) { const cx = 256 / 2 + ((i % 3) - 1) * 66, cy = 256 / 2 + (Math.floor(i / 3) - 1) * 66; g.fillStyle = '#3a2414'; g.beginPath(); g.arc(cx, cy, 26, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffffff'; g.font = `700 16px ${BODY}`; g.textAlign = 'center'; g.fillText(KEYS[i].slice(3), cx + 26, cy + 30); } });
      const top = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshLambertMaterial({ map: topTex.tex })); top.rotation.x = -Math.PI / 2; top.position.set(x, TOPY + 0.002, CZ); G.add(top);
      addBox(G, 0.95, 0.9, 0.08, lam(0xe5453a), x, TOPY + 0.45, CZ - 0.5);
      makePlate(G, 'WHACK-A-MOLE', 0.95, 0.24, new V3(x, TOPY + 0.75, CZ - 0.45), 0, { bg: '#ffd23f', fg: '#3a2414', size: 0.6 });
      const sc = canvasTexture(256, 96);
      const score = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.22), new THREE.MeshBasicMaterial({ map: sc.tex })); score.position.set(x, TOPY + 0.42, CZ - 0.45); G.add(score);
      const list = [];
      for (let i = 0; i < 9; i++) {
        const g = new THREE.Group(), fur = new THREE.MeshLambertMaterial({ color: 0x8a5a3a, emissive: 0x000000 });
        g.add(at(new THREE.Mesh(cyl(0.07, 0.075, 0.16, 12), fur), 0, -0.08, 0), at(new THREE.Mesh(sph(0.07, 12, 10), fur), 0, 0.0, 0));
        g.add(at(new THREE.Mesh(sph(0.025, 8, 6), lam(0xff9ad0)), 0, -0.01, 0.065));
        for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.012, 6, 5), lam(0x111111)), sx * 0.025, 0.025, 0.06));
        const p = holePos(k, i, new V3()); g.position.set(p.x, TOPY - 0.12, p.z); G.add(g);
        list.push({ g, fur, up: 0, want: 0, until: 0, gold: false, hit: 0 });
      }
      moles.push({ list, sc, key: '' });
    }
    // ---------------------------------------------------------------- mallets (VR: one in each hand; browser: one that bops)
    function makeMallet() {
      const g = new THREE.Group();
      const h = new THREE.Mesh(cyl(0.015, 0.018, 0.3, 8), lam(0xc8945a)); h.rotation.x = Math.PI / 2; h.position.z = -0.1; g.add(h);
      const head = new THREE.Mesh(cyl(0.05, 0.05, 0.14, 12), lam(0xe5453a)); head.rotation.z = Math.PI / 2; head.position.z = -0.25; g.add(head);
      return g;
    }
    const mallets = { left: makeMallet(), right: makeMallet() };
    for (const s of SIDES) L.overlay.add(mallets[s]);
    const flatMallet = makeMallet(); L.overlay.add(flatMallet);
    const HEAD_OFF = new V3(0, 0, -0.25);

    // ---------------------------------------------------------------- the round
    const W = { k: 0, ph: 'idle', t0: 0, score: 0, hits: 0, best: 0, next: 0, prev: { left: new V3(), right: new V3() }, cool: { left: 0, right: 0 }, bop: null };
    try { if (Number.isInteger(prefs.whackBest)) W.best = prefs.whackBest; } catch (e) { /* none */ }
    L.whack = W;
    function mySlot() { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); ids.sort(); return Math.max(0, ids.indexOf(state.myPeer)) % N; }
    function standAtCabinet() {
      W.k = mySlot();
      const c = new V3(); camera.getWorldPosition(c);
      dolly.position.x += cabX(W.k) - c.x; dolly.position.z += 0.3 - c.z;
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.95; }
    }
    function startRound() {
      Object.assign(W, { ph: 'play', t0: performance.now(), score: 0, hits: 0, next: 0.8 });
      for (const m of moles[W.k].list) { m.want = 0; m.until = 0; m.up = 0; m.hit = 0; }
      sfx('whistle', 0.7); showToast(`${ROUND} seconds! Bop the moles while they're up`);
      forcePresence(); state.dirtyBoard = true;
    }
    L.startRound = startRound;
    function endRound() {
      W.ph = 'over';
      for (const m of moles[W.k].list) m.want = 0;
      const isBest = W.score > W.best;
      if (isBest) { W.best = W.score; prefs.whackBest = W.best; savePrefs(); }
      RECORDS.add(L, 'score', W.score);
      const n = Math.ceil(W.score / 3);
      showToast(`Time! ${W.score} points${isBest && W.score ? ' (your best!)' : ''}. ${n} tickets`);
      sfx(W.score >= 30 ? 'fanfare' : 'chime', 0.8);
      CARNIVAL.tickets(n, new V3(cabX(W.k), 1.8, CZ));
      forcePresence(); state.dirtyBoard = true;
    }
    const elapsed = () => (performance.now() - W.t0) / 1000;
    function roundStep(dt) {
      const t = elapsed(), f = clamp(t / ROUND, 0, 1);
      if (t >= ROUND) { endRound(); return; }
      W.next -= dt;
      if (W.next <= 0) {
        W.next = 0.95 - 0.55 * f + rand() * 0.2;
        const free = moles[W.k].list.filter((m) => m.want === 0 && m.up < 0.05);
        if (free.length) { const m = free[Math.floor(rand() * free.length)]; m.want = 1; m.until = t + 1.4 - 0.75 * f; m.gold = rand() < 0.1; m.hit = 0; }
      }
      for (const m of moles[W.k].list) if (m.want && t > m.until) m.want = 0;
    }
    L.roundStep = roundStep;
    // a bop at hole i: did it get a mole?
    function bop(i) {
      if (W.ph !== 'play') { startRound(); return false; }
      const m = moles[W.k].list[i];
      if (m.want && m.up > 0.4 && !m.hit) {
        const pts = m.gold ? 3 : 1;
        m.hit = 1; m.want = 0; W.score += pts; W.hits += 1;
        // (the points pop up over the back board, out of the way of the moles)
        const p = holePos(W.k, i, new V3()); p.y = TOPY + 1.05; p.z = CZ - 0.42;
        spawnFloat(pts > 1 ? '+3 GOLD!' : '+1', p, pts > 1 ? '#ffd23f' : '#ffffff');
        tone(pts > 1 ? 1200 : 700, 300, 0.08, 'square', 0.15); sfx('thump', 0.6);
        forcePresence(); state.dirtyBoard = true;
        return true;
      }
      sfx('wood', 0.3);
      return false;
    }
    L.bop = bop;
    // VR: a mallet head coming down on a mole
    const _h = new V3(), _p = new V3();
    function vrBops(dt, now) {
      for (const s of SIDES) {
        const mh = myHands[s]; if (!mh.ok) continue;
        _h.copy(HEAD_OFF).applyQuaternion(mh.quat).add(mh.pos);
        const vy = (_h.y - W.prev[s].y) / Math.max(dt, 1e-3); W.prev[s].copy(_h);
        if (now < W.cool[s] || vy > -0.8 || _h.y > TOPY + 0.14 || _h.y < TOPY - 0.1) continue;
        for (let i = 0; i < 9; i++) {
          holePos(W.k, i, _p);
          if (Math.hypot(_h.x - _p.x, _h.z - _p.z) < 0.1) { W.cool[s] = now + 180; if (bop(i)) haptic(vrHands[s], 0.8, 40); else haptic(vrHands[s], 0.2, 20); break; }
        }
      }
    }
    // browser: keys for the holes, or aim and click
    function flatBop(i) { W.bop = { i, t: performance.now() }; return bop(i); }
    L.onKey = (code) => { const i = KEYS.indexOf(code); if (i < 0 || W.ph !== 'play') return false; flatBop(i); return true; };
    const _cp = new V3(), _q = new Q4(), _f = new V3();
    L.deskFire = () => {
      camera.getWorldPosition(_cp); camera.getWorldQuaternion(_q); _f.set(0, 0, -1).applyQuaternion(_q);
      if (_f.y > -0.05) { if (W.ph !== 'play') startRound(); return; }
      const t = (TOPY - _cp.y) / _f.y, x = _cp.x + _f.x * t, z = _cp.z + _f.z * t;
      let best = -1, bd = 0.13;
      for (let i = 0; i < 9; i++) { holePos(W.k, i, _p); const d = Math.hypot(_p.x - x, _p.z - z); if (d < bd) { bd = d; best = i; } }
      if (best >= 0) flatBop(best); else if (W.ph !== 'play') startRound();
    };
    L.throwLabel = () => (W.ph === 'play' ? 'Bop' : 'Start');
    // no wandering off mid-round (and the keys are the holes)
    Object.defineProperty(L, 'walkSpeed', { get: () => (W.ph === 'play' ? 0.0001 : 3) });

    // ---------------------------------------------------------------- per frame
    function drawScore(m, score, t, name) {
      const key = `${score}|${t}|${name}`;
      if (key === m.key) return; m.key = key;
      const g = m.sc.g;
      g.fillStyle = '#1a1020'; g.fillRect(0, 0, 256, 96);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.font = `900 48px ${DISPLAY}`; g.fillText(String(score), 80, 50);
      g.fillStyle = '#ffffff'; g.font = `700 30px ${BODY}`; g.fillText(t ? `${t}s` : name ? 'done' : '', 190, 50);
      m.sc.tex.needsUpdate = true;
    }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      fair.tick(dt);
      prizes.tick();
      if (!here) { for (const s of SIDES) mallets[s].visible = false; flatMallet.visible = false; return; }
      if (mySlot() !== W.k) standAtCabinet();
      if (W.ph === 'play') roundStep(dt);
      if (state.mode === 'vr') vrBops(dt, performance.now());
      // VR: A or X starts
      if (state.mode === 'vr') {
        let a = false; for (const s of SIDES) { const gp = vrHands[s].source && vrHands[s].source.gamepad; if (gp && gp.buttons && gp.buttons[4] && gp.buttons[4].pressed) a = true; }
        if (a && !W.aPrev && W.ph !== 'play') startRound();
        W.aPrev = a;
      }
      // moles rise and drop; a bopped one squashes
      moles.forEach((c, k) => {
        c.list.forEach((m, i) => {
          if (k !== W.k) { m.up = 0; }
          m.up += ((m.want ? 1 : 0) - m.up) * Math.min(1, dt * (m.want ? 14 : 10));
          const p = holePos(k, i, _p);
          m.g.position.set(p.x, TOPY - 0.12 + m.up * 0.17, p.z);
          m.g.scale.set(1, m.hit && m.up > 0.05 ? 0.5 : 1, 1);
          m.fur.color.setHex(m.gold ? 0xffc83a : 0x8a5a3a); m.fur.emissive.setHex(m.gold ? 0x4a3000 : 0x000000);
          if (!m.want && m.up < 0.05) m.hit = 0;
        });
        if (k === W.k) drawScore(c, W.score, W.ph === 'play' ? Math.ceil(ROUND - elapsed()) : 0, W.ph === 'over' ? 'x' : '');
      });
      // mallets
      for (const s of SIDES) { const m = mallets[s], mh = myHands[s]; m.visible = state.mode === 'vr' && mh.ok; if (m.visible) { m.position.copy(mh.pos); m.quaternion.copy(mh.quat); } }
      flatMallet.visible = state.mode === 'flat';
      if (flatMallet.visible) {
        const b = W.bop && now - W.bop.t < 220 ? W.bop : null;
        if (b) { const p = holePos(W.k, b.i, _p), u = (now - b.t) / 220, lift = Math.sin(u * Math.PI); flatMallet.position.set(p.x + 0.25, TOPY + 0.12 + (1 - lift) * 0.15, p.z); flatMallet.rotation.set(0, Math.PI / 2, -0.4 + lift * 0.9, 'YXZ'); }
        else { flatMallet.position.set(cabX(W.k) + 0.55, TOPY + 0.3, CZ + 0.25); flatMallet.rotation.set(0.6, Math.PI / 2, 0, 'YXZ'); }
      }
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = W.ph === 'play' ? `${Math.ceil(ROUND - elapsed())} s  ·  ${W.score} points  ·  keys Q W E / A S D / Z X C, or click a mole` : `Whack-a-Mole  ·  press Space or any hole key to start  ·  best ${W.best}`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.presence = () => ({ wm: [W.k, W.score, W.best, W.ph === 'play' ? 1 : 0] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.wm;
      if (!Array.isArray(a) || a.length !== 4 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e6) || a[0] >= N) { st.wm = null; return; }
      if (!st.wm || st.wm[1] !== a[1] || st.wm[2] !== a[2]) state.dirtyBoard = true;
      st.wm = a;
    };
    L.rowFor = (st, isMe) => { const b = isMe ? W.best : st.wm ? st.wm[2] : 0, now = isMe ? (W.ph === 'play' ? W.score : 0) : st.wm && st.wm[3] ? st.wm[1] : 0; return { best: b, text: `${now ? `${now} now · ` : ''}best ${b}` }; };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, -5.6, 1.9, 1.6, Math.PI / 2);
    L.drawBoard = (rows) => {
      const g = L.board.g, Wd = 720;
      g.fillStyle = '#1a1020'; g.fillRect(0, 0, Wd, 460); g.strokeStyle = '#e5453a'; g.lineWidth = 8; g.strokeRect(4, 4, Wd - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Top whackers', 36, 80);
      g.fillStyle = '#e8d8f0'; g.font = `400 24px ${BODY}`; g.fillText('Best score in 45 seconds', 36, 118);
      drawRows(g, rows, 176, 46, Wd);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 5.8, 4.4, -Math.PI * 0.75);
    RECORDS.def(L, [{ k: 'score', label: 'Best score in 45 seconds' }]);
    const prizes = CARNIVAL.prizeStand(L, 5.0, 0.6, -Math.PI / 2);   // spend your tickets here
    L.hudActions = [{ label: () => (W.ph === 'play' ? 'Restart' : 'Start round'), run: () => startRound() }];
    L.hints = [['A / X', 'start a round'], ['Mallets', 'one in each hand: bop the moles'], ['Golden moles', '3 points'], ['Prize stand', 'on the right: spend your tickets']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Q W E / A S D / Z X C', 'the nine holes'], ['Or click', 'a mole'], ['Golden moles', '3 points'], ['Prize stand', 'on the right: spend your tickets']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0.3); standAtCabinet(); };
    L.onEnter = () => { W.ph = 'idle'; for (const c of moles) c.key = ''; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; W.ph = 'idle'; for (const c of moles) for (const m of c.list) m.want = 0; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 2, 2.0, 2.5); camera.lookAt(0, 0.9, -0.4); };
    L.whackInternals = { W, moles, bop, roundStep, startRound, endRound, holePos, KEYS };
    MUSIC_THEMES.whack = { gain: 0.7, bpm: 138, swing: 0.1, chords: ['C', 'F', 'G', 'C'], comp: { inst: 'synth', at: [0, 2, 4, 6, 8, 10, 12, 14], dur: 0.08 }, bass: { at: [0, 4, 8, 12] }, drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'o.o.o.o.o.o.o.o.' }, cut: 5000 };
    return L;
  })();
