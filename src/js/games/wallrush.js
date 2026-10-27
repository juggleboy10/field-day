  // ================================================================ LEVEL: WALL RUSH
  // A game show for your whole body. Walls slide down a neon runway with a body-shaped hole cut in them; strike the
  // pose and fit through. Every pose is a stance (stand tall, squat, lunge left or right) plus arms (down, up in a Y,
  // out in a T, or one arm up). Your height is measured when you start, so the holes fit you. VR checks your head
  // and both hands against the hole as the wall reaches you; in a browser the keys strike the pose.
  const wallrush = (() => {
    const L = newLevel(28);
    const G = L.group;
    const rand = mulberry32(2828);
    L.grabless = true;
    L.bounds = { minX: -8, maxX: 8, minZ: -6, maxZ: 5 };
    L.env = {
      sky: skyTexture([[0, '#0a0a2a'], [0.5, '#1a1a4a'], [1, '#0a0a2a']]),
      bg: 0x0c0c26, fog: [0x10102e, 20, 60], hemi: [0x9ab0ff, 0x1a1030, 0.75],
      sun: [0xffffff, 0.4], sunDir: new V3(0.2, 1, 0.5), ambient: [0x404070, 0.45], sprite: null,
    };
    const SPOT_GAP = 3.6, WW = 3.2, WH = 2.8, START_Z = -22;
    const WALL_COLS = ['#ff4d8a', '#4fc3f7', '#ffd23f', '#8bd450', '#b388ff', '#ff9a3a'];

    // ---------------------------------------------------------------- the studio
    const floorTex = canvasTexture(256, 256, (g) => {
      g.fillStyle = '#12123a'; g.fillRect(0, 0, 256, 256);
      g.strokeStyle = 'rgba(120,160,255,0.25)'; g.lineWidth = 2;
      for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    });
    floorTex.tex.wrapS = floorTex.tex.wrapT = THREE.RepeatWrapping; floorTex.tex.repeat.set(8, 12);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 50), new THREE.MeshLambertMaterial({ map: floorTex.tex }));
    floor.rotation.x = -Math.PI / 2; floor.position.z = -15; G.add(floor);
    // runways: rails the walls slide along, one per player
    const runways = [];
    for (let k = 0; k < 4; k++) {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) g.add(at(new THREE.Mesh(boxg(0.12, 0.1, 26), new THREE.MeshBasicMaterial({ color: 0x4fc3f7 })), sx * (WW / 2 + 0.1), 0.05, -11));
      const pad = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 32), new THREE.MeshBasicMaterial({ color: 0xffd23f }));
      pad.rotation.x = -Math.PI / 2; pad.position.set(0, 0.01, 0); g.add(pad);
      g.visible = k === 0; G.add(g); runways.push(g);
    }
    // studio lights and a backdrop of bulbs
    for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) {
      addCyl(G, 0.08, 0.08, 4.5, 8, lam(0x2a2a4a), sx * 6.5, 2.25, -2 - i * 5);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: warmGlowTex, color: i % 2 ? 0xff7ac8 : 0x7ac8ff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      glow.position.set(sx * 6.5, 4.6, -2 - i * 5); glow.scale.set(1.4, 1.4, 1); G.add(glow);
    }
    const bulbs = [];
    for (let i = 0; i < 26; i++) for (let j = 0; j < 6; j++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
      m.position.set(-12.5 + i, 1 + j * 1.1, -26); G.add(m); bulbs.push(m);
    }

    // ---------------------------------------------------------------- poses: a stance plus arms, fitted to your height
    const STANCES = { stand: 'Stand tall', squat: 'Squat', lungeL: 'Lunge left', lungeR: 'Lunge right' };
    const ARMS = { down: '', Y: 'arms up', T: 'arms out', upL: 'left arm up', upR: 'right arm up' };
    function poseTargets(p, H0) {
      const head = p.stance === 'squat' ? { x: 0, y: H0 * 0.66 } : p.stance === 'lungeL' ? { x: -0.42, y: H0 * 0.86 } : p.stance === 'lungeR' ? { x: 0.42, y: H0 * 0.86 } : { x: 0, y: H0 };
      const hx = head.x, hy = head.y;
      let l = null, r = null;
      if (p.arms === 'Y') { l = { x: hx - 0.45, y: hy + 0.35 }; r = { x: hx + 0.45, y: hy + 0.35 }; }
      else if (p.arms === 'T') { l = { x: hx - 0.7, y: hy - 0.2 }; r = { x: hx + 0.7, y: hy - 0.2 }; }
      else if (p.arms === 'upL') l = { x: hx - 0.22, y: hy + 0.45 };
      else if (p.arms === 'upR') r = { x: hx + 0.22, y: hy + 0.45 };
      return { head, l, r };
    }
    const poseName = (p) => [STANCES[p.stance], ARMS[p.arms]].filter(Boolean).join(', ');
    // the keys for a pose, in a browser
    const poseKeys = (p) => [{ squat: '↓', lungeL: '←', lungeR: '→' }[p.stance], { Y: '↑', T: 'F', upL: 'Q', upR: 'R' }[p.arms]].filter(Boolean).join(' + ') || 'nothing: stand tall';
    const MODES = [
      { name: 'Warm-up', bpm: 96, every: 8, travel: 5.0, walls: 22, mix: 0 },
      { name: 'Classic', bpm: 110, every: 6, travel: 4.0, walls: 32, mix: 1 },
      { name: 'Frenzy', bpm: 124, every: 4, travel: 3.2, walls: 44, mix: 2 },
    ];
    function makeRun(mi) {
      const M = MODES[mi], r = mulberry32(mi * 31 + 7), beat = 60 / M.bpm, walls = [];
      const stances = Object.keys(STANCES), arms = Object.keys(ARMS);
      let last = '';
      for (let i = 0; i < M.walls; i++) {
        let p;
        for (let tries = 0; tries < 20; tries++) {
          const st = stances[Math.floor(r() * stances.length)], ar = arms[Math.floor(r() * arms.length)];
          // warm-up: one thing at a time; classic: some combos; frenzy: mostly combos
          if (M.mix === 0 && st !== 'stand' && ar !== 'down') continue;
          if (M.mix === 1 && st !== 'stand' && ar !== 'down' && r() < 0.5) continue;
          if (st === 'stand' && ar === 'down') continue;
          p = { stance: st, arms: ar };
          if (`${st}|${ar}` !== last) break;
        }
        last = `${p.stance}|${p.arms}`;
        walls.push({ t: 4 + i * M.every * beat, pose: p });
      }
      return { walls, beat, len: 4 + M.walls * M.every * beat + 2, mi };
    }
    L.makeRun = makeRun;

    // ---------------------------------------------------------------- walls with holes cut out of them
    const CW = 512, CVH = Math.round(512 * WH / WW);      // (the wall canvas's size; CH is the music's chord table)
    const toC = (x, y) => [(x / WW + 0.5) * CW, (1 - y / WH) * CVH];
    function drawWall(g, pose, H0, col) {
      g.clearRect(0, 0, CW, CVH);
      g.fillStyle = col; g.fillRect(0, 0, CW, CVH);
      g.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < CW; i += 32) g.fillRect(i, 0, 2, CVH);
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 10; g.strokeRect(0, 0, CW, CVH);
      // the hole: your shape, a little roomy
      const T = poseTargets(pose, H0), px = CW / WW;
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = '#000'; g.strokeStyle = '#000'; g.lineCap = 'round'; g.lineJoin = 'round';
      const [hx, hy] = toC(T.head.x, T.head.y);
      g.beginPath(); g.arc(hx, hy, 0.24 * px, 0, Math.PI * 2); g.fill();
      // body down to the floor (legs apart in a lunge)
      const hip = toC(T.head.x * 0.6, T.head.y * 0.52), sh = toC(T.head.x, T.head.y - 0.25);
      g.lineWidth = 0.42 * px;
      g.beginPath(); g.moveTo(sh[0], sh[1]); g.lineTo(hip[0], hip[1]); g.stroke();
      const lunge = pose.stance === 'lungeL' ? -1 : pose.stance === 'lungeR' ? 1 : 0;
      g.lineWidth = 0.26 * px;
      for (const s of [-1, 1]) {
        const foot = toC(T.head.x * 0.2 + s * (lunge ? 0.5 : pose.stance === 'squat' ? 0.32 : 0.2), 0);
        const knee = toC(T.head.x * 0.4 + s * (pose.stance === 'squat' ? 0.4 : lunge ? 0.32 : 0.18), T.head.y * 0.28);
        g.beginPath(); g.moveTo(hip[0], hip[1]); g.lineTo(knee[0], knee[1]); g.lineTo(foot[0], foot[1]); g.stroke();
      }
      g.fillRect(toC(-WW, 0)[0], toC(0, 0.04)[1], CW * 2, CVH);       // (an open strip at the floor, so feet never catch)
      // arms: to the hands the pose asks for, or hanging down beside you
      g.lineWidth = 0.2 * px;
      for (const [s, hnd] of [[-1, T.l], [1, T.r]]) {
        const shp = toC(T.head.x + s * 0.2, T.head.y - 0.28);
        const end = hnd ? toC(hnd.x, hnd.y) : toC(T.head.x + s * 0.3, T.head.y - 0.85);
        g.beginPath(); g.moveTo(shp[0], shp[1]); g.lineTo(end[0], end[1]); g.stroke();
        if (hnd) { g.beginPath(); g.arc(end[0], end[1], 0.2 * px, 0, Math.PI * 2); g.fill(); }
      }
      g.globalCompositeOperation = 'source-over';
      // a bright outline round the hole
      return T;
    }
    const walls = [];
    for (let i = 0; i < 4; i++) {
      const ct = canvasTexture(CW, CVH);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(WW, WH), new THREE.MeshBasicMaterial({ map: ct.tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }));
      const frame = new THREE.Mesh(new THREE.BoxGeometry(WW + 0.12, WH + 0.06, 0.12), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 }));
      const top = new THREE.Mesh(boxg(WW + 0.2, 0.12, 0.25), lam(0x2a2a4a)); top.position.y = WH / 2 + 0.06; m.add(top);
      for (const sx of [-1, 1]) { const post = new THREE.Mesh(boxg(0.12, WH, 0.25), lam(0x2a2a4a)); post.position.x = sx * (WW / 2 + 0.06); m.add(post); }
      void frame;
      m.visible = false; G.add(m);
      walls.push({ m, ct, w: null, T: null, flash: 0 });
    }
    // where your hands are, shown on the wall as it comes
    const handDots = SIDES.map((s) => { const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: s === 'left' ? 0xff5a8a : 0x5ac8ff })); d.visible = false; G.add(d); return d; });

    // ---------------------------------------------------------------- a run
    const R = { st: 'idle', mi: 0, run: null, i: 0, t0: 0, pt0: 0, H0: 1.6, score: 0, fits: 0, crashes: 0, streak: 0, best: prefs.wrBest || {}, result: null, clock: null, audio: false, nextStep: 0, spotX: 0, flat: { squat: 0, lean: 0, arms: 'down' } };
    L.wr = R;
    const now0 = () => (R.clock ? R.clock() : snd.ctx && R.audio ? snd.ctx.currentTime - R.t0 : (performance.now() - R.pt0) / 1000);
    let out = null;
    function chain() { const c = snd.ctx; if (!c) return null; if (!out) { out = c.createGain(); out.gain.value = 0.26; out.connect(snd.master); } return out; }
    const PAT = (s) => s.split('').map((ch) => (ch === 'x' ? 1 : ch === 'o' ? 0.55 : ch === '-' ? 0.3 : 0));
    const DR = { k: PAT('x...x...x...x...'), s: PAT('....x.......x...'), h: PAT('x-o-x-o-x-o-x-o-') };
    const CHORDS = ['C', 'G', 'Am', 'F'];
    function playStep(c, d, M, step, t) {
      const s = step % 16, bar = Math.floor(step / 16), chord = CH[CHORDS[bar % 4]] || CH.C;
      if (DR.k[s]) drum(c, d, t, 'k', 1.5);
      if (DR.s[s]) drum(c, d, t, 's', 1.2);
      if (DR.h[s]) drum(c, d, t, 'h', DR.h[s] * 1.3);
      if (s % 4 === 2) INST.bass(c, d, t, chord[0], 60 / M.bpm / 2, 1.0);
      if (s === 0 || s === 8) for (const m of chord.slice(1, 4)) INST.synth(c, d, t, m + 12, 0.14, 0.7);
      if (s % 2 === 0 && bar % 2 === 1) INST.marimba(c, d, t, chord[1 + ((s / 2) % 4)] + 12, 0.2, 0.6);
    }
    function spotNow() {
      const ids = [state.myPeer];
      for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer);
      ids.sort();
      const n = Math.min(4, ids.length), k = Math.min(3, Math.max(0, ids.indexOf(state.myPeer)));
      return { n, k, x: (i) => (i - (n - 1) / 2) * SPOT_GAP };
    }
    const _v = new V3();
    function standOnSpot() {
      const sp = spotNow(); R.spotX = sp.x(sp.k);
      // (in a browser the camera sits where the game puts it, so just stand the body on the spot)
      if (state.mode !== 'vr') { dolly.position.set(R.spotX, 0, 0); return; }
      camera.getWorldPosition(_v);
      dolly.position.x += R.spotX - _v.x; dolly.position.z += 0 - _v.z;
    }
    function start() {
      if (state.mode === 'menu') return;
      ensureAudio();
      const c = snd.ctx;
      standOnSpot();
      camera.getWorldPosition(_v);
      R.H0 = state.mode === 'vr' ? clamp(_v.y, 1.1, 2.1) : 1.6;
      R.run = makeRun(R.mi);
      Object.assign(R, { st: 'go', i: 0, score: 0, fits: 0, crashes: 0, streak: 0, result: null, nextStep: 0 });
      R.audio = !!(c && c.state === 'running'); R.t0 = R.audio ? c.currentTime : 0; R.pt0 = performance.now();
      for (const w of walls) { w.w = null; w.m.visible = false; }
      if (MUSIC.voice && c) { const g = MUSIC.voice.gain; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(g.value, c.currentTime); g.linearRampToValueAtTime(0, c.currentTime + 0.8); }
      showToast(`${MODES[R.mi].name}: stand on the yellow ring. Here come the walls!`);
      sfx('whistle', 0.8);
      state.hudDirty = true; state.dirtyBoard = true; forcePresence();
    }
    function stop(why) {
      if (R.st !== 'go') return;
      const c = snd.ctx;
      if (out && c) { const g = out.gain, o = out; out = null; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(g.value, c.currentTime); g.linearRampToValueAtTime(0, c.currentTime + 0.5); setTimeout(() => { try { o.disconnect(); } catch (e) { /* ignore */ } }, 900); }
      if (MUSIC.voice && c) { const g = MUSIC.voice.gain; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(0, c.currentTime); g.linearRampToValueAtTime((MUSIC_THEMES.wallrush || {}).gain || 1, c.currentTime + 2); }
      for (const w of walls) { w.w = null; w.m.visible = false; }
      for (const d of handDots) d.visible = false;
      R.st = 'idle';
      if (why === 'done') {
        const n = R.fits + R.crashes, acc = n ? R.fits / n : 0, key = String(R.mi), nb = R.score > (R.best[key] || 0);
        if (nb) { R.best[key] = R.score; prefs.wrBest = R.best; savePrefs(); }
        RECORDS.add(L, `m${R.mi}`, R.score);
        R.result = { score: R.score, fits: R.fits, crashes: R.crashes, acc, newBest: nb };
        showToast(`${R.fits} of ${n} walls! ${R.score.toLocaleString()} points${nb ? ' · new best' : ''}`);
        sfx('fanfare', 0.9);
      }
      state.hudDirty = true; state.dirtyBoard = true; forcePresence();
    }
    // your body right now, relative to your spot: head and hands (in a browser, from the keys)
    function bodyNow() {
      if (state.mode === 'vr') {
        camera.getWorldPosition(_v);
        const b = { head: { x: _v.x - R.spotX, y: _v.y }, l: null, r: null };
        for (const s of SIDES) if (myHands[s].ok) b[s === 'left' ? 'l' : 'r'] = { x: myHands[s].pos.x - R.spotX, y: myHands[s].pos.y };
        return b;
      }
      const F = R.flat, H0 = R.H0;
      const p = { stance: F.squat > 0.5 ? 'squat' : F.lean < -0.5 ? 'lungeL' : F.lean > 0.5 ? 'lungeR' : 'stand', arms: F.arms };
      const T = poseTargets(p, H0);
      // (arms down: hands hang beside you)
      return { head: T.head, l: T.l || { x: T.head.x - 0.3, y: T.head.y - 0.85 }, r: T.r || { x: T.head.x + 0.3, y: T.head.y - 0.85 } };
    }
    // does your body fit the hole? (a hand the pose doesn't place can be anywhere low; one it does must be in its spot)
    function judge(T, b) {
      const dh = Math.hypot(b.head.x - T.head.x, b.head.y - T.head.y);
      let ok = dh < 0.2, worst = dh / 0.2;
      for (const [want, have] of [[T.l, b.l], [T.r, b.r]]) {
        if (!want) { if (have && have.y > T.head.y + 0.05) { ok = false; worst = 2; } continue; }      // (a hand up where the wall is solid)
        if (!have) { ok = false; worst = 2; continue; }
        const d = Math.hypot(have.x - want.x, have.y - want.y);
        worst = Math.max(worst, d / 0.26);
        if (d > 0.26) ok = false;
      }
      return { ok, q: clamp(1 - worst, 0, 1) };
    }
    function step(dt) {
      const M = MODES[R.mi], run = R.run, t = now0(), c = snd.ctx, speed = -START_Z / M.travel;
      if (R.audio && c) {
        const d = chain(), st = 60 / M.bpm / 4;
        while (d && R.t0 + R.nextStep * st < c.currentTime + 0.5 && R.nextStep * st < run.len) { playStep(c, d, M, R.nextStep, R.t0 + R.nextStep * st); R.nextStep++; }
      }
      // a new wall when it's time
      while (R.i < run.walls.length && run.walls[R.i].t - t < M.travel) {
        const w = run.walls[R.i++], o = walls.find((x) => !x.w);
        if (!o) continue;
        o.w = w; o.judged = false; o.m.visible = true;
        o.T = drawWall(o.ct.g, w.pose, R.H0, WALL_COLS[(R.i - 1) % WALL_COLS.length]);
        o.ct.tex.needsUpdate = true;
        if (o === walls.find((x) => x.w)) state.dirtyBoard = true;
      }
      const b = bodyNow();
      let near = null;
      for (const o of walls) {
        if (!o.w) continue;
        const z = -(o.w.t - t) * speed;
        o.m.position.set(R.spotX, WH / 2, z);
        if (o.flash > 0) { o.flash -= dt; o.m.position.x += Math.sin(o.flash * 60) * 0.03; }
        if (z < 0 && z > -2.5 && (!near || z > near.m.position.z)) near = o;
        if (z >= 0 && !o.judged) {
          o.judged = true;
          const j = judge(o.T, b);
          if (j.ok) {
            R.fits++; R.streak++;
            const pts = Math.round(100 + 50 * j.q + Math.min(100, R.streak * 10));
            R.score += pts;
            spawnFloat(j.q > 0.6 ? `Perfect! ${pts}` : `Fit! ${pts}`, new V3(R.spotX, R.H0 + 0.6, -0.8), '#8bff6a');
            sfx('whoosh', 0.6); tone(660, 990, 0.12, 'triangle', 0.15);
          } else {
            R.crashes++; R.streak = 0; o.flash = 0.4;
            spawnFloat('Crash!', new V3(R.spotX, R.H0 + 0.6, -0.8), '#ff6a6a');
            sfx('slam', 0.5); noiseBurst(0.25, 0.4, 500, 0.6);
            if (state.mode === 'vr') for (const s of SIDES) haptic(vrHands[s], 0.8, 120);
          }
          state.dirtyBoard = true;
        }
        if (z > 3) { o.w = null; o.m.visible = false; }
      }
      // your hands' spots on the coming wall
      handDots.forEach((d, i) => {
        const h = i ? b.r : b.l;
        d.visible = !!(near && h && state.mode === 'vr');
        if (d.visible) d.position.set(R.spotX + h.x, h.y, near.m.position.z + 0.04);
      });
      if (t > run.len) stop('done');
    }
    L.wrInternals = { R, MODES, makeRun, poseTargets, judge, start, stop, step, walls, bodyNow, poseKeys };

    // ---------------------------------------------------------------- picking a mode: buttons by your spot, or up top
    const nextMode = () => { if (R.st === 'go') return; R.mi = (R.mi + 1) % MODES.length; R.result = null; sfx('click', 0.5); state.hudDirty = true; state.dirtyBoard = true; };
    const btns = [
      makeButton(L, new V3(-1.15, 1.0, -0.25), 0xb388ff, 'Mode', nextMode, { faceYaw: 0.6 }),
      makeButton(L, new V3(-1.15, 1.0, 0.15), 0x8bd450, 'Start', () => { if (R.st !== 'go') start(); }, { faceYaw: 0.6 }),
      makeButton(L, new V3(-1.15, 1.0, 0.55), 0xff5a5a, 'Stop', () => {
        if (R.st !== 'go') return;
        const t = performance.now();
        if (t - (R.stopAsk || 0) < 2500) stop('quit'); else { R.stopAsk = t; showToast('Press Stop again to end the run'); }
      }, { faceYaw: 0.6 }),
    ];
    const btnBase = btns.map((b) => b.pos.x);
    function moveButtons() { btns.forEach((b, i) => { const x = btnBase[i] + R.spotX, dx = x - b.pos.x; b.pos.x = x; b.mesh.position.x += dx; b.plate.position.x += dx; }); }
    makeKiosk(L, -4.2, 2.4, Math.PI / 2);
    RECORDS.def(L, MODES.map((m, i) => ({ k: `m${i}`, label: `Best score: ${m.name}` })));
    L.hudActions = [
      { label: () => `Mode: ${MODES[R.mi].name} ▸`, show: () => R.st !== 'go', run: nextMode },
      { label: () => (R.st === 'go' ? 'Stop' : 'Start'), run: () => (R.st === 'go' ? stop('quit') : start()) },
    ];
    L.onKey = (code) => (R.st === 'go' && /^Digit/.test(code) ? true : false);
    L.hints = [['↓', 'squat'], ['← →', 'lunge'], ['↑', 'arms up'], ['F', 'arms out'], ['Q / R', 'left / right arm up']];
    L.hintsFor = () => (state.mode === 'flat' ? L.hints : [['Your body', 'match the hole'], ['Dots', 'where your hands are']]);

    // ---------------------------------------------------------------- the board
    L.board = makeBoard(G, 1024, 512, 4.4, 2.2, 0, 4.1, -7, 0, false);
    let boardKey = '';
    function drawBoard() {
      const g = L.board.g, W = 1024, H = 512, M = MODES[R.mi];
      g.fillStyle = '#14143a'; g.fillRect(0, 0, W, H);
      g.strokeStyle = '#4fc3f7'; g.lineWidth = 10; g.strokeRect(5, 5, W - 10, H - 10);
      g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      if (R.st === 'go') {
        const next = walls.filter((o) => o.w && !o.judged).sort((a, b) => a.w.t - b.w.t)[0];
        g.fillStyle = '#ffd23f'; g.font = `800 76px ${DISPLAY}`; g.fillText(next ? poseName(next.w.pose) : 'Get ready…', W / 2, 110, W - 60);
        if (state.mode === 'flat' && next) { g.fillStyle = '#ffffff'; g.font = `700 44px ${BODY}`; g.fillText(`Keys: ${poseKeys(next.w.pose)}`, W / 2, 180); }
        g.fillStyle = '#ffffff'; g.font = `800 110px ${DISPLAY}`; g.fillText(R.score.toLocaleString(), W / 2, 320);
        g.fillStyle = '#c8d0ff'; g.font = `400 38px ${BODY}`;
        g.fillText(`${R.fits} fit · ${R.crashes} crashed · streak ${R.streak}`, W / 2, 390);
        const p = clamp(now0() / R.run.len, 0, 1);
        rr(g, 112, 430, 800, 18, 9); g.fillStyle = '#2a2a5a'; g.fill(); rr(g, 112, 430, Math.max(18, 800 * p), 18, 9); g.fillStyle = '#4fc3f7'; g.fill();
      } else if (R.result) {
        const r = R.result;
        g.fillStyle = '#ffd23f'; g.font = `800 84px ${DISPLAY}`; g.fillText(`${r.fits} of ${r.fits + r.crashes} walls!`, W / 2, 130);
        g.fillStyle = '#ffffff'; g.font = `800 76px ${DISPLAY}`; g.fillText(`${r.score.toLocaleString()} points${r.newBest ? '  ★' : ''}`, W / 2, 250);
        g.fillStyle = '#c8d0ff'; g.font = `400 36px ${BODY}`; g.fillText(`${Math.round(r.acc * 100)}% · ${M.name}`, W / 2, 330);
        g.fillText('Go again from the buttons on your left', W / 2, 420);
      } else {
        g.fillStyle = '#4fc3f7'; g.font = `800 100px ${DISPLAY}`; g.fillText('Wall Rush', W / 2, 130);
        g.fillStyle = '#ffffff'; g.font = `700 52px ${DISPLAY}`; g.fillText(`${M.name} · ${M.walls} walls`, W / 2, 230);
        g.fillStyle = '#c8d0ff'; g.font = `400 32px ${BODY}`;
        g.fillText('Strike the pose to fit through each hole: squat, lunge, arms up, arms out', W / 2, 300, W - 60);
        const best = R.best[String(R.mi)];
        g.fillText(best ? `Your best: ${best.toLocaleString()}` : 'Clear some space around you first', W / 2, 360);
        g.fillText(state.mode === 'vr' ? 'Mode and Start are on your left' : '↓ squat · ← → lunge · ↑ arms up · F arms out · Q / R one arm', W / 2, 430, W - 60);
      }
      L.board.tex.needsUpdate = true;
    }

    // ---------------------------------------------------------------- per frame
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      const sp = spotNow();
      runways.forEach((g, i) => { g.visible = i < Math.max(1, sp.n); g.position.x = sp.x(i); });
      if (here && R.st !== 'go') { const want = sp.x(sp.k); if (Math.abs(want - R.spotX) > 0.01) { R.spotX = want; moveButtons(); } }
      if (state.mode === 'flat') {
        const k = state.keys, f = 1 - Math.exp(-dt * 14);
        R.flat.squat += ((k.ArrowDown || k.KeyS || k.KeyC ? 1 : 0) - R.flat.squat) * f;
        R.flat.lean += (((k.ArrowRight || k.KeyD ? 1 : 0) - (k.ArrowLeft || k.KeyA ? 1 : 0)) - R.flat.lean) * f;
        R.flat.arms = k.ArrowUp || k.KeyW ? 'Y' : k.KeyF ? 'T' : k.KeyQ ? 'upL' : k.KeyR ? 'upR' : 'down';
      }
      if (here && R.st === 'go') step(dt);
      bulbs.forEach((m, i) => { const on = Math.sin(now * 0.004 + i * 0.7) > 0.2; m.material.color.setHex(on ? 0xffe08a : 0x5a4a2a); });
      const t = R.st === 'go' ? now0() : 0;
      const key = `${R.st}|${R.score}|${R.fits}|${R.crashes}|${R.i}|${Math.floor(t * 2)}|${R.mi}|${!!R.result}|${state.mode}`;
      if (here && key !== boardKey) { boardKey = key; drawBoard(); }
    };
    L.flatCamera = () => {
      const F = R.flat;
      camera.position.set(F.lean * 0.3, 1.95 - F.squat * 0.35, 2.6);          // (back and up a bit, so you see the hole and yourself in it)
      camera.rotation.set(-0.12, 0, 0, 'YXZ');
      state.yaw = 0; state.pitch = -0.05;
      return true;
    };
    // a little you, in a browser, so you can see your pose against the hole
    const me = buildAvatar('#4fc3f7', 1, 0, true, 1, 3);
    const meHands = SIDES.map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), lam(0xf2d0b0)); L.overlay.add(m); return m; });
    L.overlay.add(me);
    const _upd = L.update;
    L.update = (dt, now) => {
      _upd(dt, now);
      const show = state.mode === 'flat' && state.level === L.idx;
      me.visible = show; meHands.forEach((m) => { m.visible = show; });
      if (!show) return;
      const b = bodyNow();
      me.position.set(R.spotX + b.head.x, b.head.y, 0); me.rotation.y = 0;      // (seen from behind, facing the walls)
      me.scale.setScalar(1);
      meHands[0].position.set(R.spotX + b.l.x, b.l.y, 0); meHands[1].position.set(R.spotX + b.r.x, b.r.y, 0);
    };
    L.spawn = () => { dolly.position.set(0, 0, 0); camera.position.set(0, 1.6, 0); standOnSpot(); if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.05; } };
    L.onEnter = () => { boardKey = ''; };
    L.onExit = () => { stop('quit'); me.visible = false; meHands.forEach((m) => { m.visible = false; }); };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.4; camera.position.set(Math.sin(a) * 4, 2.2, 4); camera.lookAt(0, 1.4, -6); };
    Object.defineProperty(L, 'noLocomotion', { get: () => R.st === 'go' });

    // ---------------------------------------------------------------- network
    L.presence = () => ({ wr: [R.st === 'go' ? 1 : 0, R.mi, R.score, R.fits, R.crashes] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.wr;
      if (!Array.isArray(a) || a.length !== 5 || !a.every(Number.isInteger)) return;
      if (!st.wr || st.wr[2] !== a[2] || st.wr[0] !== a[0]) state.dirtyBoard = true;
      st.wr = a;
    };
    L.rowFor = (st, isMe) => {
      const a = isMe ? [R.st === 'go' ? 1 : 0, R.mi, R.score, R.fits, R.crashes] : st.wr || [0, 0, 0, 0, 0];
      return { score: a[2], text: a[0] || a[2] ? `${a[2].toLocaleString()} · ${a[3]} fit` : 'warming up' };
    };
    L.sortRows = (a, b) => (b.score || 0) - (a.score || 0);
    L.drawBoard = () => { boardKey = ''; };
    ENDGAME.on(L, { active: () => R.st === 'go', end: () => { stop('quit'); return ''; } });
    return L;
  })();
