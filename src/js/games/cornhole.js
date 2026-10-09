  // ================================================================ LEVEL: LAKESIDE CORNHOLE
  // Two regulation boards 27 ft apart on a lawn by a lake. Red and blue take turns throwing four bags each at the far
  // board: on the board is 1, through the hole is 3, and only the difference counts each round. First to 21 wins.
  // Play a friend, or Corny Carl when you're alone. Each round you throw from the other end.
  // The lowest-named player's page runs the turns and the bot. A thrower's page says when its bag has landed; the
  // host then tallies from where the bags are (their positions are shared like every ball in the game).
  const cornhole = (() => {
    const L = newLevel(20);
    const G = L.group;
    const rand = mulberry32(2020);
    L.gravityScale = 1; L.airDrag = 0; L.rollFriction = 7; L.bodyBounce = 0.1;
    L.walkSpeed = 2.6;
    L.bounds = { minX: -9, maxX: 9, minZ: -11, maxZ: 11 };
    L.env = {
      sky: skyTexture([[0, '#4a7ac8'], [0.42, '#f0b888'], [0.5, '#ffe0b0'], [0.52, '#8aa860'], [1, '#4a6a34']]),
      bg: 0xf0c8a0, fog: [0xf2d0b0, 40, 160], hemi: [0xfff0d8, 0x5a7a3a, 0.85],
      sun: [0xffd8a0, 0.85], sunDir: new V3(0.5, 0.45, -0.6), ambient: [0x8a7a6a, 0.3],
      sprite: { tex: paleSunTex, pos: new V3(110, 50, -150), scale: 50 },
    };
    const WIN = 21, BAGS = 4, BR = 0.07;
    const FRONT = 4.115, LEN = 1.22, HALF_W = 0.305, H_FRONT = 0.08, H_BACK = 0.3, HOLE_V = 0.99, HOLE_R = 0.076;
    const TH = Math.atan2(H_BACK - H_FRONT, LEN), CT = Math.cos(TH), ST = Math.sin(TH);
    const PH = { idle: 0, play: 1, tally: 2, over: 3 }, PH_N = ['idle', 'play', 'tally', 'over'];
    const SIDE_HEX = ['#e8453a', '#3d82e8'], SIDE_NAME = ['Red', 'Blue'];
    const _a = new V3(), _b = new V3(), _q = new Q4(), _m = new THREE.Matrix4();

    // ---------------------------------------------------------------- the lawn, the lake, the trees
    const grass = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#6a9a3e'; g.fillRect(0, 0, 256, 256);
      for (let k = 0; k < 8; k++) { g.fillStyle = k % 2 ? 'rgba(255,255,200,0.05)' : 'rgba(0,40,0,0.05)'; g.fillRect(0, k * 32, 256, 32); }
      for (let i = 0; i < 3000; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,255,190,0.07)' : 'rgba(20,50,10,0.1)'; g.fillRect(rand() * 256, rand() * 256, 2, 3); }
    }).tex;
    grass.wrapS = grass.wrapT = THREE.RepeatWrapping; grass.repeat.set(30, 30);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshLambertMaterial({ map: grass }));
    ground.rotation.x = -Math.PI / 2; G.add(ground);
    const lake = new THREE.Mesh(new THREE.PlaneGeometry(120, 70), new THREE.MeshLambertMaterial({ color: 0x5a9ac0 }));
    lake.rotation.x = -Math.PI / 2; lake.position.set(-85, 0.02, 0); G.add(lake);      // off past the trees
    {
      const trunk = lam(0x6a4a30), leaves = [lam(0x4a7a34), lam(0x5a8a3a), lam(0x3a6a2e)];
      for (let k = 0; k < 30; k++) {
        const a = rand() * Math.PI * 2, d = 16 + rand() * 30, x = Math.cos(a) * d, z = Math.sin(a) * d;
        if (x < -24 && Math.abs(z) < 36) continue;     // (that's the lake)
        const h = 2 + rand() * 2;
        addCyl(G, 0.22, 0.3, h, 6, trunk, x, h / 2, z);
        const c = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5 + rand(), 1), leaves[k % 3]); c.position.set(x, h + 1.1, z); G.add(c);
      }
      // a picnic table, a cooler, string lights between two posts
      const wood = lam(0xa8774a);
      addBox(G, 1.8, 0.06, 0.8, wood, 5.5, 0.75, 0); for (const z of [-0.6, 0.6]) addBox(G, 1.8, 0.05, 0.28, wood, 5.5, 0.45, z);
      addBox(G, 0.6, 0.4, 0.38, lam(0x3a8ac8), 5.4, 0.2, 1.6); addBox(G, 0.62, 0.06, 0.4, lam(0xf2f0e8), 5.4, 0.42, 1.6);
      const bulb = new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffd890, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
      for (const sx of [-1, 1]) addCyl(G, 0.05, 0.07, 3.2, 6, lam(0x6a4a30), sx * 3.2, 1.6, 0);
      for (let j = 1; j < 14; j++) { const t = j / 14, s = new THREE.Sprite(bulb); s.position.set(-3.2 + 6.4 * t, 3.1 - Math.sin(t * Math.PI) * 0.5, 0); s.scale.set(0.28, 0.28, 1); G.add(s); }
    }
    makeKiosk(L, 4.5, -3.5, Math.atan2(-4.5, 3.5));
    L.board = makeBoard(G, 720, 460, 2.6, 1.66, -4.2, 2.1, 0, Math.PI / 2);

    // ---------------------------------------------------------------- the boards: d = -1 at the north end, +1 at the south
    const boardTex = canvasTexture(128, 256, (g) => {
      g.fillStyle = '#d8b07a'; g.fillRect(0, 0, 128, 256);
      for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(120,80,40,${0.05 + rand() * 0.08})`; g.fillRect(0, rand() * 256, 128, 1 + rand() * 2); }
      g.fillStyle = '#1e5aa8'; g.fillRect(0, 0, 18, 256); g.fillRect(110, 0, 18, 256);
      g.fillStyle = '#f4f2ec'; g.font = `800 26px ${DISPLAY}`; g.textAlign = 'center'; g.save(); g.translate(64, 200); g.fillText('FIELD DAY', 0, 0); g.restore();
    }).tex;
    const BOARDS = [-1, 1].map((d) => {
      // front edge centre on the ground plane, the way "up the board" points (away from the middle)
      const F = new V3(0, H_FRONT, d * FRONT), D = new V3(0, 0, d);
      const along = new V3(0, ST, d * CT);            // up the slope
      const n = new V3(0, CT, -d * ST);                 // the surface normal
      const side = new V3(1, 0, 0);
      const hole = F.clone().addScaledVector(along, HOLE_V);
      // the top: a thin box tilted to the slope, with a dark disc for the hole
      const g = new THREE.Group();
      const mid = F.clone().addScaledVector(along, LEN / 2).addScaledVector(n, -0.01);
      const top = new THREE.Mesh(new THREE.BoxGeometry(HALF_W * 2, 0.02, LEN), new THREE.MeshLambertMaterial({ map: boardTex }));
      top.position.copy(mid); top.rotation.x = d > 0 ? -TH : TH; g.add(top);
      const holeM = new THREE.Mesh(new THREE.CircleGeometry(HOLE_R, 24), new THREE.MeshBasicMaterial({ color: 0x0a0a0a }));
      holeM.position.copy(hole).addScaledVector(n, 0.002); holeM.quaternion.setFromUnitVectors(new V3(0, 0, 1), n); g.add(holeM);
      // the sides and the legs
      const sideM = lam(0xb88a54);
      for (const sx of [-1, 1]) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1, LEN), sideM);
        s.position.set(sx * (HALF_W + 0.01), (H_FRONT + H_BACK) / 2 / 2, d * (FRONT + LEN * CT / 2)); s.scale.y = (H_FRONT + H_BACK) / 2; g.add(s);
      }
      addBox(g, HALF_W * 2 + 0.04, H_BACK, 0.02, sideM, 0, H_BACK / 2, d * (FRONT + LEN * CT));
      addBox(g, HALF_W * 2 + 0.04, H_FRONT, 0.02, sideM, 0, H_FRONT / 2, d * FRONT);
      G.add(g);
      return { d, F, D, along, n, side, hole };
    });
    L.BOARDS = BOARDS;
    // where a point is relative to a board: across (u), up the slope (v), above the surface (h)
    function local(B, p, out) {
      _a.subVectors(p, B.F);
      out.u = _a.dot(B.side); out.v = _a.dot(B.along); out.h = _a.dot(B.n);
      return out;
    }
    const _l = { u: 0, v: 0, h: 0 };
    const onBoardRect = (l, pad) => Math.abs(l.u) <= HALF_W + (pad || 0) && l.v >= -(pad || 0) && l.v <= LEN + (pad || 0);

    // ---------------------------------------------------------------- the bags
    const bagTex = (hex) => canvasTexture(64, 64, (g) => {
      g.fillStyle = hex; g.fillRect(0, 0, 64, 64);
      for (let i = 0; i < 300; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)'; g.fillRect(rand() * 64, rand() * 64, 1, 1); }
      g.strokeStyle = 'rgba(255,255,255,0.5)'; g.setLineDash([3, 3]); g.lineWidth = 2; g.strokeRect(4, 4, 56, 56);
    }).tex;
    const bagGeo = new THREE.BoxGeometry(0.15, 0.035, 0.15);
    bagGeo.translate(0, 0, 0);
    const bags = [];
    for (let s = 0; s < 2; s++) for (let k = 0; k < BAGS; k++) {
      const b = makeBody(L, { geo: bagGeo, tex: bagTex(SIDE_HEX[s]), r: BR, slot: new V3(0, 0.9, 0) });
      b.gs = 1; b.ad = 0.02; b.side = s; b.k = k; b.yaw = rand() * 6;
      bags.push(b);
    }
    L.bags = bags;

    // ---------------------------------------------------------------- where everyone stands and the bags wait
    // end 0: everyone throws from the south board at the north one; end 1: the other way
    const throwZ = (end) => (end === 0 ? 1 : -1) * (FRONT + 0.55);
    const spotOf = (side, end, out) => out.set((side === 0 ? -1 : 1) * (end === 0 ? 0.95 : -0.95), 0, throwZ(end));
    const trayOf = (side, end) => ({ x: (side === 0 ? -1 : 1) * (end === 0 ? 1.55 : -1.55), z: throwZ(end) });
    const trays = [0, 1].map(() => { const t = new THREE.Group(); addBox(t, 0.36, 0.04, 0.7, lam(0x8a6a44), 0, 0.78, 0); for (const sx of [-0.14, 0.14]) for (const sz of [-0.3, 0.3]) addBox(t, 0.03, 0.78, 0.03, lam(0x5a4430), sx, 0.39, sz); G.add(t); return t; });
    function setSlots(end) {
      for (const b of bags) { const t = trayOf(b.side, end); b.slot.set(t.x, 0.8 + BR, t.z + (b.k - 1.5) * 0.16); }
      for (let s = 0; s < 2; s++) { const t = trayOf(s, end); trays[s].position.set(t.x, 0, t.z); }
    }
    setSlots(0);
    for (const b of bags) { b.pos.copy(b.slot); b.mesh.position.copy(b.slot); }

    // ---------------------------------------------------------------- physics on the boards
    L.collide = (b, h) => {
      let sup = false;
      if (b.data.inHole) {
        // inside the board under the hole: it stays there
        const B = BOARDS[b.data.inHole - 1];
        b.pos.x = clamp(b.pos.x, -HALF_W + BR, HALF_W - BR);
        if (b.pos.y < BR) { b.pos.y = BR; if (b.vel.y < 0) b.vel.y = 0; b.vel.x *= 0.5; b.vel.z *= 0.5; sup = true; }
        void B;
        return sup;
      }
      for (const B of BOARDS) {
        local(B, b.pos, _l);
        if (!onBoardRect(_l, 0.02) || _l.h >= BR || _l.h < -0.25) continue;
        // over the hole: it drops through
        if (Math.hypot(_l.u, _l.v - HOLE_V) < HOLE_R - 0.004) {
          // a bag that drops into the hole, or slides over it at anything short of a skid, goes in
          const slide = Math.hypot(b.vel.x, b.vel.z);
          if (!b.data.inHole && (_l.h < -0.02 || (_l.h < BR + 0.01 && slide < 2.6))) {
            b.data.inHole = BOARDS.indexOf(B) + 1; b.vel.multiplyScalar(0.2);
            tone(220, 120, 0.12, 'triangle', 0.25 / (1 + b.pos.distanceTo(myHead.pos) * 0.15));
          }
          continue;
        }
        // a bag that came in under the front lip just stops against it
        if (_l.h < -0.06) { b.vel.multiplyScalar(0.2); continue; }
        b.pos.addScaledVector(B.n, BR - _l.h);
        const vn = b.vel.dot(B.n);
        if (vn < 0) {
          impact(b, -vn, 'wood');
          b.vel.addScaledVector(B.n, -1.05 * vn);
          // a bean bag is floppy: a real landing soaks up most of its slide
          if (vn < -1.5) { const keep = 0.32; const t = _b.copy(b.vel).addScaledVector(B.n, -b.vel.dot(B.n)); b.vel.addScaledVector(t, keep - 1); }
        }
        // sliding: the board's grip slows it, and a slow bag sticks
        const vt = _b.copy(b.vel).addScaledVector(B.n, -b.vel.dot(B.n)), sp = vt.length();
        const nsp = Math.max(0, sp - 5.5 * h);
        if (nsp < 0.05) b.vel.addScaledVector(vt, -1); else b.vel.addScaledVector(vt, -(1 - nsp / sp));
        sup = true;
      }
      if (b.pos.y < BR) {
        b.pos.y = BR;
        if (b.vel.y < 0) { impact(b, -b.vel.y, 'grass'); b.vel.y = 0; b.vel.x *= 0.55; b.vel.z *= 0.55; }
        sup = true;
      }
      return sup;
    };
    // a bag's score once it's still: through the hole 3, on the board 1 (resting on it, or on bags that are)
    function bagPoints(b, end) {
      const target = BOARDS[end === 0 ? 0 : 1];
      if (b.data.inHole === BOARDS.indexOf(target) + 1) return 3;
      if (b.data.inHole) return 0;
      local(target, b.pos, _l);
      return onBoardRect(_l, 0) && b.pos.y > BR + 0.04 ? 1 : 0;
    }
    L.bagPoints = bagPoints;

    // ---------------------------------------------------------------- aiming (browser and bot)
    function holeOf(end) { return BOARDS[end === 0 ? 0 : 1].hole; }
    function lob(from, tx, tz, ty, angle) {
      const dx = tx - from.x, dz = tz - from.z, d = Math.max(0.5, Math.hypot(dx, dz)), hgt = ty - from.y, c = Math.cos(angle);
      const v = Math.sqrt((GRAVITY * d * d) / Math.max(0.05, 2 * c * c * (d * Math.tan(angle) - hgt)));
      return new V3((dx / d) * c * v, Math.sin(angle) * v, (dz / d) * c * v);
    }
    // power: a charge near the middle lands on the hole; less falls short, more goes long. A little wobble either way.
    function throwFor(from, end, power, yawOff) {
      const H = holeOf(end), dx = H.x - from.x, dz = H.z - from.z, dHole = Math.hypot(dx, dz);
      const e = power - 0.6, k = Math.abs(e) < 0.06 ? 0 : Math.sign(e) * (Math.abs(e) - 0.06) * 0.62;
      const dist = dHole * (1 + k) + (Math.random() - 0.5) * 0.24;
      const a = Math.atan2(dx, dz) + (yawOff || 0) + (Math.random() - 0.5) * 0.02;
      return lob(from, from.x + Math.sin(a) * dist, from.z + Math.cos(a) * dist, H.y + 0.02, 0.72);
    }
    const _cq = new Q4(), _cd = new V3();
    L.throwOverride = (obj, c) => {
      if (!bags.includes(obj)) return null;
      camera.getWorldQuaternion(_cq);
      _cd.set(0, 0, -1).applyQuaternion(_cq);
      const H = holeOf(RS.end), want = Math.atan2(H.x - obj.pos.x, H.z - obj.pos.z), look = Math.atan2(_cd.x, _cd.z);
      let off = look - want; while (off > Math.PI) off -= Math.PI * 2; while (off < -Math.PI) off += Math.PI * 2;
      // aim help: looking within about 10 degrees of the hole lines you up with it
      off = Math.abs(off) < 0.18 ? off * 0.1 : off;
      return throwFor(obj.pos, RS.end, c, off);
    };

    // ---------------------------------------------------------------- the game
    const RS = { game: 0, round: 0, ph: 'idle', end: 0, turn: 0, first: 0, score: [0, 0], pts: [0, 0], winner: -1, players: ['', ''] };
    const H = { phaseT: 0, botT: 0, done: -1, doneT: 0, botBag: null, botThrowT: 0 };
    const me = { done: 0, doneRound: 0, doneTurn: -1, wins: 0, round: -1, game: -1, thrownTurn: -1, thrownT: 0, ph: '' };
    L.ch = { RS, H, me };
    const humans = () => { const ids = state.mode !== 'menu' ? [state.myPeer] : []; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort(); };
    const hostId = () => { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); return ids.sort()[0]; };
    const isHost = () => hostId() === state.myPeer;
    const BOT = 'bot';
    const nameOf = (id) => (id === BOT ? 'Corny Carl' : id === state.myPeer ? 'You' : (remotes.get(id) || {}).name || 'Someone');
    const mySide = () => RS.players.indexOf(state.myPeer);
    const turnSide = () => (RS.first + RS.turn) % 2;
    const turnBag = () => bags[turnSide() * BAGS + Math.floor(RS.turn / 2)];
    const myTurn = () => RS.ph === 'play' && RS.turn < 8 && RS.players[turnSide()] === state.myPeer;

    function newGame(now) {
      const hs = humans();
      RS.players = [hs[0] || '', hs[1] || BOT];
      Object.assign(RS, { game: RS.game + 1, round: 0, score: [0, 0], winner: -1, first: 0 });
      newRound(now, 0);
    }
    function newRound(now, end) {
      Object.assign(RS, { round: RS.round + 1, end, turn: 0, pts: [0, 0], ph: 'play' });
      setSlots(end);
      for (const b of bags) { if (b.held && b.held.peer !== state.myPeer) continue; if (b.held) loseFromMyHand(b); b.data = {}; reclaimToSlot(b); b.data = {}; }
      H.phaseT = now; H.done = -1; H.botBag = null;
      forcePresence();
    }
    function tally(now) {
      const pts = [0, 0];
      for (const b of bags) pts[b.side] += bagPoints(b, RS.end);
      RS.pts = pts;
      const diff = pts[0] - pts[1];
      if (diff > 0) { RS.score[0] += diff; RS.first = 0; } else if (diff < 0) { RS.score[1] -= diff; RS.first = 1; }
      if (RS.score[0] >= WIN || RS.score[1] >= WIN) RS.winner = RS.score[0] >= WIN ? 0 : 1;
      RS.ph = 'tally'; H.phaseT = now;
      forcePresence();
    }
    function hostStep(now) {
      if (L.paused) return;                 // (tests)
      const hs = humans();
      // players who left: the bot (or the next person waiting) takes their place
      for (let s = 0; s < 2; s++) if (RS.players[s] && RS.players[s] !== BOT && !hs.includes(RS.players[s])) {
        const free = hs.find((id) => !RS.players.includes(id));
        RS.players[s] = free || (s === 1 || RS.players[1 - s] ? BOT : ''); forcePresence();
      }
      if (RS.ph === 'idle') { if (hs.length) newGame(now); return; }
      // someone's waiting while Corny Carl has a seat: they take it, straight away if the game's only just begun
      const waiting = hs.find((id) => !RS.players.includes(id)), botSeat = RS.players.indexOf(BOT);
      if (waiting && botSeat >= 0 && RS.ph === 'play' && RS.round === 1 && RS.turn === 0 && !turnBag().held && !turnBag().data.thrownAt) { newGame(now); return; }
      if (RS.ph === 'play') {
        if (RS.turn >= 8) { if (now - H.doneT > 1200) tally(now); return; }
        const side = turnSide(), who = RS.players[side], bag = turnBag();
        if (who === BOT) botStep(now, bag);
        // a turn nobody takes in 40 seconds is skipped
        if (now - H.phaseT > 40000) { RS.turn += 1; H.phaseT = now; H.doneT = now; forcePresence(); }
        return;
      }
      if (RS.ph === 'tally' && now - H.phaseT > 3200) {
        if (RS.winner < 0 && waiting && botSeat >= 0) { newGame(now); return; }      // (or at the end of the round, with a fresh game)
        if (RS.winner >= 0) { RS.ph = 'over'; H.phaseT = now; forcePresence(); }
        else newRound(now, 1 - RS.end);
        return;
      }
      if (RS.ph === 'over' && now - H.phaseT > 6000) { if (hs.length) newGame(now); else RS.ph = 'idle'; }
    }
    function turnDone(now) { RS.turn += 1; H.phaseT = now; H.doneT = now; H.botBag = null; forcePresence(); }
    // Corny Carl: picks up his bag, takes a breath, and throws, usually pretty well
    function botStep(now, bag) {
      if (!H.botBag) { H.botBag = bag; H.botThrowT = now + 1100 + Math.random() * 700; return; }
      if (H.botBag !== bag) { H.botBag = null; return; }
      if (!bag.data.thrownAt && now > H.botThrowT) {
        const s = spotOf(1, RS.end, _a), from = new V3(s.x + (RS.end === 0 ? 0.25 : -0.25), 0.95, s.z);
        bag.v += 1; bag.owner = state.myPeer; bag.held = null; bag.pos.copy(from); bag.sleeping = false; bag.restT = 0; bag.data = { thrownAt: now };
        const g = () => { let x = 0; for (let i = 0; i < 4; i++) x += Math.random(); return (x - 2) / 1.15; };
        bag.vel.copy(throwFor(from, RS.end, 0.6 + g() * 0.14, g() * 0.045));     // good, but beatable
        bag.throwFrom.copy(from);
        sfx('whoosh', 0.5);
        forcePresence();
        return;
      }
      if (bag.data.thrownAt && settled(bag)) turnDone(now);
    }
    // measured in the bag's own flight time, so a slow device can't call a bag landed while it's still in the air
    const settled = (b) => !b.held && b.data.flyT > 0.7 && (b.sleeping || b.vel.lengthSq() < 0.003 || b.data.flyT > 6);

    // ---------------------------------------------------------------- your throws
    L.canGrab = (b) => {
      if (!bags.includes(b)) return false;
      return myTurn() && b === turnBag() && me.thrownTurn !== `${RS.game}:${RS.round}:${RS.turn}`;
    };
    L.autoGrab = () => { if (!myTurn()) return null; const b = turnBag(); return b && !b.held && L.canGrab(b) && b.pos.distanceTo(myHead.pos) < 3 ? b : null; };
    // watch your own bag: when it leaves your hand and comes to rest, your turn's done
    function watchMyThrow(now) {
      if (!myTurn()) return;
      const b = turnBag(), key = `${RS.game}:${RS.round}:${RS.turn}`;
      // holding is per turn: a bag you were holding when a game or round was reset isn't this turn's throw
      if (me.holdKey !== key) { me.holdKey = key; me.holding = false; }
      if (me.thrownTurn !== key) {
        if (b.held && b.held.peer === state.myPeer) me.holding = true;
        else if (me.holding && !b.held) { me.holding = false; me.thrownTurn = key; b.data.thrownAt = now; }
        return;
      }
      if (settled(b) && me.doneTurn !== key) {
        me.doneTurn = key;
        if (isHost()) turnDone(now);
        else { me.done += 1; me.doneRound = RS.round; me.doneTurnIdx = RS.turn; forcePresence(); }
      }
    }

    // ---------------------------------------------------------------- standing at the line
    function toSpot() {
      const s = mySide();
      if (s < 0) return;
      const p = spotOf(s, RS.end, _a), yaw = RS.end === 0 ? 0 : Math.PI;
      if (state.mode === 'vr') { camera.getWorldQuaternion(_q); const e = new THREE.Euler().setFromQuaternion(_q, 'YXZ'); snapTurn(yaw - e.y); }
      else { state.yaw = yaw; state.pitch = -0.1; }
      camera.getWorldPosition(_b);
      dolly.position.x += p.x - _b.x; dolly.position.z += p.z - _b.z;
    }
    L.clampPlayer = (p) => {
      const B = L.bounds;
      let x = clamp(p.x, B.minX + 0.4, B.maxX - 0.4), z = clamp(p.z, B.minZ + 0.4, B.maxZ - 0.4);
      const s = mySide();
      if (s >= 0 && (RS.ph === 'play' || RS.ph === 'tally')) {
        const q = spotOf(s, RS.end, _a), dx = x - q.x, dz = z - q.z, d = Math.hypot(dx, dz);
        if (d > 0.55) { x = q.x + dx * 0.55 / d; z = q.z + dz * 0.55 / d; }
      } else if (Math.abs(x) < 1.0 && Math.abs(z) < FRONT + 1.6) x = x < 0 ? -1.0 : 1.0;   // off the lane
      return [x - p.x, z - p.z];
    };

    // ---------------------------------------------------------------- per frame
    const botBody = buildAvatar('#ffb04a', 1, 1, true, 2, 5);
    const botTag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = '#fff'; c.font = `700 28px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Corny Carl', 128, 33); }).tex, transparent: true, depthWrite: false }));
    botTag.scale.set(0.9, 0.225, 1); botTag.position.y = 0.42; botBody.add(botTag);
    botBody.visible = false; G.add(botBody);
    const floats = BOARDS.map(() => { const c = canvasTexture(256, 96); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: c.tex, transparent: true, depthWrite: false })); s.scale.set(1.2, 0.45, 1); s.visible = false; G.add(s); return { c, s }; });
    let statusKey = '', boardKey = '';
    const hudPlate = makePlate(camera, 'Your throw', 0.5, 0.1, new V3(0, -0.2, -0.6), 0, { bg: '#16142e', fg: '#ffd23f', size: 0.6 });
    hudPlate.material.depthTest = false; hudPlate.renderOrder = 999; hudPlate.visible = false;
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (!here) { hudPlate.visible = false; botBody.visible = false; return; }
      if (isHost()) {
        hostStep(now);
        // a remote thrower said their bag has landed
        for (const rec of remotes.values()) {
          const st = rec.lvState[L.id];
          if (!st || !st.cq || rec.peer !== RS.players[turnSide()] || RS.ph !== 'play') continue;
          if (st.cq[0] > (st.doneSeen || 0) && st.cq[1] === RS.round && st.cq[2] === RS.turn) { st.doneSeen = st.cq[0]; turnDone(now); }
        }
      }
      for (const b of bags) if (b.data.thrownAt && !b.held) b.data.flyT = (b.data.flyT || 0) + Math.min(dt, 0.05);
      watchMyThrow(now);
      if (RS.game !== me.game || RS.round !== me.round) { me.game = RS.game; me.round = RS.round; toSpot(); state.dirtyBoard = true; if (mySide() >= 0) showToast(RS.round === 1 ? `Cornhole! You're ${SIDE_NAME[mySide()]}. First to ${WIN}` : `Round ${RS.round}: throw from the other end`); }
      if (RS.ph !== me.ph) {
        if (RS.ph === 'tally') {
          const [a, b] = RS.pts, d = a - b;
          showToast(d === 0 ? `${a} to ${b}: they cancel out` : `${SIDE_NAME[d > 0 ? 0 : 1]} scores ${Math.abs(d)} (${a} to ${b})`);
          sfx(d === 0 ? 'click' : 'chime', 0.7);
        }
        if (RS.ph === 'over' && RS.winner >= 0) {
          const w = RS.players[RS.winner];
          if (w === state.myPeer) { me.wins += 1; showToast(`You win ${RS.score[RS.winner]} to ${RS.score[1 - RS.winner]}!`); sfx('fanfare', 0.9); }
          else showToast(`${nameOf(w)} wins ${RS.score[RS.winner]} to ${RS.score[1 - RS.winner]}`);
        }
        if (RS.ph === 'play' && myTurn() && RS.turn < 2) sfx('beep', 0.6);
        me.ph = RS.ph; state.dirtyBoard = true; state.hudDirty = true;
      }
      if (me.lastTurnKey !== `${RS.round}:${RS.turn}`) { me.lastTurnKey = `${RS.round}:${RS.turn}`; if (myTurn()) { sfx('beep', 0.5); haptic(vrHands.right, 0.3, 40); } state.dirtyBoard = true; }
      // bags lie flat on whatever they're resting on
      for (const b of bags) {
        let n = null;
        for (const B of BOARDS) { local(B, b.pos, _l); if (!b.data.inHole && onBoardRect(_l, 0.02) && _l.h < BR + 0.03) n = B.n; }
        if (b.held) { b.mesh.quaternion.identity(); continue; }
        // in the air: a flat spin, tipped to follow the arc (nose up on the way up, down on the way down)
        const sp2 = b.vel.x * b.vel.x + b.vel.z * b.vel.z;
        if (b.pos.y > BR + 0.06 && sp2 > 1.5 && !b.data.inHole) {
          b.yaw += Math.min(dt, 0.05) * (b.k % 2 ? 1 : -1) * (8 + ((b.k * 7 + b.side * 3) % 5));
          const hz = Math.sqrt(sp2), pitch = clamp(Math.atan2(b.vel.y, hz) * 0.45, -0.5, 0.5);
          _q.setFromAxisAngle(_a.set(b.vel.z / hz, 0, -b.vel.x / hz), -pitch);
          b.mesh.quaternion.copy(_q).multiply(new Q4().setFromAxisAngle(_b.set(0, 1, 0), b.yaw));
          b.mesh.position.copy(b.pos);
          b.data.laid = false;
          continue;
        }
        if (!b.sleeping || !b.data.laid) {
          _q.setFromUnitVectors(_a.set(0, 1, 0), n || _a.clone());
          if (!n) _q.identity();
          b.mesh.quaternion.copy(_q).multiply(new Q4().setFromAxisAngle(_b.set(0, 1, 0), b.yaw));
          b.data.laid = b.sleeping;
        }
        b.mesh.position.copy(b.pos).addScaledVector(n || _a.set(0, 1, 0), -(BR - 0.018));
      }
      // Corny Carl stands at his spot when he's playing
      botBody.visible = RS.players[1] === BOT && RS.ph !== 'idle';
      if (botBody.visible) { const s = spotOf(1, RS.end, _a); botBody.position.set(s.x, 1.5 + (myTurn() ? 0 : Math.abs(Math.sin(now * 0.003)) * 0.02), s.z); botBody.rotation.y = RS.end === 0 ? 0 : Math.PI; }
      // the round's points over each board while it's being tallied
      floats.forEach((f, k) => {
        f.s.visible = RS.ph === 'tally' && k === (RS.end === 0 ? 0 : 1);
        if (!f.s.visible) return;
        const key = RS.pts.join('-');
        if (f.key !== key) { f.key = key; const g = f.c.g; g.clearRect(0, 0, 256, 96); rr(g, 4, 4, 248, 88, 30); g.fillStyle = 'rgba(20,16,32,0.85)'; g.fill(); g.font = `800 60px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = SIDE_HEX[0]; g.fillText(String(RS.pts[0]), 70, 52); g.fillStyle = '#fff'; g.fillText('-', 128, 50); g.fillStyle = SIDE_HEX[1]; g.fillText(String(RS.pts[1]), 186, 52); f.c.tex.needsUpdate = true; }
        f.s.position.copy(BOARDS[k].hole).add(_a.set(0, 1.1, 0));
      });
      // what to do now
      const mine = myTurn();
      hudPlate.visible = state.mode === 'vr' && mine;
      if (state.mode === 'flat' && ui.status) {
        const s = mySide();
        const a = `Red ${RS.score[0]} · Blue ${RS.score[1]}`;
        const b = RS.ph !== 'play' ? (RS.ph === 'over' ? `${nameOf(RS.players[RS.winner])} won` : '') : mine ? `Your throw: bag ${Math.floor(RS.turn / 2) + 1} of ${BAGS}` : RS.turn < 8 ? `${nameOf(RS.players[turnSide()])} is throwing` : 'Counting…';
        const c = s < 0 ? 'Watching' : '';
        const key = `${a}|${b}|${c}`;
        if (key !== statusKey) { statusKey = key; ui.status.hidden = false; ui.status.replaceChildren(); for (const [t, col] of [[a, '#ffd23f'], [b, mine ? '#8bd450' : null], [c, null]]) { if (!t) continue; const sp = document.createElement('span'); sp.textContent = t; if (col) sp.style.color = col; ui.status.append(sp); } }
      }
    };
    L.drawBoard = () => {
      const key = JSON.stringify([RS.players, RS.score, RS.round, RS.ph, me.wins]);
      if (key === boardKey) return;
      boardKey = key;
      const g = L.board.g, W = 720, Hd = 460;
      g.fillStyle = '#1e2a3a'; g.fillRect(0, 0, W, Hd);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, Hd - 8);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('CORNHOLE', W / 2, 58);
      for (let s = 0; s < 2; s++) {
        const x = s ? W - 180 : 180;
        g.fillStyle = SIDE_HEX[s]; g.font = `800 120px ${DISPLAY}`; g.fillText(String(RS.score[s]), x, 200);
        g.font = `700 30px ${BODY}`; g.fillText(RS.players[s] ? nameOf(RS.players[s]) : 'Open', x, 290, 300);
      }
      g.fillStyle = '#c8d4e4'; g.font = `400 26px ${BODY}`;
      g.fillText(RS.ph === 'idle' ? 'Walk up to play' : `Round ${RS.round} · first to ${WIN}`, W / 2, 360);
      g.fillText('Board 1 · Hole 3 · only the difference counts', W / 2, 410);
      L.board.tex.needsUpdate = true;
    };
    L.rowFor = (st, isMe) => { const id = isMe ? state.myPeer : st && st.peer, s = RS.players.indexOf(id); return { text: s < 0 ? 'watching' : SIDE_NAME[s] }; };
    L.sortRows = () => 0;
    L.hints = [['Grip', 'pick up your bag'], ['Throw', 'underhand, let go'], ['Board', '1'], ['Hole', '3']];
    L.hintsFor = () => (state.mode === 'flat' ? [['E', 'pick up your bag'], ['Hold Space', 'power: the middle is the hole'], ['Drag', 'aim']] : L.hints);

    // ---------------------------------------------------------------- network
    L.presence = () => {
      const p = { cq: [me.done, me.doneRound || 0, me.doneTurnIdx === undefined ? -1 : me.doneTurnIdx, me.wins] };
      if (isHost()) p.ch = [RS.game, RS.round, PH[RS.ph], RS.end, RS.turn, RS.first, RS.score[0], RS.score[1], RS.pts[0], RS.pts[1], RS.winner], p.chp = RS.players.slice();
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      st.peer = rec.peer;
      if (Array.isArray(pres.cq) && pres.cq.length === 4 && pres.cq.every(Number.isInteger)) { if (!st.cqInit) { st.doneSeen = pres.cq[0]; st.cqInit = true; } st.cq = pres.cq; }
      if (rec.peer !== hostId() || isHost()) return;
      const a = pres.ch, pl = pres.chp;
      if (!Array.isArray(a) || a.length !== 11 || !a.every(Number.isInteger)) return;
      if (!Array.isArray(pl) || pl.length !== 2 || !pl.every((x) => typeof x === 'string' && x.length < 64)) return;
      const newEnd = a[3] !== RS.end;
      Object.assign(RS, { game: a[0], round: a[1], ph: PH_N[clamp(a[2], 0, 3)], end: a[3] ? 1 : 0, turn: clamp(a[4], 0, 8), first: a[5] ? 1 : 0, score: [a[6], a[7]], pts: [a[8], a[9]], winner: a[10], players: pl.slice() });
      if (newEnd) setSlots(RS.end);
    };
    L.spawn = () => { dolly.position.set(2.4, 0, 6.5); state.yaw = 0.3; };
    L.onEnter = () => { me.holding = false; me.holdKey = ''; me.round = -1; me.game = -1; me.ph = ''; statusKey = ''; boardKey = ''; if (hostId() === state.myPeer) RS.ph = 'idle'; state.dirtyBoard = true; };
    L.onExit = () => { hudPlate.visible = false; botBody.visible = false; if (ui.status) ui.status.hidden = true; statusKey = ''; };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0001) * 0.5; camera.position.set(3 + Math.sin(a) * 2, 2.2, 7.5); camera.lookAt(0, 0.3, -4); };
    L.cornholeInternals = { RS, H, me, bags, BOARDS, bagPoints, throwFor, lob, hostStep, isHost, turnBag, myTurn, setSlots, local };
    return L;
  })();
