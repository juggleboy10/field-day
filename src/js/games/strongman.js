  // ================================================================ LEVEL: STRONGMAN BELL (carnival)
  // Swing the big mallet down on the pad and the puck shoots up the tower: Wimp, Weakling, Not bad, Strong,
  // Mighty… and DING! the bell, if you hit hard enough. Tickets for every swing, more the higher it goes.
  // VR: squeeze to pick up the mallet from its stand and really swing it down onto the pad (speed is height).
  // Browser: the power needle swings up and down; press Space (or click) when it's at the top.
  const strongman = (() => {
    const L = newLevel(43);
    const G = L.group;
    const rand = mulberry32(4343);
    L.grabless = true;
    L.bounds = { minX: -7, maxX: 7, minZ: -4, maxZ: 6 };
    L.env = CARNIVAL.env();
    const fair = CARNIVAL.backdrop(G, rand, { pathW: 13, pathD: 9, pathZ: 1.5 });
    const N = 3, PITCH = 3.4, TH = 5.2, PAD_Z = 0.75, PAD_Y = 0.3;
    const towerX = (k) => (k - (N - 1) / 2) * PITCH;
    const MARKS = [[0.15, 'Wimp'], [0.32, 'Weakling'], [0.5, 'Not bad'], [0.68, 'Strong'], [0.84, 'Mighty']];
    const rating = (h) => (h >= 1 ? 'HERCULES!' : MARKS.reduce((r, [f, n]) => (h >= f ? n : r), 'Feather'));
    const payout = (h) => (h >= 1 ? 12 : h >= 0.84 ? 6 : h >= 0.68 ? 4 : h >= 0.5 ? 2 : 1);

    // ---------------------------------------------------------------- the towers
    const towers = [];
    for (let k = 0; k < N; k++) {
      const x = towerX(k);
      addBox(G, 1.6, 0.25, 1.4, lam(0x6a3a1a), x, 0.125, 0.3);
      // the tower: a tall board with the scale painted on, a rail for the puck, the bell on top
      const sc = canvasTexture(128, 1024, (g) => {
        const grd = g.createLinearGradient(0, 1024, 0, 0); grd.addColorStop(0, '#2a8a3a'); grd.addColorStop(0.5, '#ffd23f'); grd.addColorStop(1, '#e5453a');
        g.fillStyle = grd; g.fillRect(0, 0, 128, 1024);
        g.fillStyle = '#1a1020'; g.fillRect(56, 0, 16, 1024);
        g.font = `800 22px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (const [f, n] of MARKS) { const y = 1024 - f * 1024; g.fillStyle = '#ffffff'; g.fillRect(0, y - 2, 128, 4); g.save(); g.translate(28, y - 40); g.rotate(-Math.PI / 2); g.fillStyle = '#1a1020'; g.fillText(n, 0, 0); g.restore(); }
      });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(0.55, TH), new THREE.MeshLambertMaterial({ map: sc.tex })); board.position.set(x, 0.25 + TH / 2, -0.05); G.add(board);
      addBox(G, 0.7, TH + 0.2, 0.08, lam(0x3a2a2a), x, 0.25 + TH / 2, -0.11);
      addCyl(G, 0.015, 0.015, TH, 6, lam(0xd8d8e0), x, 0.25 + TH / 2, 0.03);
      const bell = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0xffc83a, emissive: 0x302000, side: THREE.DoubleSide }));
      bell.position.set(x, 0.25 + TH + 0.2, 0.05); G.add(bell);
      makePlate(G, 'STRONGMAN', 1.4, 0.3, new V3(x, 0.25 + TH + 0.65, 0), 0, { bg: '#e5453a', fg: '#ffd23f', size: 0.62 });
      const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 12), new THREE.MeshLambertMaterial({ color: 0xe5453a, emissive: 0x200000 })); puck.position.set(x, 0.35, 0.05); G.add(puck);
      // the pad (a lever) in front, and the mallet's stand
      const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.12, 16), lam(0x2a2a2a)); pad.position.set(x, PAD_Y - 0.06, PAD_Z); G.add(pad);
      const padTop = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 16), lam(0xe5453a)); padTop.position.set(x, PAD_Y + 0.01, PAD_Z); G.add(padTop);
      addBox(G, 0.3, 0.9, 0.3, lam(0x8a5a2a), x + 0.75, 0.45, PAD_Z + 0.2);
      const rating3d = makePlate(G, '', 1.3, 0.3, new V3(x, 3.2, 0.9), 0, { bg: '#1a1020', fg: '#ffd23f', size: 0.6 }); rating3d.visible = false;
      towers.push({ k, x, bell, puck, padTop, rating: rating3d, py: 0.35, vy: 0, top: 0, rang: 0, showT: 0 });
    }
    // the mallet (mine): on its stand, in my hand (VR), or swinging in front of me (browser)
    function makeMallet() {
      const g = new THREE.Group();
      const handle = new THREE.Mesh(cyl(0.02, 0.025, 0.95, 8), lam(0xc8945a)); handle.rotation.x = Math.PI / 2; handle.position.z = -0.42; g.add(handle);
      const head = new THREE.Mesh(cyl(0.11, 0.11, 0.3, 14), lam(0x8a2a2a)); head.rotation.z = Math.PI / 2; head.position.z = -0.88; g.add(head);
      for (const sx of [-1, 1]) { const band = new THREE.Mesh(cyl(0.115, 0.115, 0.03, 14), lam(0x2a2a2a)); band.rotation.z = Math.PI / 2; band.position.set(sx * 0.13, 0, -0.88); g.add(band); }
      return g;
    }
    const mallet = makeMallet(); L.overlay.add(mallet);
    const others = new Map();
    const HEAD_OFF = new V3(0, 0, -0.88);

    // ---------------------------------------------------------------- my swings
    const S = { k: 0, hand: null, prevHead: new V3(), cool: 0, rings: 0, best: 0, swings: 0, last: 0, flatSwing: 0, flatPow: 0 };
    try { if (prefs.strong && typeof prefs.strong === 'object') { S.rings = Number.isInteger(prefs.strong.rings) ? prefs.strong.rings : 0; S.best = Number.isFinite(prefs.strong.best) ? prefs.strong.best : 0; } } catch (e) { /* none */ }
    L.strong = S;
    const save = () => { prefs.strong = { rings: S.rings, best: S.best }; savePrefs(); };
    function mySlot() { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); ids.sort(); return Math.max(0, ids.indexOf(state.myPeer)) % N; }
    function standAtTower() {
      S.k = mySlot();
      const c = new V3(); camera.getWorldPosition(c);
      dolly.position.x += towerX(S.k) - c.x; dolly.position.z += (state.mode === 'vr' ? 1.75 : 4.4) - c.z;
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = 0.24; }
    }
    const standPos = (k, out) => out.set(towerX(k) + 0.75, 0.95, PAD_Z + 0.2);
    // a strike: h is how high the puck should go (1 rings the bell)
    function strike(h) {
      const t = towers[S.k];
      if (S.cool > 0) return;
      h = clamp(h, 0.05, 1.08);
      t.top = Math.min(1, h); t.vy = Math.sqrt(2 * 14 * (Math.min(h, 1.02) * TH)); t.py = 0.35; t.rang = 0; t.hit = h;
      S.cool = 2.4; S.swings += 1; S.last = Math.min(1, h);
      sfx('slam', 0.9); tone(120, 60, 0.15, 'square', 0.2);
      t.padTop.position.y = PAD_Y - 0.03;
      if (state.mode === 'vr' && S.hand) haptic(vrHands[S.hand], 1, 120);
      forcePresence();
    }
    L.strike = strike;
    function landed(t) {
      const h = t.hit >= 1 ? 1 : t.hit;
      const r = rating(h), n = payout(h);
      t.rating.visible = true; t.rating.userData.draw(r); t.showT = 2.4;
      if (h >= 1) { S.rings += 1; S.streak = (S.streak || 0) + 1; sfx('fanfare', 0.8); sfx('cheer', 0.7); }
      else { if (S.streak) RECORDS.add(L, 'streak', S.streak); S.streak = 0; sfx(h >= 0.68 ? 'chime' : 'click', 0.6); }
      if (h > S.best) S.best = Math.round(h * 100) / 100;
      save();
      showToast(h >= 1 ? 'DING! You rang the bell!' : `${r}! ${Math.round(h * 100)}% of the way`);
      CARNIVAL.tickets(n, new V3(t.x, 2.2, 0.9));
      state.dirtyBoard = true; forcePresence();
    }
    function puckStep(t, dt) {
      if (t.vy === 0 && t.py <= 0.35) return;
      t.vy -= 14 * dt; t.py += t.vy * dt;
      const topY = 0.25 + TH;
      if (t.py >= topY && !t.rang) { t.rang = 1; t.hit = Math.max(t.hit || 0, 1); t.py = topY; t.vy = -1; tone(1760, 1760, 1.2, 'sine', 0.25); tone(2640, 2640, 0.8, 'sine', 0.1); if (t.k === S.k) landed(t); }
      if (t.vy < 0 && !t.rang && !t.peaked) { t.peaked = true; if (t.k === S.k) landed(t); }
      if (t.py <= 0.35) { t.py = 0.35; t.vy = 0; t.peaked = false; sfx('wood', 0.3); }
      t.puck.position.y = t.py;
    }
    L.puckStep = puckStep;
    // VR: grab the mallet from its stand; swing it down onto the pad
    const _h = new V3(), _sp = new V3();
    L.onVRGrab = (h) => {
      if (S.hand) return false;
      if (myHands[h.side].pos.distanceTo(standPos(S.k, _sp)) > 0.45) return false;
      S.hand = h.side; sfx('grab', 0.5);
      headPos(_h); S.prevHead.copy(_h);
      return true;
    };
    L.onVRRelease = (h) => { if (S.hand === h.side) S.hand = null; };
    function headPos(out) {
      const mh = myHands[S.hand];
      return out.copy(HEAD_OFF).applyQuaternion(mh.quat).add(mh.pos);
    }
    function vrSwing(dt) {
      if (!S.hand) return;
      headPos(_h);
      const v = _h.distanceTo(S.prevHead) / Math.max(dt, 1e-3), down = S.prevHead.y - _h.y;
      const t = towers[S.k];
      if (S.cool <= 0 && down > 0 && _h.y < PAD_Y + 0.15 && S.prevHead.y >= PAD_Y + 0.12 && Math.hypot(_h.x - t.x, _h.z - PAD_Z) < 0.42) {
        strike((v - 2.5) / 12 + (rand() - 0.5) * 0.08);
      }
      S.prevHead.copy(_h);
    }
    // browser: the power needle, and a press to swing
    // (it sweeps at an even speed, so the top is only there for a moment)
    const needle = (now) => { const u = (now / 1000 / 0.55) % 2; return 1 - Math.abs(u - 1); };
    L.deskFire = (now) => {
      if (S.cool > 0 || now < S.flatSwing + 400) return;
      S.flatSwing = now; S.flatPow = needle(now);
      sfx('whoosh', 0.5);
      setTimeout(() => { const p = S.flatPow; strike(p > 0.93 ? 1.05 : p * 0.94); }, 220);
    };
    L.throwLabel = () => 'Swing';

    // ---------------------------------------------------------------- per frame
    let meterOn = false;
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      fair.tick(dt);
      prizes.tick();
      if (!here) { mallet.visible = false; return; }
      if (mySlot() !== S.k) standAtTower();
      S.cool = Math.max(0, S.cool - dt);
      for (const t of towers) {
        puckStep(t, dt);
        t.padTop.position.y += (PAD_Y + 0.01 - t.padTop.position.y) * Math.min(1, dt * 6);
        if (t.showT > 0) { t.showT -= dt; if (t.showT <= 0) t.rating.visible = false; }
        t.bell.rotation.z = t.rang && t.py > TH - 0.5 ? Math.sin(now * 0.05) * 0.2 : 0;
      }
      if (state.mode === 'vr') vrSwing(dt);
      // the mallet
      mallet.visible = true;
      if (state.mode === 'vr' && S.hand) { const mh = myHands[S.hand]; mallet.position.copy(mh.pos); mallet.quaternion.copy(mh.quat); }
      else if (state.mode === 'flat') {
        // raised over the shoulder, then down onto the pad
        const u = clamp((now - S.flatSwing) / 220, 0, 1), back = now - S.flatSwing < 700 ? Math.sin(u * Math.PI / 2) : 0;
        const t = towers[S.k], pivot = new V3(t.x + 0.12, 1.3, 1.45);
        mallet.position.copy(pivot);
        mallet.rotation.set(1.2 - back * 2.35, 0, 0, 'YXZ');
        if (now - S.flatSwing > 700) mallet.rotation.x = 1.15 + Math.sin(now * 0.003) * 0.03;
      } else { standPos(S.k, mallet.position); mallet.position.y += 0.05; mallet.rotation.set(-Math.PI / 2, 0, 0); mallet.position.z -= 0.0; }
      if (state.mode === 'vr' && !S.hand) { standPos(S.k, mallet.position); mallet.position.y += 0.45; mallet.rotation.set(-Math.PI / 2, 0, 0); }
      // the power needle (browser)
      const showMeter = state.mode === 'flat' && S.cool <= 0;
      if (showMeter && ui.power) { ui.power.hidden = false; ui.powerFill.style.width = `${Math.round(needle(now) * 100)}%`; meterOn = true; }
      else if (meterOn && ui.power) { ui.power.hidden = true; meterOn = false; }
      // the others' pucks
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id];
        if (rec.lv !== L.idx || !rec.inGame || !st || !st.sm) continue;
        const t = towers[st.sm[0]]; if (!t || t.k === S.k) continue;
        const key = `${rec.peer}`;
        if (others.get(key) !== st.sm[3]) { others.set(key, st.sm[3]); if (st.sm[3] > 0) { t.hit = st.sm[4] / 100; t.top = Math.min(1, t.hit); t.vy = Math.sqrt(2 * 14 * (Math.min(t.hit, 1.02) * TH)); t.py = 0.35; t.rang = 0; } }
      }
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = `Strongman  ·  press Space when the needle's at the top  ·  bells rung ${S.rings}  ·  best ${Math.round(S.best * 100)}%`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.presence = () => ({ sm: [S.k, S.rings, Math.round(S.best * 100), S.swings, Math.round((towers[S.k].hit || 0) * 100)] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.sm;
      if (!Array.isArray(a) || a.length !== 5 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e6) || a[0] >= N) { st.sm = null; return; }
      if (!st.sm || st.sm[1] !== a[1] || st.sm[2] !== a[2]) state.dirtyBoard = true;
      st.sm = a;
    };
    L.rowFor = (st, isMe) => { const r = isMe ? S.rings : st.sm ? st.sm[1] : 0, b = isMe ? Math.round(S.best * 100) : st.sm ? st.sm[2] : 0; return { best: r * 1000 + b, text: `${r} bell${r === 1 ? '' : 's'} · best ${b}%` }; };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, -6.2, 1.9, 2.2, Math.PI / 2);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#1a1020'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Bell ringers', 36, 80);
      g.fillStyle = '#e8d8f0'; g.font = `400 24px ${BODY}`; g.fillText('Ring the bell for 12 tickets', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 6.0, 4.2, -Math.PI * 0.75);
    RECORDS.def(L, [{ k: 'streak', label: 'Most bells in a row' }]);
    const prizes = CARNIVAL.prizeStand(L, 6.0, 0.6, -Math.PI / 2);   // spend your tickets here
    L.hints = [['Grip', 'pick up the mallet from its stand'], ['Swing down', 'hard, onto the red pad'], ['Tickets', 'spend them at the prize stand on the right']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Space or click', 'swing when the needle is at the top'], ['Tickets', 'spend them at the prize stand on the right']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 1.75); standAtTower(); };
    L.onEnter = () => { S.cool = 0; };
    L.onExit = () => { if (S.streak) { RECORDS.add(L, 'streak', S.streak); S.streak = 0; } if (ui.status) ui.status.hidden = true; if (ui.power) ui.power.hidden = true; meterOn = false; S.hand = null; mallet.visible = false; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 3, 2.4, 6); camera.lookAt(0, 2.6, 0); };
    L.strongInternals = { S, towers, strike, puckStep, needle, rating, payout };
    MUSIC_THEMES.strongman = { gain: 0.7, bpm: 116, swing: 0.2, chords: ['C', 'G', 'C', 'F'], comp: { inst: 'brass', at: [0, 4, 8, 12], dur: 0.2 }, bass: { at: [0, 8] }, drums: { k: 'x.......x.......', s: '....x.......x...' }, lead: { inst: 'musicbox', p: 0.3, up: 12 }, cut: 4200 };
    return L;
  })();
