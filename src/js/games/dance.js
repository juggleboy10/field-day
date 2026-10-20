  // ================================================================ LEVEL: DANCE-OFF
  // Disco Dot dances on the stage; copy her moves like a mirror, on the beat. Each move lights up two targets in
  // front of you (blue for your left hand, pink for your right) with rings that close in on the beat: have your
  // hands there when they do. Perfect, Good or OK, and your combo builds. Three songs, slow to fast.
  // VR: your hands do the dancing. Browser: the arrow keys (or WASD) match the moves, on the beat.
  // The groove is the game's own (so the beat is exact). Friends dance alongside on the floor.
  const dance = (() => {
    const L = newLevel(42);
    const G = L.group;
    const rand = mulberry32(4242);
    L.grabless = true;
    Object.defineProperty(L, 'noLocomotion', { get: () => D.st === 'play' });
    L.bounds = { minX: -7, maxX: 7, minZ: -4, maxZ: 5 };
    L.env = {
      sky: skyTexture([[0, '#0a0418'], [1, '#1a0830']]),
      bg: 0x0a0418, fog: [0x0a0418, 16, 50], hemi: [0xffd8ff, 0x201030, 0.7],
      sun: [0xffffff, 0.45], sunDir: new V3(0.2, 1, 0.6), ambient: [0x403050, 0.5], sprite: null,
    };
    // moves: where your left and right hands go (from your head: x right, y up, z forward is negative)
    // and the browser key for each
    const MOVES = [
      { name: 'Hands up!', l: [-0.28, 0.38, -0.25], r: [0.28, 0.38, -0.25], key: 'up' },
      { name: 'Disco!', l: [-0.3, -0.7, -0.15], r: [0.45, 0.42, -0.3], key: 'right' },
      { name: 'Disco!', l: [-0.45, 0.42, -0.3], r: [0.3, -0.7, -0.15], key: 'left' },
      { name: 'Arms wide', l: [-0.68, -0.12, -0.15], r: [0.68, -0.12, -0.15], key: 'down' },
      { name: 'Clap!', l: [-0.06, -0.32, -0.45], r: [0.06, -0.32, -0.45], key: 'down' },
      { name: 'Wave left', l: [-0.6, 0.1, -0.3], r: [-0.22, 0.12, -0.42], key: 'left' },
      { name: 'Wave right', l: [0.22, 0.12, -0.42], r: [0.6, 0.1, -0.3], key: 'right' },
      { name: 'Reach!', l: [-0.15, 0.1, -0.62], r: [0.15, 0.1, -0.62], key: 'up' },
    ];
    const KEY_GLYPH = { up: '▲', down: '▼', left: '◀', right: '▶' };
    const SONGS = [
      { name: 'Easy Groove', bpm: 96, every: 2, beats: 72, bass: [36, 36, 43, 43, 41, 41, 43, 43], chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [65, 69, 72]] },
      { name: 'Funky Friday', bpm: 110, every: 2, beats: 88, bass: [38, 38, 50, 38, 41, 41, 53, 43], chords: [[62, 65, 69], [60, 64, 67], [65, 69, 72], [67, 70, 74]], fills: true },
      { name: 'Mirrorball Madness', bpm: 124, every: 1, beats: 96, bass: [40, 52, 40, 52, 43, 55, 45, 57], chords: [[64, 67, 71], [62, 65, 69], [60, 64, 67], [62, 66, 69]] },
    ];

    // ---------------------------------------------------------------- the disco
    const floorC = canvasTexture(256, 256);
    const floorTiles = [];
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) floorTiles.push({ x, y, h: rand() });
    function drawFloor(beat) {
      const g = floorC.g;
      for (const t of floorTiles) { const on = (Math.floor(beat) + t.x + t.y * 3) % 4 === 0; g.fillStyle = on ? `hsl(${Math.floor((t.h * 360 + beat * 40) % 360)},90%,60%)` : `hsl(${Math.floor(t.h * 360)},60%,18%)`; g.fillRect(t.x * 32 + 1, t.y * 32 + 1, 30, 30); }
      floorC.tex.needsUpdate = true;
    }
    drawFloor(0);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial({ map: floorC.tex })); floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 0.5); G.add(floor);
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), lam(0x1a1028)); outer.rotation.x = -Math.PI / 2; outer.position.y = -0.01; G.add(outer);
    for (const [w, x, z, ry] of [[16, 0, -5, 0], [12, -8, 0.5, Math.PI / 2], [12, 8, 0.5, -Math.PI / 2], [16, 0, 6, Math.PI]]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, 5), lam(0x1a0a2a)); m.position.set(x, 2.5, z); m.rotation.y = ry; G.add(m); }
    // the stage, a mirrorball, speakers
    addBox(G, 6, 0.4, 2.2, lam(0x3a2a4a), 0, 0.2, -2.6);
    addBox(G, 6.1, 0.06, 0.06, new THREE.MeshBasicMaterial({ color: 0xff4dc8 }), 0, 0.4, -1.5);
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), new THREE.MeshLambertMaterial({ color: 0xd8d8e8, emissive: 0x303040, flatShading: true })); ball.position.set(0, 4.0, 0); G.add(ball);
    addCyl(G, 0.01, 0.01, 1.0, 4, lam(0x888888), 0, 4.7, 0);
    for (const sx of [-1, 1]) { addBox(G, 0.9, 1.6, 0.7, lam(0x14101c), sx * 3.6, 1.2, -3.9); for (const y of [0.85, 1.55]) { const c = new THREE.Mesh(new THREE.CircleGeometry(0.25, 16), lam(0x3a3040)); c.position.set(sx * 3.6, y, -3.54); G.add(c); } }
    const beams = [];
    for (let k = 0; k < 6; k++) { const b = new THREE.Mesh(new THREE.ConeGeometry(0.6, 6, 12, 1, true), new THREE.MeshBasicMaterial({ color: [0xff4dc8, 0x4fc3f7, 0xffd23f][k % 3], transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); b.position.set(-4 + k * 1.6, 4.5, -4.5); G.add(b); beams.push(b); }
    makePlate(G, 'DANCE-OFF', 3, 0.55, new V3(0, 4.55, -4.95), 0, { bg: '#2a0a3a', fg: '#ff4dc8', size: 0.7 });
    // the move name over the stage
    const moveSign = makePlate(G, '', 3, 0.45, new V3(0, 3.85, -4.9), 0, { bg: '#1a0a2a', fg: '#ffffff', size: 0.6 });

    // ---------------------------------------------------------------- Disco Dot
    const dot = buildAvatar('#ff4dc8', 2, 1, true, 3, 6);
    dot.position.set(0, 0.4 + 1.62 * 1.35, -2.5); dot.rotation.y = Math.PI; dot.scale.setScalar(1.35); G.add(dot);
    const dotL = dot.children[2], dotR = dot.children[3]; dotL.scale.setScalar(1.6); dotR.scale.setScalar(1.6);
    const dotTag = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTexture(256, 64, (c) => { rr(c, 4, 6, 248, 52, 26); c.fillStyle = 'rgba(20,16,32,0.8)'; c.fill(); c.fillStyle = '#fff'; c.font = `700 30px ${BODY}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Disco Dot', 128, 33); }).tex, transparent: true, depthWrite: false }));
    dotTag.scale.set(0.8, 0.2, 1); dotTag.position.y = 0.45; dot.add(dotTag);
    const restL = new V3(-0.25, -0.42, -0.08), restR = new V3(0.25, -0.42, -0.08);

    // ---------------------------------------------------------------- targets (VR) and the browser track
    const tgtM = [new THREE.MeshBasicMaterial({ color: 0x4fa8ff, transparent: true, opacity: 0.85 }), new THREE.MeshBasicMaterial({ color: 0xff4dc8, transparent: true, opacity: 0.85 })];
    const targets = [0, 1].map((i) => {
      const s = new THREE.Mesh(sph(0.07, 14, 10), tgtM[i]);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 32), new THREE.MeshBasicMaterial({ color: i ? 0xff9ad8 : 0x9ad0ff, transparent: true, opacity: 0.9 }));
      s.visible = ring.visible = false; L.overlay.add(s, ring);
      return { s, ring };
    });
    const trackC = canvasTexture(1024, 192);
    const track = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.116), new THREE.MeshBasicMaterial({ map: trackC.tex, transparent: true, depthTest: false }));
    track.position.set(0, -0.2, -0.6); track.renderOrder = 999; track.visible = false; camera.add(track);

    // ---------------------------------------------------------------- the song
    const D = { st: 'idle', si: 0, t0: 0, score: 0, combo: 0, maxCombo: 0, hits: [0, 0, 0, 0], judged: -1, best: [0, 0, 0], last: '', near: [9, 9], flatPress: null, laneX: 0 };
    try { if (Array.isArray(prefs.danceBest) && prefs.danceBest.length === 3) D.best = prefs.danceBest.map((x) => (Number.isFinite(x) ? x : 0)); } catch (e) { /* none */ }
    L.dance = D;
    const SP = () => SONGS[D.si];
    const beatLen = () => 60 / SP().bpm;
    const songT = () => (performance.now() - D.t0) / 1000;
    // the chart: which move on which beat (from beat 8, so you get two bars to find the groove)
    let chart = [];
    function makeChart(si) {
      const s = SONGS[si], r = mulberry32(777 + si), out = [];
      let prev = -1;
      for (let b = 8; b < s.beats - 4; b += s.every) {
        // a breather every 16 beats
        if (b % 16 === 14 && s.every === 1) continue;
        let m; do { m = Math.floor(r() * MOVES.length); } while (m === prev && r() < 0.8);
        prev = m; out.push({ b, m, done: false, q: -1 });
      }
      return out;
    }
    function lanes() { const ids = [state.myPeer]; for (const rec of remotes.values()) if (rec.lv === L.idx && rec.inGame) ids.push(rec.peer); ids.sort(); return Math.max(0, ids.indexOf(state.myPeer)); }
    function standOnFloor() {
      const k = lanes(); D.laneX = [0, -2, 2, -4, 4][k % 5];
      const c = new V3(); camera.getWorldPosition(c);
      dolly.position.x += D.laneX - c.x; dolly.position.z += 0.9 - c.z;
      if (state.mode !== 'vr') { state.yaw = 0; state.pitch = 0.12; }
    }
    // the lounge music steps aside while the groove plays
    function quiet(on) {
      const c = snd.ctx;
      if (!MUSIC.voice || !c) return;
      const g = MUSIC.voice.gain; g.cancelScheduledValues(c.currentTime); g.setValueAtTime(g.value, c.currentTime);
      g.linearRampToValueAtTime(on ? 0 : (MUSIC_THEMES.dance || {}).gain || 0.35, c.currentTime + (on ? 0.6 : 2));
    }
    function start(si) {
      if (si !== undefined) D.si = si;
      ensureAudio();
      chart = makeChart(D.si);
      Object.assign(D, { st: 'play', t0: performance.now() + 1500, score: 0, combo: 0, maxCombo: 0, hits: [0, 0, 0, 0], judged: -1, last: '', step: -1 });
      standOnFloor(); quiet(true);
      showToast(`${SP().name}: copy Disco Dot like a mirror, on the beat!`);
      sfx('click', 0.8); state.hudDirty = true; forcePresence();
    }
    L.danceStart = start;
    function finish() {
      D.st = 'done'; quiet(false);
      const max = chart.length * 100, acc = max ? D.score / max : 0;
      const rank = acc >= 0.9 ? 'S' : acc >= 0.75 ? 'A' : acc >= 0.55 ? 'B' : acc >= 0.35 ? 'C' : 'D';
      const isBest = D.score > D.best[D.si];
      if (isBest) { D.best[D.si] = D.score; prefs.danceBest = D.best.slice(); savePrefs(); }
      RECORDS.add(L, `song${D.si}`, D.score);
      showToast(`${rank}! ${D.score} points, best combo ${D.maxCombo}${isBest ? ' (a new best!)' : ''}`);
      sfx(acc >= 0.55 ? 'fanfare' : 'chime', 1); if (acc >= 0.55) sfx('cheer', 0.8);
      moveSign.userData.draw(`${rank}  ·  ${D.score} points`);
      state.hudDirty = true; state.dirtyBoard = true; forcePresence();
    }
    // a judgement: q 0 perfect, 1 good, 2 ok, 3 miss
    const Q = [['PERFECT', '#ffd23f', 100], ['GOOD', '#8bd450', 60], ['OK', '#4fc3f7', 30], ['MISS', '#9a8aaa', 0]];
    function judge(n, q) {
      n.done = true; n.q = q; D.hits[q] += 1;
      if (q < 3) { D.combo += 1; D.maxCombo = Math.max(D.maxCombo, D.combo); D.score += Q[q][2] + Math.min(20, D.combo) * (q === 0 ? 2 : 1); }
      else D.combo = 0;
      D.last = Q[q][0];
      const at = new V3(myHead.pos.x + 0.9, myHead.pos.y + 0.1, myHead.pos.z - 1.8);
      spawnFloat(q < 3 && D.combo > 4 ? `${Q[q][0]} ×${D.combo}` : Q[q][0], at, Q[q][1]);
      if (q < 2) tone(q === 0 ? 1320 : 990, 0, 0.06, 'triangle', 0.1);
      if (state.mode === 'vr' && q < 3) for (const s of SIDES) haptic(vrHands[s], q === 0 ? 0.6 : 0.3, 30);
      forcePresence();
    }
    L.judge = judge;
    // VR: where a move wants my hands right now
    const _t = new V3();
    function targetPos(m, side, out) {
      const o = MOVES[m][side ? 'r' : 'l'];
      return out.set(myHead.pos.x + o[0], myHead.pos.y + o[1], myHead.pos.z + o[2]);
    }
    // the groove: kick, snare, hats, bass and chord stabs on an 8th-note grid
    const mtoF = (m) => 440 * Math.pow(2, (m - 69) / 12);
    function groove(step) {
      const s = SP(), bar = Math.floor(step / 8), pos = step % 8, vol = 1;
      if (pos % 2 === 0) { tone(110, 40, 0.12, 'sine', 0.32 * vol); }   // kick on every beat
      if (pos === 2 || pos === 6) { tone(220, 120, 0.08, 'square', 0.06 * vol); tone(3000 + Math.random() * 1000, 0, 0.05, 'sawtooth', 0.02); }   // snare
      if (pos % 2 === 1) tone(8000, 6000, 0.02, 'square', 0.012);   // off-beat hat
      const bn = s.bass[(Math.floor(step / 2)) % s.bass.length];
      if (pos % 2 === 0 || (s.fills && pos === 7)) tone(mtoF(bn), mtoF(bn) * 0.99, 0.18, 'triangle', 0.13);
      if (pos === 3 || pos === 7) { const c = s.chords[bar % s.chords.length]; for (const n of c) tone(mtoF(n), mtoF(n), 0.1, 'sawtooth', 0.025); }
    }
    function step(dt, now) {
      const t = songT(), bl = beatLen(), beat = t / bl;
      // the music
      const st8 = Math.floor(beat * 2);
      if (st8 !== D.step && t >= 0 && beat < SP().beats) { D.step = st8; groove(st8); }
      if (beat >= SP().beats + 1) { finish(); return; }
      // judging: VR by where your hands are on the beat, the browser by key presses
      for (const n of chart) {
        if (n.done) continue;
        const dtb = (beat - n.b) * bl;   // seconds after the beat
        if (dtb < -0.2) break;
        if (state.mode === 'vr') {
          if (dtb > -0.15) {
            let worst = 0;
            for (let side = 0; side < 2; side++) { const h = myHands[side ? 'right' : 'left']; const d = h.ok ? h.pos.distanceTo(targetPos(n.m, side, _t)) : 9; worst = Math.max(worst, d); }
            n.best = Math.min(n.best === undefined ? 9 : n.best, worst);
            if (n.best < 0.11) { judge(n, 0); continue; }
          }
          if (dtb > 0.18) judge(n, n.best < 0.2 ? 1 : n.best < 0.32 ? 2 : 3);
        } else if (dtb > 0.22) judge(n, 3);
      }
      void now; void dt;
    }
    function flatPress(key) {
      if (D.st !== 'play') return false;
      const t = songT(), bl = beatLen(), beat = t / bl;
      const n = chart.find((x) => !x.done && Math.abs((beat - x.b) * bl) < 0.22);
      D.flatPose = { key, t: performance.now() };
      if (!n) { tone(200, 150, 0.05, 'square', 0.04); return true; }
      if (MOVES[n.m].key !== key) { judge(n, 3); return true; }
      const e = Math.abs((beat - n.b) * bl);
      judge(n, e < 0.07 ? 0 : e < 0.14 ? 1 : 2);
      D.flatPose.m = n.m;
      return true;
    }
    L.flatPress = flatPress;
    L.onKey = (code) => {
      const k = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down', ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right' }[code];
      if (k && D.st === 'play') return flatPress(k);
      return false;
    };
    // in a browser, the hands strike the pose you pressed
    L.deskHand = (side, mh, now) => {
      if (state.level !== L.idx || !D.flatPose || now - D.flatPose.t > 350) return false;
      const m = D.flatPose.m !== undefined ? D.flatPose.m : MOVES.findIndex((x) => x.key === D.flatPose.key);
      const o = MOVES[m][side === 'right' ? 'r' : 'l'];
      mh.quat.copy(myHead.quat);
      mh.pos.set(myHead.pos.x + o[0] * 0.8, myHead.pos.y + o[1] * 0.6 - 0.1, myHead.pos.z + o[2] - 0.2);
      mh.ok = state.mode === 'flat';
      return true;
    };
    L.deskFire = () => { if (D.st !== 'play') start(); };
    L.throwLabel = () => (D.st === 'play' ? '…' : 'Dance!');

    // ---------------------------------------------------------------- per frame
    // Dot shows each move ahead of time: as soon as one beat's move is done she's already into the next, and holds it
    // until its beat comes round, so you can watch her and copy (and the sign names it)
    const poseL = (m) => (m < 0 ? restL : new V3(-MOVES[m].r[0], MOVES[m].r[1], MOVES[m].r[2]));
    const poseR = (m) => (m < 0 ? restR : new V3(-MOVES[m].l[0], MOVES[m].l[1], MOVES[m].l[2]));
    function poseDot(beat) {
      let ci = chart.findIndex((n) => n.b >= beat - 0.15);
      const cur = ci >= 0 ? chart[ci] : null, prev = ci > 0 ? chart[ci - 1] : null;
      const bounce = Math.abs(Math.sin(beat * Math.PI)) * 0.06;
      dot.position.y = 0.4 + 1.62 * 1.35 - bounce;
      dot.rotation.z = Math.sin(beat * Math.PI) * 0.06;
      const from = prev ? prev.b - 0.15 : (cur ? cur.b - 3 : 0);
      const k = cur ? clamp((beat - from) / 0.45, 0, 1) : 0;
      const pm = prev ? prev.m : -1, cm = cur ? cur.m : -1;
      dotL.position.lerpVectors(poseL(pm), poseL(cm), k); dotR.position.lerpVectors(poseR(pm), poseR(cm), k);
      // a little dip on the beat she's waiting for
      if (cur && Math.abs(beat - cur.b) < 0.15) dot.position.y -= 0.05;
      return cur && beat > cur.b - 3 ? cur : null;
    }
    function drawTrack(beat) {
      const g = trackC.g, W = 1024, Hh = 192, hitX = 140, pxPerBeat = 170;
      g.clearRect(0, 0, W, Hh);
      rr(g, 4, 20, W - 8, Hh - 40, 30); g.fillStyle = 'rgba(20,8,36,0.7)'; g.fill();
      g.strokeStyle = '#ff4dc8'; g.lineWidth = 6; g.beginPath(); g.arc(hitX, Hh / 2, 58, 0, Math.PI * 2); g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const n of chart) {
        if (n.done && n.q !== 3) continue;
        const x = hitX + (n.b - beat) * pxPerBeat;
        if (x < 40 || x > W + 60) continue;
        g.fillStyle = n.done ? '#5a4a6a' : ['#ffd23f', '#4fc3f7', '#8bd450', '#ff9a3a'][['up', 'right', 'left', 'down'].indexOf(MOVES[n.m].key)];
        g.font = `900 92px ${BODY}`; g.fillText(KEY_GLYPH[MOVES[n.m].key], x, Hh / 2 + 4);
      }
      g.fillStyle = '#ffffff'; g.font = `800 34px ${DISPLAY}`; g.textAlign = 'right'; g.fillText(`${D.score}  ·  ×${D.combo}`, W - 30, 50);
      trackC.tex.needsUpdate = true;
    }
    L.update = (dt, now) => {
      const here = state.level === L.idx && state.mode !== 'menu';
      if (!here) { track.visible = false; for (const t of targets) t.s.visible = t.ring.visible = false; return; }
      if (D.st === 'play') step(dt, now);
      const beat = D.st === 'play' ? songT() / beatLen() : now / 1000 * 1.6;
      // VR: A or X starts
      if (state.mode === 'vr') {
        let a = false; for (const s of SIDES) { const gp = vrHands[s].source && vrHands[s].source.gamepad; if (gp && gp.buttons && gp.buttons[4] && gp.buttons[4].pressed) a = true; }
        if (a && !D.aPrev && D.st !== 'play') start();
        D.aPrev = a;
      }
      const cur = poseDot(beat);
      const nm = cur && D.st === 'play' ? `Next: ${MOVES[cur.m].name}` : D.st === 'play' ? 'Get ready…' : '';
      if (D.st === 'play' && nm !== moveSign.userData.v) { moveSign.userData.v = nm; moveSign.userData.draw(nm); }
      // the floor, the lights, the mirrorball
      if (Math.floor(beat) !== D.lastBeat) { D.lastBeat = Math.floor(beat); drawFloor(beat); }
      ball.rotation.y += dt * 0.6;
      beams.forEach((b, k) => { b.rotation.z = Math.sin(now * 0.001 + k) * 0.5; b.rotation.x = Math.cos(now * 0.0013 + k * 2) * 0.3; });
      // VR targets for the next move
      const next = D.st === 'play' ? chart.find((n) => !n.done) : null;
      for (let side = 0; side < 2; side++) {
        const tg = targets[side], show = state.mode === 'vr' && next && (next.b - beat) < 1.6;
        tg.s.visible = tg.ring.visible = !!show;
        if (!show) continue;
        targetPos(next.m, side, tg.s.position); tg.ring.position.copy(tg.s.position);
        const r = 0.07 + Math.max(0, next.b - beat) * 0.22; tg.ring.scale.setScalar(r);
        tg.ring.quaternion.copy(myHead.quat);
      }
      track.visible = state.mode === 'flat' && D.st === 'play';
      if (track.visible) drawTrack(beat);
      if (ui.status && state.mode === 'flat') {
        ui.status.hidden = false;
        const txt = D.st === 'play' ? `${SP().name}  ·  ${D.score} points  ·  combo ${D.combo}${D.last ? `  ·  ${D.last}` : ''}` : `Dance-Off: ${SP().name}  ·  press Space to dance  ·  best ${D.best[D.si]}`;
        if (ui.status.textContent !== txt) ui.status.textContent = txt;
      }
    };
    L.presence = () => ({ dn: [D.score, D.combo, D.si, Math.max(...D.best), D.st === 'play' ? 1 : 0] });
    L.readPresence = (rec, pres, st) => {
      const a = pres.dn;
      if (!Array.isArray(a) || a.length !== 5 || !a.every((x) => Number.isInteger(x) && x >= 0 && x < 1e7)) { st.dn = null; return; }
      if (!st.dn || st.dn[3] !== a[3]) state.dirtyBoard = true;
      st.dn = a;
    };
    L.rowFor = (st, isMe) => { const b = isMe ? Math.max(...D.best) : st.dn ? st.dn[3] : 0; const now = isMe ? (D.st === 'play' ? D.score : 0) : st.dn && st.dn[4] ? st.dn[0] : 0; return { best: b, text: `${now ? `${now} now · ` : ''}best ${b}` }; };
    L.sortRows = (a, b) => (b.best || 0) - (a.best || 0);
    L.board = makeBoard(G, 720, 460, 2.4, 1.53, -7.9, 2.0, 1.5, Math.PI / 2, false);
    L.drawBoard = (rows) => {
      const g = L.board.g, W = 720;
      g.fillStyle = '#14081e'; g.fillRect(0, 0, W, 460); g.strokeStyle = '#ff4dc8'; g.lineWidth = 8; g.strokeRect(4, 4, W - 8, 452);
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
      g.fillStyle = '#ffd23f'; g.font = `800 56px ${DISPLAY}`; g.fillText('Top dancers', 36, 80);
      g.fillStyle = '#d8c0f0'; g.font = `400 24px ${BODY}`; g.fillText('Best score on any song', 36, 118);
      drawRows(g, rows, 176, 46, W);
      L.board.tex.needsUpdate = true;
    };
    makeKiosk(L, 6.5, 4.5, -Math.PI * 0.75);
    RECORDS.def(L, SONGS.map((s2, i) => ({ k: `song${i}`, label: `Best score: ${s2.name}` })));
    SONGS.forEach((s, i) => makeButton(L, new V3(-6.2, 1.0, -1.2 + i * 0.75), [0x8bd450, 0xffd23f, 0xff4dc8][i], s.name, () => start(i), { faceYaw: Math.PI / 2 }));
    L.hudActions = [
      { label: () => (D.st === 'play' ? 'Stop' : 'Dance!'), run: () => { if (D.st === 'play') { D.st = 'idle'; quiet(false); state.hudDirty = true; } else start(); } },
      { label: () => `Song: ${SP().name} ▸`, run: () => { if (D.st === 'play') { showToast('Change songs between dances'); return; } D.si = (D.si + 1) % SONGS.length; state.hudDirty = true; } },
    ];
    L.hints = [['A / X', 'start dancing'], ['Copy Disco Dot', 'she shows each move before its beat'], ['Blue and pink', 'your left and right hands, on the beat']];
    L.hintsFor = () => (state.mode === 'flat' ? [['Arrow keys', 'or WASD: the move, on the beat'], ['The pink ring', 'is the beat'], ['Space', 'start']] : L.hints);
    L.spawn = () => { dolly.position.set(0, 0, 0.9); if (state.mode !== 'vr') { state.yaw = 0; state.pitch = -0.05; } };
    L.onEnter = () => { D.st = 'idle'; moveSign.userData.draw(''); moveSign.userData.v = ''; };
    L.onExit = () => { if (ui.status) ui.status.hidden = true; track.visible = false; if (D.st === 'play') quiet(false); D.st = 'idle'; };
    // in a browser you stay on your spot while you dance (the arrow keys are the moves)
    L.flatCamera = () => {
      if (D.st !== 'play') return false;
      camera.position.set(0, 1.6, 0);
      camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
      return true;
    };
    L.attract = (now) => { const a = reduceMotion ? 0 : Math.sin(now * 0.0002) * 0.3; camera.position.set(Math.sin(a) * 3, 2.2, 4); camera.lookAt(0, 1.6, -3); };
    L.danceInternals = { D, MOVES, SONGS, start, step, judge, flatPress, makeChart, get chart() { return chart; }, targetPos, songT, beatLen };
    // the level's own groove does the music while you dance; this is the quiet background otherwise
    MUSIC_THEMES.dance = { gain: 0.35, bpm: 110, swing: 0.1, chords: ['Am', 'Dm', 'G', 'C'], comp: { inst: 'synth', at: [3, 7, 11, 15], dur: 0.1 }, bass: { at: [0, 4, 8, 12] }, drums: { k: 'x...x...x...x...', h: '..o...o...o...o.' }, cut: 3200 };
    return L;
  })();
