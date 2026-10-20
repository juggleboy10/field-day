  // ================================================================ LEVEL: DUCK SHOOTING GALLERY (carnival)
  // Three rows of tin ducks glide past at the back of the booth. Pop as many as you can with the cork gun in 40
  // seconds: a duck is 1 point, a golden duck 5, and leave the bunnies alone (they cost you 3).
  // Points pay out tickets for the Skee-Ball prize counter.
  // VR: the cork gun's in your hand; pull the trigger. Browser: aim with the crosshair and click or press Space.
  const duckshoot = (() => {
    const L = newLevel(44);
    const G = L.group;
    const rand = mulberry32(4444);
    L.grabless = true;
    L.bounds = { minX: -7, maxX: 7, minZ: -3, maxZ: 6 };
    L.env = CARNIVAL.env();
    const fair = CARNIVAL.backdrop(G, rand, { pathW: 13, pathD: 8, pathZ: 1.8, wheelX: 20 });
    const N = 3, PITCH = 3.6, BW = 3.0, BD = 2.6, BZ = -1.6, ROUND = 40;
    const boothX = (k) => (k - (N - 1) / 2) * PITCH;
    const ROWS = [{ y: 1.3, sp: 0.55, dir: 1 }, { y: 1.72, sp: 0.85, dir: -1 }, { y: 2.14, sp: 1.2, dir: 1 }];
    const DZ = BZ - BD / 2 + 0.45, SPACING = 0.55, SPAN = BW - 0.4;

    // ---------------------------------------------------------------- the booths
    for (let k = 0; k < N; k++) CARNIVAL.booth(G, boothX(k), BZ, BW, BD, 'DUCK SHOOT', ['#e5453a', '#4a7ad8', '#2a9a5a'][k], '#f4f2ec');
    // the rails the ducks ride on, with blue "water" waves in front
    const waveTex = canvasTexture(128, 32, (g) => { g.fillStyle = '#2a6ad8'; g.fillRect(0, 0, 128, 32); g.fillStyle = '#5a9af8'; for (let i = 0; i < 4; i++) { g.beginPath(); g.arc(i * 32 + 16, 32, 16, Math.PI, 0); g.fill(); } });
    waveTex.tex.wrapS = THREE.RepeatWrapping; waveTex.tex.repeat.set(5, 1);
    for (let k = 0; k < N; k++) for (const r of ROWS) {
      addBox(G, BW - 0.1, 0.04, 0.12, lam(0x5a5a6a), boothX(k), r.y - 0.17, DZ - 0.02);
      const w = new THREE.Mesh(new THREE.PlaneGeometry(BW - 0.1, 0.16), new THREE.MeshLambertMaterial({ map: waveTex.tex })); w.position.set(boothX(k), r.y - 0.1, DZ + 0.08); G.add(w);
    }
    // ---------------------------------------------------------------- ducks (each booth has its own)
    const duckMat = { 0: lam(0xffd23f), 1: new THREE.MeshLambertMaterial({ color: 0xffc83a, emissive: 0xb88a00 }), 2: lam(0xf4f2ec) };
    function makeDuck(type) {
      const g = new THREE.Group(), m = duckMat[type];
      if (type === 2) {
        // a bunny: don't shoot!
        g.add(at(new THREE.Mesh(sph(0.1, 12, 10), m), 0, 0.02, 0), at(new THREE.Mesh(sph(0.07, 10, 8), m), 0, 0.15, 0));
        for (const sx of [-1, 1]) { const e = new THREE.Mesh(cyl(0.02, 0.025, 0.14, 6), m); e.position.set(sx * 0.035, 0.27, 0); g.add(e); const ei = new THREE.Mesh(cyl(0.01, 0.012, 0.1, 6), lam(0xff9ad0)); ei.position.set(sx * 0.035, 0.27, 0.015); g.add(ei); }
        g.add(at(new THREE.Mesh(sph(0.015, 6, 5), lam(0xff4d8a)), 0, 0.14, 0.07));
      } else {
        const body = new THREE.Mesh(sph(0.11, 12, 10), m); body.scale.set(1.3, 0.8, 0.5); g.add(body);
        g.add(at(new THREE.Mesh(sph(0.07, 10, 8), m), 0.08, 0.12, 0));
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 6), lam(0xf5821f)); beak.rotation.z = -Math.PI / 2; beak.position.set(0.17, 0.11, 0); g.add(beak);
        g.add(at(new THREE.Mesh(sph(0.015, 6, 5), lam(0x111111)), 0.11, 0.14, 0.05));
        // the target ring painted on its side
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.05, 16), new THREE.MeshBasicMaterial({ color: 0xe5453a })); ring.position.set(-0.02, 0, 0.056); g.add(ring);
      }
      G.add(g); return g;
    }
    const booths = [];
    for (let k = 0; k < N; k++) {
      const ducks = [];
      ROWS.forEach((r, ri) => {
        const n = Math.round(SPAN / SPACING) + 1;
        for (let i = 0; i < n; i++) {
          const types = [0, 0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 2, 0, 1, 0, 0];
          const type = types[(i * 5 + ri * 7 + k * 3) % types.length];
          const meshes = [0, 1, 2].map((t) => { const m = makeDuck(t); m.visible = false; return m; });
          ducks.push({ ri, i, off: i * SPACING, type, down: 0, meshes, lap: 0 });
        }
      });
      booths.push({ k, ducks });
    }
    // ---------------------------------------------------------------- the cork gun
    function makeGun() {
      const g = new THREE.Group();
      const barrel = new THREE.Mesh(cyl(0.018, 0.022, 0.42, 10), lam(0x6a4a2a)); barrel.rotation.x = Math.PI / 2; barrel.position.z = -0.18; g.add(barrel);
      const tip = new THREE.Mesh(cyl(0.022, 0.022, 0.04, 10), lam(0xc8c8d0)); tip.rotation.x = Math.PI / 2; tip.position.z = -0.4; g.add(tip);
      const stock = new THREE.Mesh(boxg(0.05, 0.1, 0.22), lam(0x8a5a2a)); stock.position.set(0, -0.05, 0.12); stock.rotation.x = -0.25; g.add(stock);
      return g;
    }
    const gun = makeGun(); L.overlay.add(gun);
    const corkM = lam(0xd8b080);
    const corks = [];
    for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(cyl(0.015, 0.012, 0.03, 8), corkM); c.visible = false; G.add(c); corks.push({ m: c, p: new V3(), v: new V3(), t: 0, on: false }); }

    // ---------------------------------------------------------------- the round
    const R = { k: 0, ph: 'idle', t0: 0, score: 0, hits: 0, shots: 0, best: 0, cool: 0, hand: 'right', base: 0 };
    try { if (Number.isInteger(prefs.duckBest)) R.best = prefs.duckBest; } catch (e) { /* none */ }
    L.duck = R;
    function mySlot() { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); ids.sort(); return Math.max(0, ids.indexOf(state.myPeer)) % N; }
    function standAtBooth() {
      R.k = mySlot();
      const c = new V3(); camera.getWorldPosition(c);
      dolly.position.x += boothX(R.k) - c.x; dolly.position.z += 0.45 - c.z;
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = 0.05; }
    }
    function startRound() {
      Object.assign(R, { ph: 'play', t0: performance.now(), score: 0, hits: 0, shots: 0, base: performance.now() / 1000 });
      for (const d of booths[R.k].ducks) d.down = 0;
      sfx('whistle', 0.7); showToast(`${ROUND} seconds! Ducks 1, golden ducks 5, and don't hit the bunnies`);
      forcePresence(); state.dirtyBoard = true;
    }
    L.startRound = startRound;
    function endRound() {
      R.ph = 'over';
      const isBest = R.score > R.best;
      if (isBest) { R.best = R.score; prefs.duckBest = R.best; savePrefs(); }
      const n = Math.max(0, Math.ceil(R.score / 3));
      showToast(`Time! ${R.score} points from ${R.shots} corks${isBest && R.score ? ' (your best!)' : ''}. ${n} tickets`);
      sfx(R.score >= 20 ? 'fanfare' : 'chime', 0.8);
      CARNIVAL.tickets(n, new V3(boothX(R.k), 2.4, -0.4));
      forcePresence(); state.dirtyBoard = true;
    }
    const timeLeft = () => Math.max(0, ROUND - (performance.now() - R.t0) / 1000);
    // where a duck is right now (they glide along their row and wrap round)
    function duckPos(k, d, tsec, out) {
      const r = ROWS[d.ri], wrap = SPAN + SPACING;
      let u = ((d.off + tsec * r.sp) % wrap + wrap) % wrap;
      if (r.dir < 0) u = wrap - u;
      return out.set(boothX(k) - SPAN / 2 + u - SPACING / 2, r.y, DZ);
    }
    L.duckPos = duckPos;
    const clock = () => performance.now() / 1000 - R.base;
    function fire(from, dir) {
      if (R.cool > 0) return;
      if (R.ph !== 'play') startRound();
      R.cool = 0.32; R.shots += 1;
      const c = corks.find((x) => !x.on) || corks[0];
      c.on = true; c.t = 0; c.p.copy(from); c.v.copy(dir).normalize().multiplyScalar(18); c.m.visible = true;
      tone(500, 900, 0.06, 'square', 0.12); sfx('shoot', 0.3);
      if (state.mode === 'vr') haptic(vrHands[R.hand], 0.5, 30);
    }
    L.fire = fire;
    const _p = new V3(), _q = new Q4();
    function corkStep(c, dt) {
      if (!c.on) return;
      const prev = _p.copy(c.p);
      c.v.y -= 3 * dt; c.p.addScaledVector(c.v, dt); c.t += dt;
      // past the duck rails?
      if (prev.z >= DZ && c.p.z < DZ || c.t > 1) {
        const u = (prev.z - DZ) / Math.max(1e-6, prev.z - c.p.z), hx = prev.x + (c.p.x - prev.x) * u, hy = prev.y + (c.p.y - prev.y) * u;
        c.on = false; c.m.visible = false;
        if (c.t > 1) return;
        const tsec = clock(), dp = new V3();
        let best = null, bd = 0.13;
        for (const d of booths[R.k].ducks) { if (d.down > 0) continue; duckPos(R.k, d, tsec, dp); const dd = Math.hypot(dp.x - hx, dp.y + 0.05 - hy); if (dd < bd) { bd = dd; best = d; } }
        if (best) hitDuck(best, duckPos(R.k, best, tsec, new V3()));
        else sfx('wood', 0.25);
        return;
      }
      c.m.position.copy(c.p);
    }
    function hitDuck(d, at) {
      d.down = 1;
      const pts = d.type === 1 ? 5 : d.type === 2 ? -3 : 1;
      R.score = Math.max(0, R.score + pts); R.hits += 1;
      spawnFloat(pts > 0 ? `+${pts}` : `${pts} (a bunny!)`, at.clone().add(new V3(0, 0.3, 0.3)), pts >= 5 ? '#ffd23f' : pts > 0 ? '#ffffff' : '#ff6a6a');
      if (pts > 0) tone(pts >= 5 ? 1320 : 880, pts >= 5 ? 1760 : 660, 0.1, 'triangle', 0.15); else sfx('buzzer', 0.4);
      sfx('clang', 0.4);
      forcePresence(); state.dirtyBoard = true;
    }
    L.hitDuck = hitDuck;
    // aiming: the cork leaves the gun's muzzle (VR) or your eye line (browser)
    L.onVRTrigger = (h) => {
      R.hand = h.side;
      const mh = myHands[h.side];
      fire(new V3(0, 0, -0.42).applyQuaternion(mh.quat).add(mh.pos), new V3(0, 0, -1).applyQuaternion(mh.quat));
    };
    L.deskFire = () => {
      camera.getWorldPosition(_p); camera.getWorldQuaternion(_q);
      fire(_p.clone().add(new V3(0, -0.05, -0.3).applyQuaternion(_q)), new V3(0, 0, -1).applyQuaternion(_q));
    };
    L.throwLabel = () => 'Shoot';

    // ---------------------------------------------------------------- per frame
    const _d = new V3();
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      fair.tick(dt);
      prizes.tick();
      if (!here) { gun.visible = false; return; }
      if (mySlot() !== R.k) standAtBooth();
      R.cool = Math.max(0, R.cool - dt);
      if (R.ph === 'play' && timeLeft() <= 0) endRound();
      for (const c of corks) { const n = Math.max(1, Math.ceil(dt / 0.005)); for (let i = 0; i < n && c.on; i++) corkStep(c, dt / n); }
      // ducks: mine move with the round's clock; the other booths' just glide
      const tsec = clock();
      booths.forEach((b) => {
        for (const d of b.ducks) {
          duckPos(b.k, d, b.k === R.k ? tsec : now / 1000, _d);
          // a knocked-down duck comes back up when it goes round the end
          const wrap = SPAN + SPACING, lap = Math.floor((d.off + (b.k === R.k ? tsec : now / 1000) * ROWS[d.ri].sp) / wrap);
          if (lap !== d.lap) { d.lap = lap; d.down = 0; }
          d.meshes.forEach((m, t) => { m.visible = t === d.type; });
          const m = d.meshes[d.type];
          m.position.copy(_d); m.rotation.set(d.down ? -1.5 : 0, ROWS[d.ri].dir < 0 ? Math.PI : 0, 0);
          if (d.down) m.position.y -= 0.12;
          // hide them at the ends of the row (behind the booth's side walls)
          m.visible = Math.abs(_d.x - boothX(b.k)) < SPAN / 2;
        }
      });
      // the gun
      gun.visible = true;
      if (state.mode === 'vr') { const mh = myHands[R.hand]; gun.position.copy(mh.pos); gun.quaternion.copy(mh.quat); gun.visible = mh.ok; gun.scale.setScalar(1); }
      else { camera.getWorldPosition(_p); camera.getWorldQuaternion(_q); const kick = R.cool > 0.2 ? (R.cool - 0.2) * 0.4 : 0; gun.position.copy(new V3(0.17, -0.2, -0.42 + kick).applyQuaternion(_q).add(_p)); gun.quaternion.copy(_q); gun.scale.setScalar(0.7); }
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = R.ph === 'play' ? `${Math.ceil(timeLeft())} s  ·  ${R.score} points  ·  ${R.hits} hits from ${R.shots} corks` : `Duck Shoot  ·  click or Space to start shooting  ·  best ${R.best}`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.presence = () => ({ du: [R.k, R.score, R.best, R.ph === 'play' ? 1 : 0] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.du;
      if (!Array.isArray(a) || a.length !== 4 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e6) || a[0] >= N) { st.du = null; return; }
      if (!st.du || st.du[1] !== a[1] || st.du[2] !== a[2]) state.dirtyBoard = true;
      st.du = a;
    };
    L.rowFor = (st, isMe) => { const b = isMe ? R.best : st.du ? st.du[2] : 0, now = isMe ? (R.ph === 'play' ? R.score : 0) : st.du && st.du[3] ? st.du[1] : 0; return { best: b, text: `${now ? `${now} now · ` : ''}best ${b}` }; };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, -6.3, 1.9, 2.4, Math.PI / 2);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#1a1020'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#4fc3f7'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Sharpshooters', 36, 80);
      g.fillStyle = '#e8d8f0'; g.font = `400 24px ${BODY}`; g.fillText('Best score in 40 seconds', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 6.2, 4.6, -Math.PI * 0.75);
    const prizes = CARNIVAL.prizeStand(L, 6.2, 1.6, -Math.PI / 2);   // spend your tickets here
    L.hudActions = [{ label: () => (R.ph === 'play' ? 'Restart' : 'Start round'), run: () => startRound() }];
    L.hints = [['Trigger', 'fire a cork (the first shot starts the round)'], ['Golden ducks', '5 points'], ['Bunnies', 'cost you 3'], ['Prize stand', 'on the right: spend your tickets']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Aim', 'with the crosshair'], ['Click or Space', 'fire a cork'], ['Golden ducks', '5 points; bunnies cost 3'], ['Prize stand', 'on the right: spend your tickets']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0.45); standAtBooth(); };
    L.onEnter = () => { R.ph = 'idle'; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; gun.visible = false; R.ph = 'idle'; for (const c of corks) { c.on = false; c.m.visible = false; } };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 3, 2.0, 4.5); camera.lookAt(0, 1.6, -2); };
    L.duckInternals = { R, booths, fire, corkStep, duckPos, hitDuck, startRound, endRound, clock, corks, DZ };
    MUSIC_THEMES.duckshoot = { gain: 0.7, bpm: 126, swing: 0.15, chords: ['F', 'C', 'G', 'C'], comp: { inst: 'musicbox', at: [0, 2, 4, 6, 8, 10, 12, 14], dur: 0.1 }, bass: { at: [0, 4, 8, 12] }, drums: { k: 'x...x...x...x...', h: '..o...o...o...o.' }, cut: 4600 };
    return L;
  })();
