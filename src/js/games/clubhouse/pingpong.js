  // ================================================================ CLUBHOUSE PING PONG
  // A regulation table behind the lounge couches. Grab a paddle to take that end; play a friend, or the
  // clubhouse bot when you're on your own. Whoever the ball is heading toward runs it, so your hits never lag.
  const pingpong = ((L) => {
    const G = L.group;
    const rand = mulberry32(7171);
    const C = new V3(-4.0, 0, 10.6);                 // table center; its length runs along x
    const LEN = 2.74, WID = 1.525, Y = 0.76, NET_H = 0.1525, BR = 0.02;
    const WIN = 11, GRAV = 9.8, DRAG = 0.12;
    const STAND = [new V3(C.x - LEN / 2 - 0.75, 0, C.z), new V3(C.x + LEN / 2 + 0.75, 0, C.z)];
    const SIDE_NAME = ['West', 'East'];
    const toWorld = (u, y, v, out) => out.set(C.x + u, y, C.z + v);

    // ---------------------------------------------------------------- the table
    const topMat = lam(0x1f5a8a), lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff }), legMat = lam(0x2b2d42);
    addBox(G, LEN, 0.03, WID, topMat, C.x, Y - 0.015, C.z);
    addBox(G, LEN, 0.004, 0.02, lineMat, C.x, Y + 0.002, C.z - WID / 2 + 0.01);
    addBox(G, LEN, 0.004, 0.02, lineMat, C.x, Y + 0.002, C.z + WID / 2 - 0.01);
    addBox(G, 0.02, 0.004, WID, lineMat, C.x - LEN / 2 + 0.01, Y + 0.002, C.z);
    addBox(G, 0.02, 0.004, WID, lineMat, C.x + LEN / 2 - 0.01, Y + 0.002, C.z);
    addBox(G, LEN, 0.004, 0.006, lineMat, C.x, Y + 0.002, C.z);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) addBox(G, 0.06, Y - 0.03, 0.06, legMat, C.x + sx * (LEN / 2 - 0.25), (Y - 0.03) / 2, C.z + sz * (WID / 2 - 0.15));
    const net = new THREE.Mesh(new THREE.PlaneGeometry(WID + 0.3, NET_H), new THREE.MeshLambertMaterial({ color: 0xf4f2ec, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
    net.rotation.y = Math.PI / 2; net.position.set(C.x, Y + NET_H / 2, C.z); G.add(net);
    addBox(G, 0.02, 0.012, WID + 0.3, lineMat, C.x, Y + NET_H, C.z);
    for (const sz of [-1, 1]) addBox(G, 0.03, NET_H + 0.03, 0.03, legMat, C.x, Y + NET_H / 2, C.z + sz * (WID / 2 + 0.15));
    // a little scoreboard on a stand by the net, readable from both sides
    const scoreC = canvasTexture(512, 192);
    const scoreBoard = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.375), new THREE.MeshBasicMaterial({ map: scoreC.tex }));
    scoreBoard.position.set(C.x, 1.75, C.z - WID / 2 - 0.56); G.add(scoreBoard);
    const scoreBack = scoreBoard.clone(); scoreBack.rotation.y = Math.PI; scoreBack.position.z -= 0.01; G.add(scoreBack);
    addCyl(G, 0.03, 0.03, 1.55, 6, legMat, C.x, 0.78, C.z - WID / 2 - 0.57);

    // ---------------------------------------------------------------- paddles and ball
    TOOL_MESH.paddle = () => {
      const g = new THREE.Group();
      const wood = new THREE.MeshLambertMaterial({ color: 0xc8955a, emissive: 0x000000 });
      const red = new THREE.MeshLambertMaterial({ color: 0xd8324a, emissive: 0x000000 });
      const blk = new THREE.MeshLambertMaterial({ color: 0x1b1932, emissive: 0x000000 });
      const handle = new THREE.Mesh(cyl(0.014, 0.016, 0.1, 8), wood); handle.rotation.x = Math.PI / 2; handle.position.z = -0.03;
      const bladeGeo = new THREE.CylinderGeometry(0.076, 0.076, 0.006, 22); bladeGeo.rotateZ(Math.PI / 2);
      const fa = new THREE.Mesh(bladeGeo, red); fa.position.set(0.003, 0, -0.15);
      const fb = new THREE.Mesh(bladeGeo, blk); fb.position.set(-0.003, 0, -0.15);
      g.add(handle, fa, fb);
      g.userData.mats = [wood, red, blk];
      return g;
    };
    const flatQ = new Q4().setFromAxisAngle(new V3(0, 0, 1), Math.PI / 2);
    const paddles = [0, 1].map((s) => makeTool(L, new V3(C.x + (s ? 1 : -1) * (LEN / 2 - 0.25), Y + 0.012, C.z + WID / 2 - 0.2), flatQ, 'paddle'));
    paddles.forEach((t, s) => { t.ppSide = s; });
    const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BR, 14, 10), new THREE.MeshLambertMaterial({ color: 0xff9a3c }));
    ballMesh.visible = false;
    G.add(ballMesh);
    const botPaddle = TOOL_MESH.paddle();
    botPaddle.visible = false; G.add(botPaddle);
    // the clubhouse bot has a body, standing at its end of the table
    const botBody = buildAvatar('#9a90b0', 2, 1, true, 3, 5);
    const botTag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (g) => { rr(g, 4, 6, 248, 52, 26); g.fillStyle = 'rgba(20,16,32,0.8)'; g.fill(); g.fillStyle = '#ffffff'; g.font = `700 30px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Clubhouse bot', 128, 33); }).tex, transparent: true, depthWrite: false }));
    botTag.scale.set(0.9, 0.225, 1); botTag.position.y = 0.42; botBody.add(botTag);
    botBody.visible = false; G.add(botBody);

    // ---------------------------------------------------------------- state
    const PP = {
      mySide: -1, ver: 0, auth: '',
      b: { u: -LEN / 2 + 0.15, y: Y + 0.3, v: 0, vu: 0, vy: 0, vv: 0 },
      ph: 'idle', server: 0, lastHit: -1, need: -1, bounced: false, score: [0, 0], pointSeq: 0, deadT: 0, overT: 0, winner: -1,
      swingUntil: 0, serveT: 0, serveVer: -1, botOn: false,
      bot: { u: 0, v: 0, y: Y + 0.25, missing: false, decided: false, swingT: -1e9, bv: 0 },
    };
    L.pingpong = PP;
    function players() {
      const at = [null, null];
      if (PP.mySide >= 0) at[PP.mySide] = state.myPeer;
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.ppSide >= 0 && !at[st.ppSide]) at[st.ppSide] = rec.peer; }
      return at;
    }
    const otherHuman = () => (PP.mySide >= 0 ? players()[1 - PP.mySide] : null);
    const botSide = () => (PP.mySide >= 0 && !otherHuman() ? 1 - PP.mySide : -1);
    const iAmAuth = () => PP.mySide >= 0 && PP.auth === state.myPeer;
    const sideOfU = (u) => (u < 0 ? 0 : 1);
    const endU = (s) => (s === 0 ? -1 : 1) * LEN / 2;
    const nameOfSide = (s) => { const p = players()[s]; if (!p) return 'the bot'; if (p === state.myPeer) return 'you'; return (remotes.get(p) || {}).name || SIDE_NAME[s]; };

    // ---------------------------------------------------------------- the rules (run by whoever has the ball)
    function serveSpot() { Object.assign(PP.b, { u: endU(PP.server) * 0.9, y: Y + 0.28, v: PP.server === 0 ? 0.25 : -0.25, vu: 0, vy: 0, vv: 0 }); }
    function newGame() {
      PP.first = rand() < 0.5 ? 0 : 1;
      Object.assign(PP, { score: [0, 0], server: PP.first, overT: 0, winner: -1 });
      startServe();
    }
    function startServe() {
      PP.ph = 'serve'; PP.lastHit = -1; PP.need = -1; PP.bounced = false;
      serveSpot();
      PP.auth = players()[PP.server] || state.myPeer;   // the server's page runs the serve; the bot's, whoever plays it
      PP.ver += 1;
      PP.bot.decided = false;
      forcePresence();
    }
    function point(winner, why) {
      if (PP.ph !== 'rally' && PP.ph !== 'serve') return;
      PP.score[winner] += 1; PP.pointSeq += 1;
      PP.ph = 'dead'; PP.deadT = performance.now();
      const [a, b] = PP.score, total = a + b;
      if ((a >= WIN || b >= WIN) && Math.abs(a - b) >= 2) { PP.winner = a > b ? 0 : 1; PP.overT = performance.now(); }
      // serve changes every two points, every point from 10-all
      PP.server = ((PP.first || 0) + ((a >= 10 && b >= 10) ? total : Math.floor(total / 2))) % 2;
      PP.ver += 1;
      announcePoint(winner, why);
      forcePresence();
    }
    function announcePoint(winner, why) {
      const mine = winner === PP.mySide;
      sfx(mine ? 'chime' : 'buzzer', 0.5);
      const [a, b] = PP.score;
      if (PP.winner >= 0) showToast(PP.winner === PP.mySide ? `You win ${Math.max(a, b)}-${Math.min(a, b)}!` : `${nameOfSide(PP.winner)} wins ${Math.max(a, b)}-${Math.min(a, b)}`);
      else showToast(`${why ? why + ': ' : ''}${mine ? 'your point' : `point to ${nameOfSide(winner)}`}. ${a}-${b}`);
      drawScore();
    }
    function onHit(side) {
      if (PP.ph === 'serve') { if (side !== PP.server) return; PP.ph = 'rally'; PP.lastHit = side; PP.need = 1 - side; PP.bounced = false; PP.ver += 1; return; }
      if (PP.ph !== 'rally') return;
      if (side === PP.lastHit) { point(1 - side, 'Double hit'); return; }
      if (PP.need === side && !PP.bounced) { point(1 - side, 'No volleys'); return; }
      PP.lastHit = side; PP.need = 1 - side; PP.bounced = false; PP.ver += 1;
    }
    function onTable(side) {
      if (PP.ph !== 'rally') return;
      if (side === PP.lastHit) { point(1 - PP.lastHit, 'Bounced on your own side'); return; }
      if (side === PP.need) { if (!PP.bounced) { PP.bounced = true; PP.ver += 1; } else point(PP.lastHit, 'Two bounces'); }
    }
    function onDead() {
      if (PP.ph !== 'rally') return;
      if (PP.bounced) point(PP.lastHit, 'Missed it'); else point(1 - PP.lastHit, 'Out');
    }

    // ---------------------------------------------------------------- ball physics
    let simOnly = false;   // drawing someone else's ball: physics, no rules
    let lastTick = 0;
    function tickSound(v) { const now = performance.now(); if (now - lastTick < 40) return; lastTick = now; tone(1700, 1200, 0.03, 'sine', (v * 0.25) / (1 + myHead.pos.distanceTo(ballMesh.position) * 0.4)); }
    function stepBall(h) {
      const b = PP.b;
      if (PP.ph !== 'rally') return;
      const sp = Math.hypot(b.vu, b.vy, b.vv);
      b.vu -= DRAG * sp * b.vu * h; b.vy -= (GRAV + DRAG * sp * b.vy) * h; b.vv -= DRAG * sp * b.vv * h;
      const pu = b.u;
      b.u += b.vu * h; b.y += b.vy * h; b.v += b.vv * h;
      // the net
      if ((pu < 0) !== (b.u < 0) && b.y < Y + NET_H + BR && b.y > Y - 0.05 && Math.abs(b.v) < WID / 2 + 0.15) { b.u = pu < 0 ? -BR : BR; b.vu *= -0.15; b.vv *= 0.5; tone(300, 0, 0.05, 'triangle', 0.08); }
      // the table
      if (b.y < Y + BR && b.vy < 0 && Math.abs(b.u) < LEN / 2 && Math.abs(b.v) < WID / 2 && b.y > Y - 0.04) {
        b.y = Y + BR; b.vy = -b.vy * 0.88; b.vu *= 0.95; b.vv *= 0.95;
        tickSound(0.55);
        if (!simOnly) onTable(sideOfU(b.u));
      }
      // the floor, or gone
      if (b.y < BR) { b.y = BR; b.vy = -b.vy * 0.5; b.vu *= 0.7; b.vv *= 0.7; if (!simOnly) onDead(); }
      else if (Math.abs(b.u) > LEN / 2 + 4 || Math.abs(b.v) > 4) { if (!simOnly) onDead(); }
    }
    // a shot that lands at (tu, tv) on the table, over the net, at about this speed
    function aimedVelocity(fromU, fromY, fromV, tu, tv, speed) {
      const dx = tu - fromU, dz = tv - fromV, d = Math.hypot(dx, dz);
      const T = clamp(d / speed, 0.28, 1.1);
      const k = 1 + DRAG * speed * T * 0.45;   // a little extra for the air
      const out = { vu: (dx / T) * k, vy: (Y + BR - fromY + 0.5 * GRAV * T * T) / T, vv: (dz / T) * k };
      const tn = Math.abs(fromU) / Math.max(0.5, Math.abs(out.vu));
      const yAtNet = fromY + out.vy * tn - 0.5 * GRAV * tn * tn;
      if (yAtNet < Y + NET_H + 0.06) out.vy += (Y + NET_H + 0.08 - yAtNet) / tn;
      return out;
    }
    function hitBall(side, vu, vy, vv) {
      const b = PP.b, s = Math.hypot(vu, vy, vv), k = s > 14 ? 14 / s : 1;
      b.vu = vu * k; b.vy = vy * k; b.vv = vv * k;
      onHit(side);
      tone(1100, 900, 0.035, 'triangle', 0.35);
      PP.ver += 1;
      forcePresence();
    }
    function hittable(side) {
      const b = PP.b;
      if (PP.ph === 'serve') return side === PP.server;
      if (PP.ph !== 'rally' || PP.lastHit === side) return false;
      return sideOfU(b.u) === side || Math.abs(b.u) < 0.3;
    }

    // ---------------------------------------------------------------- your paddle
    const myPaddle = () => paddles.find((t) => t.held && t.held.peer === state.myPeer);
    const _pc = new V3(), _pn = new V3(), _bw = new V3(), _rel = new V3(), _q = new Q4(), _cp = new V3();
    let prevPC = null;
    function bladeOf(t, outC, outN) { outC.set(0, 0, -0.15).applyQuaternion(t.quat).add(t.pos); outN.set(1, 0, 0).applyQuaternion(t.quat); }
    // VR: the blade really meets the ball, checked several times per frame so fast swings don't pass through
    function vrPaddle(dt, steps) {
      const t = myPaddle();
      if (!t || state.mode !== 'vr' || !iAmAuth()) { prevPC = null; return; }
      bladeOf(t, _pc, _pn);
      if (!prevPC) { prevPC = _pc.clone(); return; }
      const vp = _pc.clone().sub(prevPC).multiplyScalar(1 / Math.max(1e-3, dt));
      if (hittable(PP.mySide)) {
        toWorld(PP.b.u, PP.b.y, PP.b.v, _bw);
        for (let k = 1; k <= steps; k++) {
          const c = prevPC.clone().lerp(_pc, k / steps);
          _rel.copy(_bw).sub(c);
          const d = _rel.dot(_pn), inPlane = Math.sqrt(Math.max(0, _rel.lengthSq() - d * d));
          if (inPlane > 0.085 || Math.abs(d) > BR + 0.03) continue;
          const vb = new V3(PP.b.vu, PP.b.vy, PP.b.vv), vn = vb.clone().sub(vp).dot(_pn);
          if (vn * Math.sign(d || 1) >= 0) continue;
          // off the rubber, then a gentle nudge toward landing on the far half
          vb.addScaledVector(_pn, -1.85 * vn);
          // your swing decides how hard and which way; the help keeps the arc on the table (there's no topspin here to do it)
          const speed = clamp(Math.hypot(vb.x, vb.z), 3, 10);
          const far = -endU(PP.mySide);
          const tu = far * clamp(0.3 + speed / 16, 0.3, 0.88), tv = clamp(PP.b.v + vb.z * 0.3, -WID / 2 + 0.12, WID / 2 - 0.12);
          const aim = aimedVelocity(PP.b.u, PP.b.y, PP.b.v, tu, tv, speed);
          hitBall(PP.mySide, vb.x * 0.25 + aim.vu * 0.75, vb.y * 0.25 + aim.vy * 0.75, vb.z * 0.25 + aim.vv * 0.75);
          haptic(vrHands[t.held.side], 0.5, 25);
          break;
        }
      }
      prevPC.copy(_pc);
    }
    // browser: the paddle follows the ball on your side; holding Space opens a short swing window
    const _deskTarget = new V3();
    L.deskHand = ((base) => (side, mh) => {
      const t = paddles.find((x) => x.held && x.held.peer === state.myPeer && x.held.side === side);
      if (!t || state.mode !== 'flat') return base ? base(side, mh) : false;
      const s = PP.mySide, b = PP.b;
      // the paddle follows a ball that's coming at you (or the serve); once you've hit it, it stays home instead of chasing it away
      const near = s >= 0 && PP.ph !== 'dead' && (PP.ph === 'serve' || (sideOfU(b.u) === s && PP.lastHit !== s));
      if (near) toWorld(b.u + (s === 0 ? -0.08 : 0.08), Math.max(Y + 0.05, b.y), b.v, _deskTarget);
      else toWorld(endU(Math.max(0, s)) + (s === 0 ? -0.3 : 0.3), Y + 0.25, 0, _deskTarget);
      // and it moves there smoothly, so going back to the ready spot eases rather than jumps
      const nowMs = performance.now(), dtS = Math.min(0.05, (nowMs - (PP.deskT || nowMs)) / 1000); PP.deskT = nowMs;
      if (!PP.deskPos) PP.deskPos = _deskTarget.clone();
      PP.deskPos.lerp(_deskTarget, 1 - Math.exp(-dtS * (near ? 40 : 9)));
      mh.pos.copy(PP.deskPos);
      mh.quat.setFromEuler(new THREE.Euler(0, s === 0 ? -Math.PI / 2 : Math.PI / 2, 0));
      mh.ok = true;
      return true;
    })(L.deskHand);
    L.hopBlocked = ((base) => () => PP.mySide >= 0 || (base ? base() : false))(L.hopBlocked);
    L.deskSwing = ((base) => (now) => { if (myPaddle()) { PP.swingUntil = performance.now() + 450; return; } if (base) base(now); })(L.deskSwing);
    L.deskRelease = ((base) => () => { if (!myPaddle() && base) base(); })(L.deskRelease);
    function deskHit(now) {
      if (state.mode !== 'flat' || !myPaddle() || now > PP.swingUntil || !iAmAuth() || !hittable(PP.mySide)) return;
      const b = PP.b;
      const reach = PP.ph === 'serve' || (b.y > Y && b.y < Y + 0.9 && Math.abs(b.u) > 0.25 && PP.bounced);
      if (!reach) return;
      PP.swingUntil = 0;
      // aim where you're looking on the far half
      camera.getWorldQuaternion(_q); camera.getWorldPosition(_cp);
      const dir = new V3(0, 0, -1).applyQuaternion(_q);
      const far = -endU(PP.mySide);
      let tu = far * 0.55, tv = 0;
      if (dir.y < -0.02) { const t = (Y - _cp.y) / dir.y; tu = _cp.x + dir.x * t - C.x; tv = _cp.z + dir.z * t - C.z; }
      tu = Math.sign(far) * clamp(Math.sign(tu) === Math.sign(far) ? Math.abs(tu) : 0, 0.3, LEN / 2 - 0.12);
      tv = clamp(tv, -WID / 2 + 0.1, WID / 2 - 0.1);
      const v = aimedVelocity(b.u, b.y, b.v, tu, tv, 7);
      hitBall(PP.mySide, v.vu, v.vy, v.vv);
    }

    // ---------------------------------------------------------------- the clubhouse bot
    function botStep(dt, now) {
      const s = botSide();
      paddles.forEach((t, k) => { t.g.visible = !(k === s && !t.held); });
      botBody.visible = s >= 0;
      if (s < 0) { if (PP.mySide >= 0 || !PP.botOn) botPaddle.visible = false; return; }
      const bt = PP.bot, b = PP.b;
      botPaddle.visible = true;
      const coming = PP.ph === 'rally' && PP.lastHit !== s;
      let tu = endU(s) + (s === 0 ? -0.25 : 0.25), tv = 0, ty = Y + 0.25;
      if (coming) { tu = s === 0 ? clamp(b.u, -LEN / 2 - 0.6, -0.2) : clamp(b.u, 0.2, LEN / 2 + 0.6); tv = b.v; ty = Math.max(Y + 0.05, b.y); }
      if (PP.ph === 'serve' && PP.server === s) { tu = b.u + (s === 0 ? -0.08 : 0.08); tv = b.v; ty = b.y; }
      const k = Math.min(1, dt * 7);
      bt.u += (tu - bt.u) * k; bt.v += (tv - bt.v) * k; bt.y += (ty - bt.y) * k;
      poseBot(s, now, coming);
      if (!iAmAuth()) return;
      if (PP.ph === 'serve' && PP.server === s) { if (now - PP.serveT > 1300) botHit(s, true); return; }
      if (!coming) { bt.decided = false; return; }
      if (!hittable(s) || !PP.bounced || sideOfU(b.u) !== s) return;
      // sometimes it can't handle a fast one
      if (!bt.decided) { bt.decided = true; bt.missing = rand() < 0.13 + Math.max(0, Math.hypot(b.vu, b.vv) - 5) * 0.06; }
      if (bt.missing) return;
      if (b.vy < 0.5 && b.y > Y + 0.05 && b.y < Y + 0.45) botHit(s, false);
    }
    function botHit(s, serve) {
      const b = PP.b;
      // a friendly opponent: softer, less precise, and now and then it overcooks one
      const wild = !serve && rand() < 0.08;
      const tu = -endU(s) * (wild ? 1.1 + rand() * 0.2 : 0.3 + rand() * 0.55), tv = (rand() - 0.5) * (WID - 0.35);
      const v = aimedVelocity(b.u, b.y, b.v, tu + (rand() - 0.5) * 0.35, tv + (rand() - 0.5) * 0.3, serve ? 5.5 : 5 + rand() * 2.5);
      hitBall(s, v.vu, v.vy, v.vv);
      PP.bot.decided = false; PP.bot.swingT = performance.now();
    }
    // the body stands at its end and slides with the ball; the paddle is on the end of its arm, swinging
    function poseBot(s, now, coming) {
      const bt = PP.bot, b = PP.b, toNet = s === 0 ? 1 : -1;
      const bodyU = endU(s) - toNet * 0.35;
      bt.bv += (clamp(bt.v, -WID / 2 - 0.3, WID / 2 + 0.3) - bt.bv) * 0.12;
      toWorld(bodyU, 1.45, bt.bv + 0.25 * toNet, botBody.position);
      botBody.rotation.y = s === 0 ? -Math.PI / 2 : Math.PI / 2;
      const since = now - bt.swingT;
      let ang = 0;
      if (since < 260) ang = -1.0 + 2.0 * Math.sin((since / 260) * Math.PI / 2);           // the stroke and follow-through
      else if (since < 600) ang = 1.0 * (1 - (since - 260) / 340);                         // back to ready
      else if (coming) ang = -1.0 * clamp(1 - (Math.abs(b.u - bodyU) - 0.4) / 1.4, 0, 1);  // a backswing as it comes
      const reach = 0.55;
      toWorld(bodyU + toNet * Math.cos(ang) * reach, clamp(bt.y, Y + 0.05, Y + 0.6), bt.bv + Math.sin(ang) * reach * toNet, botPaddle.position);
      botPaddle.rotation.set(0, (s === 0 ? -Math.PI / 2 : Math.PI / 2) + ang * 0.9, 0);
    }

    // ---------------------------------------------------------------- taking a side
    function takeSide(s) {
      const at = players()[s];
      if (at && at !== state.myPeer) { showToast(`The ${SIDE_NAME[s].toLowerCase()} end is taken`); return false; }
      PP.mySide = s;
      if (!otherHuman() || PP.ph === 'idle') newGame();
      showToast(otherHuman() ? `Ping pong! First to ${WIN}, win by 2` : `Ping pong against the clubhouse bot. First to ${WIN}, win by 2`);
      sfx('chime', 0.6);
      state.hudDirty = true;
      forcePresence();
      return true;
    }
    function leaveTable() {
      if (PP.mySide < 0) return;
      PP.mySide = -1; botPaddle.visible = false; prevPC = null;
      if (!players()[0] && !players()[1]) { PP.ph = 'idle'; ballMesh.visible = false; }
      showToast('You left the ping pong table');
      state.hudDirty = true;
      forcePresence();
    }
    function putPaddleDown() {
      const t = myPaddle();
      if (!t) return;
      for (const s of SIDES) if (vrHands[s].holding && vrHands[s].holding.obj === t) vrHands[s].holding = null;
      if (state.held && state.held.obj === t) { state.held = null; state.hudDirty = true; }
      dropTool(t);
    }
    L.onToolGrab = ((base) => (t) => { if (t.kind === 'paddle') { if (PP.mySide !== t.ppSide && !takeSide(t.ppSide)) { putPaddleDownOf(t); } return; } if (base) base(t); })(L.onToolGrab);
    function putPaddleDownOf(t) { for (const s of SIDES) if (vrHands[s].holding && vrHands[s].holding.obj === t) vrHands[s].holding = null; if (state.held && state.held.obj === t) state.held = null; dropTool(t); }
    L.onUse = ((base) => () => {
      if (state.mode === 'flat') {
        if (PP.mySide >= 0) { putPaddleDown(); leaveTable(); return true; }
        for (let s = 0; s < 2; s++) {
          if (Math.hypot(myHead.pos.x - STAND[s].x, myHead.pos.z - STAND[s].z) < 1.5) {
            const t = paddles[s];
            if (t.held && t.held.peer !== state.myPeer) { showToast(`The ${SIDE_NAME[s].toLowerCase()} end is taken`); return true; }
            if (!takeSide(s)) return true;
            grabTool(t, 'right'); state.held = { kind: 'tool', obj: t }; state.hudDirty = true;
            const sp = STAND[s]; dolly.position.x += sp.x - myHead.pos.x; dolly.position.z += sp.z - myHead.pos.z;
            state.yaw = s === 0 ? -Math.PI / 2 : Math.PI / 2; state.pitch = -0.35;
            return true;
          }
        }
      }
      return base ? base() : false;
    })(L.onUse);
    L.clampPlayer = ((base) => (p) => {
      if (PP.mySide >= 0 && state.mode === 'flat') { const s = STAND[PP.mySide]; return [s.x - p.x, s.z - p.z]; }
      return base ? base(p) : [0, 0];
    })(L.clampPlayer);
    L.hintsFor = ((base) => () => {
      if (state.mode === 'flat' && PP.mySide >= 0) return [['Hold Space', 'swing (it hits as the ball arrives)'], ['Look', 'aim on the far half'], ['E', 'leave the table']];
      if (state.mode === 'flat' && Math.hypot(myHead.pos.x - C.x, myHead.pos.z - C.z) < 3.2) return [['E', 'at either end to play ping pong'], ['WASD', 'move'], ['Drag', 'look']];
      return base ? base() : L.hints;
    })(L.hintsFor);

    // ---------------------------------------------------------------- per frame
    function drawScore() {
      const g = scoreC.g;
      g.fillStyle = '#1b1932'; g.fillRect(0, 0, 512, 192);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.font = `800 34px ${DISPLAY}`; g.fillText('Ping pong', 256, 34);
      g.fillStyle = '#ffffff'; g.font = `800 84px ${DISPLAY}`; g.fillText(`${PP.score[0]}  -  ${PP.score[1]}`, 256, 112);
      g.fillStyle = '#a9a3cf'; g.font = `400 24px ${BODY}`;
      const who = (s) => { const p = players()[s]; return p ? (p === state.myPeer ? 'You' : (remotes.get(p) || {}).name || SIDE_NAME[s]) : (botSide() === s || PP.botOn ? 'Bot' : 'open'); };
      g.fillText(PP.ph === 'idle' ? 'Grab a paddle to play' : `${who(0)}${PP.server === 0 ? ' \u25cf' : ''}   vs   ${PP.server === 1 ? '\u25cf ' : ''}${who(1)}`, 256, 170, 490);
      scoreC.tex.needsUpdate = true;
    }
    drawScore();
    const baseUpdate = L.update;
    let scoreKey = '';
    L.update = (dt, now) => {
      baseUpdate(dt, now);
      if (PP.mySide >= 0 && (state.mode === 'menu' || state.level !== L.idx)) { putPaddleDown(); leaveTable(); }
      // put the paddle down, or walk off in VR, and you've left the table
      if (PP.mySide >= 0 && !myPaddle()) leaveTable();
      if (PP.mySide >= 0 && state.mode === 'vr' && Math.hypot(myHead.pos.x - C.x, myHead.pos.z - C.z) > 5) { putPaddleDown(); leaveTable(); }
      if (PP.ph === 'serve' && PP.serveVer !== PP.ver) { PP.serveVer = PP.ver; PP.serveT = now; }
      const steps = Math.max(1, Math.ceil(dt * 360)), h = dt / steps;
      // the serve belongs to the server's page; if whoever had the ball left the table, someone at it takes over
      if (iAmAuth() && PP.ph === 'serve') { const sv = players()[PP.server]; if (sv && sv !== state.myPeer) { PP.auth = sv; PP.ver += 1; forcePresence(); } }
      if (PP.mySide >= 0 && PP.ph !== 'idle' && !iAmAuth()) {
        const at = players().filter(Boolean);
        if (!at.includes(PP.auth) && at.sort()[0] === state.myPeer) { PP.auth = state.myPeer; PP.ver += 1; if (PP.ph === 'rally') { PP.ph = 'dead'; PP.deadT = now; } forcePresence(); }
      }
      if (iAmAuth()) {
        if (PP.ph === 'dead' && now - PP.deadT > 1300) { if (PP.winner >= 0) { if (now - PP.overT > 5000) newGame(); } else startServe(); }
        simOnly = false;
        for (let k = 0; k < steps && PP.ph === 'rally'; k++) {
          stepBall(h);
          // the ball crossed the net toward a person: their page takes it from here
          const toward = sideOfU(PP.b.u), other = players()[toward];
          if (PP.ph === 'rally' && other && other !== state.myPeer && PP.lastHit !== toward) { PP.auth = other; PP.ver += 1; forcePresence(); break; }
        }
        vrPaddle(dt, 6);
        deskHit(now);
      } else if (PP.ph === 'rally') { simOnly = true; for (let k = 0; k < steps; k++) stepBall(h); simOnly = false; prevPC = null; }
      botStep(dt, now);
      toWorld(PP.b.u, PP.b.y, PP.b.v, ballMesh.position);
      ballMesh.visible = PP.ph !== 'idle';
      const key = `${PP.score}|${PP.server}|${PP.ph === 'idle'}|${players().join()}|${PP.botOn}`;
      if (key !== scoreKey) { scoreKey = key; drawScore(); }
    };

    // ---------------------------------------------------------------- network
    const PHC = { idle: 0, serve: 1, rally: 2, dead: 3 }, PHN = ['idle', 'serve', 'rally', 'dead'];
    const r3 = (x) => Math.round(x * 1000) / 1000;
    const baseP = L.presence, baseR = L.readPresence;
    L.presence = () => {
      const p = baseP ? baseP() : {};
      if (PP.mySide < 0) return p;
      const b = PP.b;
      p.pp = [PP.mySide, PP.ver, PP.auth, r3(b.u), r3(b.y), r3(b.v), r3(b.vu), r3(b.vy), r3(b.vv), PHC[PP.ph], PP.server, PP.lastHit, PP.need, PP.bounced ? 1 : 0, PP.score[0], PP.score[1], PP.pointSeq, PP.winner, botSide() >= 0 ? 1 : 0, r3(PP.bot.u), r3(PP.bot.y), r3(PP.bot.v)];
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      if (baseR) baseR(rec, pres, st);
      const a = pres.pp;
      st.ppSide = -1;
      if (!Array.isArray(a) || a.length !== 22 || (a[0] !== 0 && a[0] !== 1) || !Number.isInteger(a[1]) || typeof a[2] !== 'string' || !a.slice(3, 9).every((x) => finite(x) && Math.abs(x) < 50)) return;
      const side = a[0];
      if (side === PP.mySide) { if (rec.peer < state.myPeer) { showToast(`${rec.name} took that end first`); putPaddleDown(); leaveTable(); } else return; }
      st.ppSide = side;
      // the ball and the rally, from whoever has it, when it's newer than ours
      if (a[1] > PP.ver) {
        const before = PP.pointSeq;
        Object.assign(PP.b, { u: a[3], y: a[4], v: a[5], vu: a[6], vy: a[7], vv: a[8] });
        Object.assign(PP, { ver: a[1], auth: a[2], ph: PHN[clamp(a[9] | 0, 0, 3)], server: a[10] ? 1 : 0, lastHit: a[11] | 0, need: a[12] | 0, bounced: a[13] === 1, score: [a[14] | 0, a[15] | 0], pointSeq: a[16] | 0, winner: a[17] | 0 });
        if (PP.pointSeq > before && PP.mySide >= 0) announcePoint(PP.score[0] > (st.ppS0 || 0) ? 0 : 1, '');
        if (PP.winner >= 0 && !PP.overT) PP.overT = performance.now();
        if (PP.winner < 0) PP.overT = 0;
      }
      st.ppS0 = PP.score[0];
      // spectators see the bot someone else is playing
      PP.botOn = a[18] === 1;
      if (PP.mySide < 0 && PP.botOn) { botPaddle.visible = true; toWorld(a[19], a[20], a[21], botPaddle.position); botPaddle.rotation.set(0, side === 1 ? -Math.PI / 2 : Math.PI / 2, 0); }
    };
    PP.internals = { C, LEN, WID, Y, STAND, paddles, takeSide, leaveTable, newGame, startServe, stepBall, onHit, onTable, onDead, hitBall, aimedVelocity, players, botSide, iAmAuth, endU };
    return PP;
  })(hub);

