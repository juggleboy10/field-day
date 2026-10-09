  // ================================================================ LEVEL: SUNDAY SOCCER
  const soccer = (() => {
    const L = newLevel(5);
    const G = L.group;
    const rand = mulberry32(777001);
    L.teams = true;
    L.teamKey = 'sq';
    L.grabless = true;
    L.walkSpeed = 4.2;
    L.rollFriction = 0.55;
    const HW = 13, HL = 20, GW = 3, GH = 2.2, GD = 1.6, WIN = 5;
    const SMALL_R = 0.2, BIG_R = 0.75;
    let BR = BIG_R;   // bubble soccer by default: a big, floaty ball
    L.bounds = { minX: -HW, maxX: HW, minZ: -HL, maxZ: HL };
    L.env = {
      sky: skyTexture([[0, '#3a78c8'], [0.32, '#77aee6'], [0.47, '#cfe4f2'], [0.5, '#f6ead2'], [0.53, '#bcd0a4'], [1, '#5f7f4a']]),
      bg: 0x9cc6ea, fog: [0xd8e6ee, 90, 400], hemi: [0xe8f2ff, 0x5a7a3e, 0.74],
      sun: [0xfff0d8, 0.62], sunDir: new V3(-0.5, 0.7, 0.4), ambient: [0x8090a0, 0.25],
      sprite: { tex: paleSunTex, pos: new V3(-250, 250, 200), scale: 70 },
    };

    // pitch
    const PX = 20;
    const pitch = canvasTexture(26 * PX, 40 * PX, (g, W, H) => {
      const X = (x) => (x + HW) * PX, Z = (z) => (z + HL) * PX;
      for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#3f8a32' : '#4a983c'; g.fillRect(0, i * H / 10, W, H / 10); }
      for (let i = 0; i < 6000; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,40,0,0.07)'; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
      g.strokeStyle = '#f4f6ee'; g.lineWidth = 0.12 * PX;
      g.strokeRect(X(-HW + 0.3), Z(-HL + 0.3), (2 * HW - 0.6) * PX, (2 * HL - 0.6) * PX);
      g.beginPath(); g.moveTo(X(-HW + 0.3), Z(0)); g.lineTo(X(HW - 0.3), Z(0)); g.stroke();
      g.beginPath(); g.arc(X(0), Z(0), 4 * PX, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#f4f6ee';
      g.beginPath(); g.arc(X(0), Z(0), 0.2 * PX, 0, Math.PI * 2); g.fill();
      for (const s of [-1, 1]) {
        const zl = s * (HL - 0.3);
        g.strokeRect(X(-8), Math.min(Z(zl), Z(zl - s * 6)), 16 * PX, 6 * PX);
        g.strokeRect(X(-4.5), Math.min(Z(zl), Z(zl - s * 2.5)), 9 * PX, 2.5 * PX);
        g.beginPath(); g.arc(X(0), Z(zl - s * 4.5), 0.2 * PX, 0, Math.PI * 2); g.fill();
      }
    });
    const pitchMesh = new THREE.Mesh(new THREE.PlaneGeometry(2 * HW, 2 * HL), new THREE.MeshLambertMaterial({ map: pitch.tex }));
    pitchMesh.rotation.x = -Math.PI / 2;
    G.add(pitchMesh);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), lam(0x4a8a36));
    outer.rotation.x = -Math.PI / 2; outer.position.y = -0.01;
    G.add(outer);
    // boards, with a tall see-through net above them
    const boardMat = lam(0xf2f0e8), adMat = lam(0x2b3a7a);
    // the sideline area: a strip outside the west boards, through a gap, with the kiosk and the settings
    const GATE = [10, 13], SIDE_X = [-HW - 2.3, -HW];
    const boardRuns = (s) => (s < 0 ? [[-HL, GATE[0]], [GATE[1], HL]] : [[-HL, HL]]);
    for (const s of [-1, 1]) {
      for (const [z0, z1] of boardRuns(s)) {
        addBox(G, 0.15, 0.9, z1 - z0, boardMat, s * (HW + 0.08), 0.45, (z0 + z1) / 2);
        addBox(G, 0.16, 0.3, z1 - z0, adMat, s * (HW + 0.08), 0.7, (z0 + z1) / 2);
      }
      for (const side of [-1, 1]) addBox(G, HW - GW, 0.9, 0.15, boardMat, side * (GW + (HW - GW) / 2), 0.45, s * (HL + 0.08));
    }
    const netT = hoops.linkTex.clone();
    netT.needsUpdate = true;
    netT.repeat.set(40 / 0.2, 3 / 0.2);
    const netMat = new THREE.MeshBasicMaterial({ map: netT, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false, color: 0xdde4ee });
    for (const s of [-1, 1]) for (const [z0, z1] of boardRuns(s)) {
      const n = new THREE.Mesh(new THREE.PlaneGeometry(z1 - z0, 3), netMat);
      n.rotation.y = Math.PI / 2; n.position.set(s * (HW + 0.08), 2.4, (z0 + z1) / 2);
      G.add(n);
    }
    // gate posts and a sign over the gap, and a path out to the sideline
    for (const z of GATE) addBox(G, 0.2, 3.9, 0.2, lam(0xffd23f), -HW - 0.08, 1.95, z);
    makePlate(G, 'Sideline: Clubhouse & settings', 3.0, 0.36, new V3(-HW - 0.02, 3.6, (GATE[0] + GATE[1]) / 2), Math.PI / 2, { bg: '#123524', fg: '#ffd23f', size: 0.5 });
    {
      const path = new THREE.Mesh(new THREE.PlaneGeometry(SIDE_X[1] - SIDE_X[0], 2 * HL - 2), lam(0x8a7a5a));
      path.rotation.x = -Math.PI / 2; path.position.set((SIDE_X[0] + SIDE_X[1]) / 2, 0.004, 0); G.add(path);
    }
    // goals
    const postMat = lam(0xffffff);
    const goalNetT = hoops.linkTex.clone();
    goalNetT.needsUpdate = true;
    goalNetT.repeat.set(6 / 0.12, 2.2 / 0.12);
    const goalNet = new THREE.MeshBasicMaterial({ map: goalNetT, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });
    for (const s of [-1, 1]) {
      const z = s * HL;
      for (const x of [-GW, GW]) addCyl(G, 0.06, 0.06, GH, 10, postMat, x, GH / 2, z);
      const bar = addCyl(G, 0.06, 0.06, 2 * GW, 10, postMat, 0, GH, z);
      bar.rotation.z = Math.PI / 2;
      const back = new THREE.Mesh(new THREE.PlaneGeometry(2 * GW, GH), goalNet);
      back.position.set(0, GH / 2, z + s * GD);
      const top = new THREE.Mesh(new THREE.PlaneGeometry(2 * GW, GD), goalNet);
      top.rotation.x = Math.PI / 2; top.position.set(0, GH, z + s * GD / 2);
      G.add(back, top);
      for (const x of [-GW, GW]) {
        const side = new THREE.Mesh(new THREE.PlaneGeometry(GD, GH), goalNet);
        side.rotation.y = Math.PI / 2; side.position.set(x, GH / 2, z + s * GD / 2);
        G.add(side);
      }
      const keeperBox = new THREE.Mesh(new THREE.PlaneGeometry(2 * GW, 0.12), new THREE.MeshBasicMaterial({ color: TEAM_COLORS[s > 0 ? 0 : 1] }));
      keeperBox.rotation.x = -Math.PI / 2; keeperBox.position.set(0, 0.012, z - s * 0.4);
      G.add(keeperBox);
    }
    // stands on both long sides
    const seatCols = [0x3b4f9a, 0xc23b4a, 0xe8e4d8];
    for (const s of [-1, 1]) {
      for (let row = 0; row < 5; row++) {
        addBox(G, 1.0, 0.5 + row * 0.5, 44, lam(seatCols[row % 3]), s * (HW + 3 + row * 1.0), (0.5 + row * 0.5) / 2, 0);
      }
    }
    // the kiosk and buttons stand along the sideline, off the pitch
    const KX = SIDE_X[0] + 0.45, KZ = 15.4;
    makeKiosk(L, KX, KZ, Math.PI / 2);
    makeButton(L, new V3(KX, 1.0, 8.3), 0xb388ff, 'Switch team', () => switchTeam(), { faceYaw: Math.PI / 2 });
    const COLLIDERS = [];
    L.board = makeBoard(G, 720, 460, 6.4, 4.09, -(HW + 7.6), 5.6, 0, Math.PI / 2, false);
    addBox(G, 0.3, 4.4, 6.8, legMat, -(HW + 7.8), 5.6, 0);
    const sign = makeBoard(G, 720, 500, 2.0, 1.39, SIDE_X[0] + 0.2, 1.7, (GATE[0] + GATE[1]) / 2, Math.PI / 2);
    function drawSign() {
      const g = sign.g;
      g.fillStyle = '#123524'; g.fillRect(0, 0, 720, 500);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 58px ${DISPLAY}`;
      g.fillText('How to play', 36, 78);
      const sections = [
        ['Dribble', 'Walk into the ball to push it along. In VR you can also bat it with your hands, like a keeper.'],
        ['Kick', 'Near the ball, pull the trigger to kick toward where your hand points. In a browser, click to tap it or hold Space for a big kick.'],
        ['Win', `Score in the other team\u2019s goal. First team to ${WIN} wins.`],
      ];
      let y = 122;
      for (const [label, body] of sections) {
        g.fillStyle = '#8bd450'; g.font = `700 24px ${BODY}`;
        g.fillText(label, 36, y);
        y += 31;
        g.fillStyle = '#eef5ea'; g.font = `400 24px ${BODY}`;
        y = wrapText(g, body, 36, y, 648, 30) + 10;
      }
      sign.tex.needsUpdate = true;
    }
    drawSign();
    redraws.push(drawSign);

    // ball
    const ballTex = canvasTexture(256, 128, (g) => {
      g.fillStyle = '#f7f7f2'; g.fillRect(0, 0, 256, 128);
      g.fillStyle = '#1b1932';
      const spots = [[32, 30], [96, 30], [160, 30], [224, 30], [0, 78], [64, 78], [128, 78], [192, 78], [256, 78], [32, 118], [96, 118], [160, 118], [224, 118]];
      for (const [x, y] of spots) {
        g.beginPath();
        for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 - Math.PI / 2; g.lineTo(x + Math.cos(a) * 13, y + Math.sin(a) * 11); }
        g.closePath(); g.fill();
      }
    }).tex;
    const ball = makeBody(L, { geo: new THREE.SphereGeometry(SMALL_R, 22, 16), tex: ballTex, r: SMALL_R, slot: new V3(0, SMALL_R + 0.002, 0) });
    // the ball's size: big and floaty (bubble soccer), or the classic small one
    const SOC = { big: true, seq: 0, armed: true, lastTouch: '' };
    L.soc = SOC;
    function applyBallSize(big) {
      SOC.big = big;
      BR = big ? BIG_R : SMALL_R;
      ball.r = BR;
      ball.mesh.scale.setScalar(BR / SMALL_R);
      if (ball.shadow) ball.shadow.scale.setScalar(BR / SMALL_R);
      ball.slot.y = BR + 0.002;
      if (ball.pos.y < BR) ball.pos.y = BR;
      L.gravityScale = big ? 0.33 : 1;   // floats like a beach ball
      L.airDrag = big ? 0.35 : 0;
      state.hudDirty = true;
    }
    applyBallSize(true);
    function setBall(big) {
      applyBallSize(big);
      SOC.seq += 1;
      showToast(big ? 'Bubble soccer: the big floaty ball' : 'Classic soccer: the regular ball');
      forcePresence();
    }
    L.setBall = setBall;
    L.ball = ball;

    const _cp = new V3();
    L.collide = (b) => {
      let support = groundBounce(b, 0.55, 0.9, 'grass');
      if (b.pos.x < -HW + b.r) { b.pos.x = -HW + b.r; if (b.vel.x < 0) { impact(b, -b.vel.x, 'board'); b.vel.x *= -0.6; } }
      if (b.pos.x > HW - b.r) { b.pos.x = HW - b.r; if (b.vel.x > 0) { impact(b, b.vel.x, 'board'); b.vel.x *= -0.6; } }
      for (const s of [-1, 1]) {
        const beyond = s * b.pos.z > HL - b.r;
        if (!beyond) continue;
        const inMouth = Math.abs(b.pos.x) < GW - 0.06 && b.pos.y < GH - 0.06;
        if (inMouth || s * b.pos.z > HL + 0.05) {
          // inside the goal: back net, side nets, roof
          if (s * b.pos.z > HL + GD - b.r) { b.pos.z = s * (HL + GD - b.r); if (s * b.vel.z > 0) { impact(b, Math.abs(b.vel.z), 'net'); b.vel.z *= -0.15; } }
          if (s * b.pos.z > HL) {
            if (Math.abs(b.pos.x) > GW - b.r) { b.pos.x = Math.sign(b.pos.x) * (GW - b.r); b.vel.x *= -0.2; }
            if (b.pos.y > GH - b.r) { b.pos.y = GH - b.r; if (b.vel.y > 0) b.vel.y *= -0.2; }
          }
        } else {
          b.pos.z = s * (HL - b.r);
          if (s * b.vel.z > 0) { impact(b, Math.abs(b.vel.z), 'board'); b.vel.z *= -0.6; }
        }
        // posts and crossbar
        for (const px of [-GW, GW]) if (b.pos.y < GH + b.r) collidePoint(b, _cp.set(px, clamp(b.pos.y, 0, GH), s * HL), 0.06 + b.r, 0.6, 'rim');
        collidePoint(b, _cp.set(clamp(b.pos.x, -GW, GW), GH, s * HL), 0.06 + b.r, 0.6, 'rim');
      }
      for (const bx of COLLIDERS) if (collideBox(b, bx) > 0.6) support = true;
      return support;
    };

    // ---------------------------------------------------------------- me
    L.me = { team: -1, round: 0, goals: [0, 0], scoredBy: 0, winT: 0, kickoffT: 0, lastHead: new V3(), vel: new V3(), kickCool: 0 };
    const me = L.me;
    const _hd = new V3();
    function spawnHalf() {
      const z = me.team === 0 ? 8 : -8;
      camera.getWorldPosition(_hd);
      dolly.position.x += (rand() - 0.5) * 6 - _hd.x;
      dolly.position.z += z - _hd.z;
      if (state.mode !== 'vr') { state.yaw = me.team === 0 ? 0 : Math.PI; state.pitch = -0.1; }
    }
    function switchTeam(balance) {
      if (me.team < 0) return;
      me.team = 1 - me.team;
      sfx('zap', 1);
      showToast(balance ? `Teams balanced: you\u2019re on ${TEAM_NAMES[me.team]}` : `You\u2019re on ${TEAM_NAMES[me.team]} now`);
      spawnHalf();
      state.dirtyBoard = true;
      state.hudDirty = true;
      forcePresence();
    }
    L.switchTeam = switchTeam;
    L.spawn = () => {
      dolly.position.set(0, 0, 0);
      camera.position.set(0, 1.6, 0);
      if (me.team < 0) me.team = pickTeam(L);
      spawnHalf();
      camera.getWorldPosition(me.lastHead);
    };
    L.onEnter = () => { if (me.team < 0) me.team = pickTeam(L); L.enteredAt = performance.now(); state.dirtyBoard = true; };

    function claimBall() {
      if (ball.owner !== state.myPeer || ball.held) {
        ball.v += 1;
        ball.owner = state.myPeer;
        ball.held = null;
      }
      ball.sleeping = false;
      ball.restT = 0;
      ball.corr.set(0, 0, 0);
      ball.scored = false;
      forcePresence();
    }
    // kick toward a direction (or toward where you are looking)
    const _kd = new V3();
    function kick(power, dir) {
      const now = performance.now();
      if (now < me.kickCool || state.mode === 'menu') return false;
      const dx = ball.pos.x - myHead.pos.x, dz = ball.pos.z - myHead.pos.z;
      // the big ball can be hit when it's up in the air, too
      if (Math.hypot(dx, dz) > (SOC.big ? 2.3 : 1.6) || ball.pos.y > (SOC.big ? 2.6 : 1.1)) return false;
      me.kickCool = now + 250;
      _kd.copy(dir);
      // a harder kick gets more air under it, on top of where you're looking
      _kd.y = SOC.big ? Math.min(0.85, clamp(_kd.y, -0.1, 0.5) + 0.12 + power * 0.34) : clamp(_kd.y, -0.1, 0.65) + 0.18;
      _kd.normalize();
      claimBall(); SOC.lastTouch = state.myPeer;
      ball.vel.copy(_kd).multiplyScalar(SOC.big ? 5 + power * 10.5 : 6 + power * 16).addScaledVector(me.vel, 0.4);
      ball.pos.y = Math.max(ball.pos.y, BR + 0.02);
      sfx('kick', 0.6 + power * 0.4);
      return true;
    }
    L.kick = (power) => {
      camera.getWorldQuaternion(_kq);
      _kd2.set(0, 0, -1).applyQuaternion(_kq);
      if (!kick(power, _kd2)) sfx('whoosh', 0.4);
    };
    const _kq = new Q4(), _kd2 = new V3();
    L.onVRTrigger = (h) => {
      const ray = myRays[h.side];
      const q = ray.ok ? ray.quat : myHands[h.side].quat;
      _kd2.set(0, 0, -1).applyQuaternion(q);
      const hv = handSpeed(h);
      kick(clamp(0.45 + hv / 8, 0.45, 1), _kd2);
    };
    function handSpeed(h) {
      const hs = h.hist;
      if (hs.length < 2) return 0;
      const a = hs[Math.max(0, hs.length - 4)], b = hs[hs.length - 1];
      return a.p.distanceTo(b.p) / Math.max(0.001, (b.t - a.t) / 1000);
    }
    L.throwLabel = () => 'Kick';
    L.chargeKick = true;

    // ---------------------------------------------------------------- network
    L.presence = () => ({ sq: [me.team, me.round, me.goals[0], me.goals[1], me.scoredBy] });
    const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
    L.readPresence = (rec, pres, st) => {
      const a = Array.isArray(pres.sq) ? pres.sq : [];
      const team = int(a[0], 0, 1) ? a[0] : -1, round = int(a[1], 0, 1e6) ? a[1] : 0;
      const g0 = int(a[2], 0, 999) ? a[2] : 0, g1 = int(a[3], 0, 999) ? a[3] : 0, scoredBy = int(a[4], 0, 999) ? a[4] : 0;
      if (st.init && round === st.round && (g0 > st.g0 || g1 > st.g1)) {
        const t = g0 > st.g0 ? 0 : 1;
        goalCelebration(t, scoredBy > (st.scoredBy || 0) ? rec.name : null);
      }
      if (team !== st.team || g0 !== st.g0 || g1 !== st.g1) state.dirtyBoard = true;
      Object.assign(st, { team, round, g0, g1, scoredBy, init: true });
    };
    function scores() {
      const s = [me.goals[0], me.goals[1]];
      for (const rec of remotes.values()) {
        if (rec.lv !== L.idx) continue;
        const st = rec.lvState[L.id];
        if (st && st.round === me.round) { s[0] += st.g0 || 0; s[1] += st.g1 || 0; }
      }
      return s;
    }
    L.scores = scores;
    function goalCelebration(team, who) {
      SOC.armed = false;   // this ball has scored: it can't score again until it's back in play
      sfx('whistle', 1);
      setTimeout(() => sfx('cheer', 0.8), 200);
      const s = scores();
      showToast(`Goal for ${TEAM_NAMES[team]}${who ? ` by ${who}` : ''}! Red ${s[0]}, Blue ${s[1]}`);
      state.flashT = performance.now();
      state.dirtyBoard = true;
    }

    // ---------------------------------------------------------------- per-frame
    const wrist = makeWristPanel();
    let statusKey = '';
    const _n = new V3(), _hv = new V3();
    L.update = (dt, now) => {
      autoBalance(L, me, now, switchTeam);
      // my velocity, from how my head moved (includes walking)
      if (dt > 0) {
        _hv.subVectors(myHead.pos, me.lastHead).divideScalar(dt);
        _hv.y = 0;
        if (_hv.length() > 12) _hv.set(0, 0, 0);
        me.vel.lerp(_hv, Math.min(1, dt * 10));
      }
      me.lastHead.copy(myHead.pos);
      const inGame = state.mode !== 'menu' && state.level === L.idx;
      if (inGame && !ball.held) {
        // dribbling: my body pushes the ball
        const dx = ball.pos.x - myHead.pos.x, dz = ball.pos.z - myHead.pos.z, d = Math.hypot(dx, dz), minD = 0.34 + BR;
        if (d < minD && d > 1e-4 && ball.pos.y < (SOC.big ? BR + 0.7 : 1.0)) {
          _n.set(dx / d, 0, dz / d);
          claimBall(); SOC.lastTouch = state.myPeer;
          ball.pos.x = myHead.pos.x + _n.x * (minD + 0.01);
          ball.pos.z = myHead.pos.z + _n.z * (minD + 0.01);
          const push = Math.max(0, me.vel.dot(_n)) * 1.2 + 0.7;
          const vn = ball.vel.x * _n.x + ball.vel.z * _n.z;
          if (vn < push) { ball.vel.x += _n.x * (push - vn); ball.vel.z += _n.z * (push - vn); }
          if (Math.random() < dt * 4) sfx('ball', 0.3);
        }
        // hands bat the ball in VR
        if (state.mode === 'vr') {
          for (const side of SIDES) {
            const mh = myHands[side];
            if (!mh.ok) continue;
            const hd = ball.pos.distanceTo(mh.pos), min = BR + 0.07;
            if (hd < min && hd > 1e-4) {
              const h = vrHands[side];
              const sp = handSpeed(h);
              _n.subVectors(ball.pos, mh.pos).multiplyScalar(1 / hd);
              claimBall(); SOC.lastTouch = state.myPeer;
              ball.pos.copy(mh.pos).addScaledVector(_n, min + 0.01);
              const hs = h.hist;
              const hv = hs.length > 1 ? new V3().subVectors(hs[hs.length - 1].p, hs[Math.max(0, hs.length - 4)].p).divideScalar(Math.max(0.001, (hs[hs.length - 1].t - hs[Math.max(0, hs.length - 4)].t) / 1000)) : new V3();
              ball.vel.copy(hv).multiplyScalar(1.1).addScaledVector(_n, 1.2);
              if (sp > 1) { sfx('ball', Math.min(1, sp / 6)); haptic(h, 0.5, 30); }
            }
          }
        }
      }
      // goals: whoever last touched the ball judges them
      // a ball that has scored is dead for scoring until it's well clear of both goals again (or kicked off from the spot)
      if (!SOC.armed && Math.abs(ball.pos.z) < HL - BR - 0.6) SOC.armed = true;
      // the centre of the ball over the line means most of it is over: that's a goal, no need to reach the back net
      if (SOC.armed && ball.owner === state.myPeer && !ball.held && Math.abs(ball.pos.z) > HL && Math.abs(ball.pos.x) < GW && ball.pos.y < GH) {
        ball.scored = true;
        SOC.armed = false;
        const team = ball.pos.z > 0 ? 1 : 0;
        me.goals[team] += 1;
        const byBot = L.socBots && L.socBots.byId(SOC.lastTouch);
        if (team === me.team && !byBot) me.scoredBy += 1;
        me.kickoffT = now + 2600;
        goalCelebration(team, byBot ? (byBot.team === team ? byBot.name : null) : team === me.team ? 'you' : null);
        forcePresence();
      }
      if (me.kickoffT && now > me.kickoffT) {
        me.kickoffT = 0;
        if (ball.owner === state.myPeer) { reclaimToSlot(ball); ball.sleeping = false; sfx('whistle', 0.6); }
      }
      // rounds
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id];
        if (rec.lv === L.idx && st && st.round > me.round) { me.round = st.round; me.goals = [0, 0]; me.scoredBy = 0; me.winT = 0; state.dirtyBoard = true; forcePresence(); }
      }
      const s = scores();
      if (!me.winT && (s[0] >= WIN || s[1] >= WIN)) {
        me.winT = now;
        const w = s[0] >= WIN ? 0 : 1;
        sfx(w === me.team ? 'fanfare' : 'buzzer', 1);
        showToast(`${TEAM_NAMES[w]} team wins ${s[w]} to ${s[1 - w]}!`);
      }
      if (me.winT && now - me.winT > 7000) {
        me.round += 1; me.goals = [0, 0]; me.scoredBy = 0; me.winT = 0;
        if (ball.owner === state.myPeer || ball.owner === null) { reclaimToSlot(ball); ball.sleeping = false; }
        state.dirtyBoard = true;
        forcePresence();
      }
      // readouts
      const scoreLine = `Red ${s[0]}, Blue ${s[1]}`;
      wrist.update(me.team >= 0 ? `${TEAM_NAMES[me.team]} team` : 'Soccer', TEAM_HEX[me.team], scoreLine);
      if (ui.status) {
        const show = state.mode === 'flat';
        ui.status.hidden = !show;
        const key = `${me.team}|${scoreLine}`;
        if (show && key !== statusKey) {
          statusKey = key;
          const t = document.createElement('span'); t.textContent = `${TEAM_NAMES[me.team] || ''} team`; t.style.color = TEAM_HEX[me.team] || '';
          const sc = document.createElement('span'); sc.textContent = scoreLine;
          const o = document.createElement('span'); o.className = 'obj'; o.textContent = `Attack the ${TEAM_NAMES[1 - me.team] ? TEAM_NAMES[1 - me.team].toLowerCase() : ''} goal, first to ${WIN}`;
          ui.status.replaceChildren(t, sc, o);
        }
      }
    };
    L.onExit = () => { wrist.show(false); if (ui.status) ui.status.hidden = true; statusKey = ''; };

    L.rowFor = (st, isMe) => {
      const team = isMe ? me.team : st.team, goals = isMe ? me.scoredBy : (st.scoredBy || 0);
      return { team, goals, text: `${goals} ${goals === 1 ? 'goal' : 'goals'}`, color: TEAM_HEX[team] || '#888' };
    };
    L.sortRows = (a, b) => (a.team - b.team) || (b.goals - a.goals);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720, H = 460;
      const s = scores();
      g.fillStyle = '#0f1f16'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
      g.textBaseline = 'alphabetic';
      g.textAlign = 'left'; g.fillStyle = TEAM_HEX[0]; g.font = `800 80px ${DISPLAY}`; g.fillText(`Red ${s[0]}`, 36, 96);
      g.textAlign = 'right'; g.fillStyle = TEAM_HEX[1]; g.fillText(`${s[1]} Blue`, W - 36, 96);
      g.textAlign = 'center'; g.fillStyle = '#cfe2d4'; g.font = `400 24px ${BODY}`; g.fillText(`Sunday soccer, first to ${WIN}`, W / 2, 132);
      drawRows(g, rows, 186, 46, W);
      L.board.tex.needsUpdate = true;
    };
    L.hudActions = [{ label: () => 'Switch team', run: () => switchTeam() }];
    L.hints = [['Walk into it', 'dribble'], ['Click', 'tap kick'], ['Space', 'hold for a big kick'], ['WASD', 'move']];
    // you can be on the pitch, on the sideline strip, or in the gap between them: the nearest of those to where you're going
    L.clampPlayer = (p) => {
      const m = 0.3;
      const inGoal = Math.abs(p.x) < GW - m && Math.abs(p.z) > HL - m;
      const cand = [
        [clamp(p.x, -HW + m, HW - m), inGoal ? clamp(p.z, -(HL + GD - m), HL + GD - m) : clamp(p.z, -HL + m, HL - m)],
        [clamp(p.x, SIDE_X[0] + m, SIDE_X[1] - m), clamp(p.z, -HL + 1, HL - 1)],
        [clamp(p.x, SIDE_X[1] - 0.4, -HW + 0.4), clamp(p.z, GATE[0] + m, GATE[1] - m)],
      ];
      let best = cand[0], bd = Infinity;
      for (const c of cand) { const d = Math.hypot(c[0] - p.x, c[1] - p.z); if (d < bd) { bd = d; best = c; } }
      return [best[0] - p.x, best[1] - p.z];
    };
    L.attract = (now) => {
      const a = reduceMotion ? 0 : Math.sin(now * 0.00007) * 0.6;
      camera.position.set(Math.sin(a) * 18, 9, Math.cos(a) * 24);
      camera.lookAt(0, 0, 0);
    };
    L.hudActions = L.hudActions || [];
    L.hudActions.push({ label: () => (SOC.big ? 'Ball: bubble' : 'Ball: classic'), run: () => setBall(!SOC.big) });
    makeButton(L, new V3(KX, 1.0, 6.5), 0xffd23f, 'Big / small ball', () => setBall(!SOC.big), { faceYaw: Math.PI / 2 });
    {
      const baseP = L.presence, baseR = L.readPresence;
      L.presence = () => { const p = baseP ? baseP() : {}; if (SOC.seq) p.sbs = [SOC.seq, SOC.big ? 1 : 0]; return p; };
      L.readPresence = (rec, pres, st) => {
        if (baseR) baseR(rec, pres, st);
        const a = pres.sbs;
        if (!Array.isArray(a) || a.length !== 2 || !Number.isInteger(a[0])) return;
        if (a[0] > SOC.seq || (a[0] === SOC.seq && rec.peer < state.myPeer && (a[1] === 1) !== SOC.big)) { SOC.seq = a[0]; if ((a[1] === 1) !== SOC.big) applyBallSize(a[1] === 1); }
      };
    }
    // ---------------------------------------------------------------- computer players
    // Bots make up each team to the picker's number. The lowest-named player's page runs them: when a bot touches the
    // ball that page claims it (as anyone touching it does), so the ball's physics and goals work as they always have.
    // Each team's bots share out the jobs: a keeper (when the side has three or more), a chaser for the ball, and supports.
    makePlayerPicker(L, { min: 1, max: 5, def: 3, label: 'Per team', x: KX, z: KZ + 2.1, yaw: Math.PI / 2 });
    const SB_NAMES = ['Kicky Kai', 'Nutmeg Nia', 'Header Hal', 'Volley Val', 'Corner Cora', 'Striker Stu', 'Dribble Di', 'Goalie Gus', 'Pass Patti', 'Wing Wes'];
    const sbots = SB_NAMES.map((name, k) => {
      const team = k < 5 ? 0 : 1;
      const g = buildAvatar(TEAM_HEX[team], (k * 3 + 1) % HATS.length, k % FACES.length, true, (k * 2) % SHIRTS.length, team ? 4 : 6);
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = TEAM_HEX[team]; c.font = `700 28px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(name, 128, 33, 230); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.9, 0.225, 1); tag.position.y = 0.45; g.add(tag);
      g.visible = false; G.add(g);
      return { id: `bot:${k}`, k, team, j: k % 5, name, g, active: false, x: 0, z: 0, rx: 0, rz: 0, yaw: 0, vx: 0, vz: 0, role: 'sup', kickCool: 0, skill: 0.85 + rand() * 0.3 };
    });
    const socHumans = () => { const ids = state.mode !== 'menu' ? [{ id: state.myPeer, team: me.team }] : []; for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && rec.inGame && st && (st.team === 0 || st.team === 1)) ids.push({ id: rec.peer, team: st.team }); } return ids; };
    const socHost = () => { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort()[0] === state.myPeer; };
    L.socBots = { list: sbots, byId: (id) => (typeof id === 'string' && id.startsWith('bot:') ? sbots[Number(id.slice(4))] || null : null) };
    const attackZ = (t) => (t === 0 ? -HL : HL), ownZ = (t) => (t === 0 ? HL : -HL);
    function homeSpot(b, out) {
      // where a bot lines up: its own half, spread across
      const s = b.team === 0 ? 1 : -1;
      return out.set(clamp((b.j - 2) * 4.2, -HW + 1.5, HW - 1.5), 0, s * (b.role === 'keep' ? HL - 1.2 : 6 + (b.j % 2) * 4));
    }
    const _bt = new V3();
    function fillSocBots() {
      const nh = [0, 0];
      for (const h of socHumans()) nh[h.team] += 1;
      for (const t of [0, 1]) {
        const want = Math.max(0, L.picker.n - nh[t]);
        sbots.filter((b) => b.team === t).forEach((b, i) => {
          const was = b.active;
          b.active = i < want;
          if (b.active && !was) { homeSpot(b, _bt); b.x = b.rx = _bt.x; b.z = b.rz = _bt.z; b.vx = b.vz = 0; }
        });
      }
      forcePresence();
    }
    function assignRoles() {
      const hs = socHumans();
      for (const t of [0, 1]) {
        const tb = sbots.filter((b) => b.active && b.team === t);
        if (!tb.length) continue;
        const size = tb.length + hs.filter((h) => h.team === t).length;
        let rest = tb;
        if (size >= 3) { tb[0].role = 'keep'; rest = tb.slice(1); }
        // the chaser: whichever bot is nearest the ball, unless a teammate person is nearer still
        let best = null, bd = 1e9;
        for (const b of rest) { const d = Math.hypot(b.x - ball.pos.x, b.z - ball.pos.z); if (d < bd) { bd = d; best = b; } }
        let personNearer = false;
        for (const h of hs) if (h.team === t) {
          const rec = remotes.get(h.id);
          const p = h.id === state.myPeer ? myHead.pos : (rec && rec.hasH ? rec.cur.h.pos : null);
          if (p && Math.hypot(p.x - ball.pos.x, p.z - ball.pos.z) < bd - 1.0) personNearer = true;
        }
        for (const b of rest) b.role = b === best && !personNearer ? 'chase' : 'sup';
      }
    }
    function botKick(b, tx, tz, power, spread, now, loft) {
      let dx = tx - ball.pos.x, dz = tz - ball.pos.z;
      const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
      const a = (Math.random() - 0.5) * spread, c = Math.cos(a), s2 = Math.sin(a);
      const kx = dx * c - dz * s2, kz = dx * s2 + dz * c;
      const up = loft !== undefined ? loft : SOC.big ? 0.12 + power * 0.34 : 0.12 + power * 0.12;
      _bt.set(kx, up, kz).normalize();
      claimBall(); SOC.lastTouch = b.id;
      ball.vel.copy(_bt).multiplyScalar(SOC.big ? 5 + power * 10.5 : 6 + power * 15);
      ball.pos.y = Math.max(ball.pos.y, BR + 0.02);
      b.kickCool = (now || performance.now()) + 700; SOC.botKickT = now || performance.now();
      SOC.kicks = (SOC.kicks || 0) + 1;
      sfx('kick', 0.4 + power * 0.4);
    }
    const _tg = new V3();
    function stepSocBots(dt, now) {
      assignRoles();
      const live = SOC.armed && !me.kickoffT && !me.winT;
      for (const b of sbots) {
        if (!b.active) continue;
        const atk = attackZ(b.team), own = ownZ(b.team), dirZ = Math.sign(atk);
        let speed = 3.4 * b.skill;
        // where to go
        if (!live) homeSpot(b, _tg);
        else if (b.role === 'keep') {
          const near = Math.abs(ball.pos.z - own) < 5 && Math.abs(ball.pos.x) < GW + 2;
          if (near) { _tg.set(ball.pos.x, 0, ball.pos.z); speed *= 1.15; }
          else _tg.set(clamp(ball.pos.x * 0.35, -GW + 0.5, GW - 0.5), 0, own - Math.sign(own) * 1.2);
        } else if (b.role === 'chase') {
          // get behind the ball, on the line from it to the goal you're attacking
          let gx = -ball.pos.x, gz = atk - ball.pos.z; const gl = Math.hypot(gx, gz) || 1; gx /= gl; gz /= gl;
          const back = BR + 0.55;
          _tg.set(ball.pos.x - gx * back, 0, ball.pos.z - gz * back);
          // on the wrong side of the ball: go round it, not through it
          const ahead = (b.x - ball.pos.x) * gx + (b.z - ball.pos.z) * gz;
          if (ahead > -0.2) { const side = (b.x - ball.pos.x) * -gz + (b.z - ball.pos.z) * gx >= 0 ? 1 : -1; _tg.x += -gz * side * 1.6; _tg.z += gx * side * 1.6; }
          speed *= 1.08;
        } else {
          // support: spread across, a little goal-side of the ball, or ahead of it when we're attacking
          const lane = clamp((b.j - 2) * 3.6, -HW + 2, HW - 2);
          const attacking = ball.pos.z * dirZ > -4;
          _tg.set(clamp(ball.pos.x * 0.4 + lane, -HW + 1.5, HW - 1.5), 0, clamp(ball.pos.z + (attacking ? dirZ * 5 : -dirZ * 5), -HL + 2, HL - 2));
          speed *= 0.85;
        }
        // move (with a little separation from teammates)
        let mx = _tg.x - b.x, mz = _tg.z - b.z;
        for (const o of sbots) if (o !== b && o.active) { const ox = b.x - o.x, oz = b.z - o.z, od = Math.hypot(ox, oz); if (od < 1.2 && od > 1e-3) { mx += ox / od * 0.8; mz += oz / od * 0.8; } }
        const ml = Math.hypot(mx, mz);
        const want = ml > 0.15 ? Math.min(speed, ml * 3) : 0;
        const tvx = ml > 1e-3 ? mx / ml * want : 0, tvz = ml > 1e-3 ? mz / ml * want : 0;
        const k = 1 - Math.exp(-dt * 6);
        b.vx += (tvx - b.vx) * k; b.vz += (tvz - b.vz) * k;
        b.x = clamp(b.x + b.vx * dt, -HW + 0.4, HW - 0.4); b.z = clamp(b.z + b.vz * dt, -HL + 0.4, HL - 0.4);
        if (Math.hypot(b.vx, b.vz) > 0.3) b.yaw = Math.atan2(-b.vx, -b.vz);
        if (!live || ball.held) continue;
        // touching the ball pushes it, like walking into it does
        const dx = ball.pos.x - b.x, dz = ball.pos.z - b.z, d = Math.hypot(dx, dz), minD = 0.34 + BR;
        if (d < minD && d > 1e-4 && ball.pos.y < (SOC.big ? BR + 0.7 : 1.0)) {
          const nx = dx / d, nz = dz / d;
          claimBall(); SOC.lastTouch = b.id;
          ball.pos.x = b.x + nx * (minD + 0.01); ball.pos.z = b.z + nz * (minD + 0.01);
          const push = Math.max(0, b.vx * nx + b.vz * nz) * 1.2 + 0.7, vn = ball.vel.x * nx + ball.vel.z * nz;
          if (vn < push) { ball.vel.x += nx * (push - vn); ball.vel.z += nz * (push - vn); }
        }
        // kick: chasers shoot when in range (or knock it on), keepers clear it
        // (a ball that's just been kicked gets a moment to travel before anyone kicks it again)
        if (now > b.kickCool && now - (SOC.botKickT || 0) > 450 && d < (SOC.big ? 1.6 : 1.1) && ball.pos.y < (SOC.big ? 2.0 : 0.8) && (b.role === 'chase' || b.role === 'keep')) {
          const toGoal = Math.hypot(ball.pos.x, atk - ball.pos.z);
          const behind = ((ball.pos.x - b.x) * -ball.pos.x + (ball.pos.z - b.z) * (atk - ball.pos.z)) / ((d || 1) * (toGoal || 1));
          if (b.role === 'keep') botKick(b, ball.pos.x > 0 ? HW - 2 : -HW + 2, 0, 0.85, 0.5, now);
          else if (behind > 0.35) {
            const lineDist = Math.abs(atk - ball.pos.z), wing = Math.abs(ball.pos.x) > GW + 2.5;
            // out on the wing near their goal: cut it back into the middle
            if (wing && lineDist < 9) botKick(b, 0, atk - Math.sign(atk) * 5, 0.45, 0.3, now, 0.06);
            // lined up and in range: a hard, low shot
            else if (toGoal < (SOC.big ? 11 : 15) && behind > 0.6) {
              // aim for the corner away from their keeper (or a corner at random)
              const kp = sbots.find((o) => o.active && o.team !== b.team && o.role === 'keep');
              const side = kp ? (kp.x > 0 ? -1 : 1) : (Math.random() < 0.5 ? -1 : 1);
              botKick(b, side * (GW - (SOC.big ? 1.0 : 0.6)) + (Math.random() - 0.5) * 0.6, atk, 0.92 + Math.random() * 0.08, 0.12 / b.skill, now, SOC.big ? 0.04 : 0.03);
            }
            // further out: knock it on toward goal (or keep dribbling if it's already rolling the right way)
            else if (toGoal >= (SOC.big ? 11 : 15)) botKick(b, ball.pos.x * 0.6, ball.pos.z + Math.sign(atk) * 8, 0.32, 0.3, now, 0.08);
          }
        }
      }
    }
    // everyone draws the bots (smoothed); the host moves them
    let fillT = 0;
    const baseUpdate = L.update;
    L.update = (dt, now) => {
      baseUpdate(dt, now);
      const here = state.mode !== 'menu' && state.level === L.idx;
      if (!here) { for (const b of sbots) b.g.visible = false; return; }
      if (socHost()) {
        if (now - fillT > 800) { fillT = now; fillSocBots(); }
        if (!L.paused) stepSocBots(Math.min(dt, 0.05), now);
        for (const b of sbots) { b.rx = b.x; b.rz = b.z; }
      } else for (const b of sbots) { const k = 1 - Math.exp(-dt * 10); b.rx += (b.x - b.rx) * k; b.rz += (b.z - b.rz) * k; }
      for (const b of sbots) {
        b.g.visible = b.active;
        if (!b.active) continue;
        const run = Math.hypot(b.vx, b.vz);
        b.g.position.set(b.rx, 1.5 + (run > 0.5 ? Math.abs(Math.sin(now * 0.012 + b.k)) * 0.06 : 0), b.rz);
        b.g.rotation.y = b.yaw;
      }
    };
    {
      const baseP = L.presence, baseR = L.readPresence;
      const r1 = (x) => Math.round(x * 10);
      L.presence = () => {
        const p = baseP();
        if (socHost()) p.sbt = sbots.filter((b) => b.active).map((b) => [b.k, r1(b.x), r1(b.z), Math.round(b.yaw * 100), r1(b.vx), r1(b.vz)]);
        return p;
      };
      L.readPresence = (rec, pres, st) => {
        baseR(rec, pres, st);
        const ids = [state.myPeer]; for (const r of remotes.values()) if (r.lv === L.idx && r.inGame) ids.push(r.peer);
        if (rec.peer !== ids.sort()[0] || !Array.isArray(pres.sbt)) return;
        const seen = new Set();
        for (const a of pres.sbt.slice(0, sbots.length)) {
          if (!Array.isArray(a) || a.length !== 6 || !a.every(Number.isFinite) || !sbots[a[0]]) continue;
          const b = sbots[a[0]]; seen.add(b.k);
          if (!b.active) { b.rx = a[1] / 10; b.rz = a[2] / 10; }
          Object.assign(b, { active: true, x: clamp(a[1] / 10, -HW, HW), z: clamp(a[2] / 10, -HL, HL), yaw: a[3] / 100, vx: a[4] / 10, vz: a[5] / 10 });
        }
        for (const b of sbots) if (!seen.has(b.k)) b.active = false;
      };
    }
    L.onExit = ((base) => () => { base(); for (const b of sbots) b.g.visible = false; })(L.onExit);
    L.socInternals = { physics: (dt, now) => updateBodies(L, dt, now), me, scores, sbots, fillSocBots, stepSocBots, assignRoles, botKick, socHost, SOC, ball, HW, HL, GW };
    return L;
  })();
