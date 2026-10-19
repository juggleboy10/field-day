  // ================================================================ LEVEL: TWO-MINUTE DRILL (football)
  // You're the quarterback, two minutes on the clock, ball on your own 25. Pick a play, hike it, read the coverage
  // and throw before the rush gets home. Completions keep the clock running (hurry up and snap); incompletions,
  // out-of-bounds plays, spikes and timeouts stop it. Touchdowns are 7, field goals 3, and every score or turnover
  // gives you the ball back at your 25 until time runs out. With friends in the room, whoever starts the drill is the
  // quarterback and everyone else joins the play as a receiver or a defender (their choice), in place of a bot.
  // The quarterback's device runs the play; everyone else follows it, and their real positions catch, cover and tackle.
  // VR: A or X hikes, grip takes the ball, throw it for real (a little help guides a good throw to the receiver you
  // meant). Browser: Space hikes; then look at a receiver, hold Space and let go: a tap is a fast bullet, a long
  // hold is a soft lob over the coverage.
  const football = (() => {
    const L = newLevel(29);
    const G = L.group;
    const rand = mulberry32(2929);
    L.chargeKick = true;
    Object.defineProperty(L, 'walkSpeed', { get: () => (S && (S.phase === 'live' || S.phase === 'run' || S.phase === 'air' || S.phase === 'yac') ? (state.mode === 'vr' ? 6.2 : 4.6) : 3) });
    L.bounds = { minX: -26, maxX: 26, minZ: -60, maxZ: 22 };
    L.env = {
      sky: skyTexture([[0, '#0b1230'], [0.35, '#1d2a5a'], [0.48, '#3a4a7a'], [0.5, '#2a3a2a'], [1, '#101810']]),
      bg: 0x111a33, fog: [0x1a2440, 70, 260], hemi: [0xdfe8ff, 0x2a3a20, 0.8],
      sun: [0xffffff, 0.75], sunDir: new V3(0.3, 1, 0.4), ambient: [0x5a6a8a, 0.45], sprite: null,
    };
    const YD = 0.9144, HALF_W = 26.65 * YD, G_ACC = 9.8;
    const PLAYS = [
      // routes for the left wideout, the slot (right) and the right wideout, in yards: x toward the middle is +,
      // z downfield is -. "stop" means the receiver settles there (a curl) instead of running on.
      { name: 'Slants', desc: 'quick inside breaks', routes: [[[0, -3], [6, -8]], [[0, -2], [5, -7]], [[0, -3], [6, -8]]] },
      { name: 'Outs', desc: 'break to the sideline at 8', routes: [[[0, -9], [-7, -9]], [[0, -5], [5, -6]], [[0, -9], [-7, -9]]] },
      { name: 'Curls', desc: 'run 12, turn back to the ball', routes: [[[0, -13], [1, -11.5]], [[0, -7], [-2, -10], [-2, -9]], [[0, -13], [1, -11.5]]], stop: true },
      { name: 'Go deep', desc: 'everyone vertical', routes: [[[0, -40]], [[0, -12], [-8, -40]], [[0, -40]]] },
      // receivers clear out deep, the line holds longer: tuck it and run up the middle
      { name: 'QB Draw', desc: 'receivers clear out, you run it', routes: [[[0, -30]], [[0, -30]], [[0, -30]]], draw: true },
    ];
    const DIFFS = [
      { name: 'Rookie', vDef: 6.0, lag: 0.5, cushion: 3.6, rush: [4.6, 6.6], vRush: 4.2 },
      { name: 'Pro', vDef: 7.0, lag: 0.33, cushion: 2.4, rush: [3.3, 5.0], vRush: 5.0 },
      { name: 'All-Pro', vDef: 7.4, lag: 0.26, cushion: 1.7, rush: [2.7, 4.2], vRush: 5.6 },
    ];
    const V_REC = 7.6;

    // ---------------------------------------------------------------- the stadium
    // The field moves under you: the line of scrimmage is always at z = 0, you always throw toward -z.
    const field = new THREE.Group(); G.add(field);
    const grass = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#2f7a34'; g.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 3000; i++) { g.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,40,0,0.1)'; g.fillRect(rand() * 256, rand() * 256, 2, 2); }
    });
    grass.tex.wrapS = grass.tex.wrapT = THREE.RepeatWrapping; grass.tex.repeat.set(6, 24);
    // (local field z: own goal line at 0, the other goal line at -100 yards)
    const LZ = (yd) => -yd * YD;
    const turf = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2 + 12, 140 * YD), new THREE.MeshLambertMaterial({ map: grass.tex }));
    turf.rotation.x = -Math.PI / 2; turf.position.set(0, 0, LZ(50)); field.add(turf);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xf4f4f0 });
    const flat = (w, d, mat, x, z, y) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); m.rotation.x = -Math.PI / 2; m.position.set(x, y || 0.012, z); field.add(m); return m; };
    for (let yd = 0; yd <= 100; yd += 5) flat(HALF_W * 2, yd % 50 === 0 ? 0.2 : 0.12, lineMat, 0, LZ(yd));
    for (const sx of [-1, 1]) flat(0.2, 120 * YD, lineMat, sx * HALF_W, LZ(50));
    flat(HALF_W * 2, 0.2, lineMat, 0, LZ(-10)); flat(HALF_W * 2, 0.2, lineMat, 0, LZ(110));
    for (let yd = 1; yd < 100; yd++) if (yd % 5) for (const x of [-3.1, 3.1, -HALF_W + 0.6, HALF_W - 0.6]) flat(0.08, 0.6, lineMat, x, LZ(yd), 0.011);
    // end zones
    const ez = (label, col, zMid) => {
      const t = canvasTexture(1024, 256, (g) => { g.fillStyle = col; g.fillRect(0, 0, 1024, 256); g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = `900 150px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(label, 512, 136); });
      const m = flat(HALF_W * 2, 10 * YD - 0.25, new THREE.MeshLambertMaterial({ map: t.tex }), 0, zMid, 0.01);
      return m;
    };
    ez('HOME', '#2a4aa8', LZ(-5)).rotation.z = Math.PI;
    ez('END ZONE', '#c23a3a', LZ(105));
    // yard numbers
    for (let yd = 10; yd <= 90; yd += 10) {
      const n = yd <= 50 ? yd : 100 - yd;
      const t = canvasTexture(256, 128, (g) => { g.clearRect(0, 0, 256, 128); g.fillStyle = '#f4f4f0'; g.font = `800 110px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 128, 70); });
      for (const sx of [-1, 1]) {
        const m = flat(3.2, 1.6, new THREE.MeshBasicMaterial({ map: t.tex, transparent: true }), sx * (HALF_W - 6), LZ(yd), 0.013);
        m.rotation.z = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
      }
    }
    // goalposts at the back of each end zone
    const postMat = lam(0xffd23f);
    for (const zz of [LZ(110), LZ(-10)]) {
      addCyl(field, 0.1, 0.1, 3.05, 8, postMat, 0, 1.52, zz);
      addBox(field, 5.64, 0.12, 0.12, postMat, 0, 3.05, zz);
      for (const sx of [-1, 1]) addCyl(field, 0.06, 0.06, 6, 8, postMat, sx * 2.82, 6.05, zz);
    }
    L.GOAL_FROM_LINE = 10;
    // line of scrimmage (blue) and the first-down line (yellow): these stay with the ball, not the field
    const losLine = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, 0.14), new THREE.MeshBasicMaterial({ color: 0x4f8aff, transparent: true, opacity: 0.85 }));
    losLine.rotation.x = -Math.PI / 2; losLine.position.y = 0.02; G.add(losLine);
    const fdLine = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, 0.16), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9 }));
    fdLine.rotation.x = -Math.PI / 2; fdLine.position.y = 0.021; G.add(fdLine);
    // stands, crowd and lights (fixed around you, so the place always feels full)
    {
      const crowd = canvasTexture(256, 128, (g) => {
        g.fillStyle = '#20243a'; g.fillRect(0, 0, 256, 128);
        const cols = ['#d84a3a', '#2a4aa8', '#f4f4f0', '#ffd23f', '#8a8aa0'];
        for (let i = 0; i < 900; i++) { g.fillStyle = cols[Math.floor(rand() * cols.length)]; g.fillRect(rand() * 256, rand() * 128, 3, 4); }
      });
      crowd.tex.wrapS = crowd.tex.wrapT = THREE.RepeatWrapping; crowd.tex.repeat.set(10, 2);
      const cm = new THREE.MeshLambertMaterial({ map: crowd.tex });
      for (const sx of [-1, 1]) {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(170, 18), cm);
        s.position.set(sx * (HALF_W + 13), 7, -20); s.rotation.y = -sx * Math.PI / 2; s.rotation.x = 0; s.rotateX(-0.6); G.add(s);
        addBox(G, 2, 1.2, 170, lam(0x2a2d42), sx * (HALF_W + 5), 0.6, -20);
      }
      for (const [x, z] of [[-40, 20], [40, 20], [-40, -70], [40, -70]]) {
        addCyl(G, 0.4, 0.5, 30, 8, lam(0x6a6a7a), x, 15, z);
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
        glow.position.set(x, 30, z); glow.scale.set(14, 14, 1); G.add(glow);
      }
    }

    // ---------------------------------------------------------------- the players
    const OFF = '#3a6ad8', DEF = '#d84a3a';
    const helmetGeo = new THREE.SphereGeometry(0.158, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.6);
    const maskMat = lam(0xe8e4d8);
    function person(col, shirt, hat, face, crouch) {
      const g = buildAvatar(col, 0, face, true, 1, shirt);
      // a helmet with a stripe and a facemask
      const hm = new THREE.Mesh(helmetGeo, lam(new THREE.Color(col).multiplyScalar(0.8).getHex())); hm.position.y = 0.012; g.add(hm);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.02, 0.3), lam(0xf4f4f0)); stripe.position.set(0, 0.165, 0.01); g.add(stripe);
      for (const y of [-0.03, -0.075]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.014, 0.014), maskMat); bar.position.set(0, y, -0.15); g.add(bar); }
      for (const sx of [-1, 1]) { const side = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.08, 0.06), maskMat); side.position.set(sx * 0.1, -0.05, -0.125); g.add(side); }
      void hat;
      const legs = new THREE.Group();
      for (const sx of [-1, 1]) { const l = new THREE.Mesh(cyl(0.07, 0.06, 0.8, 8), lam(0xf4f4f0)); l.position.set(sx * 0.11, -1.2, 0); legs.add(l); }
      g.add(legs);
      g.userData.legs = legs.children;
      if (crouch) legs.scale.y = 0.55, legs.position.y = 0.36;
      G.add(g);
      return { g, x: 0, z: 0, vx: 0, vz: 0, yaw: 0, crouch: !!crouch };
    }
    const LINE = [-2.4, -1.2, 0, 1.2, 2.4].map((x, i) => Object.assign(person(OFF, 4, 3, i % 4, true), { hx: x }));
    const RUSH = [-1.8, -0.6, 0.6, 1.8].map((x, i) => Object.assign(person(DEF, 6, 3, (i + 1) % 4, true), { hx: x }));
    const REC = [-14, 7, 14].map((x, i) => Object.assign(person(OFF, 4, [1, 2, 0][i], [1, 2, 3][i]), { sx: x, side: x < 0 ? -1 : 1, i }));
    const COV = REC.map((r, i) => Object.assign(person(DEF, 6, [2, 0, 1][i], [0, 3, 2][i]), { man: r, i }));
    const SAF = Object.assign(person(DEF, 6, 1, 1), { safety: true });
    const DEFS = [...COV, SAF];
    // a ring under each receiver: who you're aiming at, and how open they are
    const ringFor = (p) => {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.62, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0, depthWrite: false }));
      r.rotation.x = -Math.PI / 2; r.position.y = 0.03; G.add(r); p.ring = r; return r;
    };
    REC.forEach(ringFor);
    // route lines, shown before the snap
    const routeMat = new THREE.LineBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.8 });
    const routeLines = REC.map(() => { const l = new THREE.Line(new THREE.BufferGeometry(), routeMat); G.add(l); return l; });

    // the football: a stretched ball with a white stripe
    const ball = new THREE.Group();
    const ballBody = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), lam(0x7a3a1a)); ballBody.scale.set(1, 1, 1.65); ball.add(ballBody);
    const lace = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.09), lam(0xffffff)); lace.position.y = 0.088; ball.add(lace);
    for (const z of [-0.1, 0.1]) { const st = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.008, 4, 16), lam(0xffffff)); st.position.z = z; ball.add(st); }
    G.add(ball);
    const ballShadow = makeShadow(G, 0.3);

    // ---------------------------------------------------------------- the game
    const S = {
      phase: 'idle', clock: 120, running: false, down: 1, toGo: 10, ballOn: 75, score: 0, tos: 3, play: 0, diff: 1,
      t: 0, snapT: 0, resultT: 0, msg: '', thrown: false, target: null, catcher: null, yacT: 0, sackT: 0, drives: 0, best: [0, 0, 0],
      bp: new V3(), bv: new V3(), held: null, pending: null, fg: null, plays: 0, completions: 0, attempts: 0, passYds: 0, tds: 0, ints: 0,
    };
    try { const b = prefs.fbBest; if (Array.isArray(b) && b.length === 3) S.best = b.map((x) => (Number.isFinite(x) ? x : 0)); } catch (e) { /* none yet */ }
    L.fb = S;

    // ================================================================ MULTIPLAYER
    // MP.qb: the peer whose drive I'm playing in (null: my own game, or none). MP.want: what I'd like to play when
    // someone else is quarterback (1 receiver, 2 defense, 0 watch). The quarterback hands out the spots.
    const MP = { qb: null, qbName: '', want: 1, slot: -1, role: 0, seenMsg: -1, msgSeq: 0, seenCatch: false, lastPh: '', snap: null };
    L.mp = MP;
    const PH = ['idle', 'pre', 'live', 'air', 'yac', 'run', 'dead', 'kick', 'over'];
    const following = () => !!MP.qb;
    const active = () => S.phase !== 'idle' && S.phase !== 'over';
    const humanRec = (peer) => { if (!peer) return null; const rec = remotes.get(peer); return rec && rec.lv === L.idx && rec.inGame && rec.hasH ? rec : null; };
    const goalZ = () => -S.ballOn * YD;
    const fdZ = () => -Math.min(S.toGo, S.ballOn) * YD;
    const D = () => DIFFS[S.diff];
    const ordinal = (n) => ['1st', '2nd', '3rd', '4th'][n - 1] || `${n}th`;
    const clockText = () => { const t = Math.max(0, Math.ceil(S.clock)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
    const downText = () => `${ordinal(S.down)} & ${S.toGo >= S.ballOn ? 'Goal' : S.toGo}`;
    const spotText = () => (S.ballOn > 50 ? `own ${100 - S.ballOn}` : S.ballOn === 50 ? 'the 50' : `their ${S.ballOn}`);

    // where a receiver is t seconds after the snap, running the route (exactly, so throws can lead them)
    function routePath(r) {
      const P = PLAYS[S.play], pts = [[r.sx, 0.3]];
      for (const [x, z] of P.routes[r.i]) pts.push([r.sx + x * YD * -r.side, 0.3 + z * YD]);
      return pts;
    }
    function routeAt(r, t, out) {
      const pts = r.path, P = PLAYS[S.play];
      let s = Math.max(0, t - 0.15) * V_REC;
      for (let k = 1; k < pts.length; k++) {
        const ax = pts[k - 1][0], az = pts[k - 1][1], bx = pts[k][0], bz = pts[k][1], l = Math.hypot(bx - ax, bz - az);
        if (s <= l) { out[0] = ax + (bx - ax) * s / l; out[1] = az + (bz - az) * s / l; return out; }
        s -= l;
      }
      const n = pts.length, ax = pts[n - 2][0], az = pts[n - 2][1], bx = pts[n - 1][0], bz = pts[n - 1][1], l = Math.hypot(bx - ax, bz - az) || 1;
      if (P.stop) { out[0] = bx; out[1] = bz; return out; }
      out[0] = clamp(bx + (bx - ax) / l * s, -HALF_W + 0.8, HALF_W - 0.8); out[1] = bz + (bz - az) / l * s;
      return out;
    }
    const _p = [0, 0], _p2 = [0, 0];

    function setFormation() {
      for (const p of LINE) { p.x = p.hx; p.z = 0.7; p.yaw = 0; }
      for (const p of RUSH) { p.x = p.hx; p.z = -0.7; p.yaw = Math.PI; p.beatT = 1e9; p.free = false; }
      for (const r of REC) { r.path = routePath(r); r.x = r.sx; r.z = 0.3; r.yaw = 0; r.caught = false; }
      for (const c of COV) { c.x = c.man.sx + c.man.side * -0.6; c.z = -D().cushion * YD - 1.5; c.yaw = Math.PI; c.react = 0; c.tx = c.x; c.tz = c.z; }
      SAF.x = 0; SAF.z = -14; SAF.yaw = Math.PI;
      field.position.z = (100 - S.ballOn) * YD;
      fdLine.position.z = fdZ();
      S.thrown = false; S.held = null; S.catcher = null; S.target = null; S.fg = null;
      S.bp.set(0, 0.25, 0.05); S.bv.set(0, 0, 0);
      drawRoutes(true);
      state.hudDirty = true;
    }
    function drawRoutes(show) {
      REC.forEach((r, i) => {
        const pts = r.path.map(([x, z]) => new V3(x, 0.05, z));
        if (!PLAYS[S.play].stop) { const n = pts.length, a = pts[n - 2], b = pts[n - 1], d = b.clone().sub(a).setY(0).normalize(); pts.push(b.clone().addScaledVector(d, 4)); }
        routeLines[i].geometry.dispose();
        routeLines[i].geometry = new THREE.BufferGeometry().setFromPoints(pts);
        routeLines[i].visible = show;
      });
    }
    function standQB() {
      dolly.position.set(0, 0, 5 * YD); dolly.rotation.set(0, 0, 0);
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.08; }
    }
    function newDrive() { S.ballOn = 75; S.down = 1; S.toGo = 10; S.drives += 1; S.running = false; setFormation(); }
    function startGame() {
      if (following()) { showToast(`${MP.qbName} is quarterback right now. You can start the next drill when theirs is over`); return; }
      S.gid = Date.now();
      Object.assign(S, { phase: 'pre', clock: 120, running: false, score: 0, tos: 3, drives: 0, completions: 0, attempts: 0, passYds: 0, rushYds: 0, tds: 0, ints: 0 });
      newDrive(); standQB();
      showToast('Two minutes on the clock. Ball on your 25. Go!');
      sfx('whistle', 1); forcePresence();
    }
    L.startGame = startGame;
    function choosePlay(i) {
      if (following()) return;
      if (S.phase !== 'pre' && S.phase !== 'idle') return;
      S.play = (i + PLAYS.length) % PLAYS.length;
      setFormation();
      showToast(`${PLAYS[S.play].name}: ${PLAYS[S.play].desc}`);
      sfx('click', 0.6);
    }
    L.choosePlay = choosePlay;
    function hike() {
      if (following()) return;
      if (S.phase === 'idle') { startGame(); return; }
      if (S.phase !== 'pre') return;
      S.phase = 'live'; S.snapT = 0; S.running = true;
      const [a, b] = D().rush;
      // one or two rushers beat their blocks somewhere in the window; the rest are held up
      const order = [0, 1, 2, 3].sort(() => rand() - 0.5);
      const hold = PLAYS[S.play].draw ? 2.2 : 0;
      RUSH[order[0]].beatT = a + hold + rand() * (b - a);
      RUSH[order[1]].beatT = a + hold + 0.6 + rand() * (b - a);
      sfx('thump', 0.6); tone(220, 180, 0.12, 'square', 0.12);
      drawRoutes(false);
      state.hudDirty = true;
    }
    L.hike = hike;
    function spike() {
      if (following()) return;
      if (S.phase !== 'pre' || !S.running || S.down >= 4) { if (S.phase === 'pre' && !S.running) showToast('The clock is already stopped'); return; }
      S.clock = Math.max(0, S.clock - 2); S.running = false;
      showToast('Spiked it: the clock stops'); sfx('thump', 0.7);
      S.down += 1; setFormation();
    }
    function timeout() {
      if (following()) return;
      if (S.phase !== 'pre' || !S.running) return;
      if (S.tos <= 0) { showToast('No timeouts left'); return; }
      S.tos -= 1; S.running = false;
      showToast(`Timeout! ${S.tos} left`); sfx('whistle', 0.8); state.hudDirty = true;
    }
    function fieldGoal() {
      if (following()) return;
      if (S.phase !== 'pre') return;
      const dist = S.ballOn + 17;
      if (dist > 57) { showToast(`A ${dist}-yard field goal? Too far. Get inside their 40`); return; }
      const p = dist <= 32 ? 0.97 : clamp(0.97 - (dist - 32) * 0.024, 0.35, 0.97);
      const good = rand() < p;
      S.phase = 'kick'; S.running = true;
      const from = new V3(0, 0.3, 7 * YD), to = new V3(good ? (rand() - 0.5) * 3.5 : (rand() < 0.5 ? -1 : 1) * (3.2 + rand() * 2), good ? 4.2 + rand() * 2 : 3.6 + rand(), -(S.ballOn + 10) * YD);
      S.fg = { from, to, t: 0, T: 1.2 + dist * 0.025, good, dist };
      sfx('thump', 1);
    }
    L.fieldGoal = fieldGoal;

    // ---------------------------------------------------------------- throwing
    const _v = new V3(), _q = new Q4(), _f = new V3();
    // the throw that reaches receiver r at catch height, with horizontal speed vh (lob slow, bullet fast)
    // where a receiver will be in T seconds: on the route for a bot, carrying on the way they're going for a person
    function recAt(r, T, out) {
      if (!r.human) return routeAt(r, S.snapT + T, out);
      out[0] = clamp(r.x + (r.svx || 0) * T * 0.85, -HALF_W + 0.5, HALF_W - 0.5); out[1] = r.z + (r.svz || 0) * T * 0.85;
      return out;
    }
    function passTo(r, from, vh) {
      let T = 0.6;
      for (let k = 0; k < 6; k++) { recAt(r, T, _p); T = clamp(Math.hypot(_p[0] - from.x, _p[1] - from.z) / vh, 0.25, 4); }
      recAt(r, T, _p);
      const dx = _p[0] - from.x, dz = _p[1] - from.z, y = 1.35 - from.y;
      return { v: new V3(dx / T, (y + 0.5 * G_ACC * T * T) / T, dz / T), T, at: [_p[0], _p[1]] };
    }
    function release(v, from) {
      S.thrown = true; S.held = null; S.phase = 'air'; S.attempts += 1;
      S.bp.copy(from); S.bv.copy(v); S.airT = 0; S.landAt = null;
      for (const d of DEFS) d.react = 0.25 + D().lag;
      sfx('whoosh', 0.8);
      state.hudDirty = true;
    }
    // the receiver you're looking at (browser)
    function lookTarget() {
      camera.getWorldQuaternion(_q); _f.set(0, 0, -1).applyQuaternion(_q); _f.y = 0; _f.normalize();
      let best = null, ba = 0.42;
      const qx = myHead.pos.x, qz = myHead.pos.z;
      for (const r of REC) {
        if (S.phase === 'live') recAt(r, 0.5, _p); else { _p[0] = r.x; _p[1] = r.z; }
        const dx = _p[0] - qx, dz = _p[1] - qz, d = Math.hypot(dx, dz) || 1, a = Math.acos(clamp((dx * _f.x + dz * _f.z) / d, -1, 1));
        if (a < ba) { ba = a; best = r; }
      }
      return best;
    }
    // pressure makes a throw less accurate
    function pressure() { let m = 9; for (const p of RUSH) m = Math.min(m, Math.hypot(p.x - myHead.pos.x, p.z - myHead.pos.z)); return clamp((4 - m) / 3, 0, 1); }
    function throwFlat(c) {
      if (S.phase === 'run') { showToast('You\u2019re past the line: keep running!'); return; }
      if (S.phase !== 'live' || S.thrown) return;
      const from = new V3(myHead.pos.x, myHead.pos.y - 0.25, myHead.pos.z - 0.3);
      const r = lookTarget();
      if (!r) {
        // nobody there: throw it where you look (throwing it away is fine)
        camera.getWorldQuaternion(_q); _f.set(0, 0, -1).applyQuaternion(_q);
        release(_f.clone().multiplyScalar(14 + c * 8).add(new V3(0, 3, 0)), from); return;
      }
      const vh = 24 - c * 11, pr = pressure();
      const p = passTo(r, from, vh);
      const err = 0.012 + pr * 0.1 + p.T * 0.008;
      p.v.x += (rand() - 0.5) * 2 * err * vh; p.v.z += (rand() - 0.5) * err * vh; p.v.y += (rand() - 0.5) * err * 6;
      S.target = r;
      release(p.v, from);
    }
    L.kick = (c) => {
      if (S.skipKick) { S.skipKick = false; return; }
      throwFlat(c);
    };
    L.onChargeStart = () => {
      if (following()) { S.skipKick = true; return; }
      // before the snap, Space hikes the ball (and the release that follows doesn't throw)
      if (S.phase === 'pre' || S.phase === 'idle') { S.skipKick = true; hike(); }
      else if (S.phase !== 'live' || S.thrown) S.skipKick = true;
    };
    L.throwLabel = () => (S.phase === 'live' ? 'Throw' : S.phase === 'run' ? 'Run!' : S.phase === 'pre' || S.phase === 'idle' ? 'Hike' : '…');
    // VR: take the ball in your hand, throw it for real
    L.onVRGrab = (h) => {
      if (following()) return false;
      if (S.phase !== 'live' || S.thrown || S.held) return false;
      if (myHands[h.side].pos.distanceTo(S.bp) > 0.5) return false;
      S.held = h.side; sfx('grab', 0.5); haptic(vrHands[h.side], 0.4, 30);
      return true;
    };
    L.onVRRelease = (h, vel) => {
      if (S.held !== h.side) return;
      const v = vel.clone().multiplyScalar(1.9);
      if (v.length() < 4 || S.phase === 'run') { S.held = null; return; }   // just let go (or past the line): it stays by you
      const from = S.bp.clone();
      // which receiver did you mean? Fly the throw, and see who's near where it comes down
      let best = null, bd = 1e9;
      for (const r of REC) {
        const vh = Math.hypot(v.x, v.z) || 1;
        const p = passTo(r, from, clamp(vh, 9, 28));
        const T = p.T, lx = from.x + v.x * T, lz = from.z + v.z * T;
        const d = Math.hypot(lx - p.at[0], lz - p.at[1]);
        if (d < bd) { bd = d; best = { r, p, vh }; }
      }
      if (best && bd < 5 + best.p.T * 2.5) {
        // a little help: most of the way to a perfect pass, with a touch of pressure error
        const k = 0.7, pr = pressure();
        v.multiplyScalar(1 - k).addScaledVector(best.p.v, k);
        v.x += (rand() - 0.5) * pr * 2; v.y += (rand() - 0.5) * pr;
        S.target = best.r;
      }
      haptic(vrHands[h.side], 0.5, 40);
      release(v, from);
    };

    // ---------------------------------------------------------------- plays ending
    function endPlay(kind, opts) {
      const o = opts || {};
      if (S.phase === 'dead' || S.phase === 'over') return;
      S.phase = 'dead'; S.resultT = 0; S.pending = null;
      let gain = 0, msg = '', col = '#ffffff', keepRunning = true, newDown = true;
      if (kind === 'inc') { msg = o.msg || 'Incomplete'; keepRunning = false; sfx('whistle', 0.7); }
      else if (kind === 'sack') { gain = -Math.max(1, Math.round(o.z / YD)); msg = `Sacked! ${gain} yards`; col = '#ff6a5a'; sfx('thump', 1); sfx('hurt', 0.6); }
      else if (kind === 'int') { msg = 'Intercepted!'; col = '#ff6a5a'; S.ints += 1; sfx('buzzer', 0.8); S.pending = 'turnover'; keepRunning = false; }
      else if (kind === 'run' || kind === 'runoob') {
        gain = Math.round(-o.z / YD); S.rushYds = (S.rushYds || 0) + gain;
        if (kind === 'runoob') keepRunning = false;
        msg = `QB run for ${gain} yard${Math.abs(gain) === 1 ? '' : 's'}${kind === 'runoob' ? ', out of bounds' : ''}`;
        col = '#8bd450'; sfx('thump', 0.9);
      } else if (kind === 'tackle' || kind === 'oob') {
        gain = Math.round(-o.z / YD); S.completions += 1; S.passYds += gain;
        if (kind === 'oob') keepRunning = false;
        msg = `${o.name} for ${gain} yard${Math.abs(gain) === 1 ? '' : 's'}${kind === 'oob' ? ', out of bounds' : ''}`;
        col = '#8bd450'; sfx('mitt', 0.8);
      } else if (kind === 'td') {
        if (o.run) S.rushYds = (S.rushYds || 0) + S.ballOn; else { S.completions += 1; S.passYds += S.ballOn; }
        S.tds += 1; S.score += 7;
        msg = 'TOUCHDOWN! +7'; col = '#ffd23f'; sfx('fanfare', 1); setTimeout(() => sfx('cheer', 1), 250); S.pending = 'score'; keepRunning = false;
        spawnFloat('TOUCHDOWN!', new V3(0, 3, -6), '#ffd23f');
      }
      if (kind !== 'td' && kind !== 'int') {
        S.ballOn = clamp(S.ballOn - gain, 1, 99);
        if (gain >= S.toGo) { S.down = 1; S.toGo = Math.min(10, S.ballOn); msg += '. First down!'; sfx('chime', 0.8); }
        else { S.toGo -= gain; S.down += 1; if (S.down > 4) { msg += '. Turnover on downs'; S.pending = 'turnover'; keepRunning = false; newDown = false; } }
      }
      void newDown;
      S.running = keepRunning && S.running;
      S.msg = msg; MP.msgSeq += 1;
      showToast(msg);
      spawnFloat(msg.split('.')[0], new V3(0, 2.6, -4), col);
      forcePresence(); state.hudDirty = true; state.dirtyBoard = true;
    }
    L.endPlay = endPlay;
    function afterPlay() {
      if (S.clock <= 0) { gameOver(); return; }
      if (S.pending === 'score' || S.pending === 'turnover') { showToast(S.pending === 'score' ? 'Kickoff: your ball again at the 25' : 'The defense took over. Get it back: ball on your 25'); newDrive(); }
      else setFormation();
      S.pending = null;
      S.phase = 'pre';
      standQB();
    }
    function gameOver() {
      S.phase = 'over'; S.running = false;
      const isBest = S.score > S.best[S.diff];
      if (isBest) { S.best[S.diff] = S.score; prefs.fbBest = S.best.slice(); savePrefs(); }
      showToast(`Time! Final: ${S.score} points${isBest && S.score ? ', a new best!' : ''} (${S.completions}/${S.attempts}, ${S.passYds} passing, ${S.rushYds || 0} rushing, ${S.tds} TD)`);
      sfx(S.score ? 'cheer' : 'buzzer', 1);
      forcePresence(); state.hudDirty = true; state.dirtyBoard = true;
    }

    // ---------------------------------------------------------------- one step of the play
    const near = (a, x, z, d) => Math.hypot(a.x - x, a.z - z) < d;
    const moveTo = (p, tx, tz, v, dt) => {
      const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
      if (d < 1e-3) { p.vx = p.vz = 0; return; }
      const s = Math.min(d, v * dt);
      p.vx = dx / d * v; p.vz = dz / d * v;
      p.x += dx / d * s; p.z += dz / d * s;
      p.yaw = Math.atan2(-dx, -dz);
    };
    function step(dt) {
      const live = S.phase === 'live' || S.phase === 'air' || S.phase === 'yac' || S.phase === 'run';
      if (S.phase === 'kick' || live || ((S.phase === 'pre' || S.phase === 'dead') && S.running)) S.clock = Math.max(0, S.clock - dt);
      if (S.phase === 'pre' && S.clock <= 0) { gameOver(); return; }
      if (live) S.snapT += dt;
      const qx = myHead.pos.x, qz = myHead.pos.z;
      // friends playing a receiver or a defender: their spot follows them
      for (const p of [...REC, ...COV]) {
        if (!p.human) continue;
        const rec = humanRec(p.human);
        if (!rec) { p.human = null; continue; }
        const hp = rec.tgt.h.pos, px = p.x, pz = p.z;
        p.x = hp.x; p.z = hp.z; p.hy = hp.y;
        p.vx = (p.x - px) / dt; p.vz = (p.z - pz) / dt;
        const k = Math.min(1, dt * 6); p.svx = (p.svx || 0) + (p.vx - (p.svx || 0)) * k; p.svz = (p.svz || 0) + (p.vz - (p.svz || 0)) * k;
        if (Math.hypot(p.vx, p.vz) > 0.3) p.yaw = Math.atan2(-p.vx, -p.vz);
      }
      // the line: blockers hold the rushers up until one beats his man
      if (live) {
        if (S.phase !== 'run') RUSH.forEach((p, i) => {
          if (S.snapT > p.beatT && !S.thrown) p.free = true;
          if (p.free && S.phase === 'live') moveTo(p, qx, qz, D().vRush, dt);
          else if (S.phase === 'live') { p.x = p.hx + Math.sin(S.snapT * 3 + i) * 0.15; p.z = Math.min(1.6, -0.6 + S.snapT * 0.25); }
          else moveTo(p, p.x, p.z - 0.5, 1, dt);
        });
        LINE.forEach((p, i) => {
          const r = RUSH[clamp(i, 0, 3)];
          if (S.phase === 'live' && !r.free) { p.x = p.hx + Math.sin(S.snapT * 3 + i) * 0.12; p.z = Math.min(2.6, 0.7 + S.snapT * 0.25); }
          else if (S.phase === 'live') moveTo(p, p.x, Math.min(3.2, p.z + 0.4), 1.2, dt);
        });
        // over the line with the ball: it's a run now
        if (S.phase === 'live' && !S.thrown && qz < -0.3) { S.phase = 'run'; S.runT = 0; showToast('Scramble! Run for it'); sfx('whoosh', 0.7); for (const d of DEFS) d.react = 0.35 + D().lag; for (const d of RUSH) d.shed = 0; state.hudDirty = true; }
        if (S.phase === 'run') {
          S.runT += dt;
          // everyone on defense comes after you (the coverage once they notice); your blockers get in the way of the rushers
          for (const d of DEFS) { d.react -= dt; if (d.react <= 0 && !d.human) moveTo(d, qx, qz, D().vDef * 0.95, dt); }
          // rushers still blocked take a moment to shed the block (on a draw the line opens a hole up the middle)
          RUSH.forEach((d, i) => {
            if (d.free) { moveTo(d, qx, qz, D().vRush, dt); return; }
            d.shed = (d.shed || 0) + dt;
            if (d.shed > 1.1 + D().lag) { d.free = true; return; }
            if (PLAYS[S.play].draw) { d.x += (d.hx * 1.9 - d.x) * Math.min(1, dt * 2); LINE[clamp(i + (i > 1 ? 1 : 0), 0, 4)].x += (d.hx * 1.9 - LINE[clamp(i + (i > 1 ? 1 : 0), 0, 4)].x) * Math.min(1, dt * 2); }
          });
          for (const d of [...DEFS, ...RUSH]) if (Math.hypot(d.x - qx, d.z - qz) < (d.free || !RUSH.includes(d) ? 0.85 : 0.45)) { endPlay('run', { z: qz }); if (state.mode === 'vr') for (const sd of SIDES) haptic(vrHands[sd], 1, 160); return; }
          if (qz <= goalZ()) { endPlay('td', { run: true }); return; }
          if (Math.abs(qx) > HALF_W) { endPlay('runoob', { z: qz }); return; }
        }
        // a sack: a free rusher gets to you while you still have the ball
        if (S.phase === 'live' && !S.thrown) for (const p of RUSH) if (p.free && Math.hypot(p.x - qx, p.z - qz) < 0.9) { endPlay('sack', { z: Math.max(qz, 0.5) }); if (state.mode === 'vr') for (const sd of SIDES) haptic(vrHands[sd], 1, 200); return; }
      }
      // receivers and their defenders
      if (live) {
        for (const r of REC) if (r !== S.catcher && !r.human) { routeAt(r, S.snapT, _p); const dx = _p[0] - r.x, dz = _p[1] - r.z; r.vx = dx / dt; r.vz = dz / dt; if (Math.hypot(dx, dz) > 0.01) r.yaw = Math.atan2(-dx, -dz); r.x = _p[0]; r.z = _p[1]; }
        for (const c of COV) {
          if (S.phase === 'run' || c.human) continue;
          if (S.phase === 'air' && S.target && c.react <= 0 && near(c, S.landAt[0], S.landAt[1], 9)) { moveTo(c, S.landAt[0], S.landAt[1], D().vDef + 0.4, dt); continue; }
          if (S.phase === 'yac' && S.catcher) { moveTo(c, S.catcher.x, S.catcher.z, D().vDef + 0.3, dt); continue; }
          c.react -= dt;
          if (c.man.human) { _p2[0] = c.man.x; _p2[1] = c.man.z; } else routeAt(c.man, Math.max(0, S.snapT - D().lag), _p2);
          moveTo(c, _p2[0] - c.man.side * 0.3 * 0, _p2[1] - D().cushion * YD * 0.6, D().vDef, dt);
        }
        // the safety stays deep over the deepest receiver
        let deep = REC[0]; for (const r of REC) if (r.z < deep.z) deep = r;
        if (S.phase === 'run') { /* chasing you */ }
        else if (S.phase === 'yac' && S.catcher) moveTo(SAF, S.catcher.x, S.catcher.z, D().vDef + 0.4, dt);
        else if (S.phase === 'air' && S.landAt && SAF.react <= 0 && near(SAF, S.landAt[0], S.landAt[1], 12)) moveTo(SAF, S.landAt[0], S.landAt[1], D().vDef, dt);
        else { SAF.react -= dt; moveTo(SAF, deep.x * 0.6, Math.min(-12, deep.z - 6), D().vDef * 0.85, dt); }
      }
      // the ball
      if ((S.phase === 'live' || S.phase === 'run') && !S.thrown) {
        if (state.mode === 'vr' && S.held) { const mh = myHands[S.held]; S.bp.copy(mh.pos).add(_v.set(0, 0, -0.06).applyQuaternion(mh.quat)); }
        else if (state.mode === 'vr') { const want = new V3(myHead.pos.x + 0.15, myHead.pos.y - 0.45, myHead.pos.z - 0.32); S.bp.lerp(want, Math.min(1, dt * 8)); }
        else S.bp.set(myHead.pos.x + 0.22, myHead.pos.y - 0.35, myHead.pos.z - 0.35);
      } else if (S.phase === 'air') stepBall(dt);
      else if (S.phase === 'yac') stepYac(dt);
      else if (S.phase === 'kick') stepKick(dt);
      else if (S.phase === 'dead') { S.resultT += dt; if (S.bp.y > 0.12) { S.bv.y -= G_ACC * dt; S.bp.addScaledVector(S.bv, dt); if (S.bp.y < 0.12) { S.bp.y = 0.12; S.bv.set(0, 0, 0); } } if (S.resultT > 2.4) afterPlay(); }
      else if (S.phase === 'pre' || S.phase === 'idle') S.bp.set(0, 0.25, 0.05);
      // anywhere past the line with the ball before you throw: you can't run it here, so you're held behind the line
    }
    function stepBall(dt) {
      S.airT += dt;
      for (const d of DEFS) d.react -= dt;
      const prev = S.bp.clone();
      S.bv.y -= G_ACC * dt;
      S.bp.addScaledVector(S.bv, dt);
      if (S.target) S.landAt = S.landAt || passTo(S.target, prev, Math.max(6, Math.hypot(S.bv.x, S.bv.z))).at;
      else S.landAt = [S.bp.x + S.bv.x, S.bp.z + S.bv.z];
      // defenders first: a ball through a defender is picked off or knocked down
      for (const d of DEFS) {
        const dist = reach(S.bp, d, 0.3);
        if (dist < 0.62 && S.airT > 0.25) {
          if (rand() < (d.human ? 0.55 : 0.42)) { S.ballCarrier = d; endPlay('int'); spawnFloat('Picked off!', new V3(d.x, 2.6, d.z), '#ff6a5a'); return; }
          S.bv.set((rand() - 0.5) * 4, 3, (rand() - 0.5) * 4); S.batted = true; tone(300, 200, 0.08, 'square', 0.15);
          endPlayLater('inc', 'Broken up!');
          return;
        }
      }
      for (const r of REC) {
        if (reach(S.bp, r, 0.5) < 1.1) {
          const contested = DEFS.some((d) => reach(S.bp, d, 0.3) < 1.4);
          if (rand() < (contested ? (r.human ? 0.68 : 0.58) : 0.97)) { catchIt(r); return; }
          S.bv.multiplyScalar(-0.2); S.bv.y = 2;
          endPlayLater('inc', contested ? 'Broken up!' : 'Dropped it!');
          return;
        }
      }
      if (Math.abs(S.bp.x) > HALF_W + 1 || S.bp.y < 0.1) endPlay('inc', { msg: Math.abs(S.bp.x) > HALF_W ? 'Incomplete, out of bounds' : 'Incomplete' });
    }
    function endPlayLater(kind, msg) { endPlay(kind, { msg }); }
    // how close the ball is to a player: their body, or for a person, their real hands (a hand counts for `hand` extra)
    function reach(b, p, hand) {
      let d = capsuleDist(b, p);
      const rec = p.human && humanRec(p.human);
      if (rec) {
        d = Math.hypot(b.x - p.x, b.z - p.z, b.y - clamp(b.y, Math.max(0.3, (p.hy || 1.6) - 1.5), (p.hy || 1.6) + 0.15));
        if (rec.hasL) d = Math.min(d, rec.tgt.l.pos.distanceTo(b) + 0.55 - hand);
        if (rec.hasR) d = Math.min(d, rec.tgt.r.pos.distanceTo(b) + 0.55 - hand);
      }
      return d;
    }
    function capsuleDist(b, p) {
      const y = clamp(b.y, 0.4, 2.3);
      return Math.hypot(b.x - p.x, b.z - p.z, (b.y - y) * 1.0);
    }
    function catchIt(r) {
      S.catcher = r; r.caught = true; S.phase = 'yac'; S.yacT = 0.4 + rand() * 1.6; MP.catchSeq = (MP.catchSeq || 0) + 1;
      sfx('mitt', 1);
      spawnFloat('Caught!', new V3(r.x, 2.6, r.z), '#8bd450');
      state.hudDirty = true;
    }
    function stepYac(dt) {
      const r = S.catcher;
      S.yacT -= dt;
      if (r.human) {
        // a friend with the ball: they run it themselves; bots chase and tackle, so can a friend on defense
        S.bp.set(r.x + 0.2, Math.max(1.0, (r.hy || 1.6) - 0.5), r.z - 0.2);
        if (r.z <= goalZ()) { endPlay('td'); return; }
        if (Math.abs(r.x) > HALF_W) { endPlay('oob', { z: r.z, name: recName(r) }); return; }
        for (const d of DEFS) if (Math.hypot(d.x - r.x, d.z - r.z) < (d.human ? 0.9 : 0.8)) { endPlay('tackle', { z: r.z, name: recName(r) }); return; }
        if (S.yacT < -12) endPlay('tackle', { z: r.z, name: recName(r) });
        return;
      }
      // run downfield, drifting away from the nearest defender
      let nd = null, ndd = 1e9;
      for (const d of DEFS) { const dd = Math.hypot(d.x - r.x, d.z - r.z); if (dd < ndd) { ndd = dd; nd = d; } }
      let ax = 0, az = -1;
      if (nd && ndd < 5) { ax = (r.x - nd.x) / ndd * 0.6; }
      moveTo(r, r.x + ax * 3, r.z + az * 3, V_REC * 0.92, dt);
      S.bp.set(r.x + 0.2, 1.1, r.z - 0.2);
      if (r.z <= goalZ()) { endPlay('td'); return; }
      if (Math.abs(r.x) > HALF_W) { endPlay('oob', { z: r.z, name: recName(r) }); return; }
      if ((nd && ndd < 0.8) || S.yacT <= 0 && nd && ndd < 2.2) { endPlay('tackle', { z: r.z, name: recName(r) }); }
      if (S.yacT < -6) endPlay('tackle', { z: r.z, name: recName(r) });
    }
    const recName = (r) => (r.human && humanRec(r.human) ? humanRec(r.human).name : ['Left wideout', 'Slot', 'Right wideout'][r.i]);
    function stepKick(dt) {
      const k = S.fg; k.t += dt;
      const u = Math.min(1, k.t / k.T);
      S.bp.lerpVectors(k.from, k.to, u); S.bp.y = k.from.y + (k.to.y - k.from.y) * u + 4 * (8 + k.dist * 0.1) * u * (1 - u);
      if (u >= 1) {
        S.phase = 'dead'; S.resultT = 0; S.running = false;
        if (k.good) { S.score += 3; S.msg = `Field goal is good from ${k.dist}! +3`; sfx('cheer', 1); spawnFloat('IT’S GOOD!', new V3(0, 3, -6), '#ffd23f'); }
        else { S.msg = `No good from ${k.dist}`; sfx('buzzer', 0.8); }
        S.pending = k.good ? 'score' : 'turnover'; MP.msgSeq += 1;
        showToast(S.msg); forcePresence(); state.dirtyBoard = true; state.hudDirty = true;
      }
    }

    // ---------------------------------------------------------------- drawing
    const _hq = new Q4(), _e = new THREE.Euler();
    function drawPerson(p, now, run) {
      // linemen stay low in their stance (so you can see over them); a rusher who's beaten his man stands up
      p.g.position.set(p.x, p.crouch && !p.free ? 1.18 : 1.62, p.z);
      if (p.crouch) { const up = !!p.free; p.g.children.forEach((c) => { if (c.isGroup && c.children.length === 2 && c.children[0].geometry && c.children[0].geometry.type === 'CylinderGeometry') { c.scale.y = up ? 1 : 0.55; c.position.y = up ? 0 : 0.36; } }); }
      p.g.rotation.y = p.yaw;
      const sp = run ? Math.hypot(p.vx || 0, p.vz || 0) : 0, w = sp > 0.5 ? Math.sin(now * 0.018 + p.x) * 0.5 : 0;
      p.g.userData.legs.forEach((l, i) => { l.rotation.x = i ? w : -w; });
      p.g.position.y += sp > 0.5 ? Math.abs(Math.sin(now * 0.018 + p.x)) * 0.05 : 0;
    }
    function draw(now) {
      const live = S.phase === 'live' || S.phase === 'air' || S.phase === 'yac' || S.phase === 'run';
      for (const p of [...LINE, ...RUSH, ...REC, ...DEFS]) { p.g.visible = !p.human && !p.mine; if (p.g.visible) drawPerson(p, now, live); }
      ball.position.copy(S.bp);
      if (S.phase === 'air' || S.phase === 'kick') {
        const v = S.phase === 'air' ? S.bv : _v.subVectors(S.fg.to, S.fg.from);
        if (v.lengthSq() > 0.01) ball.quaternion.setFromUnitVectors(FWD, _v.copy(v).normalize());
        ball.rotateZ(now * 0.03);
      } else if (state.mode === 'vr' && S.held) ball.quaternion.copy(myHands[S.held].quat);
      else ball.quaternion.identity();
      ballShadow.position.set(S.bp.x, 0.02, S.bp.z);
      // rings: in a browser, the receiver you're looking at; colour shows how open they are
      const look = state.mode === 'flat' && !following() && (S.phase === 'live' || S.phase === 'pre') && !PLAYS[S.play].draw ? lookTarget() : null;
      for (const r of REC) {
        if (following() && !r.mine) { r.ring.material.opacity = 0; continue; }
        let sep = 9; for (const d of DEFS) sep = Math.min(sep, Math.hypot(d.x - r.x, d.z - r.z));
        const show = (live && S.phase !== 'run') && !S.thrown || r === look || r === S.target && S.phase === 'air';
        r.ring.position.set(r.x, 0.03, r.z);
        r.ring.material.opacity = show ? (r === look || r === S.target ? 0.95 : 0.45) : 0;
        r.ring.material.color.setHex(sep > 2.2 ? 0x8bd450 : sep > 1.2 ? 0xffd23f : 0xff6a5a);
        r.ring.scale.setScalar(r === look || r === S.target ? 1.3 : 1);
      }
    }

    // ---------------------------------------------------------------- the scoreboard and the call sheet
    const sbC = canvasTexture(1024, 512);
    const sb = new THREE.Mesh(new THREE.PlaneGeometry(14, 7), new THREE.MeshBasicMaterial({ map: sbC.tex }));
    sb.position.set(0, 14, -75); G.add(sb);
    addBox(G, 0.6, 10.5, 0.6, lam(0x2b2d42), -5, 5.25, -75.4); addBox(G, 0.6, 10.5, 0.6, lam(0x2b2d42), 5, 5.25, -75.4);
    let sbKey = '';
    function drawScoreboard() {
      const key = [S.phase, S.score, clockText(), S.down, S.toGo, S.ballOn, S.tos, S.diff, S.play].join('|');
      if (key === sbKey) return; sbKey = key;
      const g = sbC.g;
      g.fillStyle = '#0c0f1a'; g.fillRect(0, 0, 1024, 512);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 10; g.strokeRect(5, 5, 1014, 502);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.font = `900 64px ${DISPLAY}`; g.fillText('TWO-MINUTE DRILL', 512, 64);
      g.fillStyle = '#ff5a4a'; g.font = `900 150px ${DISPLAY}`; g.fillText(clockText(), 300, 210);
      g.fillStyle = '#ffffff'; g.font = `900 150px ${DISPLAY}`; g.fillText(String(S.score), 780, 210);
      g.fillStyle = '#9aa4c8'; g.font = `700 34px ${BODY}`; g.fillText('TIME', 300, 120); g.fillText('POINTS', 780, 120);
      g.fillStyle = '#ffffff'; g.font = `800 52px ${DISPLAY}`;
      g.fillText(S.phase === 'idle' ? 'Press Hike to start' : S.phase === 'over' ? 'FINAL' : `${downText()}  ·  ball on ${spotText()}`, 512, 340);
      g.fillStyle = '#9aa4c8'; g.font = `600 36px ${BODY}`;
      g.fillText(`Timeouts ${'●'.repeat(S.tos)}${'○'.repeat(3 - S.tos)}   ·   ${DIFFS[S.diff].name} defense   ·   best ${S.best[S.diff]}`, 512, 420);
      sbC.tex.needsUpdate = true;
    }
    // a call sheet stand beside you: the plays, hike, spike, timeout, field goal (press them in VR, or use the HUD)
    {
      const x = -2.5, z0 = 3.0;
      addBox(G, 0.5, 0.9, 3.4, lam(0x2b2d42), x - 0.15, 0.45, z0 + 1.6);
      PLAYS.forEach((P, i) => makeButton(L, new V3(x, 1.0, z0 - 0.4 + i * 0.4), [0xffd23f, 0x4fc3f7, 0x8bd450, 0xff7ac8, 0xff9a3a][i], P.name, () => choosePlay(i), { faceYaw: Math.PI / 2, pedestal: false }));
      makeButton(L, new V3(x, 1.0, z0 + 1.75), 0xff7a3a, 'Hike', () => hike(), { faceYaw: Math.PI / 2, pedestal: false });
      makeButton(L, new V3(x, 1.0, z0 + 2.15), 0xb388ff, 'Spike', () => spike(), { faceYaw: Math.PI / 2, pedestal: false });
      makeButton(L, new V3(x, 1.0, z0 + 2.55), 0xe8e4d8, 'Timeout', () => timeout(), { faceYaw: Math.PI / 2, pedestal: false });
      makeButton(L, new V3(x, 1.0, z0 + 2.95), 0xffd23f, 'Field goal', () => fieldGoal(), { faceYaw: Math.PI / 2, pedestal: false });
      makeButton(L, new V3(x, 1.0, z0 + 3.35), 0xe5453a, 'New game', () => startGame(), { faceYaw: Math.PI / 2, pedestal: false });
    }
    makeKiosk(L, 3.6, 7.5, -Math.PI / 2);
    L.board = makeBoard(G, 720, 460, 3, 1.92, 4.2, 2.2, 3.4, -Math.PI / 2);
    const hudPlate = makePlate(camera, 'Ready', 0.6, 0.09, new V3(0, -0.22, -0.6), 0, { bg: '#0c0f1a', fg: '#ffffff', size: 0.55 });
    hudPlate.material.depthTest = false; hudPlate.renderOrder = 999; hudPlate.visible = false;
    let hudKey = '';
    const statusLine = () => (following() ? `${clockText()}  \u00B7  ${downText()}  \u00B7  ${spotText()}  \u00B7  ${S.score} pts  \u00B7  QB ${MP.qbName}  \u00B7  you: ${MP.role === 1 ? 'receiver' : MP.role === 2 ? 'defense' : 'watching'}` : S.phase === 'idle' ? 'Two-Minute Drill: Hike to start' : S.phase === 'over' ? `Final: ${S.score} points` : `${clockText()}  ·  ${downText()}  ·  ${spotText()}  ·  ${S.score} pts  ·  ${PLAYS[S.play].name}`);


    // ---------------------------------------------------------------- multiplayer: the quarterback's side
    const PEOPLE = [...LINE, ...RUSH, ...REC, ...COV, SAF];
    const q2 = (x) => Math.round(x * 100) / 100;
    // hand out the receiver and defender spots to the friends who want them (only between plays)
    function assignSpots() {
      if (S.phase === 'live' || S.phase === 'air' || S.phase === 'yac' || S.phase === 'run') return;
      const here = [...remotes.values()].filter((rec) => rec.lv === L.idx && rec.inGame && rec.hasH).sort((a, b) => (a.peer < b.peer ? -1 : 1));
      const want = (rec) => { const st = rec.lvState[L.id]; return st && st.fw && st.fw[1] === S.gid ? st.fw[0] : st && st.fw ? st.fw[0] : 1; };
      for (const [list, kind, order] of [[REC, 1, [1, 0, 2]], [COV, 2, [1, 0, 2]]]) {
        const keep = new Set(here.filter((rec) => want(rec) === kind).map((rec) => rec.peer));
        for (const p of list) if (p.human && !keep.has(p.human)) p.human = null;
        for (const peer of keep) {
          if (list.some((p) => p.human === peer)) continue;
          const i = order.find((k) => !list[k].human);
          if (i !== undefined) { list[i].human = peer; const rec = remotes.get(peer); if (rec) { const pp = list[i]; pp.x = rec.tgt.h.pos.x; pp.z = rec.tgt.h.pos.z; } }
        }
      }
    }
    function snapshot() {
      const p = [];
      for (const q of PEOPLE) p.push(q2(q.x), q2(q.z), q2(q.yaw));
      return {
        g: S.gid, ph: PH.indexOf(S.phase), c: Math.round(S.clock * 10), s: S.score, d: S.down, t: S.toGo, o: S.ballOn, to: S.tos, pl: S.play, df: S.diff,
        b: [q2(S.bp.x), q2(S.bp.y), q2(S.bp.z), q2(S.bv.x), q2(S.bv.y), q2(S.bv.z)], p, f: RUSH.reduce((m, q, i) => m | (q.free ? 1 << i : 0), 0),
        h: [...REC, ...COV].map((q) => q.human || ''), m: [MP.msgSeq, S.msg || ''], k: [MP.catchSeq || 0, S.catcher ? S.catcher.i : -1], n: state.name || 'Player',
      };
    }

    // ---------------------------------------------------------------- multiplayer: everyone else's side
    const int = (x, lo, hi) => Number.isInteger(x) && x >= lo && x <= hi;
    const num = (x) => typeof x === 'number' && Number.isFinite(x) && Math.abs(x) < 500;
    function validSnap(q) {
      return q && typeof q === 'object' && int(q.g, 1, 1e14) && int(q.ph, 0, PH.length - 1) && int(q.c, 0, 2000) && int(q.s, 0, 9999) && int(q.d, 1, 5) && int(q.t, -99, 99) && int(q.o, 1, 99)
        && int(q.to, 0, 3) && int(q.pl, 0, PLAYS.length - 1) && int(q.df, 0, DIFFS.length - 1) && Array.isArray(q.b) && q.b.length === 6 && q.b.every(num)
        && Array.isArray(q.p) && q.p.length === PEOPLE.length * 3 && q.p.every(num) && int(q.f, 0, 15) && Array.isArray(q.h) && q.h.length === 6 && q.h.every((x) => typeof x === 'string' && x.length < 80)
        && Array.isArray(q.m) && int(q.m[0], 0, 1e9) && typeof q.m[1] === 'string' && Array.isArray(q.k) && int(q.k[0], 0, 1e9) && int(q.k[1], -1, 2);
    }
    // where I should line up for my spot
    function mySpot() {
      if (MP.role === 1 && MP.slot >= 0) return { x: REC[MP.slot].sx, z: 0.9, yaw: 0, label: ['the left wideout', 'the slot receiver', 'the right wideout'][MP.slot] };
      if (MP.role === 2 && MP.slot >= 0) return { x: COV[MP.slot].man.sx, z: -6, yaw: Math.PI, label: `covering the ${['left wideout', 'slot', 'right wideout'][MP.slot]}` };
      return { x: HALF_W + 2.5, z: 2, yaw: Math.PI / 2, label: 'watching from the sideline' };
    }
    function goToSpot() {
      const sp = mySpot();
      camera.getWorldPosition(_v);
      dolly.position.x += sp.x - _v.x; dolly.position.z += sp.z - _v.z;
      if (state.mode !== 'vr') { state.yaw = sp.yaw; state.pitch = -0.05; }
    }
    function applySnap(q, now) {
      const prevPh = S.phase;
      Object.assign(S, { phase: PH[q.ph], clock: q.c / 10, score: q.s, down: q.d, toGo: q.t, ballOn: q.o, tos: q.to, diff: q.df, gid: q.g });
      if (S.play !== q.pl) { S.play = q.pl; for (const r of REC) r.path = routePath(r); }
      S.bp.set(q.b[0], q.b[1], q.b[2]); S.bv.set(q.b[3], q.b[4], q.b[5]);
      PEOPLE.forEach((pp, i) => { pp.tx = q.p[i * 3]; pp.tz = q.p[i * 3 + 1]; pp.tyaw = q.p[i * 3 + 2]; if (pp.x === undefined || Math.hypot(pp.tx - pp.x, pp.tz - pp.z) > 6) { pp.x = pp.tx; pp.z = pp.tz; } });
      RUSH.forEach((pp, i) => { pp.free = !!(q.f & (1 << i)); });
      // which spot is mine, and who else has one
      MP.slot = -1; MP.role = 0;
      [...REC, ...COV].forEach((pp, i) => { pp.human = q.h[i] && q.h[i] !== state.myPeer ? q.h[i] : null; pp.mine = q.h[i] === state.myPeer; if (pp.mine) { MP.slot = i % 3; MP.role = i < 3 ? 1 : 2; } });
      field.position.z = (100 - S.ballOn) * YD;
      // news from the quarterback
      if (MP.seenMsg >= 0 && q.m[0] !== MP.seenMsg && q.m[1]) { showToast(q.m[1]); spawnFloat(q.m[1].split('.')[0], new V3(0, 2.6, -4), '#ffffff'); }
      MP.seenMsg = q.m[0];
      if (q.k[0] !== MP.catchSeq && MP.catchSeq !== undefined && q.k[1] >= 0 && REC[q.k[1]].mine) { showToast('You caught it! Run!'); sfx('mitt', 1); if (state.mode === 'vr') for (const sd of SIDES) haptic(vrHands[sd], 0.7, 80); }
      MP.catchSeq = q.k[0]; MP.carrier = q.k[1];
      // lining up for the next play
      if (S.phase === 'pre' && prevPh !== 'pre') {
        goToSpot();
        if (MP.role === 1) { drawRoutes(false); routeLines[MP.slot].visible = true; }
        else drawRoutes(false);
      }
      if (S.phase === 'live' && prevPh === 'pre') { drawRoutes(false); if (MP.role === 1) showToast('Hike! Run your route and get open'); else if (MP.role === 2) showToast('Hike! Stay with your man'); }
      state.hudDirty = true;
    }
    function followerFrame(dt, now) {
      const k = 1 - Math.exp(-dt * 12);
      for (const pp of PEOPLE) {
        if (pp.tx === undefined) continue;
        pp.vx = (pp.tx - pp.x) * 8; pp.vz = (pp.tz - pp.z) * 8;
        pp.x += (pp.tx - pp.x) * k; pp.z += (pp.tz - pp.z) * k;
        let dy = pp.tyaw - pp.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2; pp.yaw += dy * k;
      }
      // the ball flies between updates; if I'm the one carrying it, it's in my hands
      if (S.phase === 'air') { S.bv.y -= G_ACC * dt; S.bp.addScaledVector(S.bv, dt); }
      if (S.phase === 'yac' && MP.carrier >= 0 && REC[MP.carrier].mine) S.bp.set(myHead.pos.x + 0.2, myHead.pos.y - 0.55, myHead.pos.z - 0.2);
      fdLine.position.z = fdZ();
      // my lining-up spot
      const sp = mySpot(), r0 = REC[0].ring;
      void r0;
      spotRing.visible = S.phase === 'pre' && MP.role > 0 && Math.hypot(myHead.pos.x - sp.x, myHead.pos.z - sp.z) > 1.0;
      spotRing.position.set(sp.x, 0.03, sp.z);
    }
    const spotRing = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 28), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9, depthWrite: false }));
    spotRing.rotation.x = -Math.PI / 2; spotRing.visible = false; G.add(spotRing);
    // join whoever's quarterback (the earliest drive running in this room)
    function pickQB() {
      let best = null;
      for (const rec of remotes.values()) {
        const st = rec.lvState[L.id];
        if (rec.lv !== L.idx || !rec.inGame || !st || !st.fq || Date.now() - st.fqT > 3000) continue;
        const ph = PH[st.fq.ph];
        if (ph === 'idle' || ph === 'over') continue;
        if (!best || st.fq.g < best.g || (st.fq.g === best.g && rec.peer < best.peer)) best = { g: st.fq.g, peer: rec.peer, name: rec.name };
      }
      // my own drive wins if it started first
      if (best && !following() && active() && S.gid && S.gid < best.g) best = null;
      if (best && best.peer !== MP.qb) {
        const was = following();
        if (!was && active()) showToast(`${best.name} is already playing quarterback: you're joining their drive`);
        MP.qb = best.peer; MP.qbName = best.name; MP.seenMsg = -1; MP.catchSeq = undefined;
        S.phase = 'idle'; S.held = null;
        const st = remotes.get(best.peer).lvState[L.id];
        applySnap(st.fq, performance.now());
        goToSpot();
        const sp = mySpot();
        showToast(`${best.name} is quarterback. You're ${sp.label}${MP.role === 1 ? ': run your route (the yellow line) and catch it' : MP.role === 2 ? ': stay with your man, knock it down or pick it off' : ''}`);
      } else if (!best && following()) {
        MP.qb = null; MP.slot = -1; MP.role = 0;
        for (const pp of [...REC, ...COV]) { pp.human = null; pp.mine = false; }
        S.phase = 'idle'; spotRing.visible = false;
        setFormation();
        showToast('That drive is over. Start your own, or wait for the next one');
      }
    }

    // ---------------------------------------------------------------- per frame
    let aPrev = false;
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (here) pickQB();
      if (here && !following() && active()) assignSpots();
      if (here && following()) followerFrame(dt, now);
      else if (here && S.phase !== 'idle' && S.phase !== 'over') {
        // substeps, so a slow frame plays at the same speed
        const n = Math.max(1, Math.ceil(dt / 0.02));
        for (let i = 0; i < n && S.phase !== 'over'; i++) step(dt / n);
      }
      // VR: A or X hikes
      if (here && state.mode === 'vr') {
        let a = false;
        for (const s of SIDES) { const gp = vrHands[s].source && vrHands[s].source.gamepad; if (gp && gp.buttons && gp.buttons[4] && gp.buttons[4].pressed) a = true; }
        if (a && !aPrev && !following() && (S.phase === 'pre' || S.phase === 'idle' || S.phase === 'over')) { if (S.phase === 'over') startGame(); else hike(); }
        aPrev = a;
        let bb = false;
        for (const s2 of SIDES) { const gp = vrHands[s2].source && vrHands[s2].source.gamepad; if (gp && gp.buttons && gp.buttons[5] && gp.buttons[5].pressed) bb = true; }
        if (bb && !MP.bPrev && following()) cycleRole();
        MP.bPrev = bb;
      }
      losLine.position.z = 0;
      fdLine.position.z = fdZ(); fdLine.visible = S.phase !== 'idle' && S.toGo < S.ballOn;
      draw(now);
      drawScoreboard();
      if (here) {
        const txt = statusLine();
        if (state.mode === 'vr') { hudPlate.visible = true; if (txt !== hudKey) { hudKey = txt; hudPlate.userData.draw(txt); } }
        else { hudPlate.visible = false; if (ui.status) { ui.status.hidden = false; if (txt !== hudKey) { hudKey = txt; ui.status.textContent = txt; } } }
      } else hudPlate.visible = false;
    };
    // before you throw you stay behind the line
    L.clampPlayer = (p) => {
      let dx = 0, dz = 0;
      if (p.x < -HALF_W) dx = -HALF_W - p.x; else if (p.x > HALF_W) dx = HALF_W - p.x;
      if (p.z > 20) dz = 20 - p.z;
      return [dx, dz];
    };
    L.onKey = (code) => {
      if (/^Digit[1-5]$/.test(code)) { choosePlay(Number(code.slice(5)) - 1); return true; }
      if (code === 'KeyT') { timeout(); return true; }
      if (code === 'KeyK') { spike(); return true; }
      if (code === 'KeyG') { fieldGoal(); return true; }
      return false;
    };
    const ROLE_NAMES = ['Watching', 'Receiver', 'Defense'];
    function cycleRole() {
      MP.want = (MP.want + 1) % 3;
      showToast(`Next play you'll be: ${ROLE_NAMES[MP.want]}`);
      forcePresence(); state.hudDirty = true;
    }
    L.hudActions = [
      { label: () => (S.phase === 'idle' || S.phase === 'over' ? 'Start drill' : 'New game'), run: () => startGame(), show: () => !following() },
      { label: () => `You: ${ROLE_NAMES[MP.want]} \u25B8`, run: () => cycleRole(), show: () => following() || [...remotes.values()].some((rec) => rec.lv === L.idx && rec.inGame) },
      { label: () => `Play: ${PLAYS[S.play].name} \u25B8`, run: () => choosePlay(S.play + 1), show: () => !following() },
      { label: () => 'Spike', run: () => spike(), show: () => !following() && S.phase === 'pre' && S.running },
      { label: () => `Timeout (${S.tos})`, run: () => timeout(), show: () => !following() && S.phase === 'pre' && S.running },
      { label: () => 'Field goal', run: () => fieldGoal(), show: () => !following() && S.phase === 'pre' && S.ballOn <= 40 },
      { label: () => `Defense: ${DIFFS[S.diff].name} \u25B8`, show: () => !following(), run: () => { if (S.phase !== 'idle' && S.phase !== 'over') { showToast('Change the defense between games'); return; } S.diff = (S.diff + 1) % DIFFS.length; setFormation(); state.hudDirty = true; } },
    ];
    L.hintsFor = () => (following()
      ? (MP.role === 1 ? [['Yellow line', 'your route'], [state.mode === 'flat' ? 'WASD + Shift' : 'Stick', 'run'], ['Catch', state.mode === 'vr' ? 'get your hands to the ball' : 'be where the ball comes down'], ['After the catch', 'run for the end zone']]
        : MP.role === 2 ? [['Your man', 'stay with him'], [state.mode === 'flat' ? 'WASD + Shift' : 'Stick', 'run'], ['The ball', state.mode === 'vr' ? 'get a hand on it: knock it down or pick it off' : 'get in its path'], ['Tackle', 'reach the ball carrier']]
          : [['Sideline', 'you\u2019re watching'], ['You: Watching', 'switch to receiver or defense']])
      : state.mode === 'flat'
      ? [['Space', S.phase === 'live' ? 'hold and let go to throw (tap = bullet, hold = lob)' : 'hike'], ['Look', 'aim at a receiver'], ['1-5', 'pick a play'], ['WASD', 'move; cross the line to run (Shift sprints)'], ['K / T / G', 'spike, timeout, field goal']]
      : [['A / X', 'hike'], ['Grip', 'take the ball, then throw it'], ['Stick', 'cross the line to run it'], ['Call sheet', 'buttons on your left']]);
    L.hints = L.hintsFor();
    L.spawn = () => { standQB(); };
    L.onEnter = () => { setFormation(); sbKey = ''; hudKey = ''; };
    L.onExit = () => { hudPlate.visible = false; spotRing.visible = false; if (ui.status) ui.status.hidden = true; if (S.phase !== 'idle' && S.phase !== 'over') S.phase = 'idle'; if (following()) { MP.qb = null; for (const pp of [...REC, ...COV]) { pp.human = null; pp.mine = false; } } };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 6, 4, 10); camera.lookAt(0, 1, -10); };
    // the board lists everyone's best drill
    L.presence = () => {
      const p = { fb: [following() ? 0 : S.score, S.best[S.diff], S.diff, following() ? 0 : S.phase === 'over' ? 2 : S.phase === 'idle' ? 0 : 1], fw: [MP.want, following() ? S.gid || 0 : 0] };
      if (!following() && S.gid && (active() || S.phase === 'over')) p.fq = snapshot();
      return p;
    };
    L.readPresence = (rec, pres, st) => {
      if (Array.isArray(pres.fw) && pres.fw.length === 2 && int(pres.fw[0], 0, 2) && int(pres.fw[1], 0, 1e14)) st.fw = pres.fw.slice(); else st.fw = null;
      if (pres.fq && validSnap(pres.fq)) {
        st.fq = pres.fq; st.fqT = Date.now();
        if (MP.qb === rec.peer) { MP.qbName = rec.name; applySnap(pres.fq, performance.now()); }
      } else st.fq = null;
      const a = pres.fb;
      if (!Array.isArray(a) || a.length !== 4 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 10000)) return;
      if (a[0] !== st.score || a[1] !== st.best) state.dirtyBoard = true;
      Object.assign(st, { score: a[0], best: a[1], diff: clamp(a[2], 0, 2), on: a[3] });
    };
    L.rowFor = (st, isMe) => {
      const score = isMe ? S.score : st.score || 0, best = isMe ? S.best[S.diff] : st.best || 0, on = isMe ? (S.phase === 'idle' ? 0 : S.phase === 'over' ? 2 : 1) : st.on || 0, diff = isMe ? S.diff : st.diff || 0;
      return { best, score, text: on === 1 ? `${score} pts now · best ${best}` : `best ${best} (${DIFFS[diff].name})` };
    };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#0c0f1a'; g.fillRect(0, 0, W, 460);
      g.strokeStyle = '#ffd23f'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Best drives', 36, 80);
      g.fillStyle = '#9aa4c8'; g.font = `400 24px ${BODY}`; g.fillText('Most points in two minutes', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    MUSIC_THEMES.football = { gain: 0.75, bpm: 112, swing: 0, chords: ['C', 'F', 'G', 'C'], comp: { inst: 'brass', at: [0, 6, 8], dur: 0.2 }, bass: { at: [0, 8, 10] }, drums: { k: 'x...x...x...x...', s: '....x.......x...', h: 'o.o.o.o.o.o.o.o.' }, cut: 4200 };
    L.fbInternals = { MP, assignSpots, snapshot, applySnap, pickQB, cycleRole, S, PLAYS, DIFFS, REC, COV, SAF, RUSH, LINE, routeAt, passTo, hike, startGame, choosePlay, step, endPlay, release, throwFlat, lookTarget, fieldGoal, spike, timeout, setFormation, YD };
    setFormation();
    return L;
  })();
