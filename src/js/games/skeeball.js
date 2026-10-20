  // ================================================================ LEVEL: SKEE-BALL ARCADE
  // Four machines in a row, one each. Roll the ball up the lane: it hops the jump and drops into a ring:
  // 10 at the bottom, then 20, 30, 40, 50 in the middle, and 100 in the top corners. Nine balls a game.
  // Points earn tickets (kept between visits), and the prize counter swaps tickets for prizes on your shelf.
  // VR: grab a ball from your tray and roll it underhand. Browser: aim with the mouse, hold Space for power.
  const skeeball = (() => {
    const L = newLevel(31);
    const G = L.group;
    const rand = mulberry32(3131);
    L.grabless = true;
    L.chargeKick = true;
    L.bounds = { minX: -6.5, maxX: 6.5, minZ: -5, maxZ: 4 };
    L.env = {
      sky: skyTexture([[0, '#1a0e2a'], [1, '#1a0e2a']]),
      bg: 0x1a0e2a, fog: [0x1a0e2a, 18, 50], hemi: [0xffe8f0, 0x302040, 0.85],
      sun: [0xffffff, 0.45], sunDir: new V3(0.2, 1, 0.4), ambient: [0x503a60, 0.5], sprite: null,
    };
    const N = 4, PITCH = 1.4, BR = 0.045, BALLS = 9;
    const LANE_W = 0.56, LANE_Z0 = 0, LANE_Z1 = -2.9, LANE_Y0 = 0.78, SLOPE = 0.09;
    const BZ0 = -3.0, BZ1 = -3.85, BY0 = 1.081, BOARD_TILT = 0.6;   // the target board: from (BZ0, BY0) rising toward the back
    const C_T = 0.58, RINGS = [[0.07, 50], [0.14, 40], [0.21, 30], [0.28, 20]], HUNDREDS = [[-0.19, 0.98], [0.19, 0.98]];
    const machX = (k) => (k - (N - 1) / 2) * PITCH;
    const laneY = (z) => LANE_Y0 + (LANE_Z0 - z) * SLOPE;
    const boardY = (z) => BY0 + (BZ0 - z) * BOARD_TILT;
    const boardLen = Math.hypot(BZ1 - BZ0, (BZ0 - BZ1) * BOARD_TILT);
    // a spot on the board (x across, t up the board) in world space for machine k
    const boardPt = (k, x, t) => { const u = t / boardLen; const z = BZ0 + (BZ1 - BZ0) * u; return new V3(machX(k) + x, boardY(z) + 0.002, z); };

    // ---------------------------------------------------------------- the arcade
    const floorTex = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#20143a'; g.fillRect(0, 0, 256, 256);
      const cols = ['#ff4d8a', '#4fc3f7', '#ffd23f', '#8bd450'];
      for (let i = 0; i < 70; i++) { g.fillStyle = cols[i % 4]; g.globalAlpha = 0.5; const x = rand() * 256, y = rand() * 256; g.beginPath(); if (i % 2) g.arc(x, y, 6, 0, Math.PI * 2); else { g.moveTo(x, y - 7); g.lineTo(x + 7, y + 6); g.lineTo(x - 7, y + 6); } g.fill(); }
      g.globalAlpha = 1;
    });
    floorTex.tex.wrapS = floorTex.tex.wrapT = THREE.RepeatWrapping; floorTex.tex.repeat.set(4, 3);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 10), new THREE.MeshLambertMaterial({ map: floorTex.tex })); floor.rotation.x = -Math.PI / 2; floor.position.z = -0.5; G.add(floor);
    for (const [w, h, x, z, ry] of [[14, 4, 0, -5.4, 0], [10, 4, -6.8, -0.5, Math.PI / 2], [10, 4, 6.8, -0.5, -Math.PI / 2]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), lam(0x2a1a44)); m.position.set(x, h / 2, z); m.rotation.y = ry; G.add(m);
    }
    // neon strips along the walls
    for (const [x, z, ry, col] of [[0, -5.35, 0, 0xff4d8a], [-6.75, -0.5, Math.PI / 2, 0x4fc3f7], [6.75, -0.5, -Math.PI / 2, 0xffd23f]]) {
      const s = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.08), new THREE.MeshBasicMaterial({ color: col })); s.position.set(x, 3.2, z); s.rotation.y = ry; G.add(s);
    }
    makePlate(G, 'SKEE-BALL', 3.2, 0.6, new V3(0, 3.0, -5.3), 0, { bg: '#2a1a44', fg: '#ffd23f', size: 0.7 });
    const cabMat = lam(0x3a2a6a), sideMat = new THREE.MeshLambertMaterial({ color: 0xff4d8a, emissive: 0x3a0a1a });
    const laneMat = lam(0xd8b080), boardMat = lam(0x2a2a52);
    const machines = [];
    for (let k = 0; k < N; k++) {
      const mx = machX(k);
      // cabinet: the lane, side rails, the jump, the target board, the back net
      const len = LANE_Z0 - LANE_Z1, ang = Math.atan(SLOPE);
      const lane = new THREE.Mesh(new THREE.BoxGeometry(LANE_W, 0.04, len / Math.cos(ang)), laneMat);
      lane.position.set(mx, (laneY(LANE_Z0) + laneY(LANE_Z1)) / 2 - 0.02, (LANE_Z0 + LANE_Z1) / 2); lane.rotation.x = ang; G.add(lane);
      addBox(G, LANE_W + 0.2, LANE_Y0 - 0.02, len, cabMat, mx, (LANE_Y0 - 0.02) / 2, (LANE_Z0 + LANE_Z1) / 2);
      for (const sx of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, len / Math.cos(ang)), sideMat);
        rail.position.set(mx + sx * (LANE_W / 2 + 0.025), (laneY(LANE_Z0) + laneY(LANE_Z1)) / 2 + 0.05, (LANE_Z0 + LANE_Z1) / 2); rail.rotation.x = ang; G.add(rail);
        // tall glass sides along the target end
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.6, 1.4), new THREE.MeshLambertMaterial({ color: 0x8be0ff, transparent: true, opacity: 0.25, depthWrite: false }));
        side.position.set(mx + sx * (LANE_W / 2 + 0.03), 1.6, BZ0 - 0.45); G.add(side);
      }
      const jump = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, LANE_W, 12), sideMat); jump.rotation.z = Math.PI / 2; jump.position.set(mx, laneY(LANE_Z1) + 0.02, LANE_Z1); G.add(jump);
      // the board, with its rings drawn on
      const bt = canvasTexture(256, 512, (g) => {
        g.fillStyle = '#2a2a52'; g.fillRect(0, 0, 256, 512);
        const sx = 256 / LANE_W, sy = 512 / boardLen;
        const cx = 128, cy = 512 - C_T * sy;
        for (let i = RINGS.length - 1; i >= 0; i--) {
          const [r, pts] = RINGS[i];
          g.fillStyle = ['#ffd23f', '#ff9a3a', '#ff4d8a', '#b388ff'][i]; g.beginPath(); g.arc(cx, cy, r * sx, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#14142a'; g.beginPath(); g.arc(cx, cy, (r - 0.025) * sx, 0, Math.PI * 2); g.fill();
          g.fillStyle = '#ffffff'; g.font = `800 ${Math.round(0.03 * sx)}px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
          if (i > 0) g.fillText(String(pts), cx, cy - (r - 0.045) * sy);
        }
        g.fillStyle = '#ffffff'; g.font = `800 ${Math.round(0.035 * sx)}px ${DISPLAY}`; g.fillText('50', cx, cy);
        for (const [hx, ht] of HUNDREDS) { g.fillStyle = '#8bd450'; g.beginPath(); g.arc(cx + hx * sx, 512 - ht * sy, 0.055 * sx, 0, Math.PI * 2); g.fill(); g.fillStyle = '#14142a'; g.beginPath(); g.arc(cx + hx * sx, 512 - ht * sy, 0.035 * sx, 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffffff'; g.font = `800 ${Math.round(0.025 * sx)}px ${DISPLAY}`; g.fillText('100', cx + hx * sx, 512 - ht * sy + 0.055 * sy); }
        g.fillStyle = '#ffd23f'; g.font = `800 ${Math.round(0.04 * sx)}px ${DISPLAY}`; g.fillText('10', cx, 512 - 0.06 * sy);
      });
      const board = new THREE.Mesh(new THREE.PlaneGeometry(LANE_W, boardLen), new THREE.MeshLambertMaterial({ map: bt.tex }));
      board.position.set(mx, (BY0 + boardY(BZ1)) / 2, (BZ0 + BZ1) / 2); board.rotation.x = -Math.PI / 2 + Math.atan(BOARD_TILT); G.add(board);
      addBox(G, LANE_W + 0.2, boardY(BZ1) + 0.2, 0.1, cabMat, mx, (boardY(BZ1) + 0.2) / 2, BZ1 - 0.1);
      addBox(G, LANE_W + 0.2, BY0, BZ0 - BZ1 + 0.1, cabMat, mx, BY0 / 2, (BZ0 + BZ1) / 2);
      // the marquee with this machine's score
      const sc = canvasTexture(512, 256);
      const marquee = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.55), new THREE.MeshBasicMaterial({ map: sc.tex }));
      marquee.position.set(mx, boardY(BZ1) + 0.65, BZ1 - 0.04); G.add(marquee);
      // the ball tray at the front
      addBox(G, 0.3, 0.06, 0.24, lam(0x2a1a44), mx + LANE_W / 2 + 0.2, 0.74, 0.12);
      const tag = makePlate(G, `Machine ${k + 1}`, 0.6, 0.12, new V3(mx, 0.6, 0.2), 0, { size: 0.55, bg: '#2a1a44', fg: '#ffffff' });
      machines.push({ k, mx, sc, tag, owner: null, key: '' });
    }
    // the ticket counter and prize shelf, along the right wall
    const PRIZES = [
      { id: 'duck', name: 'Rubber duck', cost: 40, make: () => { const g = new THREE.Group(); const y = lam(0xffd23f); const b = new THREE.Mesh(sph(0.1, 12, 10), y); b.scale.set(1.3, 0.9, 1); g.add(b); g.add(at(new THREE.Mesh(sph(0.065, 10, 8), y), -0.08, 0.1, 0)); const bk = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 6), lam(0xf5821f)); bk.rotation.z = Math.PI / 2; bk.position.set(-0.16, 0.1, 0); g.add(bk); return g; } },
      { id: 'bear', name: 'Teddy bear', cost: 120, make: () => { const g = new THREE.Group(), b = lam(0xa8743a); g.add(at(new THREE.Mesh(sph(0.11, 12, 10), b), 0, 0.1, 0), at(new THREE.Mesh(sph(0.08, 12, 10), b), 0, 0.26, 0)); for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.03, 8, 6), b), sx * 0.06, 0.33, 0)); return g; } },
      { id: 'rocket', name: 'Toy rocket', cost: 250, make: () => { const g = new THREE.Group(); g.add(at(new THREE.Mesh(cyl(0.05, 0.05, 0.26, 12), lam(0xf4f4f0)), 0, 0.15, 0), at(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.1, 12), lam(0xe5453a)), 0, 0.33, 0)); for (let i = 0; i < 3; i++) { const f = at(new THREE.Mesh(boxg(0.01, 0.08, 0.06), lam(0x4fc3f7)), Math.cos(i * 2.1) * 0.05, 0.05, Math.sin(i * 2.1) * 0.05); f.rotation.y = -i * 2.1; g.add(f); } return g; } },
      { id: 'robot', name: 'Wind-up robot', cost: 400, make: () => { const g = new THREE.Group(), m = lam(0xb8c0d0); g.add(at(new THREE.Mesh(boxg(0.14, 0.16, 0.1), m), 0, 0.1, 0), at(new THREE.Mesh(boxg(0.1, 0.09, 0.09), m), 0, 0.24, 0)); for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(sph(0.015, 6, 5), new THREE.MeshBasicMaterial({ color: 0x4fc3f7 })), sx * 0.025, 0.25, -0.046)); g.add(at(new THREE.Mesh(cyl(0.005, 0.005, 0.06, 4), m), 0, 0.31, 0), at(new THREE.Mesh(sph(0.015, 6, 5), lam(0xe5453a)), 0, 0.345, 0)); return g; } },
      { id: 'crown', name: 'Golden crown', cost: 800, make: () => { const g = new THREE.Group(), gold = new THREE.MeshLambertMaterial({ color: 0xffc83a, emissive: 0x4a3000 }); g.add(at(new THREE.Mesh(cyl(0.1, 0.1, 0.07, 16, true), gold), 0, 0.05, 0)); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; g.add(at(new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.07, 5), gold), Math.cos(a) * 0.1, 0.12, Math.sin(a) * 0.1)); } return g; } },
    ];
    const SAVE = { tickets: 0, owned: [] };
    try { if (prefs.skee && typeof prefs.skee === 'object') { SAVE.tickets = Number.isInteger(prefs.skee.tickets) ? prefs.skee.tickets : 0; SAVE.owned = Array.isArray(prefs.skee.owned) ? prefs.skee.owned.filter((x) => PRIZES.some((p) => p.id === x)) : []; } } catch (e) { /* none saved */ }
    const save = () => { prefs.skee = { tickets: SAVE.tickets, owned: SAVE.owned.slice() }; savePrefs(); };
    {
      const cx = 6.2;
      addBox(G, 0.6, 1.0, 4.2, lam(0x4a2a6a), cx, 0.5, -0.4);
      addBox(G, 0.3, 1.6, 4.2, lam(0x3a2a5a), cx + 0.35, 1.8, -0.4);
      makePlate(G, 'PRIZE COUNTER', 2.4, 0.35, new V3(cx + 0.18, 2.85, -0.4), -Math.PI / 2, { bg: '#ff4d8a', fg: '#ffffff', size: 0.65 });
      PRIZES.forEach((p, i) => {
        const z = -2.0 + i * 0.8;
        const m = p.make(); m.position.set(cx + 0.25, 1.6, z); m.scale.setScalar(1.8); G.add(m); p.mesh = m;
        addBox(G, 0.36, 0.04, 0.5, lam(0x2a1a44), cx + 0.25, 1.58, z);
        makeButton(L, new V3(cx - 0.1, 1.05, z), 0xffd23f, `${p.name}: ${p.cost}`, () => buyPrize(p), { faceYaw: -Math.PI / 2, pedestal: false });
      });
    }
    const ticketC = canvasTexture(512, 160);
    const ticketBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.5), new THREE.MeshBasicMaterial({ map: ticketC.tex }));
    ticketBoard.position.set(6.15, 2.45, -0.4); ticketBoard.rotation.y = -Math.PI / 2; G.add(ticketBoard);
    let ticketKey = '';
    function drawTickets() {
      const key = `${SAVE.tickets}|${SAVE.owned.join()}`;
      if (key === ticketKey) return; ticketKey = key;
      const g = ticketC.g;
      g.fillStyle = '#14142a'; g.fillRect(0, 0, 512, 160);
      g.fillStyle = '#ffd23f'; g.font = `900 64px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(`\u{1F39F}️ ${SAVE.tickets} tickets`, 256, 62);
      g.fillStyle = '#c8b8e8'; g.font = `600 30px ${BODY}`; g.fillText(`${SAVE.owned.length} of ${PRIZES.length} prizes on your shelf`, 256, 124);
      ticketC.tex.needsUpdate = true;
      for (const p of PRIZES) p.mesh.traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = SAVE.owned.includes(p.id) ? 1 : 0.35; } });
    }
    function buyPrize(p) {
      if (SAVE.owned.includes(p.id)) { showToast(`You already have the ${p.name.toLowerCase()}`); return; }
      if (SAVE.tickets < p.cost) { showToast(`The ${p.name.toLowerCase()} costs ${p.cost} tickets. You have ${SAVE.tickets}`); sfx('buzzer', 0.4); return; }
      SAVE.tickets -= p.cost; SAVE.owned.push(p.id); save();
      showToast(`You got the ${p.name.toLowerCase()}!`); sfx('fanfare', 0.8);
      spawnFloat(p.name, p.mesh.position.clone().add(new V3(-0.3, 0.4, 0)), '#ffd23f');
      forcePresence(); state.dirtyBoard = true;
    }
    L.skeeSave = SAVE;
    // a smaller prize stand for the other carnival games (TL), facing yaw: the same prizes, the same tickets
    L.makePrizeStand = (TL, x, z, yaw) => {
      const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; TL.group.add(g);
      const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      g.add(at(new THREE.Mesh(boxg(2.6, 1.0, 0.6), lam(0x4a2a6a)), 0, 0.5, 0), at(new THREE.Mesh(boxg(2.6, 1.6, 0.12), lam(0x3a2a5a)), 0, 1.8, -0.35));
      const sign = makePlate(g, 'PRIZES', 1.6, 0.32, new V3(0, 2.85, -0.28), 0, { bg: '#ff4d8a', fg: '#ffffff', size: 0.62 }); void sign;
      const tc = canvasTexture(512, 128);
      const tb = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.35), new THREE.MeshBasicMaterial({ map: tc.tex })); tb.position.set(0, 2.4, -0.28); g.add(tb);
      const meshes = PRIZES.map((p, i) => { const m = p.make(); m.position.set(-1.0 + i * 0.5, 1.04, -0.12); m.scale.setScalar(1.2); g.add(m); return m; });
      PRIZES.forEach((p, i) => {
        const lx = -1.0 + i * 0.5, lz = 0.36;
        makeButton(TL, new V3(x + rx * lx + fx * lz, 1.05, z + rz * lx + fz * lz), 0xffd23f, `${p.name}: ${p.cost}`, () => buyPrize(p), { faceYaw: yaw, pedestal: false });
      });
      let key = '';
      return {
        tick() {
          const k = `${SAVE.tickets}|${SAVE.owned.join()}`;
          if (k === key) return; key = k;
          const c = tc.g;
          c.fillStyle = '#14142a'; c.fillRect(0, 0, 512, 128);
          c.fillStyle = '#ffd23f'; c.font = `900 56px ${DISPLAY}`; c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(`\u{1F39F}\uFE0F ${SAVE.tickets} tickets`, 256, 64);
          tc.tex.needsUpdate = true;
          PRIZES.forEach((p, i) => meshes[i].traverse((o) => { if (o.material) { o.material.transparent = true; o.material.opacity = SAVE.owned.includes(p.id) ? 1 : 0.35; } }));
        },
      };
    };
    // every carnival game pays out in these same tickets, spent at this prize counter
    L.addTickets = (n, at) => {
      if (!(n > 0)) return;
      SAVE.tickets += n; save(); ticketKey = '';
      if (at) spawnFloat(`+${n} \u{1F39F}\uFE0F`, at, '#ffd23f');
      for (let i = 0; i < Math.min(n, 20); i++) setTimeout(() => tone(1500 + (i % 3) * 120, 0, 0.03, 'square', 0.04), i * 45);
      forcePresence();
    };

    // ---------------------------------------------------------------- my game
    const me = { k: 0, score: 0, left: BALLS, best: 0, phase: 'idle', last: 0 };
    try { if (Number.isInteger(prefs.skeeBest)) me.best = prefs.skeeBest; } catch (e) { /* none */ }
    L.skee = me;
    // the ball in play (one at a time): 'tray', 'held', 'roll' (on the lane), 'fly', 'drop' (into a ring), 'back'
    const B = { st: 'tray', pos: new V3(), vel: new V3(), t: 0, pts: 0, hand: null, hole: null };
    L.skeeBall = B;
    const ballMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const ballMesh = new THREE.Mesh(sph(BR, 16, 12), ballMat); G.add(ballMesh);
    const trayBalls = [];
    for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(sph(BR, 12, 10), ballMat); G.add(m); trayBalls.push(m); }
    L.setColor = (hex) => ballMat.color.set(hex).lerp(new THREE.Color(0xffffff), 0.45);
    L.setColor(PLAYER_COLORS[state.colorIdx].hex);
    const trayPos = (i) => new V3(machX(me.k) + LANE_W / 2 + 0.13 + (i % 2) * 0.1, 0.81, 0.04 + Math.floor(i / 2) * 0.1);
    function mySlot() {
      const ids = [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      ids.sort();
      return Math.max(0, ids.indexOf(state.myPeer)) % N;
    }
    function standAtMachine() {
      me.k = mySlot();
      const _c = new V3(); camera.getWorldPosition(_c);
      dolly.position.x += machX(me.k) - _c.x; dolly.position.z += 0.75 - _c.z;
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.32; }
      B.st = 'tray'; B.pos.copy(trayPos(0));
    }
    function newGame() {
      me.score = 0; me.left = BALLS; me.phase = 'play';
      B.st = 'tray'; B.pos.copy(trayPos(0));
      sfx('coin', 0.8); tone(660, 990, 0.2, 'square', 0.1);
      showToast('Nine balls. Roll them up the lane!');
      forcePresence(); state.dirtyBoard = true;
    }
    L.newGame = newGame;
    function endGame() {
      me.phase = 'over';
      const tickets = Math.floor(me.score / 10);
      SAVE.tickets += tickets; save();
      const isBest = me.score > me.best;
      if (isBest) { me.best = me.score; prefs.skeeBest = me.best; savePrefs(); }
      RECORDS.add(L, 'score', me.score);
      showToast(`Game over: ${me.score} points${isBest && me.score ? ' (a new best!)' : ''}. ${tickets} tickets!`);
      sfx(me.score >= 300 ? 'fanfare' : 'chime', 0.9);
      for (let i = 0; i < Math.min(tickets, 30); i++) setTimeout(() => tone(1500 + (i % 3) * 120, 0, 0.03, 'square', 0.04), i * 45);
      forcePresence(); state.dirtyBoard = true;
    }
    // ---------------------------------------------------------------- the ball
    function launch(pos, vel) {
      if (me.phase !== 'play') newGame();
      B.st = 'roll'; B.pos.copy(pos); B.vel.copy(vel); B.t = 0; B.counted = false;
      sfx('ball', 0.4);
    }
    L.launch = launch;
    function score(pts, at) {
      B.st = 'drop'; B.t = 0; B.pts = pts; B.hole = at;
      me.score += pts; me.left -= 1;
      tone(pts >= 100 ? 1200 : 500 + pts * 8, 0, 0.12, 'triangle', 0.25);
      if (pts >= 50) { sfx('chime', 0.6); if (pts === 100) sfx('fanfare', 0.6); }
      spawnFloat(`+${pts}`, at.clone().add(new V3(0, 0.25, 0.2)), pts >= 100 ? '#8bd450' : pts >= 50 ? '#ffd23f' : '#ffffff');
      forcePresence(); state.dirtyBoard = true;
    }
    // where on the board it lands, and which ring that is
    function ringAt(x, t) {
      for (const [hx, ht] of HUNDREDS) if (Math.hypot(x - hx, t - ht) < 0.055) return 100;
      const d = Math.hypot(x, t - C_T);
      for (const [r, pts] of RINGS) if (d < r) return pts;
      return 10;
    }
    L.ringAt = ringAt;
    const G_ACC = 9.8;
    function stepBall(dt) {
      const mx = machX(me.k);
      if (B.st === 'roll' || B.st === 'fly') {
        B.t += dt;
        B.vel.y -= G_ACC * dt;
        B.pos.addScaledVector(B.vel, dt);
        const lx = B.pos.x - mx;
        const onLane = B.pos.z <= LANE_Z0 + 0.05 && B.pos.z >= LANE_Z1 && Math.abs(lx) < LANE_W / 2 + 0.02;
        if (onLane) {
          // side rails
          if (lx > LANE_W / 2 - BR) { B.pos.x = mx + LANE_W / 2 - BR; if (B.vel.x > 0) B.vel.x *= -0.6; }
          if (lx < -LANE_W / 2 + BR) { B.pos.x = mx - LANE_W / 2 + BR; if (B.vel.x < 0) B.vel.x *= -0.6; }
          const sy = laneY(B.pos.z) + BR;
          if (B.pos.y <= sy) {
            B.pos.y = sy;
            if (B.vel.y < 0) B.vel.y = -B.vel.y * 0.2 < 0.3 ? 0 : -B.vel.y * 0.2;
            // rolling: a little friction, and the slope slows it (it moves along the slope)
            const f = Math.exp(-0.25 * dt); B.vel.x *= f; B.vel.z *= f; B.vel.z += G_ACC * SLOPE * dt;
            B.vel.y = Math.max(B.vel.y, -B.vel.z * SLOPE);
            B.st = 'roll';
          } else B.st = 'fly';
          // rolled back to you without making it: it comes back to the tray
          if (B.vel.z > 0.05 && B.pos.z > -0.1 && B.st === 'roll') { B.st = 'back'; B.t = 0; showToast('Not hard enough: roll it again'); return; }
          if (Math.hypot(B.vel.x, B.vel.z) < 0.05 && B.st === 'roll' && B.t > 0.5) { B.st = 'back'; B.t = 0; return; }
        } else if (B.pos.z < LANE_Z1 && B.st !== 'fly') B.st = 'fly';
        // off the end of the lane: the jump throws it up
        if (B.st === 'roll' && B.pos.z <= LANE_Z1 + 0.02) { B.vel.y = Math.abs(B.vel.z) * 0.7 + 0.3; B.st = 'fly'; B.pos.z = LANE_Z1 - 0.001; B.pos.y += 0.03; }
        // the board
        if (B.pos.z < BZ0 && B.pos.z > BZ1 && B.pos.y - BR <= boardY(B.pos.z)) {
          const t = (BZ0 - B.pos.z) / (BZ0 - BZ1) * boardLen, x = clamp(B.pos.x - mx, -LANE_W / 2 + BR, LANE_W / 2 - BR);
          const pts = ringAt(x, t);
          score(pts, boardPt(me.k, pts === 10 ? x * 0.4 : x, pts === 10 ? 0.06 : t));
          return;
        }
        if (B.pos.z <= BZ1 + BR) { score(10, boardPt(me.k, 0, 0.05)); showToast('Too hard: off the back and down to the 10'); return; }   // the back of the cabinet
        // short: between the jump and the board it falls in the bottom gutter
        if (B.pos.z < LANE_Z1 && B.pos.z > BZ0 && B.pos.y < laneY(LANE_Z1) - 0.05) { score(10, boardPt(me.k, 0, 0.05)); return; }
        // off the machine entirely (in VR you can throw it anywhere): it comes back without counting
        if (B.pos.y < 0.05 || Math.abs(lx) > 1.5 || B.pos.z > 2) { B.st = 'back'; B.t = 0; showToast('Off the lane! Roll it up the ramp'); }
      } else if (B.st === 'drop') {
        B.t += dt;
        B.pos.copy(B.hole).add(new V3(0, -B.t * 0.4, -B.t * 0.15));
        if (B.t > 0.6) { B.st = 'back'; B.t = 0; }
      } else if (B.st === 'back') {
        B.t += dt;
        if (B.t > 0.5) { B.st = 'tray'; if (me.phase === 'play' && me.left <= 0) endGame(); }
      }
    }
    L.stepBall = stepBall;
    // browser: aim with the mouse, hold Space for power
    const _q = new Q4(), _f = new V3();
    L.kick = (c) => {
      if (B.st !== 'tray') return;
      if (me.phase !== 'play') newGame();
      camera.getWorldQuaternion(_q); _f.set(0, 0, -1).applyQuaternion(_q);
      const yaw = Math.atan2(-_f.x, -_f.z), sp = 2.6 + c * 3.8;
      const vx = clamp(-Math.sin(yaw) * sp, -0.6, 0.6);
      launch(new V3(machX(me.k) + clamp(-Math.sin(yaw) * 0.3, -0.15, 0.15), laneY(LANE_Z0 - 0.05) + BR, LANE_Z0 - 0.05), new V3(vx, 0, -sp));
    };
    L.throwLabel = () => (B.st === 'tray' ? 'Roll' : '…');
    // VR: grab from the tray, roll it
    L.onVRGrab = (h) => {
      if (B.st !== 'tray') return false;
      if (myHands[h.side].pos.distanceTo(trayPos(0)) > 0.4) return false;
      B.st = 'held'; B.hand = h.side; sfx('grab', 0.4);
      return true;
    };
    L.onVRRelease = (h, vel) => {
      if (B.st !== 'held' || B.hand !== h.side) return;
      const v = vel.clone().multiplyScalar(1.15);
      if (v.length() < 0.6) { B.st = 'tray'; return; }   // put it down
      launch(myHands[h.side].pos.clone(), v);
    };

    // ---------------------------------------------------------------- drawing, network, the rest
    function drawMarquee(m, score, left, name, best) {
      const key = `${score}|${left}|${name}|${best}`;
      if (key === m.key) return; m.key = key;
      const g = m.sc.g;
      g.fillStyle = '#14142a'; g.fillRect(0, 0, 512, 256);
      g.strokeStyle = '#ff4d8a'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 248);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.font = `900 110px ${DISPLAY}`; g.fillText(String(score), 256, 110);
      g.fillStyle = '#c8b8e8'; g.font = `600 34px ${BODY}`; g.fillText(name ? `${name}  ·  ${left} ball${left === 1 ? '' : 's'} left` : 'Free play', 256, 200, 480);
      m.sc.tex.needsUpdate = true;
      void best;
    }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (here) {
        const k = mySlot();
        if (k !== me.k) standAtMachine();
        const n = Math.max(1, Math.ceil(dt / 0.005));
        for (let i = 0; i < n; i++) stepBall(dt / n);
      }
      // my ball, in the tray, in my hand, or rolling
      if (B.st === 'held') { const mh = myHands[B.hand]; B.pos.copy(mh.pos); }
      ballMesh.visible = here && B.st !== 'tray' && B.st !== 'back';
      ballMesh.position.copy(B.pos);
      if (B.st === 'roll') ballMesh.rotation.x -= (B.vel.z / BR) * dt;
      const inTray = me.phase === 'play' ? me.left - (B.st === 'tray' || B.st === 'back' ? 0 : 1) : BALLS;
      trayBalls.forEach((m, i) => { m.visible = here && i < Math.min(8, inTray) && !(B.st === 'held' && i === 0); m.position.copy(trayPos(i)); });
      // marquees: mine, and the others'
      const slots = {};
      slots[me.k] = { score: me.score, left: me.phase === 'play' ? me.left : 0, name: state.name || 'You' };
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && rec.inGame && st && st.sk) slots[st.sk[3]] = { score: st.sk[0], left: st.sk[1], name: rec.name }; }
      for (const m of machines) { const s = slots[m.k]; drawMarquee(m, s ? s.score : 0, s ? s.left : 0, s ? s.name : '', 0); }
      drawTickets();
      if (here && ui.status && state.mode === 'flat') { ui.status.hidden = false; const txt = me.phase === 'play' ? `${me.score} points  ·  ${me.left} ball${me.left === 1 ? '' : 's'} left  ·  ${SAVE.tickets} tickets` : `Best ${me.best}  ·  ${SAVE.tickets} tickets  ·  hold Space to roll`; if (ui.status.textContent !== txt) ui.status.textContent = txt; }
    };
    L.presence = () => ({ sk: [me.score, me.phase === 'play' ? me.left : 0, me.best, me.k] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.sk;
      if (!Array.isArray(a) || a.length !== 4 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 100000) || a[3] >= N) { st.sk = null; return; }
      if (!st.sk || st.sk[0] !== a[0] || st.sk[2] !== a[2]) state.dirtyBoard = true;
      st.sk = a;
    };
    L.rowFor = (st, isMe) => {
      const best = isMe ? me.best : (st.sk ? st.sk[2] : 0), score = isMe ? me.score : (st.sk ? st.sk[0] : 0);
      return { best, text: `${score} now · best ${best}` };
    };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.2, 1.4, -6.15, 2.0, -0.4, Math.PI / 2);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#14142a'; g.fillRect(0, 0, W, 460);
      g.strokeStyle = '#ff4d8a'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('High scores', 36, 80);
      g.fillStyle = '#c8b8e8'; g.font = `400 24px ${BODY}`; g.fillText('Nine balls. 10 points = 1 ticket.', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, -5.4, 2.6, Math.PI / 2);
    RECORDS.def(L, [{ k: 'score', label: 'High score (nine balls)' }]);
    L.hudActions = [{ label: () => (me.phase === 'play' ? 'New game' : 'Start game'), run: () => newGame() }];
    L.hints = [['Grip', 'take a ball from your tray'], ['Roll it', 'underhand, up the lane'], ['Prize counter', 'on the right wall']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Mouse', 'aim'], ['Hold Space', 'power, then let go to roll'], ['E', 'press a prize button']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0.75); standAtMachine(); };
    L.onEnter = () => { ticketKey = ''; for (const m of machines) m.key = ''; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; if (B.st === 'held') B.st = 'tray'; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 2, 2.2, 3.2); camera.lookAt(0, 1, -3); };
    MUSIC_THEMES.skeeball = { gain: 0.8, bpm: 118, swing: 0.1, chords: ['C', 'Am', 'F', 'G'], comp: { inst: 'synth', at: [0, 4, 8, 12], dur: 0.15 }, bass: { at: [0, 8] }, drums: { k: 'x...x...x...x...', h: '..o...o...o...o.' }, lead: { inst: 'musicbox', p: 0.3, up: 12 }, cut: 4800 };
    return L;
  })();
