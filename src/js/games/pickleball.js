  // ================================================================ LEVEL: SUNNY PICKLEBALL COURTS
  // Singles on a regulation court: underhand serves into the diagonal box, the two-bounce rule, no volleys from
  // the kitchen, rally scoring to 11 (win by 2). Play a friend, or the court's resident bot when you're alone.
  // Whoever the ball is heading toward runs it, so your own hits never lag.
  const pickleball = (() => {
    const L = newLevel(15);
    const G = L.group;
    const rand = mulberry32(4114);
    const HL = 6.705, HW = 3.05, NET_H = 0.88, KITCH = 2.13, BR = 0.037;   // half length (x), half width (z)
    const GRAV = 9.8, DRAG = 0.06, WIN = 11;   // drag from a real ball: 26 g, 7.4 cm, holes and all
    const R = { minX: -11, maxX: 11, minZ: -7, maxZ: 7 };
    L.bounds = R;
    L.env = {
      sky: skyTexture([[0, '#5aa8e8'], [0.6, '#a8d8f8'], [1, '#f4f8e8']]),
      bg: 0xa8d8f8, fog: [0xc8e4f0, 40, 140], hemi: [0xffffff, 0x6a8a5a, 0.75],
      sun: [0xfff4e0, 1.0], sunDir: new V3(0.4, 1, 0.3), ambient: [0x8a9aaa, 0.35], sprite: null,
    };
    const SIDE_NAME = ['West', 'East'];
    const endX = (s) => (s === 0 ? -1 : 1) * HL;

    // ---------------------------------------------------------------- the place
    const grass = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), lam(0x6aa84a));
    grass.rotation.x = -Math.PI / 2; grass.position.y = -0.01; G.add(grass);
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(22, 14), lam(0x3a7a5a));
    apron.rotation.x = -Math.PI / 2; G.add(apron);
    const court = new THREE.Mesh(new THREE.PlaneGeometry(HL * 2, HW * 2), lam(0x2a6ab8));
    court.rotation.x = -Math.PI / 2; court.position.y = 0.004; G.add(court);
    const kitchenMat = lam(0x3a86c8);
    for (const sx of [-1, 1]) { const k = new THREE.Mesh(new THREE.PlaneGeometry(KITCH, HW * 2), kitchenMat); k.rotation.x = -Math.PI / 2; k.position.set(sx * KITCH / 2, 0.006, 0); G.add(k); }
    const lineM = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const line = (x, z, w, d) => addBox(G, w, 0.004, d, lineM, x, 0.009, z);
    line(0, -HW, HL * 2, 0.05); line(0, HW, HL * 2, 0.05);
    line(-HL, 0, 0.05, HW * 2); line(HL, 0, 0.05, HW * 2);
    line(-KITCH, 0, 0.05, HW * 2); line(KITCH, 0, 0.05, HW * 2);
    line(-(KITCH + HL) / 2, 0, HL - KITCH, 0.05); line((KITCH + HL) / 2, 0, HL - KITCH, 0.05);
    const netMat = new THREE.MeshLambertMaterial({ color: 0x1b1932, transparent: true, opacity: 0.55, side: THREE.DoubleSide });
    const netMesh = new THREE.Mesh(new THREE.PlaneGeometry(HW * 2 + 0.6, NET_H), netMat);
    netMesh.rotation.y = Math.PI / 2; netMesh.position.set(0, NET_H / 2, 0); G.add(netMesh);
    addBox(G, 0.04, 0.05, HW * 2 + 0.6, lineM, 0, NET_H, 0);
    for (const sz of [-1, 1]) addCyl(G, 0.04, 0.04, NET_H + 0.06, 8, lam(0x2b2d42), 0, (NET_H + 0.06) / 2, sz * (HW + 0.3));
    // a chain-link fence, benches and a shade umbrella
    const fence = canvasTexture(64, 64, (g) => { g.clearRect(0, 0, 64, 64); g.strokeStyle = '#d8dce8'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(64, 64); g.moveTo(64, 0); g.lineTo(0, 64); g.stroke(); }).tex;
    fence.wrapS = fence.wrapT = THREE.RepeatWrapping;
    const fenceMat = (w) => { const t = fence.clone(); t.needsUpdate = true; t.repeat.set(w / 0.5, 6); return new THREE.MeshLambertMaterial({ map: t, transparent: true, side: THREE.DoubleSide, alphaTest: 0.3 }); };
    for (const [x, z, w, rot] of [[0, R.minZ, 22, 0], [0, R.maxZ, 22, 0], [R.minX, 0, 14, Math.PI / 2], [R.maxX, 0, 14, Math.PI / 2]]) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(w, 3), fenceMat(w)); f.position.set(x, 1.5, z); f.rotation.y = rot; G.add(f);
      addBox(G, rot ? 0.06 : w, 0.06, rot ? w : 0.06, lam(0x9aa0b0), x, 3.0, z);
    }
    for (const sx of [-1, 1]) { addBox(G, 2.2, 0.45, 0.5, lam(0xc8955a), sx * 4.5, 0.25, R.maxZ - 0.6); addBox(G, 2.2, 0.5, 0.08, lam(0xa8753a), sx * 4.5, 0.65, R.maxZ - 0.38); }
    addCyl(G, 0.05, 0.05, 2.4, 6, lam(0xf4f2ec), 0, 1.2, R.maxZ - 1.0);
    const umb = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.6, 12, 1, true), new THREE.MeshLambertMaterial({ color: 0xff5c6a, side: THREE.DoubleSide }));
    umb.position.set(0, 2.5, R.maxZ - 1.0); G.add(umb);
    for (const [x, z] of [[-16, -12], [-9, -14], [3, -15], [14, -12], [18, 4], [-18, 6], [-6, 14], [9, 13]]) {
      addCyl(G, 0.2, 0.28, 2.4, 7, lam(0x7a5a3a), x, 1.2, z);
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.8, 1), lam(0x4e8a3a)); crown.position.set(x, 3.4, z); G.add(crown);
    }
    // the scoreboard by the net post
    const scoreC = canvasTexture(640, 220);
    const scoreBoard = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.76), new THREE.MeshBasicMaterial({ map: scoreC.tex }));
    scoreBoard.position.set(0, 2.6, -HW - 1.6); G.add(scoreBoard);
    const sbBack = scoreBoard.clone(); sbBack.rotation.y = Math.PI; sbBack.position.z -= 0.02; G.add(sbBack);
    addCyl(G, 0.05, 0.05, 2.3, 6, lam(0x2b2d42), 0, 1.15, -HW - 1.62);
    const sign = makeBoard(G, 720, 500, 2.4, 1.67, R.maxX - 0.2, 1.9, -3.0, -Math.PI / 2);
    (function drawSign() {
      const g = sign.g;
      g.fillStyle = '#1b3a5a'; g.fillRect(0, 0, 720, 500);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 54px ${DISPLAY}`; g.fillText('Pickleball', 36, 72);
      let y = 116;
      for (const [h, b] of [
        ['Play', 'Grab a paddle from the rack at either end. Alone, the court bot plays you.'],
        ['Serve', 'Underhand, into the box diagonally across, past the kitchen line. Right side when your score is even.'],
        ['Rules', 'The return of serve and the shot after it must bounce. No volleys from the kitchen (the lighter zone by the net). First to 11, win by 2.'],
        ['Browser', 'WASD to move, hold Space to hit as the ball comes, look where you want it to go. E puts the paddle back.'],
      ]) {
        g.fillStyle = '#8be0ff'; g.font = `700 24px ${BODY}`; g.fillText(h, 36, y); y += 30;
        g.fillStyle = '#f2f6fa'; g.font = `400 23px ${BODY}`; y = wrapText(g, b, 36, y, 648, 29) + 10;
      }
      sign.tex.needsUpdate = true;
    })();
    makeKiosk(L, R.maxX - 1.2, R.maxZ - 1.2, -Math.PI * 0.75);

    // ---------------------------------------------------------------- paddles and ball
    TOOL_MESH.pbpaddle = () => {
      const g = new THREE.Group();
      const grip = new THREE.MeshLambertMaterial({ color: 0x2b2d42, emissive: 0x000000 });
      const face = new THREE.MeshLambertMaterial({ color: 0x4fc3f7, emissive: 0x000000 });
      const edge = new THREE.MeshLambertMaterial({ color: 0x1b1932, emissive: 0x000000 });
      const handle = new THREE.Mesh(cyl(0.016, 0.018, 0.13, 8), grip); handle.rotation.x = Math.PI / 2; handle.position.z = -0.04;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.19, 0.24), face); blade.position.set(0, 0, -0.22);
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.2, 0.25), edge); rim.position.set(0, 0, -0.22); rim.scale.set(0.9, 1, 1);
      g.add(handle, rim, blade);
      g.userData.mats = [grip, face, edge];
      return g;
    };
    const rackQ = new Q4().setFromAxisAngle(new V3(0, 0, 1), Math.PI / 2);
    const paddles = [0, 1].map((s) => {
      const x = endX(s) + (s === 0 ? -1.4 : 1.4), z = HW + 0.9;
      addBox(G, 0.9, 0.8, 0.5, lam(0x2b2d42), x, 0.4, z);
      const t = makeTool(L, new V3(x, 0.82, z), rackQ, 'pbpaddle');
      t.pbSide = s;
      return t;
    });
    const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BR, 14, 10), new THREE.MeshLambertMaterial({ color: 0xd8f43a }));
    ballMesh.visible = false; G.add(ballMesh);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(BR * 1.2, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; G.add(shadow);
    // the court bot
    const botBody = buildAvatar('#ff9a5c', 1, 2, true, 3, 4);
    const botLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (g) => { rr(g, 4, 6, 248, 52, 26); g.fillStyle = 'rgba(20,16,32,0.8)'; g.fill(); g.fillStyle = '#fff'; g.font = `700 30px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Dink Daisy', 128, 33); }).tex, transparent: true, depthWrite: false }));
    botLabel.scale.set(0.9, 0.225, 1); botLabel.position.y = 0.42; botBody.add(botLabel);
    const botPaddle = TOOL_MESH.pbpaddle();
    G.add(botBody, botPaddle);
    botBody.visible = botPaddle.visible = false;

    // ---------------------------------------------------------------- state
    const PB = {
      mySide: -1, ver: 0, auth: '', b: { x: 0, y: 1, z: 0, vx: 0, vy: 0, vz: 0 },
      ph: 'idle', server: 0, lastHit: -1, need: -1, bounced: false, hits: 0, score: [0, 0], pointSeq: 0, deadT: 0, overT: 0, winner: -1,
      swingUntil: 0, serveT: 0, serveVer: -1, botOn: false, bot: { x: HL - 0.5, z: 0, decided: false, missing: false, swingT: 0 },
    };
    L.pb = PB;
    function players() {
      const at = [null, null];
      if (PB.mySide >= 0) at[PB.mySide] = state.myPeer;
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.pbSide >= 0 && !at[st.pbSide]) at[st.pbSide] = rec.peer; }
      return at;
    }
    const otherHuman = () => (PB.mySide >= 0 ? players()[1 - PB.mySide] : null);
    const botSide = () => (PB.mySide >= 0 && !otherHuman() ? 1 - PB.mySide : -1);
    const iAmAuth = () => PB.mySide >= 0 && PB.auth === state.myPeer;
    const sideOfX = (x) => (x < 0 ? 0 : 1);
    const nameOfSide = (s) => { const p = players()[s]; if (!p) return 'Dink Daisy'; if (p === state.myPeer) return 'you'; return (remotes.get(p) || {}).name || SIDE_NAME[s]; };
    // where each side's player is standing (for the kitchen rule)
    function standing(s) {
      const p = players()[s];
      if (p === state.myPeer) return { x: myHead.pos.x, z: myHead.pos.z };
      if (p) { const rec = remotes.get(p); if (rec && rec.hasH) return { x: rec.cur.h.pos.x, z: rec.cur.h.pos.z }; return null; }
      return { x: PB.bot.x, z: PB.bot.z };
    }
    // the serve: from the right when the server's score is even; right is +z for west, -z for east
    const serveZ = () => { const right = PB.score[PB.server] % 2 === 0; const zr = PB.server === 0 ? 1 : -1; return (right ? zr : -zr) * HW / 2; };

    // ---------------------------------------------------------------- the rules (run by whoever has the ball)
    function newGame() { Object.assign(PB, { score: [0, 0], server: rand() < 0.5 ? 0 : 1, overT: 0, winner: -1 }); startServe(); }
    function startServe() {
      Object.assign(PB, { ph: 'serve', lastHit: -1, need: -1, bounced: false, hits: 0 });
      Object.assign(PB.b, { x: endX(PB.server) * 1.04, y: 0.75, z: serveZ(), vx: 0, vy: 0, vz: 0 });
      PB.auth = players()[PB.server] || state.myPeer;
      PB.ver += 1; PB.bot.decided = false;
      forcePresence();
    }
    function point(winner, why) {
      if (PB.ph !== 'rally' && PB.ph !== 'serve') return;
      PB.score[winner] += 1; PB.pointSeq += 1;
      PB.ph = 'dead'; PB.deadT = performance.now();
      const [a, b] = PB.score;
      if ((a >= WIN || b >= WIN) && Math.abs(a - b) >= 2) { PB.winner = a > b ? 0 : 1; PB.overT = performance.now(); }
      PB.server = winner;   // rally scoring: whoever wins the rally serves
      PB.ver += 1;
      announce(winner, why);
      forcePresence();
    }
    function announce(winner, why) {
      const mine = winner === PB.mySide, [a, b] = PB.score;
      sfx(mine ? 'chime' : 'buzzer', 0.5);
      if (PB.winner >= 0) showToast(PB.winner === PB.mySide ? `You win ${Math.max(a, b)}-${Math.min(a, b)}!` : `${nameOfSide(PB.winner)} wins ${Math.max(a, b)}-${Math.min(a, b)}`);
      else showToast(`${why ? why + ': ' : ''}${mine ? 'your point' : `point to ${nameOfSide(winner)}`}. ${a}-${b}`);
      state.dirtyBoard = true;
    }
    function onHit(side) {
      const b = PB.b;
      if (PB.ph === 'serve') { if (side !== PB.server) return; Object.assign(PB, { ph: 'rally', lastHit: side, need: 1 - side, bounced: false, hits: 1 }); PB.ver += 1; return; }
      if (PB.ph !== 'rally') return;
      if (side === PB.lastHit) { point(1 - side, 'Double hit'); return; }
      const volley = !PB.bounced;
      // the two-bounce rule: the return of serve and the third shot must bounce first
      if (volley && PB.hits < 3) { point(1 - side, 'Let it bounce first'); return; }
      // no volleys from the kitchen
      const at = standing(side);
      if (volley && at && Math.abs(at.x) < KITCH && sideOfX(at.x) === side) { point(1 - side, 'Kitchen volley'); return; }
      void b;
      Object.assign(PB, { lastHit: side, need: 1 - side, bounced: false, hits: PB.hits + 1 });
      PB.ver += 1;
    }
    function onBounce(x, z) {
      if (PB.ph !== 'rally') return;
      const s = sideOfX(x), inCourt = Math.abs(x) <= HL + BR && Math.abs(z) <= HW + BR;
      if (PB.need === s && !PB.bounced) {
        if (!inCourt) { point(1 - PB.lastHit, 'Out'); return; }
        // the serve has to land in the diagonal box, past the kitchen line
        if (PB.hits === 1) {
          const zSign = Math.sign(PB.serveFromZ || 1), boxOk = Math.abs(x) >= KITCH - BR && Math.sign(z) === -zSign;
          if (!boxOk) { point(1 - PB.lastHit, Math.abs(x) < KITCH ? 'Serve in the kitchen' : 'Serve in the wrong box'); return; }
        }
        PB.bounced = true; PB.ver += 1;
        return;
      }
      if (PB.need === s && PB.bounced) { point(PB.lastHit, 'Two bounces'); return; }
      // it came down on the hitter's own side (into the net, or never crossed)
      if (s === PB.lastHit) point(1 - PB.lastHit, 'Into the net');
    }

    // ---------------------------------------------------------------- ball physics
    let simOnly = false, lastTick = 0;
    function tick(v) { const now = performance.now(); if (now - lastTick < 50) return; lastTick = now; tone(900, 600, 0.04, 'triangle', (v * 0.3) / (1 + myHead.pos.distanceTo(ballMesh.position) * 0.2)); }
    function stepBall(h) {
      const b = PB.b;
      if (PB.ph !== 'rally') return;
      const sp = Math.hypot(b.vx, b.vy, b.vz);
      b.vx -= DRAG * sp * b.vx * h; b.vy -= (GRAV + DRAG * sp * b.vy) * h; b.vz -= DRAG * sp * b.vz * h;
      const px = b.x;
      b.x += b.vx * h; b.y += b.vy * h; b.z += b.vz * h;
      if ((px < 0) !== (b.x < 0) && b.y < NET_H + BR && Math.abs(b.z) < HW + 0.3) { b.x = px < 0 ? -BR : BR; b.vx *= -0.1; b.vz *= 0.4; tone(220, 0, 0.06, 'triangle', 0.1); }
      if (b.y < BR && b.vy < 0) {
        b.y = BR; b.vy = -b.vy * 0.72; b.vx *= 0.82; b.vz *= 0.82;
        tick(0.6);
        if (!simOnly) onBounce(b.x, b.z);
      }
      if (Math.abs(b.x) > R.maxX - 0.2 || Math.abs(b.z) > R.maxZ - 0.2) { b.vx *= -0.3; b.vz *= -0.3; b.x = clamp(b.x, R.minX + 0.2, R.maxX - 0.2); b.z = clamp(b.z, R.minZ + 0.2, R.maxZ - 0.2); }
      // a ball that has stopped is dead
      if (!simOnly && PB.ph === 'rally' && b.y < BR + 0.01 && sp < 0.6) { if (PB.bounced) point(PB.lastHit, 'Missed it'); else point(1 - PB.lastHit, 'Out'); }
    }
    // a shot that lands at (tx, tz) and clears the net: start from the no-air answer, then fly it (with drag) and correct
    function flyTo(from, v) {
      const p = { x: from.x, y: from.y, z: from.z, vx: v.vx, vy: v.vy, vz: v.vz };
      let netY = 99;
      for (let k = 0; k < 480; k++) {
        const sp = Math.hypot(p.vx, p.vy, p.vz), h = 1 / 120, px = p.x;
        p.vx -= DRAG * sp * p.vx * h; p.vy -= (GRAV + DRAG * sp * p.vy) * h; p.vz -= DRAG * sp * p.vz * h;
        p.x += p.vx * h; p.y += p.vy * h; p.z += p.vz * h;
        if ((px < 0) !== (p.x < 0)) netY = p.y;
        if (p.y < BR) break;
      }
      return { x: p.x, z: p.z, netY };
    }
    function aimed(from, tx, tz, speed) {
      const dx = tx - from.x, dz = tz - from.z, d = Math.hypot(dx, dz);
      const T = clamp(d / speed, 0.45, 1.9);
      const out = { vx: dx / T, vy: (BR - from.y + 0.5 * GRAV * T * T) / T, vz: dz / T };
      for (let i = 0; i < 6; i++) {
        const f = flyTo(from, out);
        if (f.netY < NET_H + 0.12) { out.vy += 0.4; continue; }
        const ld = Math.hypot(f.x - from.x, f.z - from.z);
        if (Math.abs(ld - d) < 0.15) break;
        const k = clamp(d / Math.max(0.5, ld), 0.7, 1.4);
        out.vx *= k; out.vz *= k;
        // keep the direction pointed at the target too
        const ang = Math.atan2(dz, dx) - Math.atan2(f.z - from.z, f.x - from.x);
        const c = Math.cos(ang), sn = Math.sin(ang), vx = out.vx * c - out.vz * sn, vz = out.vx * sn + out.vz * c;
        out.vx = vx; out.vz = vz;
      }
      return out;
    }
    function hitBall(side, v) {
      const b = PB.b, s = Math.hypot(v.vx, v.vy, v.vz), k = s > 16 ? 16 / s : 1;
      if (PB.ph === 'serve') PB.serveFromZ = b.z;
      b.vx = v.vx * k; b.vy = v.vy * k; b.vz = v.vz * k;
      onHit(side);
      tone(520, 380, 0.05, 'square', 0.25);
      PB.ver += 1;
      forcePresence();
    }
    const hittable = (side) => (PB.ph === 'serve' ? side === PB.server : PB.ph === 'rally' && PB.lastHit !== side && sideOfX(PB.b.x) === side);
    // where to aim: a serve goes to the diagonal box; otherwise deep in the far court
    function target(side, wantX, wantZ) {
      const far = side === 0 ? 1 : -1;
      if (PB.ph === 'serve') { const z = -Math.sign(PB.b.z || 1) * clamp(Math.abs(wantZ ?? HW / 2), 0.4, HW - 0.35); return { x: far * clamp(Math.abs(wantX ?? HL * 0.7), KITCH + 0.6, HL - 0.4), z }; }
      return { x: far * clamp(Math.abs(wantX ?? HL * 0.7), 1.0, HL - 0.35), z: clamp(wantZ ?? 0, -HW + 0.35, HW - 0.35) };
    }

    // ---------------------------------------------------------------- your paddle
    const myPaddle = () => paddles.find((t) => t.held && t.held.peer === state.myPeer);
    const _pc = new V3(), _pn = new V3(), _bw = new V3(), _q = new Q4(), _cp = new V3();
    let prevPC = null;
    function vrPaddle(dt, steps) {
      const t = myPaddle();
      if (!t || state.mode !== 'vr' || !iAmAuth()) { prevPC = null; return; }
      _pc.set(0, 0, -0.22).applyQuaternion(t.quat).add(t.pos); _pn.set(1, 0, 0).applyQuaternion(t.quat);
      if (!prevPC) { prevPC = _pc.clone(); return; }
      const vp = _pc.clone().sub(prevPC).multiplyScalar(1 / Math.max(1e-3, dt));
      if (hittable(PB.mySide)) {
        _bw.set(PB.b.x, PB.b.y, PB.b.z);
        for (let k = 1; k <= steps; k++) {
          const c = prevPC.clone().lerp(_pc, k / steps), rel = _bw.clone().sub(c);
          const d = rel.dot(_pn), inPlane = Math.sqrt(Math.max(0, rel.lengthSq() - d * d));
          if (inPlane > 0.15 || Math.abs(d) > BR + 0.04) continue;
          const vb = new V3(PB.b.vx, PB.b.vy, PB.b.vz), vn = vb.clone().sub(vp).dot(_pn);
          if (vn * Math.sign(d || 1) >= 0) continue;
          vb.addScaledVector(_pn, -1.8 * vn);
          // your swing sets the pace and direction; the help keeps it in the court
          const speed = clamp(Math.hypot(vb.x, vb.z), 4, 14);
          const tg = target(PB.mySide, HL * clamp(0.35 + speed / 22, 0.45, 0.92), PB.b.z + vb.z * 0.35);
          const aim = aimed(PB.b, tg.x, tg.z, speed);
          hitBall(PB.mySide, { vx: vb.x * 0.3 + aim.vx * 0.7, vy: vb.y * 0.3 + aim.vy * 0.7, vz: vb.z * 0.3 + aim.vz * 0.7 });
          haptic(vrHands[t.held.side], 0.5, 25);
          break;
        }
      }
      prevPC.copy(_pc);
    }
    // browser: the paddle reaches for a ball near you; holding Space keeps a short swing window open
    L.deskHand = (side, mh) => {
      const t = paddles.find((x) => x.held && x.held.peer === state.myPeer && x.held.side === side);
      if (!t || state.mode !== 'flat') return false;
      const b = PB.b, near = Math.hypot(b.x - myHead.pos.x, b.z - myHead.pos.z) < 1.8 && b.y < 2.2 && PB.ph !== 'dead';
      if (near) mh.pos.set(b.x + (PB.mySide === 0 ? -0.1 : 0.1), b.y, b.z);
      else { camera.getWorldQuaternion(_q); camera.getWorldPosition(_cp); mh.pos.set(0.3, -0.45, -0.5).applyQuaternion(_q).add(_cp); }
      mh.quat.setFromEuler(new THREE.Euler(0, PB.mySide === 0 ? -Math.PI / 2 : Math.PI / 2, 0));
      mh.ok = true;
      return true;
    };
    L.deskSwing = () => { if (myPaddle()) PB.swingUntil = performance.now() + 500; };
    L.deskRelease = () => {};
    function deskHit(now) {
      if (state.mode !== 'flat' || !myPaddle() || now > PB.swingUntil || !iAmAuth() || !hittable(PB.mySide)) return;
      const b = PB.b;
      if (Math.hypot(b.x - myHead.pos.x, b.z - myHead.pos.z) > 1.8 || b.y > 2.2 || (PB.ph === 'rally' && b.y < BR + 0.02 && Math.abs(b.vy) < 0.3)) return;
      // the browser plays by the rules for you: wait for the bounce when the two-bounce rule says so, and never volley from the kitchen
      if (PB.ph === 'rally' && !PB.bounced && (PB.hits < 3 || (Math.abs(myHead.pos.x) < KITCH))) return;
      PB.swingUntil = 0;
      camera.getWorldQuaternion(_q); camera.getWorldPosition(_cp);
      const dir = new V3(0, 0, -1).applyQuaternion(_q);
      let wx, wz;
      if (dir.y < -0.02) { const tt = -_cp.y / dir.y; wx = _cp.x + dir.x * tt; wz = _cp.z + dir.z * tt; }
      const tg = target(PB.mySide, wx === undefined ? undefined : Math.abs(wx), wz);
      hitBall(PB.mySide, aimed(b, tg.x, tg.z, PB.ph === 'serve' ? 8 : 10));
    }

    // ---------------------------------------------------------------- Dink Daisy, the court bot
    function predictLanding() {
      // run the ball forward to where it comes down on this side
      const s = { ...PB.b };
      for (let k = 0; k < 400; k++) {
        const sp = Math.hypot(s.vx, s.vy, s.vz), h = 1 / 120;
        s.vx -= DRAG * sp * s.vx * h; s.vy -= (GRAV + DRAG * sp * s.vy) * h; s.vz -= DRAG * sp * s.vz * h;
        s.x += s.vx * h; s.y += s.vy * h; s.z += s.vz * h;
        if (s.y < BR) return s;
      }
      return s;
    }
    function botStep(dt, now) {
      const s = botSide(), bt = PB.bot, b = PB.b;
      botBody.visible = botPaddle.visible = s >= 0 || (PB.mySide < 0 && PB.botOn);
      if (s < 0) { paddles.forEach((t) => { t.g.visible = true; }); return; }
      let tx = endX(s) * 0.85, tz = 0;
      const coming = PB.ph === 'rally' && PB.lastHit !== s;
      if (coming) { const land = predictLanding(); tx = clamp(land.x + (s === 0 ? -0.9 : 0.9), s === 0 ? -HL - 1.5 : 0.8, s === 0 ? -0.8 : HL + 1.5); tz = clamp(land.z, -HW - 1, HW + 1); }
      if (PB.ph === 'serve' && PB.server === s) { tx = b.x + (s === 0 ? -0.4 : 0.4); tz = b.z; }
      const dx = tx - bt.x, dz = tz - bt.z, d = Math.hypot(dx, dz), step = Math.min(d, 4.2 * dt);
      if (d > 0.01) { bt.x += (dx / d) * step; bt.z += (dz / d) * step; }
      botBody.position.set(bt.x, 1.5, bt.z); botBody.rotation.y = s === 0 ? -Math.PI / 2 : Math.PI / 2;
      const swing = now - bt.swingT < 250 ? Math.sin(((now - bt.swingT) / 250) * Math.PI) * 0.6 : 0;
      void swing;
      // the paddle on the end of her arm: a backswing as the ball comes, a full stroke when she hits
      const toNet = s === 0 ? 1 : -1, since = now - bt.swingT;
      let ang = 0;
      if (since < 280) ang = -1.1 + 2.2 * Math.sin((since / 280) * Math.PI / 2);
      else if (since < 650) ang = 1.1 * (1 - (since - 280) / 370);
      else if (coming) ang = -1.1 * clamp(1 - (Math.hypot(b.x - bt.x, b.z - bt.z) - 1.0) / 3.0, 0, 1);
      const reach = 0.6, py = coming ? clamp(b.y, 0.45, 1.4) : 1.0;
      botPaddle.position.set(bt.x + toNet * Math.cos(ang) * reach, py, bt.z + 0.3 * toNet + Math.sin(ang) * reach * toNet);
      botPaddle.rotation.set(0, (s === 0 ? -Math.PI / 2 : Math.PI / 2) + ang * 0.9, 0);
      // the spare paddle at her end is the one in her hand
      paddles.forEach((t, k) => { t.g.visible = !(k === s && !t.held); });
      if (!iAmAuth()) return;
      if (PB.ph === 'serve' && PB.server === s) { if (now - PB.serveT > 1400) botHit(s, true); return; }
      if (!coming) { bt.decided = false; return; }
      if (!hittable(s) || !PB.bounced) return;
      if (!bt.decided) { bt.decided = true; bt.missing = rand() < 0.14 + Math.max(0, Math.hypot(b.vx, b.vz) - 7) * 0.06; }
      if (bt.missing) return;
      if (Math.hypot(b.x - bt.x, b.z - bt.z) < 1.3 && b.y > 0.25 && b.y < 1.6 && b.vy < 1.5) botHit(s, false);
    }
    function botHit(s, serve) {
      // softer and less precise than before, with the odd one long
      const wild = !serve && rand() < 0.08;
      const tg = target(s, HL * (wild ? 1.08 + rand() * 0.15 : 0.5 + rand() * 0.4), (rand() - 0.5) * (HW * 2 - 1));
      hitBall(s, aimed(PB.b, tg.x + (rand() - 0.5) * 0.6, tg.z + (rand() - 0.5) * 0.6, serve ? 7 : 7 + rand() * 3));
      PB.bot.swingT = performance.now(); PB.bot.decided = false;
    }

    // ---------------------------------------------------------------- taking a side
    function takeSide(s) {
      const at = players()[s];
      if (at && at !== state.myPeer) { showToast(`The ${SIDE_NAME[s].toLowerCase()} side is taken`); return false; }
      PB.mySide = s;
      if (!otherHuman() || PB.ph === 'idle') newGame();
      showToast(otherHuman() ? `Pickleball! First to ${WIN}, win by 2` : `Pickleball against Dink Daisy. First to ${WIN}, win by 2`);
      sfx('chime', 0.6);
      state.hudDirty = true; state.dirtyBoard = true;
      forcePresence();
      return true;
    }
    function leaveCourt() {
      if (PB.mySide < 0) return;
      PB.mySide = -1; prevPC = null;
      if (!players()[0] && !players()[1]) { PB.ph = 'idle'; ballMesh.visible = false; }
      showToast('You left the court');
      state.hudDirty = true; state.dirtyBoard = true;
      forcePresence();
    }
    function putDown(t) {
      if (!t) return;
      for (const s of SIDES) if (vrHands[s].holding && vrHands[s].holding.obj === t) vrHands[s].holding = null;
      if (state.held && state.held.obj === t) { state.held = null; state.hudDirty = true; }
      dropTool(t);
    }
    L.onToolGrab = (t) => { if (t.kind === 'pbpaddle' && PB.mySide !== t.pbSide && !takeSide(t.pbSide)) putDown(t); };
    L.onUse = () => {
      if (state.mode !== 'flat') return false;
      if (PB.mySide >= 0) { putDown(myPaddle()); leaveCourt(); return true; }
      for (let s = 0; s < 2; s++) {
        const t = paddles[s];
        if (Math.hypot(myHead.pos.x - t.rackPos.x, myHead.pos.z - t.rackPos.z) < 1.8) {
          if (t.held && t.held.peer !== state.myPeer) { showToast(`The ${SIDE_NAME[s].toLowerCase()} side is taken`); return true; }
          if (!takeSide(s)) return true;
          grabTool(t, 'right'); state.held = { kind: 'tool', obj: t }; state.hudDirty = true;
          dolly.position.x += endX(s) * 1.08 - myHead.pos.x; dolly.position.z += 0 - myHead.pos.z;
          state.yaw = s === 0 ? -Math.PI / 2 : Math.PI / 2; state.pitch = -0.15;
          return true;
        }
      }
      return false;
    };
    // stay on your own half while you play
    L.clampPlayer = (p) => {
      let x = clamp(p.x, R.minX + 0.4, R.maxX - 0.4), z = clamp(p.z, R.minZ + 0.4, R.maxZ - 0.4);
      if (PB.mySide === 0) x = Math.min(x, -0.35); else if (PB.mySide === 1) x = Math.max(x, 0.35);
      return [x - p.x, z - p.z];
    };
    L.spawn = () => { dolly.position.set(-HL - 1.6, 0, HW + 2.2); state.yaw = -Math.PI * 0.75; state.pitch = -0.05; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0001) * 0.4; camera.position.set(Math.sin(a) * 9, 5, 9); camera.lookAt(0, 0.5, 0); };
    L.hintsFor = () => {
      if (PB.mySide >= 0 && state.mode === 'flat') return [['WASD', 'move'], ['Hold Space', 'hit as the ball comes'], ['Look', 'aim'], ['E', 'put the paddle back']];
      return [['WASD', 'move'], ['Drag', 'look'], ['E', 'at a paddle rack to play']];
    };
    L.onExit = () => { putDown(myPaddle()); leaveCourt(); };

    // ---------------------------------------------------------------- per frame
    function drawScore() {
      const g = scoreC.g;
      g.fillStyle = '#1b3a5a'; g.fillRect(0, 0, 640, 220);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.font = `800 36px ${DISPLAY}`; g.fillText('Pickleball', 320, 38);
      g.fillStyle = '#ffffff'; g.font = `800 92px ${DISPLAY}`; g.fillText(`${PB.score[0]}  -  ${PB.score[1]}`, 320, 124);
      const who = (s) => { const p = players()[s]; return p ? (p === state.myPeer ? 'You' : (remotes.get(p) || {}).name || SIDE_NAME[s]) : (botSide() === s || PB.botOn ? 'Daisy' : 'open'); };
      g.fillStyle = '#a8d8f8'; g.font = `400 26px ${BODY}`;
      g.fillText(PB.ph === 'idle' ? 'Grab a paddle from a rack to play' : `${PB.server === 0 ? '\u25cf ' : ''}${who(0)}   vs   ${who(1)}${PB.server === 1 ? ' \u25cf' : ''}`, 320, 192, 600);
      scoreC.tex.needsUpdate = true;
    }
    drawScore();
    L.drawBoard = () => drawScore();
    L.rowFor = () => ({ text: '' });
    L.sortRows = () => 0;
    let scoreKey = '';
    L.update = (dt, now) => {
      if (PB.mySide >= 0 && !myPaddle()) leaveCourt();
      if (PB.ph === 'serve' && PB.serveVer !== PB.ver) { PB.serveVer = PB.ver; PB.serveT = now; }
      if (iAmAuth() && PB.ph === 'serve') { const sv = players()[PB.server]; if (sv && sv !== state.myPeer) { PB.auth = sv; PB.ver += 1; forcePresence(); } }
      if (PB.mySide >= 0 && PB.ph !== 'idle' && !iAmAuth()) {
        const at = players().filter(Boolean);
        if (!at.includes(PB.auth) && at.sort()[0] === state.myPeer) { PB.auth = state.myPeer; PB.ver += 1; if (PB.ph === 'rally') { PB.ph = 'dead'; PB.deadT = now; } forcePresence(); }
      }
      const steps = Math.max(1, Math.ceil(dt * 240)), h = dt / steps;
      if (iAmAuth()) {
        if (PB.ph === 'dead' && now - PB.deadT > 1500) { if (PB.winner >= 0) { if (now - PB.overT > 5000) newGame(); } else startServe(); }
        for (let k = 0; k < steps && PB.ph === 'rally'; k++) {
          stepBall(h);
          const toward = sideOfX(PB.b.x), other = players()[toward];
          if (PB.ph === 'rally' && other && other !== state.myPeer && PB.lastHit !== toward) { PB.auth = other; PB.ver += 1; forcePresence(); break; }
        }
        vrPaddle(dt, 6);
        deskHit(now);
      } else if (PB.ph === 'rally') { simOnly = true; for (let k = 0; k < steps; k++) stepBall(h); simOnly = false; prevPC = null; }
      botStep(dt, now);
      ballMesh.position.set(PB.b.x, PB.b.y, PB.b.z);
      ballMesh.visible = PB.ph !== 'idle';
      shadow.visible = ballMesh.visible; shadow.position.set(PB.b.x, 0.012, PB.b.z);
      const key = `${PB.score}|${PB.server}|${PB.ph === 'idle'}|${players().join()}|${PB.botOn}`;
      if (key !== scoreKey) { scoreKey = key; drawScore(); }
    };

    // ---------------------------------------------------------------- network
    const PHC = { idle: 0, serve: 1, rally: 2, dead: 3 }, PHN = ['idle', 'serve', 'rally', 'dead'];
    const r3 = (x) => Math.round(x * 1000) / 1000;
    L.presence = () => {
      if (PB.mySide < 0) return {};
      const b = PB.b;
      return { pb: [PB.mySide, PB.ver, PB.auth, r3(b.x), r3(b.y), r3(b.z), r3(b.vx), r3(b.vy), r3(b.vz), PHC[PB.ph], PB.server, PB.lastHit, PB.need, PB.bounced ? 1 : 0, PB.hits, PB.score[0], PB.score[1], PB.pointSeq, PB.winner, botSide() >= 0 ? 1 : 0, r3(PB.bot.x), r3(PB.bot.z), r3(PB.serveFromZ || 0)] };
    };
    L.readPresence = (rec, pres, st) => {
      const a = pres.pb;
      st.pbSide = -1;
      if (!Array.isArray(a) || a.length !== 23 || (a[0] !== 0 && a[0] !== 1) || !Number.isInteger(a[1]) || typeof a[2] !== 'string' || !a.slice(3, 9).every((x) => finite(x) && Math.abs(x) < 60)) return;
      const side = a[0];
      if (side === PB.mySide) { if (rec.peer < state.myPeer) { showToast(`${rec.name} took that side first`); putDown(myPaddle()); leaveCourt(); } else return; }
      st.pbSide = side;
      if (a[1] > PB.ver) {
        const before = PB.pointSeq;
        Object.assign(PB.b, { x: a[3], y: a[4], z: a[5], vx: a[6], vy: a[7], vz: a[8] });
        Object.assign(PB, { ver: a[1], auth: a[2], ph: PHN[clamp(a[9] | 0, 0, 3)], server: a[10] ? 1 : 0, lastHit: a[11] | 0, need: a[12] | 0, bounced: a[13] === 1, hits: a[14] | 0, score: [a[15] | 0, a[16] | 0], pointSeq: a[17] | 0, winner: a[18] | 0, serveFromZ: a[22] });
        if (PB.pointSeq > before && PB.mySide >= 0) announce(PB.score[0] > (st.pbS0 || 0) ? 0 : 1, '');
        if (PB.winner >= 0 && !PB.overT) PB.overT = performance.now();
        if (PB.winner < 0) PB.overT = 0;
      }
      st.pbS0 = PB.score[0];
      PB.botOn = a[19] === 1;
      if (PB.mySide < 0 && PB.botOn) { PB.bot.x = a[20]; PB.bot.z = a[21]; }
    };
    PB.internals = { HL, HW, KITCH, NET_H, paddles, takeSide, leaveCourt, newGame, startServe, onHit, onBounce, stepBall, hitBall, aimed, target, players, botSide, iAmAuth, serveZ };
    return L;
  })();

