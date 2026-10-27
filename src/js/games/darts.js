  // ================================================================ LEVEL: PUB DARTS
  // A cosy pub with three dartboards on the back wall: one each, against Dart Dave.
  // 301: count down from 301 to exactly zero (going below is a bust and the turn doesn't count).
  // Around the Clock: hit 1, 2, 3 ... 20 in order, then the bull. Three darts a turn, you and Dave take turns.
  // VR: squeeze a grip and a dart appears in that hand; throw it. Browser: aim with the mouse
  // (fine aim, your hand wobbles), hold Space to steady it and let go to throw.
  const darts = (() => {
    const L = newLevel(36);
    const G = L.group;
    const rand = mulberry32(3636);
    L.grabless = true;
    L.chargeKick = true;
    L.bounds = { minX: -4.6, maxX: 4.6, minZ: -2.1, maxZ: 4.4 };
    L.env = {
      sky: skyTexture([[0, '#1a1008'], [1, '#1a1008']]),
      bg: 0x1a1008, fog: [0x1a1008, 14, 40], hemi: [0xffe0b0, 0x302010, 0.75],
      sun: [0xffe8c0, 0.5], sunDir: new V3(0.2, 1, 0.5), ambient: [0x5a4030, 0.5], sprite: null,
    };
    const N = 3, PITCH = 2.6, BZ = -2.37, BY = 1.73, R_OUT = 0.2255, R_SCORE = 0.170;
    const laneX = (k) => (k - (N - 1) / 2) * PITCH;
    const NUMS = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
    // ---------------------------------------------------------------- the pub
    const woodFloor = canvasTexture(256, 256, (g) => {
      for (let i = 0; i < 8; i++) { g.fillStyle = ['#5a3a20', '#4e3218', '#64422a'][i % 3]; g.fillRect(0, i * 32, 256, 32); g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, i * 32, 256, 2); g.fillRect((i * 97) % 256, i * 32, 2, 32); }
    });
    woodFloor.tex.wrapS = woodFloor.tex.wrapT = THREE.RepeatWrapping; woodFloor.tex.repeat.set(4, 3);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(10, 7.4), new THREE.MeshLambertMaterial({ map: woodFloor.tex })); fl.rotation.x = -Math.PI / 2; fl.position.z = 1.1; G.add(fl);
    const wallMat = lam(0x2a4a34), panelMat = lam(0x5a3a22);
    for (const [w, x, z, ry] of [[10, 0, -2.5, 0], [7.4, -5, 1.1, Math.PI / 2], [7.4, 5, 1.1, -Math.PI / 2], [10, 0, 4.8, Math.PI]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 3.4), wallMat); m.position.set(x, 1.7, z); m.rotation.y = ry; G.add(m);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.0), panelMat); p.position.set(x + Math.sin(ry) * 0.01, 0.5, z + Math.cos(ry) * 0.01); p.rotation.y = ry; G.add(p);
    }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(10, 7.4), lam(0x3a2414)); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.4, 1.1); G.add(ceil);
    for (let i = -2; i <= 2; i++) addBox(G, 0.16, 0.16, 7.4, lam(0x2a180c), i * 2.2, 3.32, 1.1);   // beams
    // the bar, along the right wall, with taps and stools
    addBox(G, 0.7, 1.05, 4.2, lam(0x6a3e1e), 4.4, 0.525, 1.8); addBox(G, 0.82, 0.06, 4.3, lam(0x8a5a2a), 4.38, 1.08, 1.8);
    for (let i = 0; i < 4; i++) { addCyl(G, 0.025, 0.025, 0.3, 8, lam(0xd8b060), 4.5, 1.25, 0.6 + i * 0.5); addCyl(G, 0.04, 0.04, 0.08, 8, lam([0xe5453a, 0x2a2a2a, 0x4a8a3a, 0xffd23f][i]), 4.5, 1.43, 0.6 + i * 0.5); }
    for (let i = 0; i < 4; i++) { addCyl(G, 0.2, 0.2, 0.06, 14, lam(0xa8302a), 3.75, 0.78, 0.6 + i * 1.0); addCyl(G, 0.03, 0.03, 0.75, 6, lam(0x2a2a2a), 3.75, 0.38, 0.6 + i * 1.0); }
    // shelves of bottles behind the bar
    addBox(G, 0.25, 0.04, 4, lam(0x5a3a22), 4.86, 1.8, 1.8); addBox(G, 0.25, 0.04, 4, lam(0x5a3a22), 4.86, 2.3, 1.8);
    for (let i = 0; i < 18; i++) { const c = [0x3a8a4a, 0x8a4a2a, 0xd8d0b0, 0x2a5a8a][i % 4]; addCyl(G, 0.04, 0.04, 0.24, 8, new THREE.MeshLambertMaterial({ color: c, transparent: true, opacity: 0.8 }), 4.86, 1.94 + (i % 2) * 0.5, 0.0 + (i >> 1) * 0.42); }
    // a round table or two
    for (const [x, z] of [[-3.6, 2.6], [-1.4, 3.6]]) { addCyl(G, 0.45, 0.45, 0.05, 18, lam(0x6a3e1e), x, 0.76, z); addCyl(G, 0.05, 0.08, 0.74, 8, lam(0x2a2a2a), x, 0.37, z); }
    // warm lamps over each board
    const glowM = new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffe0a0, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    for (let k = 0; k < N; k++) { const s = new THREE.Sprite(glowM); s.position.set(laneX(k), 2.55, BZ + 0.35); s.scale.set(1.6, 1.6, 1); G.add(s); addCyl(G, 0.12, 0.2, 0.14, 12, lam(0x2a4a34), laneX(k), 2.62, BZ + 0.35); }
    makePlate(G, 'THE BULL & ARROW', 3.4, 0.5, new V3(0, 2.95, BZ + 0.02), 0, { bg: '#2a180c', fg: '#ffd27a', size: 0.62 });

    // ---------------------------------------------------------------- the boards
    const boardTex = canvasTexture(1024, 1024, (g) => {
      const c = 512, s = 512 / R_OUT;
      g.fillStyle = '#141414'; g.fillRect(0, 0, 1024, 1024);
      g.beginPath(); g.arc(c, c, R_OUT * s, 0, Math.PI * 2); g.fillStyle = '#141414'; g.fill();
      const ring = (r0, r1, colA, colB) => {
        for (let i = 0; i < 20; i++) {
          const a0 = (i * 18 - 9 - 90) * Math.PI / 180, a1 = (i * 18 + 9 - 90) * Math.PI / 180;
          g.beginPath(); g.arc(c, c, r1 * s, a0, a1); g.arc(c, c, r0 * s, a1, a0, true); g.closePath();
          g.fillStyle = i % 2 ? colB : colA; g.fill();
        }
      };
      ring(0.0159, 0.099, '#1a1a1a', '#efe2c0');
      ring(0.099, 0.107, '#d82a2a', '#2a8a3a');
      ring(0.107, 0.162, '#1a1a1a', '#efe2c0');
      ring(0.162, 0.170, '#d82a2a', '#2a8a3a');
      g.beginPath(); g.arc(c, c, 0.0159 * s, 0, Math.PI * 2); g.fillStyle = '#2a8a3a'; g.fill();
      g.beginPath(); g.arc(c, c, 0.00635 * s, 0, Math.PI * 2); g.fillStyle = '#d82a2a'; g.fill();
      // the wire
      g.strokeStyle = '#c8c8c8'; g.lineWidth = 2;
      for (const r of [0.0159, 0.099, 0.107, 0.162, 0.170]) { g.beginPath(); g.arc(c, c, r * s, 0, Math.PI * 2); g.stroke(); }
      for (let i = 0; i < 20; i++) { const a = (i * 18 - 9 - 90) * Math.PI / 180; g.beginPath(); g.moveTo(c + Math.cos(a) * 0.0159 * s, c + Math.sin(a) * 0.0159 * s); g.lineTo(c + Math.cos(a) * 0.17 * s, c + Math.sin(a) * 0.17 * s); g.stroke(); }
      // the numbers
      g.fillStyle = '#ffffff'; g.font = `700 64px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      NUMS.forEach((n, i) => { const a = (i * 18 - 90) * Math.PI / 180; g.fillText(String(n), c + Math.cos(a) * 0.197 * s, c + Math.sin(a) * 0.197 * s); });
    });
    const boards = [];
    for (let k = 0; k < N; k++) {
      const x = laneX(k);
      const back = new THREE.Mesh(cyl(R_OUT + 0.015, R_OUT + 0.015, 0.04, 40), lam(0x141414)); back.rotation.x = Math.PI / 2; back.position.set(x, BY, BZ + 0.02); G.add(back);
      const face = new THREE.Mesh(new THREE.CircleGeometry(R_OUT, 64), new THREE.MeshLambertMaterial({ map: boardTex.tex }));
      face.position.set(x, BY, BZ + 0.041); G.add(face);
      // a cork surround to catch misses, the oche line, and the chalkboard
      const cork = new THREE.Mesh(new THREE.CircleGeometry(0.45, 40), lam(0x4a3420)); cork.position.set(x, BY, BZ + 0.005); G.add(cork);
      addBox(G, 0.7, 0.012, 0.05, lam(0xd8b060), x, 0.006, 0);
      const ch = canvasTexture(512, 512);
      const chalk = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshBasicMaterial({ map: ch.tex }));
      chalk.position.set(x + 0.95, 1.55, BZ + 0.035); G.add(chalk);
      addBox(G, 0.76, 0.76, 0.03, lam(0x5a3a22), x + 0.95, 1.55, BZ + 0.005);
      boards.push({ k, x, ch, key: '' });
    }
    // a hit on the board (x right, y up, from the centre) is worth...
    function scoreAt(x, y) {
      const r = Math.hypot(x, y);
      if (r < 0.00635) return { v: 50, n: 25, m: 2, label: 'BULLSEYE!' };
      if (r < 0.0159) return { v: 25, n: 25, m: 1, label: '25' };
      if (r > R_SCORE) return { v: 0, n: 0, m: 0, label: r > R_OUT ? 'Missed the board' : 'Outside the wire' };
      const deg = ((Math.atan2(x, y) * 180 / Math.PI) + 9 + 360) % 360, n = NUMS[Math.floor(deg / 18) % 20];
      const m = r >= 0.162 ? 2 : r >= 0.099 && r <= 0.107 ? 3 : 1;
      return { v: n * m, n, m, label: m === 3 ? `Treble ${n}` : m === 2 ? `Double ${n}` : String(n) };
    }
    L.scoreAt = scoreAt;
    // the spot to aim for a given number and ring (for Dave)
    function spotFor(n, m) {
      if (n === 25) return [0, 0];
      const a = NUMS.indexOf(n) * 18 * Math.PI / 180, r = m === 3 ? 0.103 : m === 2 ? 0.166 : 0.135;
      return [Math.sin(a) * r, Math.cos(a) * r];
    }
    L.spotFor = spotFor;

    // ---------------------------------------------------------------- darts
    function makeDart(col) {
      const g = new THREE.Group();
      const tip = new THREE.Mesh(cyl(0.0008, 0.0015, 0.03, 6), lam(0xd8d8d8)); tip.rotation.x = Math.PI / 2; tip.position.z = -0.065; g.add(tip);
      const barrel = new THREE.Mesh(cyl(0.0042, 0.0035, 0.05, 10), lam(0xb8b0a0)); barrel.rotation.x = Math.PI / 2; barrel.position.z = -0.03; g.add(barrel);
      const shaft = new THREE.Mesh(cyl(0.0022, 0.0022, 0.04, 6), lam(0x2a2a2a)); shaft.rotation.x = Math.PI / 2; shaft.position.z = 0.015; g.add(shaft);
      const fm = new THREE.MeshLambertMaterial({ color: col, side: THREE.DoubleSide });
      for (let i = 0; i < 2; i++) { const fg = new THREE.Group(); fg.rotation.z = i * Math.PI / 2; const fp = new THREE.Mesh(new THREE.PlaneGeometry(0.028, 0.034), fm); fp.rotation.y = Math.PI / 2; fp.position.z = 0.045; fg.add(fp); g.add(fg); }
      g.userData.fm = fm;
      G.add(g);
      return g;
    }
    // my darts (3) and Dave's (3) on my board, and a flight colour for each
    const myDarts = [0, 1, 2].map(() => makeDart(PLAYER_COLORS[state.colorIdx].hex));
    const daveDarts = [0, 1, 2].map(() => makeDart(0xe5453a));
    L.setColor = (hex) => { for (const d of myDarts) d.userData.fm.color.set(hex); };
    const ALL = myDarts.concat(daveDarts);
    for (const d of ALL) d.visible = false;
    // the dart in the air (only ever one)
    const F = { on: false, who: 'me', i: 0, pos: new V3(), vel: new V3() };
    L.flight = F;

    // ---------------------------------------------------------------- the game
    const MODES = [{ id: '301', name: '301' }, { id: 'clock', name: 'Around the Clock' }];
    const S = { k: 0, mode: 0, phase: 'idle', turn: 'me', thrown: 0, sc: [301, 301], start: [301, 301], wait: 0, wins: 0, legs: 0, last: '', aim: null, held: null, daveNext: 0 };
    try { if (Number.isInteger(prefs.dartWins)) S.wins = prefs.dartWins; } catch (e) { /* none */ }
    L.darts = S;
    const isClock = () => MODES[S.mode].id === 'clock';
    const clockName = (t) => (t >= 21 ? 'the bull' : String(t));
    function mySlot() { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); ids.sort(); return Math.max(0, ids.indexOf(state.myPeer)) % N; }
    function standAtOche() {
      S.k = mySlot();
      const c = new V3(); camera.getWorldPosition(c);
      dolly.position.x += laneX(S.k) - c.x; dolly.position.z += 0.3 - c.z;
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = 0.05; aim.yaw = 0; aim.pitch = 0.05; aim.last = null; }
    }
    function newLeg() {
      const v = isClock() ? 1 : 301;
      S.myDarts = 0;
      Object.assign(S, { phase: 'play', turn: 'me', thrown: 0, sc: [v, v], start: [v, v], wait: 0, last: '' });
      for (const d of ALL) d.visible = false;
      F.on = false;
      sfx('whistle', 0.6);
      showToast(isClock() ? 'Around the Clock: hit 1 to 20 in order, then the bull. You throw first' : '301: count down to exactly zero. You throw first');
      forcePresence(); state.dirtyBoard = true;
    }
    L.newLeg = newLeg;
    function setMode(i) { S.mode = i; newLeg(); state.hudDirty = true; }
    function nextTurn() {
      S.turn = S.turn === 'me' ? 'dave' : 'me'; S.thrown = 0;
      const p = S.turn === 'me' ? 0 : 1; S.start[p] = S.sc[p];
      for (const d of (S.turn === 'me' ? myDarts : daveDarts)) d.visible = false;
      if (S.turn === 'dave') { S.daveNext = 1.0; for (const d of myDarts) d.visible = false; }
      else { for (const d of daveDarts) d.visible = false; showToast('Your throw'); }
      forcePresence();
    }
    function endLeg(winner) {
      S.phase = 'over'; S.legs += 1;
      if (winner === 'me') RECORDS.add(L, isClock() ? 'clock' : 'd301', S.myDarts);
      if (winner === 'me') { S.wins += 1; prefs.dartWins = S.wins; savePrefs(); showToast(isClock() ? 'Round the clock and the bull: you win!' : 'Checked out! You win the leg'); sfx('fanfare', 1); sfx('cheer', 0.7); }
      else { showToast('Dart Dave wins this leg. Go again?'); sfx('buzzer', 0.5); }
      forcePresence(); state.dirtyBoard = true;
    }
    // a dart lands: p is the thrower (0 me, 1 Dave)
    function land(p, hit) {
      const res = scoreAt(hit.x, hit.y);
      const who = p === 0 ? 'You' : 'Dave';
      let msg = res.label, col = res.v >= 50 || res.m === 3 ? '#ffd23f' : res.v ? '#ffffff' : '#9aa0b0';
      if (isClock()) {
        const t = S.sc[p];
        const ok = t >= 21 ? res.n === 25 : res.n === t && res.m > 0;
        if (ok) { S.sc[p] = t + 1; msg = t >= 21 ? 'Bull! Round the clock' : `${t} ✓`; col = '#8bd450'; sfx('chime', 0.4); }
        else if (res.v) msg = `${res.label} (need ${clockName(t)})`;
        if (S.sc[p] > 21) { S.thrown = 3; S.wait = 1.2; spawnFloat(msg, hitWorld(hit), col); endLeg(p === 0 ? 'me' : 'dave'); return; }
      } else {
        const left = S.sc[p] - res.v;
        if (left < 0) { S.sc[p] = S.start[p]; msg = `${res.label}: bust!`; col = '#ff6a6a'; sfx('buzzer', 0.4); S.thrown = 3; }
        else { S.sc[p] = left; if (res.v >= 60) sfx('cheer', 0.4); }
        if (S.sc[p] === 0) { spawnFloat(`${res.label}: checkout!`, hitWorld(hit), '#8bd450'); endLeg(p === 0 ? 'me' : 'dave'); return; }
      }
      spawnFloat(msg, hitWorld(hit), col);
      S.last = `${who}: ${msg}`;
      tone(res.v ? 900 : 300, 0, 0.05, 'square', 0.15); sfx('wood', 0.5);
      if (S.thrown >= 3) S.wait = 1.4;
      forcePresence(); state.dirtyBoard = true;
    }
    const hitWorld = (hit) => new V3(laneX(S.k) + hit.x, BY + hit.y + 0.08, BZ + 0.1);
    // launch a dart: p 0 me / 1 Dave
    function launch(p, from, vel) {
      if (S.phase !== 'play') newLeg();
      F.on = true; F.who = p; F.i = S.thrown; F.pos.copy(from); F.vel.copy(vel);
      if (p === 0) S.myDarts = (S.myDarts || 0) + 1;
      S.thrown += 1;
      const d = (p === 0 ? myDarts : daveDarts)[F.i]; d.visible = true; d.position.copy(from);
      sfx('whoosh', 0.25);
      forcePresence();
    }
    L.launch = launch;
    const _dir = new V3(), _q = new Q4(), _f = new V3();
    function flightStep(dt) {
      if (!F.on) return;
      F.vel.y -= 9.8 * dt;
      const prevZ = F.pos.z;
      F.pos.addScaledVector(F.vel, dt);
      const d = (F.who === 0 ? myDarts : daveDarts)[F.i];
      if (F.pos.z <= BZ + 0.045 && prevZ > BZ + 0.045) {
        // where it crossed the face of the board
        const u = (prevZ - (BZ + 0.045)) / Math.max(1e-6, prevZ - F.pos.z);
        const hx = F.pos.x - F.vel.x * dt * (1 - u) - laneX(S.k), hy = F.pos.y - F.vel.y * dt * (1 - u) - BY;
        F.on = false;
        if (Math.hypot(hx, hy) > 0.45) { d.visible = false; land(F.who, { x: 9, y: 9 }); return; }   // missed the cork too
        d.position.set(laneX(S.k) + hx, BY + hy, BZ + 0.045 + 0.05);
        _dir.copy(F.vel).normalize(); d.quaternion.setFromUnitVectors(new V3(0, 0, -1), _dir);
        land(F.who, { x: hx, y: hy });
        return;
      }
      if (F.pos.y < 0.02 || Math.abs(F.pos.x - laneX(S.k)) > 2 || F.pos.z > 3) { F.on = false; d.visible = false; land(F.who, { x: 9, y: 9 }); return; }
      d.position.copy(F.pos);
      _dir.copy(F.vel).normalize(); d.quaternion.setFromUnitVectors(new V3(0, 0, -1), _dir);
    }
    L.flightStep = flightStep;
    // the velocity that carries a dart from 'from' to the board spot (x, y) in a gentle arc
    function velTo(from, x, y, speed) {
      const tx = laneX(S.k) + x, ty = BY + y, tz = BZ + 0.045;
      const dz = from.z - tz, T = dz / speed;
      return new V3((tx - from.x) / T, (ty - from.y) / T + 0.5 * 9.8 * T, -speed);
    }
    // Dart Dave: aims sensibly and scatters a little
    function daveAim() {
      const p = 1;
      if (isClock()) { const t = S.sc[p]; return t >= 21 ? spotFor(25, 1) : spotFor(t, 1); }
      const rem = S.sc[p];
      if (rem > 60) return spotFor(20, 3);
      if (rem === 50) return spotFor(25, 2);
      if (rem <= 20) return spotFor(rem, 1);
      if (rem <= 40 && rem % 2 === 0) return spotFor(rem / 2, 2);
      if (rem <= 40) return spotFor(rem - 20, 1);
      if (rem <= 57 && rem % 3 === 0) return spotFor(rem / 3, 3);
      return spotFor(Math.min(20, rem - 40), 1);
    }
    const gauss = () => { let a = 0; for (let i = 0; i < 4; i++) a += rand(); return (a - 2) * 1.7; };
    function daveThrow() {
      const [ax, ay] = daveAim();
      const from = new V3(laneX(S.k) - 0.35, 1.7, 0.1);
      launch(1, from, velTo(from, ax + gauss() * 0.028, ay + gauss() * 0.028, 9));
    }
    // ---------------------------------------------------------------- browser aiming: a fine aim, a wobble, Space steadies
    const aim = { yaw: 0, pitch: 0.05, last: null, lastP: null, steady: 0, t: 0 };
    L.flatCamera = (dt) => {
      if (aim.last === null) { aim.last = state.yaw; aim.lastP = state.pitch; }
      aim.yaw += (state.yaw - aim.last) * 0.3; aim.pitch += (state.pitch - aim.lastP) * 0.3;
      aim.last = state.yaw; aim.lastP = state.pitch;
      aim.yaw = clamp(aim.yaw, -0.6, 0.6); aim.pitch = clamp(aim.pitch, -0.5, 0.6);
      camera.position.set(0, 1.6, -1.25);
      camera.rotation.set(aim.pitch, aim.yaw, 0, 'YXZ');
      return true;
    };
    // the wobble: big at first, shrinks while you hold Space, then your arm gets tired
    function wobble(now) {
      const held = state.charge !== null ? (now - state.charge) / 1000 : 0;
      const k = state.charge === null ? 1 : held < 0.9 ? 1 - 0.8 * held / 0.9 : Math.min(1.6, 0.28 + (held - 0.9) * 1.2);
      const t = now / 1000;
      return [k * (Math.sin(t * 1.7) * 0.012 + Math.sin(t * 3.1 + 1) * 0.007), k * (Math.sin(t * 1.3 + 2) * 0.011 + Math.sin(t * 2.7) * 0.006)];
    }
    // where the mouse is aiming on the board (local x, y), or null
    const _cp = new V3();
    function aimPoint(now) {
      camera.getWorldPosition(_cp); camera.getWorldQuaternion(_q); _f.set(0, 0, -1).applyQuaternion(_q);
      if (_f.z > -0.1) return null;
      const t = (BZ + 0.045 - _cp.z) / _f.z;
      const w = wobble(now);
      return [_cp.x + _f.x * t - laneX(S.k) + w[0], _cp.y + _f.y * t - BY + w[1]];
    }
    L.aimPoint = aimPoint;
    const reticle = new THREE.Mesh(new THREE.RingGeometry(0.008, 0.012, 20), new THREE.MeshBasicMaterial({ color: 0x8bff6a, depthTest: false, transparent: true }));
    reticle.renderOrder = 998; G.add(reticle);
    const myTurn = () => S.phase !== 'play' || (S.turn === 'me' && S.thrown < 3 && !F.on && S.wait <= 0);
    L.kick = () => {
      if (!myTurn()) return;
      if (S.phase !== 'play') { newLeg(); return; }
      const p = aimPoint(performance.now());
      if (!p) return;
      camera.getWorldPosition(_cp);
      const from = _cp.clone().add(new V3(0.15, -0.12, -0.25).applyQuaternion(camera.getWorldQuaternion(_q)));
      launch(0, from, velTo(from, p[0], p[1], 10));
    };
    L.throwLabel = () => (S.phase !== 'play' ? 'Start' : myTurn() ? 'Throw' : '…');
    // ---------------------------------------------------------------- VR: squeeze for a dart, throw it
    L.onVRGrab = (h) => {
      if (S.phase !== 'play') newLeg();
      if (!myTurn() || S.held) return false;
      S.held = h.side; sfx('grab', 0.3);
      const d = myDarts[S.thrown]; d.visible = true;
      return true;
    };
    L.onVRRelease = (h, vel) => {
      if (S.held !== h.side) return;
      S.held = null;
      const v = vel.clone();
      if (v.length() < 1.2 || v.z > -0.5) { myDarts[S.thrown].visible = false; return; }   // put it down
      // a touch of help: trim the sideways wobble of a real throw
      v.x *= 0.85;
      // and a touch more carry (throws measured from the controller come out a little short)
      v.multiplyScalar(1.08); v.y += 0.45;
      launch(0, myHands[h.side].pos.clone(), v);
    };

    // ---------------------------------------------------------------- drawing, network, the rest
    function drawChalk(b, s) {
      const key = s ? `${s.mode}|${s.sc.join()}|${s.turn}|${s.name}|${s.phase}` : 'none';
      if (key === b.key) return; b.key = key;
      const g = b.ch.g;
      g.fillStyle = '#1e2a22'; g.fillRect(0, 0, 512, 512);
      g.strokeStyle = 'rgba(255,255,255,0.15)'; g.lineWidth = 3; g.strokeRect(10, 10, 492, 492);
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f4f0e0';
      if (!s) { g.font = `700 54px ${DISPLAY}`; g.fillText('Free board', 256, 230); g.font = `400 30px ${BODY}`; g.fillText('Walk up and throw', 256, 300); b.ch.tex.needsUpdate = true; return; }
      g.font = `700 44px ${DISPLAY}`; g.fillText(MODES[s.mode].name, 256, 60);
      g.beginPath(); g.moveTo(256, 110); g.lineTo(256, 480); g.moveTo(30, 170); g.lineTo(482, 170); g.stroke();
      g.font = `700 38px ${BODY}`;
      g.fillStyle = s.turn === 'me' ? '#ffd23f' : '#f4f0e0'; g.fillText(s.name.slice(0, 9), 140, 140);
      g.fillStyle = s.turn === 'dave' ? '#ffd23f' : '#f4f0e0'; g.fillText('Dave', 372, 140);
      g.fillStyle = '#f4f0e0'; g.font = `700 120px ${DISPLAY}`;
      const show = (v) => (s.mode === 1 ? (v > 21 ? '✓' : v >= 21 ? 'Bull' : String(v)) : String(v));
      g.fillText(show(s.sc[0]), 140, 300); g.fillText(show(s.sc[1]), 372, 300);
      if (s.mode === 1) { g.font = `400 28px ${BODY}`; g.fillText('next target', 256, 420); }
      if (s.phase === 'over') { g.fillStyle = '#8bd450'; g.font = `700 40px ${BODY}`; g.fillText('Leg over', 256, 450); }
      b.ch.tex.needsUpdate = true;
    }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (here) {
        if (mySlot() !== S.k) standAtOche();
        const n = Math.max(1, Math.ceil(dt / 0.004));
        for (let i = 0; i < n; i++) flightStep(dt / n);
        if (S.phase === 'play' && !F.on) {
          if (S.wait > 0) { S.wait -= dt; if (S.wait <= 0 && S.phase === 'play') nextTurn(); }
          else if (S.turn === 'dave') { S.daveNext -= dt; if (S.daveNext <= 0 && S.thrown < 3) { daveThrow(); S.daveNext = 0.9; } }
        } else if (S.phase === 'over' && S.wait > 0) S.wait -= dt;
      }
      // the dart in my hand (VR)
      if (S.held && here) { const d = myDarts[S.thrown]; const mh = myHands[S.held]; d.visible = true; d.position.copy(mh.pos).add(new V3(0, 0, -0.06).applyQuaternion(mh.quat)); d.quaternion.copy(mh.quat); }
      // the reticle (browser, my turn)
      const p = here && state.mode === 'flat' && myTurn() && S.phase === 'play' ? aimPoint(now) : null;
      reticle.visible = !!p;
      if (p) reticle.position.set(laneX(S.k) + p[0], BY + p[1], BZ + 0.06);
      // chalkboards: mine and the others'
      const slots = {};
      if (here) slots[S.k] = { mode: S.mode, sc: S.sc, turn: S.turn, name: state.name || 'You', phase: S.phase };
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && rec.inGame && st && st.dt) slots[st.dt[0]] = { mode: st.dt[1], sc: [st.dt[2], st.dt[3]], turn: st.dt[4] ? 'dave' : 'me', name: rec.name || 'Player', phase: st.dt[5] ? 'over' : 'play' }; }
      for (const b of boards) drawChalk(b, slots[b.k]);
      if (here && ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = S.phase !== 'play' ? `${MODES[S.mode].name}  ·  ${S.wins} legs won  ·  press Space to start` : S.turn === 'me' ? `Your throw: dart ${Math.min(3, S.thrown + 1)} of 3  ·  ${isClock() ? `aim for ${clockName(S.sc[0])}` : `${S.sc[0]} left`}  ·  hold Space to steady` : `Dart Dave is throwing${S.last ? `  ·  ${S.last}` : ''}`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.presence = () => ({ dt: [S.k, S.mode, S.sc[0], S.sc[1], S.turn === 'dave' ? 1 : 0, S.phase === 'over' ? 1 : 0, S.wins] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.dt;
      if (!Array.isArray(a) || a.length !== 7 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 100000) || a[0] >= N || a[1] > 1) { st.dt = null; return; }
      if (!st.dt || st.dt[6] !== a[6]) state.dirtyBoard = true;
      st.dt = a;
    };
    L.rowFor = (st, isMe) => { const w = isMe ? S.wins : st.dt ? st.dt[6] : 0; return { best: w, text: `${w} leg${w === 1 ? '' : 's'} won` }; };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.0, 1.28, -4.9, 1.8, 1.4, Math.PI / 2, false);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#1e2a22'; g.fillRect(0, 0, W, 460);
      g.strokeStyle = '#d8b060'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd27a'; g.font = `800 56px ${DISPLAY}`; g.fillText('Legs won', 36, 80);
      g.fillStyle = '#d8d0c0'; g.font = `400 24px ${BODY}`; g.fillText('Beat Dart Dave at 301 or Around the Clock', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    // game buttons by the oche of each... one pair, by the middle board's left
    RECORDS.def(L, [{ k: 'd301', label: 'Fewest darts: 301', low: true }, { k: 'clock', label: 'Fewest darts: Around the Clock', low: true }]);
    MODES.forEach((m, i) => makeButton(L, new V3(-4.4, 1.0, 0.2 + i * 0.6), i ? 0x4fc3f7 : 0xffd23f, m.name, () => setMode(i), { faceYaw: Math.PI / 2 }));
    makeKiosk(L, -4.4, 3.4, Math.PI / 2);
    L.hudActions = [
      { label: () => (S.phase === 'play' ? 'New leg' : 'Start leg'), run: () => newLeg() },
      { label: () => `Game: ${MODES[S.mode].name} ▸`, run: () => setMode((S.mode + 1) % MODES.length) },
    ];
    L.hints = [['Grip', 'a dart appears in your hand'], ['Throw', 'a smooth push toward the board'], ['Buttons', 'on the left wall: 301 or Around the Clock']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Mouse', 'aim (your hand wobbles)'], ['Hold Space', 'steady your hand, let go to throw'], ['Too long', 'and your arm gets shaky']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0.3); standAtOche(); };
    L.onEnter = () => { for (const b of boards) b.key = ''; aim.last = null; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; S.held = null; reticle.visible = false; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 1.5, 1.8, 2.4); camera.lookAt(0, 1.6, BZ); };
    L.dartInternals = { S, F, newLeg, nextTurn, land, launch, flightStep, velTo, daveThrow, scoreAt, spotFor, aimPoint, myDarts, daveDarts, laneX, BZ, BY };
    MUSIC_THEMES.darts = { gain: 0.6, bpm: 100, swing: 0.2, chords: ['G', 'C', 'D', 'G'], comp: { inst: 'guitar', at: [0, 4, 8, 12], dur: 0.25 }, bass: { at: [0, 8] }, drums: { k: 'x.......x.......', h: '....o.......o...' }, lead: { inst: 'musicbox', p: 0.2, up: 12 }, cut: 3600 };
    // End game: back to before a leg starts
    ENDGAME.on(L, { active: () => S.phase === 'play', end: () => { S.phase = 'idle'; S.thrown = 0; S.wait = 0; forcePresence(); state.hudDirty = true; return 'Throw to start a new leg.'; } });
    return L;
  })();
