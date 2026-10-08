  // ================================================================ CLUBHOUSE FOOSBALL
  // A real table: eight rods across the width, each with its little men. You push and pull a rod to slide it and
  // twist it to kick. VR: grab a handle (pull to slide, turn your wrist to spin). Browser: W/S slide the rod,
  // A/D pick another rod, hold Space to wind up and let go to kick. Play a friend, or the clubhouse bot when alone.
  // The lowest-named player's page runs the ball; everyone draws it.
  const foosball = ((L) => {
    const G = L.group;
    const C = new V3(0, 0, 14.6);                         // table centre; the length runs along x, the rods along z
    const FL = 1.2, FW = 0.66, Y = 0.86, RY = 0.115, LM = 0.085, BR = 0.018, GOAL = 0.2, WIN = 5;
    // from the red goal (west) to the blue goal (east): [team, type] with type 0 goalie, 1 defence, 2 midfield, 3 forwards
    const RODS = [[0, 0], [0, 1], [1, 3], [0, 2], [1, 2], [0, 3], [1, 1], [1, 0]];
    const MEN = [1, 2, 5, 3], SPACE = [0, 0.2, 0.115, 0.16];
    const RANGE = MEN.map((n, t) => 0.29 - ((n - 1) * SPACE[t]) / 2);
    const RU = (k) => (k - 3.5) * 0.15;
    const TEAM_NAME = ['Red', 'Blue'], TEAM_HEX = [0xe0384d, 0x3d82e8];
    const STAND = [new V3(C.x, 0, C.z - 0.95), new V3(C.x, 0, C.z + 0.95)];   // red at the north side, blue at the south
    const TEAM_ROD = [[], []];
    RODS.forEach(([t, ty], k) => { TEAM_ROD[t][ty] = k; });
    const SEL_ORDER = [3, 2, 1, 0];                       // left to right as you face the table: forwards, midfield, defence, goalie
    const SLIDE_SPEED = 0.9, MAX_OM = 38, MAX_VS = 2.2;
    const toWorld = (u, v, y, out) => out.set(C.x + u, y, C.z + v);

    // ---------------------------------------------------------------- the table
    const wood = lam(0x7a4a2a), woodDark = lam(0x4a2c18), felt = new THREE.MeshLambertMaterial({ color: 0x2f7d3d });
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xe8f0e0 });
    addBox(G, FL + 0.3, 0.2, FW + 0.3, woodDark, C.x, Y - 0.12, C.z);
    addBox(G, FL, 0.02, FW, felt, C.x, Y - 0.01, C.z);
    for (const s of [-1, 1]) addBox(G, FL + 0.12, 0.08, 0.06, wood, C.x, Y + 0.04, C.z + s * (FW / 2 + 0.03));
    for (const su of [-1, 1]) for (const sv of [-1, 1]) addBox(G, 0.06, 0.08, FW / 2 - GOAL / 2, wood, C.x + su * (FL / 2 + 0.03), Y + 0.04, C.z + sv * (GOAL / 2 + (FW / 2 - GOAL / 2) / 2));
    for (const su of [-1, 1]) addBox(G, 0.07, 0.07, GOAL, new THREE.MeshLambertMaterial({ color: 0x14141c }), C.x + su * (FL / 2 + 0.035), Y - 0.04, C.z);
    // the markings: centre line, centre circle, and the goal boxes
    addBox(G, 0.008, 0.002, FW, lineMat, C.x, Y + 0.0015, C.z);
    const circ = new THREE.Mesh(new THREE.RingGeometry(0.095, 0.103, 28), lineMat); circ.rotation.x = -Math.PI / 2; circ.position.set(C.x, Y + 0.002, C.z); G.add(circ);
    for (const su of [-1, 1]) { addBox(G, 0.006, 0.002, 0.34, lineMat, C.x + su * (FL / 2 - 0.12), Y + 0.0015, C.z); addBox(G, 0.12, 0.002, 0.006, lineMat, C.x + su * (FL / 2 - 0.06), Y + 0.0015, C.z - 0.17); addBox(G, 0.12, 0.002, 0.006, lineMat, C.x + su * (FL / 2 - 0.06), Y + 0.0015, C.z + 0.17); }
    for (const su of [-1, 1]) for (const sv of [-1, 1]) addBox(G, 0.08, Y - 0.1, 0.08, woodDark, C.x + su * (FL / 2 - 0.02), (Y - 0.1) / 2, C.z + sv * (FW / 2 - 0.02));
    // a hanging scoreboard, readable from both sides
    const scoreC = canvasTexture(512, 192);
    const sb = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.375), new THREE.MeshBasicMaterial({ map: scoreC.tex }));
    sb.position.set(C.x, 1.95, C.z); G.add(sb);
    const sbBack = sb.clone(); sbBack.rotation.y = Math.PI; sbBack.position.z += 0.01; sb.position.z -= 0.01; G.add(sbBack);
    addCyl(G, 0.008, 0.008, 2.8, 4, woodDark, C.x, 3.6, C.z);

    // ---------------------------------------------------------------- the rods and their men
    TOOL_MESH.fooshandle = () => { const g = new THREE.Group(); g.userData.mats = []; return g; };
    const teamMat = TEAM_HEX.map((c) => new THREE.MeshLambertMaterial({ color: c }));
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xf2e6d2 }), bootMat = new THREE.MeshLambertMaterial({ color: 0x1b1b24 });
    const steel = new THREE.MeshLambertMaterial({ color: 0xc8ccd6 });
    const knobMats = TEAM_HEX.map((c) => new THREE.MeshLambertMaterial({ color: c, emissive: 0x000000 }));
    const rods = RODS.map(([team, type], k) => {
      const g = new THREE.Group();
      g.position.set(C.x + RU(k), Y + RY, C.z);
      const bar = new THREE.Mesh(cyl(0.008, 0.008, 0.96, 8), steel); bar.rotation.x = Math.PI / 2; g.add(bar);
      const side = team === 0 ? -1 : 1;
      const knob = new THREE.Mesh(cyl(0.02, 0.02, 0.14, 12), knobMats[team]); knob.rotation.x = Math.PI / 2; knob.position.z = side * 0.55; g.add(knob);
      const stub = new THREE.Mesh(cyl(0.014, 0.014, 0.04, 8), steel); stub.rotation.x = Math.PI / 2; stub.position.z = -side * 0.5; g.add(stub);
      const n = MEN[type];
      for (let i = 0; i < n; i++) {
        const man = new THREE.Group(); man.position.z = (i - (n - 1) / 2) * SPACE[type];
        man.add(at(new THREE.Mesh(sph(0.018, 10, 8), skinMat), 0, 0.024, 0), at(new THREE.Mesh(boxg(0.03, 0.07, 0.034), teamMat[team]), 0, -0.04, 0), at(new THREE.Mesh(boxg(0.036, 0.028, 0.034), bootMat), 0, -LM, 0));
        g.add(man);
      }
      G.add(g);
      // the handle you grab in VR (invisible; the knob above is what you see)
      const tool = makeTool(L, new V3(C.x + RU(k), Y + RY, C.z + side * 0.55), new Q4(), 'fooshandle');
      tool.sticky = false; tool.hitR = 0.075; tool.fbRod = k; tool.fbTeam = team; tool.g.visible = false;
      return { k, team, type, g, knob, tool, side, s: 0, th: 0, ps: 0, pth: 0, cs: 0, cth: 0, ts: 0, tth: 0, om: 0, vs: 0, kick: null, charge: -1, g0: 0, s0: 0, botCool: 0, botErr: 0 };
    });
    L.fooRods = rods;
    const ballMesh = new THREE.Mesh(new THREE.SphereGeometry(BR, 12, 10), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    ballMesh.visible = false; G.add(ballMesh);
    // the clubhouse bot, standing at its side of the table
    const botBody = buildAvatar('#9a90b0', 1, 2, true, 1, 3);
    const botTag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (g) => { rr(g, 4, 6, 248, 52, 26); g.fillStyle = 'rgba(20,16,32,0.8)'; g.fill(); g.fillStyle = '#ffffff'; g.font = `700 30px ${BODY}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Clubhouse bot', 128, 33); }).tex, transparent: true, depthWrite: false }));
    botTag.scale.set(0.9, 0.225, 1); botTag.position.y = 0.42; botBody.add(botTag);
    botBody.visible = false; G.add(botBody);

    // ---------------------------------------------------------------- state
    const FB = {
      mySide: -1, ph: 'idle', score: [0, 0], goalSeq: 0, winner: -1, overT: 0, goalT: 0, sel: 0, hostId: '', botOn: false,
      ball: { u: 0, v: 0, vu: 0, vv: 0 }, keysPrev: {}, lastHit: 0, stuckT: 0,
    };
    L.foos = FB;
    const players = () => {
      const at = [null, null];
      if (FB.mySide >= 0) at[FB.mySide] = state.myPeer;
      for (const rec of remotes.values()) { const st = rec.lvState[L.id]; if (rec.lv === L.idx && st && st.fbSide >= 0 && !at[st.fbSide]) at[st.fbSide] = rec.peer; }
      return at;
    };
    const seated = () => players().filter(Boolean);
    const hostPeer = () => { const s = seated().sort(); return s.length ? s[0] : ''; };
    const iAmHost = () => FB.mySide >= 0 && hostPeer() === state.myPeer;
    const otherHuman = () => (FB.mySide >= 0 ? players()[1 - FB.mySide] : null);
    const botSide = () => (FB.mySide >= 0 && !otherHuman() ? 1 - FB.mySide : -1);
    const nameOfTeam = (t) => { const p = players()[t]; return !p ? (botSide() === t || FB.botOn ? 'Bot' : 'open') : p === state.myPeer ? 'You' : (remotes.get(p) || {}).name || TEAM_NAME[t]; };
    let lastTick = 0;
    function hitSound(v) { const now = performance.now(); if (now - lastTick < 35) return; lastTick = now; tone(1300 + Math.random() * 300, 800, 0.025, 'triangle', Math.min(0.3, 0.05 + v * 0.05) / (1 + myHead.pos.distanceTo(ballMesh.position) * 0.3)); }

    // ---------------------------------------------------------------- the ball (the host runs this)
    function spawnBall() {
      const a = (Math.random() - 0.5) * 1.2 + (Math.random() < 0.5 ? 0 : Math.PI);
      Object.assign(FB.ball, { u: 0, v: (Math.random() - 0.5) * 0.1, vu: Math.cos(a) * 0.5, vv: Math.sin(a) * 0.35 });
      FB.ph = 'play'; FB.stuckT = 0;
    }
    function newGame() { FB.score = [0, 0]; FB.winner = -1; FB.goalSeq += 1; spawnBall(); forcePresence(); }
    function goal(team) {
      FB.score[team] += 1; FB.goalSeq += 1;
      FB.ph = 'goal'; FB.goalT = performance.now();
      if (FB.score[team] >= WIN) { FB.winner = team; FB.ph = 'over'; FB.overT = performance.now(); }
      onGoalShown(team);
      forcePresence();
    }
    function onGoalShown(team) {
      sfx(team === FB.mySide ? 'chime' : 'whistle', 0.7);
      const [a, b] = FB.score;
      if (FB.winner >= 0) showToast(FB.winner === FB.mySide ? `You win ${Math.max(a, b)}-${Math.min(a, b)}!` : `${TEAM_NAME[FB.winner]} wins ${Math.max(a, b)}-${Math.min(a, b)}`);
      else showToast(`Goal for ${TEAM_NAME[team]}! ${a}-${b}`);
      drawScore();
    }
    // a foot against the ball: a circle against a small rectangle
    function footHit(b, r, i) {
      if (Math.cos(r.th) < 0.75) return;    // lifted clear of the ball
      const n = MEN[r.type], vi = (i - (n - 1) / 2) * SPACE[r.type] + r.s, uf = RU(r.k) + LM * Math.sin(r.th), hu = 0.018, hv = 0.017;
      const cu = clamp(b.u, uf - hu, uf + hu), cv = clamp(b.v, vi - hv, vi + hv);
      const du = b.u - cu, dv = b.v - cv, d = Math.hypot(du, dv);
      if (d >= BR) return;
      let nu, nv;
      if (d > 1e-6) { nu = du / d; nv = dv / d; b.u = cu + nu * BR; b.v = cv + nv * BR; }
      else {
        const pl = b.u - (uf - hu), pr = uf + hu - b.u, pb = b.v - (vi - hv), pt = vi + hv - b.v, m = Math.min(pl, pr, pb, pt);
        if (m === pl) { nu = -1; nv = 0; b.u = uf - hu - BR; } else if (m === pr) { nu = 1; nv = 0; b.u = uf + hu + BR; } else if (m === pb) { nu = 0; nv = -1; b.v = vi - hv - BR; } else { nu = 0; nv = 1; b.v = vi + hv + BR; }
      }
      const fu = LM * Math.cos(r.th) * r.om, fv = r.vs;
      const rel = (b.vu - fu) * nu + (b.vv - fv) * nv;
      if (rel < 0) { b.vu -= 1.55 * rel * nu; b.vv -= 1.55 * rel * nv; hitSound(-rel); }
    }
    function stepBall(dt) {
      const b = FB.ball;
      if (FB.ph !== 'play') return;
      const n = Math.max(1, Math.ceil(dt * 600)), h = dt / n;
      for (let j = 1; j <= n; j++) {
        // the rods move through the frame, so a fast kick can't skip over the ball
        const f = j / n;
        for (const r of rods) { r.s = r.ps + (r.cs - r.ps) * f; r.th = r.pth + (r.cth - r.pth) * f; }
        b.u += b.vu * h; b.v += b.vv * h;
        const fr = 1 - 0.45 * h; b.vu *= fr; b.vv *= fr;
        const sp = Math.hypot(b.vu, b.vv); if (sp > 5) { b.vu *= 5 / sp; b.vv *= 5 / sp; }
        if (b.v > FW / 2 - BR) { b.v = FW / 2 - BR; if (b.vv > 0) { b.vv *= -0.7; hitSound(b.vv); } }
        if (b.v < -(FW / 2 - BR)) { b.v = -(FW / 2 - BR); if (b.vv < 0) { b.vv *= -0.7; hitSound(-b.vv); } }
        if (Math.abs(b.u) > FL / 2 - BR) {
          if (Math.abs(b.v) < GOAL / 2 - BR) { if (Math.abs(b.u) > FL / 2 + 0.01) { goal(b.u < 0 ? 1 : 0); return; } }
          else { b.u = Math.sign(b.u) * (FL / 2 - BR); if (b.vu * Math.sign(b.u) > 0) { b.vu *= -0.7; hitSound(Math.abs(b.vu)); } }
        }
        for (const r of rods) for (let i = 0; i < MEN[r.type]; i++) footHit(b, r, i);
      }
      for (const r of rods) { r.s = r.cs; r.th = r.cth; }
      // a ball that has stopped dead for a while gets dropped back in
      if (Math.hypot(b.vu, b.vv) < 0.03) { FB.stuckT += dt; if (FB.stuckT > 5) { spawnBall(); forcePresence(); } } else FB.stuckT = 0;
    }

    // ---------------------------------------------------------------- the rods: where each should be, and how it gets there
    // r.cs/r.cth are where the rod is at the end of this frame; r.ps/r.pth where it started it
    function kickAngle(r, now) {
      const k = r.kick;
      if (!k) return null;
      const t = now - k.t0, d = k.dir;
      if (t < 70) return -0.9 * d * (t / 70);
      if (t < 130) return (-0.9 + 2.1 * ((t - 70) / 60)) * d;
      if (t < 400) return 1.2 * d * (1 - (t - 130) / 270);
      r.kick = null; return 0;
    }
    function moveRods(dt, now) {
      for (const r of rods) {
        r.ps = r.s; r.pth = r.th;
        const mine = FB.mySide >= 0 && r.team === FB.mySide;
        const bot = botSide() === r.team && iAmHost();
        if (mine) {
          // my own rods are set directly by my hands or keys (see below)
          r.cs = clamp(r.ts, -RANGE[r.type], RANGE[r.type]); r.cth = clamp(r.tth, -1.7, 1.7);
        } else {
          // everyone else's (a friend's, the bot's) eases toward where it was told to go
          const ka = bot ? kickAngle(r, now) : null;
          const tth = ka !== null ? ka : r.tth;
          const lim = bot ? 0.55 : MAX_VS;
          r.cs = r.s + clamp(clamp(r.ts, -RANGE[r.type], RANGE[r.type]) - r.s, -lim * dt, lim * dt);
          r.cth = r.th + clamp(clamp(tth, -1.7, 1.7) - r.th, -MAX_OM * dt, MAX_OM * dt);
        }
        r.vs = (r.cs - r.ps) / Math.max(dt, 1e-3); r.om = (r.cth - r.pth) / Math.max(dt, 1e-3);
      }
    }
    function drawRods() {
      for (const r of rods) { r.g.position.z = C.z + r.s; r.g.rotation.z = r.th; }
    }
    // the clubhouse bot: line a man up with the ball and kick it when it's in front of the foot
    function botThink(now) {
      const s = botSide();
      if (s < 0 || !iAmHost() || FB.noBot) return;
      const b = FB.ball, dir = s === 0 ? 1 : -1;
      for (const ty of [0, 1, 2, 3]) {
        const r = rods[TEAM_ROD[s][ty]], n = MEN[ty];
        let bestS = r.ts, bd = 9;
        for (let i = 0; i < n; i++) { const want = b.v - (i - (n - 1) / 2) * SPACE[ty], d = Math.abs(want - r.s); if (d < bd) { bd = d; bestS = want; } }
        if (now > r.botErr) { r.botErr = now + 600; r.errV = (Math.random() - 0.5) * 0.07; }
        r.ts = clamp(bestS + (r.errV || 0), -RANGE[ty], RANGE[ty]);
        const ahead = (b.u - RU(r.k)) * dir;
        if (!r.kick && now > r.botCool && FB.ph === 'play' && ahead > 0.015 && ahead < 0.085 && bd < 0.03 && Math.random() < 0.09) { r.kick = { t0: now, dir }; r.botCool = now + 650 + Math.random() * 500; }
      }
    }

    // ---------------------------------------------------------------- your hands and keys
    const _up = new V3();
    const myRodTools = () => rods.filter((r) => r.tool.held && r.tool.held.peer === state.myPeer);
    function vrControl() {
      for (const r of rods) {
        const t = r.tool, mine = !!(t.held && t.held.peer === state.myPeer);
        if (mine && r.team === FB.mySide && state.mode === 'vr') {
          if (r.g0 === null || r.g0 === undefined) { r.g0 = t.pos.z - C.z; r.s0 = r.ts; }
          r.ts = r.s0 + ((t.pos.z - C.z) - r.g0);
          _up.set(0, 1, 0).applyQuaternion(t.quat);
          r.tth = clamp(Math.atan2(_up.x, _up.y), -1.7, 1.7);
        } else if (r.g0 !== null) r.g0 = null;
        // keep the invisible handle on the rod's knob so you can grab it again
        t.rackPos.set(C.x + RU(r.k), Y + RY, C.z + r.s + r.side * 0.55);
        t.g.visible = false;
      }
    }
    function keyControl(dt, now) {
      if (state.mode !== 'flat' || FB.mySide < 0) return;
      const kd = state.keys || {};
      const ty = SEL_ORDER[FB.sel], r = rods[TEAM_ROD[FB.mySide][ty]], dirS = FB.mySide === 0 ? 1 : -1, dirK = dirS;
      const push = (kd.KeyW || kd.ArrowUp ? 1 : 0) - (kd.KeyS || kd.ArrowDown ? 1 : 0);
      if (push) r.ts = clamp(r.ts + push * dirS * SLIDE_SPEED * dt, -RANGE[ty], RANGE[ty]);
      // hold Space to wind the rod back, let go to kick; a kick carries on even if you pick another rod
      if (FB.charging) FB.chargeT = Math.min(1, (now - FB.chargeStart) / 260);
      for (const o of rods) {
        if (o.team !== FB.mySide) continue;
        if (o === r && FB.charging) { o.tth = -0.9 * dirK * FB.chargeT; o.kick = null; }
        else if (o.kick) { const a = kickAngle(o, now); o.tth = a === null ? 0 : a; }
        else if (Math.abs(o.tth) > 1e-3) o.tth *= Math.max(0, 1 - 12 * dt);
        o.knob.material.emissive.setHex(o === r ? 0x666633 : 0x000000);
      }
    }
    // seated in the browser you hold the selected rod's handle: that's what routes Space to the kick
    function holdSelected() {
      if (state.mode !== 'flat' || FB.mySide < 0) return;
      const r = rods[TEAM_ROD[FB.mySide][SEL_ORDER[FB.sel]]];
      if (state.held && state.held.obj && state.held.obj.kind === 'fooshandle' && state.held.obj !== r.tool) { const old = state.held.obj; old.held = null; dropTool(old); }
      if (!r.tool.held) grabTool(r.tool, 'right');
      state.held = { kind: 'tool', obj: r.tool }; state.hudDirty = true;
    }
    L.onKey = ((base) => (code) => {
      if (FB.mySide >= 0 && state.mode === 'flat') {
        if (code === 'KeyA' || code === 'ArrowLeft') { FB.sel = Math.max(0, FB.sel - 1); holdSelected(); return; }
        if (code === 'KeyD' || code === 'ArrowRight') { FB.sel = Math.min(3, FB.sel + 1); holdSelected(); return; }
        const m = /^Digit([1-4])$/.exec(code);
        if (m) { FB.sel = Number(m[1]) - 1; holdSelected(); return; }
      }
      if (base) { base(code); return; }
      // (the clubhouse has no key hook of its own: keep the number keys that jump to a place)
      if (/^Digit[1-9]$/.test(code) && Number(code.slice(5)) <= LEVEL_META.length) switchLevel(Number(code.slice(5)) - 1);
    })(L.onKey);
    L.hopBlocked = ((base) => () => FB.mySide >= 0 || (base ? base() : false))(L.hopBlocked);
    L.deskSwing = ((base) => (now) => {
      if (FB.mySide >= 0 && state.mode === 'flat') { FB.charging = true; FB.chargeStart = performance.now(); return; }
      if (base) base(now);
    })(L.deskSwing);
    L.deskRelease = ((base) => () => {
      if (FB.charging) {
        FB.charging = false;
        const ty = SEL_ORDER[FB.sel], r = rods[TEAM_ROD[FB.mySide][ty]], dir = FB.mySide === 0 ? 1 : -1;
        // a longer wind-up gets a harder kick; the swing starts from where the rod got to
        r.kick = { t0: performance.now() - 70 * (FB.chargeT || 0), dir };
        FB.chargeT = 0;
        return;
      }
      if (base) base();
    })(L.deskRelease);

    // ---------------------------------------------------------------- taking a side
    function takeSide(s, quiet) {
      const at = players()[s];
      if (at && at !== state.myPeer) { showToast(`${TEAM_NAME[s]} is taken`); return false; }
      if (FB.mySide === s) return true;
      FB.mySide = s; FB.sel = 0;
      for (const r of rods) { r.ts = 0; r.tth = 0; }
      if (!quiet) showToast(otherHuman() ? `Foosball! First to ${WIN}` : `Foosball against the clubhouse bot. First to ${WIN}`);
      sfx('chime', 0.6);
      holdSelected();
      if (FB.ph === 'idle' || (!otherHuman() && FB.ph !== 'play')) { if (iAmHost() || !otherHuman()) newGame(); }
      state.hudDirty = true; forcePresence();
      return true;
    }
    function leaveTable() {
      if (FB.mySide < 0) return;
      FB.mySide = -1; FB.charging = false; botBody.visible = false;
      for (const r of rods) if (r.tool.held && r.tool.held.peer === state.myPeer) { for (const s of SIDES) if (vrHands[s].holding && vrHands[s].holding.obj === r.tool) vrHands[s].holding = null; if (state.held && state.held.obj === r.tool) { state.held = null; state.hudDirty = true; } dropTool(r.tool); }
      for (const o of rods) o.knob.material.emissive.setHex(0x000000);
      if (!seated().length) { FB.ph = 'idle'; ballMesh.visible = false; }
      showToast('You left the foosball table');
      state.hudDirty = true; forcePresence();
    }
    L.onToolGrab = ((base) => (t) => {
      if (t.kind === 'fooshandle') {
        if (FB.mySide !== t.fbTeam && !takeSide(t.fbTeam)) { for (const s of SIDES) if (vrHands[s].holding && vrHands[s].holding.obj === t) vrHands[s].holding = null; dropTool(t); return; }
        const r = rods[t.fbRod]; r.g0 = null; r.s0 = r.ts; haptic(vrHands[t.held.side], 0.3, 25);
        return;
      }
      if (base) base(t);
    })(L.onToolGrab);
    L.onUse = ((base) => () => {
      if (state.mode === 'flat') {
        if (FB.mySide >= 0) { leaveTable(); return true; }
        for (let s = 0; s < 2; s++) {
          if (Math.hypot(myHead.pos.x - STAND[s].x, myHead.pos.z - STAND[s].z) < 1.5) {
            if (!takeSide(s)) return true;
            dolly.position.x += STAND[s].x - myHead.pos.x; dolly.position.z += STAND[s].z - myHead.pos.z;
            state.yaw = s === 0 ? Math.PI : 0; state.pitch = -0.62;
            return true;
          }
        }
      }
      return base ? base() : false;
    })(L.onUse);
    L.clampPlayer = ((base) => (p) => {
      if (FB.mySide >= 0 && state.mode === 'flat') { const s = STAND[FB.mySide]; return [s.x - p.x, s.z - p.z]; }
      return base ? base(p) : [0, 0];
    })(L.clampPlayer);
    L.hintsFor = ((base) => () => {
      if (state.mode === 'flat' && FB.mySide >= 0) return [['W / S', 'slide the rod'], ['A / D', 'pick a rod'], ['Hold Space', 'wind up, let go to kick'], ['E', 'leave the table']];
      if (state.mode === 'flat' && Math.hypot(myHead.pos.x - C.x, myHead.pos.z - C.z) < 3.4) return [['E', 'at either long side to play foosball'], ['WASD', 'move'], ['Drag', 'look']];
      return base ? base() : L.hints;
    })(L.hintsFor);

    // ---------------------------------------------------------------- per frame
    function drawScore() {
      const g = scoreC.g;
      g.fillStyle = '#1b1932'; g.fillRect(0, 0, 512, 192);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#ffd23f'; g.font = `800 34px ${DISPLAY}`; g.fillText('Foosball', 256, 32);
      g.font = `800 84px ${DISPLAY}`; g.fillStyle = '#ff6a7a'; g.fillText(String(FB.score[0]), 150, 112); g.fillStyle = '#ffffff'; g.fillText('-', 256, 108); g.fillStyle = '#6aa8ff'; g.fillText(String(FB.score[1]), 362, 112);
      g.fillStyle = '#a9a3cf'; g.font = `400 24px ${BODY}`;
      g.fillText(FB.ph === 'idle' ? 'Take a side to play' : `${nameOfTeam(0)}   vs   ${nameOfTeam(1)}`, 256, 170, 490);
      scoreC.tex.needsUpdate = true;
    }
    drawScore();
    const baseUpdate = L.update;
    let scoreKey = '';
    L.update = (dt, now) => {
      baseUpdate(dt, now);
      if (FB.mySide >= 0 && (state.mode === 'menu' || state.level !== L.idx)) leaveTable();
      if (FB.mySide >= 0 && state.mode === 'vr' && Math.hypot(myHead.pos.x - C.x, myHead.pos.z - C.z) > 5) leaveTable();
      // in the browser, putting the handle down (E) is how you get up from the table
      if (FB.mySide >= 0 && state.mode === 'flat' && !myRodTools().length) leaveTable();
      const host = iAmHost();
      // the ball: the host runs it; everyone else slides it along from the host's last word
      const bk = 1 - Math.exp(-dt * 12);
      if (FB.mySide >= 0 && state.mode === 'vr') vrControl(); else if (FB.mySide < 0) vrControl();
      keyControl(dt, now);
      botThink(now);
      moveRods(dt, now);
      if (host) {
        if (FB.ph === 'goal' && now - FB.goalT > 1300) { spawnBall(); forcePresence(); }
        if (FB.ph === 'over' && now - FB.overT > 5000) newGame();
        stepBall(dt);
        for (const r of rods) { r.s = r.cs; r.th = r.cth; }   // (stepBall only does this while the ball is in play)
      } else {
        for (const r of rods) { r.s = r.cs; r.th = r.cth; }
        if (FB.ph === 'play') { const b = FB.ball; b.u += b.vu * dt; b.v += b.vv * dt; b.vu *= 1 - 0.45 * dt; b.vv *= 1 - 0.45 * dt; b.u = clamp(b.u, -FL / 2 - 0.02, FL / 2 + 0.02); b.v = clamp(b.v, -FW / 2, FW / 2); }
      }
      drawRods();
      ballMesh.visible = FB.ph === 'play';
      toWorld(FB.ball.u, FB.ball.v, Y + BR, ballMesh.position);
      // the bot stands at its side, working the handles
      const bs = botSide();
      botBody.visible = bs >= 0 || (FB.mySide < 0 && FB.botOn);
      if (botBody.visible) { const side = bs >= 0 ? bs : (players()[0] ? 1 : 0); botBody.position.set(STAND[side].x + Math.sin(now * 0.002) * 0.15, 1.55, STAND[side].z); botBody.rotation.y = side === 0 ? Math.PI : 0; }
      const key = `${FB.score}|${FB.ph}|${players().join()}|${bs}|${FB.botOn}`;
      if (key !== scoreKey) { scoreKey = key; drawScore(); }
    };

    // ---------------------------------------------------------------- network
    const PHC = { idle: 0, play: 1, goal: 2, over: 3 }, PHN = ['idle', 'play', 'goal', 'over'];
    const r3 = (x) => Math.round(x * 1000) / 1000;
    const baseP = L.presence, baseR = L.readPresence;
    L.presence = () => {
      const p = baseP ? baseP() : {};
      if (FB.mySide < 0) return p;
      const mine = TEAM_ROD[FB.mySide].map((k) => rods[k]);
      p.fb = [FB.mySide, ...mine.flatMap((r) => [r3(r.cs !== undefined ? r.cs : r.s), r3(r.cth !== undefined ? r.cth : r.th)])];
      if (iAmHost()) {
        const bs = botSide(), bot = bs >= 0 ? TEAM_ROD[bs].map((k) => rods[k]) : null, b = FB.ball;
        p.fh = [r3(b.u), r3(b.v), r3(b.vu), r3(b.vv), FB.score[0], FB.score[1], PHC[FB.ph], FB.goalSeq, bs, ...(bot ? bot.flatMap((r) => [r3(r.s), r3(r.th)]) : [0, 0, 0, 0, 0, 0, 0, 0])];
      }
      return p;
    };
    const okN = (x, m) => typeof x === 'number' && isFinite(x) && Math.abs(x) < m;
    L.readPresence = (rec, pres, st) => {
      if (baseR) baseR(rec, pres, st);
      st.fbSide = -1;
      const a = pres.fb;
      if (Array.isArray(a) && a.length === 9 && (a[0] === 0 || a[0] === 1) && a.slice(1).every((x) => okN(x, 4))) {
        const side = a[0];
        if (side === FB.mySide) { if (rec.peer < state.myPeer) { showToast(`${rec.name} took that side first`); leaveTable(); } }
        else {
          st.fbSide = side;
          for (let ty = 0; ty < 4; ty++) { const r = rods[TEAM_ROD[side][ty]]; r.ts = a[1 + ty * 2]; r.tth = a[2 + ty * 2]; }
        }
      }
      // the host's word on the ball and the score
      const h = pres.fh;
      if (Array.isArray(h) && h.length === 17 && h.every((x) => okN(x, 50)) && FB.mySide >= 0 && rec.peer === hostPeer() && !iAmHost()) {
        const b = FB.ball, before = FB.goalSeq;
        Object.assign(b, { u: h[0], v: h[1], vu: h[2], vv: h[3] });
        FB.score = [h[4] | 0, h[5] | 0]; FB.ph = PHN[clamp(h[6] | 0, 0, 3)] || 'idle'; FB.goalSeq = h[7] | 0; FB.winner = FB.ph === 'over' ? (FB.score[0] > FB.score[1] ? 0 : 1) : -1;
        FB.botOn = h[8] >= 0;
        if (FB.goalSeq > before && FB.ph !== 'play') onGoalShown(FB.score[0] > (st.fbS0 || 0) ? 0 : 1);
        if (h[8] >= 0) { const bot = TEAM_ROD[h[8]]; for (let ty = 0; ty < 4; ty++) { const r = rods[bot[ty]]; r.ts = h[9 + ty * 2]; r.tth = h[10 + ty * 2]; } }
        st.fbS0 = FB.score[0];
      } else if (Array.isArray(h) && h.length === 17 && FB.mySide < 0 && rec.peer === hostPeer()) {
        // watching from the side
        const b = FB.ball;
        Object.assign(b, { u: h[0], v: h[1], vu: h[2], vv: h[3] });
        FB.score = [h[4] | 0, h[5] | 0]; FB.ph = PHN[clamp(h[6] | 0, 0, 3)] || 'idle'; FB.botOn = h[8] >= 0;
        if (h[8] >= 0) { const bot = TEAM_ROD[h[8]]; for (let ty = 0; ty < 4; ty++) { const r = rods[bot[ty]]; r.ts = h[9 + ty * 2]; r.tth = h[10 + ty * 2]; } }
      }
    };
    FB.internals = { C, FL, FW, Y, RODS, MEN, SPACE, RANGE, RU, STAND, TEAM_ROD, rods, takeSide, leaveTable, newGame, spawnBall, stepBall, moveRods, botSide, iAmHost, players, goal, footHit };
    return FB;
  })(hub);

