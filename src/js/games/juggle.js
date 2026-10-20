  // ================================================================ LEVEL: JUGGLE JAM
  // Juggling under a circus big top. In VR the balls are real: close your hand (grip or trigger) to catch or pick one
  // up, open it to throw. A hand can hold two. Slow-motion settings play the whole thing slower (same arcs, more time),
  // which is how you learn. One to five balls; your best streak for each is kept.
  // In a browser it's a timing game: the balls fly in a cascade and you catch each as it lands (A/left, D/right).
  const juggle = (() => {
    const L = newLevel(26);
    const G = L.group;
    const rand = mulberry32(3131);
    L.grabless = true;
    L.bounds = { minX: -7, maxX: 7, minZ: -6, maxZ: 5 };
    L.env = {
      sky: skyTexture([[0, '#2a0e14'], [0.5, '#4a1a22'], [1, '#1a080c']]),
      bg: 0x2a1014, fog: [0x2a1014, 14, 40], hemi: [0xffe0c0, 0x40201a, 0.75],
      sun: [0xffd8a8, 0.55], sunDir: new V3(0.3, 1, 0.4), ambient: [0x604030, 0.4], sprite: null,
    };
    const BR = 0.04, GRAV = 9.8, SPOT_GAP = 2.4, MAXN = 5;
    const SPEEDS = [{ name: 'Slow-mo', s: 0.45 }, { name: 'Steady', s: 0.7 }, { name: 'Real speed', s: 1 }];
    const BALL_COLS = [0xff5a5a, 0xffd23f, 0x4fc3f7, 0x8bd450, 0xb388ff];

    // ---------------------------------------------------------------- the big top
    const sawdust = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#c89a5a'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 3000; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,230,180,0.25)' : 'rgba(90,50,20,0.2)'; g.fillRect(rand() * 256, rand() * 256, 2, 1); }
    });
    sawdust.tex.wrapS = sawdust.tex.wrapT = THREE.RepeatWrapping; sawdust.tex.repeat.set(6, 6);
    const ring = new THREE.Mesh(new THREE.CircleGeometry(6.5, 48), new THREE.MeshLambertMaterial({ map: sawdust.tex }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; G.add(ring);
    const outer = new THREE.Mesh(new THREE.CircleGeometry(14, 48), lam(0x3a1a12)); outer.rotation.x = -Math.PI / 2; G.add(outer);
    // the ring's curb, red and white
    for (let k = 0; k < 24; k++) {
      const a = (k / 24) * Math.PI * 2, m = addBox(G, 1.75, 0.3, 0.25, lam(k % 2 ? 0xffffff : 0xd83a3a), Math.sin(a) * 6.6, 0.15, Math.cos(a) * 6.6);
      m.rotation.y = a;
    }
    // striped tent walls and roof
    const stripes = canvasTexture(256, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f4ecdc' : '#c8242c'; g.fillRect(i * 32, 0, 32, 64); } });
    stripes.tex.wrapS = THREE.RepeatWrapping; stripes.tex.repeat.set(6, 1);
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(13, 13, 6, 48, 1, true), new THREE.MeshLambertMaterial({ map: stripes.tex, side: THREE.BackSide }));
    wall.position.y = 3; G.add(wall);
    const roofTex = stripes.tex.clone(); roofTex.needsUpdate = true; roofTex.repeat.set(8, 1);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(13, 6, 48, 1, true), new THREE.MeshLambertMaterial({ map: roofTex, side: THREE.BackSide }));
    roof.position.y = 9; G.add(roof);
    addCyl(G, 0.15, 0.15, 12, 8, lam(0x8a6a4a), 0, 6, -9);
    // strings of lights
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfff0b0 });
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      for (let j = 1; j <= 9; j++) {
        const f = j / 10, r = 12.5 * f, y = 11.5 - f * 5.2;
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 4), bulbMat); b.position.set(Math.sin(a) * r, y, Math.cos(a) * r); G.add(b);
      }
    }
    const lamp = new THREE.PointLight(0xffd8a0, 0.8, 26, 1.4); lamp.position.set(0, 7, 0); G.add(lamp);

    // ---------------------------------------------------------------- your spot: a little table with the balls on pegs
    const racks = [];
    for (let k = 0; k < 4; k++) {
      const g = new THREE.Group();
      g.add(at(new THREE.Mesh(boxg(1.3, 0.05, 0.34), lam(0x6a3a22)), 0, 0.92, 0));
      for (const sx of [-0.6, 0.6]) g.add(at(new THREE.Mesh(cyl(0.025, 0.025, 0.92, 8), lam(0x4a2a18)), sx, 0.46, 0));
      for (let i = 0; i < MAXN; i++) g.add(at(new THREE.Mesh(cyl(0.035, 0.03, 0.03, 12), lam(0xe8c070)), -0.28 + i * 0.14, 0.96, 0));
      const pad = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.42, 32), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
      pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.006, 0.5); g.add(pad);
      g.visible = k === 0; G.add(g); racks.push(g);
    }
    const RACK_Z = -0.5;
    for (const g of racks) { g.position.z = RACK_Z; g.children[g.children.length - 1].position.z = -RACK_Z; }      // (the ring you stand in stays at your spot)
    const pegPos = (i, out) => out.set(J.spotX - 0.28 + i * 0.14, 0.96 + 0.03 + BR, RACK_Z);

    // ---------------------------------------------------------------- the balls
    const ballGeo = new THREE.SphereGeometry(BR, 16, 12);
    const balls = BALL_COLS.map((c, i) => {
      const m = new THREE.Mesh(ballGeo, new THREE.MeshLambertMaterial({ color: c, emissive: new THREE.Color(c).multiplyScalar(0.15) }));
      G.add(m);
      const sh = new THREE.Mesh(new THREE.CircleGeometry(BR * 1.1, 12), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2; G.add(sh);
      return { i, m, sh, pos: new V3(), vel: new V3(), mode: 'rack', hand: null, t: 0, from: new V3(), thrown: false };
    });
    const J = { count: 3, sp: 0, catches: 0, streak: 0, bestNow: 0, best: prefs.jgBest || {}, spotX: 0, lastDropT: 0, milestone: 0, cascadeShown: false };
    L.jg = J;
    const hands = { left: { balls: [], closed: false, wasClosed: false }, right: { balls: [], closed: false, wasClosed: false } };
    const S = () => SPEEDS[J.sp].s;
    const bestKey = () => `${J.count}:${J.sp}`;
    function toRack(b, i) { b.mode = 'rack'; b.hand = null; b.thrown = false; pegPos(i, b.pos); b.vel.set(0, 0, 0); }
    function resetBalls() {
      for (const h of Object.values(hands)) h.balls.length = 0;
      balls.forEach((b, i) => { toRack(b, i); b.m.visible = b.sh.visible = i < J.count; });
      J.streak = 0; J.milestone = 0; J.cascadeShown = false;
      FL.reset();
      state.dirtyBoard = true;
    }
    function ballsToHands() {
      resetBalls();
      const act = balls.slice(0, J.count);
      // right hand first, two at most in each
      act.forEach((b, i) => { const side = i % 2 === 0 ? 'right' : 'left'; if (hands[side].balls.length < 2) { hands[side].balls.push(b); b.mode = 'held'; b.hand = side; } });
      showToast(J.count > 4 ? 'Two in each hand; take the fifth from the table' : 'In your hands: throw from the hand with two');
      sfx('grab', 0.8);
    }
    function catchBall(b, side, fromAir) {
      const h = hands[side];
      b.mode = 'held'; b.hand = side; h.balls.push(b);
      if (fromAir && b.thrown) {
        J.catches += 1; J.streak += 1;
        if (J.streak > (J.best[bestKey()] || 0)) { J.best[bestKey()] = J.streak; prefs.jgBest = J.best; J.bestDirty = true; }
        if (J.streak % 10 === 0) { sfx('chime', 0.6); spawnFloat(`${J.streak}!`, b.pos.clone().add(new V3(0, 0.3, 0)), '#ffd23f'); }
        if (!J.cascadeShown && J.count >= 3 && J.streak >= J.count * 3) { J.cascadeShown = true; showToast(`That’s a ${J.count}-ball ${J.count % 2 ? 'cascade' : 'fountain'}!`); sfx('fanfare', 0.6); }
        state.dirtyBoard = true;
      }
      b.thrown = false;
      tone(500 + b.i * 60, 0, 0.05, 'sine', 0.12);
      if (state.mode === 'vr') haptic(vrHands[side], 0.35, 20);
    }
    function dropped(b) {
      b.mode = 'floor'; b.t = 0.7; b.vel.set(0, 0, 0); b.pos.y = BR;
      if (J.streak > 0) { showToast(J.streak >= 5 ? `Dropped! That was a streak of ${J.streak}` : 'Dropped one'); }
      J.streak = 0; J.milestone = 0; J.cascadeShown = false;
      sfx('thump', 0.4);
      state.dirtyBoard = true;
    }

    // ---------------------------------------------------------------- VR: your hands
    const _hp = new V3(), _off = new V3(), _vel = new V3();
    const closedNow = (side) => { const gp = vrHands[side].source && vrHands[side].source.gamepad; const b = (i) => !!(gp && gp.buttons && gp.buttons[i] && gp.buttons[i].pressed); return b(1) || b(0); };
    const heldPos = (side, slot, out) => out.copy(_off.set(slot ? 0.035 : -0.005, -0.03, -0.06 - slot * 0.02).applyQuaternion(myHands[side].quat)).add(myHands[side].pos);
    let aPrev = false;
    // (a hand can't catch the ball it has only just thrown, so closing it straight away for the next catch is fine)
    const justThrown = (b, side) => b.mode === 'air' && b.throwHand === side && jNow() - (b.throwT || 0) < 250;
    let fakeNow = 0;
    const jNow = () => fakeNow || performance.now();
    function vrHandsStep() {
      // A or X: the balls straight into your hands
      let a = false;
      for (const side of SIDES) { const gp = vrHands[side].source && vrHands[side].source.gamepad; if (gp && gp.buttons && gp.buttons[4] && gp.buttons[4].pressed) a = true; }
      if (a && !aPrev) ballsToHands();
      aPrev = a;
      for (const side of SIDES) {
        const h = hands[side], mh = myHands[side];
        if (!mh.ok) continue;
        h.closed = closedNow(side);
        const pressed = h.closed && !h.wasClosed, released = !h.closed && h.wasClosed;
        h.wasClosed = h.closed;
        if (pressed && h.balls.length < 2) {
          // catch or pick up the nearest ball within reach
          let best = null, bd = 0.24;
          for (const b of balls.slice(0, J.count)) { if (b.mode === 'held' || b.mode === 'return' || justThrown(b, side)) continue; const d = b.pos.distanceTo(mh.pos); if (d < bd) { bd = d; best = b; } }
          if (best) catchBall(best, side, best.mode === 'air');
        }
        if (released && h.balls.length) {
          const b = h.balls.shift();
          handVelocity(vrHands[side], _vel);
          heldPos(side, 0, b.pos);
          b.vel.copy(_vel); b.mode = 'air'; b.hand = null; b.thrown = true; b.throwHand = side; b.throwT = jNow();
          tone(300 + b.i * 40, 420, 0.06, 'triangle', 0.06);
        }
        // a closed hand also catches anything that flies into it
        if (h.closed && h.balls.length < 2) {
          for (const b of balls.slice(0, J.count)) if (b.mode === 'air' && !justThrown(b, side) && b.pos.distanceTo(mh.pos) < 0.13) { catchBall(b, side, true); if (h.balls.length >= 2) break; }
        }
        h.balls.forEach((b, slot) => heldPos(side, slot, b.pos));
      }
    }
    function physics(dt) {
      const s = S(), tdt = dt * s;
      const act = balls.slice(0, J.count);
      act.forEach((b, i) => {
        if (b.mode === 'air') {
          b.vel.y -= GRAV * tdt;
          b.pos.addScaledVector(b.vel, tdt);
          if (b.pos.y < BR || b.pos.distanceTo(_hp.set(J.spotX, 1.2, 0)) > 6) { b.pos.y = Math.max(BR, b.pos.y); dropped(b); }
        } else if (b.mode === 'floor') {
          b.t -= dt;
          if (b.t <= 0) { b.mode = 'return'; b.t = 0; b.from.copy(b.pos); }
        } else if (b.mode === 'return') {
          b.t += dt / 0.6;
          const k = Math.min(1, b.t), to = pegPos(i, _hp);
          b.pos.lerpVectors(b.from, to, k); b.pos.y += Math.sin(k * Math.PI) * 0.5;
          if (k >= 1) toRack(b, i);
        }
      });
    }

    // ---------------------------------------------------------------- browser: the timing game
    // Your two hands sit in front of you; the balls fly a cascade between them. Press the hand (A/left or D/right,
    // or click that side of the screen) as a ball lands in it. Miss one and they all start again.
    const FL = { t0: 0, run: false, restartAt: 0, d: 0.45 };
    const flatHands = { left: new V3(), right: new V3() };
    const handMeshes = {};
    for (const side of SIDES) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), new THREE.MeshLambertMaterial({ color: 0xf2d0b0 }));
      m.scale.set(1.3, 0.7, 1); m.visible = false; L.overlay.add(m); handMeshes[side] = m;
    }
    FL.reset = () => { FL.run = false; FL.restartAt = performance.now() + 900; FL.balls = []; };
    function flatStart(now) {
      const n = J.count, s = S();
      // each ball's flight, set so every arc peaks about 0.7 m up whatever the number of balls (slow-mo just takes longer)
      FL.F = Math.sqrt(8 * 0.7 / GRAV) / s;
      FL.d = FL.F / (n - 0.5);                // a throw every d seconds, alternating hands; each ball rests half a beat in the hand
      FL.t0 = now / 1000 + 0.6;
      FL.balls = [];
      for (let k = 0; k < n; k++) FL.balls.push({ b: balls[k], from: k % 2 === 0 ? 'right' : 'left', tThrow: FL.t0 + k * FL.d, state: 'wait', caughtAt: 0 });
      FL.run = true;
      J.streak = 0;
    }
    function flatPress(side, nowMs) {
      if (!FL.run) return;
      const t = (nowMs == null ? performance.now() : nowMs) / 1000, win = 0.16 / Math.sqrt(S());
      let best = null, bd = win;
      for (const fb of FL.balls) {
        if (fb.state !== 'air') continue;
        const to = fb.from === 'right' ? 'left' : 'right';
        if (to !== side) continue;
        const d = Math.abs(t - (fb.tThrow + FL.F));
        if (d < bd) { bd = d; best = fb; }
      }
      handMeshes[side].scale.set(1.5, 0.5, 1.1); setTimeout(() => handMeshes[side].scale.set(1.3, 0.7, 1), 120);
      if (!best) return;
      // caught: it rests half a beat, then goes back up from this hand
      best.state = 'held'; best.from = side; best.tThrow = best.tThrow + FL.F + FL.d * 0.5;
      best.b.thrown = true; best.b.pos.copy(flatHands[side]);
      catchBall(best.b, side, true);
      hands[side].balls = hands[side].balls.filter((x) => x !== best.b);
      best.b.mode = 'flat';
    }
    function flatStep(now) {
      camera.updateMatrixWorld(true);
      const cx = J.spotX;
      flatHands.left.set(cx - 0.24, 1.12, -0.2); flatHands.right.set(cx + 0.24, 1.12, -0.2);
      for (const side of SIDES) { handMeshes[side].visible = true; handMeshes[side].position.copy(flatHands[side]); }
      const t = now / 1000;
      if (!FL.run) {
        balls.forEach((b, i) => { if (i < J.count) { b.mode = 'flat'; b.pos.copy(flatHands[i % 2 === 0 ? 'right' : 'left']).add(_off.set(0, 0.05 + Math.floor(i / 2) * 0.08, 0)); } });
        if (now > FL.restartAt) flatStart(now);
        return;
      }
      const g = GRAV * S() * S();
      for (const fb of FL.balls) {
        const b = fb.b;
        if (fb.state === 'drop') { b.vel.y -= GRAV * 0.016; b.pos.addScaledVector(b.vel, 0.016); continue; }
        if (t < fb.tThrow) { b.pos.copy(flatHands[fb.from]); continue; }
        fb.state = 'air';
        const to = fb.from === 'right' ? 'left' : 'right', u = (t - fb.tThrow) / FL.F;
        if (u > 1 + (0.16 / Math.sqrt(S())) / FL.F) {
          // missed: it falls, and everything starts again in a moment
          fb.state = 'drop'; b.vel.set(0, -0.5, 0.6);
          if (J.streak > 0) showToast(J.streak >= 5 ? `Dropped! That was a streak of ${J.streak}` : 'Dropped one');
          if (J.count >= 3 && J.sp === 2 && J.streak >= 3) RECORDS.add(L, `b${J.count}`, J.streak);
          J.streak = 0; J.cascadeShown = false; state.dirtyBoard = true;
          sfx('thump', 0.4);
          FL.run = false; FL.restartAt = now + 1300;
          return;
        }
        const A = flatHands[fb.from], B = flatHands[to], T = FL.F;
        const tt = Math.min(u, 1.15) * T;
        b.pos.lerpVectors(A, B, Math.min(u, 1.15));
        b.pos.y = A.y + (g * T / 2) * tt - (g / 2) * tt * tt;
      }
    }
    // the mouse decides which hand a click is for
    const mouse = { x: 0 };
    renderer.domElement.addEventListener('pointermove', (e) => { const r = renderer.domElement.getBoundingClientRect(); mouse.x = (e.clientX - r.left) / r.width; });
    renderer.domElement.addEventListener('pointerdown', (e) => {
      if (state.level !== L.idx || state.mode !== 'flat') return;
      const r = renderer.domElement.getBoundingClientRect(); flatPress((e.clientX - r.left) / r.width < 0.5 ? 'left' : 'right');
    });
    L.onKey = (code) => {
      if (code === 'KeyA' || code === 'ArrowLeft' || code === 'KeyQ') { flatPress('left'); return true; }
      if (code === 'KeyD' || code === 'ArrowRight' || code === 'KeyE') { flatPress('right'); return true; }
      return false;
    };

    // ---------------------------------------------------------------- settings: buttons on the table, and up top in a browser
    function setCount(n) { J.count = clamp(n, 1, MAXN); resetBalls(); showToast(`${J.count} ball${J.count > 1 ? 's' : ''}`); state.hudDirty = true; }
    function nextSpeed() { J.sp = (J.sp + 1) % SPEEDS.length; resetBalls(); showToast(`${SPEEDS[J.sp].name}${J.sp < 2 ? ': the same arcs, more time to catch' : ''}`); state.hudDirty = true; }
    const tableBtns = [];
    function placeTableButtons() {
      // (made once, at the first spot; they follow your spot)
      const defs = [[-0.5, 0xff7a7a, 'Fewer', () => setCount(J.count - 1)], [-0.17, 0x8bd450, 'More', () => setCount(J.count + 1)], [0.17, 0xb388ff, 'Speed', nextSpeed], [0.5, 0xffd23f, 'To hands', ballsToHands]];
      for (const [dx, col, label, fn] of defs) tableBtns.push({ dx, btn: makeButton(L, new V3(dx, 0.98, RACK_Z + 0.12), col, label, fn, { pedestal: false }) });
    }
    placeTableButtons();
    function moveTableButtons() {
      for (const t of tableBtns) {
        const b = t.btn, x = J.spotX + t.dx;
        b.pos.x = x; b.mesh.position.x = x; b.plate.position.x = x;
      }
    }
    makeKiosk(L, -3.4, 2.2, Math.PI / 2);
    RECORDS.def(L, [3, 4, 5].map((n) => ({ k: `b${n}`, label: `Longest ${n}-ball streak (real speed)` })));
    L.hudActions = [
      { label: () => `Balls: ${J.count} ▸`, run: () => setCount(J.count >= MAXN ? 1 : J.count + 1) },
      { label: () => `Speed: ${SPEEDS[J.sp].name} ▸`, run: nextSpeed },
      { label: () => 'Catch left (A)', run: () => flatPress('left'), show: () => state.mode === 'flat' && matchMedia('(pointer: coarse)').matches },
      { label: () => 'Catch right (D)', run: () => flatPress('right'), show: () => state.mode === 'flat' && matchMedia('(pointer: coarse)').matches },
    ];
    L.hints = [['A / left', 'catch left'], ['D / right', 'catch right'], ['Click', 'that side’s hand']];
    L.hintsFor = () => (state.mode === 'flat' ? L.hints : [['Grip or trigger', 'close to catch'], ['Let go', 'throw'], ['A / X', 'balls to your hands']]);

    // ---------------------------------------------------------------- the board, and everyone's spots
    L.board = makeBoard(G, 1024, 512, 4.2, 2.1, 0, 3.0, -5.2, 0, false);
    let boardKey = '';
    function drawBoard() {
      const g = L.board.g, W = 1024, H = 512;
      g.fillStyle = '#2a0e14'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 64px ${DISPLAY}`; g.fillText('Juggle Jam', W / 2, 84);
      g.fillStyle = '#ffffff'; g.font = `800 150px ${DISPLAY}`; g.fillText(String(J.streak), W / 2, 260);
      g.fillStyle = '#f4d8c0'; g.font = `400 34px ${BODY}`; g.fillText('catches in a row', W / 2, 310);
      g.font = `700 40px ${BODY}`; g.fillStyle = '#ffffff';
      g.fillText(`${J.count} ball${J.count > 1 ? 's' : ''} · ${SPEEDS[J.sp].name} · best ${J.best[bestKey()] || 0}`, W / 2, 390);
      g.font = `400 28px ${BODY}`; g.fillStyle = '#f4d8c0';
      g.fillText(state.mode === 'vr' ? 'Close your hand to catch, open it to throw. A or X puts the balls in your hands.' : 'Press A or D (or click that side) as each ball lands in that hand', W / 2, 460, W - 60);
      L.board.tex.needsUpdate = true;
    }
    function spots() {
      const ids = [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      ids.sort();
      const n = Math.min(4, ids.length), k = Math.min(3, Math.max(0, ids.indexOf(state.myPeer)));
      return { n, k, x: (i) => (i - (n - 1) / 2) * SPOT_GAP };
    }
    function goToSpot() {
      const sp = spots();
      J.spotX = sp.x(sp.k);
      // (in a browser the camera sits where the game puts it, so just stand the body on the spot)
      if (state.mode !== 'vr') dolly.position.set(J.spotX, 0, 0);
      else { camera.getWorldPosition(_hp); dolly.position.x += J.spotX - _hp.x; dolly.position.z += 0 - _hp.z; }
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.3; }
      resetBalls(); moveTableButtons();
    }

    // ---------------------------------------------------------------- per frame
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (state.mode !== J.lastMode) { J.lastMode = state.mode; resetBalls(); }
      const sp = spots();
      racks.forEach((g, i) => { g.visible = i < Math.max(1, sp.n); g.position.x = sp.x(i); });
      const want = sp.x(sp.k);
      if (Math.abs(want - J.spotX) > 0.01 && here) goToSpot();
      if (here && state.mode === 'vr') { for (const s of SIDES) handMeshes[s].visible = false; vrHandsStep(); physics(dt); }
      else if (here && state.mode === 'flat') flatStep(now);
      else for (const s of SIDES) handMeshes[s].visible = false;
      for (const b of balls) {
        b.m.position.copy(b.pos);
        b.sh.position.set(b.pos.x, 0.008, b.pos.z);
        b.sh.material.opacity = clamp(0.3 - b.pos.y * 0.08, 0.05, 0.3);
      }
      if (J.bestDirty) { J.bestDirty = false; savePrefs(); }
      const key = `${J.streak}|${J.count}|${J.sp}|${J.best[bestKey()] || 0}|${state.mode}`;
      if (here && key !== boardKey) { boardKey = key; drawBoard(); }
      // other jugglers' balls
      for (const rec of remotes.values()) {
        const show = here && inMyLevel(rec) && rec.jgPos;
        if (!rec.jgG && show) {
          rec.jgG = new THREE.Group();
          rec.jgB = BALL_COLS.map((c) => { const m = new THREE.Mesh(ballGeo, new THREE.MeshLambertMaterial({ color: c })); rec.jgG.add(m); return m; });
          L.overlay.add(rec.jgG);
        }
        if (!rec.jgG) continue;
        rec.jgG.visible = !!show;
        if (!show) continue;
        const k = 1 - Math.exp(-dt * 14);
        rec.jgB.forEach((m, i) => { const p = rec.jgPos[i]; m.visible = !!p; if (p) m.position.lerp(_hp.set(p[0], p[1], p[2]), k); });
      }
    };
    L.flatCamera = () => {
      camera.position.set(0, 1.55, 0.65);
      camera.rotation.set(-0.16, 0, 0, 'YXZ');
      state.yaw = 0; state.pitch = -0.16;
      return true;
    };
    L.spawn = () => { dolly.position.set(0, 0, 0); camera.position.set(0, 1.6, 0); goToSpot(); };
    L.onEnter = () => { boardKey = ''; resetBalls(); };
    L.onExit = () => { for (const s of SIDES) handMeshes[s].visible = false; for (const rec of remotes.values()) if (rec.jgG) rec.jgG.visible = false; FL.run = false; };
    L.attract = (now) => {
      const a = reduceMotion ? 0 : now * 0.00008;
      camera.position.set(Math.sin(a) * 5, 2.6, Math.cos(a) * 5);
      camera.lookAt(0, 1.4, 0);
      // a little demo: three balls in a loop
      const t = now / 1000;
      balls.forEach((b, i) => {
        b.m.visible = i < 3;
        const ph = (t * 1.4 + i / 3) % 1, side = Math.floor(t * 1.4 + i / 3) % 2 ? 1 : -1;
        b.pos.set(-side * 0.25 + side * 0.5 * ph, 1.1 + Math.sin(ph * Math.PI) * 0.7, -0.5);
        b.m.position.copy(b.pos);
      });
    };

    // ---------------------------------------------------------------- network
    const q2 = (x) => Math.round(x * 100);
    L.presence = () => {
      const pos = balls.slice(0, J.count).map((b) => [q2(b.pos.x), q2(b.pos.y), q2(b.pos.z)]);
      return { jg: [J.count, J.sp, J.streak, J.best[bestKey()] || 0, J.catches], jgp: pos };
    };
    L.readPresence = (rec, pres, st) => {
      const a = pres.jg;
      if (Array.isArray(a) && a.length === 5 && a.every(Number.isInteger)) {
        if (!st.jg || st.jg[2] !== a[2]) state.dirtyBoard = true;
        st.jg = a;
      }
      const p = pres.jgp;
      rec.jgPos = Array.isArray(p) && p.length <= MAXN && p.every((x) => Array.isArray(x) && x.length === 3 && x.every(Number.isFinite)) ? p.map((x) => x.map((v) => v / 100)) : null;
    };
    L.rowFor = (st, isMe) => {
      const a = isMe ? [J.count, J.sp, J.streak, J.best[bestKey()] || 0] : st.jg || [3, 0, 0, 0];
      return { streak: a[2], text: `${a[2]} in a row · ${a[0]} ball${a[0] > 1 ? 's' : ''}` };
    };
    L.sortRows = (a, b) => (b.streak || 0) - (a.streak || 0);
    L.drawBoard = () => { boardKey = ''; };
    resetBalls();
    L.jgInternals = { __clock: (t) => { fakeNow = t; }, __vr: () => ({ myHands, vrHands }), __step: (dt) => { vrHandsStep(); physics(dt); }, J, balls, hands, SPEEDS, physics, catchBall, dropped, resetBalls, ballsToHands, flatPress, flatStep, FL, flatHands, setCount, nextSpeed };
    return L;
  })();
