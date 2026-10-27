  // ================================================================ LEVEL: PORT & CABLE SORTER (study hall)
  // Crates ride a conveyor belt past you, each stamped with a port, a protocol, a cable use or a Wi-Fi standard.
  // Toss each one into the bin with its match before it reaches the end of the belt. Sixty seconds; the belt speeds up.
  // VR: grab the crate and throw (or drop) it in a bin, or point at a bin's label and pull the trigger.
  // Browser: aim at a bin's label and click, or press 1-4.
  const portsorter = (() => {
    const L = newLevel(49);
    const G = L.group;
    const rand = mulberry32(4949);
    L.grabless = true;
    L.bounds = { minX: -5.6, maxX: 5.6, minZ: -1.2, maxZ: 3.6 };
    L.env = STUDY.env();
    const hall = STUDY.room(G, rand, { w: 12, d: 10, z: -1, h: 4.8, shelves: false });
    const SPOT_Z = 1.65, ROUND = 60, BELT_Z = 0.98, BELT_Y = 0.86, BELT_X0 = -2.4, BELT_X1 = 2.4, CR = 0.34;
    const BIN_X = [-1.2, -0.4, 0.4, 1.2], BIN_Z = 0.22, BIN_W = 0.72, BIN_D = 0.62, BIN_H = 0.62;
    const MODES = [
      { id: 'ports', name: 'Port → protocol', sub: 'Port 443? That’s HTTPS' },
      { id: 'proto', name: 'Protocol → port', sub: 'SSH? That’s port 22' },
      { id: 'conn', name: 'Connectors', sub: 'What plugs in where' },
      { id: 'wifi', name: 'Wi-Fi standards', sub: '802.11a to Wi-Fi 6' },
    ];
    // the deck for each mode: [what's on the crate, what's on the right bin]
    const items = (mode) => (mode === 'ports' ? APLUS.PORTS.map(([n, p]) => [`Port ${n}`, p])
      : mode === 'proto' ? APLUS.PORTS.map(([n, p]) => [p, `Port ${n}`])
        : mode === 'conn' ? APLUS.CONNECTORS.map(([c, u]) => [u, c])
          : APLUS.WIFI.map(([s, d]) => [d, s]));

    // ---------------------------------------------------------------- the belt, the bins, the backboard
    const metal = lam(0x8a929e), dark = lam(0x2a2e36), beltM = lam(0x23262c);
    addBox(G, BELT_X1 - BELT_X0 + 0.8, 0.06, 0.5, beltM, 0, BELT_Y - 0.03, BELT_Z);
    for (const sz of [-1, 1]) addBox(G, BELT_X1 - BELT_X0 + 0.8, 0.1, 0.04, metal, 0, BELT_Y + 0.01, BELT_Z + sz * 0.27);
    for (const x of [BELT_X0 - 0.3, 0, BELT_X1 + 0.3]) for (const sz of [-1, 1]) addBox(G, 0.06, BELT_Y - 0.06, 0.06, dark, x, (BELT_Y - 0.06) / 2, BELT_Z + sz * 0.2);
    const rollers = [];
    for (let i = 0; i < 18; i++) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.5, 8), metal); r.rotation.x = Math.PI / 2; r.position.set(BELT_X0 - 0.35 + i * 0.32, BELT_Y - 0.065, BELT_Z); G.add(r); rollers.push(r); }
    // stripes on the belt so you can see it move
    const stripes = [];
    for (let i = 0; i < 12; i++) { const s = addBox(G, 0.04, 0.005, 0.46, lam(0x3a3e46), 0, BELT_Y + 0.003, BELT_Z); stripes.push(s); }
    // a hatch the crates come out of, and the reject chute at the end
    addBox(G, 0.5, 0.7, 0.6, lam(0x3a6ad8), BELT_X0 - 0.55, BELT_Y + 0.35, BELT_Z);
    makePlate(G, 'INCOMING', 0.5, 0.12, new V3(BELT_X0 - 0.55, BELT_Y + 0.55, BELT_Z + 0.31), 0, { bg: '#3a6ad8', fg: '#ffffff', size: 0.6 });
    addBox(G, 0.6, 0.5, 0.6, lam(0xc84a3a), BELT_X1 + 0.65, 0.25, BELT_Z);
    makePlate(G, 'MISSED', 0.5, 0.12, new V3(BELT_X1 + 0.65, 0.42, BELT_Z + 0.31), 0, { bg: '#c84a3a', fg: '#ffffff', size: 0.6 });
    const binCol = [0x3a8ad8, 0x3aa86a, 0xd8a03a, 0xb05ad8];
    BIN_X.forEach((x, i) => {
      const m = lam(binCol[i]);
      addBox(G, BIN_W, 0.04, BIN_D, lam(0x1a1a1a), x, 0.08, BIN_Z);
      addBox(G, BIN_W, BIN_H, 0.03, m, x, BIN_H / 2, BIN_Z - BIN_D / 2);
      addBox(G, BIN_W, BIN_H * 0.6, 0.03, m, x, BIN_H * 0.3, BIN_Z + BIN_D / 2);
      for (const sx of [-1, 1]) addBox(G, 0.03, BIN_H, BIN_D, m, x + sx * BIN_W / 2, BIN_H / 2, BIN_Z);
    });
    // the labels stand on a board behind the bins
    addBox(G, 3.4, 1.2, 0.06, lam(0x5a4030), 0, 1.25, BIN_Z - BIN_D / 2 - 0.08);
    const deck = STUDY.cards(G, { n: 4, w: 0.74, h: 0.4 });
    BIN_X.forEach((x, i) => deck.place(i, x, 1.2, BIN_Z - BIN_D / 2 - 0.03, 0, 0));
    const scr = STUDY.screen(G, 1024, 400, 3.6, 1.4, 0, 3.2, -5.85, 0, 0x1a2a4a);

    // ---------------------------------------------------------------- the crate
    const crateCt = canvasTexture(256, 256);
    const crateFace = new THREE.MeshBasicMaterial({ map: crateCt.tex });
    const crateSide = lam(0xc89a5a);
    const crate = new THREE.Mesh(new THREE.BoxGeometry(CR, CR, CR), [crateSide, crateSide, crateFace, crateSide, crateFace, crateSide]);
    G.add(crate);
    const C = { st: 'belt', p: new V3(BELT_X0, BELT_Y + CR / 2, BELT_Z), v: new V3(), item: null, hand: null, spin: 0, wait: 0 };
    function drawCrate(text) {
      const g = crateCt.g;
      g.fillStyle = '#e0b878'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = '#8a6030'; g.lineWidth = 10; g.strokeRect(8, 8, 240, 240);
      g.fillStyle = '#2a1a0a'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const s = STUDY.fit(g, text, 220, 4, 64, 22, 800);
      const nl = Math.min(4, STUDY.wrap(g, text, 0, 0, 220, s * 1.1, 0, false));
      STUDY.wrap(g, text, 128, 128 - (nl - 1) * s * 0.55, 220, s * 1.1, 4);
      crateCt.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- the round
    const S = { ph: 'menu', mode: 'ports', t0: 0, score: 0, wrong: 0, missed: 0, speed: 0.32, last: null, best: {}, deckLeft: [] };
    try { if (prefs.sortBest && typeof prefs.sortBest === 'object') S.best = Object.assign({}, prefs.sortBest); } catch (e) { /* none */ }
    L.sorter = S;
    const timeLeft = () => Math.max(0, ROUND - (performance.now() - S.t0) / 1000);
    function newCrate() {
      Object.assign(C, { st: 'belt', hand: null, spin: 0, wait: 0 });
      C.p.set(BELT_X0, BELT_Y + CR / 2, BELT_Z); C.v.set(0, 0, 0);
      if (S.ph === 'menu') {
        C.item = null; drawCrate('Toss me in a bin to start');
        MODES.forEach((m, i) => deck.set(i, m.name, 'mode', { sub: m.sub, big: 46 }));
        return;
      }
      const all = items(S.mode);
      if (!S.deckLeft.length) S.deckLeft = all.slice().sort(() => rand() - 0.5);
      const it = S.deckLeft.pop();
      const others = all.filter((x) => x[1] !== it[1]).sort(() => rand() - 0.5).slice(0, 3).map((x) => x[1]);
      const opts = others.concat([it[1]]).sort(() => rand() - 0.5);
      C.item = { q: it[0], a: it[1], opts, c: opts.indexOf(it[1]) };
      drawCrate(it[0]);
      opts.forEach((t, i) => deck.set(i, t, 'idle', { big: S.mode === 'conn' || S.mode === 'wifi' ? 56 : 64 }));
    }
    function startRound(mode) {
      Object.assign(S, { ph: 'play', mode, t0: performance.now(), score: 0, wrong: 0, missed: 0, speed: 0.32, last: null, deckLeft: [] });
      sfx('whistle', 0.6);
      newCrate();
      forcePresence(); state.dirtyBoard = true;
    }
    L.startRound = startRound;
    function endRound() {
      S.ph = 'menu';
      const prev = S.best[S.mode] || 0, isBest = S.score > prev;
      if (isBest) { S.best[S.mode] = S.score; prefs.sortBest = Object.assign({}, S.best); savePrefs(); }
      RECORDS.add(L, S.mode, S.score);
      sfx(S.score >= 20 ? 'fanfare' : 'chime', 0.8);
      showToast(`Time! ${S.score} sorted${S.wrong ? `, ${S.wrong} in the wrong bin` : ''}${isBest ? ' (your best!)' : ''}`);
      S.summary = { score: S.score, wrong: S.wrong, missed: S.missed, mode: S.mode, best: isBest };
      newCrate();
      forcePresence(); state.dirtyBoard = true;
    }
    L.endRound = endRound;
    // the crate went in bin i
    function sorted(i) {
      if (S.ph === 'menu') { startRound(MODES[i].id); return; }
      if (S.ph !== 'play' || !C.item) return;
      const ok = i === C.item.c;
      if (ok) { S.score += 1; S.speed = Math.min(0.85, S.speed + 0.025); STUDY.right(); spawnFloat('+1', new V3(BIN_X[i], 1.0, BIN_Z), '#8bd450'); }
      else { S.wrong += 1; STUDY.wrong(); spawnFloat('✗', new V3(BIN_X[i], 1.0, BIN_Z), '#ff6a6a'); }
      S.last = { ok, q: C.item.q, a: C.item.a };
      deck.look(C.item.c, 'right'); if (!ok) deck.look(i, 'wrong');
      C.st = 'done'; C.wait = ok ? 0.45 : 1.3;
      forcePresence(); state.dirtyBoard = true;
    }
    L.sorted = sorted;
    function missed() {
      if (S.ph === 'play' && C.item) { S.missed += 1; S.last = { ok: false, q: C.item.q, a: C.item.a, miss: true }; deck.look(C.item.c, 'right'); STUDY.wrong(); }
      C.st = 'done'; C.wait = S.ph === 'play' ? 1.0 : 0.2;
    }
    // send the crate in a lob to bin i (the browser, and VR pointing)
    function lobTo(i) {
      if (C.st !== 'belt' && C.st !== 'held') return;
      if (C.st === 'held') C.hand = null;
      const T = 0.55, tx = BIN_X[i], ty = 0.3, tz = BIN_Z;
      C.v.set((tx - C.p.x) / T, (ty - C.p.y) / T + 0.5 * 9.8 * T, (tz - C.p.z) / T);
      C.st = 'fly'; C.spin = 6;
      sfx('whoosh', 0.3);
    }
    L.lobTo = lobTo;
    const input = STUDY.input(L, deck, { onPick: (i) => lobTo(i), touch: false, enabled: () => state.level === L.idx && (C.st === 'belt' || C.st === 'held') });
    L.throwLabel = () => 'Send';
    // VR: grab the crate when your hand is near it, throw it into a bin
    L.onVRGrab = (h) => {
      if (C.st !== 'belt' || myHands[h.side].pos.distanceTo(C.p) > 0.4) return false;
      C.st = 'held'; C.hand = h.side; sfx('grab', 0.3);
      return true;
    };
    L.onVRRelease = (h, vel) => {
      if (C.st !== 'held' || C.hand !== h.side) return;
      C.hand = null; C.st = 'fly'; C.v.copy(vel).multiplyScalar(1.1); C.spin = vel.length() * 2;
    };
    // flight: lands in a bin, on the floor, or bounces off the backboard
    function flyStep(dt) {
      C.v.y -= 9.8 * dt; C.p.addScaledVector(C.v, dt);
      const backZ = BIN_Z - BIN_D / 2 + CR / 2;
      if (C.p.z < backZ && C.p.y < 1.85) { C.p.z = backZ; C.v.z = Math.abs(C.v.z) * 0.3; C.v.x *= 0.6; sfx('wood', 0.3); }
      // over a bin, low enough to be inside it?
      if (C.p.y < BIN_H + CR * 0.3 && C.v.y < 0) {
        for (let i = 0; i < 4; i++) {
          if (Math.abs(C.p.x - BIN_X[i]) < BIN_W / 2 - 0.04 && Math.abs(C.p.z - BIN_Z) < BIN_D / 2) {
            if (C.p.y < 0.1 + CR / 2) { C.p.y = 0.1 + CR / 2; sfx('wood', 0.5); sorted(i); }
            return;
          }
        }
      }
      // back on the belt (dropped)
      if (C.p.y < BELT_Y + CR / 2 && Math.abs(C.p.z - BELT_Z) < 0.28 && C.p.x > BELT_X0 - 0.3 && C.p.x < BELT_X1 + 0.3 && C.v.y < 0) { C.p.y = BELT_Y + CR / 2; C.p.z = BELT_Z; C.v.set(0, 0, 0); C.st = 'belt'; return; }
      if (C.p.y < CR / 2) { C.p.y = CR / 2; sfx('wood', 0.4); missed(); }
    }

    // ---------------------------------------------------------------- the screen
    function drawScreen() {
      const t = S.ph === 'play' ? Math.ceil(timeLeft()) : 0;
      const key = `${S.ph}|${S.mode}|${t}|${S.score}|${S.last ? S.last.q + S.last.ok : ''}|${S.summary ? S.summary.score : ''}`;
      if (key === scr.key) return; scr.key = key;
      const g = scr.g, W = 1024, H = 400;
      g.fillStyle = '#10203a'; g.fillRect(0, 0, W, H);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      if (S.ph === 'menu') {
        g.fillStyle = '#ffd23f'; g.font = `900 80px ${DISPLAY}`; g.fillText('PORT & CABLE SORTER', W / 2, 96, W - 40);
        if (S.summary) {
          const s = S.summary;
          g.fillStyle = '#ffffff'; g.font = `800 60px ${DISPLAY}`; g.fillText(`${s.score} sorted in 60 seconds`, W / 2, 190);
          g.fillStyle = s.best ? '#8bd450' : '#9ab0d0'; g.font = `700 30px ${BODY}`;
          g.fillText(`${MODES.find((m) => m.id === s.mode).name}  ·  ${s.best ? 'your best yet!' : `best ${S.best[s.mode] || 0}`}${s.wrong ? `  ·  ${s.wrong} wrong bin` : ''}${s.missed ? `  ·  ${s.missed} missed` : ''}`, W / 2, 240, W - 60);
        } else {
          g.fillStyle = '#ffffff'; g.font = `400 32px ${BODY}`;
          STUDY.wrap(g, 'Toss each crate into the bin with its match before it rolls off the end. Sixty seconds, and the belt speeds up.', W / 2, 170, W - 120, 42);
        }
        g.fillStyle = '#ffd23f'; g.font = `700 32px ${BODY}`; g.fillText('Pick a mode: toss the crate into a bin (or aim and click)', W / 2, 350, W - 60);
        scr.tex.needsUpdate = true; return;
      }
      g.textAlign = 'left'; g.fillStyle = '#9ab0d0'; g.font = `700 30px ${BODY}`; g.fillText(MODES.find((m) => m.id === S.mode).name, 40, 52);
      g.textAlign = 'right'; g.fillStyle = '#ffffff'; g.font = `900 64px ${DISPLAY}`; g.fillText(`${t}s`, W - 40, 70);
      g.textAlign = 'center'; g.fillStyle = '#ffd23f'; g.font = `900 130px ${DISPLAY}`; g.fillText(String(S.score), W / 2, 200);
      if (S.last && !S.last.ok) {
        g.fillStyle = '#ff9a8a'; g.font = `700 38px ${BODY}`;
        g.fillText(`${S.last.miss ? 'Missed: ' : ''}${S.last.q}  →  ${S.last.a}`, W / 2, 300, W - 60);
      } else if (S.last) { g.fillStyle = '#8bd450'; g.font = `700 38px ${BODY}`; g.fillText(`${S.last.q}  →  ${S.last.a}`, W / 2, 300, W - 60); }
      scr.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- per frame
    function stand() { S.slot = STUDY.slotOf(L); STUDY.standAt(STUDY.SLOT_X[S.slot] * 0.5, state.mode === 'vr' ? SPOT_Z : 2.75, 0, -0.3); }
    let beltOff = 0;
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      hall.tick();
      if (!here) { input.hide(); return; }
      if (STUDY.slotOf(L) !== S.slot) stand();
      if (S.ph === 'play' && timeLeft() <= 0) { if (C.st === 'held') C.hand = null; endRound(); }
      const sp = S.ph === 'play' ? S.speed : 0.25;
      beltOff = (beltOff + sp * dt) % 0.4;
      stripes.forEach((s, i) => { s.position.x = BELT_X0 - 0.3 + ((i * 0.4 + beltOff) % 4.8); s.visible = s.position.x < BELT_X1 + 0.3; });
      for (const r of rollers) r.rotation.y -= sp * dt / 0.035;
      if (C.st === 'belt') {
        C.p.x += sp * dt;
        if (C.p.x > BELT_X1 + 0.2) { C.st = 'drop'; C.v.set(0.4, 0, 0); }
      } else if (C.st === 'drop') {
        C.v.y -= 9.8 * dt; C.p.addScaledVector(C.v, dt);
        if (C.p.y < 0.5) missed();
      } else if (C.st === 'held') {
        const mh = myHands[C.hand]; C.p.copy(mh.pos);
      } else if (C.st === 'fly') {
        const n = Math.max(1, Math.ceil(dt / 0.005)); for (let i = 0; i < n && C.st === 'fly'; i++) flyStep(dt / n);
      } else if (C.st === 'done') {
        C.wait -= dt;
        if (C.wait <= 0) newCrate();
      }
      crate.position.copy(C.p);
      if (C.st === 'fly') { crate.rotation.x += C.spin * dt * 0.3; crate.rotation.z += C.spin * dt * 0.2; }
      else if (C.st === 'belt' || C.st === 'held') crate.rotation.set(-0.35, 0, 0);
      crate.visible = !(C.st === 'done' && C.p.y < 0.4 && C.wait < 0.2);
      input.tick(dt);
      drawScreen();
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = S.ph === 'play' ? `${Math.ceil(timeLeft())} s  ·  ${S.score} sorted  ·  aim at a bin's label and click (or press 1-4)` : 'Port & Cable Sorter  ·  aim at a mode and click (or press 1-4)';
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.presence = () => ({ ps: [S.score, Math.max(0, ...Object.values(S.best).map(Number).filter(Number.isFinite)), S.ph === 'play' ? 1 : 0] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.ps;
      if (!Array.isArray(a) || a.length !== 3 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e5)) { st.ps = null; return; }
      if (!st.ps || st.ps[0] !== a[0] || st.ps[1] !== a[1]) state.dirtyBoard = true;
      st.ps = a;
    };
    L.rowFor = (st, isMe) => {
      const a = isMe ? L.presence().ps : st.ps;
      if (!a) return { best: 0, text: '' };
      return { best: a[1], text: `${a[2] ? `${a[0]} now · ` : ''}best ${a[1]}` };
    };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, -5.85, 2.0, -0.4, Math.PI / 2, false);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#10203a'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Sorting champs', 36, 80);
      g.fillStyle = '#c8d8f0'; g.font = `400 24px ${BODY}`; g.fillText('Most crates sorted in a minute (any mode)', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 4.2, 2.8, -Math.PI * 0.75);
    RECORDS.def(L, MODES.map((m) => ({ k: m.id, label: m.name })), { x: 5.75, z: -0.4, yaw: -Math.PI / 2 });
    L.hudActions = [{ label: () => (S.ph === 'menu' ? 'Start: ports' : 'End round'), run: () => { if (S.ph === 'menu') startRound('ports'); else endRound(); } }];
    L.hints = [['Grab + throw', 'toss the crate into the right bin'], ['Point + trigger', 'or send it to the bin you point at']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Aim + click', 'send the crate to that bin'], ['1-4', 'pick a bin by number']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0); stand(); };
    L.onEnter = () => { S.ph = 'menu'; S.summary = null; scr.key = ''; newCrate(); };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; S.ph = 'menu'; input.hide(); };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 2, 1.9, 3.0); camera.lookAt(0, 1.0, 0); };
    newCrate();
    L.sortInternals = { S, C, deck, sorted, lobTo, startRound, endRound, newCrate, items, flyStep, MODES };
    MUSIC_THEMES.portsorter = { gain: 0.6, bpm: 124, swing: 0.05, chords: ['Am', 'F', 'C', 'G'], arp: { inst: 'pluck', every: 1, order: [1, 2, 3, 4, 3, 2, 1, 2] }, bass: { at: [0, 3, 6, 8, 11, 14] }, drums: { k: 'x...x...x...x...', h: '-o-o-o-o-o-o-o-o' }, cut: 4200 };
    // End game: back to the menu
    ENDGAME.on(L, { active: () => S.ph !== 'menu', end: () => { L.onEnter(); return 'Pick a mode to start again.'; } });
    return L;
  })();
