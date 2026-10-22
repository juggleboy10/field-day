  // ================================================================ LEVEL: SPEED OF LIGHT (carnival)
  // A wall of twenty buttons, five across and four high. Three are lit at once, each for a couple of seconds: hit them
  // and new ones light up elsewhere, so plan your route. Thirty seconds: how many can you get? A light you're too slow
  // for goes out (and another comes on).
  // Points pay out tickets (spend them at the prize stand).
  // VR: slap the lit button with either hand. Browser: aim at it and click (or press Space).
  const lightspeed = (() => {
    const L = newLevel(47);
    const G = L.group;
    const rand = mulberry32(4747);
    L.grabless = true;
    L.bounds = { minX: -7, maxX: 7, minZ: -2, maxZ: 6 };
    L.env = CARNIVAL.env();
    const fair = CARNIVAL.backdrop(G, rand, { pathW: 13, pathD: 7, pathZ: 2, wheelX: -18 });
    const N = 3, PITCH = 2.6, COLS = 5, ROWS = 4, GX = 0.23, GY = 0.21, PZ = -0.6, Y0 = 1.0, ROUND = 30, BR = 0.07, LIVE = 3, LIFE = 2.6;
    const panelX = (k) => (k - (N - 1) / 2) * PITCH;
    const btnPos = (k, i, out) => out.set(panelX(k) + ((i % COLS) - (COLS - 1) / 2) * GX, Y0 + Math.floor(i / COLS) * GY, PZ + 0.05);

    // ---------------------------------------------------------------- the panels
    const glowM = new THREE.SpriteMaterial({ map: warmGlowTex, color: 0x9af0ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    const panels = [];
    for (let k = 0; k < N; k++) {
      const x = panelX(k);
      addBox(G, COLS * GX + 0.3, ROWS * GY + 0.3, 0.1, lam(0x1a1a2a), x, Y0 + (ROWS - 1) * GY / 2, PZ);
      addBox(G, COLS * GX + 0.36, 0.06, 0.14, lam(0x4fc3f7), x, Y0 + (ROWS - 1) * GY + 0.18, PZ);
      for (const sx of [-1, 1]) addBox(G, 0.08, Y0 + ROWS * GY + 0.6, 0.12, lam(0x2a2a3a), x + sx * (COLS * GX / 2 + 0.2), (Y0 + ROWS * GY + 0.6) / 2, PZ);
      makePlate(G, 'SPEED OF LIGHT', 1.6, 0.26, new V3(x, Y0 + ROWS * GY + 0.45, PZ + 0.06), 0, { bg: '#4fc3f7', fg: '#14142a', size: 0.62 });
      const sc = canvasTexture(256, 64);
      const score = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), new THREE.MeshBasicMaterial({ map: sc.tex })); score.position.set(x, Y0 + ROWS * GY + 0.16, PZ + 0.06); G.add(score);
      const btns = [];
      for (let i = 0; i < COLS * ROWS; i++) {
        const p = btnPos(k, i, new V3());
        const mat = new THREE.MeshLambertMaterial({ color: 0x3a4a5a, emissive: 0x000000 });
        const b = new THREE.Mesh(cyl(BR, BR, 0.04, 18), mat); b.rotation.x = Math.PI / 2; b.position.copy(p); G.add(b);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(BR + 0.01, 0.008, 6, 20), lam(0x8a9aaa)); ring.position.copy(p); G.add(ring);
        const glow = new THREE.Sprite(glowM.clone()); glow.position.copy(p).add(new V3(0, 0, 0.03)); glow.scale.set(0.4, 0.4, 1); glow.visible = false; G.add(glow);
        btns.push({ b, mat, glow, p });
      }
      panels.push({ k, btns, sc, key: '' });
    }

    // ---------------------------------------------------------------- the round
    const S = { k: 0, ph: 'idle', t0: 0, lits: [], hits: 0, misses: 0, best: 0, react: 0, flash: -1, flashT: 0 };
    try { if (Number.isInteger(prefs.lightBest)) S.best = prefs.lightBest; } catch (e) { /* none */ }
    L.light = S;
    function mySlot() { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); ids.sort(); return Math.max(0, ids.indexOf(state.myPeer)) % N; }
    function standAtPanel() {
      S.k = mySlot();
      const c = new V3(); camera.getWorldPosition(c);
      dolly.position.x += panelX(S.k) - c.x; dolly.position.z += (state.mode === 'vr' ? 0 : 1.4) - c.z;
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.12; }
    }
    const elapsed = () => (performance.now() - S.t0) / 1000;
    // light one more (somewhere that isn't lit, or just went out)
    function lightNext(not) {
      let i, n = 0; do { i = Math.floor(rand() * COLS * ROWS); } while ((S.lits.some((l) => l.i === i) || i === not) && n++ < 50);
      S.lits.push({ i, t: performance.now(), c: (S.hits + S.lits.length) % 4 });
    }
    const isLit = (i) => S.lits.some((l) => l.i === i);
    function startRound() {
      Object.assign(S, { ph: 'play', t0: performance.now(), hits: 0, misses: 0, react: 0, lits: [] });
      for (let k = 0; k < LIVE; k++) lightNext();
      sfx('whistle', 0.7); showToast(`${ROUND} seconds! Hit each light as fast as you can`);
      forcePresence(); state.dirtyBoard = true;
    }
    L.startRound = startRound;
    function endRound() {
      S.ph = 'over'; S.lits = [];
      const isBest = S.hits > S.best;
      if (isBest) { S.best = S.hits; prefs.lightBest = S.best; savePrefs(); }
      RECORDS.add(L, 'hits', S.hits);
      if (S.hits >= 20) RECORDS.add(L, 'react', S.react / S.hits * 1000);
      const n = Math.ceil(S.hits / 3), avg = S.hits ? Math.round(S.react / S.hits * 1000) : 0;
      showToast(`Time! ${S.hits} lights${avg ? `, ${avg} ms each on average` : ''}${isBest && S.hits ? ' (your best!)' : ''}. ${n} tickets`);
      sfx(S.hits >= 30 ? 'fanfare' : 'chime', 0.8);
      CARNIVAL.tickets(n, new V3(panelX(S.k), Y0 + ROWS * GY + 0.7, PZ + 0.2));
      forcePresence(); state.dirtyBoard = true;
    }
    // a hit on button i
    function press(i) {
      if (S.ph !== 'play') { startRound(); return false; }
      const k = S.lits.findIndex((l) => l.i === i);
      if (k < 0) return false;
      const rt = (performance.now() - S.lits[k].t) / 1000;
      S.lits.splice(k, 1);
      S.hits += 1; S.react += rt; S.flash = i; S.flashT = 0.25;
      tone(880 + Math.min(12, S.hits) * 40, 0, 0.06, 'square', 0.12);
      lightNext(i);
      forcePresence(); state.dirtyBoard = true;
      return true;
    }
    L.press = press;
    // VR: a hand on the lit button
    const _p = new V3(), prevH = { left: new V3(), right: new V3() };
    function vrHits() {
      for (const s of SIDES) {
        const h = myHands[s]; if (!h.ok) continue;
        for (const l of S.lits.slice()) {
          const p = panels[S.k].btns[l.i].p;
          const close = Math.hypot(h.pos.x - p.x, h.pos.y - p.y) < BR + 0.05 && h.pos.z < p.z + 0.08;
          if (close && press(l.i)) haptic(vrHands[s], 0.7, 30);
        }
        prevH[s].copy(h.pos);
      }
    }
    // browser: aim and click
    const _cp = new V3(), _q = new Q4(), _f = new V3();
    L.deskFire = () => {
      if (S.ph !== 'play') { startRound(); return; }
      camera.getWorldPosition(_cp); camera.getWorldQuaternion(_q); _f.set(0, 0, -1).applyQuaternion(_q);
      if (_f.z > -0.05) return;
      const t = (PZ + 0.05 - _cp.z) / _f.z, x = _cp.x + _f.x * t, y = _cp.y + _f.y * t;
      let best = -1, bd = BR + 0.04;
      panels[S.k].btns.forEach((b, i) => { const d = Math.hypot(b.p.x - x, b.p.y - y); if (d < bd) { bd = d; best = i; } });
      if (best >= 0 && !press(best)) sfx('wood', 0.2);
    };
    L.throwLabel = () => (S.ph === 'play' ? 'Hit' : 'Start');

    // ---------------------------------------------------------------- per frame
    function drawScore(pn, hits, t) {
      const key = `${hits}|${t}`;
      if (key === pn.key) return; pn.key = key;
      const g = pn.sc.g;
      g.fillStyle = '#14142a'; g.fillRect(0, 0, 256, 64);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#9af0ff'; g.font = `900 40px ${DISPLAY}`; g.fillText(String(hits), 70, 34);
      g.fillStyle = '#ffffff'; g.font = `700 30px ${BODY}`; g.fillText(t ? `${t}s` : '', 190, 34);
      pn.sc.tex.needsUpdate = true;
    }
    const COLS_LIT = [0x4fc3f7, 0x8bff6a, 0xffd23f, 0xff4d8a];
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      fair.tick(dt);
      prizes.tick();
      if (!here) return;
      if (mySlot() !== S.k) standAtPanel();
      if (S.ph === 'play') {
        if (elapsed() >= ROUND) endRound();
        else {
          // too slow: that light goes out, another comes on
          for (const l of S.lits.slice()) if ((performance.now() - l.t) / 1000 > LIFE) { S.lits.splice(S.lits.indexOf(l), 1); S.misses += 1; tone(220, 160, 0.08, 'square', 0.06); lightNext(l.i); }
          if (state.mode === 'vr') vrHits();
        }
      }
      // VR: A or X starts
      if (state.mode === 'vr') {
        let a = false; for (const s of SIDES) { const gp = vrHands[s].source && vrHands[s].source.gamepad; if (gp && gp.buttons && gp.buttons[4] && gp.buttons[4].pressed) a = true; }
        if (a && !S.aPrev && S.ph !== 'play') startRound();
        S.aPrev = a;
      }
      S.flashT = Math.max(0, S.flashT - dt);
      panels.forEach((pn) => {
        const mine = pn.k === S.k;
        pn.btns.forEach((b, i) => {
          const L1 = mine && S.ph === 'play' ? S.lits.find((l) => l.i === i) : null, lit = !!L1, flash = mine && i === S.flash && S.flashT > 0;
          const idleShow = S.ph !== 'play' && Math.floor(now / 140 + i * 7) % 19 === 0;   // a twinkle while nobody's playing
          const fade = lit ? 1 - (performance.now() - L1.t) / 1000 / LIFE : 0;
          const col = lit ? (fade < 0.3 && Math.floor(now / 90) % 2 ? 0xffffff : COLS_LIT[L1.c]) : flash ? 0xffffff : idleShow ? 0x4fc3f7 : 0x3a4a5a;
          b.mat.color.setHex(col); b.mat.emissive.setHex(lit || flash ? col : idleShow ? 0x1a3a4a : 0x000000);
          b.glow.visible = lit || flash; if (b.glow.visible) b.glow.material.color.setHex(col);
          b.b.position.z = b.p.z - (flash ? 0.015 : 0);
        });
        if (mine) drawScore(pn, S.hits, S.ph === 'play' ? Math.max(0, Math.ceil(ROUND - elapsed())) : 0);
      });
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = S.ph === 'play' ? `${Math.ceil(ROUND - elapsed())} s  ·  ${S.hits} lights  ·  aim at the lit button and click` : `Speed of Light  ·  press Space to start  ·  best ${S.best}`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.presence = () => ({ ls: [S.k, S.hits, S.best, S.ph === 'play' ? 1 : 0] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.ls;
      if (!Array.isArray(a) || a.length !== 4 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e6) || a[0] >= N) { st.ls = null; return; }
      if (!st.ls || st.ls[1] !== a[1] || st.ls[2] !== a[2]) state.dirtyBoard = true;
      st.ls = a;
    };
    L.rowFor = (st, isMe) => { const b = isMe ? S.best : st.ls ? st.ls[2] : 0, now = isMe ? (S.ph === 'play' ? S.hits : 0) : st.ls && st.ls[3] ? st.ls[1] : 0; return { best: b, text: `${now ? `${now} now · ` : ''}best ${b}` }; };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, -5.6, 1.9, 1.6, Math.PI / 2);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#14142a'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#4fc3f7'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#9af0ff'; g.font = `800 56px ${DISPLAY}`; g.fillText('Fastest hands', 36, 80);
      g.fillStyle = '#c8d8e8'; g.font = `400 24px ${BODY}`; g.fillText('Most lights hit in 30 seconds', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 5.8, 4.4, -Math.PI * 0.75);
    RECORDS.def(L, [{ k: 'hits', label: 'Most lights in 30 seconds' }, { k: 'react', label: 'Quickest average (20+ lights)', low: true, fmt: 'ms' }]);
    const prizes = CARNIVAL.prizeStand(L, 5.0, 0.6, -Math.PI / 2);   // spend your tickets here
    L.hudActions = [{ label: () => (S.ph === 'play' ? 'Restart' : 'Start round'), run: () => startRound() }];
    L.hints = [['A / X', 'start a round'], ['Slap', 'the lit button with either hand'], ['Prize stand', 'on the right: spend your tickets']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Aim', 'at the lit button'], ['Click or Space', 'hit it'], ['Prize stand', 'on the right: spend your tickets']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0); standAtPanel(); };
    L.onEnter = () => { S.ph = 'idle'; S.lits = []; for (const pn of panels) pn.key = ''; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; S.ph = 'idle'; S.lits = []; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 2, 1.8, 2.8); camera.lookAt(0, 1.4, -0.6); };
    L.lightInternals = { S, panels, press, startRound, endRound, lightNext, btnPos, isLit };
    MUSIC_THEMES.lightspeed = { gain: 0.7, bpm: 140, swing: 0, chords: ['Em', 'C', 'G', 'D'], comp: { inst: 'synth', at: [0, 2, 4, 6, 8, 10, 12, 14], dur: 0.08 }, bass: { at: [0, 4, 8, 12] }, drums: { k: 'x...x...x...x...', h: 'o.o.o.o.o.o.o.o.' }, cut: 5200 };
    return L;
  })();
