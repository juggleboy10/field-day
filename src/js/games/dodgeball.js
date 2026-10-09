  // ================================================================ LEVEL: GYM CLASS DODGEBALL
  // Red on one half of a gym, blue on the other, six foam balls on the centre line. Pick one up and throw it: a ball that hasn't
  // touched the floor sends whoever it hits to the sideline. Catch one instead and the thrower is out and a teammate comes back.
  // Best of three rounds. Bots fill each team up to the number picked (four to start with). The lowest-named player's page runs the rounds and the bots; every page
  // judges hits on its own player.
  const dodgeball = (() => {
    const L = newLevel(17);
    const G = L.group;
    L.teams = true; L.teamKey = 'dq';
    L.bounds = { minX: -9, maxX: 9, minZ: -14, maxZ: 14 };
    L.gravityScale = 1; L.airDrag = 0.03; L.rollFriction = 0.8;
    L.throwSpeed = [4.5, 17, 0.1];
    L.walkSpeed = 3.6;
    L.env = {
      sky: skyTexture([[0, '#2a2f4a'], [1, '#2a2f4a']]), bg: 0x2a2f4a, fog: [0x2a2f4a, 40, 120], hemi: [0xfff1dc, 0x6a5a48, 0.95],
      sun: [0xffffff, 0.35], sunDir: new V3(0.3, 1, 0.2), ambient: [0x806858, 0.4], sprite: null,
    };
    const HW = 6, HD = 10, BR = 0.11, NB = 6, TEAM_SIZE = 5, WIN_ROUNDS = 2, ROUND_MS = 90000, COUNT_MS = 4000, OVER_MS = 6000;
    const DB_HEX = [0xe5453a, 0x3d82e8], DB_STR = ['#ff6a5a', '#6aa8ff'];
    const ST = { idle: 0, count: 1, play: 2, over: 3 }, ST_N = ['idle', 'count', 'play', 'over'];
    const _hd = new V3(), _t = new V3(), _v = new V3();

    // ---------------------------------------------------------------- the gym
    const wood = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#c98a4a'; g.fillRect(0, 0, 256, 256);
      for (let r = 0; r < 8; r++) { g.fillStyle = r % 2 ? '#d49a58' : '#be7e40'; g.fillRect(0, r * 32, 256, 30); g.fillStyle = 'rgba(70,35,10,0.35)'; g.fillRect(0, r * 32 + 30, 256, 2); g.fillRect(((r * 83) % 256), r * 32, 2, 32); }
    }).tex;
    wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(9, 14);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 28), new THREE.MeshLambertMaterial({ map: wood }));
    floor.rotation.x = -Math.PI / 2; G.add(floor);
    const white = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const paint = (c) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.3, depthWrite: false });
    addBox(G, 2 * HW, 0.012, HD, paint(DB_HEX[0]), 0, 0.006, HD / 2);       // red half (the +z side)
    addBox(G, 2 * HW, 0.012, HD, paint(DB_HEX[1]), 0, 0.006, -HD / 2);      // blue half
    addBox(G, 2 * HW + 0.3, 0.018, 0.14, white, 0, 0.009, 0);                // the centre line
    for (const z of [-HD, HD]) addBox(G, 2 * HW + 0.3, 0.018, 0.1, white, 0, 0.009, z);
    for (const x of [-HW, HW]) addBox(G, 0.1, 0.018, 2 * HD, white, x, 0.009, 0);
    const wallMat = lam(0xe8dcc0), padRed = lam(0xc83a30), padBlue = lam(0x2f6ad0);
    for (const [x, z, w, d] of [[-9, 0, 0.4, 28], [9, 0, 0.4, 28], [0, -14, 18.4, 0.4], [0, 14, 18.4, 0.4]]) { addBox(G, w, 6, d, wallMat, x, 3, z); addBox(G, w + 0.02, 1.4, d + 0.02, (x < 0 || z < 0) ? padBlue : padRed, x, 0.7, z); }
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(18, 28), lam(0x5a5f78)); ceil.rotation.x = Math.PI / 2; ceil.position.y = 6; G.add(ceil);
    for (const z of [-9, -3, 3, 9]) { addBox(G, 17, 0.25, 0.4, lam(0x40445c), 0, 5.85, z); addBox(G, 3, 0.06, 0.8, new THREE.MeshBasicMaterial({ color: 0xfff4d0 }), -4, 5.7, z); addBox(G, 3, 0.06, 0.8, new THREE.MeshBasicMaterial({ color: 0xfff4d0 }), 4, 5.7, z); }
    for (const [x, z, c] of [[-4, -6, 0xfff0d8], [4, 6, 0xfff0d8], [0, 0, 0xfff0d8]]) { const l = new THREE.PointLight(c, 0.8, 24, 1.3); l.position.set(x, 5, z); G.add(l); }
    // backboards, benches for the players who are out, a banner
    for (const z of [-13.7, 13.7]) for (const sx of [-1, 1]) { addBox(G, 1.8, 1.1, 0.08, lam(0xf4f2ec), sx * 5.5, 3.4, z); addBox(G, 0.5, 0.05, 0.4, lam(0xff7a3a), sx * 5.5, 2.9, z - Math.sign(z) * 0.2); }
    for (const sx of [-1, 1]) addBox(G, 0.5, 0.45, 5, lam(0x8a5a32), sx * 8.3, 0.22, sx * 5.5);
    makePlate(G, 'GYM CLASS DODGEBALL', 7, 0.9, new V3(0, 4.1, -13.75), 0, { bg: '#2f6ad0', fg: '#ffffff', size: 0.62 });
    makePlate(G, 'GYM CLASS DODGEBALL', 7, 0.9, new V3(0, 4.1, 13.75), Math.PI, { bg: '#c83a30', fg: '#ffffff', size: 0.62 });
    // scoreboards at both ends, readable from each side
    const scoreC = canvasTexture(512, 256);
    for (const [z, ry] of [[-13.7, 0], [13.7, Math.PI]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.8), new THREE.MeshBasicMaterial({ map: scoreC.tex }));
      m.position.set(0, 2.7, z - Math.sign(z) * 0.01); m.rotation.y = ry; G.add(m);
    }

    // ---------------------------------------------------------------- the balls
    const ballTex = canvasTexture(128, 64, (g) => { g.fillStyle = '#e8453a'; g.fillRect(0, 0, 128, 64); g.fillStyle = '#f4f2ec'; g.fillRect(0, 26, 128, 12); g.fillStyle = 'rgba(0,0,0,0.12)'; for (let i = 0; i < 40; i++) g.fillRect((i * 37) % 128, (i * 23) % 64, 2, 2); }).tex;
    const ballGeo = new THREE.SphereGeometry(BR, 16, 12);
    const balls = [];
    for (let i = 0; i < NB; i++) {
      const slot = new V3(-5 + i * 2, BR + 0.002, 0);
      const b = makeBody(L, { geo: ballGeo, tex: ballTex, r: BR, slot });
      b.gs = 1; b.dbLive = false; b.dbWho = ''; b.dbTeam = -1; b.dbCarrier = null; b.dbHolder = null; b.idx = i;
      balls.push(b);
    }
    L.dbBalls = balls;

    // ---------------------------------------------------------------- state
    const me = { team: -1, out: false, round: -1, heSeq: 0, evSeq: 0, evType: 0, evA: '', st: -1, lastHitBy: '', lastScore: [0, 0] };
    L.me = me;
    const RS = { round: 0, st: 'idle', left: 0, score: [0, 0], matchWin: -1, recvT: 0 };
    L.rs = RS;
    const H = { t0: 0, evSeq: 0, events: [] };
    const humans = () => {
      const out = [{ peer: state.myPeer, team: me.team, out: me.out, me: true }];
      for (const rec of remotes.values()) {
        if (rec.lv !== L.idx || !rec.inGame) continue;
        const st = rec.lvState[L.id];
        if (st && (st.team === 0 || st.team === 1)) out.push({ peer: rec.peer, team: st.team, out: !!st.out, rec });
      }
      return out;
    };
    const hostId = () => humans().map((h) => h.peer).sort()[0];
    const isHost = () => hostId() === state.myPeer;
    const teamOf = (peer) => { if (peer === state.myPeer) return me.team; if (typeof peer === 'string' && peer.startsWith('bot:')) { const b = bots[Number(peer.slice(4))]; return b ? b.team : -1; } const rec = remotes.get(peer), st = rec && rec.lvState[L.id]; return st && (st.team === 0 || st.team === 1) ? st.team : -1; };

    // ---------------------------------------------------------------- the bots (run by the host, drawn by everyone)
    const bots = [];
    for (let k = 0; k < 2 * TEAM_SIZE; k++) {
      const team = k < TEAM_SIZE ? 0 : 1, j = k % TEAM_SIZE;
      const g = buildAvatar(team === 0 ? '#ff8a7a' : '#7ab0ff', [1, 2, 0, 1, 2][j], [1, 2, 3, 1, 0][j], true, 1, team === 0 ? 6 : 4);
      const names = ['Dodger Dan', 'Wally Wham', 'Pitch Perfect', 'Duck Duck', 'Zing Zelda', 'Ace Ava', 'Bounce Betty', 'Slingshot Sid', 'Spin Cycle', 'Lob Larry'];
      const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = '#fff'; c.font = `700 28px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(names[k], 128, 33, 230); }).tex, transparent: true, depthWrite: false }));
      tag.scale.set(0.9, 0.225, 1); tag.position.y = 0.42; g.add(tag); g.visible = false; G.add(g);
      bots.push({ k, team, j, g, active: false, out: false, x: 0, z: 0, ball: null, thrAt: 0, cool: 0, dodgeUntil: 0, dodgeDir: 0, skill: 0.5 + Math.random() * 0.4, vx: 0, name: names[k] });
    }
    L.dbBots = bots;
    const botStart = (bt) => ({ x: -4.8 + bt.j * 2.4, z: bt.team === 0 ? 8.8 : -8.8 });
    const botOutSpot = (bt) => ({ x: bt.team === 0 ? 7.5 : -7.5, z: (bt.team === 0 ? 1 : -1) * (2 + bt.j * 1.7) });
    const aliveCount = (team) => humans().filter((h) => h.team === team && !h.out).length + bots.filter((b) => b.active && b.team === team && !b.out).length;
    function resetBalls() {
      for (const b of balls) {
        if (b.held && b.held.peer === state.myPeer) loseFromMyHand(b);
        if (!b.held || b.held.peer === state.myPeer) reclaimToSlot(b);
        b.dbLive = false; b.dbCarrier = null;
      }
      for (const bt of bots) bt.ball = null;
    }
    function emit(type, a) {
      H.evSeq += 1; H.events.push([H.evSeq, type, a]); while (H.events.length > 6) H.events.shift();
      applyEvent(H.evSeq, type, a, true);
      forcePresence();
    }
    function reviveFor(team) {
      const hs = humans().filter((h) => h.team === team && h.out);
      if (hs.length) { emit(3, hs[0].peer); return; }
      const bt = bots.find((b) => b.active && b.team === team && b.out);
      if (bt) { bt.out = false; Object.assign(bt, botStart(bt)); }
    }
    function sendOut(whoId) {
      if (typeof whoId === 'string' && whoId.startsWith('bot:')) { const bt = bots[Number(whoId.slice(4))]; if (bt) bt.out = true; }
      else if (whoId) emit(5, whoId);
    }
    function applyEvent(seq, type, a, mine) {
      if (!mine && seq <= me.heSeq) return;
      if (!mine) me.heSeq = seq;
      if (a !== state.myPeer) return;
      if (type === 3 && me.out) { me.out = false; toSpot(); showToast('A teammate caught one: you\u2019re back in!'); sfx('chime', 0.8); }
      if (type === 5 && !me.out) { goOut('Your throw was caught'); }
    }
    function startMatchLocal() { RS.score = [0, 0]; RS.matchWin = -1; }
    function beginCount(now) {
      RS.round += 1; RS.st = 'count'; H.t0 = now; RS.left = COUNT_MS;
      const nh = [0, 0]; for (const h of humans()) nh[h.team] += 1;
      for (const bt of bots) { bt.active = bt.j < Math.max(0, L.picker.n - nh[bt.team]); bt.out = false; bt.ball = null; Object.assign(bt, botStart(bt)); bt.thrAt = 0; bt.cool = 0; }
      resetBalls();
      forcePresence();
    }
    function endRound(winner, now) {
      RS.st = 'over'; H.t0 = now; if (winner >= 0) { RS.score[winner] += 1; if (RS.score[winner] >= WIN_ROUNDS) RS.matchWin = winner; }
      RS.lastWinner = winner;
      forcePresence();
    }
    function nearestEnemy(from, team) {
      let best = null, bd = 1e9;
      for (const h of humans()) { if (h.team === team || h.out) continue; const p = h.me ? myHead.pos : h.rec.cur && h.rec.cur.h ? h.rec.cur.h.pos : null; if (!p) continue; const d = Math.hypot(p.x - from.x, p.z - from.z); if (d < bd) { bd = d; best = { x: p.x, z: p.z }; } }
      for (const b of bots) { if (!b.active || b.out || b.team === team) continue; const d = Math.hypot(b.x - from.x, b.z - from.z); if (d < bd) { bd = d; best = { x: b.x, z: b.z }; } }
      return best;
    }
    function throwBall(bt, tgt, now) {
      const b = bt.ball; if (!b) return;
      const fx = bt.team === 0 ? 0 : 0, fz = bt.team === 0 ? -1 : 1;
      const from = new V3(bt.x + 0.25, 1.3, bt.z + fz * 0.35), to = new V3(tgt.x, 1.15, tgt.z);
      const dx = to.x - from.x, dz = to.z - from.z, dist = Math.max(1, Math.hypot(dx, dz)), speed = 12 + Math.random() * 3.5, tt = dist / speed;
      const err = (Math.random() - 0.5) * 0.3 * (1.3 - bt.skill), c = Math.cos(err), s = Math.sin(err), hx = dx / dist, hz = dz / dist;
      b.pos.copy(from); b.vel.set((hx * c - hz * s) * speed, (to.y - from.y + 0.5 * GRAVITY * tt * tt) / tt, (hx * s + hz * c) * speed);
      b.v += 1; b.owner = state.myPeer; b.held = null; b.sleeping = false; b.restT = 0; b.data = {}; b.throwFrom.copy(from);
      b.dbLive = true; b.dbWho = 'bot:' + bt.k; b.dbTeam = bt.team; b.dbCarrier = null; b.dbHolder = null;
      bt.ball = null; bt.cool = now + 900 + Math.random() * 900;
      sfx('whoosh', 0.5 / (1 + from.distanceTo(myHead.pos) * 0.12));
      void fx;
    }
    function botStep(dt, now) {
      for (const bt of bots) {
        if (!bt.active) continue;
        if (bt.out) { const o = botOutSpot(bt); bt.x += (o.x - bt.x) * Math.min(1, dt * 6); bt.z += (o.z - bt.z) * Math.min(1, dt * 6); continue; }
        const own = bt.team === 0 ? [0.5, 9.7] : [-9.7, -0.5];
        let goalX = bt.x, goalZ = bt.z;
        // dodge a ball that's coming
        if (now > bt.dodgeUntil && !bt.noDodge) {
          for (const b of balls) {
            if (!b.dbLive || b.dbTeam === bt.team || b.held) continue;
            const rx = bt.x - b.pos.x, rz = bt.z - b.pos.z, d = Math.hypot(rx, rz);
            if (d < 7 && (rx * b.vel.x + rz * b.vel.z) > 0.6 * d * Math.hypot(b.vel.x, b.vel.z) && Math.random() < 0.55 * dt * 10) { bt.dodgeUntil = now + 450; bt.dodgeDir = Math.random() < 0.5 ? -1 : 1; break; }
          }
        }
        if (now < bt.dodgeUntil) goalX = bt.x + bt.dodgeDir * 3;
        else if (!bt.ball) {
          // fetch the nearest free ball on our side
          let best = null, bd = 1e9;
          for (const b of balls) { if (b.held || b.dbCarrier != null || b.dbLive) continue; if (bt.team === 0 ? b.pos.z < -0.8 : b.pos.z > 0.8) continue; const d = Math.hypot(b.pos.x - bt.x, b.pos.z - bt.z); if (d < bd) { bd = d; best = b; } }
          if (best) {
            goalX = best.pos.x; goalZ = clamp(best.pos.z, own[0], own[1]);
            if (bd < 0.9 && now > bt.cool) { bt.ball = best; best.dbCarrier = bt.k; best.owner = state.myPeer; best.v += 1; bt.thrAt = now + 700 + Math.random() * 1300; }
          } else { goalZ = bt.team === 0 ? 7 : -7; goalX = bt.x + Math.sin(now * 0.001 + bt.k) * 2; }
        } else if (RS.st === 'play' && now > bt.thrAt) {
          const tgt = nearestEnemy(bt, bt.team); if (tgt) throwBall(bt, tgt, now); else bt.thrAt = now + 500;
        } else { goalX = bt.x + Math.sin(now * 0.002 + bt.k) * 2; goalZ = bt.team === 0 ? 4.5 : -4.5; }
        // move
        const dx = goalX - bt.x, dz = goalZ - bt.z, d = Math.hypot(dx, dz), sp = (now < bt.dodgeUntil ? 5 : 3.2) * dt;
        if (RS.st === 'play' && d > 0.05) { bt.x += (dx / d) * Math.min(d, sp); bt.z += (dz / d) * Math.min(d, sp); }
        bt.x = clamp(bt.x, -5.7, 5.7); bt.z = clamp(bt.z, own[0], own[1]);
        if (bt.ball) { bt.ball.pos.set(bt.x + 0.25, 1.1, bt.z + (bt.team === 0 ? -0.35 : 0.35)); bt.ball.vel.set(0, 0, 0); bt.ball.sleeping = false; }
      }
      // balls that hit the bots
      for (const b of balls) {
        if (!b.dbLive || b.held || b.dbCarrier != null) continue;
        const sp = b.vel.length(); if (sp < 3) continue;
        for (const bt of bots) {
          if (!bt.active || bt.out || bt.team === b.dbTeam) continue;
          if (Math.hypot(b.pos.x - bt.x, b.pos.z - bt.z) < b.r + 0.3 && b.pos.y > 0.1 && b.pos.y < 1.85) {
            b.v += 1; b.owner = state.myPeer; b.vel.multiplyScalar(-0.25); b.vel.y = 2; b.dbLive = false;
            if (!bt.ball && Math.random() < (bt.catchP === undefined ? 0.08 : bt.catchP)) { sfx('clang', 0.7); showToast(`${bt.name} caught it!`); sendOut(b.dbWho); reviveFor(bt.team); }
            else { bt.out = true; sfx('hurt', 0.4 / (1 + b.pos.distanceTo(myHead.pos) * 0.2)); if (bt.ball) { bt.ball.dbCarrier = null; bt.ball = null; } }
            break;
          }
        }
      }
    }
    function hostStep(dt, now) {
      if (RS.st === 'idle') { if (humans().length) beginCount(now); return; }
      if (RS.st === 'count') {
        RS.left = COUNT_MS - (now - H.t0);
        if (RS.left <= 0) { RS.st = 'play'; H.t0 = now; RS.left = ROUND_MS; resetBalls(); forcePresence(); }
      } else if (RS.st === 'play') {
        RS.left = ROUND_MS - (now - H.t0);
        botStep(dt, now);
        const a0 = aliveCount(0), a1 = aliveCount(1);
        if (a0 === 0 || a1 === 0) endRound(a0 === 0 && a1 === 0 ? -1 : a0 === 0 ? 1 : 0, now);
        else if (RS.left <= 0) endRound(a0 === a1 ? -1 : a0 > a1 ? 0 : 1, now);
      } else if (RS.st === 'over') {
        if (now - H.t0 > OVER_MS) { if (RS.matchWin >= 0) startMatchLocal(); beginCount(now); }
      }
    }

    // ---------------------------------------------------------------- you
    function toSpot() {
      const x = me.out ? (me.team === 0 ? 7.5 : -7.5) : (Math.random() - 0.5) * 8;
      const z = me.out ? (me.team === 0 ? 1 : -1) * (3 + Math.random() * 5) : (me.team === 0 ? 8.8 : -8.8);
      if (state.mode === 'vr') { dolly.rotation.y = me.team === 0 ? 0 : Math.PI; dolly.updateMatrixWorld(true); } else { state.yaw = me.team === 0 ? 0 : Math.PI; state.pitch = -0.05; }
      camera.getWorldPosition(_hd);
      dolly.position.x += x - _hd.x; dolly.position.z += z - _hd.z; dolly.position.y = 0;
    }
    function goOut(why) {
      me.out = true; toSpot(); state.hudDirty = true;
      showToast(`${why}: you\u2019re out! Cheer on your team`);
      sfx('hurt', 0.8); haptic(vrHands.left, 0.7, 100); haptic(vrHands.right, 0.7, 100);
      forcePresence();
    }
    function switchTeam(balance) {
      if (me.team < 0) return;
      me.team = 1 - me.team; me.out = false; toSpot();
      sfx('zap', 1); showToast(balance ? `Teams balanced: you\u2019re on ${TEAM_NAMES[me.team]}` : `You\u2019re on ${TEAM_NAMES[me.team]} now`);
      state.dirtyBoard = true; forcePresence();
    }
    L.switchTeam = switchTeam;
    function newRoundLocal() {
      for (const b of balls) if (b.held && b.held.peer === state.myPeer) { loseFromMyHand(b); release(b, _t.set(0, 0, 0)); }
      me.out = false; toSpot();
    }
    function onCatch(b) {
      b.dbLive = false;
      sfx('clang', 1); showToast('Catch! They\u2019re out and a teammate returns');
      haptic(vrHands.left, 0.6, 60); haptic(vrHands.right, 0.6, 60);
      me.evSeq += 1; me.evType = 2; me.evA = b.dbWho || '';
      if (isHost()) onCatchEvent(b.dbWho, me.team);
      forcePresence();
    }
    function onCatchEvent(thrower, catcherTeam) { sendOut(thrower); reviveFor(catcherTeam); }
    function checkMyHit() {
      if (RS.st !== 'play' || me.out || me.team < 0) return;
      for (const b of balls) {
        if (!b.dbLive || b.dbTeam === me.team || b.held || b.dbCarrier != null) continue;
        if (b.vel.length() < 3) continue;
        const hy = myHead.pos.y;
        if (Math.hypot(b.pos.x - myHead.pos.x, b.pos.z - myHead.pos.z) < b.r + 0.3 && b.pos.y > Math.max(0.1, hy - 1.5) && b.pos.y < hy + 0.15) {
          b.v += 1; b.owner = state.myPeer; b.sleeping = false; b.vel.multiplyScalar(-0.25); b.vel.y = 2; b.dbLive = false;
          me.evSeq += 1; me.evType = 1; me.evA = b.dbWho || '';
          goOut(b.dbWho && b.dbWho.startsWith('bot:') ? (bots[Number(b.dbWho.slice(4))] || { name: 'A bot' }).name + ' got you' : 'You were hit');
          return;
        }
      }
    }
    // a ball's story, on every page: who threw it, whether it's still live
    function trackBall(b) {
      const holder = b.held ? b.held.peer : null;
      if (b.dbHolder && !holder) {
        if (b.vel.length() > 2.5 && b.dbCarrier == null) { b.dbLive = true; b.dbWho = b.dbHolder; b.dbTeam = teamOf(b.dbHolder); }
      }
      if (holder && !b.dbHolder) {
        if (holder === state.myPeer && RS.st === 'play' && !me.out && b.dbLive && b.dbTeam !== me.team && b.dbTeam >= 0) onCatch(b);
        b.dbLive = false;
      }
      b.dbHolder = holder;
      if (b.dbLive && b.vel.length() < 2.2) b.dbLive = false;
    }
    const baseOBF = L.onBodyFrame;
    L.onBodyFrame = (b, dt, now) => { baseOBF(b, dt, now); if (balls.includes(b)) trackBall(b); };
    L.collide = (b) => {
      let sup = groundBounce(b, 0.82, 0.94, 'ball');
      const X = 8.6, Z = 13.6;
      if (b.pos.x < -X + b.r) { b.pos.x = -X + b.r; if (b.vel.x < 0) { impact(b, -b.vel.x, 'ball'); b.vel.x *= -0.6; } }
      if (b.pos.x > X - b.r) { b.pos.x = X - b.r; if (b.vel.x > 0) { impact(b, b.vel.x, 'ball'); b.vel.x *= -0.6; } }
      if (b.pos.z < -Z + b.r) { b.pos.z = -Z + b.r; if (b.vel.z < 0) { impact(b, -b.vel.z, 'ball'); b.vel.z *= -0.6; } }
      if (b.pos.z > Z - b.r) { b.pos.z = Z - b.r; if (b.vel.z > 0) { impact(b, b.vel.z, 'ball'); b.vel.z *= -0.6; } }
      if (b.pos.y > 5.8 - b.r) { b.pos.y = 5.8 - b.r; if (b.vel.y > 0) b.vel.y *= -0.5; }
      if (sup && b.pos.y <= b.r + 0.012) b.dbLive = false;      // it touched the floor: it's dead
      return sup;
    };
    // you have to be close to a ball to pick it up (pointing at one across the gym doesn't fetch it)
    L.grabRange = 1.5;
    L.canGrab = (b) => {
      if (!balls.includes(b)) return false;
      if (me.out || me.team < 0 || RS.st !== 'play' || b.dbCarrier != null) return false;
      return me.team === 0 ? b.pos.z > -1.6 : b.pos.z < 1.6;
    };
    L.autoGrab = () => {
      if (me.out || RS.st !== 'play' || me.team < 0) return null;
      let best = null, bd = 1.4;
      for (const b of balls) { if (b.held || b.dbCarrier != null) continue; const d = Math.hypot(b.pos.x - myHead.pos.x, b.pos.z - myHead.pos.z) + Math.abs(b.pos.y - 1.0) * 0.4; if (d < bd && L.canGrab(b)) { bd = d; best = b; } }
      return best;
    };
    // where you're allowed to stand
    L.clampPlayer = (p) => {
      const t = me.team < 0 ? 0 : me.team;
      let x0 = -5.8, x1 = 5.8, z0, z1;
      if (me.out) { x0 = t === 0 ? 6.6 : -8.4; x1 = t === 0 ? 8.4 : -6.6; z0 = t === 0 ? 1 : -9.5; z1 = t === 0 ? 9.5 : -1; }
      else if (RS.st === 'count') { z0 = t === 0 ? 7.2 : -9.8; z1 = t === 0 ? 9.8 : -7.2; }
      else { z0 = t === 0 ? 0.4 : -9.8; z1 = t === 0 ? 9.8 : -0.4; }
      return [clamp(p.x, x0, x1) - p.x, clamp(p.z, z0, z1) - p.z];
    };
    makeButton(L, new V3(7.9, 1.0, 5.5), 0xb388ff, 'Switch team', () => switchTeam(), { faceYaw: -Math.PI / 2 });
    makeKiosk(L, 8.4, 8.2, -Math.PI / 2);
    makePlayerPicker(L, { min: 1, max: TEAM_SIZE, def: 4, label: 'Per team', note: 'from the next round' });

    // ---------------------------------------------------------------- scoreboard, HUD, roster
    let boardKey = '';
    function drawBoard() {
      const left = Math.max(0, Math.ceil(RS.left / 1000));
      const a0 = aliveCount(0), a1 = aliveCount(1);
      const key = `${RS.score}|${RS.st}|${RS.round}|${a0}|${a1}|${left}|${RS.matchWin}`;
      if (key === boardKey) return; boardKey = key;
      const g = scoreC.g;
      g.fillStyle = '#16142e'; g.fillRect(0, 0, 512, 256); g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.font = `800 30px ${DISPLAY}`; g.fillText(RS.matchWin >= 0 ? `${TEAM_NAMES[RS.matchWin].toUpperCase()} WINS THE MATCH!` : `ROUND ${Math.max(1, RS.round)}  \u00b7  first to ${WIN_ROUNDS}`, 256, 30, 480);
      g.font = `800 90px ${DISPLAY}`; g.fillStyle = DB_STR[0]; g.fillText(String(RS.score[0]), 120, 125); g.fillStyle = '#fff'; g.fillText('-', 256, 120); g.fillStyle = DB_STR[1]; g.fillText(String(RS.score[1]), 392, 125);
      g.font = `700 26px ${BODY}`; g.fillStyle = DB_STR[0]; g.fillText(`Red: ${a0} left`, 120, 195); g.fillStyle = DB_STR[1]; g.fillText(`Blue: ${a1} left`, 392, 195);
      g.fillStyle = '#a9a3cf'; g.fillText(RS.st === 'count' ? `Get ready\u2026 ${left}` : RS.st === 'play' ? `${left} s` : RS.st === 'over' ? 'Round over' : 'Waiting\u2026', 256, 232);
      scoreC.tex.needsUpdate = true;
    }
    const hudPlate = makePlate(camera, 'Dodgeball', 0.55, 0.1, new V3(0, -0.2, -0.6), 0, { bg: '#16142e', fg: '#ffffff', size: 0.55 });
    hudPlate.material.depthTest = false; hudPlate.renderOrder = 999; hudPlate.visible = false;
    let hudKey = '';
    const hudText = () => `${me.team >= 0 ? TEAM_NAMES[me.team] : ''}  \u00b7  ${RS.score[0]}-${RS.score[1]}  \u00b7  ${aliveCount(0)} v ${aliveCount(1)}${me.out ? '  \u00b7  OUT' : ''}`;
    L.rowFor = (st, isMe) => { const team = isMe ? me.team : st.team, out = isMe ? me.out : !!st.out; return { team, out, text: out ? 'out' : 'in', color: DB_STR[team] || '#888' }; };
    L.sortRows = (a, b) => (a.team - b.team) || ((a.out ? 1 : 0) - (b.out ? 1 : 0));
    L.hudActions = [{ label: () => 'Switch team', run: () => switchTeam() }];
    L.hints = [['Grip', 'pick up a ball'], ['Throw', 'let go while swinging'], ['Catch', 'grip an incoming ball'], ['Stay on your half', '']];
    L.hintsFor = () => (state.mode === 'flat' ? [['E', 'pick up a ball / catch'], ['Hold Space', 'charge, let go to throw'], ['WASD', 'move'], ['Drag', 'aim']] : L.hints);

    // ---------------------------------------------------------------- per frame
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      for (const bt of bots) {
        bt.g.visible = here && bt.active;
        if (!bt.g.visible) continue;
        if (!isHost()) { /* positions come from the host */ }
        const faceZ = bt.out ? 0 : (bt.team === 0 ? -1 : 1);
        bt.g.position.set(bt.x, 1.5 + (bt.out ? -0.3 : Math.abs(Math.sin(now * 0.008 + bt.k)) * 0.04), bt.z);
        bt.g.rotation.y = bt.team === 0 ? 0 : Math.PI; void faceZ;
      }
      if (!here) { hudPlate.visible = false; return; }
      autoBalance(L, me, now, switchTeam);
      if (me.team < 0) me.team = pickTeam(L);
      if (isHost()) hostStep(dt, now);
      else if (RS.st !== 'idle' && RS.st === 'play') RS.left = Math.max(0, RS.left - dt * 1000);
      if (RS.round !== me.round) { me.round = RS.round; if (RS.round > 0) { newRoundLocal(); showToast(RS.round > 0 ? `Round ${RS.round}: get ready!` : ''); } }
      if (RS.st !== ST_N[me.st]) {
        const was = ST_N[me.st]; me.st = ST[RS.st];
        if (RS.st === 'play') { sfx('whistle', 1); showToast('GO! Grab a ball'); }
        if (RS.st === 'over' && was === 'play') { const w = RS.score[0] > me.lastScore[0] ? 0 : RS.score[1] > me.lastScore[1] ? 1 : -1; me.lastScore = RS.score.slice(); showToast(RS.matchWin >= 0 ? `${TEAM_NAMES[RS.matchWin]} wins the match!` : w >= 0 ? `${TEAM_NAMES[w]} wins the round!` : 'Round drawn'); sfx(w === me.team ? 'fanfare' : 'buzzer', 0.9); }
      }
      if (RS.score[0] < me.lastScore[0] || RS.score[1] < me.lastScore[1]) me.lastScore = RS.score.slice();
      checkMyHit();
      drawBoard();
      const txt = hudText();
      if (state.mode === 'vr') { hudPlate.visible = true; if (txt !== hudKey) { hudKey = txt; hudPlate.userData.draw(txt); } }
      else { hudPlate.visible = false; if (ui.status) { ui.status.hidden = false; if (txt !== hudKey) { hudKey = txt; ui.status.textContent = txt; } } }
    };
    L.onEnter = () => { me.team = pickTeam(L); me.out = false; me.round = -1; me.st = -1; L.enteredAt = performance.now(); boardKey = ''; hudKey = ''; toSpot(); };
    L.onExit = () => { hudPlate.visible = false; if (ui.status) ui.status.hidden = true; for (const bt of bots) bt.g.visible = false; };
    L.spawn = () => { if (me.team < 0) me.team = pickTeam(L); toSpot(); };
    L.attract = (now) => { camera.position.set(Math.sin(now * 0.0002) * 3, 2.5, 12); camera.lookAt(0, 1.5, -2); };

    // ---------------------------------------------------------------- network
    L.presence = () => {
      const p = { dq: [me.team, me.out ? 1 : 0, me.evSeq, me.evType, me.evA] };
      if (isHost()) {
        p.dh = [RS.round, ST[RS.st], Math.round(RS.left), RS.score[0], RS.score[1], RS.matchWin];
        p.db = bots.map((b) => [b.active ? 1 : 0, Math.round(b.x * 10), Math.round(b.z * 10), b.out ? 1 : 0, b.ball ? b.ball.idx : -1]);
        p.he = H.events.slice();
      }
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      const a = pres.dq;
      if (Array.isArray(a) && a.length === 5 && (a[0] === 0 || a[0] === 1 || a[0] === -1) && typeof a[2] === 'number' && typeof a[4] === 'string') {
        st.team = a[0]; st.out = a[1] === 1;
        if (isHost() && a[3] === 2 && a[2] > (st.evSeen || 0) && st.evInit) { st.evSeen = a[2]; onCatchEvent(a[4], a[0]); }
        else if (a[2] > (st.evSeen || 0)) st.evSeen = a[2];
        st.evInit = true;
      }
      if (rec.peer === hostId() && !isHost()) {
        const h = pres.dh, bb = pres.db, he = pres.he;
        if (Array.isArray(h) && h.length === 6 && h.every((x) => typeof x === 'number' && isFinite(x))) {
          RS.round = h[0]; RS.st = ST_N[clamp(h[1] | 0, 0, 3)]; RS.left = h[2]; RS.recvT = performance.now(); RS.score = [h[3] | 0, h[4] | 0]; RS.matchWin = h[5] | 0;
        }
        if (Array.isArray(bb) && bb.length === bots.length) bb.forEach((x, k) => { if (Array.isArray(x) && x.length === 5 && x.every((n) => typeof n === 'number' && isFinite(n))) { const bt = bots[k]; bt.active = x[0] === 1; bt.x = x[1] / 10; bt.z = x[2] / 10; bt.out = x[3] === 1; const bi = x[4] | 0; if (bi >= 0 && bi < balls.length) balls[bi].dbCarrier = k; } });
        if (Array.isArray(he)) for (const e of he) if (Array.isArray(e) && e.length === 3 && typeof e[0] === 'number' && typeof e[1] === 'number') applyEvent(e[0], e[1], e[2], false);
      }
    };
    L.dbInternals = { RS, H, bots, balls, me, humans, isHost, hostStep, botStep, beginCount, endRound, aliveCount, checkMyHit, trackBall, reviveFor, sendOut, throwBall, toSpot, goOut, switchTeam, onCatch, teamOf, nearestEnemy };
    return L;
  })();

