  // ================================================================ CLUBHOUSE AIR HOCKEY
  // A table in the corner by the dance floor. Two players, or one against the clubhouse's resident bot.
  // Whoever has the puck on their half runs it, so your own hits never lag; it hands over at the center line.
  const airhockey = ((L) => {
    const G = L.group;
    const rand = mulberry32(5150);
    const C = new V3(6.5, 0, 10.6);        // table center; its length runs along x
    const LEN = 2.2, WID = 1.15, Y = 0.82; // playing surface
    const PR = 0.04, MR = 0.055, GOAL = 0.36, WIN = 7, RC = 0.13;
    const SIDE_COL = [0xe8303a, 0x2a6ae8], SIDE_NAME = ['Red', 'Blue'];
    // local table coordinates: u along the length (red end at -u), v across
    const toWorld = (u, v, y, out) => (out || new V3()).set(C.x + u, y, C.z + v);
    const STAND = [new V3(C.x - LEN / 2 - 0.62, 0, C.z), new V3(C.x + LEN / 2 + 0.62, 0, C.z)];

    // ---------------------------------------------------------------- the table
    const surfTex = canvasTexture(512, 268, (g) => {
      g.fillStyle = '#f4f7fb'; g.fillRect(0, 0, 512, 268);
      g.fillStyle = 'rgba(80,110,150,0.18)';
      for (let x = 8; x < 512; x += 14) for (let y = 8; y < 268; y += 14) { g.beginPath(); g.arc(x, y, 1.4, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = '#c23b4a'; g.lineWidth = 6; g.beginPath(); g.moveTo(256, 0); g.lineTo(256, 268); g.stroke();
      g.lineWidth = 4; g.beginPath(); g.arc(256, 134, 44, 0, Math.PI * 2); g.stroke();
      for (const [x, col] of [[0, '#e8303a'], [512, '#2a6ae8']]) {
        g.strokeStyle = col; g.lineWidth = 5; g.beginPath(); g.arc(x, 134, 62, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.moveTo(x ? 512 - 130 : 130, 0); g.lineTo(x ? 512 - 130 : 130, 268); g.stroke();
      }
    }).tex;
    const surf = new THREE.Mesh(new THREE.PlaneGeometry(LEN, WID), new THREE.MeshLambertMaterial({ map: surfTex }));
    surf.rotation.x = -Math.PI / 2;
    toWorld(0, 0, Y, surf.position);
    G.add(surf);
    const body = lam(0x2b2d42), railMat = lam(0xf2f2f6);
    addBox(G, LEN + 0.24, 0.16, WID + 0.24, body, C.x, Y - 0.085, C.z);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addBox(G, 0.1, Y - 0.16, 0.1, body, C.x + dx * (LEN / 2 - 0.05), (Y - 0.16) / 2, C.z + dz * (WID / 2 - 0.05));
    addBox(G, LEN - 0.3, 0.5, WID - 0.3, lam(0x1b1d2c), C.x, 0.35, C.z);
    // long rails, and end rails with a goal slot in each
    for (const s of [-1, 1]) addBox(G, LEN + 0.24, 0.07, 0.12, railMat, C.x, Y + 0.035, C.z + s * (WID / 2 + 0.06));
    for (const [s, col] of [[-1, SIDE_COL[0]], [1, SIDE_COL[1]]]) {
      const seg = (WID - GOAL) / 2;
      for (const t of [-1, 1]) addBox(G, 0.12, 0.07, seg, railMat, C.x + s * (LEN / 2 + 0.06), Y + 0.035, C.z + t * (GOAL / 2 + seg / 2));
      const slot = addBox(G, 0.14, 0.02, GOAL, new THREE.MeshBasicMaterial({ color: 0x0a0a12 }), C.x + s * (LEN / 2 + 0.06), Y + 0.002, C.z);
      void slot;
      addBox(G, 0.04, 0.09, WID + 0.24, lam(col), C.x + s * (LEN / 2 + 0.14), Y - 0.04, C.z);
    }
    // rounded corner pieces
    {
      const cornerShape = new THREE.Shape();
      cornerShape.moveTo(0, 0); cornerShape.lineTo(RC, 0); cornerShape.absarc(0, 0, RC, 0, Math.PI / 2, false); cornerShape.lineTo(0, 0);
      const fill = new THREE.Shape();
      fill.moveTo(RC, 0); fill.lineTo(RC, RC); fill.lineTo(0, RC); fill.absarc(0, 0, RC, Math.PI / 2, 0, true);
      const capGeo = new THREE.ShapeGeometry(fill, 12);
      const wallGeo = new THREE.CylinderGeometry(RC, RC, 0.07, 14, 1, true, 0, Math.PI / 2);
      for (const su of [-1, 1]) for (const sv of [-1, 1]) {
        const cx = C.x + su * (LEN / 2 - RC), cz = C.z + sv * (WID / 2 - RC);
        const cap = new THREE.Mesh(capGeo, railMat);
        cap.rotation.x = -Math.PI / 2;
        cap.scale.set(su, -sv, 1);
        cap.position.set(cx, Y + 0.071, cz);
        const wall = new THREE.Mesh(wallGeo, new THREE.MeshLambertMaterial({ color: 0xf2f2f6, side: THREE.DoubleSide }));
        wall.position.set(cx, Y + 0.035, cz);
        wall.rotation.y = su > 0 ? (sv > 0 ? 0 : Math.PI / 2) : (sv > 0 ? -Math.PI / 2 : Math.PI);
        G.add(cap, wall);
      }
      void cornerShape;
    }
    // a lamp and a little scoreboard over the table
    addCyl(G, 0.01, 0.01, 1.4, 4, lam(0x3a3352), C.x, 5 - 0.7, C.z);
    addBox(G, 1.4, 0.12, 0.5, lam(0x2e5a5a), C.x, 3.55, C.z);
    const tableLight = new THREE.PointLight(0xfff2dc, 0.7, 4.5, 1.4);
    tableLight.position.set(C.x, 3.2, C.z);
    G.add(tableLight);
    const scoreTex = canvasTexture(512, 160);
    const scoreBoard = new THREE.Group();
    for (const s of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.375), new THREE.MeshBasicMaterial({ map: scoreTex.tex }));
      m.position.set(0, 0, s * 0.03); if (s < 0) m.rotation.y = Math.PI;
      scoreBoard.add(m);
    }
    scoreBoard.position.set(C.x, 2.55, C.z);
    scoreBoard.rotation.y = Math.PI / 2;
    G.add(scoreBoard);
    addBox(G, 1.26, 0.43, 0.04, lam(0x15101f), C.x, 2.55, C.z).rotation.y = Math.PI / 2;
    scoreBoard.position.x += 0;
    makePlate(G, 'Air hockey', 1.2, 0.18, new V3(C.x, 0.62, C.z + WID / 2 + 0.135), 0, { bg: '#2b2d42', fg: '#ffd23f', size: 0.6 });

    // mallets and puck
    function malletMesh(col) {
      const g = new THREE.Group();
      g.add(at(new THREE.Mesh(cyl(MR, MR, 0.022, 20), lam(col)), 0, 0.011, 0));
      g.add(at(new THREE.Mesh(cyl(0.022, 0.026, 0.06, 12), lam(col)), 0, 0.05, 0));
      g.add(at(new THREE.Mesh(sph(0.03, 12, 10), lam(col)), 0, 0.085, 0));
      G.add(g);
      return g;
    }
    const mallets = SIDE_COL.map((c) => malletMesh(c));
    const puckMesh = new THREE.Group();
    puckMesh.add(at(new THREE.Mesh(cyl(PR, PR, 0.012, 22), lam(0x1b1d2c)), 0, 0.006, 0));
    puckMesh.add(at(new THREE.Mesh(cyl(PR * 0.6, PR * 0.6, 0.0175, 18), lam(0xffd23f)), 0, 0.00875, 0));   // a clearly raised centre, not a hair above the puck's top
    G.add(puckMesh);

    // ---------------------------------------------------------------- state
    const AH = {
      mySide: -1, hand: null, holding: false,
      m: [{ u: -0.85, v: 0, vu: 0, vv: 0 }, { u: 0.85, v: 0, vu: 0, vv: 0 }],
      p: { u: -0.35, v: 0, vu: 0, vv: 0, seq: 0 },
      score: [0, 0], goalSeq: 0, gid: 0, overT: 0, lastHitT: 0,
    };
    L.airhockey = AH;
    const otherSide = () => 1 - AH.mySide;
    // who's at the table, and on which side
    function players() {
      const at = [null, null];
      if (AH.mySide >= 0) at[AH.mySide] = state.myPeer;
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.ahSide >= 0 && !at[st.ahSide]) at[st.ahSide] = rec.peer; }
      return at;
    }
    const opponentHuman = () => (AH.mySide >= 0 ? players()[otherSide()] : null);
    const remoteFor = (side) => { for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.ahSide === side) return { rec, st }; } return null; };
    // I run the puck while it's on my half, or all the time when I'm playing the bot
    const iAmAuthority = () => AH.mySide >= 0 && (!opponentHuman() || (AH.mySide === 0 ? AH.p.u <= 0 : AH.p.u > 0));

    function takeSide(side) {
      if (players()[side]) { showToast(`${SIDE_NAME[side]} is taken`); return false; }
      AH.mySide = side;
      if (!opponentHuman()) newGame(false);
      showToast(opponentHuman() ? `You\u2019re ${SIDE_NAME[side]}. First to ${WIN} wins!` : `You\u2019re ${SIDE_NAME[side]} against the clubhouse bot. First to ${WIN}!`);
      sfx('chime', 0.6);
      state.hudDirty = true;
      forcePresence();
      return true;
    }
    function leaveTable() {
      if (AH.mySide < 0) return;
      AH.mySide = -1; AH.holding = false; AH.hand = null;
      showToast('You left the air hockey table');
      state.hudDirty = true;
      forcePresence();
    }
    function newGame(announce) {
      AH.score = [0, 0]; AH.goalSeq += 1; AH.gid += 1; AH.overT = 0;
      serve(AH.mySide >= 0 ? AH.mySide : 0);
      if (announce) showToast('New air hockey game');
      drawScore();
    }
    function serve(side) {
      Object.assign(AH.p, { u: side === 0 ? -0.35 : 0.35, v: (rand() - 0.5) * 0.2, vu: 0, vv: 0, seq: AH.p.seq + 1 });
    }
    let scoreKey = '';
    function drawScore() {
      const key = AH.score.join('-') + (AH.overT ? 'w' : '');
      if (key === scoreKey) return;
      scoreKey = key;
      const g = scoreTex.g;
      g.fillStyle = '#15101f'; g.fillRect(0, 0, 512, 160);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `800 96px ${DISPLAY}`;
      g.fillStyle = '#ff5c6a'; g.fillText(String(AH.score[0]), 128, 86);
      g.fillStyle = '#6a9aff'; g.fillText(String(AH.score[1]), 384, 86);
      g.fillStyle = '#ffd23f'; g.font = `700 30px ${BODY}`;
      g.fillText(AH.overT ? `${SIDE_NAME[AH.score[0] >= WIN ? 0 : 1]} wins!` : 'first to 7', 256, 86);
      scoreTex.tex.needsUpdate = true;
    }
    drawScore();

    // ---------------------------------------------------------------- moving my mallet
    const _hit = new V3(), _cq = new Q4(), _cp = new V3(), _cf = new V3();
    function clampMallet(m, side) {
      const lim = LEN / 2 - MR, w = WID / 2 - MR;
      m.u = side === 0 ? clamp(m.u, -lim, -MR) : clamp(m.u, MR, lim);
      m.v = clamp(m.v, -w, w);
    }
    function steerMallet(m, side, tu, tv, dt, maxSp) {
      const du = tu - m.u, dv = tv - m.v, d = Math.hypot(du, dv);
      const step = Math.min(d, maxSp * dt);
      const ou = m.u, ov = m.v;
      if (d > 1e-5) { m.u += (du / d) * step; m.v += (dv / d) * step; }
      clampMallet(m, side);
      m.vu = (m.u - ou) / Math.max(dt, 1e-4); m.vv = (m.v - ov) / Math.max(dt, 1e-4);
    }
    function myMalletTarget() {
      if (state.mode === 'vr') {
        if (!AH.holding || !AH.hand) return null;
        const hp = myHands[AH.hand];
        if (!hp.ok) return null;
        return [hp.pos.x - C.x, hp.pos.z - C.z];
      }
      // browser: where you look on the table
      camera.getWorldPosition(_cp); camera.getWorldQuaternion(_cq);
      _cf.set(0, 0, -1).applyQuaternion(_cq);
      if (_cf.y > -0.05) return null;
      const t = (Y - _cp.y) / _cf.y;
      _hit.copy(_cp).addScaledVector(_cf, t);
      return [_hit.x - C.x, _hit.z - C.z];
    }
    // the bot: defends its goal, and strikes when the puck is on its side
    function botStep(m, side, dt) {
      const p = AH.p, dir = side === 0 ? -1 : 1, onMySide = side === 0 ? p.u <= 0 : p.u > 0;
      let tu, tv;
      if (onMySide && (Math.abs(p.vu) < 2.2 || Math.sign(p.vu) === dir)) { tu = p.u + dir * 0.09; tv = p.v * 1.05; }
      else { tu = dir * (LEN / 2 - 0.22); tv = clamp(p.v * 0.7, -GOAL / 2, GOAL / 2); }
      steerMallet(m, side, tu, tv, dt, onMySide ? 2.6 : 2.0);
    }

    // ---------------------------------------------------------------- puck physics (run by whoever has the puck)
    function hitSound(sp) { tone(900 + rand() * 200, 500, 0.05, 'square', Math.min(0.12, 0.03 + sp * 0.015)); }
    function stepPuck(dt, now) {
      const p = AH.p;
      // the air: a puck that has nearly stopped against a rail or in a goal mouth drifts back toward the middle
      const slow = Math.hypot(p.vu, p.vv) < 0.12, edge = Math.abs(p.u) > LEN / 2 - 0.16 || Math.abs(p.v) > WID / 2 - 0.12;
      AH.stallT = slow && edge ? (AH.stallT || 0) + dt : 0;
      if (AH.stallT > 1.2) { const d = Math.hypot(p.u, p.v) || 1; p.vu -= (p.u / d) * 0.5; p.vv -= (p.v / d) * 0.5; AH.stallT = 0; p.seq += 1; }
      const sub = Math.max(1, Math.ceil(dt * 240)), h = dt / sub;
      for (let k = 0; k < sub; k++) {
        p.vu *= 1 - 0.12 * h; p.vv *= 1 - 0.12 * h;
        p.u += p.vu * h; p.v += p.vv * h;
        // side rails
        const w = WID / 2 - PR;
        if (p.v < -w) { p.v = -w; if (p.vv < 0) { p.vv = -p.vv * 0.88; hitSound(Math.abs(p.vv)); } }
        if (p.v > w) { p.v = w; if (p.vv > 0) { p.vv = -p.vv * 0.88; hitSound(Math.abs(p.vv)); } }
        // end rails, with the goal mouths
        const e = LEN / 2 - PR;
        if (Math.abs(p.u) > e) {
          if (Math.abs(p.v) < GOAL / 2 - PR * 0.3) { if (Math.abs(p.u) > LEN / 2 + 0.05) { scored(p.u < 0 ? 1 : 0, now); return; } }
          else { p.u = Math.sign(p.u) * e; if (Math.sign(p.vu) === Math.sign(p.u)) { p.vu = -p.vu * 0.88; hitSound(Math.abs(p.vu)); } }
        }
        // rounded corners, like a real table: a puck can't wedge itself where no mallet can reach
        const cu = LEN / 2 - RC, cv = WID / 2 - RC;
        if (Math.abs(p.u) > cu && Math.abs(p.v) > cv) {
          const ou = p.u - Math.sign(p.u) * cu, ov = p.v - Math.sign(p.v) * cv, d = Math.hypot(ou, ov), lim = RC - PR;
          if (d > lim) {
            const nu = ou / d, nv = ov / d;
            p.u -= nu * (d - lim); p.v -= nv * (d - lim);
            const vn = p.vu * nu + p.vv * nv;
            if (vn > 0) { p.vu -= 1.88 * vn * nu; p.vv -= 1.88 * vn * nv; hitSound(vn); }
          }
        }
        // mallets on this half (mine, or the bot's)
        for (let s = 0; s < 2; s++) {
          const human = s === AH.mySide, bot = !opponentHuman() && s !== AH.mySide;
          if (!human && !bot) continue;
          const m = AH.m[s];
          const du = p.u - m.u, dv = p.v - m.v, d = Math.hypot(du, dv), min = PR + MR;
          if (d < min && d > 1e-5) {
            const nu = du / d, nv = dv / d;
            p.u = m.u + nu * min; p.v = m.v + nv * min;
            const rel = (p.vu - m.vu) * nu + (p.vv - m.vv) * nv;
            if (rel < 0) {
              p.vu -= 1.9 * rel * nu; p.vv -= 1.9 * rel * nv;
              const sp = Math.hypot(p.vu, p.vv);
              if (sp > 8) { p.vu *= 8 / sp; p.vv *= 8 / sp; }
              if (now - AH.lastHitT > 60) { tone(1300, 700, 0.04, 'square', Math.min(0.16, 0.05 + -rel * 0.02)); AH.lastHitT = now; if (human && state.mode === 'vr' && AH.hand) haptic(vrHands[AH.hand], 0.6, 30); }
              p.seq += 1;
            }
          }
        }
      }
    }
    function scored(side, now) {
      AH.score[side] += 1;
      AH.goalSeq += 1;
      sfx('buzzer', 0.7);
      if (AH.score[side] >= WIN) { AH.overT = now; sfx('fanfare', 0.8); showToast(`${SIDE_NAME[side]} wins ${AH.score[0]}-${AH.score[1]}!`); }
      else showToast(`${SIDE_NAME[side]} scores! ${AH.score[0]}-${AH.score[1]}`);
      // the side that was scored on serves
      serve(1 - side);
      drawScore();
      forcePresence();
    }

    // ---------------------------------------------------------------- per frame
    const baseUpdate = L.update, basePresence = L.presence, baseRead = L.readPresence, baseClamp = L.clampPlayer, baseExit = L.onExit, baseHints = L.hints;
    const _w = new V3();
    let soloBot = false;
    L.update = (dt, now) => {
      baseUpdate(dt, now);
      const playing = AH.mySide >= 0 && state.mode !== 'menu' && state.level === L.idx;
      if (AH.mySide >= 0 && !playing) leaveTable();
      // walked away in VR
      if (playing && state.mode === 'vr' && myHead.pos.distanceTo(STAND[AH.mySide]) > 2.6) leaveTable();
      if (AH.mySide >= 0) {
        const t = myMalletTarget();
        if (t) steerMallet(AH.m[AH.mySide], AH.mySide, t[0], t[1], dt, 9);
        else { AH.m[AH.mySide].vu = 0; AH.m[AH.mySide].vv = 0; }
        soloBot = !opponentHuman();
        if (soloBot) botStep(AH.m[otherSide()], otherSide(), dt);
        if (AH.overT && now - AH.overT > 6000) newGame(true);
        if (iAmAuthority() && !AH.overT) stepPuck(dt, now);
        else if (!iAmAuthority()) { const p = AH.p; p.u += p.vu * dt; p.v += p.vv * dt; }
      } else {
        // just watching: drift the puck along between updates
        const p = AH.p; p.u += p.vu * dt; p.v += p.vv * dt;
        p.u = clamp(p.u, -LEN / 2, LEN / 2); p.v = clamp(p.v, -WID / 2, WID / 2);
      }
      // draw
      for (let s = 0; s < 2; s++) toWorld(AH.m[s].u, AH.m[s].v, Y, mallets[s].position);
      toWorld(AH.p.u, AH.p.v, Y, puckMesh.position);
      mallets[0].visible = mallets[1].visible = true;
      drawScore();
      // pin a browser player at their end of the table
      if (playing && state.mode === 'flat') { void _w; }
    };
    L.clampPlayer = (p) => {
      if (AH.mySide >= 0 && state.mode === 'flat') { const s = STAND[AH.mySide]; return [s.x - p.x, s.z - p.z]; }
      return baseClamp ? baseClamp(p) : [0, 0];
    };
    // browser: E at either end takes that side; E again leaves
    L.onUse = () => {
      if (AH.mySide >= 0) { leaveTable(); return true; }
      for (let s = 0; s < 2; s++) {
        if (Math.hypot(myHead.pos.x - STAND[s].x, myHead.pos.z - STAND[s].z) < 1.4) {
          if (takeSide(s)) { const sp = STAND[s]; dolly.position.x += sp.x - myHead.pos.x; dolly.position.z += sp.z - myHead.pos.z; state.yaw = s === 0 ? -Math.PI / 2 : Math.PI / 2; state.pitch = -0.62; }
          return true;
        }
      }
      return false;
    };
    // VR: squeeze near a mallet to pick it up (and take that side)
    L.onVRGrab = (h) => {
      const hp = myHands[h.side];
      if (!hp.ok) return false;
      for (let s = 0; s < 2; s++) {
        const mp = toWorld(AH.m[s].u, AH.m[s].v, Y + 0.06, _w);
        if (hp.pos.distanceTo(mp) < 0.2) {
          if (AH.mySide !== s && !takeSide(s)) return false;
          AH.holding = true; AH.hand = h.side;
          haptic(h, 0.4, 30);
          return true;
        }
      }
      return false;
    };
    L.onVRRelease = () => { AH.holding = false; };
    L.hintsFor = () => (AH.mySide >= 0 ? [['Look', 'move your mallet'], ['E', 'leave the table'], ['Menu', 'top right']] : Math.hypot(myHead.pos.x - C.x, myHead.pos.z - C.z) < 3.2 ? [['E', 'at either end to play air hockey'], ['WASD', 'move'], ['Drag', 'look']] : baseHints);
    L.onExit = () => { leaveTable(); if (baseExit) baseExit(); };

    // ---------------------------------------------------------------- network
    const r3a = (x) => Math.round(x * 1000) / 1000;
    L.presence = () => {
      const base = basePresence ? basePresence() : {};
      if (AH.mySide < 0) return base;
      const m = AH.m[AH.mySide], p = AH.p, auth = iAmAuthority() ? 1 : 0;
      base.ah = [AH.mySide, r3a(m.u), r3a(m.v), r3a(p.u), r3a(p.v), r3a(p.vu), r3a(p.vv), p.seq, AH.score[0], AH.score[1], AH.goalSeq, auth, soloBot ? 1 : 0, r3a(AH.m[1 - AH.mySide].u), r3a(AH.m[1 - AH.mySide].v)];
      return base;
    };
    const fin = (x, lim) => finite(x) && Math.abs(x) <= lim;
    L.readPresence = (rec, pres, st) => {
      if (baseRead) baseRead(rec, pres, st);
      const a = pres.ah;
      st.ahSide = -1;
      if (!Array.isArray(a) || a.length !== 15 || (a[0] !== 0 && a[0] !== 1) || !a.slice(1, 7).every((x) => fin(x, 3)) || !a.slice(7, 11).every((x) => Number.isInteger(x) && x >= 0) || !fin(a[13], 3) || !fin(a[14], 3)) return;
      const side = a[0];
      if (side === AH.mySide) {
        // both grabbed the same side at once: the first in sort order keeps it
        if (rec.peer < state.myPeer) { showToast(`${rec.name} took ${SIDE_NAME[side]} first`); leaveTable(); }
        else return;
      }
      st.ahSide = side;
      // their mallet (and the bot's, if they're playing it)
      Object.assign(AH.m[side], { u: a[1], v: a[2] });
      if (a[12] === 1 && AH.mySide < 0) Object.assign(AH.m[1 - side], { u: a[13], v: a[14] });
      // the puck, from whoever has it
      if (a[11] === 1 && a[7] >= AH.p.seq && !(AH.mySide >= 0 && iAmAuthority() && a[7] === AH.p.seq)) Object.assign(AH.p, { u: a[3], v: a[4], vu: a[5], vv: a[6], seq: a[7] });
      // the score
      if (a[10] > AH.goalSeq) {
        const was = AH.score.slice();
        AH.goalSeq = a[10]; AH.score = [a[8], a[9]];
        if (AH.mySide >= 0 && (AH.score[0] > was[0] || AH.score[1] > was[1])) { const s = AH.score[0] > was[0] ? 0 : 1; sfx('buzzer', 0.6); showToast(`${SIDE_NAME[s]} scores! ${AH.score[0]}-${AH.score[1]}`); if (AH.score[s] >= WIN) AH.overT = performance.now(); }
        if (AH.score[0] === 0 && AH.score[1] === 0) AH.overT = 0;
        drawScore();
      }
    };
    AH.internals = { STAND, C, LEN, WID, Y, takeSide, leaveTable, stepPuck, serve, iAmAuthority, players };
    return AH;
  })(hub);

