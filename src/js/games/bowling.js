  // ================================================================ LEVEL: MOONLIGHT LANES (bowling)
  // Standard ten-pin scoring. Returns the frames so far, the running total,
  // and what the next ball needs: which frame, which ball, and whether the rack is fresh.
  function bowlAnalyze(rolls) {
    const frames = [];
    let i = 0, total = 0;
    const mark = (n) => (n === 0 ? '-' : String(n));
    for (let f = 0; f < 10; f++) {
      if (f < 9) {
        if (i >= rolls.length) return { frames, total, frame: f, ball: 0, fresh: true, done: false };
        const a = rolls[i];
        if (a === 10) {
          const b = rolls[i + 1], c = rolls[i + 2];
          const known = b !== undefined && c !== undefined;
          if (known) total += 10 + b + c;
          frames.push({ marks: ['X'], score: known ? total : null });
          i += 1;
          continue;
        }
        if (i + 1 >= rolls.length) {
          frames.push({ marks: [mark(a)], score: null });
          return { frames, total, frame: f, ball: 1, fresh: false, done: false };
        }
        const b = rolls[i + 1];
        if (a + b === 10) {
          const c = rolls[i + 2];
          if (c !== undefined) total += 10 + c;
          frames.push({ marks: [mark(a), '/'], score: c !== undefined ? total : null });
        } else {
          total += a + b;
          frames.push({ marks: [mark(a), mark(b)], score: total });
        }
        i += 2;
      } else {
        const r = rolls.slice(i, i + 3);
        const marks = [];
        let fresh = true;
        r.forEach((n, k) => {
          if (fresh && n === 10) { marks.push('X'); fresh = true; }
          else if (!fresh && n + r[k - 1] === 10) { marks.push('/'); fresh = true; }
          else { marks.push(mark(n)); fresh = !fresh ? true : false; if (k === 0) fresh = false; }
        });
        // how many balls the tenth allows
        const a = r[0], b = r[1];
        const allowed = a === undefined || b === undefined ? 3 : (a === 10 || a + b === 10 ? 3 : 2);
        const doneTenth = r.length >= allowed && r.length >= 2;
        if (doneTenth) total += r.slice(0, allowed).reduce((s, n) => s + n, 0);
        frames.push({ marks, score: doneTenth ? total : null });
        if (doneTenth) return { frames, total, frame: 9, ball: r.length, fresh: true, done: true };
        // what does the next ball face?
        let nextFresh;
        if (r.length === 0) nextFresh = true;
        else if (r.length === 1) nextFresh = a === 10;
        else nextFresh = (a === 10 && b === 10) || (a !== 10 && a + b === 10);
        return { frames, total, frame: 9, ball: r.length, fresh: nextFresh, done: false };
      }
    }
    return { frames, total, frame: 9, ball: 0, fresh: true, done: true };
  }

  const bowling = (() => {
    const L = newLevel(7);
    const G = L.group;
    const rand = mulberry32(8080);
    L.grabless = true;
    L.chargeKick = true;
    const NL = 4, LW = 1.05, GW = 0.24, DW = 0.14, PITCH = LW + 2 * GW + DW;
    const LEN = 16, HEAD_Z = -15.0, PIT_Z = -16.0, BR = 0.108, PIN_R = 0.06, PIN_H = 0.38;
    const MB = 6.5, MP = 1.5;
    const laneX = (i) => (i - (NL - 1) / 2) * PITCH;
    const SPOTS = [];
    for (let r = 0; r < 4; r++) for (let k = 0; k <= r; k++) SPOTS.push([(k - r / 2) * 0.3048, HEAD_Z - r * 0.264]);
    const HALF = (NL / 2) * PITCH;
    L.bounds = { minX: -HALF - 0.3, maxX: HALF + 0.3, minZ: -0.3, maxZ: 8.5 };
    L.env = {
      sky: skyTexture([[0, '#120d1e'], [1, '#120d1e']]),
      bg: 0x120d1e, fog: [0x150f24, 26, 70], hemi: [0xffe8d0, 0x302040, 0.8],
      sun: [0xffffff, 0.4], sunDir: new V3(0, 1, 0.3), ambient: [0x403050, 0.45],
      sprite: null,
    };

    // ---------------------------------------------------------------- the alley
    const carpet = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#1d1238'; g.fillRect(0, 0, 256, 256);
      const cols = ['#ff5c8a', '#4fc3f7', '#ffd23f', '#8bd450'];
      for (let i = 0; i < 26; i++) {
        g.strokeStyle = cols[i % 4]; g.lineWidth = 3; g.globalAlpha = 0.7;
        const x = rand() * 256, y = rand() * 256;
        g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 20, y - 25, x + 30, y + 25, x + 50, y); g.stroke();
      }
      g.globalAlpha = 1;
      for (let i = 0; i < 40; i++) { g.fillStyle = cols[i % 4]; g.beginPath(); g.arc(rand() * 256, rand() * 256, 3, 0, Math.PI * 2); g.fill(); }
    });
    carpet.tex.wrapS = carpet.tex.wrapT = THREE.RepeatWrapping;
    carpet.tex.repeat.set(5, 3);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 2, 6), new THREE.MeshLambertMaterial({ map: carpet.tex }));
    // just below the approach boards, so the strip where they overlap can't flicker
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -0.005, 6.5);
    G.add(floor);
    const maple = canvasTexture(128, 1024, (g) => {
      for (let i = 0; i < 16; i++) { const s = 205 + Math.floor(rand() * 25); g.fillStyle = `rgb(${s},${s - 35},${s - 95})`; g.fillRect(i * 8, 0, 8, 1024); }
      for (let i = 0; i < 4000; i++) { g.fillStyle = 'rgba(120,70,20,0.06)'; g.fillRect(rand() * 128, rand() * 1024, 1, 6); }
      g.fillStyle = '#1b1932';
      const az = 1024 - Math.round((4.6 / LEN) * 1024);
      for (let k = 0; k < 7; k++) { const x = 16 + k * 16; g.beginPath(); g.moveTo(x, az - 14 - Math.abs(k - 3) * 8); g.lineTo(x - 4, az - Math.abs(k - 3) * 8); g.lineTo(x + 4, az - Math.abs(k - 3) * 8); g.closePath(); g.fill(); }
      for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(16 + k * 16, 1024 - Math.round((2.1 / LEN) * 1024), 2, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#c23b4a'; g.fillRect(0, 1020, 128, 4);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, 128, Math.round((1.4 / LEN) * 1024));
    }).tex;
    const laneMat = new THREE.MeshLambertMaterial({ map: maple });
    const approachMat = lam(0xd9b07a), gutterMat = lam(0x2a2a35), capMat = lam(0x3a3352);
    const darkMat = lam(0x15101f), neonA = new THREE.MeshBasicMaterial({ color: 0xff5c8a }), neonB = new THREE.MeshBasicMaterial({ color: 0x4fc3f7 });
    for (let i = 0; i < NL; i++) {
      const x = laneX(i);
      const lane = new THREE.Mesh(new THREE.PlaneGeometry(LW, LEN), laneMat);
      lane.rotation.x = -Math.PI / 2; lane.position.set(x, 0.001, -LEN / 2);
      G.add(lane);
      addBox(G, LW + 2 * GW, 0.02, 4.5, approachMat, x, -0.01, 2.25);
      for (const s of [-1, 1]) addBox(G, GW, 0.02, LEN, gutterMat, x + s * (LW / 2 + GW / 2), -0.07, -LEN / 2);
      addBox(G, DW, 0.06, LEN + 4.5, capMat, x + PITCH / 2, 0.03, -LEN / 2 + 2.25);
      // masking unit above the pins, with neon trim
      addBox(G, PITCH, 1.1, 0.2, darkMat, x, 1.75, PIT_Z - 0.1);
      addBox(G, PITCH, 0.05, 0.22, i % 2 ? neonA : neonB, x, 1.22, PIT_Z - 0.1);
      const deckLight = new THREE.PointLight(0xfff2dc, 0.6, 5, 1.5);
      deckLight.position.set(x, 1.0, HEAD_Z - 0.3);
      G.add(deckLight);
    }
    addBox(G, DW, 0.06, LEN + 4.5, capMat, laneX(0) - PITCH / 2, 0.03, -LEN / 2 + 2.25);
    addBox(G, HALF * 2 + 2, 4, 0.3, darkMat, 0, 2, PIT_Z - 0.8);
    for (const s of [-1, 1]) {
      addBox(G, 0.3, 4, LEN + 10, lam(0x2a1d48), s * (HALF + 0.85), 2, -LEN / 2 + 4);
      addBox(G, 0.32, 0.06, LEN + 10, s < 0 ? neonA : neonB, s * (HALF + 0.85), 2.6, -LEN / 2 + 4);
    }
    const sign = makePlate(G, 'Moonlight Lanes', 4.2, 0.8, new V3(0, 3.1, PIT_Z - 0.62), 0, { bg: '#15101f', fg: '#ff9ad0', size: 0.7 });
    sign.material.fog = false;
    // benches behind the approach
    for (let i = 0; i < NL; i++) {
      addBox(G, 1.2, 0.45, 0.5, lam(0x4fc3f7), laneX(i), 0.225, 6.2);
      addBox(G, 1.2, 0.5, 0.12, lam(0x3b8fb8), laneX(i), 0.7, 6.45);
    }
    // ball returns, one beside each lane
    const RACK = [];
    for (let i = 0; i < NL; i++) {
      const rx = laneX(i) + PITCH / 2, rz = 2.4;
      addBox(G, 0.36, 0.8, 0.9, lam(0x3a3352), rx, 0.4, rz);
      addBox(G, 0.4, 0.06, 0.95, i % 2 ? neonA : neonB, rx, 0.82, rz);
      RACK.push(new V3(rx, 0.82 + BR, rz - 0.15));
    }

    // pins
    const pinGeo = (() => {
      const prof = [[0, 0], [0.03, 0], [0.045, 0.04], [0.06, 0.12], [0.055, 0.18], [0.03, 0.24], [0.022, 0.27], [0.03, 0.31], [0.034, 0.34], [0.026, 0.37], [0, 0.38]];
      return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 12);
    })();
    const pinMat = new THREE.MeshLambertMaterial({ color: 0xf6f4ee });
    const stripeGeo = new THREE.CylinderGeometry(0.0235, 0.0235, 0.012, 12, 1, true);
    const stripeMat = new THREE.MeshLambertMaterial({ color: 0xc23b4a, side: THREE.DoubleSide });
    function makePin() {
      const g = new THREE.Group();
      const body = new THREE.Group();
      body.add(new THREE.Mesh(pinGeo, pinMat));
      for (const y of [0.262, 0.28]) { const s = new THREE.Mesh(stripeGeo, stripeMat); s.position.y = y; body.add(s); }
      g.add(body);
      g.userData.body = body;
      G.add(g);
      return g;
    }
    const lanePins = [];
    for (let i = 0; i < NL; i++) lanePins.push(SPOTS.map(([sx, sz]) => { const m = makePin(); m.position.set(laneX(i) + sx, 0, sz); return m; }));
    function poseMesh(m, x, z, state, tilt, tdir) {
      m.visible = state !== 3;
      m.position.set(x, 0, z);
      m.rotation.set(0, tdir, 0);
      m.userData.body.rotation.x = tilt;
      if (tilt > 0.1) m.position.y = 0.05 * Math.sin(tilt);
    }

    // balls
    const ballGeo = new THREE.SphereGeometry(BR, 24, 16);
    const ballTex = canvasTexture(128, 64, (g) => {
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 64);
      for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${0.1 + rand() * 0.2})`; g.beginPath(); g.ellipse(rand() * 128, rand() * 64, 6 + rand() * 10, 2 + rand() * 4, rand() * 3, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#111'; for (const [x, y] of [[60, 24], [70, 24], [65, 36]]) { g.beginPath(); g.arc(x, y, 3, 0, Math.PI * 2); g.fill(); }
    }).tex;
    const myBallMat = new THREE.MeshLambertMaterial({ map: ballTex, color: 0xffffff });
    const ballMesh = new THREE.Mesh(ballGeo, myBallMat);
    G.add(ballMesh);
    const ballShadow = makeShadow(G, 0.3);
    L.setColor = (hex) => myBallMat.color.set(hex);
    L.setColor(PLAYER_COLORS[state.colorIdx].hex);

    // per-lane overhead monitors
    const monitors = [];
    for (let i = 0; i < NL; i++) {
      const ct = canvasTexture(640, 200);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.47), new THREE.MeshBasicMaterial({ map: ct.tex }));
      m.position.set(laneX(i), 2.5, -1.6);
      G.add(m);
      addBox(G, 1.56, 0.53, 0.04, darkMat, laneX(i), 2.5, -1.63);
      addCyl(G, 0.015, 0.015, 1.0, 6, darkMat, laneX(i), 3.25, -1.63);
      monitors.push({ ct, key: '' });
    }
    function drawMonitor(i, name, color, rolls) {
      const mon = monitors[i];
      const key = `${name}|${color}|${rolls.join(',')}`;
      if (key === mon.key) return;
      mon.key = key;
      const g = mon.ct.g, W = 640, H = 200;
      g.fillStyle = '#100b1c'; g.fillRect(0, 0, W, H);
      g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillStyle = color || '#8f89b8'; g.font = `800 34px ${DISPLAY}`;
      g.fillText(name ? `Lane ${i + 1}: ${name}` : `Lane ${i + 1}: open`, 14, 28, W - 28);
      if (!name) { mon.ct.tex.needsUpdate = true; return; }
      const r = bowlAnalyze(rolls);
      const bw = 60, x0 = 14, y0 = 60;
      for (let f = 0; f < 10; f++) {
        const x = x0 + f * bw, w = f === 9 ? bw + 10 : bw;
        g.strokeStyle = '#4a3f6a'; g.lineWidth = 2; g.strokeRect(x, y0, w, 120);
        g.fillStyle = f === r.frame && !r.done ? 'rgba(255,92,138,0.18)' : 'transparent';
        if (f === r.frame && !r.done) g.fillRect(x + 1, y0 + 1, w - 2, 118);
        g.fillStyle = '#8f89b8'; g.font = `400 16px ${BODY}`; g.textAlign = 'left'; g.fillText(String(f + 1), x + 5, y0 + 13);
        const fr = r.frames[f];
        if (!fr) continue;
        g.fillStyle = '#ffffff'; g.font = `800 28px ${DISPLAY}`; g.textAlign = 'center';
        fr.marks.forEach((mk, k) => g.fillText(mk, x + w - (fr.marks.length - k) * 19 + 6, y0 + 40));
        if (fr.score !== null) { g.font = `800 34px ${DISPLAY}`; g.fillStyle = '#ffd23f'; g.fillText(String(fr.score), x + w / 2, y0 + 92); }
      }
      mon.ct.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- my game
    L.me = { lane: -1, rolls: [], phase: 'ready', t0: 0, best: 0, games: 0, side: 'right', standingBefore: 10, rollStart: 0 };
    const me = L.me;
    const ball = { pos: new V3(), vel: new V3(), gutter: false, hitPins: false, stillT: 0 };
    const pins = SPOTS.map(([sx, sz], i) => ({ i, sx, sz, x: sx, z: sz, vx: 0, vz: 0, state: 0, tilt: 0, tdir: 0 }));
    const LX = () => laneX(me.lane < 0 ? 0 : me.lane);
    function rackPins(fresh) {
      for (const p of pins) {
        if (fresh) Object.assign(p, { x: p.sx, z: p.sz, vx: 0, vz: 0, state: 0, tilt: 0, tdir: 0 });
        else if (p.state !== 0) p.state = 3;
        else Object.assign(p, { x: p.sx, z: p.sz, vx: 0, vz: 0, tilt: 0 });
      }
    }
    function ballToRack() {
      ball.pos.copy(RACK[me.lane < 0 ? 0 : me.lane]);
      ball.vel.set(0, 0, 0);
      ball.gutter = false;
      ball.hitPins = false;
      me.phase = 'ready';
    }
    function pickLane() {
      const used = new Set();
      for (const rec of remotes.values()) {
        if (rec.lv !== L.idx || !rec.inGame || !rec.pres) continue;
        const a = rec.pres.bo;
        if (Array.isArray(a) && Number.isInteger(a[0])) used.add(a[0]);
      }
      if (me.lane >= 0 && !used.has(me.lane)) return me.lane;
      for (let i = 0; i < NL; i++) if (!used.has(i)) return i;
      return 0;
    }
    const _hd = new V3();
    function standAtLane() {
      camera.getWorldPosition(_hd);
      dolly.position.x += LX() - _hd.x;
      dolly.position.z += 3.0 - _hd.z;
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.12; }
    }
    L.spawn = () => {
      dolly.position.set(0, 0, 0);
      camera.position.set(0, 1.6, 0);
      me.lane = pickLane();
      if (me.phase !== 'ready' && me.phase !== 'over') { rackPins(true); }
      ballToRack();
      standAtLane();
      state.dirtyBoard = true;
    };
    // game over sign, and a New game button at every ball return
    const overTex = canvasTexture(512, 200);
    const overSign = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.7), new THREE.MeshBasicMaterial({ map: overTex.tex, transparent: true, depthWrite: false }));
    overSign.visible = false;
    G.add(overSign);
    let overKey = -1;
    function drawOver(total) {
      if (total === overKey) return;
      overKey = total;
      const g = overTex.g;
      g.clearRect(0, 0, 512, 200);
      rr(g, 6, 6, 500, 188, 30); g.fillStyle = 'rgba(30,16,40,0.9)'; g.fill();
      g.strokeStyle = '#ff9ad0'; g.lineWidth = 6; g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.font = `800 64px ${DISPLAY}`; g.fillText(`Game over: ${total}`, 256, 82);
      g.fillStyle = '#f2e8f8'; g.font = `500 28px ${BODY}`; g.fillText('Press New game to bowl again', 256, 148);
      overTex.tex.needsUpdate = true;
    }
    // well behind where you bowl, so a backswing can't press it: turn around to start a new game
    for (let i = 0; i < NL; i++) makeButton(L, new V3((i - 1.5) * 1.67 + 1.67 / 2 - 0.55, 1.0, 4.5), 0xff9ad0, 'New game', () => newGame(), { faceYaw: Math.PI });
    function newGame() {
      overKey = -1;
      me.rolls = [];
      rackPins(true);
      ballToRack();
      state.dirtyBoard = true;
      state.hudDirty = true;
      forcePresence();
    }
    L.newGame = newGame;

    function startRoll(vel) {
      me.phase = 'rolling';
      me.rollStart = performance.now();
      me.standingBefore = pins.filter((p) => p.state === 0).length;
      ball.vel.copy(vel);
      ball.gutter = false;
      ball.hitPins = false;
      ball.stillT = 0;
      noiseBurst(1.5, 0.18, 160, 0.6, 0.1);
      state.hudDirty = true;
      forcePresence();
    }
    // browser: roll from the foul line toward where you look
    const _cq = new Q4(), _d = new V3();
    L.kick = (c) => {
      if (me.phase !== 'ready') return;
      camera.getWorldQuaternion(_cq);
      _d.set(0, 0, -1).applyQuaternion(_cq);
      const ang = clamp(Math.atan2(_d.x, -_d.z), -0.09, 0.09);
      const x = clamp(myHead.pos.x, LX() - LW / 2 + 0.12, LX() + LW / 2 - 0.12);
      ball.pos.set(x, BR, -0.1);
      const sp = 4.5 + c * 5.5;
      startRoll(new V3(Math.sin(ang) * sp, 0, -Math.cos(ang) * sp));
    };
    L.throwLabel = () => 'Roll';
    // VR: pick the ball up off the return and roll it
    const _hp = new V3(), _off = new V3();
    L.onVRGrab = (h) => {
      if (me.phase !== 'ready') return false;
      const mh = myHands[h.side];
      if (!mh.ok || holdPoint(mh.pos, mh.quat, _hp).distanceTo(ball.pos) > 0.32) return false;
      me.phase = 'held';
      me.side = h.side;
      sfx('grab', 0.7);
      haptic(h, 0.4, 30);
      return true;
    };
    L.onVRRelease = (h, vel) => {
      if (me.phase !== 'held') return;
      const v = vel.clone().multiplyScalar(1.5);
      if (v.length() > 11) v.setLength(11);
      if (Math.hypot(v.x, v.z) < 1.0 || ball.pos.z > 3.6) { ballToRack(); return; }
      startRoll(v);
    };

    function crash(speed) {
      noiseBurst(0.6, Math.min(0.5, 0.15 + speed * 0.04), 2200, 0.7, 0.005);
      for (let k = 0; k < 5; k++) tone(900 + rand() * 900, 0, 0.06, 'triangle', 0.08, rand() * 0.25);
    }
    function physics(h) {
      const lx0 = LX();
      if (me.phase === 'rolling' || me.phase === 'settle') {
        if (me.phase === 'rolling') {
          const b = ball;
          b.vel.y -= GRAVITY * h;
          b.pos.addScaledVector(b.vel, h);
          let lx = b.pos.x - lx0;
          if (b.pos.z < 0 && !b.gutter && Math.abs(lx) > LW / 2 + 0.01) b.gutter = true;
          if (b.gutter) {
            const s = Math.sign(lx) || 1;
            lx = s * clamp(Math.abs(lx), LW / 2 + 0.05, LW / 2 + GW - 0.05);
            b.vel.x *= 1 - Math.min(1, 6 * h);
          } else lx = clamp(lx, -(LW / 2 + GW), LW / 2 + GW);
          b.pos.x = lx0 + lx;
          const surf = b.pos.z < PIT_Z ? -1 : b.gutter ? BR - 0.07 : BR;
          if (b.pos.y < surf) {
            b.pos.y = surf;
            if (b.vel.y < -0.8) b.vel.y *= -0.25; else b.vel.y = 0;
            const sp = Math.hypot(b.vel.x, b.vel.z);
            if (sp > 0) { const ns = Math.max(0, sp - 0.12 * h); b.vel.x *= ns / sp; b.vel.z *= ns / sp; }
          }
        }
        // pins move, topple and slide
        for (const p of pins) {
          if (p.state === 1 || p.state === 2) {
            p.x += p.vx * h; p.z += p.vz * h;
            const sp = Math.hypot(p.vx, p.vz);
            if (sp > 0) { const ns = Math.max(0, sp - (p.state === 2 ? 2.4 : 1.2) * h); p.vx *= ns / sp; p.vz *= ns / sp; }
            if (p.state === 1) { p.tilt += h * 5.5; if (p.tilt >= Math.PI / 2) { p.tilt = Math.PI / 2; p.state = 2; } }
            const lim = LW / 2 + GW;
            if (Math.abs(p.x) > lim) { p.x = Math.sign(p.x) * lim; p.vx *= -0.5; }
            if (p.z < PIT_Z - 0.1) p.state = 3;
            if (p.z > HEAD_Z + 1.2) { p.z = HEAD_Z + 1.2; p.vz *= -0.3; }
          }
        }
        // collisions: ball with pins, pins with pins
        const contacts = [];
        if (me.phase === 'rolling' && !ball.gutter && ball.pos.z < HEAD_Z + 0.6 && ball.pos.y > 0) contacts.push(null);
        for (const p of pins) {
          if (p.state === 3) continue;
          if (contacts.length) {
            const dx = p.x - (ball.pos.x - lx0), dz = p.z - ball.pos.z, d = Math.hypot(dx, dz), min = BR + PIN_R;
            if (d < min && d > 1e-6) {
              const nx = dx / d, nz = dz / d;
              const rv = (p.vx - ball.vel.x) * nx + (p.vz - ball.vel.z) * nz;
              if (rv < 0) {
                const j = -(1 + 0.6) * rv / (1 / MB + 1 / MP);
                ball.vel.x -= (j / MB) * nx; ball.vel.z -= (j / MB) * nz;
                p.vx += (j / MP) * nx; p.vz += (j / MP) * nz;
                if (!ball.hitPins) { ball.hitPins = true; crash(Math.hypot(ball.vel.x, ball.vel.z)); }
              }
              p.x += nx * (min - d); p.z += nz * (min - d);
              if (p.state === 0) { p.state = 1; p.tdir = Math.atan2(p.vx, p.vz); }
            }
          }
        }
        for (let a = 0; a < pins.length; a++) {
          for (let b = a + 1; b < pins.length; b++) {
            const P = pins[a], Q = pins[b];
            if (P.state === 3 || Q.state === 3 || (P.state === 0 && Q.state === 0)) continue;
            const dx = Q.x - P.x, dz = Q.z - P.z, d = Math.hypot(dx, dz), min = PIN_R * 2 + (P.state === 2 || Q.state === 2 ? 0.06 : 0);
            if (d >= min || d < 1e-6) continue;
            const nx = dx / d, nz = dz / d;
            const rv = (Q.vx - P.vx) * nx + (Q.vz - P.vz) * nz;
            if (rv < 0) {
              const j = -(1 + 0.5) * rv / 2;
              P.vx -= j * nx; P.vz -= j * nz; Q.vx += j * nx; Q.vz += j * nz;
              for (const X of [P, Q]) if (X.state === 0 && -rv > 0.35) { X.state = 1; X.tdir = Math.atan2(X.vx, X.vz); tone(1100 + rand() * 600, 0, 0.05, 'triangle', 0.06); }
            }
            const push = (min - d) / 2;
            if (P.state !== 0) { P.x -= nx * push; P.z -= nz * push; }
            if (Q.state !== 0) { Q.x += nx * push; Q.z += nz * push; }
          }
        }
      }
    }

    function finishRoll(now) {
      const knocked = me.standingBefore - pins.filter((p) => p.state === 0).length;
      const before = bowlAnalyze(me.rolls);
      me.rolls.push(Math.max(0, knocked));
      const after = bowlAnalyze(me.rolls);
      const freshBefore = before.fresh;
      let label = String(knocked);
      if (knocked === 10 && freshBefore) { label = 'Strike!'; sfx('cheer', 0.8); sfx('fanfare', 0.6); }
      else if (!freshBefore && knocked === me.standingBefore && knocked > 0) { label = 'Spare!'; sfx('chime', 1); }
      else if (knocked === 0 && ball.gutter) label = 'Gutter';
      spawnFloat(label, new V3(LX(), 1.6, -6), label.endsWith('!') ? '#ffd23f' : '#ffffff');
      if (after.done) {
        me.best = Math.max(me.best, after.total);
        me.games += 1;
        showToast(`Game over: ${after.total}${after.total >= me.best && me.games > 1 ? ', your best yet!' : ''}`);
        me.phase = 'over';
        me.t0 = now;
      } else {
        rackPins(after.fresh);
        ballToRack();
      }
      state.dirtyBoard = true;
      state.hudDirty = true;
      forcePresence();
    }

    // ---------------------------------------------------------------- network
    L.presence = () => ({
      bo: [me.lane, ...me.rolls.slice(0, 21)],
      bp: pins.flatMap((p) => [Math.round(p.x * 100) / 100, Math.round(p.z * 100) / 100, p.state]),
      bw: [r3(ball.pos.x), r3(ball.pos.y), r3(ball.pos.z), me.phase === 'rolling' || me.phase === 'held' ? 1 : 0],
    });
    const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
    L.readPresence = (rec, pres, st) => {
      const a = Array.isArray(pres.bo) ? pres.bo : [];
      const lane = int(a[0], 0, NL - 1) ? a[0] : -1;
      const rolls = a.slice(1, 22).filter((n) => int(n, 0, 10));
      const was = bowlAnalyze(st.rolls || []);
      const now = bowlAnalyze(rolls);
      if (st.init && rolls.length > (st.rolls || []).length) {
        const last = rolls[rolls.length - 1];
        if (last === 10 && was.fresh) showToast(`${rec.name} bowled a strike!`);
        else if (now.done) showToast(`${rec.name} finished with ${now.total}`);
      }
      if (lane !== st.lane || rolls.length !== (st.rolls || []).length) state.dirtyBoard = true;
      Object.assign(st, { lane, rolls, total: now.total, frame: now.frame, done: now.done, init: true });
      const p = pres.bp;
      if (Array.isArray(p) && p.length === 30 && p.every(finite)) st.pins = p;
      const w = pres.bw;
      if (Array.isArray(w) && w.length === 4 && w.every(finite)) st.ball = w;
    };

    // ---------------------------------------------------------------- per frame
    const wrist = makeWristPanel();
    let statusKey = '';
    L.update = (dt, now) => {
      // hold the ball in VR
      if (me.phase === 'held') {
        const mh = myHands[me.side];
        if (mh.ok) { holdPoint(mh.pos, mh.quat, ball.pos); _off.set(0, -0.07, 0); ball.pos.add(_off); }
      }
      const steps = Math.max(1, Math.ceil(dt * 240)), h = dt / steps;
      for (let k = 0; k < steps; k++) physics(h);
      if (me.phase === 'rolling') {
        const b = ball, sp = Math.hypot(b.vel.x, b.vel.z);
        b.stillT = sp < 0.05 ? b.stillT + dt : 0;
        if (b.pos.z < PIT_Z - 0.3 || b.pos.y < -0.5 || b.stillT > 0.6 || now - me.rollStart > 10000) { me.phase = 'settle'; me.t0 = now; }
        if (b.pos.z > 4.6) { showToast('Roll it down the lane'); ballToRack(); }
      } else if (me.phase === 'settle') {
        const moving = pins.some((p) => (p.state === 1 || p.state === 2) && Math.hypot(p.vx, p.vz) > 0.05);
        if (now - me.t0 > 2600 || (!moving && now - me.t0 > 1500)) finishRoll(now);
      } else if (me.phase === 'over' && now - me.t0 > 20000) newGame();
      // a clear end: a sign over the lane until you start again
      overSign.visible = me.phase === 'over';
      if (overSign.visible) { overSign.position.set(LX(), 2.5 + Math.sin(now * 0.002) * 0.04, -3.5); drawOver(bowlAnalyze(me.rolls).total); }
      // draw my lane
      const lx0 = LX();
      const mine = me.lane < 0 ? 0 : me.lane;
      lanePins[mine].forEach((m, i) => { const p = pins[i]; poseMesh(m, lx0 + p.x, p.z, p.state, p.tilt, p.tdir); });
      ballMesh.visible = me.phase !== 'settle' || ball.pos.z > PIT_Z - 0.2;
      ballMesh.position.copy(ball.pos);
      const sp = Math.hypot(ball.vel.x, ball.vel.z);
      if (sp > 0.01 && me.phase === 'rolling') ballMesh.rotateOnWorldAxis(new V3(-ball.vel.z / sp, 0, ball.vel.x / sp), -sp * dt / BR);
      ballShadow.position.set(ball.pos.x, 0.004, ball.pos.z);
      ballShadow.visible = ball.pos.y < 0.9 && ballMesh.visible;
      // other lanes: whoever is bowling there, or an idle rack
      const owner = new Map();
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id];
        if (inMyLevel(rec) && st && st.lane >= 0 && st.lane !== mine && !owner.has(st.lane)) owner.set(st.lane, rec);
        if (rec.bowlBall) rec.bowlBall.visible = false;
      }
      if (typeof botLaneRec === 'function') { const br = botLaneRec(); if (br && br.lvState[L.id].lane !== mine && !owner.has(br.lvState[L.id].lane)) owner.set(br.lvState[L.id].lane, br); if (br && br.bowlBall) br.bowlBall.visible = false; }
      for (let i = 0; i < NL; i++) {
        if (i === mine) continue;
        const rec = owner.get(i), st = rec && rec.lvState[L.id];
        lanePins[i].forEach((m, k) => {
          if (st && st.pins) {
            const x = st.pins[k * 3], z = st.pins[k * 3 + 1], s = st.pins[k * 3 + 2];
            const moved = Math.hypot(x - SPOTS[k][0], z - SPOTS[k][1]);
            poseMesh(m, laneX(i) + x, z, s, s === 0 ? 0 : Math.PI / 2, moved > 0.01 ? Math.atan2(x - SPOTS[k][0], z - SPOTS[k][1]) : k * 1.3);
          } else poseMesh(m, laneX(i) + SPOTS[k][0], SPOTS[k][1], 0, 0, 0);
        });
        if (st && st.ball && st.ball[3] === 1) {
          if (!rec.bowlBall) { rec.bowlBall = new THREE.Mesh(ballGeo, new THREE.MeshLambertMaterial({ map: ballTex })); G.add(rec.bowlBall); }
          if (rec.color) rec.bowlBall.material.color.set(rec.color); else if (PLAYER_COLORS[rec.colorIdx]) rec.bowlBall.material.color.set(PLAYER_COLORS[rec.colorIdx].hex);
          rec.bowlBall.visible = true;
          rec.bowlBall.position.set(st.ball[0], st.ball[1], st.ball[2]);
        }
      }
      // monitors
      for (let i = 0; i < NL; i++) {
        if (i === mine) drawMonitor(i, state.name, PLAYER_COLORS[state.colorIdx].hex, me.rolls);
        else { const rec = owner.get(i), st = rec && rec.lvState[L.id]; drawMonitor(i, rec ? rec.name : '', rec && rec.color ? rec.color : rec && PLAYER_COLORS[rec.colorIdx] ? PLAYER_COLORS[rec.colorIdx].hex : '', st ? st.rolls : []); }
      }
      // readouts
      const r = bowlAnalyze(me.rolls);
      const top = me.phase === 'over' ? `Final: ${r.total}` : `Frame ${r.frame + 1}, ball ${r.ball + 1}`;
      const sub = me.phase === 'over' ? 'Press New game to bowl again' : `Score ${r.total}, lane ${mine + 1}`;
      wrist.update(top, '#ff9ad0', sub);
      if (ui.status) {
        const show = state.mode === 'flat';
        ui.status.hidden = !show;
        const key = top + sub;
        if (show && key !== statusKey) {
          statusKey = key;
          const a = document.createElement('span'); a.textContent = top;
          const b = document.createElement('span'); b.className = 'obj'; b.textContent = sub;
          ui.status.replaceChildren(a, b);
        }
      }
    };
    L.onExit = () => {
      wrist.show(false);
      if (me.phase === 'held') ballToRack();
      for (const rec of remotes.values()) if (rec.bowlBall) rec.bowlBall.visible = false;
      if (ui.status) ui.status.hidden = true;
      statusKey = '';
    };

    L.rowFor = (st, isMe) => {
      const rolls = isMe ? me.rolls : (st.rolls || []);
      const r = bowlAnalyze(rolls);
      return { total: r.total, frame: r.frame, text: r.done ? `${r.total} final` : `${r.total}, frame ${r.frame + 1}` };
    };
    L.sortRows = (a, b) => b.total - a.total;
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720, H = 460;
      g.fillStyle = '#100b1c'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ff5c8a'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, H - 8);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ff9ad0'; g.font = `800 64px ${DISPLAY}`; g.fillText('Moonlight Lanes', 36, 84);
      g.fillStyle = '#b9b0d8'; g.font = `400 24px ${BODY}`;
      g.fillText(me.best ? `Your best game: ${me.best}` : 'Ten frames, strikes and spares count extra', 36, 122);
      drawRows(g, rows, 180, 46, W);
      L.board.tex.needsUpdate = true;
    };
    L.board = makeBoard(G, 720, 460, 2.4, 1.533, HALF + 0.68, 2.0, 5.0, -Math.PI / 2, false);
    makeKiosk(L, -HALF - 0.1, 6.0, Math.PI / 2);
    const how = makeBoard(G, 720, 500, 2.0, 1.39, -HALF - 0.68, 1.9, 2.6, Math.PI / 2, false);
    function drawHow() {
      const g = how.g;
      g.fillStyle = '#100b1c'; g.fillRect(0, 0, 720, 500);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#4fc3f7'; g.font = `800 58px ${DISPLAY}`; g.fillText('How to play', 36, 78);
      const sections = [
        ['In VR', 'Grab your ball off the return beside your lane, step up and swing it down the lane. Let go low and smooth.'],
        ['In a browser', 'Look down the lane to aim, hold Space for power, and let go to roll.'],
        ['Lanes', 'Everyone gets their own lane and monitor. Ten frames per game.'],
      ];
      let y = 122;
      for (const [label, body] of sections) {
        g.fillStyle = '#ff9ad0'; g.font = `700 24px ${BODY}`; g.fillText(label, 36, y); y += 31;
        g.fillStyle = '#e4e0fa'; g.font = `400 24px ${BODY}`; y = wrapText(g, body, 36, y, 648, 30) + 10;
      }
      how.tex.needsUpdate = true;
    }
    drawHow();
    redraws.push(drawHow);
    L.hudActions = [{ label: () => 'New game', run: () => newGame() }];
    L.hints = [['Drag', 'aim'], ['Space', 'hold, then let go to roll'], ['A/D', 'line up']];
    L.clampPlayer = (p) => [clamp(p.x, -HALF + 0.2, HALF - 0.2) - p.x, clamp(p.z, -0.25, 8.3) - p.z];
    L.attract = (now) => {
      const a = reduceMotion ? 0 : Math.sin(now * 0.0001) * 0.4;
      camera.position.set(Math.sin(a) * 2, 2.2, 5);
      camera.lookAt(0, 0.4, -12);
    };
    rackPins(true);

    // ================================================================ STRIKE SALLY: a bowling rival on a free lane
    // She bowls a frame each time you (or the host, with friends) finish one. Her results come from a skill
    // profile (about a 26% strike rate and 40% spares); her ball and pins play out on her lane for everyone.
    const BOT = { name: 'Strike Sally', color: '#ff9ad0', on: prefs.bowlBot !== false, lane: -1, rolls: [], phase: 'idle', t0: 0, ballX: 0, ballZ: 0, ballOn: false, aim: 0, knock: [], pins: null, done: false, toldResult: false, req: null, reqSeq: 0 };
    L.bowlBot = BOT;
    const freshPins = () => SPOTS.flatMap(([x, z]) => [x, z, 0]);
    BOT.pins = freshPins();
    const herePeers = () => {
      const ids = [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      return ids.sort();
    };
    const isHost = () => herePeers()[0] === state.myPeer;
    function humanLanes() {
      const used = new Set();
      if (me.lane >= 0) used.add(me.lane);
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.lane >= 0) used.add(st.lane); }
      return used;
    }
    // an avatar at her lane, so she's someone
    const sally = buildAvatar(BOT.color, 1, 1, true, 2, 2);
    const sallyLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (g) => { rr(g, 4, 6, 248, 52, 26); g.fillStyle = 'rgba(20,16,32,0.8)'; g.fill(); g.fillStyle = '#ffffff'; g.font = `700 30px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Strike Sally', 128, 33); }).tex, transparent: true, depthWrite: false }));
    sallyLabel.scale.set(0.9, 0.225, 1); sallyLabel.position.y = 0.42;
    sally.add(sallyLabel);
    sally.visible = false;
    G.add(sally);
    const botRec = { name: BOT.name, color: BOT.color, colorIdx: -1, bowlBall: null, lvState: { [L.id]: { lane: -1, pins: null, ball: null, rolls: [] } } };
    function botLaneRec() {
      if (BOT.lane < 0) return null;
      const st = botRec.lvState[L.id];
      st.lane = BOT.lane; st.pins = BOT.pins; st.rolls = BOT.rolls;
      st.ball = [laneX(BOT.lane) + BOT.ballX, BR, BOT.ballZ, BOT.ballOn ? 1 : 0];
      return botRec;
    }
    L.botLaneRec = botLaneRec;

    // ---------------------------------------------------------------- how she bowls (host)
    const standing = () => [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter((k) => BOT.pins[k * 3 + 2] === 0);
    function decideKnock() {
      const up = standing(), fresh = up.length === 10;
      let n;
      if (fresh) {
        const r = rand();
        n = r < 0.26 ? 10 : r < 0.29 ? Math.floor(rand() * 3) : r < 0.45 ? 9 : r < 0.72 ? 8 : r < 0.9 ? 7 : 6;
      } else n = rand() < 0.4 ? up.length : Math.floor(rand() * up.length * 0.8);
      n = Math.min(n, up.length);
      // pins near the head pin and the pocket go first
      const ranked = up.map((k) => ({ k, w: rand() + (3 - Math.floor(k === 0 ? 0 : k < 3 ? 1 : k < 6 ? 2 : 3)) * 0.35 + (Math.abs(SPOTS[k][0] - BOT.aim) < 0.2 ? 0.3 : 0) })).sort((a, b) => b.w - a.w);
      return ranked.slice(0, n).map((o) => o.k);
    }
    function botRoll(now) {
      BOT.phase = 'rolling'; BOT.t0 = now;
      BOT.aim = (rand() - 0.5) * 0.25;
      BOT.ballX = 0; BOT.ballZ = 0.2; BOT.ballOn = true;
      BOT.knock = decideKnock();
    }
    function frameCount(rolls) { const r = bowlAnalyze(rolls); return r.done ? 10 : r.frame; }
    function botStep(now) {
      const lanes = humanLanes();
      // the highest lane nobody is using
      let lane = -1;
      if (BOT.on) for (let i = NL - 1; i >= 0; i--) if (!lanes.has(i)) { lane = i; break; }
      if (lane !== BOT.lane) { BOT.lane = lane; forcePresence(); }
      if (lane < 0) return;
      // a new game for you means a new game for her
      if (me.rolls.length === 0 && (BOT.rolls.length > 0) && BOT.phase === 'idle') { BOT.rolls = []; BOT.pins = freshPins(); BOT.done = false; BOT.toldResult = false; forcePresence(); }
      if (BOT.phase === 'idle') {
        if (BOT.sameFrame) { if (now > BOT.nextT) { BOT.sameFrame = false; botRoll(now); } }
        else {
          const owed = frameCount(me.rolls) - frameCount(BOT.rolls);
          if (owed > 0 && !BOT.done && now - BOT.t0 > 900) botRoll(now);
        }
      } else if (BOT.phase === 'rolling') {
        const k = Math.min(1, (now - BOT.t0) / 2300);
        BOT.ballZ = 0.2 + (HEAD_Z + 0.2 - 0.2) * k;
        BOT.ballX = BOT.aim * k;
        if (k >= 1) {
          // into the pins
          for (const p of BOT.knock) {
            const a = rand() * Math.PI * 2, d = 0.1 + rand() * 0.25;
            BOT.pins[p * 3] += Math.cos(a) * d; BOT.pins[p * 3 + 1] += Math.sin(a) * d * 0.5 - 0.1; BOT.pins[p * 3 + 2] = 2;
          }
          if (BOT.knock.length) crashAt(laneX(BOT.lane), BOT.knock.length);
          BOT.ballOn = false;
          BOT.phase = 'settle'; BOT.t0 = now;
          forcePresence();
        }
      } else if (BOT.phase === 'settle' && now - BOT.t0 > 1400) {
        const before = bowlAnalyze(BOT.rolls);
        BOT.rolls.push(BOT.knock.length);
        const after = bowlAnalyze(BOT.rolls);
        if (BOT.knock.length === 10 && before.fresh) spawnFloat('Strike!', new V3(laneX(BOT.lane), 1.6, -6), '#ff9ad0');
        if (after.done) { BOT.done = true; BOT.pins = freshPins(); }
        else if (after.fresh) BOT.pins = freshPins();
        else for (let p = 0; p < 10; p++) if (BOT.pins[p * 3 + 2] !== 0) BOT.pins[p * 3 + 2] = 3;
        // a second ball (or a 10th-frame bonus ball) follows straight on; otherwise wait for your next frame
        BOT.phase = 'idle'; BOT.t0 = now;
        if (!after.done && after.frame === before.frame) { BOT.sameFrame = true; BOT.nextT = now + 700; }
        state.dirtyBoard = true;
        forcePresence();
      }
      // when you're both done, say who won
      if (BOT.done && bowlAnalyze(me.rolls).done && !BOT.toldResult) {
        BOT.toldResult = true;
        const mine = bowlAnalyze(me.rolls).total, hers = bowlAnalyze(BOT.rolls).total;
        showToast(mine > hers ? `You beat Strike Sally ${mine} to ${hers}!` : mine < hers ? `Strike Sally wins ${hers} to ${mine}` : `A ${mine} to ${hers} tie with Strike Sally`);
      }
    }
    function crashAt(x, n) {
      const dist = Math.hypot(myHead.pos.x - x, myHead.pos.z - HEAD_Z);
      noiseBurst(0.5, Math.min(0.4, 0.1 + n * 0.03) / (1 + dist * 0.1), 2200, 0.7, 0.005);
    }

    // ---------------------------------------------------------------- per frame, network, scoreboard
    const baseUpdate = L.update, basePresence = L.presence, baseRead = L.readPresence, baseDraw = L.drawBoard;
    L.update = (dt, now) => {
      if (isHost()) botStep(now);
      baseUpdate(dt, now);
      const show = BOT.lane >= 0 && state.level === L.idx;
      sally.visible = show;
      if (show) {
        const atLine = BOT.phase === 'rolling' && now - BOT.t0 < 900;
        sally.position.set(laneX(BOT.lane) + 0.3, 1.55, atLine ? 0.6 : 2.0);
        sally.rotation.y = 0;
      }
    };
    const q2 = (x) => Math.round(x * 100) / 100;
    L.presence = () => {
      const p = basePresence();
      if (isHost()) p.bwb = { on: BOT.on ? 1 : 0, l: BOT.lane, r: BOT.rolls.slice(0, 21), b: [q2(BOT.ballX), q2(BOT.ballZ), BOT.ballOn ? 1 : 0], p: BOT.pins.map(q2) };
      if (BOT.req) p.bwr = BOT.req.slice();
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      baseRead(rec, pres, st);
      if (isHost() && Array.isArray(pres.bwr) && pres.bwr.length === 2 && (pres.bwr[0] === 0 || pres.bwr[0] === 1) && pres.bwr.join() !== st.bwr) {
        st.bwr = pres.bwr.join();
        if (st.bwrInit && BOT.on !== !!pres.bwr[0]) { BOT.on = !!pres.bwr[0]; state.hudDirty = true; forcePresence(); }
      }
      st.bwrInit = true;
      if (rec.peer !== herePeers()[0]) return;
      const b = pres.bwb;
      if (!b || typeof b !== 'object' || !Number.isInteger(b.l) || b.l < -1 || b.l >= NL || !Array.isArray(b.r) || !b.r.every((x) => Number.isInteger(x) && x >= 0 && x <= 10) || !Array.isArray(b.b) || b.b.length !== 3 || !b.b.every(finite) || !Array.isArray(b.p) || b.p.length !== 30 || !b.p.every(finite)) return;
      if ((b.on === 1) !== BOT.on) { BOT.on = b.on === 1; state.hudDirty = true; }
      if (b.r.length !== BOT.rolls.length) state.dirtyBoard = true;
      Object.assign(BOT, { lane: b.l, rolls: b.r.slice(), ballX: b.b[0], ballZ: b.b[1], ballOn: b.b[2] === 1, pins: b.p.slice() });
    };
    function setBot(on) {
      BOT.on = on; prefs.bowlBot = on; savePrefs();
      BOT.req = [on ? 1 : 0, ++BOT.reqSeq];
      showToast(on ? 'Strike Sally will bowl with you' : 'Strike Sally sits this one out');
      state.hudDirty = true; state.dirtyBoard = true;
      forcePresence();
    }
    L.setBowlBot = setBot;
    L.hudActions.push({ label: () => (BOT.on ? 'Bot: on' : 'Bot: off'), run: () => setBot(!BOT.on) });
    L.drawBoard = (rows) => {
      const all = rows.slice();
      if (BOT.lane >= 0) { const r = bowlAnalyze(BOT.rolls); all.push({ name: 'Strike Sally (bot)', color: BOT.color, me: false, total: r.total, frame: r.frame, text: r.done ? `${r.total} final` : `${r.total}, frame ${r.frame + 1}` }); }
      all.sort(L.sortRows);
      baseDraw(all);
    };
    L.bowlBotInternals = { botStep, decideKnock };
    return L;
  })();

