  // ================================================================ CLUBHOUSE POP-A-SHOT
  // Two arcade cabinets on the south wall. Press START, then you have 45 seconds to sink as many shots as you can
  // (2 points each). Balls come back to the rack by themselves. In VR you throw for real; in a browser, aim with
  // the view and hold Space for power: a medium charge is about right. Your best score is remembered.
  const popashot = ((L) => {
    const G = L.group;
    const ROUND_MS = 45000, PTS = 2, BALLS = 5;
    const RYh = 1.45, RR = 0.125, BALL_R = 0.058, BOARD_Z = 17.43;
    const CABS = [{ x: -8.6, col: 0xff8a3a, name: 'Pop-a-Shot A' }, { x: -5.4, col: 0x4fc3f7, name: 'Pop-a-Shot B' }].map((c, i) => Object.assign(c, { i, rz: BOARD_Z - 0.03 - RR, balls: [], round: null, finalT: 0, last: 0, lastName: '', shown: '' }));
    const SPOT_Z = 15.0;                                   // about where you stand
    const WALL_X = 0.72, WALL_Z0 = 15.55, WALL_H = 2.4;      // the side walls (the ball bounces off them)
    const STAND_Z = 15.3;
    const RAMP = { z0: 16.5, y0: 0.93, z1: BOARD_Z - 0.02, y1: 1.16 };      // the return ramp, rising toward the backboard
    const TRAY = { z0: 16.04, z1: 16.5, y: 0.91 };                                   // you stay behind this, out of the way of the rack and the hoop
    const frameMat = lam(0x232640), steelMat = lam(0xc8ccd6);
    const ballTex = canvasTexture(128, 64, (g) => { g.fillStyle = '#e8772e'; g.fillRect(0, 0, 128, 64); g.strokeStyle = '#2b1608'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 32); g.lineTo(128, 32); g.moveTo(32, 0); g.lineTo(32, 64); g.moveTo(96, 0); g.lineTo(96, 64); g.stroke(); g.beginPath(); g.arc(32, 32, 24, -1.1, 1.1); g.arc(96, 32, 24, Math.PI - 1.1, Math.PI + 1.1); g.stroke(); }).tex;
    const ballGeo = new THREE.SphereGeometry(BALL_R, 16, 12);
    const netMat = new THREE.MeshBasicMaterial({ color: 0xf4f2ec, transparent: true, opacity: 0.55, side: THREE.DoubleSide, wireframe: true });
    const ledMat = (c) => new THREE.MeshBasicMaterial({ color: c });

    for (const cab of CABS) {
      const cx = cab.x;
      // the frame, the backboard, the rim and net, the ball rack
      for (const sx of [-1, 1]) addBox(G, 0.08, 2.55, 0.1, frameMat, cx + sx * 0.62, 1.275, 17.55);
      addBox(G, 1.32, 0.12, 0.1, frameMat, cx, 2.55, 17.55);
      addBox(G, 1.32, 0.9, 0.06, frameMat, cx, 0.45, 17.6);       // the lower cabinet
      addBox(G, 1.0, 0.7, 0.04, new THREE.MeshLambertMaterial({ color: 0xf4f2ec }), cx, 1.65, BOARD_Z + 0.02);
      addBox(G, 0.5, 0.3, 0.012, ledMat(cab.col), cx, 1.58, BOARD_Z - 0.003);   // the target square
      const rim = new THREE.Mesh(new THREE.TorusGeometry(RR, 0.011, 8, 28), ledMat(0xff5a2a)); rim.rotation.x = Math.PI / 2; rim.position.set(cx, RYh, cab.rz); G.add(rim);
      const net = new THREE.Mesh(new THREE.CylinderGeometry(RR, RR * 0.6, 0.3, 12, 3, true), netMat); net.position.set(cx, RYh - 0.15, cab.rz); G.add(net);
      addBox(G, 0.03, 0.03, 0.09, steelMat, cx, RYh, BOARD_Z - 0.05);
      // the rack out front: a tray the balls sit on, with a lip
      addBox(G, 2 * WALL_X, 0.06, 0.5, frameMat, cx, 0.88, 16.25);
      addBox(G, 2 * WALL_X, 0.07, 0.04, ledMat(cab.col), cx, 0.93, 16.02);
      // the return ramp: from under the net down to the tray, wall to wall
      {
        const len = Math.hypot(RAMP.z1 - RAMP.z0, RAMP.y1 - RAMP.y0), ang = Math.atan2(RAMP.y1 - RAMP.y0, RAMP.z1 - RAMP.z0);
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(2 * WALL_X, 0.03, len), lam(0x2e3352));
        ramp.position.set(cx, (RAMP.y0 + RAMP.y1) / 2 - 0.015, (RAMP.z0 + RAMP.z1) / 2); ramp.rotation.x = -ang; G.add(ramp);
        // stripes down the middle, so you can see it slope
        for (let k = 0; k < 4; k++) {
          const t = (k + 0.5) / 4, st = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.005, 0.04), ledMat(cab.col));
          st.position.set(cx, RAMP.y0 + (RAMP.y1 - RAMP.y0) * t + 0.002, RAMP.z0 + (RAMP.z1 - RAMP.z0) * t); st.rotation.x = -ang; G.add(st);
        }
        // a skirt underneath, down to the floor
        addBox(G, 2 * WALL_X, RAMP.y0, 0.04, frameMat, cx, RAMP.y0 / 2, RAMP.z0);
      }
      for (let i = 0; i < BALLS; i++) {
        const slot = new V3(cx + (i - (BALLS - 1) / 2) * 0.17, 0.91 + BALL_R, 16.28);
        const b = makeBody(L, { geo: ballGeo, tex: ballTex, r: BALL_R, slot });
        b.gs = 1; b.ad = 0.02; b.pa = cab.i; b.paScored = false; b.paRest = 0; b.paPrevY = slot.y;
        cab.balls.push(b);
      }
      // the score panel and the sign
      cab.panelC = canvasTexture(512, 192);
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.49), new THREE.MeshBasicMaterial({ map: cab.panelC.tex }));
      panel.position.set(cx, 2.32, 17.49); panel.rotation.y = Math.PI; G.add(panel);
      makePlate(G, cab.name, 1.2, 0.2, new V3(cx, 0.45, 17.56), Math.PI, { bg: '#232640', fg: `#${cab.col.toString(16).padStart(6, '0')}`, size: 0.6 });
      // START, off to the side of where you shoot from
      makeButton(L, new V3(cx - 0.95, 1.0, 15.35), cab.col, `Start ${cab.i ? 'B' : 'A'}`, () => startRound(cab), { faceYaw: 0 });
      // side walls from just in front of the rack to the backboard: a solid lower panel with clear plexiglass above
      for (const sx of [-1, 1]) {
        const wx = cx + sx * WALL_X, zc = (WALL_Z0 + 17.6) / 2, len = 17.6 - WALL_Z0;
        addBox(G, 0.06, 0.9, len, frameMat, wx, 0.45, zc);
        const glass = new THREE.Mesh(new THREE.BoxGeometry(0.03, WALL_H - 0.9, len), new THREE.MeshLambertMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0.22, depthWrite: false }));
        glass.position.set(wx, 0.9 + (WALL_H - 0.9) / 2, zc); G.add(glass);
        addBox(G, 0.08, 0.06, len, ledMat(cab.col), wx, WALL_H, zc);
        addBox(G, 0.08, WALL_H, 0.08, frameMat, wx, WALL_H / 2, WALL_Z0);
      }
      void BOARD_Z;
    }
    L.pops = CABS;

    // ---------------------------------------------------------------- rounds
    const me = () => state.myPeer;
    const remoteRound = (k) => {
      const now = performance.now();
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.pa && st.pa[0] === k && st.pa[2] >= 0 && now - (st.paT || 0) < 3000) return { player: rec.peer, name: rec.name, score: st.pa[1], left: st.pa[2] }; }
      return null;
    };
    const myRound = () => CABS.find((c) => c.round && c.round.player === me());
    const roundOf = (cab) => (cab.round ? { player: me(), name: state.name, score: cab.round.score, left: Math.max(0, cab.round.end - performance.now()) } : remoteRound(cab.i));
    function startRound(cab) {
      const now = performance.now();
      if (roundOf(cab)) { showToast('That one\u2019s in use'); return; }
      if (myRound()) { showToast('You\u2019re already playing the other one'); return; }
      cab.round = { player: me(), end: now + ROUND_MS, score: 0 };
      cab.finalT = 0;
      for (const b of cab.balls) if (!b.held || b.held.peer === me()) { if (b.held) loseFromMyHand(b); reclaimToSlot(b); b.paScored = false; }
      sfx('whistle', 0.8);
      showToast(`Go! 45 seconds at ${cab.name}: 2 points a shot`);
      state.hudDirty = true; forcePresence();
    }
    function endRound(cab) {
      const r = cab.round; if (!r) return;
      cab.last = r.score; cab.lastName = state.name; cab.finalT = performance.now(); cab.round = null;
      const best = prefs.popBest | 0;
      if (r.score > best) { prefs.popBest = r.score; savePrefs(); showToast(`Time! ${r.score} points: a new best!`); sfx('fanfare', 0.8); }
      else showToast(`Time! ${r.score} points (your best is ${best})`);
      sfx('buzzer', 0.6);
      state.dirtyBoard = true; forcePresence();
    }
    function basket(cab, b) {
      b.paScored = true; b.paScoredT = performance.now();
      if (b.owner !== me()) return;
      sfx('swish', 0.9);
      if (cab.round && cab.round.player === me()) {
        cab.round.score += PTS;
        spawnFloat(`+${PTS}`, new V3(cab.x, RYh + 0.5, cab.rz), '#ffd23f');
        forcePresence();
      } else spawnFloat('Swish!', new V3(cab.x, RYh + 0.5, cab.rz), '#ffffff');
    }

    // ---------------------------------------------------------------- the rim, the backboard and the net
    function popCollide(b, h) {
      const cab = CABS[b.pa], cx = cab.x;
      let sup = false;
      // the rim: a ring of small posts
      for (let k = 0; k < 20; k++) {
        const a = (k / 20) * Math.PI * 2, px = cx + Math.cos(a) * RR, pz = cab.rz + Math.sin(a) * RR;
        const dx = b.pos.x - px, dy = b.pos.y - RYh, dz = b.pos.z - pz, d = Math.hypot(dx, dy, dz), min = b.r + 0.012;
        if (d < min && d > 1e-5) {
          const nx = dx / d, ny = dy / d, nz = dz / d;
          b.pos.x += nx * (min - d); b.pos.y += ny * (min - d); b.pos.z += nz * (min - d);
          const vn = b.vel.x * nx + b.vel.y * ny + b.vel.z * nz;
          if (vn < 0) { b.vel.x -= 1.5 * vn * nx; b.vel.y -= 1.5 * vn * ny; b.vel.z -= 1.5 * vn * nz; if (-vn > 0.8) tone(760, 420, 0.07, 'triangle', Math.min(0.25, -vn * 0.04)); }
        }
      }
      // the return ramp and the tray: a ball that drops in front of the backboard rolls back down to the tray
      if (Math.abs(b.pos.x - cx) < WALL_X) {
        if (b.pos.z > RAMP.z0 && b.pos.z < RAMP.z1 + b.r) {
          const sl = (RAMP.y1 - RAMP.y0) / (RAMP.z1 - RAMP.z0), surf = RAMP.y0 + sl * (b.pos.z - RAMP.z0);
          const nl = Math.hypot(1, sl), ny = 1 / nl, nz = -sl / nl;
          const gap = (b.pos.y - surf) * ny;                       // distance from the slope, along its normal
          if (gap < b.r && gap > -0.25) {
            b.pos.y += (b.r - gap) * ny; b.pos.z += (b.r - gap) * nz;
            const vn = b.vel.y * ny + b.vel.z * nz;
            if (vn < 0) { b.vel.y -= 1.3 * vn * ny; b.vel.z -= 1.3 * vn * nz; if (-vn > 0.8) tone(200, 140, 0.05, 'sine', Math.min(0.2, -vn * 0.05)); }
            b.vel.x *= Math.max(0, 1 - 2 * h);
            b.paOnRamp = true;
          }
        } else if (b.pos.z > TRAY.z0 && b.pos.z <= RAMP.z0 && b.pos.y < TRAY.y + b.r && b.pos.y > TRAY.y - 0.2) {
          b.pos.y = TRAY.y + b.r;
          if (b.vel.y < 0) b.vel.y *= -0.2;
          const k = Math.max(0, 1 - 3 * h); b.vel.x *= k; b.vel.z *= k;          // the tray's lining slows it to a stop
          sup = true;
        }
        // the tray's front lip stops it rolling out toward you
        if (b.pos.z < TRAY.z0 + b.r && b.pos.z > TRAY.z0 - 0.05 && b.pos.y < TRAY.y + 0.06 + b.r && b.vel.z < 0) { b.pos.z = TRAY.z0 + b.r; b.vel.z *= -0.3; }
      }
      // the side walls
      if (b.pos.z > WALL_Z0 - b.r && b.pos.z < 17.6 && b.pos.y < WALL_H + b.r) {
        const dx = b.pos.x - cx, ax = Math.abs(dx), sgn = Math.sign(dx) || 1;
        if (ax > WALL_X - b.r && ax < WALL_X + 0.15) {
          b.pos.x = cx + sgn * (WALL_X - b.r);
          if (b.vel.x * sgn > 0) { if (Math.abs(b.vel.x) > 0.8) tone(260, 160, 0.06, 'sine', Math.min(0.25, Math.abs(b.vel.x) * 0.04)); b.vel.x *= -0.7; }
        }
      }
      // the backboard
      if (b.pos.z > BOARD_Z - b.r && b.pos.z < BOARD_Z + 0.06 && Math.abs(b.pos.x - cx) < 0.5 + b.r && b.pos.y > 1.3 - b.r && b.pos.y < 2.0 + b.r) {
        b.pos.z = BOARD_Z - b.r;
        if (b.vel.z > 0) { if (b.vel.z > 0.8) tone(300, 180, 0.08, 'sine', Math.min(0.3, b.vel.z * 0.05)); b.vel.z *= -0.55; b.vel.x *= 0.92; b.vel.y *= 0.92; }
      }
      // through the net: it slows the ball
      const hd = Math.hypot(b.pos.x - cx, b.pos.z - cab.rz);
      if (hd < RR + 0.01 && b.pos.y < RYh && b.pos.y > RYh - 0.3) { const k = Math.max(0, 1 - 7 * h); b.vel.x *= k; b.vel.z *= k; b.vel.y *= Math.max(0, 1 - 1.5 * h); }
      // a ball dropping down through the ring is a basket
      if (!b.paScored && b.paPrevY > RYh && b.pos.y <= RYh && b.vel.y < 0 && hd < RR - 0.012) basket(cab, b);
      b.paPrevY = b.pos.y;
      return sup;
    }
    const baseCollide = L.collide;
    L.collide = (b, h) => { let sup = baseCollide(b, h); if (b.pa !== undefined) sup = popCollide(b, h) || sup; return sup; };
    // while a round is on, only the player can pick that cabinet's balls up
    L.canGrab = ((base) => (b) => {
      if (b.pa === undefined) return base ? base(b) : true;
      const r = roundOf(CABS[b.pa]);
      if (r && r.player !== me()) { showToast(`${r.name} is playing that one`); return false; }
      b.paScored = false; b.paRest = 0;
      return true;
    })(L.canGrab);
    // browser: aim with your view and hold Space for power. A medium charge is about right for the distance you're at.
    const _cq = new Q4(), _d = new V3(), _to = new V3();
    L.throwOverride = ((base) => (obj, c) => {
      if (obj.pa === undefined) return base ? base(obj, c) : null;
      const cab = CABS[obj.pa];
      camera.getWorldQuaternion(_cq);
      _d.set(0, 0, -1).applyQuaternion(_cq); _d.y = 0;
      if (_d.lengthSq() < 1e-4) _d.set(0, 0, 1);
      _d.normalize();
      _to.set(cab.x - obj.pos.x, 0, cab.rz - obj.pos.z);
      const dist = Math.max(0.5, _to.length()); _to.normalize();
      // aim help: pointing within about 11 degrees of the hoop locks on; a bit further out you still get some help
      const ang = Math.acos(clamp(_d.dot(_to), -1, 1));
      if (ang < 0.2) _d.copy(_to); else if (ang < 0.7) _d.lerp(_to, 0.7 * (1 - (ang - 0.2) / 0.5)).normalize();
      const th = 0.95, dh = RYh - obj.pos.y;
      const v0 = Math.sqrt((9.8 * dist * dist) / Math.max(0.05, 2 * Math.cos(th) * Math.cos(th) * (dist * Math.tan(th) - dh)));
      // power: a charge near the middle is a perfect shot; too little falls short, too much goes long
      const e = c - 0.5, dead = 0.12;
      const sp = v0 * (Math.abs(e) < dead ? 1 : 1 + Math.sign(e) * (Math.abs(e) - dead) * 0.55);
      return new V3(_d.x * Math.cos(th) * sp, Math.sin(th) * sp, _d.z * Math.cos(th) * sp);
    })(L.throwOverride);

    // ---------------------------------------------------------------- the panels
    function drawPanel(cab, now) {
      const r = roundOf(cab), final = !r && cab.finalT && now - cab.finalT < 6000, rem = !r && cab.remoteFinal && now - cab.remoteFinal.t < 6000 ? cab.remoteFinal : null;
      const secs = r ? Math.ceil(r.left / 1000) : 0;
      const key = r ? `r|${r.name}|${r.score}|${secs}` : final ? `f|${cab.last}` : rem ? `rf|${rem.score}|${rem.name}` : `i|${prefs.popBest | 0}`;
      if (key === cab.shown) return;
      cab.shown = key;
      const g = cab.panelC.g;
      g.fillStyle = '#0b0d1a'; g.fillRect(0, 0, 512, 192);
      g.strokeStyle = `#${cab.col.toString(16).padStart(6, '0')}`; g.lineWidth = 6; g.strokeRect(5, 5, 502, 182);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.font = `800 30px ${DISPLAY}`; g.fillText('POP-A-SHOT', 256, 30);
      if (r) {
        g.fillStyle = '#ffffff'; g.font = `800 92px ${DISPLAY}`; g.fillText(String(r.score), 150, 112);
        g.fillStyle = secs <= 10 ? '#ff6a6a' : '#8bd450'; g.fillText(String(secs), 380, 112);
        g.fillStyle = '#a9a3cf'; g.font = `600 22px ${BODY}`; g.fillText(r.name, 256, 172, 400);
      } else if (final || rem) {
        g.fillStyle = '#ffffff'; g.font = `800 40px ${DISPLAY}`; g.fillText('FINAL', 256, 74);
        g.fillStyle = '#ffd23f'; g.font = `800 80px ${DISPLAY}`; g.fillText(String(final ? cab.last : rem.score), 256, 138);
      } else {
        g.fillStyle = '#ffffff'; g.font = `800 44px ${DISPLAY}`; g.fillText('PRESS START', 256, 86);
        g.fillStyle = '#a9a3cf'; g.font = `600 26px ${BODY}`; g.fillText(`45 seconds \u00b7 your best: ${prefs.popBest | 0}`, 256, 146);
      }
      cab.panelC.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- per frame
    const baseUpdate = L.update;
    L.update = (dt, now) => {
      baseUpdate(dt, now);
      for (const cab of CABS) {
        if (cab.round && now >= cab.round.end) endRound(cab);
        for (const b of cab.balls) {
          if (b.held) { b.paScored = false; b.paRest = 0; b.paPrevY = b.pos.y; continue; }
          if (b.owner !== me()) continue;
          if (b.sleeping && b.pos.distanceTo(b.slot) < 0.05) continue;    // resting on its rack
          const inTray = Math.abs(b.pos.x - cab.x) < WALL_X && b.pos.z > TRAY.z0 - 0.02 && b.pos.z < RAMP.z0 + 0.05 && b.pos.y < TRAY.y + b.r + 0.05;
          if (inTray) { b.paRest = 0; if (b.paScored && now - b.paScoredT > 300) b.paScored = false; continue; }   // rolled back to the tray: it stays there
          // a ball that went in comes back after a moment; so does one that has stopped on the floor (the physics
          // puts a still ball to sleep, so a sleeping ball away from its rack counts as stopped)
          const slow = b.sleeping || (Math.hypot(b.vel.x, b.vel.y, b.vel.z) < 0.6 && b.pos.y < b.r + 0.06);
          b.paRest = slow ? b.paRest + dt : 0;
          // (one that's stuck, or on the floor, still comes back to its slot)
          if ((b.paScored && now - b.paScoredT > 6000) || b.paRest > 1.6 || b.pos.y < -3) { reclaimToSlot(b); b.paScored = false; b.paRest = 0; }
        }
        drawPanel(cab, now);
      }
    };

    // ---------------------------------------------------------------- network
    const baseP = L.presence, baseR = L.readPresence;
    L.presence = () => {
      const p = baseP ? baseP() : {};
      const c = myRound();
      if (c) p.pa = [c.i, c.round.score, Math.max(0, Math.round(c.round.end - performance.now())), 0];
      else { const f = CABS.find((x) => x.finalT && performance.now() - x.finalT < 6500); if (f) p.pa = [f.i, f.last, -1, 0]; }
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      if (baseR) baseR(rec, pres, st);
      const a = pres.pa;
      if (Array.isArray(a) && a.length === 4 && Number.isInteger(a[0]) && a[0] >= 0 && a[0] < CABS.length && Number.isInteger(a[1]) && a[1] >= 0 && a[1] < 500 && Number.isInteger(a[2]) && a[2] >= -1 && a[2] <= ROUND_MS + 2000) {
        st.pa = a; st.paT = performance.now();
        if (a[2] === -1) CABS[a[0]].remoteFinal = { score: a[1], name: rec.name, t: st.paFinalT = st.paFinalT || performance.now() };
        else st.paFinalT = 0;
      } else st.pa = null;
    };
    // you shoot from behind the rack: no standing beside it, or between it and the hoop
    L.clampPlayer = ((base) => (p) => {
      const d = base ? base(p) : [0, 0];
      const x = p.x + d[0], z = p.z + d[1];
      const x0 = CABS[0].x - WALL_X - 0.3, x1 = CABS[CABS.length - 1].x + WALL_X + 0.3;
      if (x > x0 && x < x1 && z > STAND_Z) return [d[0], STAND_Z - p.z];
      return d;
    })(L.clampPlayer);
    L.popInternals = { physics: (dt, now) => updateBodies(L, dt, now), RAMP, TRAY, WALL_X, WALL_Z0, STAND_Z,  startRound, endRound, basket, popCollide, roundOf, myRound, RYh, RR, ROUND_MS };
    return CABS;
  })(hub);

